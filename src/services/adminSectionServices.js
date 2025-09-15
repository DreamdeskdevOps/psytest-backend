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
  bulkUpdateSections
};