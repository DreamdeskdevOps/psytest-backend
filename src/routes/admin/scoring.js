const express = require('express');
const { body } = require('express-validator');
const ScoringController = require('../../controllers/admin/scoringController');

const router = express.Router();

// Validation middleware for scoring configuration
const validateScoringConfig = [
    body('scoringType')
        .notEmpty()
        .withMessage('Scoring type is required')
        .isIn(['flag_based', 'flag-based', 'range_based', 'range-based'])
        .withMessage('Invalid scoring type')
        .customSanitizer(value => {
            // Normalize to underscore format for database
            return value.replace('-', '_');
        }),

    body('scoringPattern')
        .isObject()
        .withMessage('Scoring pattern must be an object'),

    body('scoringPattern.type')
        .notEmpty()
        .withMessage('Scoring pattern type is required'),

    body('sectionId')
        .optional()
        .isUUID()
        .withMessage('Section ID must be a valid UUID')
];

// **SCORING PATTERN ROUTES**

// Get available scoring patterns
router.get('/patterns', ScoringController.getAvailablePatterns);

// Get flags available in test questions
router.get('/tests/:testId/flags', ScoringController.getTestFlags);

// **CONFIGURATION ROUTES**

// Get all configurations for a test
router.get('/tests/:testId/configurations', ScoringController.getTestConfigurations);

// Get specific configuration for test/section
router.get('/tests/:testId/configuration', ScoringController.getConfiguration);

// Save scoring configuration for test/section
router.post('/tests/:testId/configuration', validateScoringConfig, ScoringController.saveConfiguration);

// Delete scoring configuration
router.delete('/configurations/:configId', ScoringController.deleteConfiguration);

// Get configuration summary for dashboard
router.get('/tests/:testId/summary', ScoringController.getConfigurationSummary);

// **TESTING & PREVIEW ROUTES**

// Preview scoring result with sample data
router.post('/preview', [
    body('flagScores').isObject().withMessage('Flag scores must be an object'),
    body('scoringPattern').isObject().withMessage('Scoring pattern must be an object')
], ScoringController.previewScoringResult);

// Test configuration with sample data
router.get('/tests/:testId/test', ScoringController.testConfiguration);

module.exports = router;