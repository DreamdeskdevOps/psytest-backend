const express = require('express');
const adminAuthController = require('../../controllers/admin/adminAuthController');
const { authenticateAdmin } = require('../../middleware/auth');
const { rateLimitLogin, rateLimitPasswordChange } = require('../../middleware/rateLimiter');

const router = express.Router();

// Public routes (no authentication required)
router.post('/login', rateLimitLogin, adminAuthController.login);
router.post('/forgot-password-otp', rateLimitLogin, adminAuthController.sendForgotPasswordOTP);
router.post('/reset-password-otp', rateLimitPasswordChange, adminAuthController.resetPasswordWithOTP);
router.post('/verify-otp', adminAuthController.verifyOTP);
router.post('/resend-otp', rateLimitLogin, adminAuthController.resendOTP);

// Protected routes (authentication required)
router.post('/logout', authenticateAdmin, adminAuthController.logout);
router.get('/profile', authenticateAdmin, adminAuthController.getProfile);
router.put('/profile', authenticateAdmin, adminAuthController.updateProfile);
router.post('/change-password', authenticateAdmin, rateLimitPasswordChange, adminAuthController.changePassword);

module.exports = router;