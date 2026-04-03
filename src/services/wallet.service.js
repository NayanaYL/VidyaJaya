import { prisma } from '../config/database.js'; // The database manager

/**
 * getWalletBalance: Fetches a user's wallet from the database.
 * If they don't have a wallet, it creates a new one with 0 balance.
 * @param {number} userId 
 */
export const getWalletBalance = async (userId) => {
  let wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    // If it's a new user with no wallet, create it now
    wallet = await prisma.wallet.create({
      data: { userId, balance: 0 },
    });
  }

  return wallet;
};

/**
 * addMoney: Atomic logic to deposit money.
 * @param {number} userId 
 * @param {number} amount 
 */
export const addMoney = async (userId, amount) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Transactionally update the balance
    const wallet = await tx.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    });

    // 2. Log the deposit in the transactions table
    await tx.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amount,
        status: 'SUCCESS',
      },
    });

    return wallet;
  });
};

/**
 * deductMoney: Atomic logic to withdraw money.
 * @param {number} userId 
 * @param {number} amount 
 */
export const deductMoney = async (userId, amount) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Check current balance first
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    // 2. Perform the deduction
    const updatedWallet = await tx.wallet.update({
      where: { userId },
      data: { balance: { decrement: amount } },
    });

    // 3. Log the withdrawal
    await tx.transaction.create({
      data: {
        userId,
        type: 'WITHDRAW',
        amount: -amount,
        status: 'SUCCESS',
      },
    });

    return updatedWallet;
  });
};
