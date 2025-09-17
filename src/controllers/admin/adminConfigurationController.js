const AdminConfigurationService = require('../../services/adminConfigurationService');
const { validateUUID } = require('../../utils/validation');

// Answer Patterns Management

// GET /api/v1/admin/answer-patterns - Get all available answer patterns
const getAllAnswerPatterns = async (req, res) => {
  try {
    const adminId = req.admin.id;

    const result = await AdminConfigurationService.getAllAnswerPatterns(adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Get answer patterns controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/v1/admin/answer-patterns - Create custom answer pattern
const createAnswerPattern = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const {
      patternName,
      displayName,
      description,
      configuration,
      useCases
    } = req.body;

    // Basic validation
    if (!patternName?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Pattern name is required',
        data: null
      });
    }

    if (!displayName?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Display name is required',
        data: null
      });
    }

    if (!configuration || typeof configuration !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Configuration object is required',
        data: null
      });
    }

    // Validate pattern name format
    const patternNameRegex = /^[A-Z_][A-Z0-9_]*$/;
    if (!patternNameRegex.test(patternName.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Pattern name must be uppercase with underscores (e.g., MY_CUSTOM_PATTERN)',
        data: null
      });
    }

    const patternData = {
      patternName: patternName.trim().toUpperCase(),
      displayName: displayName.trim(),
      description: description?.trim(),
      configuration: configuration,
      useCases: Array.isArray(useCases) ? useCases : []
    };

    const result = await AdminConfigurationService.createAnswerPattern(
      patternData, 
      adminId, 
      ipAddress, 
      userAgent
    );

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Create answer pattern controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/answer-patterns/:id - Update answer pattern
const updateAnswerPattern = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pattern ID format',
        data: null
      });
    }

    const {
      displayName,
      description,
      configuration,
      useCases
    } = req.body;

    // Build update data (only include provided fields)
    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (configuration !== undefined) updateData.configuration = configuration;
    if (useCases !== undefined) updateData.useCases = Array.isArray(useCases) ? useCases : [];

    const result = await AdminConfigurationService.updateAnswerPattern(
      id, 
      updateData, 
      adminId, 
      ipAddress, 
      userAgent
    );

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Update answer pattern controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// DELETE /api/v1/admin/answer-patterns/:id - Delete custom pattern
const deleteAnswerPattern = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pattern ID format',
        data: null
      });
    }

    const result = await AdminConfigurationService.deleteAnswerPattern(
      id, 
      adminId, 
      ipAddress, 
      userAgent
    );

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Delete answer pattern controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// Section Configuration Management

// POST /api/v1/admin/sections/:id/configure - Configure section
const configureSection = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    const {
      answerOptions,
      timingConfig,
      scoringConfig,
      displayConfig,
      validationRules,
      customSettings
    } = req.body;

    const configData = {
      answerOptions: answerOptions || {},
      timingConfig: timingConfig || {},
      scoringConfig: scoringConfig || {},
      displayConfig: displayConfig || {},
      validationRules: validationRules || {},
      customSettings: customSettings || {}
    };

    const result = await AdminConfigurationService.configureSection(
      id, 
      configData, 
      adminId, 
      ipAddress, 
      userAgent
    );

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Configure section controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/v1/admin/sections/:id/configuration - Get section configuration
const getSectionConfiguration = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    const result = await AdminConfigurationService.getSectionConfiguration(id, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Get section configuration controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/sections/:id/configuration - Update section configuration
const updateSectionConfiguration = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    const {
      answerOptionsConfig,
      timingConfig,
      scoringConfig,
      displayConfig,
      validationRules,
      customSettings
    } = req.body;

    // Build update data (only include provided fields)
    const configData = {};
    if (answerOptionsConfig !== undefined) configData.answerOptionsConfig = answerOptionsConfig;
    if (timingConfig !== undefined) configData.timingConfig = timingConfig;
    if (scoringConfig !== undefined) configData.scoringConfig = scoringConfig;
    if (displayConfig !== undefined) configData.displayConfig = displayConfig;
    if (validationRules !== undefined) configData.validationRules = validationRules;
    if (customSettings !== undefined) configData.customSettings = customSettings;

    const result = await AdminConfigurationService.updateSectionConfiguration(
      id, 
      configData, 
      adminId, 
      ipAddress, 
      userAgent
    );

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Update section configuration controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/sections/:id/scoring - Set section scoring rules
const setSectionScoring = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    // Debug logging
    console.log('🔍 Request body:', JSON.stringify(req.body, null, 2));

    const {
      scoringMethod,
      pointsPerQuestion,
      bonusPoints,
      penaltyPoints,
      weightingRules,
      passFailCriteria,
      customRules,
      scoring_rules,
      weight_percentage,
      bonus_points,
      penalty_points
    } = req.body;

    // Extract scoring method from either flat structure or nested structure
    const extractedScoringMethod = scoringMethod || scoring_rules?.method;
    const extractedPointsPerQuestion = pointsPerQuestion || 1;
    const extractedBonusPoints = bonusPoints || bonus_points || 0;
    const extractedPenaltyPoints = penaltyPoints || penalty_points || 0;
    const extractedWeightingRules = weightingRules || scoring_rules?.difficulty_weights || {};

    console.log('🔍 Extracted values:');
    console.log('  scoringMethod:', scoringMethod);
    console.log('  scoring_rules:', scoring_rules);
    console.log('  extractedScoringMethod:', extractedScoringMethod);

    // Basic validation
    if (!extractedScoringMethod) {
      console.log('❌ No scoring method found');
      return res.status(400).json({
        success: false,
        message: 'Scoring method is required',
        data: null
      });
    }

    const allowedMethods = [
      'CORRECT_INCORRECT', 'WEIGHTED', 'PARTIAL_CREDIT', 'AVERAGE', 'SUM',
      'COUNT_YES', 'COUNT_NO', 'BINARY', 'HIGHER_WINS', 'CATEGORY_SUM', 
      'BALANCED', 'STANDARD'
    ];

    if (!allowedMethods.includes(extractedScoringMethod)) {
      return res.status(400).json({
        success: false,
        message: `Invalid scoring method. Allowed methods: ${allowedMethods.join(', ')}`,
        data: null
      });
    }

    const scoringData = {
      scoringMethod: extractedScoringMethod,
      pointsPerQuestion: extractedPointsPerQuestion,
      bonusPoints: extractedBonusPoints,
      penaltyPoints: extractedPenaltyPoints,
      weightingRules: extractedWeightingRules,
      passFailCriteria: passFailCriteria || {},
      customRules: customRules || {},
      // Include additional nested fields for compatibility
      weight_percentage: weight_percentage,
      difficulty_weights: scoring_rules?.difficulty_weights,
      question_types: scoring_rules?.question_types
    };

    const result = await AdminConfigurationService.setSectionScoring(
      id, 
      scoringData, 
      adminId, 
      ipAddress, 
      userAgent
    );

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Set section scoring controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/v1/admin/sections/:id/scoring - Get section scoring
const getSectionScoring = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    const result = await AdminConfigurationService.getSectionScoring(id, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Get section scoring controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// Timeline Management

// PUT /api/v1/admin/sections/:id/time-limit - Set section time limit
const setSectionTimeLimit = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    const {
      timeLimitMinutes,
      warningThresholds,
      autoSubmit,
      gracePeriod,
      timePerQuestion,
      flexibleTiming
    } = req.body;

    // Basic validation
    if (!timeLimitMinutes || timeLimitMinutes < 1) {
      return res.status(400).json({
        success: false,
        message: 'Valid time limit in minutes is required',
        data: null
      });
    }

    const timingData = {
      timeLimitMinutes: timeLimitMinutes,
      warningThresholds: warningThresholds || [75, 90],
      autoSubmit: autoSubmit !== undefined ? autoSubmit : true,
      gracePeriod: gracePeriod || 30,
      timePerQuestion: timePerQuestion,
      flexibleTiming: flexibleTiming || false
    };

    const result = await AdminConfigurationService.setSectionTimeLimit(
      id, 
      timingData, 
      adminId, 
      ipAddress, 
      userAgent
    );

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Set section time limit controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/v1/admin/sections/:id/time-settings - Get section time settings
const getSectionTimeSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    const result = await AdminConfigurationService.getSectionTimeSettings(id, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Get section time settings controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/tests/:id/overall-timing - Set overall test timing
const setOverallTestTiming = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format',
        data: null
      });
    }

    const {
      durationMinutes,
      timingMode,
      breakConfig,
      overtimePolicy,
      sectionTransitions,
      globalSettings
    } = req.body;

    // Basic validation
    if (!durationMinutes || durationMinutes < 5) {
      return res.status(400).json({
        success: false,
        message: 'Valid duration in minutes is required (minimum 5 minutes)',
        data: null
      });
    }

    const timingData = {
      durationMinutes: durationMinutes,
      timingMode: timingMode || 'STRICT',
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
      globalSettings: globalSettings || {}
    };

    const result = await AdminConfigurationService.setOverallTestTiming(
      id, 
      timingData, 
      adminId, 
      ipAddress, 
      userAgent
    );

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Set overall test timing controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

module.exports = {
  getAllAnswerPatterns,
  createAnswerPattern,
  updateAnswerPattern,
  deleteAnswerPattern,
  configureSection,
  getSectionConfiguration,
  updateSectionConfiguration,
  setSectionScoring,
  getSectionScoring,
  setSectionTimeLimit,
  getSectionTimeSettings,
  setOverallTestTiming
};