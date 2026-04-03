import express from 'express';

import { login, register, me, updateMe } from '../controllers/auth.controller.js';
import { sendOtpController, verifyOtpController } from '../controllers/otp.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

// OTP-based phone authentication
router.post('/send-otp', sendOtpController);
router.post('/verify-otp', verifyOtpController);

// Protected route: requires JWT
router.get('/me', authenticate, me);
router.patch('/me', authenticate, updateMe);

export default router;

