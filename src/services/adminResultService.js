const TestResultModel = require('../models/TestResult');
const TestModel = require('../models/Test');
const { generateResponse } = require('../utils/helpers');
const fs = require('fs').promises;
const path = require('path');

// Get all test results for admin with filters and pagination
const getAllTestResults = async (filters = {}, adminId) => {
  try {
    const results = await TestResultModel.getAllTestResults(filters);

    // Calculate total count for pagination
    const totalCountFilters = { ...filters };
    delete totalCountFilters.limit;
    delete totalCountFilters.offset;

    const allResults = await TestResultModel.getAllTestResults(totalCountFilters);
    const totalCount = allResults.length;

    const responseData = {
      results,
      pagination: {
        total: totalCount,
        page: Math.floor(filters.offset / filters.limit) + 1,
        limit: filters.limit,
        totalPages: Math.ceil(totalCount / filters.limit)
      },
      filters: filters,
      adminId: adminId
    };

    return generateResponse(true, 'Test results retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get all test results service error:', error);
    return generateResponse(false, 'Failed to retrieve test results', null, 500);
  }
};

// Get results for a specific test
const getResultsByTestId = async (testId, adminId) => {
  try {
    // First verify the test exists
    const test = await TestModel.getTestForAdmin ? await TestModel.getTestForAdmin(testId) : null;
    if (!test && TestModel.getOne) {
      const testQuery = `SELECT * FROM tests WHERE id = $1`;
      const testResult = await TestModel.getOne(testQuery, [testId]);
      if (!testResult) {
        return generateResponse(false, 'Test not found', null, 404);
      }
    }

    const results = await TestResultModel.getResultsByTestId(testId);

    const responseData = {
      results,
      testId: testId,
      totalCount: results.length,
      adminId: adminId
    };

    return generateResponse(true, 'Test results retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get results by test ID service error:', error);
    return generateResponse(false, 'Failed to retrieve test results', null, 500);
  }
};

// Get single test result by ID
const getTestResultById = async (id, adminId) => {
  try {
    const result = await TestResultModel.getTestResultById(id);

    if (!result) {
      return generateResponse(false, 'Test result not found', null, 404);
    }

    const responseData = {
      result,
      adminId: adminId
    };

    return generateResponse(true, 'Test result retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get test result by ID service error:', error);
    return generateResponse(false, 'Failed to retrieve test result', null, 500);
  }
};

// Create new test result
const createTestResult = async (resultData, adminId) => {
  try {
    // Validate that the test exists
    const testQuery = `SELECT id, title FROM tests WHERE id = $1`;
    const testExists = await TestResultModel.getOne ?
      await TestResultModel.getOne(testQuery, [resultData.test_id]) :
      true; // Fallback for testing

    if (!testExists && TestResultModel.getOne) {
      return generateResponse(false, 'Test not found', null, 404);
    }

    // Check if result code already exists for this test (only check if result_code is provided and not empty)
    if (resultData.result_code && resultData.result_code.trim() !== '') {
      const existingResult = await TestResultModel.getResultByTestAndCode(
        resultData.test_id,
        resultData.result_code
      );

      if (existingResult) {
        // If result exists but is soft-deleted, reactivate it with new data
        if (!existingResult.is_active) {
          const updatedData = {
            ...resultData,
            is_active: true,
            updated_at: new Date()
          };

          const reactivatedResult = await TestResultModel.updateTestResult(existingResult.id, updatedData);

          const responseData = {
            result: reactivatedResult,
            adminId: adminId,
            message: 'Test result reactivated and updated successfully'
          };

          return generateResponse(true, 'Test result reactivated and updated successfully', responseData, 200);
        }

        // If result exists and is active, return conflict
        return generateResponse(false, 'Result code already exists for this test', null, 409);
      }
    }

    // Determine result type based on score_range
    if (!resultData.result_type) {
      resultData.result_type = resultData.score_range ? 'range_based' : 'flag_based';
    }

    const newResult = await TestResultModel.createTestResult(resultData);

    const responseData = {
      result: newResult,
      adminId: adminId,
      message: 'Test result created successfully'
    };

    return generateResponse(true, 'Test result created successfully', responseData, 201);

  } catch (error) {
    console.error('Create test result service error:', error);

    // Handle duplicate constraint errors
    if (error.code === '23505') { // PostgreSQL unique violation
      return generateResponse(false, 'Result code already exists for this test', null, 409);
    }

    return generateResponse(false, 'Failed to create test result', null, 500);
  }
};

// Update test result
const updateTestResult = async (id, updateData, adminId) => {
  try {
    // Check if result exists
    const existingResult = await TestResultModel.getTestResultById(id);
    if (!existingResult) {
      return generateResponse(false, 'Test result not found', null, 404);
    }

    // If updating result_code, check for duplicates within the same test
    if (updateData.result_code && updateData.result_code !== existingResult.result_code) {
      const duplicateResult = await TestResultModel.getResultByTestAndCode(
        existingResult.test_id,
        updateData.result_code
      );

      if (duplicateResult && duplicateResult.id !== id) {
        return generateResponse(false, 'Result code already exists for this test', null, 409);
      }
    }

    // Handle old PDF file cleanup if a new one is uploaded
    if (updateData.pdf_file && existingResult.pdf_file) {
      try {
        const oldFilePath = path.join(process.cwd(), 'uploads', 'results', existingResult.pdf_file);
        await fs.unlink(oldFilePath);
      } catch (fileError) {
        console.warn('Could not delete old PDF file:', fileError);
      }
    }

    // Update result type based on score_range if not explicitly provided
    if (updateData.score_range !== undefined && !updateData.result_type) {
      updateData.result_type = updateData.score_range ? 'range_based' : 'flag_based';
    }

    const updatedResult = await TestResultModel.updateTestResult(id, updateData);

    const responseData = {
      result: updatedResult,
      adminId: adminId,
      message: 'Test result updated successfully'
    };

    return generateResponse(true, 'Test result updated successfully', responseData, 200);

  } catch (error) {
    console.error('Update test result service error:', error);

    // Handle duplicate constraint errors
    if (error.code === '23505') {
      return generateResponse(false, 'Result code already exists for this test', null, 409);
    }

    return generateResponse(false, 'Failed to update test result', null, 500);
  }
};

// Delete test result (soft delete)
const deleteTestResult = async (id, adminId) => {
  try {
    // Check if result exists
    const existingResult = await TestResultModel.getTestResultById(id);
    if (!existingResult) {
      return generateResponse(false, 'Test result not found', null, 404);
    }

    // Check if result is being used by any user results
    const usageQuery = `
      SELECT COUNT(*) as usage_count
      FROM user_test_results
      WHERE result_id = $1
    `;

    let isInUse = false;
    try {
      const usageResult = await TestResultModel.getOne ?
        await TestResultModel.getOne(usageQuery, [id]) : null;

      if (usageResult && usageResult.usage_count > 0) {
        isInUse = true;
      }
    } catch (usageError) {
      console.warn('Could not check result usage:', usageError);
    }

    if (isInUse) {
      return generateResponse(
        false,
        'Cannot delete result: it is currently being used by student results',
        null,
        409
      );
    }

    const deletedResult = await TestResultModel.deleteTestResult(id);

    const responseData = {
      result: deletedResult,
      adminId: adminId,
      message: 'Test result deleted successfully'
    };

    return generateResponse(true, 'Test result deleted successfully', responseData, 200);

  } catch (error) {
    console.error('Delete test result service error:', error);
    return generateResponse(false, 'Failed to delete test result', null, 500);
  }
};

// Get result statistics for a test
const getResultStatistics = async (testId, adminId) => {
  try {
    const statistics = await TestResultModel.getResultStatistics(testId);

    if (!statistics) {
      return generateResponse(false, 'No statistics found for this test', null, 404);
    }

    const responseData = {
      statistics,
      testId: testId,
      adminId: adminId
    };

    return generateResponse(true, 'Result statistics retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get result statistics service error:', error);
    return generateResponse(false, 'Failed to retrieve result statistics', null, 500);
  }
};

// Bulk update results for a test
const bulkUpdateResults = async (testId, updates, adminId) => {
  try {
    // Validate that the test exists
    const testQuery = `SELECT id FROM tests WHERE id = $1`;
    const testExists = await TestResultModel.getOne ?
      await TestResultModel.getOne(testQuery, [testId]) :
      true; // Fallback for testing

    if (!testExists && TestResultModel.getOne) {
      return generateResponse(false, 'Test not found', null, 404);
    }

    const updatedResults = await TestResultModel.bulkUpdateResults(testId, updates);

    const responseData = {
      results: updatedResults,
      updatedCount: updatedResults.length,
      testId: testId,
      adminId: adminId,
      updates: updates
    };

    return generateResponse(true, 'Results updated successfully', responseData, 200);

  } catch (error) {
    console.error('Bulk update results service error:', error);
    return generateResponse(false, 'Failed to update results', null, 500);
  }
};

// Get result by score for automatic assignment
const getResultByScore = async (testId, score) => {
  try {
    const result = await TestResultModel.getResultByScoreRange(testId, score);

    if (!result) {
      return generateResponse(false, 'No matching result found for this score', null, 404);
    }

    // Increment usage count
    await TestResultModel.incrementUsageCount(result.id);

    const responseData = {
      result,
      score: score,
      testId: testId
    };

    return generateResponse(true, 'Result retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get result by score service error:', error);
    return generateResponse(false, 'Failed to retrieve result', null, 500);
  }
};

// Validate result data before creation/update
const validateResultData = (data, isUpdate = false) => {
  const errors = [];

  // Required fields for creation
  if (!isUpdate) {
    if (!data.test_id) errors.push('test_id is required');
    if (!data.result_code) errors.push('result_code is required');
    if (!data.title) errors.push('title is required');
  }

  // Validate result_code format (alphanumeric, underscores, hyphens)
  if (data.result_code && !/^[A-Za-z0-9_-]+$/.test(data.result_code)) {
    errors.push('result_code can only contain letters, numbers, underscores, and hyphens');
  }

  // Validate score_range format if provided
  if (data.score_range) {
    const rangePattern = /^(\d+-\d+|>\d+|<\d+|>=\d+|<=\d+)$/;
    if (!rangePattern.test(data.score_range)) {
      errors.push('score_range must be in format: "80-100", ">90", "<50", ">=75", or "<=25"');
    }
  }

  // Validate result_type
  if (data.result_type) {
    const validTypes = ['range_based', 'flag_based', 'hybrid'];
    if (!validTypes.includes(data.result_type)) {
      errors.push('result_type must be one of: ' + validTypes.join(', '));
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Duplicate result for easy creation
const duplicateResult = async (sourceId, newResultCode, adminId) => {
  try {
    const sourceResult = await TestResultModel.getTestResultById(sourceId);

    if (!sourceResult) {
      return generateResponse(false, 'Source result not found', null, 404);
    }

    // Create new result data
    const newResultData = {
      test_id: sourceResult.test_id,
      result_code: newResultCode,
      score_range: sourceResult.score_range,
      title: `${sourceResult.title} (Copy)`,
      description: sourceResult.description,
      result_type: sourceResult.result_type
      // Note: PDF file is not duplicated
    };

    return await createTestResult(newResultData, adminId);

  } catch (error) {
    console.error('Duplicate result service error:', error);
    return generateResponse(false, 'Failed to duplicate result', null, 500);
  }
};

module.exports = {
  getAllTestResults,
  getResultsByTestId,
  getTestResultById,
  createTestResult,
  updateTestResult,
  deleteTestResult,
  getResultStatistics,
  bulkUpdateResults,
  getResultByScore,
  validateResultData,
  duplicateResult
};