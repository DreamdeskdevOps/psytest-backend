const { getOne, insertOne, updateOne, deleteOne, getMany } = require('../config/database');

class FlagScoringService {

    // **SCORING PATTERN TYPES**
    static SCORING_PATTERNS = {
        HIGHEST_ONLY: 'highest_only',
        TOP_3: 'top_3',
        TOP_4: 'top_4',
        TOP_5: 'top_5',
        CUSTOM_TOP_N: 'custom_top_n'
    };

    /**
     * Calculate flag scores from user responses
     * @param {Array} userResponses - Array of user responses
     * @param {Array} questions - Array of questions with flags
     * @returns {Object} Flag scores object
     */
    static async calculateFlagScores(userResponses, questions) {
        const flagScores = {};
        const scoreDetails = [];
        let totalScore = 0;
        let maxPossibleScore = 0;

        // Create lookup maps for efficiency
        const responseMap = {};
        userResponses.forEach(response => {
            responseMap[response.question_id] = response;
        });

        const questionMap = {};
        questions.forEach(question => {
            questionMap[question.id] = question;
        });

        // Calculate scores for each question
        questions.forEach(question => {
            if (!question.question_flag) return; // Skip questions without flags

            const userResponse = responseMap[question.id];
            const flag = question.question_flag;

            // Initialize flag score if not exists
            if (!flagScores[flag]) {
                flagScores[flag] = 0;
            }

            let pointsEarned = 0;
            let pointsPossible = 1; // Default point value
            let isCorrect = false;

            if (userResponse) {
                // Check if answer is correct (you can customize this logic)
                isCorrect = this.isAnswerCorrect(userResponse.answer_value, question.correct_answer);
                pointsEarned = isCorrect ? pointsPossible : 0;
            }

            // Add to flag total
            flagScores[flag] += pointsEarned;
            totalScore += pointsEarned;
            maxPossibleScore += pointsPossible;

            // Store detail for tracking
            scoreDetails.push({
                question_id: question.id,
                question_flag: flag,
                user_answer: userResponse?.answer_value || null,
                correct_answer: question.correct_answer,
                is_correct: isCorrect,
                points_earned: pointsEarned,
                points_possible: pointsPossible
            });
        });

        return {
            flagScores,
            totalScore,
            maxPossibleScore,
            scoreDetails
        };
    }

    /**
     * Apply scoring pattern to flag scores
     * @param {Object} flagScores - Raw flag scores
     * @param {Object} scoringPattern - Scoring configuration
     * @returns {Object} Final result based on pattern
     */
    static applyeScoringPattern(flagScores, scoringPattern) {
        const { type, order = [], topN = 3 } = scoringPattern;

        // Sort flags by score (highest first)
        const sortedFlags = Object.entries(flagScores)
            .sort(([,a], [,b]) => b - a)
            .map(([flag, score]) => ({ flag, score }));

        let result = {
            pattern_type: type,
            all_scores: flagScores,
            sorted_flags: sortedFlags
        };

        switch (type) {
            case this.SCORING_PATTERNS.HIGHEST_ONLY:
                result.primary = sortedFlags[0]?.flag || null;
                result.primary_score = sortedFlags[0]?.score || 0;
                break;

            case this.SCORING_PATTERNS.TOP_3:
                result.top_3 = this.getTopNWithOrder(sortedFlags, 3, order);
                result.primary = result.top_3[0]?.flag || null;
                break;

            case this.SCORING_PATTERNS.TOP_4:
                result.top_4 = this.getTopNWithOrder(sortedFlags, 4, order);
                result.primary = result.top_4[0]?.flag || null;
                break;

            case this.SCORING_PATTERNS.TOP_5:
                result.top_5 = this.getTopNWithOrder(sortedFlags, 5, order);
                result.primary = result.top_5[0]?.flag || null;
                break;

            case this.SCORING_PATTERNS.CUSTOM_TOP_N:
                const n = Math.max(1, Math.min(topN || 3, sortedFlags.length));
                result[`top_${n}`] = this.getTopNWithOrder(sortedFlags, n, order);
                result.primary = result[`top_${n}`][0]?.flag || null;
                break;

            default:
                result.primary = sortedFlags[0]?.flag || null;
        }

        return result;
    }

    /**
     * Get top N flags with optional custom ordering (like R<I<E)
     * @param {Array} sortedFlags - Flags sorted by score
     * @param {Number} n - Number of top flags to return
     * @param {Array} order - Custom order array (optional)
     * @returns {Array} Top N flags
     */
    static getTopNWithOrder(sortedFlags, n, order = []) {
        let topFlags = sortedFlags.slice(0, n);

        // Apply custom ordering if provided (like R<I<E priority)
        if (order && order.length > 0) {
            topFlags.sort((a, b) => {
                const aIndex = order.indexOf(a.flag);
                const bIndex = order.indexOf(b.flag);

                // If both flags are in order array, sort by order
                if (aIndex !== -1 && bIndex !== -1) {
                    return bIndex - aIndex; // Reverse order (E comes first)
                }

                // If only one is in order array, prioritize it
                if (aIndex !== -1) return -1;
                if (bIndex !== -1) return 1;

                // If neither is in order, sort by score
                return b.score - a.score;
            });
        }

        return topFlags;
    }

    /**
     * Check if user answer is correct
     * @param {String} userAnswer - User's answer
     * @param {String} correctAnswer - Correct answer
     * @returns {Boolean} Is answer correct
     */
    static isAnswerCorrect(userAnswer, correctAnswer) {
        if (!userAnswer || !correctAnswer) return false;

        // Handle different answer formats
        const normalizeAnswer = (answer) => {
            if (typeof answer === 'string') {
                return answer.trim().toLowerCase();
            }
            return String(answer).trim().toLowerCase();
        };

        return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
    }

    /**
     * Save scoring configuration for a test/section
     * @param {Object} config - Scoring configuration
     * @returns {Object} Saved configuration
     */
    static async saveScoringConfiguration(config) {
        const {
            testId,
            sectionId = null,
            scoringType = 'flag_based',
            scoringPattern,
            createdBy
        } = config;

        // Check if configuration already exists
        const existingConfig = await this.getScoringConfiguration(testId, sectionId);

        if (existingConfig) {
            // Update existing configuration
            const updateQuery = `
                UPDATE scoring_configurations
                SET
                    scoring_pattern = $1,
                    updated_by = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE test_id = $3 AND (section_id = $4 OR ($4 IS NULL AND section_id IS NULL))
                RETURNING *
            `;
            return await updateOne(updateQuery, [
                JSON.stringify(scoringPattern),
                createdBy,
                testId,
                sectionId
            ]);
        } else {
            // Create new configuration
            const insertQuery = `
                INSERT INTO scoring_configurations
                (test_id, section_id, scoring_type, scoring_pattern, created_by, updated_by)
                VALUES ($1, $2, $3, $4, $5, $5)
                RETURNING *
            `;
            return await insertOne(insertQuery, [
                testId,
                sectionId,
                scoringType,
                JSON.stringify(scoringPattern),
                createdBy
            ]);
        }
    }

    /**
     * Get scoring configuration for test/section
     * @param {Number} testId - Test ID
     * @param {Number} sectionId - Section ID (optional)
     * @returns {Object} Scoring configuration
     */
    static async getScoringConfiguration(testId, sectionId = null) {
        const query = `
            SELECT * FROM scoring_configurations
            WHERE test_id = $1 AND (section_id = $2 OR ($2 IS NULL AND section_id IS NULL))
            AND is_active = true
            ORDER BY created_at DESC
            LIMIT 1
        `;
        return await getOne(query, [testId, sectionId]);
    }

    /**
     * Calculate and save test result
     * @param {Object} params - Test result parameters
     * @returns {Object} Saved test result
     */
    static async calculateAndSaveResult(params) {
        const {
            userId,
            testId,
            sectionId,
            userResponses,
            questions,
            completionTime
        } = params;

        // Get scoring configuration
        const scoringConfig = await this.getScoringConfiguration(testId, sectionId);

        if (!scoringConfig) {
            throw new Error('No scoring configuration found for this test/section');
        }

        const scoringPattern = JSON.parse(scoringConfig.scoring_pattern);

        // Calculate flag scores
        const scoreCalculation = await this.calculateFlagScores(userResponses, questions);

        // Apply scoring pattern
        const finalResult = this.applyeScoringPattern(
            scoreCalculation.flagScores,
            scoringPattern
        );

        // Create result summary
        const resultSummary = this.generateResultSummary(finalResult);

        // Save test result
        const insertQuery = `
            INSERT INTO test_results
            (user_id, test_id, section_id, flag_scores, total_score, max_possible_score,
             final_result, result_summary, completion_time, is_complete)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
            RETURNING *
        `;

        const testResult = await insertOne(insertQuery, [
            userId,
            testId,
            sectionId,
            JSON.stringify(scoreCalculation.flagScores),
            scoreCalculation.totalScore,
            scoreCalculation.maxPossibleScore,
            JSON.stringify(finalResult),
            resultSummary,
            completionTime
        ]);

        // Save score details
        await this.saveScoreDetails(testResult.id, scoreCalculation.scoreDetails);

        return {
            ...testResult,
            flag_scores: scoreCalculation.flagScores,
            final_result: finalResult
        };
    }

    /**
     * Save detailed score breakdown
     * @param {Number} testResultId - Test result ID
     * @param {Array} scoreDetails - Detailed score array
     */
    static async saveScoreDetails(testResultId, scoreDetails) {
        const insertPromises = scoreDetails.map(detail => {
            const query = `
                INSERT INTO flag_score_details
                (test_result_id, question_id, question_flag, user_answer,
                 correct_answer, is_correct, points_earned, points_possible)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `;
            return insertOne(query, [
                testResultId,
                detail.question_id,
                detail.question_flag,
                detail.user_answer,
                detail.correct_answer,
                detail.is_correct,
                detail.points_earned,
                detail.points_possible
            ]);
        });

        await Promise.all(insertPromises);
    }

    /**
     * Generate human-readable result summary
     * @param {Object} finalResult - Final calculated result
     * @returns {String} Result summary
     */
    static generateResultSummary(finalResult) {
        const { pattern_type, primary, all_scores } = finalResult;

        let summary = `Primary Result: ${primary || 'Not determined'}`;

        if (pattern_type === this.SCORING_PATTERNS.HIGHEST_ONLY) {
            summary += ` (Highest scoring flag)`;
        } else if (pattern_type.startsWith('top_')) {
            const topFlags = finalResult[pattern_type] || [];
            const topFlagNames = topFlags.map(f => f.flag).join(', ');
            summary += `\nTop Flags: ${topFlagNames}`;
        }

        // Add score breakdown
        const scoreBreakdown = Object.entries(all_scores)
            .map(([flag, score]) => `${flag}: ${score}`)
            .join(', ');
        summary += `\nScore Breakdown: ${scoreBreakdown}`;

        return summary;
    }

    /**
     * Get test results for a user
     * @param {Number} userId - User ID
     * @param {Number} testId - Test ID (optional)
     * @returns {Array} User test results
     */
    static async getUserResults(userId, testId = null) {
        let query = `
            SELECT tr.*, t.title as test_title, ts.section_name
            FROM test_results tr
            JOIN tests t ON tr.test_id = t.id
            LEFT JOIN test_sections ts ON tr.section_id = ts.id
            WHERE tr.user_id = $1 AND tr.is_complete = true
        `;
        const params = [userId];

        if (testId) {
            query += ` AND tr.test_id = $2`;
            params.push(testId);
        }

        query += ` ORDER BY tr.created_at DESC`;

        const results = await getMany(query, params);

        // Parse JSON fields
        return results.map(result => ({
            ...result,
            flag_scores: JSON.parse(result.flag_scores || '{}'),
            final_result: JSON.parse(result.final_result || '{}')
        }));
    }
}

module.exports = FlagScoringService;