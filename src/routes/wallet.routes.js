import express from 'express'; // Create the routing table for our RESTful wallet API
import { getBalance, addMoney, deduct } from '../controllers/wallet.controller.js'; // The logic functions
import { authenticate } from '../middlewares/auth.js'; // The security check

// 1. Initialize the router
const router = express.Router();

/**
 * Route to get the user's wallet balance
 * Requires login!
 * Hit GET /api/wallet/balance
 */
router.get('/balance', authenticate, getBalance);

/**
 * Route to deposit money into the wallet
 * Requires login!
 * Hit POST /api/wallet/add-money
 */
router.post('/add-money', authenticate, addMoney);

/**
 * Route to withdraw money from the wallet
 * Requires login!
 * Hit POST /api/wallet/deduct
 */
router.post('/deduct', authenticate, deduct);

// Export the router so it can be used in app.js
export default router;
