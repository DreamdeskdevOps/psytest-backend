const { getOne, insertOne, updateOne, deleteOne, getMany } = require('../config/database');
const QuestionImages = require('./QuestionImages');

const TABLE_NAME = 'questions';
const VIEW_NAME = 'questions_with_images';

// Map question types to database constraints
const mapQuestionType = (type) => {
  const typeMap = {
    'STANDARD': 'multiple_choice',
    'TEXT': 'multiple_choice',
    'IMAGE': 'image_choice',
    'MIXED': 'multiple_choice',
    'MULTIPLE_CHOICE': 'multiple_choice',
    'SINGLE_CHOICE': 'single_select',
    'TRUE_FALSE': 'true_false',
    'SHORT_ANSWER': 'text_input',
    'ESSAY': 'text_input',
    'FILL_BLANK': 'text_input',
    'standard': 'multiple_choice',
    'text': 'multiple_choice',
    'image': 'image_choice',
    'mixed': 'multiple_choice',
    'multiple_choice': 'multiple_choice',
    'true_false': 'true_false',
    'single_select': 'single_select',
    'multi_select': 'multi_select',
    'likert_scale': 'likert_scale',
    'rating_scale': 'rating_scale',
    'text_input': 'text_input',
    'image_choice': 'image_choice',
    'options_only': 'options_only'
  };
  return typeMap[type] || 'multiple_choice';
};

// Get all questions in a section with complete details including images
const getQuestionsBySection = async (sectionId) => {
  const query = `
    SELECT
      q.id, q.section_id, q.question_text, q.order_index,
      q.custom_number, q.correct_answer,
      q.difficulty_level, q.question_image, q.answer_explanation,
      q.question_type, q.question_content_type, q.question_flag, q.is_active,
      q.created_at, q.updated_at,

      -- Section information for context
      s.section_name, s.answer_pattern, s.scoring_logic,
      s.answer_options as section_answer_options,

      -- Test information
      t.title as test_title, t.test_type,

      -- Question analytics
      (SELECT COUNT(*) FROM user_responses WHERE question_id = q.id) as total_answers,
      (SELECT AVG(CASE WHEN ur.is_correct = true THEN 1.0 ELSE 0.0 END)::DECIMAL(5,2)
       FROM user_responses ur WHERE ur.question_id = q.id) as correct_percentage,

      -- Question difficulty based on performance
      CASE
        WHEN (SELECT AVG(CASE WHEN ur.is_correct = true THEN 1.0 ELSE 0.0 END)
              FROM user_responses ur WHERE ur.question_id = q.id) >= 0.8 THEN 'EASY'
        WHEN (SELECT AVG(CASE WHEN ur.is_correct = true THEN 1.0 ELSE 0.0 END)
              FROM user_responses ur WHERE ur.question_id = q.id) >= 0.5 THEN 'MEDIUM'
        WHEN (SELECT AVG(CASE WHEN ur.is_correct = true THEN 1.0 ELSE 0.0 END)
              FROM user_responses ur WHERE ur.question_id = q.id) < 0.5 THEN 'HARD'
        ELSE q.difficulty_level
      END as performance_difficulty

    FROM ${TABLE_NAME} q
    JOIN test_sections s ON q.section_id = s.id
    JOIN tests t ON s.test_id = t.id
    WHERE q.section_id = $1 AND q.is_active = true
    ORDER BY q.order_index ASC, q.created_at ASC
  `;

  let questions;
  try {
    questions = await getMany(query, [sectionId]);
    console.log('🚀 Questions retrieved with flag support:', questions.length);
    if (questions.length > 0) {
      console.log('🏷️ First question flag data:', {
        id: questions[0].id,
        question_flag: questions[0].question_flag,
        question_text: questions[0].question_text?.substring(0, 30) + '...'
      });
    }
  } catch (error) {
    if (error.message && error.message.includes('question_flag') && error.message.includes('does not exist')) {
      console.log('🏷️ question_flag column does not exist, falling back...');
      // Fallback query without question_flag
      const fallbackQuery = query.replace('q.question_flag,', '');
      questions = await getMany(fallbackQuery, [sectionId]);
      // Add null flag to each question for consistency
      questions = questions.map(q => ({ ...q, question_flag: null }));
      console.log('🏷️ Using fallback query, questions:', questions.length);
    } else {
      throw error;
    }
  }

  if (questions && questions.length > 0) {
    // Get images for all questions
    const questionIds = questions.map(q => q.id);
    const questionsWithImages = await QuestionImages.getQuestionsWithImages(questionIds);

    // Merge images data
    const imagesByQuestionId = {};
    questionsWithImages.forEach(qwi => {
      imagesByQuestionId[qwi.questionId] = qwi.images;
    });

    questions.forEach(question => {
      question.images = imagesByQuestionId[question.id] || [];
    });
  }

  return questions;
};

// Get single question with complete details including images
const getQuestionById = async (questionId) => {
  const query = `
    SELECT
      q.id, q.section_id, q.question_text, q.order_index,
      q.custom_number, q.correct_answer,
      q.difficulty_level, q.question_image, q.answer_explanation,
      q.question_type, q.question_content_type, q.question_flag, q.is_active,
      q.created_at, q.updated_at,
      
      -- Section and test context
      s.section_name, s.answer_pattern, s.scoring_logic,
      s.answer_options as section_answer_options, s.test_id,
      t.title as test_title, t.test_type,
      
      -- Question performance analytics
      (SELECT COUNT(*) FROM user_responses WHERE question_id = q.id) as total_answers,
      (SELECT COUNT(*) FROM user_responses WHERE question_id = q.id AND is_correct = true) as correct_answers,
      (SELECT AVG(time_taken) FROM user_responses WHERE question_id = q.id) as avg_response_time,
      
      -- Related questions in same section
      (SELECT COUNT(*) FROM ${TABLE_NAME} WHERE section_id = q.section_id AND is_active = true) as total_questions_in_section
      
    FROM ${TABLE_NAME} q
    JOIN test_sections s ON q.section_id = s.id
    JOIN tests t ON s.test_id = t.id
    WHERE q.id = $1 AND q.is_active = true
  `;

  let questionData;
  try {
    questionData = await getOne(query, [questionId]);
  } catch (error) {
    if (error.message && error.message.includes('question_flag') && error.message.includes('does not exist')) {
      // Fallback query without question_flag
      const fallbackQuery = query.replace('q.question_flag,', '');
      questionData = await getOne(fallbackQuery, [questionId]);
      // Add null flag for consistency
      if (questionData) {
        questionData.question_flag = null;
      }
    } else {
      throw error;
    }
  }

  if (questionData) {
    // Get associated images
    const images = await QuestionImages.getQuestionImages(questionId);
    questionData.images = images;
  }

  return questionData;
};

// Create new question in section with enhanced support
const createQuestion = async (sectionId, questionData, adminId, transaction = null) => {
  const {
    questionText, questionOrder, questionNumber, options,
    correctAnswer, marks, difficultyLevel, explanation,
    questionType, isRequired = true, questionContentType = 'text_only',
    questionFlag = null, images = []
  } = questionData;

  // Get next question order if not provided
  let finalQuestionOrder = questionOrder;
  if (!finalQuestionOrder) {
    const orderQuery = `
      SELECT COALESCE(MAX(order_index), 0) + 1 as next_order 
      FROM ${TABLE_NAME} WHERE section_id = $1 AND is_active = true
    `;
    const orderResult = await getOne(orderQuery, [sectionId], transaction);
    finalQuestionOrder = orderResult.next_order;
  }

  // Auto-generate question number if not provided
  let finalQuestionNumber = questionNumber;
  if (!finalQuestionNumber) {
    finalQuestionNumber = finalQuestionOrder;
  }

  // Ensure all parameters are properly defined first
  const finalQuestionContentType = questionContentType || 'text_only';
  const finalQuestionType = mapQuestionType(questionType || 'multiple_choice');
  const finalDifficultyLevel = (difficultyLevel || 'medium').toLowerCase();
  const finalCustomNumber = String(finalQuestionNumber || finalQuestionOrder);

  // Handle options_only content type - allow empty question text
  const finalQuestionText = finalQuestionContentType === 'options_only'
    ? (questionText || '')
    : questionText;

  console.log('Creating question with parameters:', {
    sectionId,
    questionText: finalQuestionText?.substring(0, 50) + '...',
    finalQuestionOrder,
    finalCustomNumber,
    correctAnswer,
    finalDifficultyLevel,
    explanation: explanation?.substring(0, 30) + '...',
    finalQuestionType,
    finalQuestionContentType,
    questionFlag: questionFlag || null,
    isActive: true,
    isOptionsOnly: finalQuestionContentType === 'options_only'
  });

  // Try to use query with question_flag, fall back if column doesn't exist
  let query = `
    INSERT INTO ${TABLE_NAME} (
      section_id, question_text, order_index, custom_number,
      correct_answer, difficulty_level, answer_explanation,
      question_type, question_content_type, question_flag, is_active,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING *
  `;

  let values = [
    sectionId,                    // $1
    finalQuestionText,           // $2 - Can be empty for options_only
    finalQuestionOrder,          // $3
    finalCustomNumber,           // $4
    correctAnswer || null,       // $5
    finalDifficultyLevel,        // $6
    explanation || null,         // $7
    finalQuestionType,           // $8
    finalQuestionContentType,    // $9
    questionFlag || null,        // $10 - Optional flag for categorization
    true                         // $11
  ];

  // Validate all parameters are defined
  values.forEach((value, index) => {
    if (value === undefined) {
      console.error(`Parameter $${index + 1} is undefined:`, {
        parameterNumber: index + 1,
        value,
        allValues: values
      });
      throw new Error(`Parameter $${index + 1} is undefined. Cannot execute SQL query.`);
    }
  });

  let createdQuestion;
  try {
    // Try with question_flag column first
    createdQuestion = await insertOne(query, values, transaction);
  } catch (error) {
    if (error.message && error.message.includes('question_flag') && error.message.includes('does not exist')) {
      console.log('question_flag column does not exist, falling back to query without it');

      // Fallback query without question_flag for backward compatibility
      const fallbackQuery = `
        INSERT INTO ${TABLE_NAME} (
          section_id, question_text, order_index, custom_number,
          correct_answer, difficulty_level, answer_explanation,
          question_type, question_content_type, is_active,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING *
      `;

      const fallbackValues = [
        sectionId,                    // $1
        finalQuestionText,           // $2 - Can be empty for options_only
        finalQuestionOrder,          // $3
        finalCustomNumber,           // $4
        correctAnswer || null,       // $5
        finalDifficultyLevel,        // $6
        explanation || null,         // $7
        finalQuestionType,           // $8
        finalQuestionContentType,    // $9
        true                         // $10
      ];

      createdQuestion = await insertOne(fallbackQuery, fallbackValues, transaction);
    } else {
      throw error; // Re-throw if it's not a column missing error
    }
  }

  // If images are provided, create question images
  if (images && images.length > 0 && createdQuestion) {
    try {
      const imagePromises = images.map((imageData, index) =>
        QuestionImages.createQuestionImage(createdQuestion.id, {
          ...imageData,
          displayOrder: imageData.displayOrder || (index + 1)
        }, adminId)
      );
      await Promise.all(imagePromises);
    } catch (imageError) {
      console.error('Error creating question images:', imageError);
      // Continue without failing the question creation
    }
  }

  return createdQuestion;
};

// Update question basic information with enhanced support
const updateQuestion = async (questionId, updateData, adminId) => {
  const {
    questionText, questionNumber, options, correctAnswer,
    marks, difficultyLevel, explanation, questionType, isRequired,
    questionContentType, images, questionFlag
  } = updateData;

  const query = `
    UPDATE ${TABLE_NAME}
    SET
      question_text = COALESCE($2, question_text),
      custom_number = COALESCE($3, custom_number),
      correct_answer = COALESCE($4, correct_answer),
      difficulty_level = COALESCE($5, difficulty_level),
      answer_explanation = COALESCE($6, answer_explanation),
      question_type = COALESCE($7, question_type),
      question_content_type = COALESCE($8, question_content_type),
      question_flag = COALESCE($9, question_flag),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND is_active = true
    RETURNING *
  `;

  const values = [
    questionId,
    questionText ?? null,
    questionNumber ?? null,
    correctAnswer ?? null,
    difficultyLevel ? difficultyLevel.toLowerCase() : null,
    explanation ?? null,
    questionType ? mapQuestionType(questionType) : null,
    questionContentType ?? null,
    questionFlag ?? null
  ];

  console.log('Update query:', query);
  console.log('Update values:', values);
  console.log('Values length:', values.length);

  const updatedQuestion = await updateOne(query, values);

  // Handle images update if provided
  if (images !== undefined && updatedQuestion) {
    try {
      // Delete existing images if replacing all
      if (Array.isArray(images)) {
        await QuestionImages.deleteAllQuestionImages(questionId);

        // Create new images
        if (images.length > 0) {
          const imagePromises = images.map((imageData, index) =>
            QuestionImages.createQuestionImage(questionId, {
              ...imageData,
              displayOrder: imageData.displayOrder || (index + 1)
            }, adminId)
          );
          await Promise.all(imagePromises);
        }
      }
    } catch (imageError) {
      console.error('Error updating question images:', imageError);
    }
  }

  return updatedQuestion;
};

// Update question content (text only)
const updateQuestionContent = async (questionId, questionText, adminId) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET
      question_text = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND is_active = true
    RETURNING id, question_text, updated_at
  `;

  return await updateOne(query, [questionText, questionId]);
};

// Update question image
const updateQuestionImage = async (questionId, imageUrl, adminId) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET
      question_image = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND is_active = true
    RETURNING id, question_image, updated_at
  `;

  return await updateOne(query, [imageUrl, questionId]);
};

// Remove question image
const removeQuestionImage = async (questionId, adminId) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET
      question_image = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND is_active = true
    RETURNING id, question_image, updated_at
  `;

  return await updateOne(query, [questionId]);
};

// Delete question (soft delete)
const deleteQuestion = async (questionId, adminId) => {
  // Get question info before deletion
  const questionInfo = await getQuestionById(questionId);
  if (!questionInfo) return null;

  // Check if question has user answers
  const answerCount = await getOne(
    `SELECT COUNT(*) as count FROM user_responses WHERE question_id = $1`,
    [questionId]
  );

  const query = `
    UPDATE ${TABLE_NAME}
    SET
      is_active = false,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, question_text, is_active
  `;

  const result = await updateOne(query, [questionId]);
  
  return result ? {
    ...result,
    answer_count: answerCount.count,
    section_id: questionInfo.section_id
  } : null;
};

// Duplicate question
const duplicateQuestion = async (originalQuestionId, adminId) => {
  // Get original question
  const originalQuestion = await getQuestionById(originalQuestionId);
  if (!originalQuestion) return null;

  // Create duplicated question
  const duplicatedQuestion = await createQuestion(
    originalQuestion.section_id,
    {
      questionText: `${originalQuestion.question_text} (Copy)`,
      options: originalQuestion.options ? JSON.parse(originalQuestion.options) : [],
      correctAnswer: originalQuestion.correct_answer,
      marks: originalQuestion.marks,
      difficultyLevel: originalQuestion.difficulty_level,
      explanation: originalQuestion.explanation,
      questionType: originalQuestion.question_type,
      isRequired: originalQuestion.is_required
    },
    adminId
  );

  return duplicatedQuestion;
};

// Reorder questions within a section
const reorderQuestions = async (sectionId, questionOrders, adminId) => {
  // questionOrders = [{ questionId, newOrder }, ...]
  
  const updatePromises = questionOrders.map(({ questionId, newOrder }) => {
    const query = `
      UPDATE ${TABLE_NAME}
      SET
        order_index = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND section_id = $3 AND is_active = true
      RETURNING id, question_text, order_index
    `;
    return updateOne(query, [newOrder, questionId, sectionId]);
  });

  return await Promise.all(updatePromises);
};

// Set custom question number
const setQuestionNumber = async (questionId, questionNumber, adminId) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET
      custom_number = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND is_active = true
    RETURNING id, custom_number, updated_at
  `;

  return await updateOne(query, [questionNumber, questionId]);
};

// Get section numbering configuration
const getSectionNumbering = async (sectionId) => {
  const query = `
    SELECT 
      s.id, s.section_name, s.numbering_style, s.numbering_start,
      s.numbering_prefix, s.numbering_suffix,
      COUNT(q.id) as total_questions,
      
      -- Current numbering examples
      array_agg(
        q.order_index ORDER BY q.order_index
      ) FILTER (WHERE q.is_active = true) as current_numbers
      
    FROM test_sections s
    LEFT JOIN ${TABLE_NAME} q ON s.id = q.section_id AND q.is_active = true
    WHERE s.id = $1 AND s.is_active = true
    GROUP BY s.id
  `;

  return await getOne(query, [sectionId]);
};

// Set section numbering style
const setSectionNumbering = async (sectionId, numberingConfig, adminId) => {
  const { numberingStyle, numberingStart, numberingPrefix, numberingSuffix } = numberingConfig;

  const query = `
    UPDATE test_sections
    SET 
      numbering_style = $2,
      numbering_start = $3,
      numbering_prefix = $4,
      numbering_suffix = $5,
      updated_by = $6,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND is_active = true
    RETURNING id, section_name, numbering_style, numbering_start, 
             numbering_prefix, numbering_suffix, updated_at
  `;

  const values = [
    sectionId, numberingStyle || 'NUMERIC', numberingStart || 1,
    numberingPrefix, numberingSuffix, adminId
  ];

  return await updateOne(query, values);
};

// Apply section numbering to all questions
const applyNumberingToQuestions = async (sectionId, adminId) => {
  // Get section numbering config
  const sectionConfig = await getSectionNumbering(sectionId);
  if (!sectionConfig) return null;

  // Get all questions in order
  const questions = await getMany(
    `SELECT id, order_index FROM ${TABLE_NAME} 
     WHERE section_id = $1 AND is_active = true 
     ORDER BY order_index ASC`,
    [sectionId]
  );

  const { numbering_style, numbering_start, numbering_prefix, numbering_suffix } = sectionConfig;

  // Generate new numbers based on style
  const updatePromises = questions.map((question, index) => {
    let newNumber;
    
    switch (numbering_style) {
      case 'NUMERIC':
        newNumber = `${numbering_prefix || ''}${(numbering_start || 1) + index}${numbering_suffix || ''}`;
        break;
      case 'ALPHA_LOWER':
        newNumber = `${numbering_prefix || ''}${String.fromCharCode(97 + index)}${numbering_suffix || ''}`;
        break;
      case 'ALPHA_UPPER':
        newNumber = `${numbering_prefix || ''}${String.fromCharCode(65 + index)}${numbering_suffix || ''}`;
        break;
      case 'ROMAN_LOWER':
        newNumber = `${numbering_prefix || ''}${toRoman(index + (numbering_start || 1)).toLowerCase()}${numbering_suffix || ''}`;
        break;
      case 'ROMAN_UPPER':
        newNumber = `${numbering_prefix || ''}${toRoman(index + (numbering_start || 1))}${numbering_suffix || ''}`;
        break;
      default:
        newNumber = `${(numbering_start || 1) + index}`;
    }

    return setQuestionNumber(question.id, newNumber, adminId);
  });

  return await Promise.all(updatePromises);
};

// Helper function to convert to Roman numerals
const toRoman = (num) => {
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

// Validate question data according to section pattern
const validateQuestionForSection = async (questionData, sectionId) => {
  // Get section info for validation
  const section = await getOne(
    `SELECT answer_pattern, answer_options, scoring_logic FROM test_sections WHERE id = $1`,
    [sectionId]
  );

  if (!section) return ['Section not found'];

  const errors = [];
  const { options, correctAnswer } = questionData;
  
  // Handle options - they might be objects or strings
  const optionTexts = Array.isArray(options)
    ? options.map(opt => typeof opt === 'string' ? opt : opt?.text || opt)
    : [];

  // Validate based on answer pattern
  switch (section.answer_pattern) {
    case 'MULTIPLE_CHOICE':
      if (!options || !Array.isArray(options) || options.length !== section.answer_options) {
        errors.push(`Multiple choice questions must have exactly ${section.answer_options} options`);
      }
      if (correctAnswer && !optionTexts.includes(correctAnswer)) {
        errors.push('Correct answer must be one of the provided options');
      }
      break;

    case 'YES_NO':
      if (!options || options.length !== 2 || !optionTexts.includes('Yes') || !optionTexts.includes('No')) {
        errors.push('Yes/No questions must have exactly two options: "Yes" and "No"');
      }
      if (correctAnswer && !['Yes', 'No'].includes(correctAnswer)) {
        errors.push('Correct answer must be either "Yes" or "No"');
      }
      break;

    case 'ODD_EVEN':
      // For odd/even patterns, options are usually the same across all questions
      if (!options || options.length < 2) {
        errors.push('Odd/Even pattern questions must have at least 2 options');
      }
      break;

    case 'LIKERT_SCALE':
      if (!options || options.length !== section.answer_options) {
        errors.push(`Likert scale questions must have exactly ${section.answer_options} scale points`);
      }
      break;
  }

  return errors;
};

// Enhanced functions for multi-image support

// Create question with multiple images
const createQuestionWithImages = async (sectionId, questionData, imageFiles, adminId) => {
  const createdQuestion = await createQuestion(sectionId, questionData, adminId);

  if (imageFiles && imageFiles.length > 0) {
    const fileStorageService = require('../services/fileStorageService');
    const result = await fileStorageService.saveQuestionImages(
      imageFiles,
      createdQuestion.id,
      {
        uploadedBy: adminId,
        uploadedByType: 'admin'
      }
    );

    // Create question image records
    if (result.savedFiles.length > 0) {
      const imagePromises = result.savedFiles.map((file, index) =>
        QuestionImages.createQuestionImage(createdQuestion.id, {
          imageUrl: file.fileUrl,
          imageFilename: file.filename,
          displayOrder: index + 1,
          fileSize: file.fileSize,
          mimeType: file.mimeType
        }, adminId)
      );
      await Promise.all(imagePromises);
    }
  }

  return await getQuestionById(createdQuestion.id);
};

// Update question with images (identical to create)
const updateQuestionWithImages = async (questionId, questionData, imageFiles, adminId) => {
  // First update the basic question data
  const updatedQuestion = await updateQuestion(questionId, questionData, adminId);

  if (imageFiles && imageFiles.length > 0) {
    // Remove existing images first
    await removeQuestionImages(questionId, adminId);

    // Add new images using the same logic as create
    const fileStorageService = require('../services/fileStorageService');
    const result = await fileStorageService.saveQuestionImages(
      imageFiles,
      questionId,
      {
        uploadedBy: adminId,
        uploadedByType: 'admin'
      }
    );

    // Create question image records
    if (result.savedFiles.length > 0) {
      const imagePromises = result.savedFiles.map((file, index) =>
        QuestionImages.createQuestionImage(questionId, {
          imageUrl: file.fileUrl,
          imageFilename: file.filename,
          displayOrder: index + 1,
          fileSize: file.fileSize,
          mimeType: file.mimeType
        }, adminId)
      );
      await Promise.all(imagePromises);
    }
  }

  return await getQuestionById(questionId);
};

// Add images to existing question
const addQuestionImages = async (questionId, imageFiles, adminId) => {
  const fileStorageService = require('../services/fileStorageService');
  const result = await fileStorageService.saveQuestionImages(
    imageFiles,
    questionId,
    {
      uploadedBy: adminId,
      uploadedByType: 'admin'
    }
  );

  if (result.savedFiles.length > 0) {
    // Get current max order
    const existingImages = await QuestionImages.getQuestionImages(questionId);
    const maxOrder = existingImages.length > 0
      ? Math.max(...existingImages.map(img => img.display_order))
      : 0;

    const imagePromises = result.savedFiles.map((file, index) =>
      QuestionImages.createQuestionImage(questionId, {
        imageUrl: file.fileUrl,
        imageFilename: file.filename,
        displayOrder: maxOrder + index + 1,
        fileSize: file.fileSize,
        mimeType: file.mimeType
      }, adminId)
    );
    await Promise.all(imagePromises);
  }

  return result;
};

// Update question content type based on images
const updateQuestionContentType = async (questionId, adminId) => {
  const images = await QuestionImages.getQuestionImages(questionId);
  let contentType = 'text_only';

  if (images.length === 1) {
    contentType = 'single_image';
  } else if (images.length > 1) {
    // Check if images have numbers
    const hasNumbers = images.some(img => img.image_number);
    contentType = hasNumbers ? 'numbered_images' : 'multiple_images';
  }

  const query = `
    UPDATE ${TABLE_NAME}
    SET question_content_type = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND is_active = true
    RETURNING question_content_type
  `;

  return await updateOne(query, [contentType, questionId]);
};

// Set numbered images
const setQuestionImageNumbers = async (questionId, imageNumberMap, adminId) => {
  const result = await QuestionImages.setNumberedImages(questionId, imageNumberMap);

  // Update question content type to numbered_images
  await updateQuestionContentType(questionId, adminId);

  return result;
};

// Remove image from question
const removeQuestionImageById = async (questionId, imageId, adminId) => {
  const result = await QuestionImages.deleteQuestionImage(imageId);

  // Update content type based on remaining images
  await updateQuestionContentType(questionId, adminId);

  return result;
};

// Get question with formatted images for different content types
const getFormattedQuestion = async (questionId) => {
  const question = await getQuestionById(questionId);

  if (!question) return null;

  // Format images based on content type
  switch (question.question_content_type) {
    case 'numbered_images':
      question.images.sort((a, b) => {
        const numA = parseInt(a.image_number) || 0;
        const numB = parseInt(b.image_number) || 0;
        return numA - numB;
      });
      break;

    case 'multiple_images':
    case 'single_image':
      question.images.sort((a, b) => a.display_order - b.display_order);
      break;

    default:
      break;
  }

  return question;
};

module.exports = {
  getQuestionsBySection,
  getQuestionById,
  createQuestion,
  updateQuestion,
  updateQuestionContent,
  updateQuestionImage,
  removeQuestionImage,
  deleteQuestion,
  duplicateQuestion,
  reorderQuestions,
  setQuestionNumber,
  getSectionNumbering,
  setSectionNumbering,
  applyNumberingToQuestions,
  validateQuestionForSection,
  // Enhanced functions
  createQuestionWithImages,
  updateQuestionWithImages,
  addQuestionImages,
  updateQuestionContentType,
  setQuestionImageNumbers,
  removeQuestionImageById,
  getFormattedQuestion
};