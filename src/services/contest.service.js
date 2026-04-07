import { prisma } from '../config/database.js'; // The database manager
import { checkActiveSubscription } from './subscription.service.js'; // Subscription check service

/**
 * createContest: Creates a new contest record in the database.
 * @param {Object} data 
 */
export const createContest = async (data) => {
  return await prisma.contest.create({
    data, // Pass all fields (title, entry_fee, etc.)
  });
};

/**
 * getAllContests: Fetches every contest from the SQL database.
 */
export const getAllContests = async () => {
  return await prisma.contest.findMany({
    orderBy: { start_time: 'asc' }, // Sort by the start time (earliest first)
  });
};

/**
 * submitContest: Handles a full contest submission.
 * Scores answers, stores submission, and saves answer details.
 * @param {number} userId
 * @param {number} contestId
 * @param {Array} answers
 * @param {number} timeTaken
 */
export const submitContest = async (userId, contestId, answers, timeTaken) => {
  const now = new Date();

  // 1. Validate contest / participant / duplicate submission state
  const [contest, participant, existingSubmission] = await Promise.all([
    prisma.contest.findUnique({ where: { id: contestId } }),
    prisma.contestParticipant.findUnique({ where: { userId_contestId: { userId, contestId } } }),
    prisma.submission.findFirst({ where: { user_id: userId, contest_id: contestId } }),
  ]);

  if (!contest) {
    throw new Error('Contest not found');
  }

  if (!participant) {
    throw new Error('User has not joined this contest');
  }

  if (existingSubmission) {
    throw new Error('Duplicate submission not allowed');
  }

  if (now < contest.start_time) {
    throw new Error('Contest has not started');
  }

  if (contest.duration_minutes) {
    const contestEnd = new Date(contest.start_time.getTime() + contest.duration_minutes * 60000);
    if (now > contestEnd) {
      throw new Error('Contest has ended');
    }
  }

  if (!Array.isArray(answers)) {
    throw new Error('Answers must be an array');
  }

  const answerQuestionIds = answers.map((a) => a?.question_id).filter((id) => id !== undefined && id !== null);
  if (answerQuestionIds.length !== answers.length) {
    throw new Error('Each answer must include a question_id');
  }

  const duplicateAnswerIds = answerQuestionIds.filter((id, index) => answerQuestionIds.indexOf(id) !== index);
  if (duplicateAnswerIds.length) {
    throw new Error('Duplicate question IDs in answers');
  }

  // 2. Fetch all questions for the contest and score them
  const questions = await prisma.question.findMany({
    where: { contest_id: contestId },
  });

  if (!questions.length) {
    throw new Error('Contest questions not found');
  }

  const validQuestionIds = new Set(questions.map((q) => q.id));
  const invalidAnswerIds = answers
    .map((a) => Number(a.question_id))
    .filter((id) => id && !validQuestionIds.has(id));

  if (invalidAnswerIds.length) {
    throw new Error('Answers contain invalid question IDs');
  }

  let score = 0;
  const answerData = [];

  for (const q of questions) {
    const userAnswer = answers.find((a) => Number(a.question_id) === q.id);
    const selectedAns = userAnswer?.selected_ans ?? '';
    const isCorrect = selectedAns === q.correct_ans;

    if (isCorrect) score += 1;

    answerData.push({
      question_id: q.id,
      selected_ans: selectedAns,
      is_correct: isCorrect,
    });
  }

  return await prisma.$transaction(async (tx) => {
    const submission = await tx.submission.create({
      data: {
        user_id: userId,
        contest_id: contestId,
        score,
        time_taken: timeTaken,
      },
    });

    await tx.answer.createMany({
      data: answerData.map((a) => ({
        ...a,
        submission_id: submission.id,
      })),
    });

    return { score, timeTaken, submissionId: submission.id };
  });
};

/**
 * getLeaderboard: Return contest rankings from submissions.
 * Higher score wins, ties broken by faster time.
 * @param {number} contestId
 */
export const getLeaderboard = async (contestId) => {
  return await prisma.submission.findMany({
    where: { contest_id: contestId },
    orderBy: [
      { score: 'desc' },
      { time_taken: 'asc' },
      { submitted_at: 'asc' },
    ],
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  });
};

export const getSubmissionReview = async (userId, contestId) => {
  const submission = await prisma.submission.findFirst({
    where: {
      user_id: userId,
      contest_id: contestId,
    },
    include: {
      answers: {
        include: {
          question: {
            select: {
              id: true,
              question: true,
              option_a: true,
              option_b: true,
              option_c: true,
              option_d: true,
              hint: true,
              explanation: true,
              correct_ans: true,
            },
          },
        },
      },
    },
  });

  if (!submission) {
    throw new Error('Submission not found for this contest');
  }

  return {
    submissionId: submission.id,
    score: submission.score,
    timeTaken: submission.time_taken,
    submittedAt: submission.submitted_at,
    answers: submission.answers.map((answer) => ({
      question_id: answer.question_id,
      question: answer.question.question,
      options: {
        option_a: answer.question.option_a,
        option_b: answer.question.option_b,
        option_c: answer.question.option_c,
        option_d: answer.question.option_d,
      },
      selected_ans: answer.selected_ans,
      is_correct: answer.is_correct,
      correct_ans: answer.question.correct_ans,
      hint: answer.question.hint,
      explanation: answer.question.explanation,
    })),
  };
};

/**
 * joinContest: ATOMIC transaction to join a contest.
 * This checks if the user has an active subscription and joins the contest.
 * @param {number} userId 
 * @param {number} contestId 
 */
export const joinContest = async (userId, contestId) => {
  // Use a transaction so that if ANY step fails, no data is saved.
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch details about the contest
    const contest = await tx.contest.findUnique({ where: { id: contestId } });

    // 2. Validate contest exists
    if (!contest) throw new Error('Contest not found');

    // 3. Check if user has active subscription
    const hasActiveSubscription = await checkActiveSubscription(userId);
    if (!hasActiveSubscription) {
      throw new Error('Active subscription required to join contests');
    }

    // 4. Prevent joining if the contest already started!
    if (new Date() > new Date(contest.start_time)) {
      throw new Error('Cannot join. Contest has already started.');
    }

    // 5. Check if we already joined
    const existing = await tx.contestParticipant.findUnique({
      where: { userId_contestId: { userId, contestId } },
    });
    if (existing) throw new Error('User has already joined this contest');

    // 6. RECORD PARTICIPATION: Actually sign them up for the contest!
    return await tx.contestParticipant.create({
      data: {
        userId,
        contestId,
      },
    });
  });
};
