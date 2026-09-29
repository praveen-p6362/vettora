import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { authLimiter, otpRequestLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', otpRequestLimiter, auth.register);
router.post('/resend-otp', otpRequestLimiter, auth.resendOtp);
router.post('/verify-otp', authLimiter, auth.verifyOtp);
router.post('/login', authLimiter, auth.login);
router.post('/forgot-password', otpRequestLimiter, auth.forgotPassword);
router.post('/reset-password', authLimiter, auth.resetPassword);
router.get('/me', requireAuth, auth.me);

export default router;
