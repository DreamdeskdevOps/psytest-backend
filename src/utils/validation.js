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


// Admin validation functions

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

  // Answer pattern validation - now accepts any non-empty string as template ID
  // The actual template validation will be done at the service/database level
  if (!answerPattern || typeof answerPattern !== 'string' || answerPattern.trim().length === 0) {
    return {
      isValid: false,
      message: 'Answer pattern (template ID) is required'
    };
  }

  // Answer options validation is now handled by the template configuration
  // No need for hardcoded validation since templates define their own requirements

  // Template-specific validations are handled by the template system

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
  const allowedOperations = ['activate', 'deactivate', 'delete', 'update_test_type'];

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
  if (operation === 'update_test_type') {
    const allowedTestTypes = [
      'PERSONALITY', 'CAREER_ASSESSMENT', 'SKILL_TEST', 'APTITUDE',
      'COGNITIVE', 'BEHAVIORAL', 'CUSTOM'
    ];

    if (!operationData.testType || !allowedTestTypes.includes(operationData.testType)) {
      return {
        isValid: false,
        message: `Test type is required and must be one of: ${allowedTestTypes.join(', ')}`
      };
    }
  }

  return { isValid: true };
};

// Validate section reorder data
const validateSectionReorder = (sectionOrders) => {
  if (!Array.isArray(sectionOrders) || sectionOrders.length === 0) {
    return { isValid: false, message: 'Section orders array is required' };
  }

  // Check for duplicates
  const sectionIds = sectionOrders.map(order => order.sectionId);
  const uniqueIds = new Set(sectionIds);
  if (sectionIds.length !== uniqueIds.size) {
    return { isValid: false, message: 'Duplicate section IDs found in reorder data' };
  }

  // Validate each order
  for (let i = 0; i < sectionOrders.length; i++) {
    const order = sectionOrders[i];

    if (!order.sectionId || !validateUUID(order.sectionId)) {
      return { isValid: false, message: `Invalid section ID at index ${i}` };
    }

    if (typeof order.newOrder !== 'number' || order.newOrder < 1) {
      return { isValid: false, message: `Invalid new order at index ${i}. Must be positive number` };
    }
  }

  return { isValid: true };
};

// Validate test section data for updates (partial validation)
const validateSectionUpdateData = (updateData) => {
  const {
    sectionName, questionCount, answerPattern,
    answerOptions, maxScore, timeLimitMinutes
  } = updateData;

  // Section name validation (only if provided)
  if (sectionName !== undefined) {
    if (!sectionName || sectionName.trim().length < 2) {
      return { isValid: false, message: 'Section name must be at least 2 characters long' };
    }

    if (sectionName.trim().length > 100) {
      return { isValid: false, message: 'Section name cannot exceed 100 characters' };
    }
  }

  // Question count validation (only if provided)
  if (questionCount !== undefined) {
    if (!questionCount || questionCount < 1 || questionCount > 100) {
      return { isValid: false, message: 'Question count must be between 1 and 100' };
    }
  }

  // Answer pattern validation (only if provided) - now accepts any non-empty string as template ID
  if (answerPattern !== undefined) {
    if (!answerPattern || typeof answerPattern !== 'string' || answerPattern.trim().length === 0) {
      return {
        isValid: false,
        message: 'Answer pattern (template ID) must be a valid non-empty string'
      };
    }

    // Template-specific validations are handled by the template system
  }

  // Max score validation (only if provided)
  if (maxScore !== undefined) {
    if (maxScore !== null && (maxScore < 1 || maxScore > 1000)) {
      return { isValid: false, message: 'Max score must be between 1 and 1000' };
    }
  }

  // Time limit validation (only if provided)
  if (timeLimitMinutes !== undefined) {
    if (timeLimitMinutes !== null && (timeLimitMinutes < 1 || timeLimitMinutes > 300)) {
      return { isValid: false, message: 'Time limit must be between 1 and 300 minutes' };
    }
  }

  return { isValid: true };
};


// Additional validation functions
const validateQuestionData = (questionData, isComplete = true) => {
  const {
    questionText, options, correctAnswer, marks,
    difficultyLevel, questionType
  } = questionData;

  // Question text validation
  if (isComplete && (!questionText || questionText.trim().length < 5)) {
    return { isValid: false, message: 'Question text must be at least 5 characters long' };
  }

  if (questionText && questionText.trim().length > 1000) {
    return { isValid: false, message: 'Question text cannot exceed 1000 characters' };
  }

  // Options validation (if provided)
  if (options && Array.isArray(options)) {
    if (options.length > 10) {
      return { isValid: false, message: 'Questions cannot have more than 10 options' };
    }

    // Check for empty options
    const emptyOptions = options.filter(option => !option || option.toString().trim().length === 0);
    if (emptyOptions.length > 0) {
      return { isValid: false, message: 'All options must have text content' };
    }

    // Check for duplicate options
    const uniqueOptions = new Set(options.map(option => option.toString().toLowerCase().trim()));
    if (uniqueOptions.size !== options.length) {
      return { isValid: false, message: 'Question options must be unique' };
    }
  }

  // Marks validation
  if (marks !== undefined && (marks < 0 || marks > 100)) {
    return { isValid: false, message: 'Question marks must be between 0 and 100' };
  }

  // Difficulty level validation
  const allowedDifficulties = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'];
  if (difficultyLevel && !allowedDifficulties.includes(difficultyLevel)) {
    return {
      isValid: false,
      message: `Difficulty level must be one of: ${allowedDifficulties.join(', ')}`
    };
  }

  // Question type validation - match database constraints
  const allowedQuestionTypes = ['STANDARD', 'TEXT', 'IMAGE', 'MIXED', 'SCENARIO', 'IMAGE_BASED', 'AUDIO_BASED', 'VIDEO_BASED'];
  if (questionType && !allowedQuestionTypes.includes(questionType)) {
    return {
      isValid: false,
      message: `Question type must be one of: ${allowedQuestionTypes.join(', ')}`
    };
  }

  return { isValid: true };
};

// Validate question reorder data
const validateQuestionReorder = (questionOrders) => {
  if (!Array.isArray(questionOrders) || questionOrders.length === 0) {
    return { isValid: false, message: 'Question orders array is required' };
  }

  // Check for duplicates
  const questionIds = questionOrders.map(order => order.questionId);
  const uniqueIds = new Set(questionIds);
  if (questionIds.length !== uniqueIds.size) {
    return { isValid: false, message: 'Duplicate question IDs found in reorder data' };
  }

  // Validate each order
  for (let i = 0; i < questionOrders.length; i++) {
    const order = questionOrders[i];

    if (!order.questionId || !validateUUID(order.questionId)) {
      return { isValid: false, message: `Invalid question ID at index ${i}` };
    }

    if (typeof order.newOrder !== 'number' || order.newOrder < 1) {
      return { isValid: false, message: `Invalid new order at index ${i}. Must be positive number` };
    }
  }

  return { isValid: true };
};

// Validate numbering style
const validateNumberingStyle = (numberingConfig) => {
  const { numberingStyle, numberingStart, numberingPrefix, numberingSuffix } = numberingConfig;

  const allowedStyles = ['NUMERIC', 'ALPHA_LOWER', 'ALPHA_UPPER', 'ROMAN_LOWER', 'ROMAN_UPPER'];
  if (numberingStyle && !allowedStyles.includes(numberingStyle)) {
    return {
      isValid: false,
      message: `Numbering style must be one of: ${allowedStyles.join(', ')}`
    };
  }

  if (numberingStart !== undefined && (numberingStart < 1 || numberingStart > 100)) {
    return { isValid: false, message: 'Numbering start must be between 1 and 100' };
  }

  if (numberingPrefix && numberingPrefix.length > 5) {
    return { isValid: false, message: 'Numbering prefix cannot exceed 5 characters' };
  }

  if (numberingSuffix && numberingSuffix.length > 5) {
    return { isValid: false, message: 'Numbering suffix cannot exceed 5 characters' };
  }

  return { isValid: true };
};

// Validate answer option data
const validateAnswerOptionData = (optionData, isComplete = true) => {
  const {
    optionText, optionValue, optionOrder, isCorrect, optionType
  } = optionData;

  // Option text validation
  if (isComplete && (!optionText || optionText.toString().trim().length < 1)) {
    return { isValid: false, message: 'Option text is required and cannot be empty' };
  }

  if (optionText && optionText.toString().trim().length > 500) {
    return { isValid: false, message: 'Option text cannot exceed 500 characters' };
  }

  // Option value validation (if provided)
  if (optionValue && optionValue.toString().trim().length > 100) {
    return { isValid: false, message: 'Option value cannot exceed 100 characters' };
  }

  // Option order validation (if provided)
  if (optionOrder !== undefined && (typeof optionOrder !== 'number' || optionOrder < 1 || optionOrder > 50)) {
    return { isValid: false, message: 'Option order must be a number between 1 and 50' };
  }

  // Is correct validation (if provided)
  if (isCorrect !== undefined && typeof isCorrect !== 'boolean') {
    return { isValid: false, message: 'isCorrect must be a boolean value' };
  }

  // Option type validation (if provided)
  const allowedOptionTypes = ['STANDARD', 'IMAGE', 'AUDIO', 'VIDEO', 'MIXED'];
  if (optionType && !allowedOptionTypes.includes(optionType)) {
    return {
      isValid: false,
      message: `Option type must be one of: ${allowedOptionTypes.join(', ')}`
    };
  }

  return { isValid: true };
};


//  * Validate configuration data for answer patterns
//  */
// const validateConfigurationData = (configData) => {
//   if (!configData || typeof configData !== 'object') {
//     return { isValid: false, message: 'Configuration data is required and must be an object' };
//   }

//   // Validate pattern name if provided
//   if (configData.patternName) {
//     if (typeof configData.patternName !== 'string' || configData.patternName.trim().length === 0) {
//       return { isValid: false, message: 'Pattern name must be a non-empty string' };
//     }
//     if (configData.patternName.length > 100) {
//       return { isValid: false, message: 'Pattern name cannot exceed 100 characters' };
//     }
    
//     // Validate pattern name format (uppercase with underscores)
//     const patternNameRegex = /^[A-Z_][A-Z0-9_]*$/;
//     if (!patternNameRegex.test(configData.patternName)) {
//       return { isValid: false, message: 'Pattern name must be uppercase with underscores (e.g., MY_CUSTOM_PATTERN)' };
//     }
//   }

//   // Validate display name if provided
//   if (configData.displayName) {
//     if (typeof configData.displayName !== 'string' || configData.displayName.trim().length === 0) {
//       return { isValid: false, message: 'Display name must be a non-empty string' };
//     }
//     if (configData.displayName.length > 200) {
//       return { isValid: false, message: 'Display name cannot exceed 200 characters' };
//     }
//   }

//   // Validate configuration object
//   if (configData.configuration) {
//     if (typeof configData.configuration !== 'object') {
//       return { isValid: false, message: 'Configuration must be an object' };
//     }
    
//     const config = configData.configuration;
    
//     if (config.scalePoints && (typeof config.scalePoints !== 'number' || config.scalePoints < 2 || config.scalePoints > 10)) {
//       return { isValid: false, message: 'Scale points must be a number between 2 and 10' };
//     }
    
//     if (config.categories && (!Array.isArray(config.categories) || config.categories.length === 0)) {
//       return { isValid: false, message: 'Categories must be a non-empty array' };
//     }
//   }

//   return { isValid: true };
// };

/**
 * Validate section configuration data for advanced settings
 */
const validateAdvancedSectionConfigData = (configData) => {
  if (!configData || typeof configData !== 'object') {
    return { isValid: false, message: 'Section configuration data is required and must be an object' };
  }

  // Validate timing config
  if (configData.timingConfig) {
    if (typeof configData.timingConfig !== 'object') {
      return { isValid: false, message: 'Timing config must be an object' };
    }
    
    const timing = configData.timingConfig;
    if (timing.timeLimitMinutes && (typeof timing.timeLimitMinutes !== 'number' || timing.timeLimitMinutes < 1 || timing.timeLimitMinutes > 300)) {
      return { isValid: false, message: 'Time limit must be between 1 and 300 minutes' };
    }
  }

  // Validate scoring config
  if (configData.scoringConfig) {
    if (typeof configData.scoringConfig !== 'object') {
      return { isValid: false, message: 'Scoring config must be an object' };
    }
    
    const scoring = configData.scoringConfig;
    if (scoring.pointsPerQuestion && (typeof scoring.pointsPerQuestion !== 'number' || scoring.pointsPerQuestion < 0)) {
      return { isValid: false, message: 'Points per question must be a non-negative number' };
    }
  }

  return { isValid: true };
};

/**
 * Validate scoring rules data for configuration
 */
const validateConfigScoringRulesData = (scoringData) => {
  if (!scoringData || typeof scoringData !== 'object') {
    return { isValid: false, message: 'Scoring data is required and must be an object' };
  }

  if (!scoringData.scoringMethod) {
    return { isValid: false, message: 'Scoring method is required' };
  }

  const allowedMethods = [
    'CORRECT_INCORRECT', 'WEIGHTED', 'PARTIAL_CREDIT', 'AVERAGE', 'SUM',
    'COUNT_YES', 'COUNT_NO', 'BINARY', 'HIGHER_WINS', 'CATEGORY_SUM', 
    'BALANCED', 'STANDARD'
  ];

  if (!allowedMethods.includes(scoringData.scoringMethod)) {
    return { isValid: false, message: `Invalid scoring method. Allowed: ${allowedMethods.join(', ')}` };
  }

  return { isValid: true };
};

/**
 * Validate timing configuration data
 */
const validateConfigTimingData = (timingData) => {
  if (!timingData || typeof timingData !== 'object') {
    return { isValid: false, message: 'Timing data is required and must be an object' };
  }

  if (!timingData.timeLimitMinutes) {
    return { isValid: false, message: 'Time limit minutes is required' };
  }

  if (typeof timingData.timeLimitMinutes !== 'number' || timingData.timeLimitMinutes < 1 || timingData.timeLimitMinutes > 300) {
    return { isValid: false, message: 'Time limit must be between 1 and 300 minutes' };
  }

  return { isValid: true };
};

/**
 * Validate overall test timing data
 */
const validateOverallTestTimingData = (timingData) => {
  if (!timingData || typeof timingData !== 'object') {
    return { isValid: false, message: 'Test timing data is required and must be an object' };
  }

  if (!timingData.durationMinutes) {
    return { isValid: false, message: 'Duration minutes is required' };
  }

  if (typeof timingData.durationMinutes !== 'number' || timingData.durationMinutes < 5 || timingData.durationMinutes > 600) {
    return { isValid: false, message: 'Test duration must be between 5 and 600 minutes' };
  }

  return { isValid: true };
};

// ==================== MIDDLEWARE VALIDATION ====================

/**
 * Validate request body against schema
 */
const validateRequestBody = (schema) => {
  return (req, res, next) => {
    const validation = validateAgainstSchema(req.body, schema);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
        data: null,
        statusCode: 400
      });
    }
    next();
  };
};

/**
 * Validate request params
 */
const validateRequestParams = (paramValidations) => {
  return (req, res, next) => {
    for (const [param, validation] of Object.entries(paramValidations)) {
      const value = req.params[param];
      
      if (!value && validation.required) {
        return res.status(400).json({
          success: false,
          message: `Parameter '${param}' is required`,
          data: null,
          statusCode: 400
        });
      }

      if (value) {
        if (validation.type === 'number' && isNaN(Number(value))) {
          return res.status(400).json({
            success: false,
            message: `Parameter '${param}' must be a number`,
            data: null,
            statusCode: 400
          });
        }

        if (validation.type === 'uuid' && !validateUUID(value)) {
          return res.status(400).json({
            success: false,
            message: `Parameter '${param}' must be a valid UUID`,
            data: null,
            statusCode: 400
          });
        }
      }
    }
    next();
  };
};



const validateConfigurationData = (configData) => {
  if (!configData || typeof configData !== 'object') {
    return { isValid: false, message: 'Configuration data is required and must be an object' };
  }

  // Validate pattern name if provided
  if (configData.patternName) {
    if (typeof configData.patternName !== 'string' || configData.patternName.trim().length === 0) {
      return { isValid: false, message: 'Pattern name must be a non-empty string' };
    }
    if (configData.patternName.length > 100) {
      return { isValid: false, message: 'Pattern name cannot exceed 100 characters' };
    }
    
    // Validate pattern name format (uppercase with underscores)
    const patternNameRegex = /^[A-Z_][A-Z0-9_]*$/;
    if (!patternNameRegex.test(configData.patternName)) {
      return { isValid: false, message: 'Pattern name must be uppercase with underscores (e.g., MY_CUSTOM_PATTERN)' };
    }
  }

  // Validate display name if provided
  if (configData.displayName) {
    if (typeof configData.displayName !== 'string' || configData.displayName.trim().length === 0) {
      return { isValid: false, message: 'Display name must be a non-empty string' };
    }
    if (configData.displayName.length > 200) {
      return { isValid: false, message: 'Display name cannot exceed 200 characters' };
    }
  }

  // Validate configuration object
  if (configData.configuration) {
    if (typeof configData.configuration !== 'object') {
      return { isValid: false, message: 'Configuration must be an object' };
    }
    
    const config = configData.configuration;
    
    if (config.scalePoints && (typeof config.scalePoints !== 'number' || config.scalePoints < 2 || config.scalePoints > 10)) {
      return { isValid: false, message: 'Scale points must be a number between 2 and 10' };
    }
    
    if (config.categories && (!Array.isArray(config.categories) || config.categories.length === 0)) {
      return { isValid: false, message: 'Categories must be a non-empty array' };
    }
  }

  return { isValid: true };
};



// Export all validation functions
module.exports = {
  // User validation functions
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

  // Admin validation functions
  validateUUID,
  validatePagination,
  validateTestData,
  validateSectionData,
  validateQuestionData,
  validateAnswerOptionData,
  validateBulkOperation,
  validateSectionReorder,
  validateQuestionReorder,
  validateNumberingStyle,
  validateSectionUpdateData,


  validateConfigurationData,
  validateAdvancedSectionConfigData,
  validateConfigScoringRulesData,
  validateConfigTimingData,
  validateOverallTestTimingData 



};
