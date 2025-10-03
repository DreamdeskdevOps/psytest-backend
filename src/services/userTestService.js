const TestModel = require('../models/Test');
const SectionModel = require('../models/Section');
const QuestionModel = require('../models/Questions');
const { generateResponse } = require('../utils/helpers');

// Get all available tests for users
const getAvailableTests = async (userId) => {
  try {
    // Get all active tests that users can take
    const tests = await TestModel.getAllTests({ isActive: true });

    const availableTests = tests.map(test => ({
      id: test.id,
      title: test.title,
      description: test.description,
      testType: test.test_type,
      totalQuestions: test.total_questions,
      timeLimit: test.total_duration || 30,
      estimatedDuration: test.total_duration,
      difficulty: 'medium',
      instructions: test.instructions,
      isActive: test.is_active,
      createdAt: test.created_at
    }));

    const responseData = {
      tests: availableTests,
      totalTests: availableTests.length,
      userId: userId
    };

    return generateResponse(true, 'Available tests retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get available tests service error:', error);
    return generateResponse(false, 'Failed to retrieve available tests', null, 500);
  }
};

// Get detailed test information
const getTestDetails = async (testId, userId) => {
  try {
    const test = await TestModel.getTestById(testId);

    if (!test || !test.is_active) {
      return generateResponse(false, 'Test not found or inactive', null, 404);
    }

    // Get test sections
    const sections = await SectionModel.getSectionsByTestId(testId);

    // Get sample questions (just count for now, not full questions)
    const questions = await QuestionModel.getQuestionsByTestId(testId);
    const questionCount = questions.length;

    const testDetails = {
      id: test.id,
      title: test.title,
      description: test.description,
      testType: test.test_type,
      totalQuestions: questionCount || test.total_questions,
      timeLimit: test.total_duration || 30,
      estimatedDuration: test.total_duration,
      difficulty: 'medium',
      instructions: test.instructions,
      sections: sections.map(section => ({
        id: section.id,
        name: section.section_name,
        description: section.description,
        questionCount: questions.filter(q => q.section_id === section.id).length,
        order: section.section_order
      })),
      rules: [
        'Answer all questions honestly for accurate results',
        'You cannot go back to previous questions once submitted',
        'Test will auto-submit when time expires',
        'Make sure you have a stable internet connection',
        'Do not refresh or close the browser during the test'
      ]
    };

    return generateResponse(true, 'Test details retrieved successfully', testDetails, 200);

  } catch (error) {
    console.error('Get test details service error:', error);
    return generateResponse(false, 'Failed to retrieve test details', null, 500);
  }
};

// Check if user can take a test
const canUserTakeTest = async (userId, testId) => {
  try {
    const test = await TestModel.getTestById(testId);

    if (!test || !test.is_active) {
      return generateResponse(false, 'Test not found or inactive', null, 404);
    }

    // Check if test has any restrictions (can be extended later)
    const canTake = {
      eligible: true,
      reasons: [],
      test: {
        id: test.id,
        title: test.title,
        timeLimit: test.total_duration || 30
      }
    };

    // Future: Add checks for:
    // - User eligibility
    // - Prerequisites
    // - Maximum attempts
    // - Time restrictions

    return generateResponse(true, 'Test eligibility checked', canTake, 200);

  } catch (error) {
    console.error('Check test eligibility service error:', error);
    return generateResponse(false, 'Failed to check test eligibility', null, 500);
  }
};

module.exports = {
  getAvailableTests,
  getTestDetails,
  canUserTakeTest
};