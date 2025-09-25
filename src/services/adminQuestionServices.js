const QuestionModel = require('../models/Questions');
const QuestionImages = require('../models/QuestionImages');
const SectionModel = require('../models/Section');
const fileStorageService = require('./fileStorageService');
const { generateResponse } = require('../utils/helpers');
const { validateQuestionData } = require('../utils/validation');
const xlsx = require('xlsx');

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

// Get all questions in a section
const getSectionQuestions = async (sectionId, adminId) => {
  try {
    // Verify section exists
    const section = await SectionModel.getSectionById(sectionId);
    if (!section) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    const questions = await QuestionModel.getQuestionsBySection(sectionId);

    const responseData = {
      sectionId: sectionId,
      sectionName: section.section_name,
      answerPattern: section.answer_pattern,
      scoringLogic: section.scoring_logic,
      totalQuestions: questions.length,
      questions: questions.map(question => ({
        ...question,
        options: question.options ? JSON.parse(question.options) : [],
        images: question.images || []
      }))
    };

    return generateResponse(true, 'Section questions retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get section questions service error:', error);
    return generateResponse(false, 'Failed to retrieve section questions', null, 500);
  }
};

// Add new question to section
const createSectionQuestion = async (sectionId, questionData, adminId, ipAddress, userAgent) => {
  try {
    // Verify section exists
    const section = await SectionModel.getSectionById(sectionId);
    if (!section) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    // Validate question data
    const validation = validateQuestionData(questionData);
    if (!validation.isValid) {
      return generateResponse(false, validation.message, null, 400);
    }

    // Validate question against section pattern
    const sectionValidationErrors = await QuestionModel.validateQuestionForSection(questionData, sectionId);
    if (sectionValidationErrors.length > 0) {
      return generateResponse(false, sectionValidationErrors[0], null, 400);
    }

    // Business rule: Check if section has reached question limit
    const existingQuestions = await QuestionModel.getQuestionsBySection(sectionId);
    if (existingQuestions.length >= section.question_count) {
      return generateResponse(
        false, 
        `Section already has maximum questions (${section.question_count}). Increase section capacity first.`, 
        null, 
        400
      );
    }

    // Create question
    const newQuestion = await QuestionModel.createQuestion(sectionId, questionData, adminId);

    // Update section counters if needed
    // await SectionModel.updateTestCounters(section.test_id); // Temporarily disabled to fix error

    // Log admin activity
    await logAdminActivity(adminId, 'QUESTION_CREATE', {
      sectionId: sectionId,
      questionId: newQuestion?.id,
      questionText: newQuestion?.question_text ? newQuestion.question_text.substring(0, 100) : 'Question text not available',
      testId: section.test_id,
      ipAddress,
      userAgent
    });

    const responseData = {
      ...newQuestion,
      options: newQuestion?.options ? JSON.parse(newQuestion.options) : []
    };

    return generateResponse(true, 'Question created successfully', responseData, 201);

  } catch (error) {
    console.error('Create section question service error:', error);
    return generateResponse(false, 'Failed to create question', null, 500);
  }
};

// Get question details
const getQuestionDetails = async (questionId, adminId) => {
  try {
    const question = await QuestionModel.getQuestionById(questionId);
    if (!question) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    const responseData = {
      ...question,
      options: question.options ? JSON.parse(question.options) : []
    };

    return generateResponse(true, 'Question details retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get question details service error:', error);
    return generateResponse(false, 'Failed to retrieve question details', null, 500);
  }
};

// Update question
const updateQuestionInfo = async (questionId, updateData, adminId, ipAddress, userAgent) => {
  try {
    // Verify question exists
    const existingQuestion = await QuestionModel.getQuestionById(questionId);
    if (!existingQuestion) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    // Validate update data if provided
    if (Object.keys(updateData).length > 0) {
      const validation = validateQuestionData(updateData, false); // partial validation
      if (!validation.isValid) {
        return generateResponse(false, validation.message, null, 400);
      }
    }

    // Validate against section pattern if options are being changed
    // Only validate when options are explicitly provided, not just correct answer
    if (updateData.options) {
      const validationData = {
        ...existingQuestion,
        ...updateData,
        options: updateData.options
      };

      const sectionValidationErrors = await QuestionModel.validateQuestionForSection(
        validationData,
        existingQuestion.section_id
      );

      if (sectionValidationErrors.length > 0) {
        return generateResponse(false, sectionValidationErrors[0], null, 400);
      }
    }

    // Update question
    const updatedQuestion = await QuestionModel.updateQuestion(questionId, updateData, adminId);
    console.log('Update question result:', updatedQuestion);

    // Check if update was successful
    if (!updatedQuestion) {
      return generateResponse(false, 'Failed to update question - question not found or no changes made', null, 404);
    }

    // Log admin activity
    await logAdminActivity(adminId, 'QUESTION_UPDATE', {
      questionId: questionId,
      sectionId: existingQuestion.section_id,
      testId: existingQuestion.test_id,
      changes: Object.keys(updateData),
      ipAddress,
      userAgent
    });

    const responseData = {
      ...updatedQuestion,
      options: updatedQuestion?.options ? JSON.parse(updatedQuestion.options) : []
    };

    return generateResponse(true, 'Question updated successfully', responseData, 200);

  } catch (error) {
    console.error('Update question service error:', error);
    return generateResponse(false, 'Failed to update question', null, 500);
  }
};

// Delete question
const deleteQuestion = async (questionId, adminId, ipAddress, userAgent) => {
  try {
    const existingQuestion = await QuestionModel.getQuestionById(questionId);
    if (!existingQuestion) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    // Business rule: Check if this would leave section with no questions
    const sectionQuestions = await QuestionModel.getQuestionsBySection(existingQuestion.section_id);
    if (sectionQuestions.length === 1) {
      return generateResponse(
        false, 
        'Cannot delete the only question in section. Add more questions first.', 
        null, 
        400
      );
    }

    const result = await QuestionModel.deleteQuestion(questionId, adminId);

    // Update section counters
    await SectionModel.updateTestCounters(existingQuestion.test_id);

    // Log admin activity
    await logAdminActivity(adminId, 'QUESTION_DELETE', {
      questionId: questionId,
      sectionId: existingQuestion.section_id,
      testId: existingQuestion.test_id,
      questionText: existingQuestion.question_text.substring(0, 100),
      answerCount: result.answer_count,
      ipAddress,
      userAgent
    });

    return generateResponse(
      true, 
      `Question deleted successfully. ${result.answer_count} user answers preserved.`, 
      result, 
      200
    );

  } catch (error) {
    console.error('Delete question service error:', error);
    return generateResponse(false, 'Failed to delete question', null, 500);
  }
};

// Duplicate question
const duplicateQuestion = async (originalQuestionId, adminId, ipAddress, userAgent) => {
  try {
    const originalQuestion = await QuestionModel.getQuestionById(originalQuestionId);
    if (!originalQuestion) {
      return generateResponse(false, 'Original question not found', null, 404);
    }

    // Check section capacity
    const sectionQuestions = await QuestionModel.getQuestionsBySection(originalQuestion.section_id);
    const section = await SectionModel.getSectionById(originalQuestion.section_id);
    
    if (sectionQuestions.length >= section.question_count) {
      return generateResponse(
        false, 
        `Section has reached maximum questions (${section.question_count}). Increase section capacity first.`, 
        null, 
        400
      );
    }

    const duplicatedQuestion = await QuestionModel.duplicateQuestion(originalQuestionId, adminId);

    // Log admin activity
    await logAdminActivity(adminId, 'QUESTION_DUPLICATE', {
      originalQuestionId: originalQuestionId,
      newQuestionId: duplicatedQuestion.id,
      sectionId: originalQuestion.section_id,
      testId: originalQuestion.test_id,
      ipAddress,
      userAgent
    });

    return generateResponse(
      true, 
      'Question duplicated successfully', 
      {
        ...duplicatedQuestion,
        options: duplicatedQuestion.options ? JSON.parse(duplicatedQuestion.options) : []
      }, 
      201
    );

  } catch (error) {
    console.error('Duplicate question service error:', error);
    return generateResponse(false, 'Failed to duplicate question', null, 500);
  }
};

// Update question content (text only)
const updateQuestionContent = async (questionId, questionText, adminId, ipAddress, userAgent) => {
  try {
    const existingQuestion = await QuestionModel.getQuestionById(questionId);
    if (!existingQuestion) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    // Validation
    if (!questionText || questionText.trim().length < 5) {
      return generateResponse(false, 'Question text must be at least 5 characters long', null, 400);
    }

    if (questionText.trim().length > 1000) {
      return generateResponse(false, 'Question text cannot exceed 1000 characters', null, 400);
    }

    const result = await QuestionModel.updateQuestionContent(questionId, questionText.trim(), adminId);

    // Log admin activity
    await logAdminActivity(adminId, 'QUESTION_CONTENT_UPDATE', {
      questionId: questionId,
      sectionId: existingQuestion.section_id,
      testId: existingQuestion.test_id,
      previousLength: existingQuestion.question_text.length,
      newLength: questionText.trim().length,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Question content updated successfully', result, 200);

  } catch (error) {
    console.error('Update question content service error:', error);
    return generateResponse(false, 'Failed to update question content', null, 500);
  }
};

// Upload/Update question image
const updateQuestionImage = async (questionId, imageUrl, adminId, ipAddress, userAgent) => {
  try {
    const existingQuestion = await QuestionModel.getQuestionById(questionId);
    if (!existingQuestion) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    // Validation
    if (!imageUrl || !imageUrl.trim()) {
      return generateResponse(false, 'Image URL is required', null, 400);
    }

    // Basic URL validation
    try {
      new URL(imageUrl);
    } catch (error) {
      return generateResponse(false, 'Invalid image URL format', null, 400);
    }

    const result = await QuestionModel.updateQuestionImage(questionId, imageUrl.trim(), adminId);

    // Log admin activity
    await logAdminActivity(adminId, 'QUESTION_IMAGE_UPDATE', {
      questionId: questionId,
      sectionId: existingQuestion.section_id,
      testId: existingQuestion.test_id,
      imageUrl: imageUrl.trim(),
      previousImage: existingQuestion.image_url,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Question image updated successfully', result, 200);

  } catch (error) {
    console.error('Update question image service error:', error);
    return generateResponse(false, 'Failed to update question image', null, 500);
  }
};

// Remove question image
const removeQuestionImage = async (questionId, adminId, ipAddress, userAgent) => {
  try {
    const existingQuestion = await QuestionModel.getQuestionById(questionId);
    if (!existingQuestion) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    // Allow removal even if no image exists (idempotent operation)

    const result = await QuestionModel.removeQuestionImage(questionId, adminId);

    // Log admin activity
    await logAdminActivity(adminId, 'QUESTION_IMAGE_REMOVE', {
      questionId: questionId,
      sectionId: existingQuestion.section_id,
      testId: existingQuestion.test_id,
      removedImage: existingQuestion.image_url || null,
      hadImage: !!existingQuestion.image_url,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Question image removed successfully', result, 200);

  } catch (error) {
    console.error('Remove question image service error:', error);
    return generateResponse(false, 'Failed to remove question image', null, 500);
  }
};

// Get question preview
const getQuestionPreview = async (questionId, adminId) => {
  try {
    const question = await QuestionModel.getQuestionById(questionId);
    if (!question) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    // Format for preview
    const previewData = {
      question: {
        id: question.id,
        text: question.question_text,
        number: question.question_number,
        type: question.question_type,
        image: question.image_url,
        options: question.options ? JSON.parse(question.options) : [],
        marks: question.marks,
        difficulty: question.difficulty_level,
        explanation: question.explanation
      },
      section: {
        id: question.section_id,
        name: question.section_name,
        answerPattern: question.answer_pattern,
        scoringLogic: question.scoring_logic
      },
      test: {
        id: question.test_id,
        title: question.test_title,
        type: question.test_type
      },
      analytics: {
        totalAnswers: question.total_answers,
        correctAnswers: question.correct_answers,
        avgResponseTime: question.avg_response_time,
        performanceDifficulty: question.performance_difficulty
      },
      previewMode: true,
      previewedBy: adminId,
      previewedAt: new Date().toISOString()
    };

    return generateResponse(true, 'Question preview generated successfully', previewData, 200);

  } catch (error) {
    console.error('Get question preview service error:', error);
    return generateResponse(false, 'Failed to generate question preview', null, 500);
  }
};

// Reorder questions in section
const reorderSectionQuestions = async (sectionId, questionOrders, adminId, ipAddress, userAgent) => {
  try {
    // Verify section exists
    const section = await SectionModel.getSectionById(sectionId);
    if (!section) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    // Validation
    if (!Array.isArray(questionOrders) || questionOrders.length === 0) {
      return generateResponse(false, 'Question orders array is required', null, 400);
    }

    // Validate all questions belong to the section
    const existingQuestions = await QuestionModel.getQuestionsBySection(sectionId);
    const existingQuestionIds = existingQuestions.map(q => q.id);
    
    const invalidQuestions = questionOrders.filter(order => 
      !existingQuestionIds.includes(order.questionId)
    );
    
    if (invalidQuestions.length > 0) {
      return generateResponse(false, 'Some questions do not belong to this section', null, 400);
    }

    const result = await QuestionModel.reorderQuestions(sectionId, questionOrders, adminId);

    // Log admin activity
    await logAdminActivity(adminId, 'QUESTIONS_REORDER', {
      sectionId: sectionId,
      testId: section.test_id,
      questionOrders: questionOrders,
      questionsAffected: result.length,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Questions reordered successfully', result, 200);

  } catch (error) {
    console.error('Reorder questions service error:', error);
    return generateResponse(false, 'Failed to reorder questions', null, 500);
  }
};

// Set custom question number
const setQuestionNumber = async (questionId, questionNumber, adminId, ipAddress, userAgent) => {
  try {
    const existingQuestion = await QuestionModel.getQuestionById(questionId);
    if (!existingQuestion) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    // Validation
    if (!questionNumber || questionNumber.toString().trim().length === 0) {
      return generateResponse(false, 'Question number is required', null, 400);
    }

    const result = await QuestionModel.setQuestionNumber(questionId, questionNumber.toString().trim(), adminId);

    // Log admin activity
    await logAdminActivity(adminId, 'QUESTION_NUMBER_UPDATE', {
      questionId: questionId,
      sectionId: existingQuestion.section_id,
      testId: existingQuestion.test_id,
      newNumber: questionNumber.toString().trim(),
      previousNumber: existingQuestion.question_number,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Question number updated successfully', result, 200);

  } catch (error) {
    console.error('Set question number service error:', error);
    return generateResponse(false, 'Failed to update question number', null, 500);
  }
};

// Set section numbering style
const setSectionNumbering = async (sectionId, numberingConfig, adminId, ipAddress, userAgent) => {
  try {
    // Verify section exists
    const section = await SectionModel.getSectionById(sectionId);
    if (!section) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    // Validation
    const allowedStyles = ['NUMERIC', 'ALPHA_LOWER', 'ALPHA_UPPER', 'ROMAN_LOWER', 'ROMAN_UPPER'];
    if (numberingConfig.numberingStyle && !allowedStyles.includes(numberingConfig.numberingStyle)) {
      return generateResponse(
        false, 
        `Numbering style must be one of: ${allowedStyles.join(', ')}`, 
        null, 
        400
      );
    }

    if (numberingConfig.numberingStart && (numberingConfig.numberingStart < 1 || numberingConfig.numberingStart > 100)) {
      return generateResponse(false, 'Numbering start must be between 1 and 100', null, 400);
    }

    // Apply numbering directly to questions since section-level numbering config is not stored in DB
    const questions = await QuestionModel.getQuestionsBySection(sectionId);
    if (questions.length === 0) {
      return generateResponse(false, 'No questions found in this section to renumber', null, 400);
    }

    // Generate new numbers based on style
    const { numberingStyle = 'NUMERIC', numberingStart = 1, numberingPrefix = '', numberingSuffix = '' } = numberingConfig;

    const updatePromises = questions.map((question, index) => {
      let newNumber;

      switch (numberingStyle) {
        case 'NUMERIC':
          newNumber = `${numberingPrefix}${(numberingStart + index)}${numberingSuffix}`;
          break;
        case 'ALPHA_LOWER':
          newNumber = `${numberingPrefix}${String.fromCharCode(97 + index)}${numberingSuffix}`;
          break;
        case 'ALPHA_UPPER':
          newNumber = `${numberingPrefix}${String.fromCharCode(65 + index)}${numberingSuffix}`;
          break;
        case 'ROMAN_LOWER':
          newNumber = `${numberingPrefix}${toRomanNumeral(index + numberingStart).toLowerCase()}${numberingSuffix}`;
          break;
        case 'ROMAN_UPPER':
          newNumber = `${numberingPrefix}${toRomanNumeral(index + numberingStart)}${numberingSuffix}`;
          break;
        default:
          newNumber = `${numberingPrefix}${(numberingStart + index)}${numberingSuffix}`;
      }

      return QuestionModel.setQuestionNumber(question.id, newNumber, adminId);
    });

    const results = await Promise.all(updatePromises);

    // Log admin activity
    await logAdminActivity(adminId, 'SECTION_NUMBERING_UPDATE', {
      sectionId: sectionId,
      testId: section.test_id,
      numberingConfig: numberingConfig,
      questionsUpdated: results.length,
      ipAddress,
      userAgent
    });

    return generateResponse(true, `Section numbering updated successfully for ${results.length} questions`, {
      sectionId,
      numberingConfig,
      questionsUpdated: results.length,
      sampleNumbers: results.slice(0, 3).map(r => r.custom_number)
    }, 200);

  } catch (error) {
    console.error('Set section numbering service error:', error);
    return generateResponse(false, 'Failed to update section numbering', null, 500);
  }
};

// Helper function to convert to Roman numerals
const toRomanNumeral = (num) => {
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const literals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];

  let result = '';
  for (let i = 0; i < values.length; i++) {
    while (num >= values[i]) {
      result += literals[i];
      num -= values[i];
    }
  }
  return result;
};

const bulkImportQuestions = async (sectionId, fileBuffer, adminId, ipAddress, userAgent) => {
  const { sequelize } = require('../config/database');
  const t = await sequelize.transaction();

  try {
    // 1. Verify section exists
    const section = await SectionModel.getSectionById(sectionId);
    if (!section) {
      await t.rollback();
      return generateResponse(false, 'Section not found', null, 404);
    }

    // 2. Parse the Excel file
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const questionsData = xlsx.utils.sheet_to_json(worksheet);

    if (!questionsData || questionsData.length === 0) {
      await t.rollback();
      return generateResponse(false, 'Excel file is empty or could not be read.', null, 400);
    }

    // 3. Validate data and check capacity
    const requiredColumns = ['question_text', 'order_index'];
    for (const col of requiredColumns) {
      if (!questionsData[0].hasOwnProperty(col)) {
        await t.rollback();
        return generateResponse(false, `Missing required column in Excel file: ${col}`, null, 400);
      }
    }

    const existingQuestions = await QuestionModel.getQuestionsBySection(sectionId);
    if (existingQuestions.length + questionsData.length > section.question_count) {
      await t.rollback();
      return generateResponse(
        false,
        `Importing ${questionsData.length} questions would exceed the section limit of ${section.question_count}.`,
        null,
        400
      );
    }

    // 4. Create Questions in the Transaction
    const createdQuestions = [];
    console.log('📊 Processing', questionsData.length, 'questions from CSV/Excel import');

    for (let i = 0; i < questionsData.length; i++) {
      const question = questionsData[i];
      const questionData = {
        questionText: question.question_text,
        questionOrder: question.order_index,
        questionType: question.question_type || 'MULTIPLE_CHOICE',
        difficultyLevel: question.difficulty_level || question.difficulty || 'MEDIUM',
        marks: parseFloat(question.marks) || 1,
        explanation: question.explanation || question.answer_explanation || '',
        questionFlag: question.question_flag || question.flag || '', // Support both column names
        questionNumber: question.question_number || '',
        isRequired: question.is_required !== undefined ? question.is_required : true
      };

      if (!questionData.questionText || String(questionData.questionText).trim() === '') {
        throw new Error(`Row with order_index ${question.order_index} has empty question_text.`);
      }

      // Validate difficulty level
      const validDifficultyLevels = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'];
      if (!validDifficultyLevels.includes(questionData.difficultyLevel)) {
        questionData.difficultyLevel = 'MEDIUM';
      }

      // Validate question type
      const validQuestionTypes = ['STANDARD', 'TEXT', 'IMAGE', 'MIXED', 'SCENARIO', 'IMAGE_BASED', 'AUDIO_BASED', 'VIDEO_BASED', 'MULTIPLE_CHOICE', 'SINGLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'FILL_BLANK'];
      if (!validQuestionTypes.includes(questionData.questionType)) {
        questionData.questionType = 'MULTIPLE_CHOICE';
      }

      // Log question flag for debugging
      if (questionData.questionFlag) {
        console.log(`🏷️ Question ${i + 1} has flag: "${questionData.questionFlag}"`);
      }

      const newQuestion = await QuestionModel.createQuestion(sectionId, questionData, adminId, t);
      createdQuestions.push(newQuestion);
    }

    // 5. Commit the transaction
    await t.commit();

    // 6. Log admin activity
    await logAdminActivity(adminId, 'QUESTION_BULK_IMPORT', {
      sectionId: sectionId,
      testId: section.test_id,
      importedCount: createdQuestions.length,
      ipAddress,
      userAgent
    });

    // 7. Return response
    return generateResponse(
      true,
      `${createdQuestions.length} questions imported successfully.`,
      { importedCount: createdQuestions.length },
      201
    );

  } catch (error) {
    await t.rollback();
    console.error('Bulk import questions service error:', error);
    return generateResponse(false, error.message || 'Failed to import questions.', null, 500);
  }
};

// Enhanced question service functions for multi-image support

// Create question with multiple images
const createQuestionWithImages = async (sectionId, questionData, imageFiles, adminId, ipAddress, userAgent) => {
  try {
    // Verify section exists
    const section = await SectionModel.getSectionById(sectionId);
    if (!section) {
      return generateResponse(false, 'Section not found', null, 404);
    }

    // Validate question data
    const validation = validateQuestionData(questionData);
    if (!validation.isValid) {
      return generateResponse(false, validation.message, null, 400);
    }

    // Create question with images
    const createdQuestion = await QuestionModel.createQuestionWithImages(
      sectionId,
      questionData,
      imageFiles,
      adminId
    );

    await logAdminActivity(adminId, 'QUESTION_CREATE_WITH_IMAGES', {
      questionId: createdQuestion.id,
      sectionId,
      testId: section.test_id,
      questionType: questionData.questionType,
      contentType: questionData.questionContentType,
      imageCount: imageFiles ? imageFiles.length : 0,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Question with images created successfully', createdQuestion, 201);

  } catch (error) {
    console.error('Create question with images service error:', error);
    console.error('Service error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return generateResponse(false, `Failed to create question with images: ${error.message}`, null, 500);
  }
};

// Update question with images (identical to create)
const updateQuestionWithImages = async (questionId, questionData, imageFiles, adminId, ipAddress, userAgent) => {
  try {
    // Verify question exists
    const existingQuestion = await QuestionModel.getQuestionById(questionId);
    if (!existingQuestion) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    // Validate question data
    const validation = validateQuestionData(questionData, false); // partial validation for update
    if (!validation.isValid) {
      return generateResponse(false, validation.message, null, 400);
    }

    // Update question with images using the same logic as create
    const updatedQuestion = await QuestionModel.updateQuestionWithImages(questionId, questionData, imageFiles, adminId);

    await logAdminActivity(adminId, 'QUESTION_UPDATE_WITH_IMAGES', {
      questionId,
      sectionId: existingQuestion.section_id,
      testId: existingQuestion.test_id,
      questionType: questionData.questionType,
      contentType: questionData.questionContentType,
      imageCount: imageFiles ? imageFiles.length : 0,
      ipAddress,
      userAgent
    });

    const responseData = {
      ...updatedQuestion,
      options: updatedQuestion.options ?
        (typeof updatedQuestion.options === 'string' ?
          JSON.parse(updatedQuestion.options) : updatedQuestion.options) : []
    };

    return generateResponse(true, 'Question updated successfully', responseData, 200);

  } catch (error) {
    console.error('Update question with images service error:', error);
    return generateResponse(false, `Failed to update question with images: ${error.message}`, null, 500);
  }
};

// Add images to existing question
const addQuestionImages = async (questionId, imageFiles, adminId, ipAddress, userAgent) => {
  try {
    const existingQuestion = await QuestionModel.getQuestionById(questionId);
    if (!existingQuestion) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    const result = await QuestionModel.addQuestionImages(questionId, imageFiles, adminId);

    await logAdminActivity(adminId, 'QUESTION_IMAGES_ADD', {
      questionId,
      sectionId: existingQuestion.section_id,
      testId: existingQuestion.test_id,
      addedImages: result.successCount,
      failedImages: result.errorCount,
      ipAddress,
      userAgent
    });

    return generateResponse(
      result.success,
      result.success
        ? `${result.successCount} images added successfully`
        : `${result.successCount}/${result.totalFiles} images added`,
      result,
      result.success ? 200 : 207
    );

  } catch (error) {
    console.error('Add question images service error:', error);
    return generateResponse(false, 'Failed to add images to question', null, 500);
  }
};

// Set numbered images for a question
const setQuestionImageNumbers = async (questionId, imageNumberMap, adminId, ipAddress, userAgent) => {
  try {
    const existingQuestion = await QuestionModel.getQuestionById(questionId);
    if (!existingQuestion) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    const result = await QuestionModel.setQuestionImageNumbers(questionId, imageNumberMap, adminId);

    await logAdminActivity(adminId, 'QUESTION_IMAGES_NUMBER', {
      questionId,
      sectionId: existingQuestion.section_id,
      testId: existingQuestion.test_id,
      numberedImages: imageNumberMap.length,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Image numbers set successfully', result, 200);

  } catch (error) {
    console.error('Set image numbers service error:', error);
    return generateResponse(false, 'Failed to set image numbers', null, 500);
  }
};

// Remove specific image from question
const removeQuestionImageById = async (questionId, imageId, adminId, ipAddress, userAgent) => {
  try {
    const existingQuestion = await QuestionModel.getQuestionById(questionId);
    if (!existingQuestion) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    const imageToRemove = await QuestionImages.getQuestionImageById(imageId);
    if (!imageToRemove) {
      return generateResponse(false, 'Image not found', null, 404);
    }

    const result = await QuestionModel.removeQuestionImageById(questionId, imageId, adminId);

    await logAdminActivity(adminId, 'QUESTION_IMAGE_REMOVE', {
      questionId,
      imageId,
      sectionId: existingQuestion.section_id,
      testId: existingQuestion.test_id,
      removedImageUrl: imageToRemove.image_url,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Image removed successfully', result, 200);

  } catch (error) {
    console.error('Remove question image service error:', error);
    return generateResponse(false, 'Failed to remove image', null, 500);
  }
};

// Reorder question images
const reorderQuestionImages = async (questionId, imageOrders, adminId, ipAddress, userAgent) => {
  try {
    const existingQuestion = await QuestionModel.getQuestionById(questionId);
    if (!existingQuestion) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    const result = await QuestionImages.reorderQuestionImages(questionId, imageOrders);

    await logAdminActivity(adminId, 'QUESTION_IMAGES_REORDER', {
      questionId,
      sectionId: existingQuestion.section_id,
      testId: existingQuestion.test_id,
      reorderedImages: imageOrders.length,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Images reordered successfully', result, 200);

  } catch (error) {
    console.error('Reorder images service error:', error);
    return generateResponse(false, 'Failed to reorder images', null, 500);
  }
};

// Update question content type
const updateQuestionContentType = async (questionId, contentType, adminId, ipAddress, userAgent) => {
  try {
    const existingQuestion = await QuestionModel.getQuestionById(questionId);
    if (!existingQuestion) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    const validContentTypes = ['text_only', 'single_image', 'multiple_images', 'numbered_images', 'options_only'];
    if (!validContentTypes.includes(contentType)) {
      return generateResponse(false, 'Invalid content type', null, 400);
    }

    const result = await QuestionModel.updateQuestion(questionId, {
      questionContentType: contentType
    }, adminId);

    await logAdminActivity(adminId, 'QUESTION_CONTENT_TYPE_UPDATE', {
      questionId,
      oldContentType: existingQuestion.question_content_type,
      newContentType: contentType,
      sectionId: existingQuestion.section_id,
      testId: existingQuestion.test_id,
      ipAddress,
      userAgent
    });

    return generateResponse(true, 'Question content type updated successfully', result, 200);

  } catch (error) {
    console.error('Update content type service error:', error);
    return generateResponse(false, 'Failed to update content type', null, 500);
  }
};

// Get formatted question with images
const getFormattedQuestion = async (questionId, adminId) => {
  try {
    const question = await QuestionModel.getFormattedQuestion(questionId);
    if (!question) {
      return generateResponse(false, 'Question not found', null, 404);
    }

    const formattedData = {
      ...question,
      options: question.options ? JSON.parse(question.options) : [],
      images: question.images || []
    };

    return generateResponse(true, 'Formatted question retrieved successfully', formattedData, 200);

  } catch (error) {
    console.error('Get formatted question service error:', error);
    return generateResponse(false, 'Failed to retrieve formatted question', null, 500);
  }
};

module.exports = {
  getSectionQuestions,
  createSectionQuestion,
  bulkImportQuestions,
  getQuestionDetails,
  updateQuestionInfo,
  deleteQuestion,
  duplicateQuestion,
  updateQuestionContent,
  updateQuestionImage,
  removeQuestionImage,
  getQuestionPreview,
  reorderSectionQuestions,
  setQuestionNumber,
  setSectionNumbering,
  // Enhanced functions
  createQuestionWithImages,
  updateQuestionWithImages,
  addQuestionImages,
  setQuestionImageNumbers,
  removeQuestionImageById,
  reorderQuestionImages,
  updateQuestionContentType,
  getFormattedQuestion
};