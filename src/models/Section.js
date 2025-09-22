const { getOne, insertOne, updateOne, deleteOne, getMany } = require('../config/database');

const TABLE_NAME = 'test_sections';

// Get all sections for a specific test
const getSectionsByTestId = async (testId) => {
  const query = `
    SELECT 
      s.id, s.test_id, s.section_name, s.section_order, 
      s.question_count, s.scoring_logic, s.answer_pattern, 
      s.answer_options, s.max_score, s.time_limit_minutes,
      s.instructions, s.custom_scoring_config, s.is_active,
      s.created_at, s.updated_at,
      
      -- Count actual questions in this section
      (SELECT COUNT(*) FROM questions WHERE section_id = s.id AND is_active = true) as actual_question_count,
      
      -- Section performance data
      (SELECT AVG(marks_obtained)::DECIMAL(5,2) FROM user_responses
       WHERE section_id = s.id) as avg_section_score,

      -- Section completion data
      (SELECT COUNT(DISTINCT user_id) FROM user_responses
       WHERE section_id = s.id) as total_attempts
       
    FROM ${TABLE_NAME} s
    WHERE s.test_id = $1 AND s.is_active = true
    ORDER BY s.section_order ASC, s.created_at ASC
  `;
  
  return await getMany(query, [testId]);
};

// Get single section details with complete configuration
const getSectionById = async (sectionId) => {
  const query = `
    SELECT 
      s.id, s.test_id, s.section_name, s.section_order,
      s.question_count, s.scoring_logic, s.answer_pattern,
      s.answer_options, s.max_score, s.time_limit_minutes,
      s.instructions, s.custom_scoring_config, s.is_active,
      s.created_at, s.updated_at,
      
      -- Test information
      t.title as test_title, t.test_type, t.is_active as test_is_active,
      
      -- Question count and details
      (SELECT COUNT(*) FROM questions WHERE section_id = s.id AND is_active = true) as actual_question_count,
      
      -- Section analytics
      (SELECT AVG(marks_obtained)::DECIMAL(5,2) FROM user_responses WHERE section_id = s.id) as avg_score,
      (SELECT COUNT(DISTINCT user_id) FROM user_responses WHERE section_id = s.id) as unique_attempts,
      (SELECT MAX(answered_at) FROM user_responses WHERE section_id = s.id) as last_attempt_date,
      
      -- Pattern configuration details
      CASE s.answer_pattern
        WHEN 'ODD_EVEN' THEN json_build_object(
          'type', 'ODD_EVEN',
          'description', 'Questions alternate between two scoring categories',
          'scoring_method', 'Higher score wins per category'
        )
        WHEN 'MULTIPLE_CHOICE' THEN json_build_object(
          'type', 'MULTIPLE_CHOICE',
          'options_count', s.answer_options,
          'description', 'Standard multiple choice questions'
        )
        WHEN 'YES_NO' THEN json_build_object(
          'type', 'YES_NO', 
          'description', 'Binary yes/no questions'
        )
        WHEN 'LIKERT_SCALE' THEN json_build_object(
          'type', 'LIKERT_SCALE',
          'scale_points', s.answer_options,
          'description', 'Rating scale questions'
        )
        ELSE json_build_object('type', s.answer_pattern)
      END as pattern_details
      
    FROM ${TABLE_NAME} s
    JOIN tests t ON s.test_id = t.id
    WHERE s.id = $1 AND s.is_active = true
  `;
  
  return await getOne(query, [sectionId]);
};

// Create new section for a test
const createSection = async (testId, sectionData, adminId) => {
  const {
    sectionName, sectionOrder, questionCount, scoringLogic,
    answerPattern, answerOptions, maxScore, timeLimitMinutes,
    instructions, customScoringConfig = {}
  } = sectionData;

  // Get next section order if not provided
  let finalSectionOrder = sectionOrder;
  if (!finalSectionOrder) {
    const orderQuery = `
      SELECT COALESCE(MAX(section_order), 0) + 1 as next_order 
      FROM ${TABLE_NAME} WHERE test_id = $1 AND is_active = true
    `;
    const orderResult = await getOne(orderQuery, [testId]);
    finalSectionOrder = orderResult.next_order;
  }

  const query = `
    INSERT INTO ${TABLE_NAME} (
      test_id, title, section_name, order_index, section_order, question_count,
      scoring_logic, answer_pattern, answer_options, max_score,
      time_limit_minutes, instructions, custom_scoring_config,
      is_active, created_by, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING *
  `;

  const values = [
    testId,
    sectionName,
    sectionName,
    finalSectionOrder, // order_index
    finalSectionOrder, // section_order
    questionCount,
    scoringLogic,
    answerPattern,
    answerOptions || null,
    maxScore,
    timeLimitMinutes,
    instructions,
    JSON.stringify(customScoringConfig || {}),
    true,
    adminId
  ];

  return await insertOne(query, values);
};

// Update section basic information
const updateSection = async (sectionId, updateData, adminId) => {
  const {
    sectionName, questionCount, scoringLogic, answerPattern,
    answerOptions, maxScore, instructions, customScoringConfig
  } = updateData;

  const query = `
    UPDATE ${TABLE_NAME}
    SET 
      section_name = COALESCE($2, section_name),
      question_count = COALESCE($3, question_count),
      scoring_logic = COALESCE($4, scoring_logic),
      answer_pattern = COALESCE($5, answer_pattern),
      answer_options = COALESCE($6, answer_options),
      max_score = COALESCE($7, max_score),
      instructions = COALESCE($8, instructions),
      custom_scoring_config = COALESCE($9, custom_scoring_config),
      updated_by = $10,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND is_active = true
    RETURNING *
  `;

  const values = [
    sectionId,                  // ? in WHERE id = ?
    sectionName || null,        // ? in section_name = COALESCE(?, ...)
    questionCount || null,      // ? in question_count = COALESCE(?, ...)
    scoringLogic || null,       // ? in scoring_logic = COALESCE(?, ...)
    answerPattern || null,      // ? in answer_pattern = COALESCE(?, ...)
    answerOptions || null,      // ? in answer_options = COALESCE(?, ...)
    maxScore || null,           // ? in max_score = COALESCE(?, ...)
    instructions || null,       // ? in instructions = COALESCE(?, ...)
    customScoringConfig ? JSON.stringify(customScoringConfig) : null, // ? in custom_scoring_config = COALESCE(?, ...)
    adminId                     // ? in updated_by = ?
  ];

  return await getOne(query, values);
};

// Update section timing
const updateSectionTiming = async (sectionId, timeLimitMinutes, adminId) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET
      time_limit_minutes = $1,
      updated_by = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $3 AND is_active = true
    RETURNING id, section_name, time_limit_minutes, updated_at
  `;

  return await getOne(query, [timeLimitMinutes, adminId, sectionId]);
};

// Get section timing details
const getSectionTiming = async (sectionId) => {
  const query = `
    SELECT 
      s.id, s.section_name, s.time_limit_minutes, s.question_count,
      s.updated_at, s.updated_by,
      
      -- Calculate average time per question
      CASE 
        WHEN s.time_limit_minutes IS NOT NULL AND s.question_count > 0 
        THEN (s.time_limit_minutes::DECIMAL / s.question_count)::DECIMAL(5,2)
        ELSE NULL
      END as avg_time_per_question,
      
      -- Test duration for reference
      t.total_duration as test_total_duration,
      
      -- Other sections timing summary
      (SELECT SUM(time_limit_minutes) FROM ${TABLE_NAME} 
       WHERE test_id = s.test_id AND id != s.id AND is_active = true) as other_sections_time
       
    FROM ${TABLE_NAME} s
    JOIN tests t ON s.test_id = t.id
    WHERE s.id = $1 AND s.is_active = true
  `;

  return await getOne(query, [sectionId]);
};

// Delete section (soft delete)
const deleteSection = async (sectionId, adminId) => {
  // Get section info before deletion
  const sectionInfo = await getSectionById(sectionId);
  if (!sectionInfo) return null;

  // Check if section has questions
  const questionCount = await getOne(
    `SELECT COUNT(*) as count FROM questions WHERE section_id = $1 AND is_active = true`,
    [sectionId]
  );

  const query = `
    UPDATE ${TABLE_NAME}
    SET
      is_active = false,
      deleted_by = $1,
      deleted_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id, section_name, is_active
  `;

  const result = await getOne(query, [adminId, sectionId]);
  
  return result ? {
    ...result,
    question_count: questionCount.count,
    test_id: sectionInfo.test_id
  } : null;
};

// Duplicate section
const duplicateSection = async (originalSectionId, newSectionName, adminId) => {
  // Get original section
  const originalSection = await getSectionById(originalSectionId);
  if (!originalSection) return null;

  // Create duplicated section
  const duplicatedSection = await createSection(
    originalSection.test_id,
    {
      sectionName: newSectionName || `${originalSection.section_name} (Copy)`,
      questionCount: originalSection.question_count,
      scoringLogic: originalSection.scoring_logic,
      answerPattern: originalSection.answer_pattern,
      answerOptions: originalSection.answer_options,
      maxScore: originalSection.max_score,
      timeLimitMinutes: originalSection.time_limit_minutes,
      instructions: originalSection.instructions,
      customScoringConfig: originalSection.custom_scoring_config || {}
    },
    adminId
  );

  return duplicatedSection;
};

// Reorder sections within a test
const reorderSections = async (testId, sectionOrders, adminId) => {
  // sectionOrders = [{ sectionId, newOrder }, ...]
  
  const updatePromises = sectionOrders.map(({ sectionId, newOrder }) => {
    const query = `
      UPDATE ${TABLE_NAME}
      SET
        section_order = $1,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND test_id = $4 AND is_active = true
      RETURNING id, section_name, section_order
    `;
    return getOne(query, [newOrder, adminId, sectionId, testId]);
  });

  return await Promise.all(updatePromises);
};

// Bulk update sections
const bulkUpdateSections = async (updates, adminId) => {
  // updates = [{ sectionId, updateData }, ...]
  
  const results = [];
  const errors = [];

  for (const { sectionId, updateData } of updates) {
    try {
      const result = await updateSection(sectionId, updateData, adminId);
      if (result) {
        results.push({ sectionId, success: true, data: result });
      } else {
        errors.push({ sectionId, error: 'Section not found or update failed' });
      }
    } catch (error) {
      errors.push({ sectionId, error: error.message });
    }
  }

  return { results, errors };
};

// Update test counters after section changes
const updateTestCounters = async (testId) => {
  const query = `
    UPDATE tests
    SET
      total_sections = (
        SELECT COUNT(*) FROM ${TABLE_NAME}
        WHERE test_id = $1 AND is_active = true
      ),
      total_questions = (
        SELECT COALESCE(SUM(question_count), 0) FROM ${TABLE_NAME}
        WHERE test_id = $1 AND is_active = true
      ),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING total_sections, total_questions
  `;

  return await getOne(query, [testId]);
};

// Validate section business rules
const validateSectionRules = async (sectionData, testId) => {
  const { questionCount, timeLimitMinutes, maxScore } = sectionData;
  
  // Get test info for validation
  const testInfo = await getOne(
    `SELECT total_duration, max_attempts FROM tests WHERE id = $1`,
    [testId]
  );

  const errors = [];

  // Question count validation
  if (questionCount && (questionCount < 1 || questionCount > 100)) {
    errors.push('Question count must be between 1 and 100');
  }

  // Time limit validation against test duration
  if (timeLimitMinutes && testInfo.total_duration) {
    if (timeLimitMinutes > testInfo.total_duration) {
      errors.push('Section time limit cannot exceed test duration');
    }
  }

  // Max score validation
  if (maxScore && (maxScore < 1 || maxScore > 1000)) {
    errors.push('Max score must be between 1 and 1000');
  }

  return errors;
};

module.exports = {
  getSectionsByTestId,
  getSectionById,
  createSection,
  updateSection,
  updateSectionTiming,
  getSectionTiming,
  deleteSection,
  duplicateSection,
  reorderSections,
  bulkUpdateSections,
  updateTestCounters,
  validateSectionRules
};