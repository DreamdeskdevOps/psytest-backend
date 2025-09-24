const express = require('express');
const { body } = require('express-validator');
const ScoringPatternsController = require('../../controllers/admin/scoringPatternsController');

const router = express.Router();

// Validation middleware for pattern creation/update
const validatePatternData = [
    body('name')
        .notEmpty()
        .withMessage('Pattern name is required')
        .isLength({ min: 3, max: 255 })
        .withMessage('Pattern name must be between 3 and 255 characters'),

    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),

    body('category')
        .optional()
        .isIn(['flag-based', 'range-based'])
        .withMessage('Category must be either "flag-based" or "range-based"'),

    body('type')
        .notEmpty()
        .withMessage('Pattern type is required')
        .isIn(['preset-highest', 'preset-lowest', 'preset-top-3-rie', 'preset-top-5', 'custom-flag-pattern', 'range-male-adult', 'range-female-adult', 'range-child', 'range-adolescent', 'custom-range-pattern'])
        .withMessage('Invalid pattern type'),

    body('configuration')
        .isObject()
        .withMessage('Configuration must be an object'),

    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean')
];

// Validation middleware for pattern update (more flexible)
const validatePatternUpdate = [
    body('name')
        .optional()
        .isLength({ min: 3, max: 255 })
        .withMessage('Pattern name must be between 3 and 255 characters'),

    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),

    body('configuration')
        .optional()
        .isObject()
        .withMessage('Configuration must be an object'),

    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean')
];

// Validation for configuration validation endpoint
const validateConfigurationData = [
    body('type')
        .notEmpty()
        .withMessage('Pattern type is required')
        .isIn(['preset-highest', 'preset-lowest', 'preset-top-3-rie', 'preset-top-5', 'custom-flag-pattern', 'range-male-adult', 'range-female-adult', 'range-child', 'range-adolescent', 'custom-range-pattern'])
        .withMessage('Invalid pattern type'),

    body('configuration')
        .isObject()
        .withMessage('Configuration must be an object')
];

// **PATTERN MANAGEMENT ROUTES**

// Get all scoring patterns
router.get('/', ScoringPatternsController.getAllPatterns);

// Get patterns by category
router.get('/category/:category', ScoringPatternsController.getPatternsByCategory);

// Get usage statistics for all patterns
router.get('/usage-statistics', ScoringPatternsController.getUsageStatistics);

// Validate configuration
router.post('/validate', validateConfigurationData, ScoringPatternsController.validateConfiguration);

// Get specific pattern by ID
router.get('/:id', ScoringPatternsController.getPatternById);

// Create new pattern
router.post('/', validatePatternData, ScoringPatternsController.createPattern);

// Update existing pattern
router.put('/:id', validatePatternUpdate, ScoringPatternsController.updatePattern);

// Toggle pattern active status
router.patch('/:id/toggle-status', ScoringPatternsController.toggleActiveStatus);

// Duplicate pattern
router.post('/:id/duplicate', [
    body('name')
        .optional()
        .isLength({ min: 3, max: 255 })
        .withMessage('Pattern name must be between 3 and 255 characters'),

    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),

    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean')
], ScoringPatternsController.duplicatePattern);

// Delete pattern (should be last to avoid conflicts)
router.delete('/:id', ScoringPatternsController.deletePattern);

module.exports = router;