import express from 'express'; // Create the routes for our RESTful API
import {
  getWeeklyLeaderboard,
  getWeeklyLeaderboardTop,
  getWeeklyRewardHistory,
  getCurrentWeekRewards,
  distributeWeeklyRewards
} from '../controllers/weeklyLeaderboard.controller.js'; // The logic functions
import { authenticate } from '../middlewares/auth.js'; // The security guard

// 1. Initialize the router tool
const router = express.Router();

/**
 * Route to get the current week's leaderboard with user's ranking
 * Requires login!
 * Hit GET /api/weekly-leaderboard
 */
router.get('/', authenticate, getWeeklyLeaderboard);

/**
 * Route to get top performers for the current week
 * Hit GET /api/weekly-leaderboard/top?limit=10
 */
router.get('/top', getWeeklyLeaderboardTop);

/**
 * Route to get user's weekly reward history
 * Requires login!
 * Hit GET /api/weekly-rewards/history?limit=10
 */
router.get('/history', authenticate, getWeeklyRewardHistory);

/**
 * Route to get rewards distributed for the current week
 * Hit GET /api/weekly-rewards/current
 */
router.get('/current', getCurrentWeekRewards);

/**
 * Route to manually distribute weekly rewards (admin)
 * Hit POST /api/weekly-rewards/distribute
 */
router.post('/distribute', distributeWeeklyRewards);

// Export the router so it can be used in app.js
export default router;