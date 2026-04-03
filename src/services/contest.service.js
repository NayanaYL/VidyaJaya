import { prisma } from '../config/database.js'; // The database manager

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
 * joinContest: ATOMIC transaction to join a contest.
 * This checks if the user has enough money and deducts the fee.
 * @param {number} userId 
 * @param {number} contestId 
 */
export const joinContest = async (userId, contestId) => {
  // Use a transaction so that if ANY step fails, no data is saved.
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch details about the contest and the user's wallet
    const [contest, userWallet] = await Promise.all([
      tx.contest.findUnique({ where: { id: contestId } }),
      tx.wallet.findUnique({ where: { userId } }),
    ]);

    // 2. Validate everything
    if (!contest) throw new Error('Contest not found');
    if (!userWallet) throw new Error('User not found');

    // 3. Prevent joining if the contest already started!
    if (new Date() > new Date(contest.start_time)) {
      throw new Error('Cannot join. Contest has already started.');
    }

    // 4. Check if we already joined
    const existing = await tx.contestParticipant.findUnique({
      where: { userId_contestId: { userId, contestId } },
    });
    if (existing) throw new Error('User has already joined this contest');

    // 5. Check if the user can afford the entry fee
    if (userWallet.balance < contest.entry_fee) {
      throw new Error('Insufficient wallet balance');
    }

    // 6. DEDUCT MONEY: Take the fee out of their wallet
    await tx.wallet.update({
      where: { userId },
      data: { balance: { decrement: contest.entry_fee } },
    });

    // 7. LOG TRANSACTION: Record that they paid for this contest
    await tx.transaction.create({
      data: {
        userId,
        type: 'CONTEST_FEE',
        amount: -contest.entry_fee, // Record as negative amount
        status: 'SUCCESS',
      },
    });

    // 8. RECORD PARTICIPATION: Actually sign them up for the contest!
    return await tx.contestParticipant.create({
      data: {
        userId,
        contestId,
      },
    });
  });
};
