import { prisma } from '../config/database.js'; // The database manager

/**
 * Distribute prizes for a completed contest.
 * This function calculates the winners and credits their wallets.
 * Prize splitting: 1st (50%), 2nd (30%), 3rd (20%)
 * @param {number} contestId 
 */
export const distributeContestPrizes = async (contestId) => {
  // Use a transaction so that we don't accidentally pay someone twice if the server crashes
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch the contest and check if prizes were already sent
    const contest = await tx.contest.findUnique({
      where: { id: contestId },
    });

    if (!contest) {
      throw new Error('Contest not found');
    }

    if (contest.isPrizesDistributed) {
      throw new Error('Prizes have already been distributed for this contest');
    }

    // 2. Fetch the top 3 participants from the contest
    // We sort by score (highest first). If scores are tied, we use joinedAt (earliest first).
    const participants = await tx.contestParticipant.findMany({
      where: { contestId },
      orderBy: [
        { score: 'desc' },
        { joinedAt: 'asc' },
      ],
      take: 3, // Only the Top 3 win prizes
    });

    if (participants.length === 0) {
        // If nobody played, we just mark it as distributed and move on
        // No winners to pay.
    } else {
        // 3. Define the prize percentages
        const prizeConfig = [0.5, 0.3, 0.2]; // 50%, 30%, 20%
        
        // 4. Loop through each winner and pay them!
        for (let i = 0; i < participants.length; i++) {
            const winner = participants[i];
            const prizeAmount = contest.prize_pool * prizeConfig[i]; // Calculate the money they get
            
            // A. Update the winner's wallet balance
            // "upsert" means update if it exists, or create it if it doesn't
            await tx.wallet.upsert({
              where: { userId: winner.userId },
              update: { balance: { increment: prizeAmount } }, // Atomically add the prize
              create: { userId: winner.userId, balance: prizeAmount },
            });

            // B. Log the transaction as a "PRIZE_WIN" so they can see it in their history
            await tx.transaction.create({
                data: {
                    userId: winner.userId,
                    type: 'PRIZE_WIN',
                    amount: prizeAmount,
                    status: 'SUCCESS',
                }
            });
        }
    }

    // 5. Mark the contest as "finished and paid" so we don't run this again!
    return await tx.contest.update({
      where: { id: contestId },
      data: { isPrizesDistributed: true },
    });
  });
};
