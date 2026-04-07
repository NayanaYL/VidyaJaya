import httpStatus from 'http-status'; // Easy-to-read names for HTTP status codes
import * as weeklyLeaderboardService from '../services/weeklyLeaderboard.service.js'; // Weekly leaderboard service
import * as weeklyRewardService from '../services/weeklyReward.service.js'; // Weekly reward service
import { ApiError } from '../utils/apiError.js'; // Our custom error reporter

/**
 * getWeeklyLeaderboard: Get the current week's leaderboard.
 * Hit GET /api/weekly-leaderboard
 */
export const getWeeklyLeaderboard = async (req, res, next) => {
  try {
    // Get the current user ID from authentication
    const userId = Number(req.user?.sub);

    if (!userId) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
    }

    // Get weekly leaderboard with user's personal ranking
    const leaderboard = await weeklyLeaderboardService.getWeeklyLeaderboard(userId);

    return res.status(httpStatus.OK).json({
      success: true,
      data: leaderboard,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * getWeeklyLeaderboardTop: Get top performers for the current week.
 * Hit GET /api/weekly-leaderboard/top
 */
export const getWeeklyLeaderboardTop = async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    if (limit < 1 || limit > 50) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Limit must be between 1 and 50');
    }

    const leaderboard = await weeklyLeaderboardService.getWeeklyLeaderboardTop(limit);

    return res.status(httpStatus.OK).json({
      success: true,
      data: leaderboard,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * getWeeklyRewardHistory: Get user's weekly reward history.
 * Hit GET /api/weekly-rewards/history
 */
export const getWeeklyRewardHistory = async (req, res, next) => {
  try {
    const userId = Number(req.user?.sub);
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    if (!userId) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
    }

    if (limit < 1 || limit > 50) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Limit must be between 1 and 50');
    }

    const history = await weeklyRewardService.getWeeklyRewardHistory(userId, limit);

    return res.status(httpStatus.OK).json({
      success: true,
      data: history,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * getCurrentWeekRewards: Get rewards distributed for the current week (admin endpoint).
 * Hit GET /api/weekly-rewards/current
 */
export const getCurrentWeekRewards = async (req, res, next) => {
  try {
    // TODO: Add admin authentication check here
    // For now, allowing anyone to see current week rewards

    const rewards = await weeklyRewardService.getCurrentWeekRewards();

    return res.status(httpStatus.OK).json({
      success: true,
      data: rewards,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * distributeWeeklyRewards: Manually trigger weekly reward distribution (admin endpoint).
 * Hit POST /api/weekly-rewards/distribute
 */
export const distributeWeeklyRewards = async (req, res, next) => {
  try {
    // TODO: Add admin authentication check here
    // For now, allowing anyone to trigger (should be restricted in production)

    // Calculate current week (Monday to Sunday)
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const result = await weeklyRewardService.distributeWeeklyRewards(monday, sunday);

    return res.status(httpStatus.CREATED).json({
      success: true,
      message: 'Weekly rewards distributed successfully',
      data: result,
    });
  } catch (err) {
    if (err.message.includes('already distributed')) {
      return next(new ApiError(httpStatus.CONFLICT, err.message));
    }
    if (err.message.includes('No participants') || err.message.includes('No users eligible')) {
      return next(new ApiError(httpStatus.BAD_REQUEST, err.message));
    }
    return next(err);
  }
};