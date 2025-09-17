const { getOne, insertOne, updateOne, deleteOne, getMany } = require('../config/database');

// Answer Patterns Management
const ANSWER_PATTERNS_TABLE = 'answer_patterns';
const SECTION_CONFIGS_TABLE = 'section_configurations';
const SCORING_RULES_TABLE = 'scoring_rules';

// Get all available answer patterns (built-in + custom)
const getAllAnswerPatterns = async () => {
  // Built-in patterns that come with the system
  const builtInPatterns = [
    {
      id: 'built-in-1',
      pattern_name: 'ODD_EVEN',
      display_name: 'Odd/Even Pattern',
      description: 'Alternating questions for personality assessments (MBTI style)',
      pattern_type: 'BUILT_IN',
      configuration: {
        scoringMethod: 'HIGHER_WINS',
        categories: ['Category A', 'Category B'],
        questionMapping: 'ALTERNATING',
        resultFormat: 'BINARY_CHOICE'
      },
      useCases: ['Personality Tests', 'MBTI-style Assessments', 'Binary Trait Measurement'],
      is_active: true,
      created_at: new Date('2024-01-01'),
      is_deletable: false
    },
    {
      id: 'built-in-2',
      pattern_name: 'LIKERT_SCALE',
      display_name: 'Likert Scale',
      description: 'Agreement or frequency rating scale',
      pattern_type: 'BUILT_IN',
      configuration: {
        scalePoints: 5,
        scaleLabels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
        scoringMethod: 'AVERAGE',
        reverseScoring: []
      },
      useCases: ['Surveys', 'Attitude Measurement', 'Behavioral Assessment'],
      is_active: true,
      created_at: new Date('2024-01-01'),
      is_deletable: false
    },
    {
      id: 'built-in-3',
      pattern_name: 'MULTIPLE_CHOICE',
      display_name: 'Multiple Choice',
      description: 'Single correct answer from multiple options',
      pattern_type: 'BUILT_IN',
      configuration: {
        minOptions: 2,
        maxOptions: 6,
        defaultOptions: 4,
        requiresCorrectAnswer: true,
        scoringMethod: 'CORRECT_INCORRECT'
      },
      useCases: ['Knowledge Tests', 'Aptitude Tests', 'Skill Assessments'],
      is_active: true,
      created_at: new Date('2024-01-01'),
      is_deletable: false
    },
    {
      id: 'built-in-4',
      pattern_name: 'YES_NO',
      display_name: 'Yes/No',
      description: 'Binary yes or no questions',
      pattern_type: 'BUILT_IN',
      configuration: {
        options: ['Yes', 'No'],
        scoringMethod: 'COUNT_YES',
        allowsCorrectAnswer: false
      },
      useCases: ['Quick Surveys', 'Binary Decisions', 'Preference Testing'],
      is_active: true,
      created_at: new Date('2024-01-01'),
      is_deletable: false
    },
    {
      id: 'built-in-5',
      pattern_name: 'TRUE_FALSE',
      display_name: 'True/False',
      description: 'Binary true or false knowledge questions',
      pattern_type: 'BUILT_IN',
      configuration: {
        options: ['True', 'False'],
        scoringMethod: 'CORRECT_INCORRECT',
        allowsCorrectAnswer: true
      },
      useCases: ['Knowledge Tests', 'Fact Checking', 'Quick Assessments'],
      is_active: true,
      created_at: new Date('2024-01-01'),
      is_deletable: false
    }
  ];

  // Get custom patterns from database
  const customPatternsQuery = `
    SELECT 
      id, pattern_name, display_name, description, pattern_type,
      configuration, use_cases, is_active, created_at, updated_at,
      created_by, true as is_deletable
    FROM ${ANSWER_PATTERNS_TABLE}
    WHERE is_active = true
    ORDER BY created_at DESC
  `;
  
  const customPatterns = await getMany(customPatternsQuery, []);

  // Combine built-in and custom patterns
  return [...builtInPatterns, ...customPatterns];
};

// Get single answer pattern by ID
const getAnswerPatternById = async (patternId) => {
  // Check if it's a built-in pattern first
  const allPatterns = await getAllAnswerPatterns();
  const pattern = allPatterns.find(p => p.id === patternId);
  
  if (pattern && pattern.pattern_type === 'BUILT_IN') {
    return pattern;
  }

  // If not built-in, query database for custom pattern
  const query = `
    SELECT
      id, pattern_name, display_name, description, pattern_type,
      configuration, use_cases, is_active, created_at, updated_at,
      created_by,

      -- Usage statistics (placeholder for future implementation)
      0 as usage_count,
      0 as question_count

    FROM ${ANSWER_PATTERNS_TABLE}
    WHERE id = $1 AND is_active = true
  `;
  
  return await getOne(query, [patternId]);
};

// Create custom answer pattern
const createAnswerPattern = async (patternData, adminId) => {
  const {
    patternName, displayName, description, configuration, useCases = []
  } = patternData;

  const query = `
    INSERT INTO ${ANSWER_PATTERNS_TABLE} (
      pattern_name, display_name, description, pattern_type,
      configuration, use_cases, options, is_active, created_by,
      created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      CURRENT_TIMESTAMP
    )
    RETURNING *
  `;

  const values = [
    patternName, displayName, description, 'CUSTOM',
    JSON.stringify(configuration), JSON.stringify(useCases),
    JSON.stringify(configuration), // Include options for backward compatibility
    true, adminId
  ];

  return await insertOne(query, values);
};

// Update custom answer pattern
const updateAnswerPattern = async (patternId, updateData, adminId) => {
  const {
    displayName, description, configuration, useCases
  } = updateData;

  const query = `
    UPDATE ${ANSWER_PATTERNS_TABLE}
    SET 
      display_name = COALESCE($2, display_name),
      description = COALESCE($3, description),
      configuration = COALESCE($4, configuration),
      use_cases = COALESCE($5, use_cases),
      updated_by = $6,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND pattern_type = 'CUSTOM' AND is_active = true
    RETURNING *
  `;

  const values = [
    patternId, displayName, description,
    configuration ? JSON.stringify(configuration) : null,
    useCases ? JSON.stringify(useCases) : null,
    adminId
  ];

  return await getOne(query, values);
};

// Delete custom answer pattern
const deleteAnswerPattern = async (patternId, adminId) => {
  // Check if pattern is in use (placeholder for future implementation)
  const usageCheck = {
    section_usage: 0,
    question_usage: 0
  };

  if (usageCheck.section_usage > 0 || usageCheck.question_usage > 0) {
    throw new Error(`Cannot delete pattern. It is being used by ${usageCheck.section_usage} sections and ${usageCheck.question_usage} questions.`);
  }

  const query = `
    UPDATE ${ANSWER_PATTERNS_TABLE}
    SET
      is_active = false,
      updated_by = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND pattern_type = 'CUSTOM'
    RETURNING id, pattern_name, display_name
  `;

  return await getOne(query, [patternId, adminId]);
};

// Section Configuration Management

// Configure section (comprehensive configuration)
const configureSectionAdvanced = async (sectionId, configData, adminId) => {
  const {
    answerOptions, timingConfig, scoringConfig, displayConfig,
    validationRules, customSettings = {}
  } = configData;

  // Map the configuration data to the actual database schema
  const answerType = answerOptions?.pattern || 'MULTIPLE_CHOICE';
  const optionsCount = answerOptions?.scalePoints || answerOptions?.optionsCount || 4;
  const correctPattern = answerOptions?.correctPattern || null;
  const customOptions = answerOptions?.customOptions || [];
  const marksPerQuestion = scoringConfig?.pointsPerQuestion || 1.00;
  const negativeMarks = scoringConfig?.penaltyPoints || 0.00;
  const bonusMarks = scoringConfig?.bonusPoints || 0.00;
  const timeBonus = scoringConfig?.timeBonus || false;
  const randomizeOptions = answerOptions?.randomizeOptions || false;
  const caseSensitive = answerOptions?.caseSensitive || false;

  // Check if configuration exists
  const existingConfig = await getOne(
    `SELECT id FROM ${SECTION_CONFIGS_TABLE} WHERE section_id = $1`,
    [sectionId]
  );

  let query, values;

  if (existingConfig) {
    // Update existing configuration
    query = `
      UPDATE ${SECTION_CONFIGS_TABLE}
      SET
        answer_type = $2,
        options_count = $3,
        correct_pattern = $4,
        custom_options = $5,
        marks_per_question = $6,
        negative_marks = $7,
        bonus_marks = $8,
        time_bonus = $9,
        randomize_options = $10,
        case_sensitive = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE section_id = $1
      RETURNING *
    `;
    values = [
      sectionId, answerType, optionsCount, correctPattern,
      JSON.stringify(customOptions), marksPerQuestion, negativeMarks,
      bonusMarks, timeBonus, randomizeOptions, caseSensitive
    ];
  } else {
    // Create new configuration
    query = `
      INSERT INTO ${SECTION_CONFIGS_TABLE} (
        section_id, answer_type, options_count, correct_pattern,
        custom_options, marks_per_question, negative_marks, bonus_marks,
        time_bonus, randomize_options, case_sensitive,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;
    values = [
      sectionId, answerType, optionsCount, correctPattern,
      JSON.stringify(customOptions), marksPerQuestion, negativeMarks,
      bonusMarks, timeBonus, randomizeOptions, caseSensitive
    ];
  }

  return await insertOne(query, values);
};

// Get section configuration
const getSectionConfiguration = async (sectionId) => {
  const query = `
    SELECT
      sc.*,
      s.section_name, s.answer_pattern, s.question_count,
      s.scoring_logic, s.max_score,
      t.title as test_title, t.test_type
    FROM ${SECTION_CONFIGS_TABLE} sc
    JOIN test_sections s ON sc.section_id = s.id
    JOIN tests t ON s.test_id = t.id
    WHERE sc.section_id = $1
  `;

  const result = await getOne(query, [sectionId]);

  if (result) {
    // Helper function to safely parse JSON
    const safeJsonParse = (value, defaultValue = []) => {
      if (value === null || value === undefined) return defaultValue;
      if (typeof value === 'object') return value; // Already parsed
      if (typeof value === 'string') {
        if (value.trim() === '') return defaultValue;
        try {
          return JSON.parse(value);
        } catch (error) {
          console.warn('JSON parse error:', error.message, 'Input:', value);
          return defaultValue;
        }
      }
      return defaultValue;
    };

    // Transform database fields to expected format
    result.answer_options_config = {
      pattern: result.answer_type,
      scalePoints: result.options_count,
      correctPattern: result.correct_pattern,
      customOptions: safeJsonParse(result.custom_options, []),
      randomizeOptions: result.randomize_options,
      caseSensitive: result.case_sensitive
    };

    result.scoring_config = {
      pointsPerQuestion: parseFloat(result.marks_per_question) || 1.00,
      penaltyPoints: parseFloat(result.negative_marks) || 0.00,
      bonusPoints: parseFloat(result.bonus_marks) || 0.00,
      timeBonus: result.time_bonus || false
    };

    // Add empty configs for fields not stored in the current schema
    result.timing_config = {};
    result.display_config = {};
    result.validation_rules = {};
    result.custom_settings = {};
  }

  return result;
};

// Update section configuration
const updateSectionConfiguration = async (sectionId, configData, adminId) => {
  const {
    answerOptionsConfig, timingConfig, scoringConfig,
    displayConfig, validationRules, customSettings
  } = configData;

  // Map the configuration data to the actual database schema
  const updates = [];
  const values = [sectionId];
  let paramIndex = 2;

  if (answerOptionsConfig) {
    if (answerOptionsConfig.pattern) {
      updates.push(`answer_type = $${paramIndex++}`);
      values.push(answerOptionsConfig.pattern);
    }
    if (answerOptionsConfig.scalePoints || answerOptionsConfig.optionsCount) {
      updates.push(`options_count = $${paramIndex++}`);
      values.push(answerOptionsConfig.scalePoints || answerOptionsConfig.optionsCount);
    }
    if (answerOptionsConfig.customOptions) {
      updates.push(`custom_options = $${paramIndex++}`);
      values.push(JSON.stringify(answerOptionsConfig.customOptions));
    }
    if (answerOptionsConfig.randomizeOptions !== undefined) {
      updates.push(`randomize_options = $${paramIndex++}`);
      values.push(answerOptionsConfig.randomizeOptions);
    }
    if (answerOptionsConfig.caseSensitive !== undefined) {
      updates.push(`case_sensitive = $${paramIndex++}`);
      values.push(answerOptionsConfig.caseSensitive);
    }
  }

  if (scoringConfig) {
    if (scoringConfig.pointsPerQuestion !== undefined) {
      updates.push(`marks_per_question = $${paramIndex++}`);
      values.push(scoringConfig.pointsPerQuestion);
    }
    if (scoringConfig.penaltyPoints !== undefined) {
      updates.push(`negative_marks = $${paramIndex++}`);
      values.push(scoringConfig.penaltyPoints);
    }
    if (scoringConfig.bonusPoints !== undefined) {
      updates.push(`bonus_marks = $${paramIndex++}`);
      values.push(scoringConfig.bonusPoints);
    }
    if (scoringConfig.timeBonus !== undefined) {
      updates.push(`time_bonus = $${paramIndex++}`);
      values.push(scoringConfig.timeBonus);
    }
  }

  if (updates.length === 0) {
    // If no database fields to update, just return the current configuration
    // This handles cases where only timing/display configs are provided (not stored in current schema)
    return await getSectionConfiguration(sectionId);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  const query = `
    UPDATE ${SECTION_CONFIGS_TABLE}
    SET ${updates.join(', ')}
    WHERE section_id = $1
    RETURNING *
  `;

  const result = await getOne(query, values);

  if (result) {
    // Helper function to safely parse JSON
    const safeJsonParse = (value, defaultValue = []) => {
      if (value === null || value === undefined) return defaultValue;
      if (typeof value === 'object') return value; // Already parsed
      if (typeof value === 'string') {
        if (value.trim() === '') return defaultValue;
        try {
          return JSON.parse(value);
        } catch (error) {
          console.warn('JSON parse error:', error.message, 'Input:', value);
          return defaultValue;
        }
      }
      return defaultValue;
    };

    // Transform database fields to expected format (same as getSectionConfiguration)
    result.answer_options_config = {
      pattern: result.answer_type,
      scalePoints: result.options_count,
      correctPattern: result.correct_pattern,
      customOptions: safeJsonParse(result.custom_options, []),
      randomizeOptions: result.randomize_options,
      caseSensitive: result.case_sensitive
    };

    result.scoring_config = {
      pointsPerQuestion: parseFloat(result.marks_per_question) || 1.00,
      penaltyPoints: parseFloat(result.negative_marks) || 0.00,
      bonusPoints: parseFloat(result.bonus_marks) || 0.00,
      timeBonus: result.time_bonus || false
    };

    // Add empty configs for fields not stored in the current schema
    result.timing_config = {};
    result.display_config = {};
    result.validation_rules = {};
    result.custom_settings = {};
  }

  return result;
};

// Scoring Rules Management

// Set section scoring rules
const setSectionScoringRules = async (sectionId, scoringData, adminId) => {
  const {
    scoringMethod, pointsPerQuestion, bonusPoints, penaltyPoints,
    weightingRules, passFailCriteria, customRules = {}
  } = scoringData;

  // Since scoring_rules table doesn't exist in current schema,
  // return a success response with the provided scoring data
  // This is a placeholder implementation until the scoring_rules table is created
  const mockScoringRules = {
    id: `mock-scoring-${sectionId}`,
    section_id: sectionId,
    scoring_method: scoringMethod,
    points_per_question: pointsPerQuestion || 1,
    bonus_points: bonusPoints || 0,
    penalty_points: penaltyPoints || 0,
    weighting_rules: weightingRules || {},
    pass_fail_criteria: passFailCriteria || {},
    custom_rules: customRules || {},
    created_by: adminId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return mockScoringRules;
};

// Get section scoring rules
const getSectionScoringRules = async (sectionId) => {
  // Since scoring_rules table doesn't exist in current schema,
  // return null to indicate no custom scoring rules are set
  // This will allow the service to return default scoring rules
  return null;
};

// Timing Management

// Set section time limit with advanced options
const setSectionTimeLimit = async (sectionId, timingData, adminId) => {
  const {
    timeLimitMinutes, warningThresholds, autoSubmit, gracePeriod,
    timePerQuestion, flexibleTiming = false
  } = timingData;

  const query = `
    UPDATE test_sections
    SET 
      time_limit_minutes = $2,
      timing_config = $3,
      updated_by = $4,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, section_name, time_limit_minutes, timing_config
  `;

  const timingConfig = {
    warningThresholds: warningThresholds || [75, 90], // Warn at 75% and 90%
    autoSubmit: autoSubmit !== undefined ? autoSubmit : true,
    gracePeriod: gracePeriod || 30, // 30 seconds grace period
    timePerQuestion: timePerQuestion,
    flexibleTiming: flexibleTiming,
    lastUpdated: new Date().toISOString()
  };

  const values = [sectionId, timeLimitMinutes, JSON.stringify(timingConfig), adminId];
  
  const result = await getOne(query, values);
  
  if (result) {
    result.timing_config = result.timing_config ? JSON.parse(result.timing_config) : {};
  }
  
  return result;
};

// Get section time settings
const getSectionTimeSettings = async (sectionId) => {
  const query = `
    SELECT 
      s.id, s.section_name, s.time_limit_minutes, s.timing_config,
      s.question_count,
      
      -- Calculate time per question if set
      CASE 
        WHEN s.time_limit_minutes IS NOT NULL AND s.question_count > 0 
        THEN (s.time_limit_minutes::DECIMAL / s.question_count)::DECIMAL(5,2)
        ELSE NULL
      END as calculated_time_per_question,
      
      -- Test timing context
      t.duration_minutes as test_total_duration,
      (SELECT SUM(time_limit_minutes) FROM test_sections 
       WHERE test_id = s.test_id AND id != s.id AND is_active = true) as other_sections_time
       
    FROM test_sections s
    JOIN tests t ON s.test_id = t.id
    WHERE s.id = $1 AND s.is_active = true
  `;
  
  const result = await getOne(query, [sectionId]);
  
  if (result) {
    result.timing_config = result.timing_config ? JSON.parse(result.timing_config) : {};
  }
  
  return result;
};

// Set overall test timing
const setOverallTestTiming = async (testId, timingData, adminId) => {
  const {
    durationMinutes, timingMode, breakConfig, overtimePolicy,
    sectionTransitions, globalSettings = {}
  } = timingData;

  const query = `
    UPDATE tests
    SET 
      duration_minutes = $2,
      timing_config = $3,
      updated_by = $4,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, title, duration_minutes, timing_config
  `;

  const testTimingConfig = {
    timingMode: timingMode || 'STRICT', // STRICT, FLEXIBLE, ADAPTIVE
    breakConfig: breakConfig || {
      allowBreaks: false,
      maxBreakTime: 0,
      breaksBetweenSections: false
    },
    overtimePolicy: overtimePolicy || {
      allowOvertime: false,
      maxOvertimeMinutes: 0,
      overtimePenalty: 0
    },
    sectionTransitions: sectionTransitions || {
      autoAdvance: true,
      transitionTime: 10,
      showProgress: true
    },
    globalSettings: globalSettings,
    lastUpdated: new Date().toISOString()
  };

  const values = [testId, durationMinutes, JSON.stringify(testTimingConfig), adminId];
  
  const result = await getOne(query, values);
  
  if (result) {
    result.timing_config = result.timing_config ? JSON.parse(result.timing_config) : {};
  }
  
  return result;
};

module.exports = {
  getAllAnswerPatterns,
  getAnswerPatternById,
  createAnswerPattern,
  updateAnswerPattern,
  deleteAnswerPattern,
  configureSectionAdvanced,
  getSectionConfiguration,
  updateSectionConfiguration,
  setSectionScoringRules,
  getSectionScoringRules,
  setSectionTimeLimit,
  getSectionTimeSettings,
  setOverallTestTiming
};