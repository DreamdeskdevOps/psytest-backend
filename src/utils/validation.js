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
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
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
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
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
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
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
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
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

// Utility validation functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  if (!password || password.length < 8 || password.length > 128) {
    return {
      isValid: false,
      message: 'Password must be between 8 and 128 characters'
    };
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/;
  if (!passwordRegex.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    };
  }

  return { isValid: true };
};


// Add these validation functions to your existing validation.js file

// Validate UUID format
const validateUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Validate pagination parameters
const validatePagination = (page, limit) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (isNaN(pageNum) || pageNum < 1) {
    return { isValid: false, message: 'Page must be a positive integer' };
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return { isValid: false, message: 'Limit must be between 1 and 100' };
  }

  return { isValid: true };
};

// Validate test data
const validateTestData = (testData) => {
  const { title, testType, durationMinutes, price, isFree, passingScore, maxAttempts } = testData;

  // Title validation
  if (!title || title.trim().length < 3) {
    return { isValid: false, message: 'Test title must be at least 3 characters long' };
  }

  if (title.trim().length > 255) {
    return { isValid: false, message: 'Test title cannot exceed 255 characters' };
  }

  // Test type validation
  const allowedTestTypes = [
    'PERSONALITY', 'CAREER_ASSESSMENT', 'SKILL_TEST', 'APTITUDE', 
    'COGNITIVE', 'BEHAVIORAL', 'CUSTOM'
  ];
  
  if (!testType || !allowedTestTypes.includes(testType)) {
    return { 
      isValid: false, 
      message: `Test type must be one of: ${allowedTestTypes.join(', ')}` 
    };
  }

  // Duration validation
  if (durationMinutes && (durationMinutes < 5 || durationMinutes > 480)) {
    return { isValid: false, message: 'Duration must be between 5 and 480 minutes (8 hours)' };
  }

  // Price validation
  if (!isFree && (!price || price <= 0)) {
    return { isValid: false, message: 'Price must be greater than 0 for paid tests' };
  }

  if (price && price > 10000) {
    return { isValid: false, message: 'Price cannot exceed $10,000' };
  }

  // Passing score validation
  if (passingScore && (passingScore < 0 || passingScore > 100)) {
    return { isValid: false, message: 'Passing score must be between 0 and 100' };
  }

  // Max attempts validation
  if (maxAttempts && (maxAttempts < 1 || maxAttempts > 10)) {
    return { isValid: false, message: 'Max attempts must be between 1 and 10' };
  }

  return { isValid: true };
};

// Validate test section data
const validateSectionData = (sectionData) => {
  const { 
    sectionName, questionCount, answerPattern, 
    answerOptions, maxScore, timeLimitMinutes 
  } = sectionData;

  // Section name validation
  if (!sectionName || sectionName.trim().length < 2) {
    return { isValid: false, message: 'Section name must be at least 2 characters long' };
  }

  if (sectionName.trim().length > 100) {
    return { isValid: false, message: 'Section name cannot exceed 100 characters' };
  }

  // Question count validation
  if (!questionCount || questionCount < 1 || questionCount > 100) {
    return { isValid: false, message: 'Question count must be between 1 and 100' };
  }

  // Answer pattern validation
  const allowedPatterns = [
    'ODD_EVEN', 'YES_NO', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 
    'RATING_SCALE', 'LIKERT_SCALE', 'CUSTOM'
  ];
  
  if (!answerPattern || !allowedPatterns.includes(answerPattern)) {
    return { 
      isValid: false, 
      message: `Answer pattern must be one of: ${allowedPatterns.join(', ')}` 
    };
  }

  // Answer options validation (for multiple choice)
  if (answerPattern === 'MULTIPLE_CHOICE') {
    if (!answerOptions || answerOptions < 2 || answerOptions > 6) {
      return { isValid: false, message: 'Multiple choice must have between 2 and 6 options' };
    }
  }

  // Max score validation
  if (maxScore && (maxScore < 1 || maxScore > 1000)) {
    return { isValid: false, message: 'Max score must be between 1 and 1000' };
  }

  // Time limit validation
  if (timeLimitMinutes && (timeLimitMinutes < 1 || timeLimitMinutes > 180)) {
    return { isValid: false, message: 'Section time limit must be between 1 and 180 minutes' };
  }

  return { isValid: true };
};

// Validate bulk operation data
const validateBulkOperation = (operation, testIds, operationData = {}) => {
  const allowedOperations = ['activate', 'deactivate', 'delete', 'update_category'];
  
  if (!allowedOperations.includes(operation)) {
    return { 
      isValid: false, 
      message: `Invalid operation. Allowed: ${allowedOperations.join(', ')}` 
    };
  }

  if (!Array.isArray(testIds) || testIds.length === 0) {
    return { isValid: false, message: 'Test IDs array is required and cannot be empty' };
  }

  if (testIds.length > 50) {
    return { isValid: false, message: 'Cannot perform bulk operations on more than 50 tests at once' };
  }

  // Validate UUIDs
  const invalidIds = testIds.filter(id => !validateUUID(id));
  if (invalidIds.length > 0) {
    return { 
      isValid: false, 
      message: `Invalid test ID format: ${invalidIds.slice(0, 5).join(', ')}${invalidIds.length > 5 ? '...' : ''}` 
    };
  }

  // Operation-specific validation
  if (operation === 'update_category') {
    if (!operationData.category || operationData.category.trim().length < 2) {
      return { isValid: false, message: 'Category is required for update_category operation' };
    }
  }

  return { isValid: true };
};



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
  validateEmailVerification,
  validateEmail,
  validatePassword,

    validateUUID,
  validatePagination,
  validateTestData,
  validateSectionData,
  validateBulkOperation,
};