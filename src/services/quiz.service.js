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
export const getContestQuestions = async (userId, contestId) => {
  // 1. Fetch questions from the database for this contest
  const questions = await prisma.question.findMany({
    where: { contestId },
    select: {
      id: true,
      text: true,
      options: true,
      // We do NOT select correctAnswer here to prevent cheating!
    },
  });

  if (questions.length === 0) {
    throw new Error('No questions found for this contest');
  }

  // 2. Randomize the question order for this specific user
  const shuffledQuestions = shuffle([...questions]);

  // 3. Initialize/Update a Redis session to track the per-question timer
  const redis = await getRedisClient();
  if (redis) {
    const sessionKey = `quiz:session:${userId}:${contestId}`;
    const now = Date.now(); // Current time in milliseconds
    
    const sessionData = {
      startTime: now,
      lastActionTime: now, // This resets every time a user gets/submits a question
      questionOrder: shuffledQuestions.map(q => q.id),
      currentIndex: 0,
    };

    // Store the session for 2 hours (plenty of time for a quiz)
    await redis.set(sessionKey, JSON.stringify(sessionData), { EX: 7200 });
  }

  return shuffledQuestions;
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
  const [question, participant] = await Promise.all([
    prisma.question.findUnique({ where: { id: questionId } }),
    prisma.contestParticipant.findUnique({
      where: { userId_contestId: { userId, contestId } },
    }),
  ]);

  if (!question || question.contestId !== contestId) {
    throw new Error('Invalid question or contest');
  }

  if (!participant) {
    throw new Error('User has not joined this contest');
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
  const isCorrect = !isTimeout && question.correctAnswer === selectedOption;

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
