import { prisma } from '../config/database.js'; // Connection to our SQL database (PostgreSQL)
import { getRedisClient } from '../config/redis.js'; // Connection to our fast in-memory database (Redis)
import * as leaderboardService from './leaderboard.service.js'; // Helper for syncing scores to the leaderboard

/**
 * Shuffle an array in place (Fisher-Yates Algorithm).
 * This makes the questions appear in a random order for every user.
 * @param {Array} array 
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Get randomized questions for a contest and initialize a quiz session.
 * @param {number} userId 
 * @param {number} contestId 
 */
export const getContestQuestions = async (userId, contestId, page = 1, pageSize = 10) => {
  // 1. Fetch contest meta and question list for this contest
  const [contest, questions] = await Promise.all([
    prisma.contest.findUnique({ where: { id: contestId } }),
    prisma.question.findMany({
      where: { contest_id: contestId },
      select: {
        id: true,
        question: true,
        option_a: true,
        option_b: true,
        option_c: true,
        option_d: true,
        hint: true,
        explanation: true,
        // We do NOT select correct_ans here to prevent cheating!
      },
    }),
  ]);

  if (!contest) {
    throw new Error('Contest not found');
  }

  const now = Date.now();
  if (now < contest.start_time.getTime()) {
    throw new Error('Contest has not started');
  }

  if (contest.duration_minutes) {
    const contestEnd = contest.start_time.getTime() + contest.duration_minutes * 60000;
    if (now > contestEnd) {
      throw new Error('Contest has ended');
    }
  }

  if (questions.length === 0) {
    throw new Error('No questions found for this contest');
  }

  const redis = await getRedisClient();
  const sessionKey = `quiz:session:${userId}:${contestId}`;
  let sessionData;

  if (redis) {
    const sessionRaw = await redis.get(sessionKey);

    if (sessionRaw) {
      sessionData = JSON.parse(sessionRaw);
    } else {
      const questionOrder = shuffle([...questions]).map((q) => q.id);
      sessionData = {
        startTime: now,
        lastActionTime: now,
        questionOrder,
        currentIndex: 0,
        deadline: contest.duration_minutes ? now + contest.duration_minutes * 60 * 1000 : null,
      };
      await redis.set(sessionKey, JSON.stringify(sessionData), { EX: 7200 });
    }
  } else {
    sessionData = {
      startTime: now,
      lastActionTime: now,
      questionOrder: shuffle([...questions]).map((q) => q.id),
      currentIndex: 0,
      deadline: contest.duration_minutes ? now + contest.duration_minutes * 60 * 1000 : null,
    };
  }

  const orderedQuestions = sessionData.questionOrder.map((id) => questions.find((q) => q.id === id)).filter(Boolean);
  const normalizedPage = Math.max(1, Number(page) || 1);
  const normalizedPageSize = Math.max(1, Number(pageSize) || 10);
  const start = (normalizedPage - 1) * normalizedPageSize;
  const paginatedQuestions = orderedQuestions.slice(start, start + normalizedPageSize);

  return {
    contest: {
      id: contest.id,
      title: contest.title,
      start_time: contest.start_time,
      total_questions: contest.total_questions,
      duration_minutes: contest.duration_minutes,
    },
    pagination: {
      page: normalizedPage,
      pageSize: normalizedPageSize,
      totalQuestions: orderedQuestions.length,
      totalPages: Math.ceil(orderedQuestions.length / normalizedPageSize),
    },
    timeLimits: {
      perQuestionSeconds: 15,
      contestSecondsRemaining: sessionData.deadline ? Math.max(0, Math.round((sessionData.deadline - Date.now()) / 1000)) : null,
    },
    questions: paginatedQuestions,
  };
};

/**
 * Submit an answer for a question in a contest.
 * Includes complex scoring: Base points, speed bonus, streak bonus, timeout penalty, and ANTI-CHEAT.
 * @param {number} userId 
 * @param {number} contestId 
 * @param {number} questionId 
 * @param {string} selectedOption 
 */
export const submitAnswer = async (userId, contestId, questionId, selectedOption) => {
  // 1. Double-check: Did they already answer this question?
  const existing = await prisma.response.findUnique({
    where: {
      userId_contestId_questionId: { userId, contestId, questionId },
    },
  });

  if (existing) {
    throw new Error('You have already answered this question');
  }

  // 2. Fetch the question details and the user's current contest state
  const [question, participant, contest] = await Promise.all([
    prisma.question.findUnique({ where: { id: questionId } }),
    prisma.contestParticipant.findUnique({
      where: { userId_contestId: { userId, contestId } },
    }),
    prisma.contest.findUnique({ where: { id: contestId } }),
  ]);

  if (!question || question.contest_id !== contestId) {
    throw new Error('Invalid question or contest');
  }

  if (!participant) {
    throw new Error('User has not joined this contest');
  }

  if (!contest) {
    throw new Error('Contest not found');
  }

  const now = Date.now();
  if (now < contest.start_time.getTime()) {
    throw new Error('Contest has not started');
  }

  if (contest.duration_minutes) {
    const contestDeadline = contest.start_time.getTime() + contest.duration_minutes * 60000;
    if (now > contestDeadline) {
      throw new Error('Contest has ended');
    }
  }

  // 3. Timer check using Redis (15-second per-question limit)
  const redis = await getRedisClient();
  let isTimeout = false;
  let elapsedTime = 0; // Exactly how many seconds took to answer
  
  if (redis) {
    const sessionKey = `quiz:session:${userId}:${contestId}`;
    const sessionRaw = await redis.get(sessionKey);
    
    if (!sessionRaw) {
      throw new Error('Quiz session not found. Please fetch questions first.');
    }

    const session = JSON.parse(sessionRaw);
    if (session.deadline && Date.now() > session.deadline) {
      throw new Error('Contest time has expired');
    }

    elapsedTime = (Date.now() - session.lastActionTime) / 1000; // Calculate seconds elapsed

    // 15-second limit rule!
    if (elapsedTime > 15) {
      isTimeout = true;
    }

    // Update lastActionTime for the NEXT question in this session
    session.lastActionTime = Date.now();
    await redis.set(sessionKey, JSON.stringify(session), { EX: 7200 });
  }

  // 4. Scoring Logic (High-performance scoring)
  let pointsEarned = 0;
  let newStreak = 0; // How many correct in a row?
  
  // They are correct ONLY if they are NOT timed out and picked the right choice
  const isCorrect = !isTimeout && question.correct_ans === selectedOption;

  if (isTimeout) {
    pointsEarned = -2; // Penalty for being too slow!
    newStreak = 0;
  } else if (isCorrect) {
    pointsEarned = 10; // Base reward for a correct answer
    
    // SPEED BONUS: +5 points if answered in under 5 seconds
    if (elapsedTime < 5) {
      pointsEarned += 5;
    }

    // STREAK BONUS: +15 points for every 5 consecutive correct answers!
    newStreak = participant.streak + 1;
    if (newStreak > 0 && newStreak % 5 === 0) {
      pointsEarned += 15;
    }
  } else {
    // WRONG! 0 points and reset their winning streak
    pointsEarned = 0;
    newStreak = 0;
  }

  // 5. ANTI-CHEAT: Detection of suspiciously fast answers (Professional threshold: 0.5s)
  let shouldBlock = false;
  if (!isTimeout && elapsedTime < 0.5) {
    // Count how many times they've answered under 0.5 seconds in THIS contest
    const fastCount = await prisma.response.count({
      where: {
        userId,
        contestId,
        responseTime: { lt: 0.5 },
      },
    });

    // Strike 3! If they answer 3 times in < 0.5s, they're likely using a script.
    if (fastCount >= 2) { 
      shouldBlock = true;
    }
  }

  // 6. ATOMIC UPDATE: We perform everything below in ONE TRANSACTION
  // This ensures that if any part fails, nothing is saved (data integrity).
  const transactionItems = [
    // A. Create the response record (audit trail)
    prisma.response.create({
      data: {
        userId,
        contestId,
        questionId,
        selectedOption,
        isCorrect,
        isTimeout,
        pointsEarned,
        responseTime: elapsedTime,
      },
    }),
    // B. Update the participant's total score and streak in the database
    prisma.contestParticipant.update({
      where: { userId_contestId: { userId, contestId } },
      data: {
        score: { increment: pointsEarned }, // Atomic add
        streak: newStreak, // Overwrite with new streak
      },
    }),
  ];

  // If the anti-cheat flag was triggered, block the user permanently
  if (shouldBlock) {
    transactionItems.push(
      prisma.user.update({
        where: { id: userId },
        data: { isBlocked: true }, // Set their account to blocked
      }),
      // Log the exact reason for the block for administrative review
      prisma.fraudLog.create({
        data: {
          userId,
          contestId,
          reason: 'CONSISTENT_FAST_ANSWERS',
          responseTime: elapsedTime,
        },
      })
    );
  }

  // Execute the transaction!
  const [response, updatedParticipant] = await prisma.$transaction(transactionItems);

  // 7. SYNC WITH LEADERBOARD: Fire and forget (don't make user wait)
  // This updates the Redis sorted set for real-time rankings
  leaderboardService.updateMemberScore(contestId, userId, updatedParticipant.score).catch(err => {
    console.error('Failed to update leaderboard in Redis:', err);
  });

  // Return the result of the submission back to the API controller
  return {
    response,
    currentScore: updatedParticipant.score,
    currentStreak: updatedParticipant.streak,
    pointsEarned,
  };
};
