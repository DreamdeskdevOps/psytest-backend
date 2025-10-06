const AnswerOptionModel = require('../models/AnswerOption');
const QuestionModel = require('../models/Questions');
const { generateResponse } = require('../utils/helpers');
const { validateAnswerOptionData } = require('../utils/validation');

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

// Get question answer options
const getQuestionAnswerOptions = async (questionId, adminId) => {
  try {
    // Verify question exists
    const question = await QuestionModel.getQuestionById(questionId);
    if (!question) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    const options = await AnswerOptionModel.getQuestionOptions(questionId);

    const responseData = {
      questionId: questionId,
      questionText: question.question_text,
      answerPattern: question.answer_pattern || 'STANDARD',
      sectionPattern: question.answer_pattern,
      totalOptions: options.length,
      options: options
    };

    return generateResponse(true, 'Question options retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get question options service error:', error);
    return generateResponse(false, 'Failed to retrieve question options', null, 500);
  }
};

// Add answer option to question
const addAnswerOption = async (questionId, optionData, adminId, ipAddress, userAgent) => {
  try {
    // Verify question exists
    const question = await QuestionModel.getQuestionById(questionId);
    if (!question) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    // Validate option data
    const validation = validateAnswerOptionData(optionData);
    if (!validation.isValid) {
      return generateResponse(false, validation.message, null, 400);
    }

    // Get existing options to check limits
    const existingOptions = await AnswerOptionModel.getQuestionOptions(questionId);
    
    // Business rule: Check section pattern limits
    const maxOptionsAllowed = getMaxOptionsForPattern(question.answer_pattern);
    if (existingOptions.length >= maxOptionsAllowed) {
      return generateResponse(
        false, 
        `Maximum ${maxOptionsAllowed} options allowed for ${question.answer_pattern} pattern`, 
        null, 
        400
      );
    }

    // Check for duplicate option text
    const duplicateOption = existingOptions.find(
      option => option.option_text.toLowerCase() === optionData.optionText.toLowerCase()
    );
    
    if (duplicateOption) {
      return generateResponse(false, 'Option text already exists for this question', null, 400);
    }

    // Create option
    const newOption = await AnswerOptionModel.addAnswerOption(questionId, optionData, adminId);

    // Update question's options JSON field for backward compatibility
    const allOptions = await AnswerOptionModel.getQuestionOptions(questionId);
    const optionTexts = allOptions.map(opt => opt.option_text);
    await QuestionModel.updateQuestion(questionId, { options: optionTexts }, adminId);

    // Log admin activity
    await logAdminActivity(adminId, 'OPTION_CREATE', {
      questionId: questionId,
      optionId: newOption.id,
      optionText: newOption.option_text,
      sectionId: question.section_id,
      testId: question.test_id,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Answer option added successfully', newOption, 201);

  } catch (error) {
    console.error('Add answer option service error:', error);
    return generateResponse(false, 'Failed to add answer option', null, 500);
  }
};

// Update answer option
const updateAnswerOption = async (optionId, updateData, adminId, ipAddress, userAgent) => {
  try {
    // Verify option exists
    const existingOption = await AnswerOptionModel.getOptionById(optionId);
    if (!existingOption) {
      return generateResponse(false, 'Answer option not found', null, 404);
    }

    // Validate update data
    if (updateData.optionText) {
      const validation = validateAnswerOptionData(updateData, false); // partial validation
      if (!validation.isValid) {
        return generateResponse(false, validation.message, null, 400);
      }

      // Check for duplicate option text (excluding current option)
      const existingOptions = await AnswerOptionModel.getQuestionOptions(existingOption.question_id);
      const duplicateOption = existingOptions.find(
        option => option.id !== optionId && 
        option.option_text.toLowerCase() === updateData.optionText.toLowerCase()
      );
      
      if (duplicateOption) {
        return generateResponse(false, 'Option text already exists for this question', null, 400);
      }
    }

    // Business rule: If marking as correct, validate section allows correct answers
    if (updateData.isCorrect === true) {
      const allowsCorrect = sectionAllowsCorrectAnswers(existingOption.answer_pattern);
      if (!allowsCorrect) {
        return generateResponse(
          false, 
          `${existingOption.answer_pattern} pattern does not support correct answers`, 
          null, 
          400
        );
      }
    }

    // Update option
    const updatedOption = await AnswerOptionModel.updateAnswerOption(optionId, updateData, adminId);

    // Update question's options JSON field if text changed
    if (updateData.optionText) {
      const allOptions = await AnswerOptionModel.getQuestionOptions(existingOption.question_id);
      const optionTexts = allOptions.map(opt => opt.option_text);
      await QuestionModel.updateQuestion(existingOption.question_id, { options: optionTexts }, adminId);
    }

    // Update question's correct answer if this option was marked correct
    if (updateData.isCorrect === true) {
      await QuestionModel.updateQuestion(
        existingOption.question_id,
        { correctAnswer: updatedOption.option_text },
        adminId
      );
    }

    // Log admin activity
    await logAdminActivity(adminId, 'OPTION_UPDATE', {
      optionId: optionId,
      questionId: existingOption.question_id,
      changes: Object.keys(updateData),
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Answer option updated successfully', updatedOption, 200);

  } catch (error) {
    console.error('Update answer option service error:', error);
    return generateResponse(false, 'Failed to update answer option', null, 500);
  }
};

// Delete answer option
const deleteAnswerOption = async (optionId, adminId, ipAddress, userAgent) => {
  try {
    const existingOption = await AnswerOptionModel.getOptionById(optionId);
    if (!existingOption) {
      return generateResponse(false, 'Answer option not found', null, 404);
    }

    // Business rule: Check minimum options requirement
    const existingOptions = await AnswerOptionModel.getQuestionOptions(existingOption.question_id);
    const minOptionsRequired = getMinOptionsForPattern(existingOption.answer_pattern);
    
    if (existingOptions.length <= minOptionsRequired) {
      return generateResponse(
        false, 
        `Cannot delete option. Minimum ${minOptionsRequired} options required for ${existingOption.answer_pattern} pattern`, 
        null, 
        400
      );
    }

    const result = await AnswerOptionModel.deleteAnswerOption(optionId, adminId);

    // Update question's options JSON field
    const remainingOptions = await AnswerOptionModel.getQuestionOptions(existingOption.question_id);
    const optionTexts = remainingOptions.map(opt => opt.option_text);
    await QuestionModel.updateQuestion(existingOption.question_id, { options: optionTexts }, adminId);

    // If deleted option was correct answer, clear question's correct answer
    if (existingOption.is_correct) {
      await QuestionModel.updateQuestion(
        existingOption.question_id,
        { correctAnswer: null },
        adminId
      );
    }

    // Log admin activity
    await logAdminActivity(adminId, 'OPTION_DELETE', {
      optionId: optionId,
      questionId: existingOption.question_id,
      optionText: existingOption.option_text,
      responseCount: result.response_count,
      ipAddress,
      userAgent
    });

    return generateResponse(
      true, 
      `Answer option deleted successfully. ${result.response_count} user responses preserved.`, 
      result, 
      200
    );

  } catch (error) {
    console.error('Delete answer option service error:', error);
    return generateResponse(false, 'Failed to delete answer option', null, 500);
  }
};

// Reorder question options
const reorderQuestionOptions = async (questionId, optionOrders, adminId, ipAddress, userAgent) => {
  try {
    // Verify question exists
    const question = await QuestionModel.getQuestionById(questionId);
    if (!question) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    // Validation
    if (!Array.isArray(optionOrders) || optionOrders.length === 0) {
      return generateResponse(false, 'Option orders array is required', null, 400);
    }

    // Validate all options belong to the question
    const existingOptions = await AnswerOptionModel.getQuestionOptions(questionId);
    const existingOptionIds = existingOptions.map(opt => opt.id);
    
    const invalidOptions = optionOrders.filter(order => 
      !existingOptionIds.includes(order.optionId)
    );
    
    if (invalidOptions.length > 0) {
      return generateResponse(false, 'Some options do not belong to this question', null, 400);
    }

    const result = await AnswerOptionModel.reorderQuestionOptions(questionId, optionOrders, adminId);

    // Update question's options JSON field to reflect new order
    const reorderedOptions = await AnswerOptionModel.getQuestionOptions(questionId);
    const optionTexts = reorderedOptions.map(opt => opt.option_text);
    await QuestionModel.updateQuestion(questionId, { options: optionTexts }, adminId);

    // Log admin activity
    await logAdminActivity(adminId, 'OPTIONS_REORDER', {
      questionId: questionId,
      optionOrders: optionOrders,
      optionsAffected: result.length,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Answer options reordered successfully', result, 200);

  } catch (error) {
    console.error('Reorder options service error:', error);
    return generateResponse(false, 'Failed to reorder answer options', null, 500);
  }
};

// Set question option type
const setQuestionOptionType = async (questionId, optionType, customOptions, adminId, ipAddress, userAgent) => {
  try {
    // Verify question exists
    const question = await QuestionModel.getQuestionById(questionId);
    if (!question) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    // Business rule: Check if question has user responses
    const existingOptions = await AnswerOptionModel.getQuestionOptions(questionId);
    const hasResponses = existingOptions.some(opt => opt.selection_count > 0);
    
    if (hasResponses) {
      return generateResponse(
        false, 
        'Cannot change option type for questions with existing user responses', 
        null, 
        400
      );
    }

    const result = await AnswerOptionModel.setQuestionOptionType(
      questionId, 
      optionType, 
      customOptions, 
      adminId
    );

    // Log admin activity
    await logAdminActivity(adminId, 'OPTION_TYPE_CHANGE', {
      questionId: questionId,
      newOptionType: optionType,
      optionsCount: result.optionsCount,
      customOptions: !!customOptions,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Question option type updated successfully', result, 200);

  } catch (error) {
    console.error('Set option type service error:', error);
    return generateResponse(false, error.message || 'Failed to set option type', null, 500);
  }
};

// Get available option types
const getAvailableOptionTypes = async () => {
  try {
    const optionTypes = await AnswerOptionModel.getAvailableOptionTypes();
    return generateResponse(true, 'Available option types retrieved successfully', optionTypes, 200);

  } catch (error) {
    console.error('Get option types service error:', error);
    return generateResponse(false, 'Failed to retrieve option types', null, 500);
  }
};

// Set correct answer
const setCorrectAnswer = async (questionId, correctAnswerText, adminId, ipAddress, userAgent) => {
  try {
    // Verify question exists
    const question = await QuestionModel.getQuestionById(questionId);
    if (!question) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    // Business rule: Check if section allows correct answers
    const allowsCorrect = sectionAllowsCorrectAnswers(question.answer_pattern);
    if (!allowsCorrect) {
      return generateResponse(
        false, 
        `${question.answer_pattern} pattern does not support correct answers`, 
        null, 
        400
      );
    }

    // Verify the answer option exists
    const questionOptions = await AnswerOptionModel.getQuestionOptions(questionId);
    const targetOption = questionOptions.find(opt => opt.option_text === correctAnswerText);
    
    if (!targetOption) {
      return generateResponse(false, 'Answer option not found for this question', null, 404);
    }

    const result = await AnswerOptionModel.setCorrectAnswer(questionId, correctAnswerText, adminId);

    // Log admin activity
    await logAdminActivity(adminId, 'CORRECT_ANSWER_SET', {
      questionId: questionId,
      correctAnswer: correctAnswerText,
      previousCorrect: question.correct_answer,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Correct answer set successfully', result, 200);

  } catch (error) {
    console.error('Set correct answer service error:', error);
    return generateResponse(false, 'Failed to set correct answer', null, 500);
  }
};

// Set answer pattern
const setAnswerPattern = async (questionId, answerPattern, patternConfig, adminId, ipAddress, userAgent) => {
  try {
    // Verify question exists
    const question = await QuestionModel.getQuestionById(questionId);
    if (!question) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    // Business rule: Check if question has user responses
    const questionOptions = await AnswerOptionModel.getQuestionOptions(questionId);
    const hasResponses = questionOptions.some(opt => opt.selection_count > 0);
    
    if (hasResponses) {
      return generateResponse(
        false, 
        'Cannot change answer pattern for questions with existing user responses', 
        null, 
        400
      );
    }

    const result = await AnswerOptionModel.setAnswerPattern(
      questionId, 
      answerPattern, 
      patternConfig, 
      adminId
    );

    // Log admin activity
    await logAdminActivity(adminId, 'ANSWER_PATTERN_SET', {
      questionId: questionId,
      newPattern: answerPattern,
      patternConfig: patternConfig,
      previousPattern: question.answer_pattern,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Answer pattern set successfully', result, 200);

  } catch (error) {
    console.error('Set answer pattern service error:', error);
    return generateResponse(false, error.message || 'Failed to set answer pattern', null, 500);
  }
};

// Helper functions
const getMaxOptionsForPattern = (pattern) => {
  const limits = {
    'YES_NO': 2,
    'TRUE_FALSE': 2,
    'MULTIPLE_CHOICE': 6,
    'LIKERT_SCALE': 10,
    'ODD_EVEN': 7,
    'RATING_SCALE': 10,
    'FREQUENCY_SCALE': 7
  };
  return limits[pattern] || 10;
};

const getMinOptionsForPattern = (pattern) => {
  const limits = {
    'YES_NO': 2,
    'TRUE_FALSE': 2,
    'MULTIPLE_CHOICE': 2,
    'LIKERT_SCALE': 3,
    'ODD_EVEN': 2,
    'RATING_SCALE': 3,
    'FREQUENCY_SCALE': 3
  };
  return limits[pattern] || 2;
};

const sectionAllowsCorrectAnswers = (pattern) => {
  const allowsCorrect = ['MULTIPLE_CHOICE', 'TRUE_FALSE'];
  return allowsCorrect.includes(pattern);
};

module.exports = {
  getQuestionAnswerOptions,
  addAnswerOption,
  updateAnswerOption,
  deleteAnswerOption,
  reorderQuestionOptions,
  setQuestionOptionType,
  getAvailableOptionTypes,
  setCorrectAnswer,
  setAnswerPattern
};