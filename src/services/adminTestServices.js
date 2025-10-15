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
      tags: (() => {
        try {
          return test.tags && typeof test.tags === 'string' ? JSON.parse(test.tags) : (test.tags || []);
        } catch (e) {
          return test.tags || [];
        }
      })(),
      premium_features: (() => {
        try {
          return test.premium_features && typeof test.premium_features === 'string' ? JSON.parse(test.premium_features) : (test.premium_features || []);
        } catch (e) {
          return test.premium_features || [];
        }
      })(),
      description_fields: (() => {
        try {
          return test.description_fields && typeof test.description_fields === 'string' ? JSON.parse(test.description_fields) : (test.description_fields || []);
        } catch (e) {
          return test.description_fields || [];
        }
      })()
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
      tags: (() => {
        try {
          return newTest.tags && newTest.tags.trim() ? JSON.parse(newTest.tags) : [];
        } catch (e) {
          return [];
        }
      })(),
      premium_features: (() => {
        try {
          return newTest.premium_features && newTest.premium_features.trim() ? JSON.parse(newTest.premium_features) : [];
        } catch (e) {
          return [];
        }
      })()
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

    // Handle PDF template assignment - unassign from other tests if assigning a new template
    if (updateData.pdf_template_id !== undefined && updateData.pdf_template_id !== null) {
      const { executeQuery, getMany } = require('../config/database');
      // Remove this template from all other tests
      await executeQuery(
        'UPDATE tests SET pdf_template_id = NULL WHERE pdf_template_id = $1 AND id != $2',
        [updateData.pdf_template_id, testId]
      );
      console.log(`📄 Unassigned template ${updateData.pdf_template_id} from other tests before assigning to test ${testId}`);

      // Check if template changed for this test
      if (existingTest.pdf_template_id !== updateData.pdf_template_id) {
        console.log(`🔄 Template changed from ${existingTest.pdf_template_id} to ${updateData.pdf_template_id}`);
        console.log(`🔄 Will regenerate PDFs for all completed attempts of this test...`);

        // Get all completed attempts for this test
        const completedAttempts = await getMany(`
          SELECT ta.id, ta.user_id, ta.section_scores
          FROM test_attempts ta
          WHERE ta.test_id = $1 AND ta.status = 'completed'
        `, [testId]);

        console.log(`📊 Found ${completedAttempts.length} completed attempts to regenerate`);

        // Regenerate PDFs for all completed attempts
        if (completedAttempts.length > 0) {
          const pdfGenerationService = require('./pdfGenerationService');
          const { getOne } = require('../config/database');

          for (const attempt of completedAttempts) {
            try {
              // Get user details
              const user = await getOne(`
                SELECT first_name, last_name, email FROM users WHERE id = $1
              `, [attempt.user_id]);

              if (!user) continue;

              // Extract result data from section_scores
              const sectionScores = attempt.section_scores || {};
              const studentData = {
                studentName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Student',
                studentEmail: user.email || '',
                resultCode: sectionScores.resultCode || '',
                resultTitle: sectionScores.resultTitle || '',
                resultDescription: sectionScores.resultDescription || ''
              };

              // Regenerate PDF with new template
              await pdfGenerationService.generateStudentPDF(
                testId,
                attempt.user_id,
                attempt.id,
                studentData
              );

              console.log(`✅ Regenerated PDF for attempt ${attempt.id.substring(0, 8)}...`);
            } catch (pdfError) {
              console.error(`⚠️ Failed to regenerate PDF for attempt ${attempt.id}:`, pdfError.message);
            }
          }

          console.log(`🎉 PDF regeneration complete for test ${testId}`);
        }
      }
    }

    // Update the test
    const updatedTest = await TestModel.updateTestConfig(testId, updateData, adminId);

    if (!updatedTest) {
      return generateResponse(false, 'Failed to update test - test not found or update failed', null, 404);
    }

    // Log admin activity
    // await TestModel.logAdminActivity(adminId, 'TEST_UPDATE', {
    //   testId: testId,
    //   changes: Object.keys(updateData),
    //   ipAddress,
    //   userAgent
    // });

    const responseData = {
      ...updatedTest,
      settings: (() => {
        try {
          return updatedTest.settings && updatedTest.settings.trim() ? JSON.parse(updatedTest.settings) : {};
        } catch (e) {
          return {};
        }
      })()
    };

    return generateResponse(true, 'Test updated successfully', responseData, 200);

  } catch (error) {
    console.error('Update test service error:', error);
    console.error('Error details:', error.message);
    return generateResponse(false, `Failed to update test: ${error.message}`, null, 500);
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
        tags: (() => {
          try {
            return duplicatedTest.tags && typeof duplicatedTest.tags === 'string' ? JSON.parse(duplicatedTest.tags) : (duplicatedTest.tags || []);
          } catch (e) {
            return duplicatedTest.tags || [];
          }
        })(),
        premium_features: (() => {
          try {
            return duplicatedTest.premium_features && typeof duplicatedTest.premium_features === 'string' ? JSON.parse(duplicatedTest.premium_features) : (duplicatedTest.premium_features || []);
          } catch (e) {
            return duplicatedTest.premium_features || [];
          }
        })()
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
            const { query: deleteQuery } = require('../config/database');
            const deleteResult = await deleteQuery(
              'DELETE FROM tests WHERE id = $1 RETURNING id, title',
              [testId]
            );
            result = deleteResult.rows[0];
            if (!result) {
              throw new Error('Test not found or already deleted');
            }
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

// Update description fields configuration for a test
const updateDescriptionFields = async (testId, descriptionFields, adminId, ipAddress, userAgent) => {
  try {
    // Get test to verify it exists
    const existingTest = await TestModel.getTestForAdmin(testId);
    if (!existingTest) {
      return generateResponse(false, 'Test not found', null, 404);
    }

    // Validate description fields
    if (!Array.isArray(descriptionFields)) {
      return generateResponse(false, 'Description fields must be an array', null, 400);
    }

    // Update test with new description fields
    const { executeQuery } = require('../config/database');
    await executeQuery(
      'UPDATE tests SET description_fields = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(descriptionFields), testId]
    );

    return generateResponse(
      true,
      'Description fields updated successfully',
      { descriptionFields },
      200
    );

  } catch (error) {
    console.error('Update description fields service error:', error);
    return generateResponse(false, 'Failed to update description fields', null, 500);
  }
};

// Get description fields configuration for a test
const getDescriptionFields = async (testId, adminId) => {
  try {
    const test = await TestModel.getTestForAdmin(testId);
    if (!test) {
      return generateResponse(false, 'Test not found', null, 404);
    }

    // Parse description_fields
    let descriptionFields = [];
    if (test.description_fields) {
      try {
        descriptionFields = typeof test.description_fields === 'string'
          ? JSON.parse(test.description_fields)
          : test.description_fields;
      } catch (e) {
        console.error('Error parsing description_fields:', e);
        descriptionFields = [];
      }
    }

    return generateResponse(
      true,
      'Description fields retrieved successfully',
      { descriptionFields },
      200
    );

  } catch (error) {
    console.error('Get description fields service error:', error);
    return generateResponse(false, 'Failed to retrieve description fields', null, 500);
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
  reorderSections,
  updateDescriptionFields,
  getDescriptionFields
};