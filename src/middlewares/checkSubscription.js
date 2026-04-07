import httpStatus from 'http-status'; // Easy-to-read names for HTTP status codes
import { prisma } from '../config/database.js'; // The database manager
import { ApiError } from '../utils/apiError.js'; // Custom error reporter

/**
 * checkSubscription: This is a middleware function that checks if a user has an active subscription.
 * It sits between the user's request and contest access.
 */
export const checkSubscription = async (req, res, next) => {
  try {
    // 1. Get the unique user ID from the authentication token
    const userId = Number(req.user?.sub);

    if (!userId) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized'));
    }

    // 2. Fetch the user's subscription directly from database
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    // 3. Always validate time, not just status
    if (!subscription || new Date() > subscription.endDate) {
      return next(new ApiError(httpStatus.FORBIDDEN, 'Active subscription required to access contests'));
    }

    // 4. Success! User has active subscription, proceed to the next middleware/controller
    return next();
  } catch (err) {
    // 5. If anything goes wrong, send the error
    return next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Error checking subscription status'));
  }
};