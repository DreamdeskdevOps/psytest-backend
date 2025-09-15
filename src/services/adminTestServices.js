const TestModel = require('../models/Test');
const { generateResponse } = require('../utils/helpers');
const { validateTestData } = require('../utils/validation');

// Get all tests for admin with filters and pagination
const getAllTests = async (filters = {}, adminId) => {
  try {
    const tests = await TestModel.getAllTestsForAdmin(filters);
    
    const responseData = {
      tests,
      totalCount: tests.length,
      filters: filters,
      adminId: adminId
    };

    return generateResponse(true, 'Tests retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get all tests service error:', error);
    return generateResponse(false, 'Failed to retrieve tests', null, 500);
  }
};

// Get single test with complete details for admin editing
const getTestDetails = async (testId, adminId) => {
  try {
    const test = await TestModel.getTestForAdmin(testId);
    
    if (!test) {
      return generateResponse(false, 'Test not found', null, 404);
    }

    // Parse JSON fields for frontend and format settings object
    const testData = {
      ...test,
      settings: {
        showProgressBar: test.show_results || false,
        allowBackNavigation: true,
        shuffleQuestions: test.randomize_questions || false,
        showCorrectAnswers: test.show_correct_answers || false
      },
      sections: test.sections || [],
      tags: test.tags && typeof test.tags === 'string' ? JSON.parse(test.tags) : (test.tags || []),
      premium_features: test.premium_features && typeof test.premium_features === 'string' ? JSON.parse(test.premium_features) : (test.premium_features || [])
    };

    return generateResponse(true, 'Test details retrieved successfully', testData, 200);

  } catch (error) {
    console.error('Get test details service error:', error);
    return generateResponse(false, 'Failed to retrieve test details', null, 500);
  }
};

// Create new customizable test
const createTest = async (testData, adminId, ipAddress, userAgent) => {
  try {
    // Validate test data
    const validation = validateTestData(testData);
    if (!validation.isValid) {
      return generateResponse(false, validation.message, null, 400);
    }

    // Business logic validations
    if (!testData.isFree && (!testData.price || testData.price <= 0)) {
      return generateResponse(false, 'Price is required for paid tests', null, 400);
    }

    if (testData.durationMinutes && testData.durationMinutes < 5) {
      return generateResponse(false, 'Test duration must be at least 5 minutes', null, 400);
    }

    // Create the test
    const newTest = await TestModel.createCustomTest(testData, adminId);


    const responseData = {
      ...newTest,
      settings: {
        showProgressBar: newTest.show_results || false,
        allowBackNavigation: true,
        shuffleQuestions: newTest.randomize_questions || false,
        showCorrectAnswers: newTest.show_correct_answers || false
      },
      tags: newTest.tags ? JSON.parse(newTest.tags) : [],
      premium_features: newTest.premium_features ? JSON.parse(newTest.premium_features) : []
    };

    return generateResponse(true, 'Test created successfully', responseData, 201);

  } catch (error) {
    console.error('Create test service error:', error);
    return generateResponse(false, 'Failed to create test', null, 500);
  }
};

// Update test configuration
const updateTest = async (testId, updateData, adminId, ipAddress, userAgent) => {
  try {
    // Check if test exists
    const existingTest = await TestModel.getTestForAdmin(testId);
    if (!existingTest) {
      return generateResponse(false, 'Test not found', null, 404);
    }

    // Validate update data
    if (updateData.title && updateData.title.trim().length < 3) {
      return generateResponse(false, 'Test title must be at least 3 characters', null, 400);
    }

    if (!updateData.isFree && updateData.price && updateData.price <= 0) {
      return generateResponse(false, 'Price must be greater than 0 for paid tests', null, 400);
    }

    // Business rule: Can't change pricing if test has paid attempts
    if (existingTest.paid_attempts > 0 && updateData.isFree !== undefined) {
      return generateResponse(
        false, 
        'Cannot change pricing model for tests with existing paid attempts', 
        null, 
        400
      );
    }

    // Update the test
    const updatedTest = await TestModel.updateTestConfig(testId, updateData, adminId);

    // Log admin activity
    // await TestModel.logAdminActivity(adminId, 'TEST_UPDATE', {
    //   testId: testId,
    //   changes: Object.keys(updateData),
    //   ipAddress,
    //   userAgent
    // });

    const responseData = {
      ...updatedTest,
      settings: updatedTest.settings ? JSON.parse(updatedTest.settings) : {}
    };

    return generateResponse(true, 'Test updated successfully', responseData, 200);

  } catch (error) {
    console.error('Update test service error:', error);
    return generateResponse(false, 'Failed to update test', null, 500);
  }
};

// Delete test (soft delete with business rules)
const deleteTest = async (testId, adminId, ipAddress, userAgent) => {
  try {
    const existingTest = await TestModel.getTestForAdmin(testId);
    if (!existingTest) {
      return generateResponse(false, 'Test not found', null, 404);
    }

    // Business rule: Confirm with admin if test has attempts
    if (existingTest.total_attempts > 0) {
      // This should be handled by frontend confirmation
      // For now, we'll allow deletion but preserve all attempt data
    }

    const result = await TestModel.adminDeleteTest(testId, adminId);

    // Log admin activity
    // await TestModel.logAdminActivity(adminId, 'TEST_DELETE', {
    //   testId: testId,
    //   testTitle: existingTest.title,
    //   attemptCount: result.attempt_count,
    //   ipAddress,
    //   userAgent
    // });

    return generateResponse(
      true, 
      `Test deleted successfully. ${result.attempt_count} user attempts preserved.`, 
      result, 
      200
    );

  } catch (error) {
    console.error('Delete test service error:', error);
    return generateResponse(false, 'Failed to delete test', null, 500);
  }
};

// Duplicate test with all sections
const duplicateTest = async (originalId, newTitle, adminId, ipAddress, userAgent) => {
  try {
    const originalTest = await TestModel.getTestForAdmin(originalId);
    if (!originalTest) {
      return generateResponse(false, 'Original test not found', null, 404);
    }

    // Validate new title
    if (!newTitle || newTitle.trim().length < 3) {
      newTitle = `${originalTest.title} (Copy)`;
    }

    // Generate unique title with timestamp if needed
    newTitle = `${newTitle} (${Date.now()})`;

    const duplicatedTest = await TestModel.adminDuplicateTest(originalId, newTitle, adminId);

    // Log admin activity
    // await TestModel.logAdminActivity(adminId, 'TEST_DUPLICATE', {
    //   originalId: originalId,
    //   newTestId: duplicatedTest.id,
    //   newTitle: newTitle,
    //   ipAddress,
    //   userAgent
    // });

    return generateResponse(
      true,
      'Test duplicated successfully',
      {
        ...duplicatedTest,
        settings: {
          showProgressBar: duplicatedTest.show_results || false,
          allowBackNavigation: true,
          shuffleQuestions: duplicatedTest.randomize_questions || false,
          showCorrectAnswers: duplicatedTest.show_correct_answers || false
        },
        tags: duplicatedTest.tags && typeof duplicatedTest.tags === 'string' ? JSON.parse(duplicatedTest.tags) : (duplicatedTest.tags || []),
        premium_features: duplicatedTest.premium_features && typeof duplicatedTest.premium_features === 'string' ? JSON.parse(duplicatedTest.premium_features) : (duplicatedTest.premium_features || [])
      },
      201
    );

  } catch (error) {
    console.error('Duplicate test service error:', error);
    return generateResponse(false, 'Failed to duplicate test', null, 500);
  }
};

// Toggle test status (activate/deactivate)
const toggleTestStatus = async (testId, adminId, ipAddress, userAgent) => {
  try {
    const result = await TestModel.adminToggleStatus(testId, adminId);

    // Log admin activity
    // await TestModel.logAdminActivity(adminId, 'TEST_STATUS_TOGGLE', {
    //   testId: testId,
    //   newStatus: result.is_active ? 'ACTIVE' : 'INACTIVE',
    //   sectionsCount: result.total_sections,
    //   ipAddress,
    //   userAgent
    // });

    const message = result.is_active 
      ? 'Test activated successfully' 
      : 'Test deactivated successfully';

    return generateResponse(true, message, result, 200);

  } catch (error) {
    if (error.message.includes('Cannot activate test without sections')) {
      return generateResponse(false, error.message, null, 400);
    }
    
    console.error('Toggle test status service error:', error);
    return generateResponse(false, 'Failed to toggle test status', null, 500);
  }
};

// Get test preview (full test structure for preview)
const getTestPreview = async (testId, adminId) => {
  try {
    const test = await TestModel.getTestForAdmin(testId);
    if (!test) {
      return generateResponse(false, 'Test not found', null, 404);
    }

    // Format for preview
    const previewData = {
      test: {
        id: test.id,
        title: test.title,
        description: test.description,
        instructions: test.instructions,
        duration_minutes: test.total_duration,
        total_questions: test.total_questions,
        total_sections: test.total_sections,
        passing_score: test.passing_score
      },
      sections: test.sections.map(section => ({
        id: section.id,
        name: section.section_name,
        order: section.section_order,
        questionCount: section.question_count,
        answerPattern: section.answer_pattern,
        optionsCount: section.answer_options,
        scoringLogic: section.scoring_logic,
        maxScore: section.max_score,
        timeLimit: section.time_limit_minutes,
        instructions: section.instructions
      })),
      previewMode: true,
      previewedBy: adminId,
      previewedAt: new Date().toISOString()
    };

    return generateResponse(true, 'Test preview generated successfully', previewData, 200);

  } catch (error) {
    console.error('Get test preview service error:', error);
    return generateResponse(false, 'Failed to generate test preview', null, 500);
  }
};

// Bulk operations on multiple tests
const bulkOperations = async (operation, testIds, operationData, adminId, ipAddress, userAgent) => {
  try {
    if (!Array.isArray(testIds) || testIds.length === 0) {
      return generateResponse(false, 'Test IDs array is required', null, 400);
    }

    const results = [];
    const errors = [];

    for (const testId of testIds) {
      try {
        let result;
        
        switch (operation) {
          case 'activate':
            result = await TestModel.adminActivateTest(testId, adminId);
            break;

          case 'deactivate':
            result = await TestModel.adminDeactivateTest(testId, adminId);
            break;
            
          case 'delete':
            const { getOne: deleteGetOne } = require('../config/database');
            result = await deleteGetOne(
              'DELETE FROM tests WHERE id = $1 RETURNING id, title',
              [testId]
            );
            break;
            
          case 'update_test_type':
            const { getOne } = require('../config/database');
            result = await getOne(
              'UPDATE tests SET test_type = $1 WHERE id = $2 RETURNING id, title, test_type, is_active',
              [operationData.testType, testId]
            );
            break;
            
          default:
            errors.push({ testId, error: 'Invalid operation' });
            continue;
        }
        
        results.push({ testId, success: true, data: result });
        
      } catch (error) {
        errors.push({ testId, error: error.message });
      }
    }

    // Log bulk operation
    // await logAdminActivity(adminId, 'BULK_OPERATION', {
    //   operation: operation,
    //   testIds: testIds,
    //   successCount: results.length,
    //   errorCount: errors.length,
    //   ipAddress,
    //   userAgent
    // });

    return generateResponse(
      true, 
      `Bulk operation completed. ${results.length} successful, ${errors.length} failed.`, 
      { results, errors }, 
      200
    );

  } catch (error) {
    console.error('Bulk operations service error:', error);
    return generateResponse(false, 'Failed to perform bulk operations', null, 500);
  }
};

// Get test analytics for admin dashboard
const getTestAnalytics = async (testId, adminId) => {
  try {
    const analytics = await TestModel.getAdminTestAnalytics(testId);
    if (!analytics) {
      return generateResponse(false, 'Test not found', null, 404);
    }

    return generateResponse(true, 'Test analytics retrieved successfully', analytics, 200);

  } catch (error) {
    console.error('Get test analytics service error:', error);
    return generateResponse(false, 'Failed to retrieve test analytics', null, 500);
  }
};

// Reorder test sections
const reorderSections = async (testId, sectionOrders, adminId, ipAddress, userAgent) => {
  try {
    if (!Array.isArray(sectionOrders) || sectionOrders.length === 0) {
      return generateResponse(false, 'Section orders array is required', null, 400);
    }

    const result = await TestModel.reorderTestSections(testId, sectionOrders, adminId);

    return generateResponse(true, 'Sections reordered successfully', result, 200);

  } catch (error) {
    console.error('Reorder sections service error:', error);
    return generateResponse(false, 'Failed to reorder sections', null, 500);
  }
};

module.exports = {
  getAllTests,
  getTestDetails,
  createTest,
  updateTest,
  deleteTest,
  duplicateTest,
  toggleTestStatus,
  getTestPreview,
  bulkOperations,
  getTestAnalytics,
  reorderSections
};