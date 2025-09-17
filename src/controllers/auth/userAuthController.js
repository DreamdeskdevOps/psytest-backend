const { validationResult } = require('express-validator');
const authService = require('../../services/authService');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/helpers');
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../../utils/constants');

// Send OTP for registration
const sendRegistrationOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, ERROR_MESSAGES.VALIDATION_FAILED, errors.array());
    }

    const { phoneNumber, email, firstName } = req.body;

    const result = await authService.sendRegistrationOTP(phoneNumber, email, firstName);

    return sendSuccessResponse(res, 200, 'OTP sent successfully', {
      otpId: result.otpId,
      phoneNumber: result.phoneNumber,
      expiresAt: result.expiresAt,
      message: 'Please verify your phone number with the OTP sent to your mobile'
    });

  } catch (error) {
    console.error('Send registration OTP error:', error);
    return sendErrorResponse(res, 500, error.message || 'Failed to send OTP');
  }
};

// Register user with OTP verification
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, ERROR_MESSAGES.VALIDATION_FAILED, errors.array());
    }

    const result = await authService.registerUser(req.body);

    // Set HTTP-only cookies for tokens
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }

    return sendSuccessResponse(res, 201, SUCCESS_MESSAGES.REGISTRATION_SUCCESS, {
      user: result.user,
      phoneVerified: true
    });

  } catch (error) {
    console.error('Registration error:', error);
    return sendErrorResponse(res, 500, error.message || 'Registration failed');
  }
};

// Login user
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, ERROR_MESSAGES.VALIDATION_FAILED, errors.array());
    }

    const { email, password } = req.body;
    const result = await authService.loginUser(email, password, req.ip, req.get('User-Agent'));

    // Set HTTP-only cookies for tokens
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }

    return sendSuccessResponse(res, 200, SUCCESS_MESSAGES.LOGIN_SUCCESS, {
      user: result.user
    });

  } catch (error) {
    console.error('Login error:', error);
    const statusCode = error.message.includes('Invalid') || error.message.includes('blocked') || error.message.includes('deactivated') ? 401 : 500;
    return sendErrorResponse(res, statusCode, error.message || 'Login failed');
  }
};

// Send forgot password OTP
const sendForgotPasswordOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, ERROR_MESSAGES.VALIDATION_FAILED, errors.array());
    }

    const { email } = req.body;
    const result = await authService.sendForgotPasswordOTP(email);

    return sendSuccessResponse(res, 200, 'OTP sent to your registered phone number', {
      otpId: result.otpId,
      phoneNumber: result.phoneNumber,
      expiresAt: result.expiresAt
    });

  } catch (error) {
    console.error('Send forgot password OTP error:', error);
    return sendErrorResponse(res, 500, error.message || 'Failed to send OTP');
  }
};

// Reset password with OTP
const resetPasswordWithOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, ERROR_MESSAGES.VALIDATION_FAILED, errors.array());
    }

    const { email, phoneNumber, otpCode, newPassword } = req.body;
    await authService.resetPasswordWithOTP(email, phoneNumber, otpCode, newPassword);

    return sendSuccessResponse(res, 200, SUCCESS_MESSAGES.PASSWORD_RESET);

  } catch (error) {
    console.error('Reset password with OTP error:', error);
    const statusCode = error.message.includes('Invalid') || error.message.includes('expired') ? 400 : 500;
    return sendErrorResponse(res, statusCode, error.message || 'Failed to reset password');
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const { phoneNumber, otpCode, purpose } = req.body;

    if (!phoneNumber || !otpCode || !purpose) {
      return sendErrorResponse(res, 400, 'Phone number, OTP code, and purpose are required');
    }

    const result = await authService.verifyOTP(phoneNumber, otpCode, purpose);

    return sendSuccessResponse(res, 200, 'OTP verified successfully', {
      verified: true,
      otpId: result.otpId
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return sendErrorResponse(res, 400, error.message || 'OTP verification failed');
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { phoneNumber, purpose, email } = req.body;

    if (!phoneNumber || !purpose) {
      return sendErrorResponse(res, 400, 'Phone number and purpose are required');
    }

    const result = await authService.resendOTP(phoneNumber, purpose, email);

    return sendSuccessResponse(res, 200, 'OTP resent successfully', {
      otpId: result.otpId,
      phoneNumber: result.phoneNumber,
      expiresAt: result.expiresAt
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    return sendErrorResponse(res, 500, error.message || 'Failed to resend OTP');
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await authService.getUserProfile(userId);

    return sendSuccessResponse(res, 200, 'Profile retrieved successfully', { user });

  } catch (error) {
    console.error('Get profile error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    return sendErrorResponse(res, statusCode, error.message || 'Failed to get profile');
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, ERROR_MESSAGES.VALIDATION_FAILED, errors.array());
    }

    const userId = req.user.id;
    const { otpCode, ...profileData } = req.body;

    const updatedUser = await authService.updateUserProfile(userId, profileData, otpCode);

    return sendSuccessResponse(res, 200, SUCCESS_MESSAGES.PROFILE_UPDATED, { user: updatedUser });

  } catch (error) {
    console.error('Update profile error:', error);
    const statusCode = error.message.includes('OTP') || error.message.includes('already registered') ? 400 : 500;
    return sendErrorResponse(res, statusCode, error.message || 'Failed to update profile');
  }
};

// Send phone verification OTP
const sendPhoneVerificationOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return sendErrorResponse(res, 400, 'Phone number is required');
    }

    const result = await authService.sendPhoneVerificationOTP(
      phoneNumber,
      req.user.email,
      req.user.id
    );

    return sendSuccessResponse(res, 200, 'OTP sent successfully', {
      otpId: result.otpId,
      phoneNumber: result.phoneNumber,
      expiresAt: result.expiresAt
    });

  } catch (error) {
    console.error('Send phone verification OTP error:', error);
    const statusCode = error.message.includes('already registered') ? 409 : 500;
    return sendErrorResponse(res, statusCode, error.message || 'Failed to send OTP');
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, ERROR_MESSAGES.VALIDATION_FAILED, errors.array());
    }

    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(userId, currentPassword, newPassword);

    return sendSuccessResponse(res, 200, SUCCESS_MESSAGES.PASSWORD_CHANGED);

  } catch (error) {
    console.error('Change password error:', error);
    const statusCode = error.message.includes('incorrect') ? 400 : 500;
    return sendErrorResponse(res, statusCode, error.message || 'Failed to change password');
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    const userId = req.user.id;
    await authService.logoutUser(userId);

    // Clear cookies
    res.clearCookie('token');
    res.clearCookie('refreshToken');

    return sendSuccessResponse(res, 200, SUCCESS_MESSAGES.LOGOUT_SUCCESS);

  } catch (error) {
    console.error('Logout error:', error);
    // Even if logout fails on server, clear cookies
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    return sendErrorResponse(res, 500, 'Logout failed');
  }
};

// Get OTP status
const getOTPStatus = async (req, res) => {
  try {
    const { phoneNumber, purpose } = req.query;

    if (!phoneNumber || !purpose) {
      return sendErrorResponse(res, 400, 'Phone number and purpose are required');
    }

    const status = await authService.getOTPStatus(phoneNumber, purpose);

    return sendSuccessResponse(res, 200, 'OTP status retrieved successfully', status);

  } catch (error) {
    console.error('Get OTP status error:', error);
    return sendErrorResponse(res, 500, 'Failed to get OTP status');
  }
};

// Validate credentials and send login OTP
const validateCredentialsAndSendLoginOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, ERROR_MESSAGES.VALIDATION_FAILED, errors.array());
    }

    const { email, password } = req.body;
    const result = await authService.validateCredentialsAndSendLoginOTP(email, password);

    return sendSuccessResponse(res, 200, 'Credentials validated. OTP sent for verification', {
      otpId: result.otpId,
      phoneNumber: result.phoneNumber,
      expiresAt: result.expiresAt,
      userId: result.userId,
      message: 'Please verify your identity with the OTP sent to your registered phone number'
    });

  } catch (error) {
    console.error('Validate credentials and send OTP error:', error);
    const statusCode = error.message.includes('Invalid') || error.message.includes('blocked') || error.message.includes('deactivated') ? 401 : 500;
    return sendErrorResponse(res, statusCode, error.message || 'Failed to send login OTP');
  }
};

// Complete login with OTP verification
const completeLoginWithOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, ERROR_MESSAGES.VALIDATION_FAILED, errors.array());
    }

    const { phoneNumber, otpCode, userId } = req.body;
    const result = await authService.completeLoginWithOTP(phoneNumber, otpCode, userId);

    // Set HTTP-only cookies for tokens
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }

    return sendSuccessResponse(res, 200, SUCCESS_MESSAGES.LOGIN_SUCCESS, {
      user: result.user
    });

  } catch (error) {
    console.error('Complete login with OTP error:', error);
    const statusCode = error.message.includes('Invalid') || error.message.includes('expired') ? 401 : 500;
    return sendErrorResponse(res, statusCode, error.message || 'Login verification failed');
  }
};

module.exports = {
  sendRegistrationOTP,
  register,
  login,
  sendForgotPasswordOTP,
  resetPasswordWithOTP,
  verifyOTP,
  resendOTP,
  getProfile,
  updateProfile,
  sendPhoneVerificationOTP,
  changePassword,
  logout,
  getOTPStatus,
  validateCredentialsAndSendLoginOTP,
  completeLoginWithOTP
};