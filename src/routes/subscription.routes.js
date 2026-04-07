import express from 'express'; // Create the routes for our RESTful API
import { subscribe, getStatus, verifyPayment } from '../controllers/subscription.controller.js'; // The logic functions
import { authenticate } from '../middlewares/auth.js'; // The security guard

// 1. Initialize the router tool
const router = express.Router();

/**
 * Route to subscribe to a plan
 * CURRENT: Direct subscription creation
 * FUTURE: Will initiate payment flow
 * Requires login!
 * Hit POST /api/subscription/subscribe
 */
router.post('/subscribe', authenticate, subscribe);

/**
 * Route to verify payment and create subscription
 * FUTURE ENDPOINT: Will be called after successful payment
 * Requires login!
 * Hit POST /api/subscription/verify-payment
 */
router.post('/verify-payment', authenticate, verifyPayment);

/**
 * Route to get subscription status
 * Requires login!
 * Hit GET /api/subscription/status
 */
router.get('/status', authenticate, getStatus);

// Export the router so it can be used in app.js
export default router;