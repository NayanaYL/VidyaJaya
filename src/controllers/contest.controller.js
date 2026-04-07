import httpStatus from 'http-status'; // Easy-to-read names for HTTP status codes
import * as contestService from '../services/contest.service.js'; // The helper service for all contest events
import * as quizService from '../services/quiz.service.js'; // The helper service for quiz answers and timing
import * as prizeService from '../services/prize.service.js'; // The helper service for distributing prizes
import { ApiError } from '../utils/apiError.js'; // Our custom error reporter

/**
 * createContest: This controller handles the creation of a new contest.
 * It's what gets called when you hit POST /api/contest/create
 */
export const createContest = async (req, res, next) => {
  try {
    // 1. Extract the data from the user's request (e.g., a form)
    const { title, entry_fee, prize_pool, start_time, total_questions, duration_minutes } = req.body;
    
    // 2. Simple check: Are any fields missing?
    if (!title || entry_fee === undefined || prize_pool === undefined || !start_time || total_questions === undefined) {
      // If anything is missing, tell the user they made a bad request
      throw new ApiError(httpStatus.BAD_REQUEST, 'Missing required fields');
    }

    // 3. Call the service to actually CREATE the contest in the database
    const contest = await contestService.createContest({
      title,
      entry_fee,
      prize_pool,
      start_time,
      total_questions,
      duration_minutes,
    });

    // 4. Send back a success message and the new contest data
    return res.status(httpStatus.CREATED).json({
      success: true,
      data: contest,
    });
  } catch (err) {
    // If anything goes wrong, send the error to our global error handler
    return next(err);
  }
};

/**
 * getContests: This handles getting a list of all current contests.
 * Hit GET /api/contest
 */
export const getContests = async (req, res, next) => {
  try {
    // 1. Fetch all contests from the database using our service
    const contests = await contestService.getAllContests();
    
    // 2. Return the list of contests in a JSON response
    return res.status(httpStatus.OK).json({
      success: true,
      data: contests,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * joinContest: This handles a user joining a specific contest.
 */
export const joinContest = async (req, res, next) => {
  try {
    // 1. Get the contest ID from the user's body (JSON)
    const { contest_id } = req.body;
    
    // 2. Get the unique user ID from the authentication token (who is logged in?)
    const userId = Number(req.user?.sub); 

    // 3. Make sure we have a contest ID and a user ID
    if (!contest_id) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'contest_id is required');
    }
    if (!userId) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
    }

    // 4. Use the service logic to join the contest
    // This will check if they have enough money and if the contest has already started
    const result = await contestService.joinContest(userId, Number(contest_id));

    // 5. Success response
    return res.status(httpStatus.OK).json({
      success: true,
      message: 'Joined contest successfully',
      data: result,
    });
  } catch (err) {
    // 6. Handle specific business logic errors from the service
    if (err.message === 'Contest not found' || err.message === 'User not found') {
        return next(new ApiError(httpStatus.NOT_FOUND, err.message));
    }
    if (err.message === 'Cannot join. Contest has already started.' || 
        err.message === 'User has already joined this contest' || 
        err.message === 'Active subscription required to join contests') {
        return next(new ApiError(httpStatus.BAD_REQUEST, err.message));
    }
    return next(err);
  }
};

/**
 * submitContest: Handles full contest submission and score calculation.
 */
export const submitContest = async (req, res, next) => {
  try {
    const userId = Number(req.user?.sub);
    const { contest_id, answers, time_taken } = req.body;

    if (!contest_id || !Array.isArray(answers) || typeof time_taken !== 'number') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'contest_id, answers, and time_taken are required');
    }

    const result = await contestService.submitContest(
      userId,
      Number(contest_id),
      answers,
      time_taken,
    );

    return res.status(httpStatus.OK).json({
      success: true,
      data: result,
    });
  } catch (err) {
    if (
      err.message === 'Contest has not started' ||
      err.message === 'Contest has ended' ||
      err.message === 'User has not joined this contest' ||
      err.message === 'Duplicate submission not allowed' ||
      err.message === 'Answers must be an array' ||
      err.message === 'Duplicate question IDs in answers'
    ) {
      return next(new ApiError(httpStatus.BAD_REQUEST, err.message));
    }
    if (err.message === 'Contest not found') {
      return next(new ApiError(httpStatus.NOT_FOUND, err.message));
    }
    return next(err);
  }
};

/**
 * getQuestions: Fetches the questions for a contest once a user has joined.
 */
export const getQuestions = async (req, res, next) => {
  try {
    // 1. Get the contest ID from the URL (e.g., /contest/1/questions)
    const { id: contestId } = req.params;
    const userId = Number(req.user?.sub); // The logged-in user's ID
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.page_size) || 10;

    if (!contestId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'contest_id is required');
    }

    // 2. Fetch randomized questions for this user and initialize the timer
    const questions = await quizService.getContestQuestions(userId, Number(contestId), page, pageSize);

    // 3. Return the paginated questions to the user
    return res.status(httpStatus.OK).json({
      success: true,
      data: questions,
    });
  } catch (err) {
    if (err.message === 'Contest not found') {
      return next(new ApiError(httpStatus.NOT_FOUND, err.message));
    }
    if (err.message === 'No questions found for this contest') {
      return next(new ApiError(httpStatus.NOT_FOUND, err.message));
    }
    return next(err);
  }
};

export const getSubmissionReview = async (req, res, next) => {
  try {
    const { id: contestId } = req.params;
    const userId = Number(req.user?.sub);

    if (!contestId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'contest_id is required');
    }

    const review = await contestService.getSubmissionReview(userId, Number(contestId));

    return res.status(httpStatus.OK).json({
      success: true,
      data: review,
    });
  } catch (err) {
    if (err.message === 'Submission not found for this contest') {
      return next(new ApiError(httpStatus.NOT_FOUND, err.message));
    }
    return next(err);
  }
};

/**
 * submitAnswer: Handles when a user clicks an option for a question.
 */
export const submitAnswer = async (req, res, next) => {
  try {
    const { id: contestId } = req.params;
    const { question_id, selected_option } = req.body; // What did they pick?
    const userId = Number(req.user?.sub);

    if (!contestId || !question_id || !selected_option) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'contest_id, question_id, and selected_option are required');
    }

    // 1. Use the quiz service to process the answer
    // It checks if they were too slow, if it's correct, and calculates points
    const result = await quizService.submitAnswer(
      userId,
      Number(contestId),
      Number(question_id),
      selected_option
    );

    // 2. Return everything the user needs to know about their answer
    return res.status(httpStatus.OK).json({
      success: true,
      message: 'Answer submitted successfully',
      data: {
        is_correct: result.response.isCorrect, // Were they right?
        is_timeout: result.response.isTimeout, // Were they too slow?
        points_earned: result.pointsEarned, // How many points for THIS question?
        current_score: result.currentScore, // Total score for the contest
        current_streak: result.currentStreak, // How many correct in a row?
        response_id: result.response.id, // Audit ID
      },
    });
  } catch (err) {
    // 3. Error reporting (duplicate answers, missing sessions, etc.)
    if (
      err.message === 'You have already answered this question' ||
      err.message === 'Quiz session not found. Please fetch questions first.' ||
      err.message === 'User has not joined this contest'
    ) {
      return next(new ApiError(httpStatus.BAD_REQUEST, err.message));
    }
    if (err.message === 'Invalid question or contest') {
      return next(new ApiError(httpStatus.NOT_FOUND, err.message));
    }
    return next(err);
  }
};

/**
 * getLeaderboard: Fetches the rankings for a specific contest.
 */
export const getLeaderboard = async (req, res, next) => {
  try {
    const { id: contestId } = req.params;

    if (!contestId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'contest_id is required');
    }

    const result = await contestService.getLeaderboard(Number(contestId));

    return res.status(httpStatus.OK).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * distributePrizes: This is for the admin to distribute points/money to winners.
 */
export const distributePrizes = async (req, res, next) => {
  try {
    const { id: contestId } = req.params;

    if (!contestId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'contest_id is required');
    }

    // 1. Trigger the prize distribution logic
    // This will calculate 50%, 30%, 20% splits and automatically credit wallets
    const contest = await prizeService.distributeContestPrizes(Number(contestId));

    return res.status(httpStatus.OK).json({
      success: true,
      message: 'Prizes distributed successfully',
      data: contest,
    });
  } catch (err) {
    if (err.message === 'Contest not found') {
      return next(new ApiError(httpStatus.NOT_FOUND, err.message));
    }
    if (err.message === 'Prizes have already been distributed for this contest') {
      return next(new ApiError(httpStatus.BAD_REQUEST, err.message));
    }
    return next(err);
  }
};
