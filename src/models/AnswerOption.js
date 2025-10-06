const { getOne, insertOne, updateOne, deleteOne, getMany } = require('../config/database');

const TABLE_NAME = 'answer_options';

// Get all answer options for a question
const getQuestionOptions = async (questionId) => {
  const query = `
    SELECT
      ao.id, ao.question_id, ao.option_text, ao.option_value,
      ao.order_index as option_order, ao.is_correct,
      'STANDARD' as option_type, true as is_active,
      ao.created_at, ao.updated_at,

      -- Question context for validation
      q.question_text, q.question_type,
      s.answer_pattern, s.answer_options as section_option_count,
      s.scoring_logic,

      -- Option analytics
      (SELECT COUNT(*) FROM user_responses WHERE question_id = ao.question_id AND selected_answer = ao.option_text) as selection_count,
      (SELECT COUNT(*) FROM user_responses WHERE question_id = ao.question_id) as total_responses,

      -- Calculate selection percentage
      CASE
        WHEN (SELECT COUNT(*) FROM user_responses WHERE question_id = ao.question_id) > 0 THEN
          ROUND((SELECT COUNT(*) FROM user_responses WHERE question_id = ao.question_id AND selected_answer = ao.option_text)::DECIMAL * 100 /
                (SELECT COUNT(*) FROM user_responses WHERE question_id = ao.question_id), 2)
        ELSE 0
      END as selection_percentage

    FROM ${TABLE_NAME} ao
    JOIN questions q ON ao.question_id = q.id
    JOIN test_sections s ON q.section_id = s.id
    WHERE ao.question_id = $1
    ORDER BY ao.order_index ASC, ao.created_at ASC
  `;

  return await getMany(query, [questionId]);
};

// Get single answer option details
const getOptionById = async (optionId) => {
  const query = `
    SELECT
      ao.id, ao.question_id, ao.option_text, ao.option_value,
      ao.order_index as option_order, ao.is_correct,
      'STANDARD' as option_type, true as is_active,
      ao.created_at, ao.updated_at,

      -- Question and section context
      q.question_text, q.question_type,
      s.answer_pattern, s.answer_options as section_option_count,
      s.scoring_logic, s.section_name,
      t.title as test_title,

      -- Usage analytics
      (SELECT COUNT(*) FROM user_responses WHERE question_id = ao.question_id AND selected_answer = ao.option_text) as times_selected,
      (SELECT COUNT(*) FROM user_responses WHERE question_id = ao.question_id) as total_question_responses

    FROM ${TABLE_NAME} ao
    JOIN questions q ON ao.question_id = q.id
    JOIN test_sections s ON q.section_id = s.id
    JOIN tests t ON s.test_id = t.id
    WHERE ao.id = $1
  `;

  return await getOne(query, [optionId]);
};

// Add new answer option to question
const addAnswerOption = async (questionId, optionData, adminId) => {
  const {
    optionText, optionValue, optionOrder, isCorrect = false,
    optionType = 'STANDARD'
  } = optionData;

  // Get next option order if not provided
  let finalOptionOrder = optionOrder;
  if (!finalOptionOrder) {
    const orderQuery = `
      SELECT COALESCE(MAX(order_index), 0) + 1 as next_order
      FROM ${TABLE_NAME} WHERE question_id = $1
    `;
    const orderResult = await getOne(orderQuery, [questionId]);
    finalOptionOrder = orderResult.next_order;
  }

  const query = `
    INSERT INTO ${TABLE_NAME} (
      question_id, option_text, option_value, order_index,
      is_correct, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING *
  `;

  const values = [
    questionId, optionText, optionValue || optionText,
    finalOptionOrder, isCorrect
  ];

  return await insertOne(query, values);
};

// Update answer option
const updateAnswerOption = async (optionId, updateData, adminId) => {
  const {
    optionText, optionValue, isCorrect, optionType
  } = updateData;

  const query = `
    UPDATE ${TABLE_NAME}
    SET
      option_text = COALESCE($2, option_text),
      option_value = COALESCE($3, option_value),
      is_correct = COALESCE($4, is_correct),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;

  const values = [
    optionId,
    optionText || null,
    optionValue || null,
    isCorrect !== undefined ? isCorrect : null
  ];

  return await getOne(query, values);
};

// Delete answer option (soft delete)
const deleteAnswerOption = async (optionId, adminId) => {
  // Get option info before deletion
  const optionInfo = await getOptionById(optionId);
  if (!optionInfo) return null;

  // Check if option has user responses
  const responseCount = await getOne(
    `SELECT COUNT(*) as count FROM user_responses WHERE question_id = $1 AND selected_answer = $2`,
    [optionInfo.question_id, optionInfo.option_text]
  );

  const query = `
    UPDATE ${TABLE_NAME}
    SET 
      is_active = false,
      deleted_by = $2,
      deleted_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, option_text, is_active
  `;

  const result = await getOne(query, [optionId, adminId]);
  
  return result ? {
    ...result,
    response_count: responseCount.count,
    question_id: optionInfo.question_id
  } : null;
};

// Reorder answer options for a question
const reorderQuestionOptions = async (questionId, optionOrders, adminId) => {
  // optionOrders = [{ optionId, newOrder }, ...]
  
  const updatePromises = optionOrders.map(({ optionId, newOrder }) => {
    const query = `
      UPDATE ${TABLE_NAME}
      SET 
        option_order = $2,
        updated_by = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND question_id = $4 AND is_active = true
      RETURNING id, option_text, option_order
    `;
    return getOne(query, [optionId, newOrder, adminId, questionId]);
  });

  return await Promise.all(updatePromises);
};

// Get available option types for different answer patterns
const getAvailableOptionTypes = async () => {
  const optionTypes = [
    {
      type: 'YES_NO',
      name: 'Yes/No',
      description: 'Binary yes or no questions',
      defaultOptions: ['Yes', 'No'],
      minOptions: 2,
      maxOptions: 2,
      allowsCorrectAnswer: false,
      useCases: ['Preferences', 'Binary decisions', 'Fact checking']
    },
    {
      type: 'MULTIPLE_CHOICE',
      name: 'Multiple Choice',
      description: 'Single correct answer from multiple options',
      defaultOptions: ['Option A', 'Option B', 'Option C', 'Option D'],
      minOptions: 2,
      maxOptions: 6,
      allowsCorrectAnswer: true,
      useCases: ['Knowledge tests', 'Aptitude tests', 'Skill assessments']
    },
    {
      type: 'LIKERT_SCALE',
      name: 'Likert Scale',
      description: 'Rating scale for agreement or frequency',
      defaultOptions: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
      minOptions: 3,
      maxOptions: 10,
      allowsCorrectAnswer: false,
      useCases: ['Surveys', 'Personality tests', 'Attitude measurement']
    },
    {
      type: 'ODD_EVEN',
      name: 'Odd/Even Pattern',
      description: 'Alternating pattern for personality assessments',
      defaultOptions: ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree'],
      minOptions: 2,
      maxOptions: 7,
      allowsCorrectAnswer: false,
      useCases: ['Personality tests', 'Behavioral assessments', 'MBTI-style tests']
    },
    {
      type: 'TRUE_FALSE',
      name: 'True/False',
      description: 'Binary true or false questions',
      defaultOptions: ['True', 'False'],
      minOptions: 2,
      maxOptions: 2,
      allowsCorrectAnswer: true,
      useCases: ['Knowledge tests', 'Fact checking', 'Quick assessments']
    },
    {
      type: 'RATING_SCALE',
      name: 'Rating Scale',
      description: 'Numeric rating scale',
      defaultOptions: ['1', '2', '3', '4', '5'],
      minOptions: 3,
      maxOptions: 10,
      allowsCorrectAnswer: false,
      useCases: ['Quality ratings', 'Performance evaluations', 'Satisfaction surveys']
    },
    {
      type: 'FREQUENCY_SCALE',
      name: 'Frequency Scale',
      description: 'How often something occurs',
      defaultOptions: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
      minOptions: 3,
      maxOptions: 7,
      allowsCorrectAnswer: false,
      useCases: ['Behavioral frequency', 'Habit tracking', 'Activity assessment']
    },
    {
      type: 'WEIGHTED',
      name: 'Weighted Scale',
      description: 'Weighted response options for scoring',
      defaultOptions: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
      minOptions: 3,
      maxOptions: 10,
      allowsCorrectAnswer: false,
      useCases: ['Personality tests', 'Weighted assessments', 'Scored evaluations']
    }
  ];

  return optionTypes;
};

// Set question option type and generate default options
const setQuestionOptionType = async (questionId, optionType, customOptions = null, adminId) => {
  // Get available option types
  const availableTypes = await getAvailableOptionTypes();
  const selectedType = availableTypes.find(type => type.type === optionType);

  if (!selectedType) {
    throw new Error(`Invalid option type: ${optionType}`);
  }

  // Clear existing options
  await deleteOne(`DELETE FROM ${TABLE_NAME} WHERE question_id = $1`, [questionId]);

  // Use custom options or default options
  const optionsToCreate = customOptions || selectedType.defaultOptions;

  // Create new options
  const optionPromises = optionsToCreate.map((optionText, index) => {
    return addAnswerOption(questionId, {
      optionText: optionText,
      optionValue: optionText,
      optionOrder: index + 1,
      isCorrect: false,
      optionType: 'STANDARD'
    }, adminId);
  });

  const createdOptions = await Promise.all(optionPromises);

  // Note: Removed options column update as it doesn't exist in questions table
  // Answer options are now managed in the separate answer_options table

  return {
    questionId: questionId,
    optionType: optionType,
    optionsCount: optionsToCreate.length,
    options: createdOptions
  };
};

// Set correct answer for a question
const setCorrectAnswer = async (questionId, correctAnswerText, adminId) => {
  // First, clear all correct answers for this question
  await updateOne(
    `UPDATE ${TABLE_NAME} SET is_correct = false, updated_by = $2, updated_at = CURRENT_TIMESTAMP 
     WHERE question_id = $1 AND is_active = true`,
    [questionId, adminId]
  );

  // Set the new correct answer
  const query = `
    UPDATE ${TABLE_NAME}
    SET 
      is_correct = true,
      updated_by = $3,
      updated_at = CURRENT_TIMESTAMP
    WHERE question_id = $1 AND option_text = $2 AND is_active = true
    RETURNING *
  `;

  const result = await getOne(query, [questionId, correctAnswerText, adminId]);

  // Also update the question's correct_answer field
  if (result) {
    await updateOne(
      `UPDATE questions SET correct_answer = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [questionId, correctAnswerText, adminId]
    );
  }

  return result;
};

// Set answer pattern for question (affects scoring logic)
const setAnswerPattern = async (questionId, answerPattern, patternConfig = {}, adminId) => {
  const allowedPatterns = ['ODD_EVEN', 'STANDARD', 'WEIGHTED', 'REVERSE_SCORED'];

  if (!allowedPatterns.includes(answerPattern)) {
    throw new Error(`Invalid answer pattern: ${answerPattern}`);
  }

  // Get the question and its section to update the section's answer pattern
  const questionInfo = await getOne(
    `SELECT q.id, q.section_id, q.question_text, s.answer_pattern
     FROM questions q
     JOIN test_sections s ON q.section_id = s.id
     WHERE q.id = $1`,
    [questionId]
  );

  if (!questionInfo) {
    throw new Error('Question not found');
  }

  // Update the section's answer pattern (since answer_pattern is stored at section level)
  const query = `
    UPDATE test_sections
    SET
      answer_pattern = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, section_name, answer_pattern
  `;

  const result = await getOne(query, [
    questionInfo.section_id,
    answerPattern
  ]);

  // Return question context with updated pattern info
  return {
    questionId: questionId,
    questionText: questionInfo.question_text,
    sectionId: questionInfo.section_id,
    answerPattern: answerPattern,
    patternConfig: patternConfig,
    sectionInfo: result
  };
};

// Validate options against section pattern
const validateOptionsForSection = async (questionId, options) => {
  // Get section info
  const sectionQuery = `
    SELECT s.answer_pattern, s.answer_options, s.scoring_logic
    FROM test_sections s
    JOIN questions q ON s.id = q.section_id
    WHERE q.id = $1
  `;
  
  const section = await getOne(sectionQuery, [questionId]);
  if (!section) return ['Question not found'];

  const errors = [];

  // Validate based on section answer pattern
  switch (section.answer_pattern) {
    case 'YES_NO':
      if (options.length !== 2) {
        errors.push('Yes/No questions must have exactly 2 options');
      }
      if (!options.includes('Yes') || !options.includes('No')) {
        errors.push('Yes/No questions must have "Yes" and "No" options');
      }
      break;

    case 'MULTIPLE_CHOICE':
      if (options.length !== section.answer_options) {
        errors.push(`Multiple choice questions must have exactly ${section.answer_options} options`);
      }
      if (options.length < 2 || options.length > 6) {
        errors.push('Multiple choice questions must have between 2 and 6 options');
      }
      break;

    case 'LIKERT_SCALE':
      if (options.length !== section.answer_options) {
        errors.push(`Likert scale questions must have exactly ${section.answer_options} scale points`);
      }
      break;

    case 'ODD_EVEN':
      if (options.length < 2 || options.length > 7) {
        errors.push('Odd/Even pattern questions must have between 2 and 7 options');
      }
      break;

    case 'TRUE_FALSE':
      if (options.length !== 2) {
        errors.push('True/False questions must have exactly 2 options');
      }
      if (!options.includes('True') || !options.includes('False')) {
        errors.push('True/False questions must have "True" and "False" options');
      }
      break;
  }

  return errors;
};

module.exports = {
  getQuestionOptions,
  getOptionById,
  addAnswerOption,
  updateAnswerOption,
  deleteAnswerOption,
  reorderQuestionOptions,
  getAvailableOptionTypes,
  setQuestionOptionType,
  setCorrectAnswer,
  setAnswerPattern,
  validateOptionsForSection
};