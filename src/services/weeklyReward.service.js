import { prisma } from '../config/database.js'; // The database manager
import { calculateWeeklyLeaderboard } from './weeklyLeaderboard.service.js';

// Weekly reward configuration
const WEEKLY_REWARDS = {
  1: 500,   // 1st place: ₹500
  2: 300,   // 2nd place: ₹300
  3: 200,   // 3rd place: ₹200
  4: 100,   // 4th-10th place: ₹100
  5: 100,
  6: 100,
  7: 100,
  8: 100,
  9: 100,
  10: 100,
};

// Minimum contests required to be eligible for rewards
const MIN_CONTESTS_REQUIRED = 3;

/**
 * distributeWeeklyRewards: Distribute rewards to top weekly performers.
 * Only runs once per week and only for users who played minimum contests.
 * @param {Date} weekStart - Start of the week
 * @param {Date} weekEnd - End of the week
 */
export const distributeWeeklyRewards = async (weekStart, weekEnd) => {
  // Use transaction for atomicity
  return await prisma.$transaction(async (tx) => {
    // 1. Check if rewards were already distributed for this week
    const weekIdentifier = weekStart.toISOString().split('T')[0]; // YYYY-MM-DD format
    const existingDistribution = await tx.weeklyReward.findFirst({
      where: { weekStart: weekStart },
    });

    if (existingDistribution) {
      throw new Error(`Weekly rewards already distributed for week starting ${weekIdentifier}`);
    }

    // 2. Calculate weekly leaderboard
    const leaderboardResult = await calculateWeeklyLeaderboard(weekStart, weekEnd);

    if (leaderboardResult.rankings.length === 0) {
      throw new Error('No participants found for this week');
    }

    // 3. Filter eligible users (minimum contests played)
    const eligibleRankings = leaderboardResult.rankings.filter(
      ranking => ranking.contestsPlayed >= MIN_CONTESTS_REQUIRED
    );

    if (eligibleRankings.length === 0) {
      throw new Error(`No users eligible for rewards (minimum ${MIN_CONTESTS_REQUIRED} contests required)`);
    }

    // 4. Distribute rewards to top 10 eligible users
    const rewardDistributions = [];
    const topEligible = eligibleRankings.slice(0, 10);

    for (let i = 0; i < topEligible.length; i++) {
      const ranking = topEligible[i];
      const rewardAmount = WEEKLY_REWARDS[ranking.rank] || 0;

      if (rewardAmount > 0) {
        // Update user's wallet
        await tx.wallet.upsert({
          where: { userId: ranking.userId },
          update: { balance: { increment: rewardAmount } },
          create: { userId: ranking.userId, balance: rewardAmount },
        });

        // Log the reward transaction
        await tx.transaction.create({
          data: {
            userId: ranking.userId,
            type: 'WEEKLY_REWARD',
            amount: rewardAmount,
            status: 'SUCCESS',
          },
        });

        // Record the weekly reward distribution
        const distribution = await tx.weeklyReward.create({
          data: {
            userId: ranking.userId,
            weekStart: weekStart,
            weekEnd: weekEnd,
            rank: ranking.rank,
            totalScore: ranking.totalScore,
            contestsPlayed: ranking.contestsPlayed,
            averageScore: ranking.averageScore,
            rewardAmount: rewardAmount,
          },
        });

        rewardDistributions.push({
          userId: ranking.userId,
          userName: ranking.name,
          rank: ranking.rank,
          rewardAmount,
          distributionId: distribution.id,
        });
      }
    }

    return {
      weekStart,
      weekEnd,
      totalContests: leaderboardResult.totalContests,
      eligibleUsers: eligibleRankings.length,
      rewardedUsers: rewardDistributions.length,
      distributions: rewardDistributions,
    };
  });
};

/**
 * getWeeklyRewardHistory: Get reward history for a user.
 * @param {number} userId
 * @param {number} limit - Number of recent rewards to return
 */
export const getWeeklyRewardHistory = async (userId, limit = 10) => {
  return await prisma.weeklyReward.findMany({
    where: { userId },
    orderBy: { weekStart: 'desc' },
    take: limit,
    select: {
      id: true,
      weekStart: true,
      weekEnd: true,
      rank: true,
      totalScore: true,
      contestsPlayed: true,
      averageScore: true,
      rewardAmount: true,
      createdAt: true,
    },
  });
};

/**
 * getCurrentWeekRewards: Get rewards distributed for the current week.
 */
export const getCurrentWeekRewards = async () => {
  // Calculate current week
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  monday.setHours(0, 0, 0, 0);

  return await prisma.weeklyReward.findMany({
    where: {
      weekStart: monday,
    },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
    orderBy: { rank: 'asc' },
  });
};