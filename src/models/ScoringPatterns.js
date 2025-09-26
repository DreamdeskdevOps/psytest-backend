const { getOne, insertOne, updateOne, deleteOne, getMany } = require('../config/database');

const TABLE_NAME = 'scoring_patterns';

/**
 * Scoring Patterns Model
 * Manages reusable scoring pattern definitions
 */
class ScoringPatterns {

    /**
     * Get all scoring patterns with optional filtering
     * @param {Object} options - Filter options
     * @returns {Array} Scoring patterns
     */
    static async getAll(options = {}) {
        let query = `
            SELECT
                sp.*,
                0 as actual_usage_count
            FROM ${TABLE_NAME} sp
        `;

        const conditions = [];
        const params = [];
        let paramIndex = 1;

        // Filter by category
        if (options.category) {
            conditions.push(`sp.category = $${paramIndex}`);
            params.push(options.category);
            paramIndex++;
        }

        // Filter by type
        if (options.type) {
            conditions.push(`sp.type = $${paramIndex}`);
            params.push(options.type);
            paramIndex++;
        }

        // Filter by active status
        if (options.activeOnly !== false) {
            conditions.push(`sp.is_active = true`);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY sp.created_at DESC`;

        const results = await getMany(query, params);

        return results.map(pattern => ({
            ...pattern,
            configuration: typeof pattern.configuration === 'string'
                ? JSON.parse(pattern.configuration || '{}')
                : (pattern.configuration || {})
        }));
    }

    /**
     * Get scoring pattern by ID
     * @param {Number} id - Pattern ID
     * @returns {Object|null} Scoring pattern
     */
    static async getById(id) {
        const query = `
            SELECT
                sp.*,
                0 as actual_usage_count
            FROM ${TABLE_NAME} sp
            WHERE sp.id = $1
        `;

        const result = await getOne(query, [id]);

        if (!result) {
            return null;
        }

        return {
            ...result,
            configuration: typeof result.configuration === 'string'
                ? JSON.parse(result.configuration || '{}')
                : (result.configuration || {})
        };
    }

    /**
     * Create new scoring pattern
     * @param {Object} patternData - Pattern data
     * @returns {Object} Created pattern
     */
    static async create(patternData) {
        const {
            name,
            description,
            category = 'flag-based',
            type,
            configuration = {},
            isActive = true,
            createdBy
        } = patternData;

        // Validate required fields
        if (!name || !type) {
            throw new Error('Name and type are required');
        }

        // Validate configuration based on type
        const validationResult = this.validateConfiguration(type, configuration);
        if (!validationResult.isValid) {
            throw new Error(`Invalid configuration: ${validationResult.errors.join(', ')}`);
        }

        const query = `
            INSERT INTO ${TABLE_NAME} (
                name, description, category, type, configuration, is_active, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const result = await getOne(query, [
            name,
            description,
            category,
            type,
            JSON.stringify(configuration),
            isActive,
            createdBy || null
        ]);

        return {
            ...result,
            configuration: typeof result.configuration === 'string'
                ? JSON.parse(result.configuration || '{}')
                : (result.configuration || {})
        };
    }

    /**
     * Update scoring pattern
     * @param {Number} id - Pattern ID
     * @param {Object} updates - Update data
     * @returns {Object|null} Updated pattern
     */
    static async update(id, updates) {
        const existing = await this.getById(id);
        if (!existing) {
            return null;
        }

        const {
            name,
            description,
            configuration,
            isActive
        } = updates;

        // Validate configuration if provided
        if (configuration) {
            const validationResult = this.validateConfiguration(existing.type, configuration);
            if (!validationResult.isValid) {
                throw new Error(`Invalid configuration: ${validationResult.errors.join(', ')}`);
            }
        }

        const query = `
            UPDATE ${TABLE_NAME}
            SET
                name = COALESCE($2, name),
                description = COALESCE($3, description),
                configuration = COALESCE($4, configuration),
                is_active = COALESCE($5, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;

        const result = await getOne(query, [
            id,
            name || null,
            description || null,
            configuration ? JSON.stringify(configuration) : null,
            isActive !== undefined ? isActive : null
        ]);

        return {
            ...result,
            configuration: typeof result.configuration === 'string'
                ? JSON.parse(result.configuration || '{}')
                : (result.configuration || {})
        };
    }

    /**
     * Delete scoring pattern
     * @param {Number} id - Pattern ID
     * @returns {Boolean} Success status
     */
    static async delete(id) {
        // For now, just delete without usage check since scoring_configurations table doesn't exist yet
        const query = `DELETE FROM ${TABLE_NAME} WHERE id = $1 RETURNING id`;
        const result = await getOne(query, [id]);

        return !!result;
    }

    /**
     * Duplicate scoring pattern
     * @param {Number} id - Source pattern ID
     * @param {Object} overrides - Override values
     * @returns {Object} New pattern
     */
    static async duplicate(id, overrides = {}) {
        const sourcePattern = await this.getById(id);
        if (!sourcePattern) {
            throw new Error('Source pattern not found');
        }

        const newName = overrides.name || `${sourcePattern.name} (Copy)`;

        const duplicateData = {
            name: newName,
            description: overrides.description || sourcePattern.description,
            category: sourcePattern.category,
            type: sourcePattern.type,
            configuration: overrides.configuration || sourcePattern.configuration,
            isActive: overrides.isActive !== undefined ? overrides.isActive : sourcePattern.is_active,
            createdBy: overrides.createdBy
        };

        return await this.create(duplicateData);
    }

    /**
     * Get patterns by category
     * @param {String} category - Pattern category
     * @returns {Array} Patterns in category
     */
    static async getByCategory(category) {
        return await this.getAll({ category, activeOnly: true });
    }

    /**
     * Validate pattern configuration based on type
     * @param {String} type - Pattern type
     * @param {Object} configuration - Configuration object
     * @returns {Object} Validation result
     */
    static validateConfiguration(type, configuration) {
        const errors = [];

        switch (type) {
            case 'preset-highest':
            case 'preset-lowest':
            case 'preset-top-3-rie':
            case 'preset-top-5':
                // Preset patterns have fixed configurations
                if (!configuration.flagCount || configuration.flagCount < 1) {
                    errors.push('flagCount must be a positive number');
                }
                break;

            case 'custom-flag-pattern':
                // Custom patterns need more validation
                if (!configuration.flagCount || configuration.flagCount < 1 || configuration.flagCount > 10) {
                    errors.push('flagCount must be between 1 and 10');
                }

                if (!configuration.orderDirection || !['high-to-low', 'low-to-high'].includes(configuration.orderDirection)) {
                    errors.push('orderDirection must be "high-to-low" or "low-to-high"');
                }

                if (configuration.priorityRules && (!configuration.priorityOrder || !Array.isArray(configuration.priorityOrder))) {
                    errors.push('priorityOrder must be an array when priorityRules is enabled');
                }

                if (configuration.customWeights && (!configuration.flagWeights || typeof configuration.flagWeights !== 'object')) {
                    errors.push('flagWeights must be an object when customWeights is enabled');
                }
                break;

            case 'range-male-adult':
            case 'range-female-adult':
            case 'range-child':
            case 'range-adolescent':
            case 'custom-range-pattern':
                // Range-based patterns validation
                if (!configuration.filter) {
                    errors.push('filter is required for range-based patterns');
                }

                if (!configuration.ranges || !Array.isArray(configuration.ranges)) {
                    errors.push('ranges must be an array');
                } else {
                    if (configuration.ranges.length === 0) {
                        errors.push('At least one range is required');
                    }

                    if (configuration.ranges.length > 10) {
                        errors.push('Maximum 10 ranges allowed');
                    }

                    // Validate each range
                    configuration.ranges.forEach((range, index) => {
                        if (typeof range.min !== 'number' || typeof range.max !== 'number') {
                            errors.push(`Range ${index + 1}: min and max must be numbers`);
                        } else if (range.min > range.max) {
                            errors.push(`Range ${index + 1}: min must be less than or equal to max`);
                        }

                        if (!range.label || typeof range.label !== 'string' || range.label.trim() === '') {
                            errors.push(`Range ${index + 1}: label is required and must be a non-empty string`);
                        }
                    });

                    // Check for overlapping ranges
                    for (let i = 0; i < configuration.ranges.length - 1; i++) {
                        for (let j = i + 1; j < configuration.ranges.length; j++) {
                            const range1 = configuration.ranges[i];
                            const range2 = configuration.ranges[j];

                            // Check if ranges actually overlap
                            // Two ranges overlap if they share any common values
                            // For ranges [a,b] and [c,d], they overlap if max(a,c) <= min(b,d)
                            const maxStart = Math.max(range1.min, range2.min);
                            const minEnd = Math.min(range1.max, range2.max);
                            const hasOverlap = maxStart <= minEnd;

                            if (hasOverlap) {
                                errors.push(`Ranges ${i + 1} and ${j + 1} overlap`);
                            }
                        }
                    }
                }
                break;

            default:
                errors.push(`Unknown pattern type: ${type}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get usage statistics for patterns
     * @returns {Array} Usage statistics
     */
    static async getUsageStatistics() {
        const query = `
            SELECT
                sp.id,
                sp.name,
                sp.category,
                sp.type,
                0 as usage_count,
                0 as test_count
            FROM ${TABLE_NAME} sp
            ORDER BY sp.name
        `;

        return await getMany(query);
    }

    /**
     * Update usage count for a pattern
     * @param {Number} patternId - Pattern ID
     */
    static async updateUsageCount(patternId) {
        // For now, do nothing since scoring_configurations table doesn't exist yet
        // This will be implemented when scoring_configurations table is created
        console.log(`Usage count update requested for pattern ${patternId} - skipping until scoring_configurations table exists`);
    }
}

module.exports = ScoringPatterns;