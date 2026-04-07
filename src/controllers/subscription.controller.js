import httpStatus from 'http-status'; // Easy-to-read names for HTTP status codes
import * as subscriptionService from '../services/subscription.service.js'; // The helper service for subscription operations
import * as paymentService from '../services/payment.service.js'; // Payment gateway integration (placeholder)
import { ApiError } from '../utils/apiError.js'; // Our custom error reporter

/**
 * subscribe: This controller handles subscription creation/updates.
 * CURRENT: Mock subscription creation (for development/testing)
 * FUTURE: Payment integration required
 *
 * It's what gets called when you hit POST /api/subscription/subscribe
 */
export const subscribe = async (req, res, next) => {
  try {
    // 1. Get the unique user ID from the authentication token
    const userId = Number(req.user?.sub);

    // 2. Extract the plan type from the request
    const planType = req.body.plan_type || req.body.planType;

    // 3. Validate inputs
    if (!planType || !['weekly', 'monthly'].includes(planType)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'plan_type is required and must be "weekly" or "monthly"');
    }
    if (!userId) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
    }

    // ✅ DIRECTLY CREATE SUBSCRIPTION (skip payment for development)
    const subscription = await subscriptionService.createSubscription(userId, planType);

    return res.status(httpStatus.CREATED).json({
      success: true,
      message: 'Subscription activated (mock - development mode)',
      data: subscription,
    });
  } catch (err) {
    // If anything goes wrong, send the error to our global error handler
    return next(err);
  }
};

/**
 * verifyPayment: Handle payment verification and subscription creation.
 * FUTURE ENDPOINT: POST /api/subscription/verify-payment
 *
 * This will be called after successful payment to actually create the subscription.
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const { paymentId, orderId, signature, planType } = req.body;
    const userId = Number(req.user?.sub);

    // Validate inputs
    if (!paymentId || !orderId || !signature || !planType) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'paymentId, orderId, signature, and planType are required');
    }
    if (!['weekly', 'monthly'].includes(planType)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid plan type');
    }
    if (!userId) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
    }

    // 1. Verify payment with payment gateway
    const isValid = await paymentService.verifyPayment(paymentId, orderId, signature);

    if (!isValid) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Payment verification failed');
    }

    // 2. If payment is valid, create/update subscription
    const subscription = await subscriptionService.createSubscription(userId, planType);

    // 3. Return success response
    return res.status(httpStatus.CREATED).json({
      success: true,
      message: 'Payment verified and subscription activated successfully',
      data: subscription
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * getStatus: This controller handles getting subscription status.
 * It's what gets called when you hit GET /api/subscription/status
 */
export const getStatus = async (req, res, next) => {
  try {
    // 1. Get the unique user ID from the authentication token
    const userId = Number(req.user?.sub);

    if (!userId) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
    }

    // 2. Get subscription status from the service
    const status = await subscriptionService.getSubscriptionStatus(userId);

    // 3. Return the status
    return res.status(httpStatus.OK).json({
      success: true,
      data: status,
    });
  } catch (err) {
    return next(err);
  }
};