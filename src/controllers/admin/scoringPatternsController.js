const ScoringPatterns = require('../../models/ScoringPatterns');
const { validationResult } = require('express-validator');

class ScoringPatternsController {

    /**
     * Get all scoring patterns
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async getAllPatterns(req, res) {
        try {
            const { category, type, activeOnly } = req.query;

            const options = {};
            if (category) options.category = category;
            if (type) options.type = type;
            if (activeOnly !== undefined) options.activeOnly = activeOnly === 'true';

            const patterns = await ScoringPatterns.getAll(options);

            res.json({
                success: true,
                data: patterns,
                count: patterns.length
            });
        } catch (error) {
            console.error('Error getting all patterns:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get scoring patterns',
                error: error.message
            });
        }
    }

    /**
     * Get scoring pattern by ID
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async getPatternById(req, res) {
        try {
            const { id } = req.params;
            const pattern = await ScoringPatterns.getById(parseInt(id));

            if (!pattern) {
                return res.status(404).json({
                    success: false,
                    message: 'Scoring pattern not found'
                });
            }

            res.json({
                success: true,
                data: pattern
            });
        } catch (error) {
            console.error('Error getting pattern by ID:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get scoring pattern',
                error: error.message
            });
        }
    }

    /**
     * Create new scoring pattern
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async createPattern(req, res) {
        try {
            // Check validation results
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const {
                name,
                description,
                category,
                type,
                configuration,
                isActive
            } = req.body;

            const patternData = {
                name,
                description,
                category,
                type,
                configuration,
                isActive,
                createdBy: req.user?.id || req.admin?.id
            };

            const newPattern = await ScoringPatterns.create(patternData);

            res.status(201).json({
                success: true,
                message: 'Scoring pattern created successfully',
                data: newPattern
            });
        } catch (error) {
            console.error('Error creating pattern:', error);

            // Handle specific errors
            if (error.message.includes('unique')) {
                return res.status(409).json({
                    success: false,
                    message: 'Pattern name already exists',
                    error: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to create scoring pattern',
                error: error.message
            });
        }
    }

    /**
     * Update scoring pattern
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async updatePattern(req, res) {
        try {
            // Check validation results
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { id } = req.params;
            const {
                name,
                description,
                configuration,
                isActive
            } = req.body;

            const updates = {};
            if (name !== undefined) updates.name = name;
            if (description !== undefined) updates.description = description;
            if (configuration !== undefined) updates.configuration = configuration;
            if (isActive !== undefined) updates.isActive = isActive;

            const updatedPattern = await ScoringPatterns.update(parseInt(id), updates);

            if (!updatedPattern) {
                return res.status(404).json({
                    success: false,
                    message: 'Scoring pattern not found'
                });
            }

            res.json({
                success: true,
                message: 'Scoring pattern updated successfully',
                data: updatedPattern
            });
        } catch (error) {
            console.error('Error updating pattern:', error);

            // Handle specific errors
            if (error.message.includes('unique')) {
                return res.status(409).json({
                    success: false,
                    message: 'Pattern name already exists',
                    error: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to update scoring pattern',
                error: error.message
            });
        }
    }

    /**
     * Delete scoring pattern
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async deletePattern(req, res) {
        try {
            const { id } = req.params;

            const deleted = await ScoringPatterns.delete(parseInt(id));

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Scoring pattern not found'
                });
            }

            res.json({
                success: true,
                message: 'Scoring pattern deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting pattern:', error);

            // Handle specific errors
            if (error.message.includes('currently used')) {
                return res.status(409).json({
                    success: false,
                    message: 'Cannot delete pattern that is currently in use',
                    error: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to delete scoring pattern',
                error: error.message
            });
        }
    }

    /**
     * Duplicate scoring pattern
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async duplicatePattern(req, res) {
        try {
            const { id } = req.params;
            const {
                name,
                description,
                configuration,
                isActive
            } = req.body;

            const overrides = {
                createdBy: req.user?.id || req.admin?.id
            };

            if (name) overrides.name = name;
            if (description !== undefined) overrides.description = description;
            if (configuration !== undefined) overrides.configuration = configuration;
            if (isActive !== undefined) overrides.isActive = isActive;

            const duplicatedPattern = await ScoringPatterns.duplicate(parseInt(id), overrides);

            res.status(201).json({
                success: true,
                message: 'Scoring pattern duplicated successfully',
                data: duplicatedPattern
            });
        } catch (error) {
            console.error('Error duplicating pattern:', error);

            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    message: 'Source pattern not found',
                    error: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to duplicate scoring pattern',
                error: error.message
            });
        }
    }

    /**
     * Get patterns by category
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async getPatternsByCategory(req, res) {
        try {
            const { category } = req.params;
            const patterns = await ScoringPatterns.getByCategory(category);

            res.json({
                success: true,
                data: patterns,
                count: patterns.length,
                category: category
            });
        } catch (error) {
            console.error('Error getting patterns by category:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get patterns by category',
                error: error.message
            });
        }
    }

    /**
     * Get usage statistics for all patterns
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async getUsageStatistics(req, res) {
        try {
            const statistics = await ScoringPatterns.getUsageStatistics();

            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            console.error('Error getting usage statistics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get usage statistics',
                error: error.message
            });
        }
    }

    /**
     * Validate pattern configuration
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async validateConfiguration(req, res) {
        try {
            const { type, configuration } = req.body;

            if (!type || !configuration) {
                return res.status(400).json({
                    success: false,
                    message: 'Type and configuration are required'
                });
            }

            const validation = ScoringPatterns.validateConfiguration(type, configuration);

            res.json({
                success: true,
                data: validation
            });
        } catch (error) {
            console.error('Error validating configuration:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to validate configuration',
                error: error.message
            });
        }
    }

    /**
     * Toggle pattern active status
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    static async toggleActiveStatus(req, res) {
        try {
            const { id } = req.params;
            const pattern = await ScoringPatterns.getById(parseInt(id));

            if (!pattern) {
                return res.status(404).json({
                    success: false,
                    message: 'Scoring pattern not found'
                });
            }

            const updatedPattern = await ScoringPatterns.update(parseInt(id), {
                isActive: !pattern.is_active
            });

            res.json({
                success: true,
                message: `Pattern ${updatedPattern.is_active ? 'activated' : 'deactivated'} successfully`,
                data: updatedPattern
            });
        } catch (error) {
            console.error('Error toggling active status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle pattern status',
                error: error.message
            });
        }
    }
}

module.exports = ScoringPatternsController;