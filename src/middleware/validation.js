const { body, validationResult } = require('express-validator');

const validateUserRegistration = [
    body('username')
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email is not valid'),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

const validateUserLogin = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email is not valid'),
    body('password')
        .notEmpty().withMessage('Password is required'),
];

const validateTestCreation = [
    body('title')
        .notEmpty().withMessage('Title is required'),
    body('description')
        .notEmpty().withMessage('Description is required'),
];

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

module.exports = {
    validateUserRegistration,
    validateUserLogin,
    validateTest: validateTestCreation,
    validateTestCreation,
    validateRequest,
};