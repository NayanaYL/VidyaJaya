import express from 'express'; // Create the routes for our RESTful API
import { createContest, getContests, joinContest, getQuestions, submitAnswer, getLeaderboard, distributePrizes } from '../controllers/contest.controller.js'; // The logic functions
import { authenticate } from '../middlewares/auth.js'; // The security guard

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
 * Route to join a contest (pay entry fee)
 * Requires login!
 * Hit POST /api/contest/join
 */
router.post('/join', authenticate, joinContest);

/**
 * Route to get questions for a contest
 * Requires login!
 * Hit GET /api/contest/:id/questions
 */
router.get('/:id/questions', authenticate, getQuestions);

/**
 * Route to submit an answer for a question
 * Requires login!
 * Hit POST /api/contest/:id/submit
 */
router.post('/:id/submit', authenticate, submitAnswer);

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
