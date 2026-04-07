import { prisma } from '../config/database.js'; // The database manager
import { getRedisClient } from '../config/redis.js'; // Connection to our fast storage (Redis)

/**
 * calculateWeeklyLeaderboard: Calculate weekly rankings based on contest performance.
 * Aggregates scores from all contests completed in the current week.
 * @param {Date} weekStart - Start of the week (Monday 00:00)
 * @param {Date} weekEnd - End of the week (Sunday 23:59)
 */
export const calculateWeeklyLeaderboard = async (weekStart, weekEnd) => {
  // 1. Find all contests that ended within this week
  const contests = await prisma.contest.findMany({
    where: {
      start_time: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    select: { id: true },
  });

  const contestIds = contests.map(c => c.id);

  if (contestIds.length === 0) {
    return { rankings: [], totalContests: 0 };
  }

  // 2. Aggregate scores for each user across all contests this week
  const participants = await prisma.contestParticipant.findMany({
    where: {
      contestId: { in: contestIds },
    },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  // 3. Calculate total scores and contest participation
  const userStats = new Map();

  participants.forEach(participant => {
    const userId = participant.userId;
    const userName = participant.user?.name || 'Anonymous';

    if (!userStats.has(userId)) {
      userStats.set(userId, {
        userId,
        name: userName,
        totalScore: 0,
        contestsPlayed: 0,
        averageScore: 0,
      });
    }

    const stats = userStats.get(userId);
    stats.totalScore += participant.score;
    stats.contestsPlayed += 1;
  });

  // Calculate average scores
  const rankings = Array.from(userStats.values())
    .map(stats => ({
      ...stats,
      averageScore: Math.round(stats.totalScore / stats.contestsPlayed),
    }))
    .sort((a, b) => {
      // Sort by average score (descending), then by total contests played (descending)
      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      return b.contestsPlayed - a.contestsPlayed;
    })
    .map((stats, index) => ({
      rank: index + 1,
      ...stats,
    }));

  return {
    rankings,
    totalContests: contestIds.length,
    weekStart,
    weekEnd,
  };
};

/**
 * getWeeklyLeaderboard: Get the current week's leaderboard from cache or calculate it.
 * @param {number} currentUserId - Optional: Include user's personal ranking
 */
export const getWeeklyLeaderboard = async (currentUserId = null) => {
  const redis = await getRedisClient();

  // Calculate current week (Monday to Sunday)
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1); // Monday of current week
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6); // Sunday of current week
  sunday.setHours(23, 59, 59, 999);

  const cacheKey = `weekly_leaderboard:${monday.toISOString().split('T')[0]}`;

  // Try to get from cache first
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      // Add current user's ranking if requested
      if (currentUserId) {
        const userRanking = data.rankings.find(r => r.userId === currentUserId);
        data.userRanking = userRanking || null;
      }
      return data;
    }
  }

  // Calculate weekly leaderboard
  const result = await calculateWeeklyLeaderboard(monday, sunday);

  // Cache the result for 1 hour
  if (redis) {
    await redis.setEx(cacheKey, 3600, JSON.stringify(result));
  }

  // Add current user's ranking if requested
  if (currentUserId) {
    const userRanking = result.rankings.find(r => r.userId === currentUserId);
    result.userRanking = userRanking || null;
  }

  return result;
};

/**
 * getWeeklyLeaderboardTop: Get top N performers for the current week.
 * @param {number} limit - Number of top performers to return (default: 10)
 */
export const getWeeklyLeaderboardTop = async (limit = 10) => {
  const result = await getWeeklyLeaderboard();
  return {
    ...result,
    rankings: result.rankings.slice(0, limit),
  };
};