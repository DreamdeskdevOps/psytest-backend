const { getOne, insertOne, updateOne, deleteOne, getMany, executeQuery, sequelize } = require('../config/database');

const TABLE_NAME = 'scoring_configurations';

/**
 * Scoring Configuration Model
 * Handles scoring patterns and configurations for tests and sections
 */
class ScoringConfiguration {

    /**
     * Get all scoring configurations for a test
     * @param {Number} testId - Test ID
     * @returns {Array} Scoring configurations
     */
    static async getByTestId(testId) {
        const query = `
            SELECT
                sc.*,
                t.title as test_title,
                ts.section_name
            FROM ${TABLE_NAME} sc
            JOIN tests t ON sc.test_id = t.id
            LEFT JOIN test_sections ts ON sc.section_id = ts.id
            WHERE sc.test_id = $1 AND sc.is_active = true
            ORDER BY sc.section_id NULLS FIRST, sc.created_at DESC
        `;

        const results = await getMany(query, [testId]);

        return results.map(config => ({
            ...config,
            scoring_pattern: JSON.parse(config.scoring_pattern || '{}')
        }));
    }

    /**
     * Get scoring configuration for specific test/section combination
     * @param {String} testId - Test ID (UUID)
     * @param {String|null} sectionId - Section ID (UUID, null for test-level config)
     * @returns {Object|null} Scoring configuration
     */
    static async getConfiguration(testId, sectionId = null) {
        try {
            const query = `
                SELECT * FROM ${TABLE_NAME}
                WHERE test_id = ? AND (section_id = ? OR (? IS NULL AND section_id IS NULL))
                AND is_active = true
                ORDER BY created_at DESC
                LIMIT 1
            `;

            console.log('🔍 Executing getConfiguration query:', query);
            console.log('📋 With parameters:', [testId, sectionId, sectionId]);

            const [results] = await sequelize.query(query, {
                replacements: [testId, sectionId, sectionId],
                type: sequelize.QueryTypes.SELECT
            });

            const result = results ? results : null;
            console.log('📊 Configuration query result:', result);

            if (result) {
                // Check if scoring_pattern is already an object (parsed by Sequelize) or a string
                if (typeof result.scoring_pattern === 'string') {
                    try {
                        result.scoring_pattern = JSON.parse(result.scoring_pattern || '{}');
                    } catch (parseError) {
                        console.error('⚠️ Error parsing scoring_pattern JSON:', parseError);
                        result.scoring_pattern = {};
                    }
                } else if (!result.scoring_pattern) {
                    result.scoring_pattern = {};
                }
            }

            return result;

        } catch (error) {
            console.error('❌ Error in getConfiguration:', error);
            // Return null when no configuration exists - this is normal
            return null;
        }
    }

    /**
     * Create or update scoring configuration
     * @param {Object} configData - Configuration data
     * @returns {Object} Saved configuration
     */
    static async saveConfiguration(configData) {
        const {
            testId,
            sectionId = null,
            scoringType = 'flag_based',
            scoringPattern,
            createdBy
        } = configData;

        // Check if configuration exists
        const existingConfig = await this.getConfiguration(testId, sectionId);

        if (existingConfig) {
            // Update existing
            const updateQuery = `
                UPDATE ${TABLE_NAME}
                SET
                    scoring_type = ?,
                    scoring_pattern = ?,
                    updated_by = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                RETURNING *
            `;

            const results = await sequelize.query(updateQuery, {
                replacements: [
                    scoringType,
                    JSON.stringify(scoringPattern),
                    createdBy,
                    existingConfig.id
                ],
                type: sequelize.QueryTypes.SELECT
            });

            const result = results[0];
            // Handle scoring_pattern parsing - it might already be an object
            if (typeof result.scoring_pattern === 'string') {
                result.scoring_pattern = JSON.parse(result.scoring_pattern || '{}');
            } else if (!result.scoring_pattern) {
                result.scoring_pattern = {};
            }
            return result;
        } else {
            // Create new
            const insertQuery = `
                INSERT INTO ${TABLE_NAME}
                (test_id, section_id, scoring_type, scoring_pattern, created_by, updated_by)
                VALUES (?, ?, ?, ?, ?, ?)
                RETURNING *
            `;

            console.log('💾 DEBUG: configData for insert:', configData);
            const replacements = [
                testId,
                sectionId,
                scoringType,
                JSON.stringify(scoringPattern),
                createdBy,
                createdBy
            ];
            console.log('💾 DEBUG: replacements for insert:', replacements);

            const results = await sequelize.query(insertQuery, {
                replacements: replacements,
                type: sequelize.QueryTypes.SELECT
            });

            const result = results[0];
            // Handle scoring_pattern parsing - it might already be an object
            if (typeof result.scoring_pattern === 'string') {
                result.scoring_pattern = JSON.parse(result.scoring_pattern || '{}');
            } else if (!result.scoring_pattern) {
                result.scoring_pattern = {};
            }
            return result;
        }
    }

    /**
     * Get available scoring patterns with descriptions
     * @returns {Array} Available patterns
     */
    static getAvailablePatterns() {
        return [
            {
                type: 'highest_only',
                name: 'Highest Only',
                description: 'Returns the single flag with the highest score',
                example: 'E: 25, I: 18, R: 12 → Result: E'
            },
            {
                type: 'top_3',
                name: 'Top 3 Highest',
                description: 'Returns top 3 flags with custom ordering support (R<I<E)',
                example: 'E: 25, I: 18, R: 12 → Result: [E, I, R] (ordered by priority)',
                requiresOrder: true
            },
            {
                type: 'top_4',
                name: 'Top 4 Highest',
                description: 'Returns top 4 flags ordered by score',
                example: 'Returns highest 4 flags with their scores'
            },
            {
                type: 'top_5',
                name: 'Top 5 Highest',
                description: 'Returns top 5 flags ordered by score',
                example: 'Returns highest 5 flags with their scores'
            },
            {
                type: 'custom_top_n',
                name: 'Custom Top N',
                description: 'Configure custom number of top flags to return',
                example: 'Flexible configuration for any number of top results',
                requiresTopN: true
            }
        ];
    }

    /**
     * Get flags used in test questions
     * @param {String} testId - Test ID (UUID)
     * @param {String|null} sectionId - Section ID (UUID, optional)
     * @returns {Array} Available flags with usage counts
     */
    static async getTestFlags(testId, sectionId = null) {
        try {
            let query = `
                SELECT
                    q.question_flag as flag,
                    COUNT(*) as question_count,
                    ts.section_name
                FROM questions q
                JOIN test_sections ts ON q.section_id = ts.id
                WHERE ts.test_id = $1
                AND q.question_flag IS NOT NULL
                AND q.question_flag != ''
                AND q.is_active = true
            `;

            const params = [testId];

            if (sectionId) {
                query += ` AND ts.id = $2`;
                params.push(sectionId);
            }

            query += `
                GROUP BY q.question_flag, ts.section_name
                ORDER BY q.question_flag, ts.section_name
            `;

            console.log('🔍 Executing getTestFlags query:', query);
            console.log('📋 With parameters:', params);

            const results = await getMany(query, params);
            console.log('✅ Raw query results:', results);

            // Group by flag
            const flagGroups = {};
            results.forEach(result => {
                const flag = result.flag || result.question_flag;
                if (!flag) return; // Skip if no flag

                if (!flagGroups[flag]) {
                    flagGroups[flag] = {
                        flag: flag,
                        total_questions: 0,
                        sections: []
                    };
                }
                flagGroups[flag].total_questions += parseInt(result.question_count);
                flagGroups[flag].sections.push({
                    section_name: result.section_name,
                    question_count: parseInt(result.question_count)
                });
            });

            const flagsResult = Object.values(flagGroups);
            console.log('🏷️ Final flags result:', flagsResult);

            return flagsResult;

        } catch (error) {
            console.error('❌ Error in getTestFlags:', error);

            // Return mock data for development if database query fails
            console.log('🔧 Returning mock flags data for development');
            return [
                { flag: 'R', total_questions: 10, sections: [{ section_name: 'Realistic', question_count: 10 }] },
                { flag: 'I', total_questions: 8, sections: [{ section_name: 'Investigative', question_count: 8 }] },
                { flag: 'A', total_questions: 12, sections: [{ section_name: 'Artistic', question_count: 12 }] },
                { flag: 'S', total_questions: 9, sections: [{ section_name: 'Social', question_count: 9 }] },
                { flag: 'E', total_questions: 11, sections: [{ section_name: 'Enterprising', question_count: 11 }] },
                { flag: 'C', total_questions: 7, sections: [{ section_name: 'Conventional', question_count: 7 }] }
            ];
        }
    }

    /**
     * Validate scoring configuration
     * @param {Object} config - Configuration to validate
     * @returns {Object} Validation result
     */
    static validateConfiguration(config) {
        const errors = [];
        const { scoringType, scoringPattern } = config;

        if (!scoringType) {
            errors.push('Scoring type is required');
        }

        if (!scoringPattern || typeof scoringPattern !== 'object') {
            errors.push('Scoring pattern configuration is required');
        } else {
            const { type, order, topN } = scoringPattern;

            if (!type) {
                errors.push('Scoring pattern type is required');
            }

            // Validate specific pattern requirements
            if (type === 'top_3' && (!order || !Array.isArray(order) || order.length === 0)) {
                errors.push('Top 3 pattern requires order configuration (e.g., ["E", "I", "R"])');
            }

            if (type === 'custom_top_n' && (!topN || topN < 1 || topN > 10)) {
                errors.push('Custom top N pattern requires valid topN value (1-10)');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Delete scoring configuration
     * @param {Number} configId - Configuration ID
     * @returns {Object} Deleted configuration
     */
    static async deleteConfiguration(configId) {
        const query = `
            UPDATE ${TABLE_NAME}
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;

        return await updateOne(query, [configId]);
    }

    /**
     * Get configuration summary for dashboard
     * @param {Number} testId - Test ID
     * @returns {Object} Configuration summary
     */
    static async getConfigurationSummary(testId) {
        const query = `
            SELECT
                COUNT(*) as total_configurations,
                COUNT(CASE WHEN section_id IS NULL THEN 1 END) as test_level_configs,
                COUNT(CASE WHEN section_id IS NOT NULL THEN 1 END) as section_level_configs,
                string_agg(DISTINCT scoring_type, ', ') as scoring_types
            FROM ${TABLE_NAME}
            WHERE test_id = $1 AND is_active = true
        `;

        return await getOne(query, [testId]);
    }
}

module.exports = ScoringConfiguration;