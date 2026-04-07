import express from 'express'; // Create the routes for our RESTful API
import { createContest, getContests, joinContest, getQuestions, submitAnswer, submitContest, getLeaderboard, distributePrizes, getSubmissionReview } from '../controllers/contest.controller.js'; // The logic functions
import { authenticate } from '../middlewares/auth.js'; // The security guard
import { checkSubscription } from '../middlewares/checkSubscription.js'; // Subscription check middleware

// 1. Initialize the router tool
const router = express.Router();

/**
 * Route to create a new contest
 * Hit POST /api/contest/create
 */
router.post('/create', createContest);

/**
 * Route to list all contests
 * Hit GET /api/contest
 */
router.get('/', getContests);

/**
 * Route to join a contest (requires active subscription)
 * Requires login and active subscription!
 * Hit POST /api/contest/join
 */
router.post('/join', authenticate, checkSubscription, joinContest);

/**
 * Route to get questions for a contest
 * Requires login and active subscription!
 * Hit GET /api/contest/:id/questions
 */
router.get('/:id/questions', authenticate, checkSubscription, getQuestions);

/**
 * Route to submit a full contest answer sheet
 * Requires login!
 * Hit POST /api/contest/submit
 */
router.post('/submit', authenticate, submitContest);

/**
 * Route to submit an answer for a question
 * Requires login!
 * Hit POST /api/contest/:id/submit
 */
router.post('/:id/submit', authenticate, submitAnswer);

/**
 * Route to review submitted answers for a contest
 * Requires login!
 * Hit GET /api/contest/:id/review
 */
router.get('/:id/review', authenticate, getSubmissionReview);

/**
 * Route to get the real-time leaderboard for a contest
 * Hit GET /api/contest/:id/leaderboard
 */
router.get('/:id/leaderboard', getLeaderboard);

/**
 * Route to trigger prize distribution for a contest
 * Hit POST /api/contest/:id/distribute-prizes
 */
router.post('/:id/distribute-prizes', distributePrizes);

// Export the router so it can be added to the main app (app.js)
export default router;
