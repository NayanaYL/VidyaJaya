import { prisma } from '../config/database.js'; // The database manager

// Subscription plan pricing (in INR, for future payment integration)
// TODO: Move to environment variables or config
const SUBSCRIPTION_PRICES = {
  weekly: 100,   // ₹100 for weekly plan
  monthly: 400,  // ₹400 for monthly plan
};

/**
 * getPlanPrice: Get the price for a subscription plan.
 * @param {string} planType - 'weekly' or 'monthly'
 * @returns {number} Price in INR
 */
export const getPlanPrice = (planType) => {
  return SUBSCRIPTION_PRICES[planType] || 0;
};

/**
 * getPlanDuration: Get the duration in milliseconds for a plan type.
 * @param {string} planType - 'weekly' or 'monthly'
 * @returns {number} Duration in milliseconds
 */
export const getPlanDuration = (planType) => {
  if (planType === 'weekly') {
    return 7 * 24 * 60 * 60 * 1000; // 7 days
  } else if (planType === 'monthly') {
    return 30 * 24 * 60 * 60 * 1000; // 30 days
  }
  return 0;
};

/**
 * createSubscription: Creates or extends a user's subscription.
 * NOTE: This should only be called AFTER successful payment verification.
 *
 * @param {number} userId
 * @param {string} planType - 'weekly' or 'monthly'
 */
export const createSubscription = async (userId, planType) => {
  const now = new Date();
  const additionalDuration = getPlanDuration(planType);

  if (!additionalDuration) {
    throw new Error('Invalid plan type. Must be "weekly" or "monthly"');
  }

  // Check if user already has a subscription
  const existingSubscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (existingSubscription && existingSubscription.endDate > now) {
    // Extend existing active subscription
    const newEndDate = new Date(existingSubscription.endDate.getTime() + additionalDuration);
    return await prisma.subscription.update({
      where: { userId },
      data: {
        planType, // Update plan type to the new one
        endDate: newEndDate,
        status: 'active',
      },
    });
  } else {
    // Create new subscription (either no existing subscription or existing one is expired)
    const endDate = new Date(now.getTime() + additionalDuration);
    if (existingSubscription) {
      // Update expired subscription
      return await prisma.subscription.update({
        where: { userId },
        data: {
          planType,
          startDate: now,
          endDate,
          status: 'active',
        },
      });
    } else {
      // Create new subscription
      return await prisma.subscription.create({
        data: {
          userId,
          planType,
          startDate: now,
          endDate,
          status: 'active',
        },
      });
    }
  }
};

/**
 * getSubscriptionStatus: Gets the current subscription status for a user.
 * @param {number} userId
 */
export const getSubscriptionStatus = async (userId) => {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return {
      hasSubscription: false,
      status: 'none',
      planType: null,
      startDate: null,
      endDate: null,
    };
  }

  const now = new Date();
  const isActive = subscription.status === 'active' && subscription.endDate > now;

  // Update status if expired
  if (subscription.status === 'active' && subscription.endDate <= now) {
    await prisma.subscription.update({
      where: { userId },
      data: { status: 'expired' },
    });
    subscription.status = 'expired';
  }

  return {
    hasSubscription: true,
    status: subscription.status,
    planType: subscription.planType,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    isActive,
  };
};

/**
 * checkActiveSubscription: Checks if a user has an active subscription.
 * @param {number} userId
 */
export const checkActiveSubscription = async (userId) => {
  const status = await getSubscriptionStatus(userId);
  return status.isActive;
};