const { body, param, query } = require('express-validator');

// User registration validation
const validateUserRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),

  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('phoneNumber')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
    .isLength({ max: 20 })
    .withMessage('Phone number must not exceed 20 characters')
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Profile update validation
const validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),

  body('phoneNumber')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),

  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),

  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),

  body('address')
    .optional()
    .isObject()
    .withMessage('Address must be an object'),

  body('address.street')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Street address must not exceed 255 characters'),

  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters'),

  body('address.state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State must not exceed 100 characters'),

  body('address.country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),

  body('address.zipCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('ZIP code must not exceed 20 characters')
];

// Change password validation
const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

// Forgot password validation
const validateForgotPassword = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

// Reset password validation
const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),

  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

// Email verification validation
const validateEmailVerification = [
  param('token')
    .notEmpty()
    .withMessage('Verification token is required')
    .isLength({ min: 32, max: 128 })
    .withMessage('Invalid verification token format')
];

// Send registration OTP validation
const validateSendRegistrationOTP = [
  body('phoneNumber')
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

// Send forgot password OTP validation
const validateSendForgotPasswordOTP = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

// Reset password with OTP validation
const validateResetPasswordWithOTP = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('phoneNumber')
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),

  body('otpCode')
    .isLength({ min: 4, max: 6 })
    .withMessage('OTP code must be 4-6 digits')
    .isNumeric()
    .withMessage('OTP code must contain only numbers'),

  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// OTP verification validation
const validateOTPVerification = [
  body('phoneNumber')
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),

  body('otpCode')
    .isLength({ min: 4, max: 6 })
    .withMessage('OTP code must be 4-6 digits')
    .isNumeric()
    .withMessage('OTP code must contain only numbers'),

  body('purpose')
    .notEmpty()
    .withMessage('Purpose is required')
    .isIn(['registration', 'forgot-password', 'phone-verification'])
    .withMessage('Invalid purpose')
];

// Resend OTP validation
const validateResendOTP = [
  body('phoneNumber')
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),

  body('purpose')
    .notEmpty()
    .withMessage('Purpose is required')
    .isIn(['registration', 'forgot-password', 'phone-verification'])
    .withMessage('Invalid purpose')
];

// Send phone verification OTP validation
const validateSendPhoneVerificationOTP = [
  body('phoneNumber')
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
];

// OTP status validation
const validateOTPStatus = [
  query('phoneNumber').optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),

  query('purpose').optional()
    .isIn(['registration', 'forgot-password', 'phone-verification'])
    .withMessage('Invalid purpose')
];

module.exports = {
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
  validateOTPStatus,
  validateForgotPassword,
  validateResetPassword,
  validateEmailVerification
};