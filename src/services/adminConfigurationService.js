const ConfigurationModel = require('../models/Configuration');
const SectionModel = require('../models/Section');
const TestModel = require('../models/Test');
const { generateResponse } = require('../utils/helpers');
const { validateConfigurationData } = require('../utils/validation');

// Helper function to log admin activity
const logAdminActivity = async (adminId, actionType, actionData) => {
  const { insertOne } = require('../config/database');
  
  try {
    await insertOne(
      `INSERT INTO admin_activity_logs (admin_id, action_type, action_description, action_data, created_at) 
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [
        adminId, 
        actionType, 
        JSON.stringify(actionData),
        JSON.stringify(actionData)
      ]
    );
  } catch (error) {
    console.error('Failed to log admin activity:', error);
  }
};

// Answer Patterns Management

// Get all available answer patterns
const getAllAnswerPatterns = async (adminId) => {
  try {
    const patterns = await ConfigurationModel.getAllAnswerPatterns();
    
    // Categorize patterns
    const categorizedPatterns = {
      builtIn: patterns.filter(p => p.pattern_type === 'BUILT_IN'),
      custom: patterns.filter(p => p.pattern_type === 'CUSTOM'),
      totalCount: patterns.length
    };

    return generateResponse(true, 'Answer patterns retrieved successfully', categorizedPatterns, 200);

  } catch (error) {
    console.error('Get answer patterns service error:', error);
    return generateResponse(false, 'Failed to retrieve answer patterns', null, 500);
  }
};

// Create custom answer pattern
const createAnswerPattern = async (patternData, adminId, ipAddress, userAgent) => {
  try {
    // Validate pattern data
    const validation = validateConfigurationData(patternData);
    if (!validation.isValid) {
      return generateResponse(false, validation.message, null, 400);
    }

    // Business rule: Check pattern name uniqueness
    const allPatterns = await ConfigurationModel.getAllAnswerPatterns();
    const nameExists = allPatterns.some(
      pattern => pattern.pattern_name && pattern.pattern_name.toLowerCase() === patternData.patternName.toLowerCase()
    );
    
    if (nameExists) {
      return generateResponse(false, 'Pattern name already exists', null, 400);
    }

    // Validate configuration structure
    const configValidation = validatePatternConfiguration(patternData.configuration, patternData.patternName);
    if (!configValidation.isValid) {
      return generateResponse(false, configValidation.message, null, 400);
    }

    const newPattern = await ConfigurationModel.createAnswerPattern(patternData, adminId);

    // Log admin activity
    await logAdminActivity(adminId, 'PATTERN_CREATE', {
      patternId: newPattern.id,
      patternName: newPattern.pattern_name,
      displayName: newPattern.display_name,
      ipAddress,
      userAgent
    });

    const responseData = {
      ...newPattern,
      configuration: newPattern.configuration ?
        (typeof newPattern.configuration === 'string' ? JSON.parse(newPattern.configuration) : newPattern.configuration)
        : patternData.configuration,
      use_cases: newPattern.use_cases ?
        (typeof newPattern.use_cases === 'string' ? JSON.parse(newPattern.use_cases) : newPattern.use_cases)
        : patternData.useCases || []
    };

    return generateResponse(true, 'Custom answer pattern created successfully', responseData, 201);

  } catch (error) {
    console.error('Create answer pattern service error:', error);
    return generateResponse(false, 'Failed to create answer pattern', null, 500);
  }
};

// Update custom answer pattern
const updateAnswerPattern = async (patternId, updateData, adminId, ipAddress, userAgent) => {
  try {
    // Verify pattern exists and is custom
    const existingPattern = await ConfigurationModel.getAnswerPatternById(patternId);
    if (!existingPattern) {
      return generateResponse(false, 'Answer pattern not found', null, 404);
    }

    if (existingPattern.pattern_type === 'BUILT_IN') {
      return generateResponse(false, 'Cannot modify built-in answer patterns', null, 400);
    }

    // Validate update data
    if (updateData.configuration) {
      const configValidation = validatePatternConfiguration(
        updateData.configuration, 
        existingPattern.pattern_name
      );
      if (!configValidation.isValid) {
        return generateResponse(false, configValidation.message, null, 400);
      }
    }

    // Business rule: Check if pattern is in use before major changes
    if (updateData.configuration) {
      const usageCount = existingPattern.usage_count || 0;
      if (usageCount > 0) {
        return generateResponse(
          false, 
          `Cannot modify pattern configuration. It is being used by ${usageCount} sections. Create a new pattern instead.`, 
          null, 
          400
        );
      }
    }

    const updatedPattern = await ConfigurationModel.updateAnswerPattern(patternId, updateData, adminId);

    // Log admin activity
    await logAdminActivity(adminId, 'PATTERN_UPDATE', {
      patternId: patternId,
      patternName: existingPattern.pattern_name,
      changes: Object.keys(updateData),
      ipAddress,
      userAgent
    });

    const responseData = {
      ...updatedPattern,
      configuration: updatedPattern.configuration ?
        (typeof updatedPattern.configuration === 'string' ? JSON.parse(updatedPattern.configuration) : updatedPattern.configuration)
        : {},
      use_cases: updatedPattern.use_cases ?
        (typeof updatedPattern.use_cases === 'string' ? JSON.parse(updatedPattern.use_cases) : updatedPattern.use_cases)
        : []
    };

    return generateResponse(true, 'Answer pattern updated successfully', responseData, 200);

  } catch (error) {
    console.error('Update answer pattern service error:', error);
    return generateResponse(false, 'Failed to update answer pattern', null, 500);
  }
};

// Delete custom answer pattern
const deleteAnswerPattern = async (patternId, adminId, ipAddress, userAgent) => {
  try {
    const existingPattern = await ConfigurationModel.getAnswerPatternById(patternId);
    if (!existingPattern) {
      return generateResponse(false, 'Answer pattern not found', null, 404);
    }

    if (existingPattern.pattern_type === 'BUILT_IN') {
      return generateResponse(false, 'Cannot delete built-in answer patterns', null, 400);
    }

    const result = await ConfigurationModel.deleteAnswerPattern(patternId, adminId);

    // Log admin activity
    await logAdminActivity(adminId, 'PATTERN_DELETE', {
      patternId: patternId,
      patternName: existingPattern.pattern_name,
      displayName: existingPattern.display_name,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Custom answer pattern deleted successfully', result, 200);

  } catch (error) {
    if (error.message.includes('Cannot delete pattern')) {
      return generateResponse(false, error.message, null, 400);
    }
    
    console.error('Delete answer pattern service error:', error);
    return generateResponse(false, 'Failed to delete answer pattern', null, 500);
  }
};

// Section Configuration Management

// Configure section comprehensively
const configureSection = async (sectionId, configData, adminId, ipAddress, userAgent) => {
  try {
    // Verify section exists
    const section = await SectionModel.getSectionById(sectionId);
    if (!section) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    // Validate configuration data
    const validation = validateSectionConfigurationData(configData);
    if (!validation.isValid) {
      return generateResponse(false, validation.message, null, 400);
    }

    // Business rules validation
    const businessValidation = await validateSectionConfigurationRules(sectionId, configData);
    if (!businessValidation.isValid) {
      return generateResponse(false, businessValidation.message, null, 400);
    }

    const result = await ConfigurationModel.configureSectionAdvanced(sectionId, configData, adminId);

    // Log admin activity
    await logAdminActivity(adminId, 'SECTION_CONFIGURE', {
      sectionId: sectionId,
      testId: section.test_id,
      sectionName: section.section_name,
      configurationType: 'ADVANCED',
      configurationAreas: Object.keys(configData),
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Section configured successfully', result, 200);

  } catch (error) {
    console.error('Configure section service error:', error);
    return generateResponse(false, 'Failed to configure section', null, 500);
  }
};

// Get section configuration
const getSectionConfiguration = async (sectionId, adminId) => {
  try {
    const section = await SectionModel.getSectionById(sectionId);
    if (!section) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    const configuration = await ConfigurationModel.getSectionConfiguration(sectionId);
    
    if (!configuration) {
      // Return default configuration if none exists
      const defaultConfig = {
        section_id: sectionId,
        section_name: section.section_name,
        answer_options_config: {},
        timing_config: {},
        scoring_config: {},
        display_config: {},
        validation_rules: {},
        custom_settings: {},
        has_configuration: false
      };
      
      return generateResponse(true, 'Default section configuration retrieved', defaultConfig, 200);
    }

    const responseData = {
      ...configuration,
      has_configuration: true
    };

    return generateResponse(true, 'Section configuration retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get section configuration service error:', error);
    return generateResponse(false, 'Failed to retrieve section configuration', null, 500);
  }
};

// Update section configuration
const updateSectionConfiguration = async (sectionId, configData, adminId, ipAddress, userAgent) => {
  try {
    const section = await SectionModel.getSectionById(sectionId);
    if (!section) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    // Validate update data
    const validation = validateSectionConfigurationData(configData, false);
    if (!validation.isValid) {
      return generateResponse(false, validation.message, null, 400);
    }

    const result = await ConfigurationModel.updateSectionConfiguration(sectionId, configData, adminId);

    // Log admin activity
    await logAdminActivity(adminId, 'SECTION_CONFIG_UPDATE', {
      sectionId: sectionId,
      testId: section.test_id,
      sectionName: section.section_name,
      updatedAreas: Object.keys(configData),
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Section configuration updated successfully', result, 200);

  } catch (error) {
    console.error('Update section configuration service error:', error);
    return generateResponse(false, 'Failed to update section configuration', null, 500);
  }
};

// Set section scoring rules
const setSectionScoring = async (sectionId, scoringData, adminId, ipAddress, userAgent) => {
  try {
    const section = await SectionModel.getSectionById(sectionId);
    if (!section) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    // Validate scoring data
    const validation = validateScoringRulesData(scoringData);
    if (!validation.isValid) {
      return generateResponse(false, validation.message, null, 400);
    }

    // Business rule: Validate scoring method compatibility with answer pattern
    const compatibilityCheck = validateScoringCompatibility(section.answer_pattern, scoringData.scoringMethod);
    if (!compatibilityCheck.isValid) {
      return generateResponse(false, compatibilityCheck.message, null, 400);
    }

    const result = await ConfigurationModel.setSectionScoringRules(sectionId, scoringData, adminId);

    // Log admin activity
    await logAdminActivity(adminId, 'SECTION_SCORING_SET', {
      sectionId: sectionId,
      testId: section.test_id,
      sectionName: section.section_name,
      scoringMethod: scoringData.scoringMethod,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Section scoring rules set successfully', result, 200);

  } catch (error) {
    console.error('Set section scoring service error:', error);
    return generateResponse(false, 'Failed to set section scoring rules', null, 500);
  }
};

// Get section scoring rules
const getSectionScoring = async (sectionId, adminId) => {
  try {
    const section = await SectionModel.getSectionById(sectionId);
    if (!section) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    const scoringRules = await ConfigurationModel.getSectionScoringRules(sectionId);
    
    if (!scoringRules) {
      // Return default scoring based on answer pattern
      const defaultScoring = getDefaultScoringForPattern(section.answer_pattern);
      const responseData = {
        section_id: sectionId,
        section_name: section.section_name,
        answer_pattern: section.answer_pattern,
        has_custom_scoring: false,
        default_scoring: defaultScoring,
        ...defaultScoring
      };
      
      return generateResponse(true, 'Default section scoring retrieved', responseData, 200);
    }

    const responseData = {
      ...scoringRules,
      has_custom_scoring: true
    };

    return generateResponse(true, 'Section scoring rules retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get section scoring service error:', error);
    return generateResponse(false, 'Failed to retrieve section scoring rules', null, 500);
  }
};

// Timeline Management

// Set section time limit
const setSectionTimeLimit = async (sectionId, timingData, adminId, ipAddress, userAgent) => {
  try {
    const section = await SectionModel.getSectionById(sectionId);
    if (!section) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    // Validate timing data
    const validation = validateTimingData(timingData);
    if (!validation.isValid) {
      return generateResponse(false, validation.message, null, 400);
    }

    // Business rule: Check against test total duration
    if (timingData.timeLimitMinutes) {
      const test = await TestModel.getTestForAdmin(section.test_id);
      if (test.duration_minutes && timingData.timeLimitMinutes > test.duration_minutes) {
        return generateResponse(
          false, 
          `Section time limit (${timingData.timeLimitMinutes} min) cannot exceed test duration (${test.duration_minutes} min)`, 
          null, 
          400
        );
      }
    }

    const result = await ConfigurationModel.setSectionTimeLimit(sectionId, timingData, adminId);

    // Log admin activity
    await logAdminActivity(adminId, 'SECTION_TIMING_SET', {
      sectionId: sectionId,
      testId: section.test_id,
      sectionName: section.section_name,
      timeLimitMinutes: timingData.timeLimitMinutes,
      advancedTiming: Object.keys(timingData).length > 1,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Section time limit set successfully', result, 200);

  } catch (error) {
    console.error('Set section time limit service error:', error);
    return generateResponse(false, 'Failed to set section time limit', null, 500);
  }
};

// Get section time settings
const getSectionTimeSettings = async (sectionId, adminId) => {
  try {
    const timeSettings = await ConfigurationModel.getSectionTimeSettings(sectionId);
    if (!timeSettings) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    return generateResponse(true, 'Section time settings retrieved successfully', timeSettings, 200);

  } catch (error) {
    console.error('Get section time settings service error:', error);
    return generateResponse(false, 'Failed to retrieve section time settings', null, 500);
  }
};

// Set overall test timing
const setOverallTestTiming = async (testId, timingData, adminId, ipAddress, userAgent) => {
  try {
    const test = await TestModel.getTestForAdmin(testId);
    if (!test) {
      return generateResponse(false, 'Test not found', null, 404);
    }

    // Validate timing data
    const validation = validateTestTimingData(timingData);
    if (!validation.isValid) {
      return generateResponse(false, validation.message, null, 400);
    }

    // Business rule: Validate against section time limits
    const sectionsWithTiming = await SectionModel.getSectionsByTestId(testId);
    const totalSectionTime = sectionsWithTiming
      .filter(s => s.time_limit_minutes)
      .reduce((sum, s) => sum + s.time_limit_minutes, 0);

    if (totalSectionTime > 0 && timingData.durationMinutes < totalSectionTime) {
      return generateResponse(
        false, 
        `Test duration (${timingData.durationMinutes} min) cannot be less than total section time limits (${totalSectionTime} min)`, 
        null, 
        400
      );
    }

    const result = await ConfigurationModel.setOverallTestTiming(testId, timingData, adminId);

    // Log admin activity
    await logAdminActivity(adminId, 'TEST_TIMING_SET', {
      testId: testId,
      testTitle: test.title,
      durationMinutes: timingData.durationMinutes,
      timingMode: timingData.timingMode,
      advancedFeatures: Object.keys(timingData).length > 2,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Overall test timing set successfully', result, 200);

  } catch (error) {
    console.error('Set overall test timing service error:', error);
    return generateResponse(false, 'Failed to set overall test timing', null, 500);
  }
};

// Helper functions for validation

const validatePatternConfiguration = (configuration, patternName) => {
  // Pattern-specific configuration validation
  switch (patternName.toUpperCase()) {
    case 'LIKERT_SCALE':
      if (!configuration.scalePoints || configuration.scalePoints < 3 || configuration.scalePoints > 10) {
        return { isValid: false, message: 'Likert scale must have between 3 and 10 scale points' };
      }
      break;
    case 'MULTIPLE_CHOICE':
      if (!configuration.minOptions || !configuration.maxOptions) {
        return { isValid: false, message: 'Multiple choice pattern must specify min and max options' };
      }
      if (configuration.minOptions < 2 || configuration.maxOptions > 10) {
        return { isValid: false, message: 'Multiple choice must have between 2 and 10 options' };
      }
      break;
    case 'ODD_EVEN':
      if (!configuration.categories || !Array.isArray(configuration.categories) || configuration.categories.length !== 2) {
        return { isValid: false, message: 'Odd/Even pattern must have exactly 2 categories' };
      }
      break;
  }
  return { isValid: true };
};

const validateSectionConfigurationRules = async (sectionId, configData) => {
  // Business rules validation for section configuration
  const { timingConfig, scoringConfig } = configData;
  
  if (timingConfig && timingConfig.timeLimitMinutes) {
    if (timingConfig.timeLimitMinutes < 1 || timingConfig.timeLimitMinutes > 180) {
      return { isValid: false, message: 'Section time limit must be between 1 and 180 minutes' };
    }
  }

  if (scoringConfig && scoringConfig.pointsPerQuestion) {
    if (scoringConfig.pointsPerQuestion < 0 || scoringConfig.pointsPerQuestion > 100) {
      return { isValid: false, message: 'Points per question must be between 0 and 100' };
    }
  }

  return { isValid: true };
};

const validateScoringCompatibility = (answerPattern, scoringMethod) => {
  const compatibilityMap = {
    'MULTIPLE_CHOICE': ['CORRECT_INCORRECT', 'WEIGHTED', 'PARTIAL_CREDIT'],
    'LIKERT_SCALE': ['AVERAGE', 'SUM', 'WEIGHTED'],
    'YES_NO': ['COUNT_YES', 'COUNT_NO', 'BINARY'],
    'TRUE_FALSE': ['CORRECT_INCORRECT', 'WEIGHTED'],
    'ODD_EVEN': ['HIGHER_WINS', 'CATEGORY_SUM', 'BALANCED']
  };

  const allowedMethods = compatibilityMap[answerPattern] || ['STANDARD'];
  
  if (!allowedMethods.includes(scoringMethod)) {
    return { 
      isValid: false, 
      message: `Scoring method '${scoringMethod}' is not compatible with '${answerPattern}' pattern. Allowed methods: ${allowedMethods.join(', ')}` 
    };
  }

  return { isValid: true };
};

const getDefaultScoringForPattern = (answerPattern) => {
  const defaults = {
    'MULTIPLE_CHOICE': {
      scoring_method: 'CORRECT_INCORRECT',
      points_per_question: 1,
      bonus_points: 0,
      penalty_points: 0
    },
    'LIKERT_SCALE': {
      scoring_method: 'AVERAGE',
      points_per_question: 1,
      bonus_points: 0,
      penalty_points: 0
    },
    'YES_NO': {
      scoring_method: 'COUNT_YES',
      points_per_question: 1,
      bonus_points: 0,
      penalty_points: 0
    },
    'TRUE_FALSE': {
      scoring_method: 'CORRECT_INCORRECT',
      points_per_question: 1,
      bonus_points: 0,
      penalty_points: 0
    },
    'ODD_EVEN': {
      scoring_method: 'HIGHER_WINS',
      points_per_question: 1,
      bonus_points: 0,
      penalty_points: 0
    }
  };

  return defaults[answerPattern] || defaults['MULTIPLE_CHOICE'];
};

// Validation helper functions
const validateSectionConfigurationData = (configData, isComplete = true) => {
  // Add specific validation logic here
  return { isValid: true };
};

const validateScoringRulesData = (scoringData) => {
  // Add specific validation logic here
  return { isValid: true };
};

const validateTimingData = (timingData) => {
  // Add specific validation logic here
  return { isValid: true };
};

const validateTestTimingData = (timingData) => {
  // Add specific validation logic here
  return { isValid: true };
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