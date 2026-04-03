import { getRedisClient } from '../config/redis.js'; // Connection to our fast storage (Redis)
import { prisma } from '../config/database.js'; // Connection to our standard storage (PostgreSQL)

/**
 * updateMemberScore: Updates a user's rank in the real-time leaderboard.
 * We use Redis "Sorted Sets" (ZSET) because they keep everyone in order automatically.
 * @param {number} contestId 
 * @param {number} userId 
 * @param {number} score 
 */
export const updateMemberScore = async (contestId, userId, score) => {
  const redis = await getRedisClient();
  if (!redis) return;

  const key = `leaderboard:contest:${contestId}`;
  
  // ZADD adds the user (member) with a specific score
  // If they are already there, it just updates their score
  await redis.zAdd(key, {
    score: score,
    value: userId.toString(),
  });
};

/**
 * getContestLeaderboard: Fetches the Top 10 users for a contest.
 * It also finds the CURRENT user's personal rank and score.
 * @param {number} contestId 
 * @param {number} currentUserId 
 */
export const getContestLeaderboard = async (contestId, currentUserId) => {
  const redis = await getRedisClient();
  const key = `leaderboard:contest:${contestId}`;

  let top10Raw = [];
  let userRank = null;
  let userScore = null;

  if (redis) {
    // 1. Get Top 10 from Redis (High-performance)
    // ZREVRANGE gives us the highest scores first (Reverse range)
    top10Raw = await redis.zRangeWithScores(key, 0, 9, { REV: true });
    
    // 2. Get current user's rank (ZREVRANK is 0-indexed, so we add 1)
    const rankRaw = await redis.zRevRank(key, currentUserId.toString());
    userRank = rankRaw !== null ? rankRaw + 1 : null;
    
    // 3. Get current user's score
    userScore = await redis.zScore(key, currentUserId.toString());
  }

  // 4. FALLBACK: If Redis is empty or failing, get data from the database
  if (top10Raw.length === 0) {
    const participants = await prisma.contestParticipant.findMany({
      where: { contestId },
      orderBy: { score: 'desc' },
      take: 10,
      include: { user: { select: { name: true } } },
    });

    return {
      top10: participants.map((p, index) => ({
        rank: index + 1,
        userId: p.userId,
        name: p.user?.name || 'Anonymous',
        score: p.score,
      })),
      user: {
        rank: null, // Calculating rank from DB for 1 specific user is heavy, so we skip it in fallback
        score: null,
      }
    };
  }

  // 5. Enrich Redis IDs with User Names from the database
  const userIds = top10Raw.map(item => Number(item.value));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });

  const nameMap = Object.fromEntries(users.map(u => [u.id, u.name]));

  // 6. Return the final formatted leaderboard
  return {
    top10: top10Raw.map((item, index) => ({
      rank: index + 1,
      userId: Number(item.value),
      name: nameMap[Number(item.value)] || 'Anonymous',
      score: item.score,
    })),
    user: {
      rank: userRank,
      score: userScore,
    }
  };
};
