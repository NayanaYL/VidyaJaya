import httpStatus from 'http-status'; // Easy-to-read names for HTTP status codes
import * as walletService from '../services/wallet.service.js'; // The helper service for all wallet/money operations
import { ApiError } from '../utils/apiError.js'; // Our custom error reporter

/**
 * getBalance: This handles checking how much money a user has in their wallet.
 * Hit GET /api/wallet/balance
 */
export const getBalance = async (req, res, next) => {
  try {
    // 1. Get the current user ID from their login token (decoded in auth middleware)
    const userId = Number(req.user?.sub); 

    if (!userId) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
    }

    // 2. Use the service to fetch the wallet balance from the database
    const wallet = await walletService.getWalletBalance(userId);

    // 3. Return the balance
    return res.status(httpStatus.OK).json({
      success: true,
      data: {
        balance: wallet.balance, // The exact amount they have
        userId: wallet.userId, // Their identity
      },
    });
  } catch (err) {
    // If the database can't find a wallet for this user, report it
    if (err.message === 'Wallet not found') {
      return next(new ApiError(httpStatus.NOT_FOUND, err.message));
    }
    return next(err);
  }
};

/**
 * addMoney: Handles depositing money into a user's wallet.
 * Hit POST /api/wallet/add-money
 */
export const addMoney = async (req, res, next) => {
  try {
    const userId = Number(req.user?.sub);
    const { amount } = req.body; // How much do they want to add?

    // 1. Check if the amount is a valid positive number
    if (!amount || amount <= 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid amount. Must be a positive number.');
    }

    // 2. Call the service to atomically add money and log a transaction
    const wallet = await walletService.addMoney(userId, Number(amount));

    // 3. Success response
    return res.status(httpStatus.OK).json({
      success: true,
      message: `${amount} added to wallet successfully`,
      data: wallet,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * deduct: Handles taking money OUT of a wallet (e.g., for a withdrawal).
 * Hit POST /api/wallet/deduct
 */
export const deduct = async (req, res, next) => {
  try {
    const userId = Number(req.user?.sub);
    const { amount } = req.body; // How much to take out?

    if (!amount || amount <= 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid amount. Must be a positive number.');
    }

    // 1. Call the service to deduct money safely
    // It will check if they have enough balance before proceeding
    const wallet = await walletService.deductMoney(userId, Number(amount));

    // 2. Success response
    return res.status(httpStatus.OK).json({
      success: true,
      message: `${amount} deducted from wallet successfully`,
      data: wallet,
    });
  } catch (err) {
    // 3. If they don't have enough money, report it
    if (err.message === 'Insufficient balance') {
        return next(new ApiError(httpStatus.BAD_REQUEST, err.message));
    }
    return next(err);
  }
};
