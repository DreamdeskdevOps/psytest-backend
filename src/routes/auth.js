const express = require('express');
const router = express.Router();

// Import controller methods (clean import)
const userAuthController = require('../controllers/auth/userAuthController');

// Import middleware
const { authMiddleware } = require('../middleware/auth');

// Import validations
const {
  validateSendRegistrationOTP,
  validateUserRegistration,
  validateUserLogin,
  validateProfileUpdate,
  validateChangePassword,
  validateSendForgotPasswordOTP,
  validateResetPasswordWithOTP,
  validateOTPVerification,
  validateResendOTP,
  validateSendPhoneVerificationOTP,
  validateOTPStatus
} = require('../utils/validation');

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * @route   POST /api/v1/auth/send-registration-otp
 * @desc    Send OTP for user registration
 * @access  Public
 */
router.post('/send-registration-otp', 
  validateSendRegistrationOTP, 
  userAuthController.sendRegistrationOTP
);

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user with OTP verification
 * @access  Public
 */
router.post('/register', 
  validateUserRegistration, 
  userAuthController.register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user (direct login)
 * @access  Public
 */
router.post('/login',
  validateUserLogin,
  userAuthController.login
);

/**
 * @route   POST /api/v1/auth/validate-credentials
 * @desc    Validate credentials and send login OTP
 * @access  Public
 */
router.post('/validate-credentials',
  validateUserLogin,
  userAuthController.validateCredentialsAndSendLoginOTP
);

/**
 * @route   POST /api/v1/auth/complete-login
 * @desc    Complete login with OTP verification
 * @access  Public
 */
router.post('/complete-login',
  userAuthController.completeLoginWithOTP
);

/**
 * @route   POST /api/v1/auth/send-forgot-password-otp
 * @desc    Send OTP for password reset
 * @access  Public
 */
router.post('/send-forgot-password-otp', 
  validateSendForgotPasswordOTP, 
  userAuthController.sendForgotPasswordOTP
);

/**
 * @route   POST /api/v1/auth/reset-password-otp
 * @desc    Reset password using OTP
 * @access  Public
 */
router.post('/reset-password-otp', 
  validateResetPasswordWithOTP, 
  userAuthController.resetPasswordWithOTP
);

/**
 * @route   POST /api/v1/auth/verify-otp
 * @desc    Verify OTP for any purpose
 * @access  Public
 */
router.post('/verify-otp', 
  validateOTPVerification, 
  userAuthController.verifyOTP
);

/**
 * @route   POST /api/v1/auth/resend-otp
 * @desc    Resend OTP
 * @access  Public
 */
router.post('/resend-otp', 
  validateResendOTP, 
  userAuthController.resendOTP
);

/**
 * @route   GET /api/v1/auth/otp-status
 * @desc    Get OTP status
 * @access  Public
 */
router.get('/otp-status', 
  validateOTPStatus, 
  userAuthController.getOTPStatus
);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get user profile
 * @access  Private (User)
 */
router.get('/profile', 
  authMiddleware, 
  userAuthController.getProfile
);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private (User)
 */
router.put('/profile', 
  authMiddleware, 
  validateProfileUpdate, 
  userAuthController.updateProfile
);

/**
 * @route   POST /api/v1/auth/send-phone-verification-otp
 * @desc    Send OTP for phone number verification (profile update)
 * @access  Private (User)
 */
router.post('/send-phone-verification-otp', 
  authMiddleware, 
  validateSendPhoneVerificationOTP, 
  userAuthController.sendPhoneVerificationOTP
);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private (User)
 */
router.post('/change-password', 
  authMiddleware, 
  validateChangePassword, 
  userAuthController.changePassword
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private (User)
 */
router.post('/logout', 
  authMiddleware, 
  userAuthController.logout
);

module.exports = router;