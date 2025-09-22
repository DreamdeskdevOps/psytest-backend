const SectionModel = require('../models/Section');
const TestModel = require('../models/Test');
const { generateResponse } = require('../utils/helpers');
const { validateSectionData, validateSectionUpdateData } = require('../utils/validation');

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

// Get all sections of a test
const getTestSections = async (testId, adminId) => {
  try {
    // Verify test exists and admin has access
    const test = await TestModel.getTestForAdmin(testId);
    if (!test) {
      return generateResponse(false, 'Test not found', null, 404);
    }

    const sections = await SectionModel.getSectionsByTestId(testId);

    const responseData = {
      testId: testId,
      testTitle: test.title,
      testIsActive: test.is_active,
      totalSections: sections.length,
      sections: sections.map(section => ({
        ...section,
        custom_scoring_config: typeof section.custom_scoring_config === 'string' ?
          JSON.parse(section.custom_scoring_config) : (section.custom_scoring_config || {})
      }))
    };

    return generateResponse(true, 'Test sections retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get test sections service error:', error);
    return generateResponse(false, 'Failed to retrieve test sections', null, 500);
  }
};

// Add new section to test
const createTestSection = async (testId, sectionData, adminId, ipAddress, userAgent) => {
  try {
    // Verify test exists
    const test = await TestModel.getTestForAdmin(testId);
    if (!test) {
      return generateResponse(false, 'Test not found', null, 404);
    }

    // Validate section data
    const validation = validateSectionData(sectionData);
    if (!validation.isValid) {
      return generateResponse(false, validation.message, null, 400);
    }

    // Business rule validations
    const businessRuleErrors = await SectionModel.validateSectionRules(sectionData, testId);
    if (businessRuleErrors.length > 0) {
      return generateResponse(false, businessRuleErrors[0], null, 400);
    }

    // Check section name uniqueness within test
    const existingSections = await SectionModel.getSectionsByTestId(testId);
    const nameExists = existingSections.some(
      section => section.section_name.toLowerCase() === sectionData.sectionName.toLowerCase()
    );
    
    if (nameExists) {
      return generateResponse(false, 'Section name already exists in this test', null, 400);
    }

    // Create section
    const newSection = await SectionModel.createSection(testId, sectionData, adminId);

    // Update test counters
    await SectionModel.updateTestCounters(testId);

    // Log admin activity
    await logAdminActivity(adminId, 'SECTION_CREATE', {
      testId: testId,
      sectionId: newSection.id,
      sectionName: newSection.section_name,
      answerPattern: newSection.answer_pattern,
      ipAddress,
      userAgent
    });

    const responseData = {
      ...newSection,
      custom_scoring_config: typeof newSection.custom_scoring_config === 'string' ?
        JSON.parse(newSection.custom_scoring_config) : (newSection.custom_scoring_config || {})
    };

    return generateResponse(true, 'Section created successfully', responseData, 201);

  } catch (error) {
    console.error('Create test section service error:', error);
    return generateResponse(false, 'Failed to create section', null, 500);
  }
};

// Get section details
const getSectionDetails = async (sectionId, adminId) => {
  try {
    const section = await SectionModel.getSectionById(sectionId);
    if (!section) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    const responseData = {
      ...section,
      custom_scoring_config: typeof section.custom_scoring_config === 'string' ?
        JSON.parse(section.custom_scoring_config) : (section.custom_scoring_config || {}),
      pattern_details: section.pattern_details
    };

    return generateResponse(true, 'Section details retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get section details service error:', error);
    return generateResponse(false, 'Failed to retrieve section details', null, 500);
  }
};

// Update section basic info
const updateSectionInfo = async (sectionId, updateData, adminId, ipAddress, userAgent) => {
  try {
    // Verify section exists
    const existingSection = await SectionModel.getSectionById(sectionId);
    if (!existingSection) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    // Validate update data
    const validation = validateSectionUpdateData(updateData);
    if (!validation.isValid) {
      return generateResponse(false, validation.message, null, 400);
    }

    // Business rule validations
    const businessRuleErrors = await SectionModel.validateSectionRules(updateData, existingSection.test_id);
    if (businessRuleErrors.length > 0) {
      return generateResponse(false, businessRuleErrors[0], null, 400);
    }

    // Check section name uniqueness if name is being changed
    if (updateData.sectionName && 
        updateData.sectionName.toLowerCase() !== existingSection.section_name.toLowerCase()) {
      
      const existingSections = await SectionModel.getSectionsByTestId(existingSection.test_id);
      const nameExists = existingSections.some(
        section => section.id !== sectionId && 
        section.section_name.toLowerCase() === updateData.sectionName.toLowerCase()
      );
      
      if (nameExists) {
        return generateResponse(false, 'Section name already exists in this test', null, 400);
      }
    }

    // Update section
    const updatedSection = await SectionModel.updateSection(sectionId, updateData, adminId);

    // Update test counters if question count changed
    if (updateData.questionCount) {
      await SectionModel.updateTestCounters(existingSection.test_id);
    }

    // Log admin activity
    await logAdminActivity(adminId, 'SECTION_UPDATE', {
      sectionId: sectionId,
      testId: existingSection.test_id,
      changes: Object.keys(updateData),
      ipAddress,
      userAgent
    });

    const responseData = {
      ...updatedSection,
      custom_scoring_config: typeof updatedSection.custom_scoring_config === 'string' ?
        JSON.parse(updatedSection.custom_scoring_config) : (updatedSection.custom_scoring_config || {})
    };

    return generateResponse(true, 'Section updated successfully', responseData, 200);

  } catch (error) {
    console.error('Update section service error:', error);
    return generateResponse(false, 'Failed to update section', null, 500);
  }
};

// Delete section
const deleteSection = async (sectionId, adminId, ipAddress, userAgent) => {
  try {
    const existingSection = await SectionModel.getSectionById(sectionId);
    if (!existingSection) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    // Business rule: Can't delete if it's the only section
    const allSections = await SectionModel.getSectionsByTestId(existingSection.test_id);
    if (allSections.length === 1) {
      return generateResponse(
        false, 
        'Cannot delete the only section. Test must have at least one section.', 
        null, 
        400
      );
    }

    const result = await SectionModel.deleteSection(sectionId, adminId);

    // Update test counters
    await SectionModel.updateTestCounters(existingSection.test_id);

    // Log admin activity
    await logAdminActivity(adminId, 'SECTION_DELETE', {
      sectionId: sectionId,
      testId: existingSection.test_id,
      sectionName: existingSection.section_name,
      questionCount: result.question_count,
      ipAddress,
      userAgent
    });

    return generateResponse(
      true, 
      `Section deleted successfully. ${result.question_count} questions preserved.`, 
      result, 
      200
    );

  } catch (error) {
    console.error('Delete section service error:', error);
    return generateResponse(false, 'Failed to delete section', null, 500);
  }
};

// Duplicate section
const duplicateSection = async (originalSectionId, newSectionName, adminId, ipAddress, userAgent) => {
  try {
    const originalSection = await SectionModel.getSectionById(originalSectionId);
    if (!originalSection) {
      return generateResponse(false, 'Original section not found', null, 404);
    }

    // Validate new section name
    const finalName = newSectionName || `${originalSection.section_name} (Copy)`;
    
    // Check name uniqueness
    const existingSections = await SectionModel.getSectionsByTestId(originalSection.test_id);
    const nameExists = existingSections.some(
      section => section.section_name.toLowerCase() === finalName.toLowerCase()
    );
    
    if (nameExists) {
      const timestampName = `${finalName} (${Date.now()})`;
      return generateResponse(false, `Section name '${finalName}' already exists. Try: '${timestampName}'`, null, 400);
    }

    const duplicatedSection = await SectionModel.duplicateSection(originalSectionId, finalName, adminId);

    // Update test counters
    await SectionModel.updateTestCounters(originalSection.test_id);

    // Log admin activity
    await logAdminActivity(adminId, 'SECTION_DUPLICATE', {
      originalSectionId: originalSectionId,
      newSectionId: duplicatedSection.id,
      testId: originalSection.test_id,
      newSectionName: finalName,
      ipAddress,
      userAgent
    });

    return generateResponse(
      true, 
      'Section duplicated successfully', 
      {
        ...duplicatedSection,
        custom_scoring_config: typeof duplicatedSection.custom_scoring_config === 'string' ?
          JSON.parse(duplicatedSection.custom_scoring_config) : (duplicatedSection.custom_scoring_config || {})
      }, 
      201
    );

  } catch (error) {
    console.error('Duplicate section service error:', error);
    return generateResponse(false, 'Failed to duplicate section', null, 500);
  }
};

// Set section timing
const setSectionTiming = async (sectionId, timeLimitMinutes, adminId, ipAddress, userAgent) => {
  try {
    const existingSection = await SectionModel.getSectionById(sectionId);
    if (!existingSection) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    // Validation
    if (timeLimitMinutes !== null && (timeLimitMinutes < 1 || timeLimitMinutes > 180)) {
      return generateResponse(false, 'Time limit must be between 1 and 180 minutes, or null to remove limit', null, 400);
    }

    // Business rule: Check against test duration
    if (timeLimitMinutes && existingSection.test_total_duration) {
      if (timeLimitMinutes > existingSection.test_total_duration) {
        return generateResponse(
          false, 
          `Section time limit (${timeLimitMinutes} min) cannot exceed test duration (${existingSection.test_total_duration} min)`, 
          null, 
          400
        );
      }
    }

    const result = await SectionModel.updateSectionTiming(sectionId, timeLimitMinutes, adminId);

    // Log admin activity
    await logAdminActivity(adminId, 'SECTION_TIMING_UPDATE', {
      sectionId: sectionId,
      testId: existingSection.test_id,
      newTimeLimit: timeLimitMinutes,
      previousTimeLimit: existingSection.time_limit_minutes,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Section timing updated successfully', result, 200);

  } catch (error) {
    console.error('Set section timing service error:', error);
    return generateResponse(false, 'Failed to update section timing', null, 500);
  }
};

// Get section timing
const getSectionTiming = async (sectionId, adminId) => {
  try {
    const timingData = await SectionModel.getSectionTiming(sectionId);
    if (!timingData) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    return generateResponse(true, 'Section timing retrieved successfully', timingData, 200);

  } catch (error) {
    console.error('Get section timing service error:', error);
    return generateResponse(false, 'Failed to retrieve section timing', null, 500);
  }
};

// Reorder sections
const reorderTestSections = async (testId, sectionOrders, adminId, ipAddress, userAgent) => {
  try {
    // Verify test exists
    const test = await TestModel.getTestForAdmin(testId);
    if (!test) {
      return generateResponse(false, 'Test not found', null, 404);
    }

    // Validation
    if (!Array.isArray(sectionOrders) || sectionOrders.length === 0) {
      return generateResponse(false, 'Section orders array is required', null, 400);
    }

    // Validate all sections belong to the test
    const existingSections = await SectionModel.getSectionsByTestId(testId);
    const existingSectionIds = existingSections.map(s => s.id);
    
    const invalidSections = sectionOrders.filter(order => 
      !existingSectionIds.includes(order.sectionId)
    );
    
    if (invalidSections.length > 0) {
      return generateResponse(false, 'Some sections do not belong to this test', null, 400);
    }

    const result = await SectionModel.reorderSections(testId, sectionOrders, adminId);

    // Log admin activity
    await logAdminActivity(adminId, 'SECTIONS_REORDER', {
      testId: testId,
      sectionOrders: sectionOrders,
      sectionsAffected: result.length,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Sections reordered successfully', result, 200);

  } catch (error) {
    console.error('Reorder sections service error:', error);
    return generateResponse(false, 'Failed to reorder sections', null, 500);
  }
};

// Bulk update sections
const bulkUpdateSections = async (updates, adminId, ipAddress, userAgent) => {
  try {
    if (!Array.isArray(updates) || updates.length === 0) {
      return generateResponse(false, 'Updates array is required', null, 400);
    }

    if (updates.length > 20) {
      return generateResponse(false, 'Cannot update more than 20 sections at once', null, 400);
    }

    // Validate each update
    for (const update of updates) {
      if (!update.sectionId || !update.updateData) {
        return generateResponse(false, 'Each update must have sectionId and updateData', null, 400);
      }
    }

    // Perform bulk update using model
    const { results, errors } = await SectionModel.bulkUpdateSections(updates, adminId);

    // Update test counters for affected tests
    const affectedTests = new Set();
    results.forEach(result => {
      if (result.data && result.data.test_id) {
        affectedTests.add(result.data.test_id);
      }
    });

    // Update counters for each affected test
    for (const testId of affectedTests) {
      await SectionModel.updateTestCounters(testId);
    }

    // Log admin activity
    await logAdminActivity(adminId, 'SECTIONS_BULK_UPDATE', {
      totalUpdates: updates.length,
      successCount: results.length,
      errorCount: errors.length,
      affectedTests: Array.from(affectedTests),
      ipAddress,
      userAgent
    });

    return generateResponse(
      true, 
      `Bulk update completed. ${results.length} successful, ${errors.length} failed.`, 
      { results, errors }, 
      200
    );

  } catch (error) {
    console.error('Bulk update sections service error:', error);
    return generateResponse(false, 'Failed to perform bulk update', null, 500);
  }
};

// Get section answer options
const getSectionOptions = async (sectionId, adminId) => {
  try {
    const section = await SectionModel.getSectionById(sectionId);
    if (!section) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    let options = [];

    // First check if we have section_options stored in custom_scoring_config
    if (section.custom_scoring_config) {
      try {
        const customConfig = typeof section.custom_scoring_config === 'string'
          ? JSON.parse(section.custom_scoring_config)
          : section.custom_scoring_config;

        if (customConfig.section_options && Array.isArray(customConfig.section_options)) {
          options = customConfig.section_options;
          console.log('📋 Found section options in custom_scoring_config:', options);
        }
      } catch (e) {
        console.log('Error parsing custom_scoring_config:', e);
      }
    }

    // If no section options found, try to get from answer template
    if (options.length === 0) {
      const { getOne } = require('../config/database');
      const templateQuery = `
        SELECT pattern_name, display_name, configuration
        FROM answer_patterns
        WHERE pattern_name = $1 OR id = $1
      `;

      try {
        const template = await getOne(templateQuery, [section.answer_pattern]);
        if (template && template.configuration) {
          const config = typeof template.configuration === 'string'
            ? JSON.parse(template.configuration)
            : template.configuration;
          options = config.options || [];
          console.log('📋 Found options from answer template:', options);
        }
      } catch (error) {
        console.log('Template not found, no options available');
      }
    }

    const responseData = {
      sectionId: sectionId,
      sectionName: section.section_name,
      answerPattern: section.answer_pattern,
      options: options,
      totalOptions: options.length
    };

    return generateResponse(true, 'Section options retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get section options service error:', error);
    return generateResponse(false, 'Failed to retrieve section options', null, 500);
  }
};

// Set section answer options
const setSectionOptions = async (sectionId, options, adminId, ipAddress, userAgent) => {
  try {
    const existingSection = await SectionModel.getSectionById(sectionId);
    if (!existingSection) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    // Validate options
    if (!Array.isArray(options) || options.length === 0) {
      return generateResponse(false, 'Options array is required', null, 400);
    }

    if (options.length > 10) {
      return generateResponse(false, 'Maximum 10 options allowed per section', null, 400);
    }

    // Validate each option
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      if (!option.text || typeof option.text !== 'string' || option.text.trim().length === 0) {
        return generateResponse(false, `Option ${i + 1}: Text is required`, null, 400);
      }
      if (option.text.trim().length > 200) {
        return generateResponse(false, `Option ${i + 1}: Text cannot exceed 200 characters`, null, 400);
      }
    }

    // Format options with IDs
    const formattedOptions = options.map((option, index) => ({
      id: option.id || `opt_${Date.now()}_${index}`,
      text: option.text.trim(),
      value: option.value !== undefined ? option.value : index + 1,
      isCorrect: Boolean(option.isCorrect)
    }));

    // Get existing custom_scoring_config and add section_options to it
    let customConfig = {};
    if (existingSection.custom_scoring_config) {
      try {
        customConfig = typeof existingSection.custom_scoring_config === 'string'
          ? JSON.parse(existingSection.custom_scoring_config)
          : existingSection.custom_scoring_config;
      } catch (e) {
        customConfig = {};
      }
    }

    // Add section options to the custom config
    customConfig.section_options = formattedOptions;

    const updateData = {
      customScoringConfig: customConfig,
      answerOptions: formattedOptions.length // Store count in the integer field
    };

    const updatedSection = await SectionModel.updateSection(sectionId, updateData, adminId);

    if (!updatedSection) {
      return generateResponse(false, 'Failed to update section with new options', null, 500);
    }

    // Log admin activity (non-blocking)
    try {
      await logAdminActivity(adminId, 'SECTION_OPTIONS_SET', {
        sectionId: sectionId,
        testId: existingSection.test_id,
        optionsCount: formattedOptions.length,
        options: formattedOptions.map(opt => opt.text),
        ipAddress,
        userAgent
      });
    } catch (logError) {
      console.error('Failed to log admin activity (non-blocking):', logError);
      // Don't fail the main operation if logging fails
    }

    const responseData = {
      sectionId: sectionId,
      sectionName: updatedSection.section_name,
      options: formattedOptions,
      totalOptions: formattedOptions.length,
      message: 'All questions in this section will now use these answer options'
    };

    return generateResponse(true, 'Section answer options updated successfully', responseData, 200);

  } catch (error) {
    console.error('Set section options service error:', error);
    return generateResponse(false, 'Failed to update section options', null, 500);
  }
};

// Add single answer option to section
const addSectionOption = async (sectionId, optionData, adminId, ipAddress, userAgent) => {
  try {
    console.log('🔍 addSectionOption called with:', { sectionId, optionData, adminId });

    // Validate inputs
    if (!sectionId) {
      console.error('❌ Missing sectionId');
      return generateResponse(false, 'Section ID is required', null, 400);
    }

    if (!optionData || !optionData.text) {
      console.error('❌ Missing option data or text');
      return generateResponse(false, 'Option text is required', null, 400);
    }

    if (!adminId) {
      console.error('❌ Missing adminId');
      return generateResponse(false, 'Admin ID is required', null, 400);
    }

    const existingSection = await SectionModel.getSectionById(sectionId);
    if (!existingSection) {
      console.error('❌ Section not found:', sectionId);
      return generateResponse(false, 'Section not found', null, 404);
    }

    console.log('✅ Existing section found:', existingSection.section_name);

    // Get current options
    let currentOptions = [];
    if (existingSection.answer_options) {
      try {
        const parsed = typeof existingSection.answer_options === 'string'
          ? JSON.parse(existingSection.answer_options)
          : existingSection.answer_options;
        currentOptions = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        currentOptions = [];
      }
    }

    console.log('📝 Current options parsed:', currentOptions);

    // Check limit
    if (currentOptions.length >= 10) {
      console.error('❌ Too many options:', currentOptions.length);
      return generateResponse(false, 'Maximum 10 options allowed per section', null, 400);
    }

    // Add new option
    const newOption = {
      id: `opt_${Date.now()}_${currentOptions.length}`,
      text: optionData.text.trim(),
      value: optionData.value !== undefined ? optionData.value : currentOptions.length + 1,
      isCorrect: Boolean(optionData.isCorrect)
    };

    console.log('🆕 New option created:', newOption);

    currentOptions.push(newOption);

    console.log('📋 All options after adding:', currentOptions);

    // Update section - store options in custom_scoring_config for now since answer_options is INTEGER
    const optionsJsonString = JSON.stringify(currentOptions);
    console.log('📄 JSON string to store:', optionsJsonString);

    // Get existing custom_scoring_config and add section_options to it
    let customConfig = {};
    if (existingSection.custom_scoring_config) {
      try {
        customConfig = typeof existingSection.custom_scoring_config === 'string'
          ? JSON.parse(existingSection.custom_scoring_config)
          : existingSection.custom_scoring_config;
      } catch (e) {
        customConfig = {};
      }
    }

    // Add section options to the custom config
    customConfig.section_options = currentOptions;

    const updateData = {
      customScoringConfig: customConfig,
      answerOptions: currentOptions.length // Store count in the integer field
    };

    console.log('💾 Update data prepared:', updateData);

    let updatedSection;
    try {
      updatedSection = await SectionModel.updateSection(sectionId, updateData, adminId);
      console.log('✅ Section updated result:', updatedSection);

      if (!updatedSection) {
        console.error('❌ UpdateSection returned null/undefined');
        return generateResponse(false, 'Database update failed - no result returned', null, 500);
      }
    } catch (dbError) {
      console.error('❌ Database update error:', dbError);
      return generateResponse(false, 'Database update failed: ' + dbError.message, null, 500);
    }

    // Log admin activity (non-blocking)
    try {
      await logAdminActivity(adminId, 'SECTION_OPTION_ADD', {
        sectionId: sectionId,
        testId: existingSection.test_id,
        newOption: newOption,
        totalOptions: currentOptions.length,
        ipAddress,
        userAgent
      });
    } catch (logError) {
      console.error('Failed to log admin activity (non-blocking):', logError);
      // Don't fail the main operation if logging fails
    }

    const responseData = {
      sectionId: sectionId,
      addedOption: newOption,
      totalOptions: currentOptions.length,
      allOptions: currentOptions
    };

    return generateResponse(true, 'Answer option added to section successfully', responseData, 201);

  } catch (error) {
    console.error('❌ Add section option service error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    return generateResponse(false, 'Failed to add section option', null, 500);
  }
};

// Delete answer option from section
const deleteSectionOption = async (sectionId, optionId, adminId, ipAddress, userAgent) => {
  try {
    const existingSection = await SectionModel.getSectionById(sectionId);
    if (!existingSection) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    // Get current options from custom_scoring_config
    let currentOptions = [];
    if (existingSection.custom_scoring_config) {
      try {
        const customConfig = typeof existingSection.custom_scoring_config === 'string'
          ? JSON.parse(existingSection.custom_scoring_config)
          : existingSection.custom_scoring_config;
        currentOptions = Array.isArray(customConfig.section_options) ? customConfig.section_options : [];
      } catch (e) {
        currentOptions = [];
      }
    }

    // Find and remove option
    const optionIndex = currentOptions.findIndex(opt => opt.id === optionId);
    if (optionIndex === -1) {
      return generateResponse(false, 'Option not found', null, 404);
    }

    // Check minimum options
    if (currentOptions.length <= 2) {
      return generateResponse(false, 'Section must have at least 2 answer options', null, 400);
    }

    const deletedOption = currentOptions.splice(optionIndex, 1)[0];

    // Get existing custom_scoring_config and update section_options
    let customConfig = {};
    if (existingSection.custom_scoring_config) {
      try {
        customConfig = typeof existingSection.custom_scoring_config === 'string'
          ? JSON.parse(existingSection.custom_scoring_config)
          : existingSection.custom_scoring_config;
      } catch (e) {
        customConfig = {};
      }
    }

    // Update section options in the custom config
    customConfig.section_options = currentOptions;

    const updateData = {
      customScoringConfig: customConfig,
      answerOptions: currentOptions.length // Store count in the integer field
    };

    const updatedSection = await SectionModel.updateSection(sectionId, updateData, adminId);

    if (!updatedSection) {
      return generateResponse(false, 'Failed to update section after deleting option', null, 500);
    }

    // Log admin activity (non-blocking)
    try {
      await logAdminActivity(adminId, 'SECTION_OPTION_DELETE', {
        sectionId: sectionId,
        testId: existingSection.test_id,
        deletedOption: deletedOption,
        remainingOptions: currentOptions.length,
        ipAddress,
        userAgent
      });
    } catch (logError) {
      console.error('Failed to log admin activity (non-blocking):', logError);
      // Don't fail the main operation if logging fails
    }

    const responseData = {
      sectionId: sectionId,
      deletedOption: deletedOption,
      remainingOptions: currentOptions.length,
      allOptions: currentOptions
    };

    return generateResponse(true, 'Answer option removed from section successfully', responseData, 200);

  } catch (error) {
    console.error('Delete section option service error:', error);
    return generateResponse(false, 'Failed to delete section option', null, 500);
  }
};

module.exports = {
  getTestSections,
  createTestSection,
  getSectionDetails,
  updateSectionInfo,
  deleteSection,
  duplicateSection,
  setSectionTiming,
  getSectionTiming,
  reorderTestSections,
  bulkUpdateSections,
  getSectionOptions,
  setSectionOptions,
  addSectionOption,
  deleteSectionOption
};