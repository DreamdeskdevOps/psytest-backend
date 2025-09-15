const { getOne, insertOne, updateOne, deleteOne, getMany } = require('../config/database');

const TABLE_NAME = 'questions';

// Map question types to database constraints
const mapQuestionType = (type) => {
  const typeMap = {
    'STANDARD': 'text',
    'TEXT': 'text',
    'IMAGE': 'image',
    'MIXED': 'mixed',
    'standard': 'text',
    'text': 'text',
    'image': 'image',
    'mixed': 'mixed'
  };
  return typeMap[type] || 'text';
};

// Get all questions in a section with complete details
const getQuestionsBySection = async (sectionId) => {
  const query = `
    SELECT
      q.id, q.section_id, q.question_text, q.order_index,
      q.custom_number, q.correct_answer,
      q.difficulty_level, q.question_image, q.answer_explanation,
      q.question_type, q.is_active,
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
  
  return await getMany(query, [sectionId]);
};

// Get single question with complete details
const getQuestionById = async (questionId) => {
  const query = `
    SELECT
      q.id, q.section_id, q.question_text, q.order_index,
      q.custom_number, q.correct_answer,
      q.difficulty_level, q.question_image, q.answer_explanation,
      q.question_type, q.is_active,
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
  
  return await getOne(query, [questionId]);
};

// Create new question in section
const createQuestion = async (sectionId, questionData, adminId) => {
  const {
    questionText, questionOrder, questionNumber, options,
    correctAnswer, marks, difficultyLevel, explanation,
    questionType, isRequired = true
  } = questionData;

  // Get next question order if not provided
  let finalQuestionOrder = questionOrder;
  if (!finalQuestionOrder) {
    const orderQuery = `
      SELECT COALESCE(MAX(order_index), 0) + 1 as next_order 
      FROM ${TABLE_NAME} WHERE section_id = $1 AND is_active = true
    `;
    const orderResult = await getOne(orderQuery, [sectionId]);
    finalQuestionOrder = orderResult.next_order;
  }

  // Auto-generate question number if not provided
  let finalQuestionNumber = questionNumber;
  if (!finalQuestionNumber) {
    finalQuestionNumber = finalQuestionOrder;
  }

  const query = `
    INSERT INTO ${TABLE_NAME} (
      section_id, question_text, order_index, custom_number,
      correct_answer, difficulty_level, answer_explanation,
      question_type, is_active,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING *
  `;

  const values = [
    sectionId,
    questionText,
    finalQuestionOrder,
    String(finalQuestionNumber || finalQuestionOrder),
    correctAnswer || null,
    (difficultyLevel || 'medium').toLowerCase(),
    explanation || null,
    mapQuestionType(questionType || 'text'),
    true
  ];

  return await insertOne(query, values);
};

// Update question basic information
const updateQuestion = async (questionId, updateData, adminId) => {
  const {
    questionText, questionNumber, options, correctAnswer,
    marks, difficultyLevel, explanation, questionType, isRequired
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
    questionType ? mapQuestionType(questionType) : null
  ];

  console.log('Update query:', query);
  console.log('Update values:', values);
  console.log('Values length:', values.length);

  return await updateOne(query, values);
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
  
  // Validate based on answer pattern
  switch (section.answer_pattern) {
    case 'MULTIPLE_CHOICE':
      if (!options || !Array.isArray(options) || options.length !== section.answer_options) {
        errors.push(`Multiple choice questions must have exactly ${section.answer_options} options`);
      }
      if (!correctAnswer || !options.includes(correctAnswer)) {
        errors.push('Correct answer must be one of the provided options');
      }
      break;
      
    case 'YES_NO':
      if (!options || options.length !== 2 || !options.includes('Yes') || !options.includes('No')) {
        errors.push('Yes/No questions must have exactly two options: "Yes" and "No"');
      }
      if (!['Yes', 'No'].includes(correctAnswer)) {
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
  validateQuestionForSection
};