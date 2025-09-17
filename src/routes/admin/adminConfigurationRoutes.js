/**
 * Admin Configuration Routes - routes/admin/adminConfigurationRoutes.js
 * Routes for admin configuration management
 */

const express = require('express');
const router = express.Router();

const AdminConfigurationController = require('../../controllers/admin/adminConfigurationController');
const { authenticateAdmin, checkPermission } = require('../../middleware/auth');
const { rateLimitAPI } = require('../../middleware/rateLimiter');

// Apply authentication and admin middleware to all routes
router.use(authenticateAdmin);

// Apply rate limiting
router.use(rateLimitAPI);


// ==================== ANSWER PATTERNS ROUTES ====================

/**
 * @route   GET /api/v1/admin/configuration/answer-patterns
 * @desc    Get all available answer patterns
 * @access  Admin only
 */
router.get('/answer-patterns', AdminConfigurationController.getAllAnswerPatterns);

/**
 * @route   POST /api/v1/admin/configuration/answer-patterns
 * @desc    Create custom answer pattern
 * @access  Admin only
 */
router.post('/answer-patterns', AdminConfigurationController.createAnswerPattern);

/**
 * @route   PUT /api/v1/admin/configuration/answer-patterns/:id
 * @desc    Update answer pattern
 * @access  Admin only
 */
router.put('/answer-patterns/:id', AdminConfigurationController.updateAnswerPattern);

/**
 * @route   DELETE /api/v1/admin/configuration/answer-patterns/:id
 * @desc    Delete custom pattern
 * @access  Admin only
 */
router.delete('/answer-patterns/:id', AdminConfigurationController.deleteAnswerPattern);

// ==================== SECTION CONFIGURATION ROUTES ====================

/**
 * @route   POST /api/v1/admin/sections/:id/configure
 * @desc    Configure section (options, timing, scoring)
 * @access  Admin only
 */
router.post('/sections/:id/configure', AdminConfigurationController.configureSection);

/**
 * @route   GET /api/v1/admin/sections/:id/configuration
 * @desc    Get section configuration
 * @access  Admin only
 */
router.get('/sections/:id/configuration', AdminConfigurationController.getSectionConfiguration);

/**
 * @route   PUT /api/v1/admin/sections/:id/configuration
 * @desc    Update section configuration
 * @access  Admin only
 */
router.put('/sections/:id/configuration', AdminConfigurationController.updateSectionConfiguration);

/**
 * @route   PUT /api/v1/admin/sections/:id/scoring
 * @desc    Set section scoring rules
 * @access  Admin only
 */
router.put('/sections/:id/scoring', AdminConfigurationController.setSectionScoring);

/**
 * @route   GET /api/v1/admin/sections/:id/scoring
 * @desc    Get section scoring
 * @access  Admin only
 */
router.get('/sections/:id/scoring', AdminConfigurationController.getSectionScoring);

// ==================== TIMELINE MANAGEMENT ROUTES ====================

/**
 * @route   PUT /api/v1/admin/sections/:id/time-limit
 * @desc    Set section time limit
 * @access  Admin only
 */
router.put('/sections/:id/time-limit', AdminConfigurationController.setSectionTimeLimit);

/**
 * @route   GET /api/v1/admin/sections/:id/time-settings
 * @desc    Get section time settings
 * @access  Admin only
 */
router.get('/sections/:id/time-settings', AdminConfigurationController.getSectionTimeSettings);

/**
 * @route   PUT /api/v1/admin/tests/:id/overall-timing
 * @desc    Set overall test timing
 * @access  Admin only
 */
router.put('/tests/:id/overall-timing', AdminConfigurationController.setOverallTestTiming);

module.exports = router;