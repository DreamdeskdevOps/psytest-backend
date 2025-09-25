const FlagScoringService = require('../../services/flagScoringService');
const ScoringConfiguration = require('../../models/ScoringConfiguration');
const { validationResult } = require('express-validator');

class ScoringController {

    /**
     * Get available scoring patterns
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async getAvailablePatterns(req, res) {
        try {
            const patterns = ScoringConfiguration.getAvailablePatterns();

            res.json({
                success: true,
                data: patterns
            });
        } catch (error) {
            console.error('Error getting available patterns:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get available patterns',
                error: error.message
            });
        }
    }

    /**
     * Get test flags (flags used in test questions)
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async getTestFlags(req, res) {
        try {
            const { testId } = req.params;
            const { sectionId } = req.query;

            const flags = await ScoringConfiguration.getTestFlags(
                testId,
                sectionId || null
            );

            res.json({
                success: true,
                data: flags
            });
        } catch (error) {
            console.error('Error getting test flags:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get test flags',
                error: error.message
            });
        }
    }

    /**
     * Get scoring configurations for a test
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async getTestConfigurations(req, res) {
        try {
            const { testId } = req.params;

            const configurations = await ScoringConfiguration.getByTestId(testId);

            res.json({
                success: true,
                data: configurations
            });
        } catch (error) {
            console.error('Error getting test configurations:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get test configurations',
                error: error.message
            });
        }
    }

    /**
     * Get specific scoring configuration
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async getConfiguration(req, res) {
        try {
            const { testId } = req.params;
            const { sectionId } = req.query;

            const configuration = await ScoringConfiguration.getConfiguration(
                testId,
                sectionId || null
            );

            if (!configuration) {
                return res.status(404).json({
                    success: false,
                    message: 'Scoring configuration not found'
                });
            }

            res.json({
                success: true,
                data: configuration
            });
        } catch (error) {
            console.error('Error getting configuration:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get configuration',
                error: error.message
            });
        }
    }

    /**
     * Save scoring configuration
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async saveConfiguration(req, res) {
        try {
            console.log('🔍 DEBUG: Received request body:', JSON.stringify(req.body, null, 2));
            console.log('🔍 DEBUG: Received params:', req.params);

            // Check validation results
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.log('❌ Validation errors:', errors.array());
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { testId } = req.params;
            const {
                sectionId,
                scoringType,
                scoringPattern
            } = req.body;

            console.log('✅ Passed validation. Processing data:', {
                testId,
                sectionId,
                scoringType,
                scoringPattern
            });

            // Validate configuration
            const validation = ScoringConfiguration.validateConfiguration({
                scoringType,
                scoringPattern
            });

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid configuration',
                    errors: validation.errors
                });
            }

            // Save configuration
            const configuration = await ScoringConfiguration.saveConfiguration({
                testId: testId,
                sectionId: sectionId || null,
                scoringType,
                scoringPattern,
                createdBy: req.user?.id || req.admin?.id || null
            });

            res.json({
                success: true,
                message: 'Scoring configuration saved successfully',
                data: configuration
            });
        } catch (error) {
            console.error('Error saving configuration:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to save configuration',
                error: error.message
            });
        }
    }

    /**
     * Delete scoring configuration
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async deleteConfiguration(req, res) {
        try {
            const { configId } = req.params;

            const result = await ScoringConfiguration.deleteConfiguration(configId);

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Configuration not found'
                });
            }

            res.json({
                success: true,
                message: 'Configuration deleted successfully',
                data: result
            });
        } catch (error) {
            console.error('Error deleting configuration:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete configuration',
                error: error.message
            });
        }
    }

    /**
     * Get configuration summary for test dashboard
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async getConfigurationSummary(req, res) {
        try {
            const { testId } = req.params;

            const summary = await ScoringConfiguration.getConfigurationSummary(testId);

            res.json({
                success: true,
                data: summary
            });
        } catch (error) {
            console.error('Error getting configuration summary:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get configuration summary',
                error: error.message
            });
        }
    }

    /**
     * Preview scoring result (for testing configuration)
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async previewScoringResult(req, res) {
        try {
            const {
                flagScores,
                scoringPattern
            } = req.body;

            if (!flagScores || !scoringPattern) {
                return res.status(400).json({
                    success: false,
                    message: 'Flag scores and scoring pattern are required'
                });
            }

            // Apply scoring pattern to provided flag scores
            const result = FlagScoringService.applyeScoringPattern(flagScores, scoringPattern);

            res.json({
                success: true,
                message: 'Preview generated successfully',
                data: {
                    input_scores: flagScores,
                    pattern: scoringPattern,
                    result: result
                }
            });
        } catch (error) {
            console.error('Error previewing scoring result:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to preview scoring result',
                error: error.message
            });
        }
    }

    /**
     * Test scoring configuration with sample data
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async testConfiguration(req, res) {
        try {
            const { testId } = req.params;
            const { sectionId } = req.query;

            // Get test flags
            const flags = await ScoringConfiguration.getTestFlags(
                testId,
                sectionId || null
            );

            if (flags.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No flags found in test questions'
                });
            }

            // Generate sample scores for testing
            const sampleScores = {};
            flags.forEach(flagInfo => {
                sampleScores[flagInfo.flag] = Math.floor(Math.random() * flagInfo.total_questions);
            });

            // Get configuration
            const config = await ScoringConfiguration.getConfiguration(
                testId,
                sectionId || null
            );

            if (!config) {
                return res.status(404).json({
                    success: false,
                    message: 'No scoring configuration found'
                });
            }

            // Apply scoring pattern
            const result = FlagScoringService.applyeScoringPattern(
                sampleScores,
                config.scoring_pattern
            );

            res.json({
                success: true,
                message: 'Configuration test completed',
                data: {
                    available_flags: flags,
                    sample_scores: sampleScores,
                    configuration: config.scoring_pattern,
                    test_result: result
                }
            });
        } catch (error) {
            console.error('Error testing configuration:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to test configuration',
                error: error.message
            });
        }
    }
}

module.exports = ScoringController;