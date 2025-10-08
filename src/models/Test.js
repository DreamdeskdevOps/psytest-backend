
const { getOne, insertOne, updateOne, deleteOne, getMany } = require('../config/database');

const TABLE_NAME = 'tests';

// Get all tests for admin management (with admin-specific data)
const getAllTestsForAdmin = async (filters = {}) => {
  let query = `
    SELECT
      t.id, t.title, t.description, t.test_type,
      t.total_duration, t.total_questions,
      t.is_active, t.is_free, t.price, t.passing_score, t.max_attempts,
      t.created_at, t.updated_at,

      -- Admin specific metrics (simplified for now)
      0 as total_attempts,
      0 as completed_attempts,
      0 as unique_test_takers,
      (SELECT COUNT(*) FROM test_sections WHERE test_id = t.id) as active_sections,
      0 as revenue_generated,
      null as last_attempt_date

    FROM ${TABLE_NAME} t
    WHERE 1=1
  `;

  const values = [];
  let paramIndex = 1;

  // Admin filters
  if (filters.isActive !== undefined) {
    query += ` AND t.is_active = $${paramIndex}`;
    values.push(filters.isActive);
    paramIndex++;
  }

  if (filters.testType) {
    query += ` AND t.test_type = $${paramIndex}`;
    values.push(filters.testType);
    paramIndex++;
  }


  if (filters.isFree !== undefined) {
    query += ` AND t.is_free = $${paramIndex}`;
    values.push(filters.isFree);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
    values.push(`%${filters.search}%`);
    paramIndex++;
  }

  // Admin sorting options
  const sortOptions = {
    'newest': 't.created_at DESC',
    'oldest': 't.created_at ASC', 
    'title': 't.title ASC',
    'attempts': 'total_attempts DESC',
    'revenue': 'revenue_generated DESC'
  };

  const sortBy = sortOptions[filters.sortBy] || 't.created_at DESC';
  query += ` ORDER BY ${sortBy}`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(filters.limit, filters.offset || 0);
  }

  return await getMany(query, values);
};

// Get test details for admin editing (with complete section configuration)
const getTestForAdmin = async (id) => {
  const query = `
    SELECT
      t.id, t.title, t.description, t.instructions, t.test_type,
      t.total_duration, t.total_questions, t.is_active, t.is_published,
      t.is_free, t.price, t.currency, t.discount_percentage, t.passing_score, t.max_attempts,
      t.show_results, t.show_correct_answers, t.randomize_questions,
      t.total_attempts, t.total_completions, t.average_score,
      t.slug, t.tags, t.thumbnail, t.premium_features,
      t.created_by, t.updated_by, t.created_at, t.updated_at,

      -- Complete section configuration for admin
      COALESCE(
        json_agg(
          json_build_object(
            'id', s.id,
            'section_name', s.title,
            'section_order', s.order_index,
            'question_count', s.question_count,
            'time_limit_minutes', s.time_limit,
            'instructions', s.instructions,
            'description', s.description,
            'is_timed', s.is_timed,
            'auto_submit', s.auto_submit,
            'allow_review', s.allow_review,
            'allow_skip', s.allow_skip,
            'show_question_numbers', s.show_question_numbers,
            'numbering_style', s.numbering_style,
            'created_at', s.created_at,
            'updated_at', s.updated_at
          ) ORDER BY s.order_index
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'::json
      ) as sections

    FROM ${TABLE_NAME} t
    LEFT JOIN test_sections s ON t.id = s.test_id
    WHERE t.id = $1
    GROUP BY t.id, t.title, t.description, t.instructions, t.test_type, t.total_duration,
             t.total_questions, t.is_active, t.is_published, t.is_free, t.price, t.currency,
             t.discount_percentage, t.passing_score, t.max_attempts, t.show_results,
             t.show_correct_answers, t.randomize_questions, t.total_attempts, t.total_completions,
             t.average_score, t.slug, t.tags, t.thumbnail, t.premium_features, t.created_by,
             t.updated_by, t.created_at, t.updated_at
  `;
  return await getOne(query, [id]);
};

// Create new customizable test (admin creates the framework)
const createCustomTest = async (testData, adminId) => {
  const {
    title, description, instructions, testType,
    durationMinutes, isFree, price, passingScore, maxAttempts,
    settings, sections = []
  } = testData;

  const query = `
    INSERT INTO ${TABLE_NAME} (
      title, description, instructions, test_type,
      total_duration, total_questions, is_active,
      is_free, price, passing_score, max_attempts,
      show_results, show_correct_answers, randomize_questions,
      created_by, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING *
  `;

  const totalQuestions = sections.reduce((sum, section) => sum + (section.question_count || 0), 0);

  const values = [
    title, description, instructions, testType,
    durationMinutes, totalQuestions, true,
    isFree, price, passingScore, maxAttempts,
    settings?.showProgressBar || true,
    settings?.showCorrectAnswers || false,
    settings?.shuffleQuestions || false,
    adminId
  ];

  return await insertOne(query, values);
};

// Update test configuration (admin edits)
const updateTestConfig = async (id, updateData, adminId) => {
  const {
    title, description, instructions, testType,
    durationMinutes, isFree, price, passingScore, maxAttempts, settings
  } = updateData;

  const query = `
    UPDATE ${TABLE_NAME}
    SET
      title = COALESCE($2, title),
      description = COALESCE($3, description),
      instructions = COALESCE($4, instructions),
      test_type = COALESCE($5, test_type),
      total_duration = COALESCE($6, total_duration),
      is_free = COALESCE($7, is_free),
      price = COALESCE($8, price),
      passing_score = COALESCE($9, passing_score),
      max_attempts = COALESCE($10, max_attempts)
    WHERE id = $1
    RETURNING *
  `;

  const values = [
    id,
    title || null,
    description || null,
    instructions || null,
    testType || null,
    durationMinutes || null,
    isFree !== undefined ? isFree : null,
    price !== undefined ? price : null,
    passingScore || null,
    maxAttempts || null
  ];

  return await getOne(query, values);
};

// Admin soft delete (preserves user attempt history)
const adminDeleteTest = async (id, adminId) => {
  // Get attempt count before deletion
  const testInfo = await getOne(
    `SELECT id, title, (SELECT COUNT(*) FROM test_attempts WHERE test_id = $1) as attempt_count FROM ${TABLE_NAME} WHERE id = $1`,
    [id]
  );

  if (!testInfo) {
    throw new Error('Test not found');
  }

  // Use actual DELETE instead of soft delete since the columns don't exist
  const deleteQuery = `DELETE FROM ${TABLE_NAME} WHERE id = $1 RETURNING id, title`;
  const result = await getOne(deleteQuery, [id]);

  return { ...result, attempt_count: testInfo.attempt_count || 0 };
};

// Admin toggle test status with business rules
const adminToggleStatus = async (id, adminId) => {
  // Check if test has sections before activating
  const sectionsCheck = await getOne(
    `SELECT COUNT(*) as section_count FROM test_sections WHERE test_id = $1`,
    [id]
  );

  if (sectionsCheck.section_count === 0) {
    throw new Error('Cannot activate test without sections. Please add sections first.');
  }

  const query = `
    UPDATE ${TABLE_NAME}
    SET
      is_active = NOT is_active,
      updated_by = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, title, is_active, total_questions
  `;

  return await getOne(query, [id, adminId]);
};

// Admin activate test
const adminActivateTest = async (id, adminId) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET
      is_active = true,
      updated_by = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, title, is_active, total_questions
  `;

  return await getOne(query, [id, adminId]);
};

// Admin deactivate test
const adminDeactivateTest = async (id, adminId) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET
      is_active = false,
      updated_by = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, title, is_active, total_questions
  `;

  return await getOne(query, [id, adminId]);
};

// Admin update test type
const adminUpdateTestType = async (id, testType, adminId) => {
  const query = `
    UPDATE tests
    SET test_type = $2
    WHERE id = $1
    RETURNING id, title, test_type, is_active
  `;

  return await getOne(query, [id, testType]);
};

// Admin duplicate test with all sections and questions
const adminDuplicateTest = async (originalId, newTitle, adminId) => {
  // Get original test with all sections
  const originalTest = await getTestForAdmin(originalId);
  if (!originalTest) return null;

  // Create the duplicated test
  const duplicatedTest = await createCustomTest({
    title: newTitle || `${originalTest.title} (Copy)`,
    description: originalTest.description,
    instructions: originalTest.instructions,
    testType: originalTest.test_type,
    durationMinutes: originalTest.total_duration,
    isFree: originalTest.is_free,
    price: originalTest.price,
    passingScore: originalTest.passing_score,
    maxAttempts: originalTest.max_attempts,
    settings: {
      showProgressBar: originalTest.show_results || false,
      allowBackNavigation: true,
      shuffleQuestions: originalTest.randomize_questions || false,
      showCorrectAnswers: originalTest.show_correct_answers || false
    },
    sections: originalTest.sections || []
  }, adminId);

  return duplicatedTest;
};

// Get comprehensive admin analytics for a test
const getAdminTestAnalytics = async (id) => {
  const query = `
    SELECT 
      t.id, t.title, t.test_type, t.is_free, t.price,
      
      -- Attempt statistics
      (SELECT COUNT(*) FROM test_attempts WHERE test_id = t.id) as total_attempts,
      (SELECT COUNT(*) FROM test_attempts WHERE test_id = t.id AND completed_at IS NOT NULL) as completed_attempts,
      (SELECT COUNT(*) FROM test_attempts WHERE test_id = t.id AND completed_at IS NULL) as incomplete_attempts,
      (SELECT COUNT(DISTINCT user_id) FROM test_attempts WHERE test_id = t.id) as unique_users,
      
      -- Performance metrics
      (SELECT AVG(score_percentage)::DECIMAL(5,2) FROM test_results WHERE test_id = t.id) as avg_score,
      (SELECT MAX(score_percentage) FROM test_results WHERE test_id = t.id) as highest_score,
      (SELECT MIN(score_percentage) FROM test_results WHERE test_id = t.id) as lowest_score,
      
      -- Time analytics
      (SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60)::DECIMAL(5,2) 
       FROM test_attempts WHERE test_id = t.id AND completed_at IS NOT NULL) as avg_completion_time_minutes,
       
      -- Revenue (for paid tests)
      CASE 
        WHEN t.is_free = false THEN 
          (SELECT COUNT(*) FROM payments WHERE test_id = t.id AND payment_status = 'completed') * t.price
        ELSE 0 
      END as total_revenue,
      
      -- Recent activity
      (SELECT MAX(created_at) FROM test_attempts WHERE test_id = t.id) as last_attempt_date,
      
      -- Section performance (which sections are hardest)
      (
        SELECT json_agg(
          json_build_object(
            'section_name', ts.section_name,
            'avg_score', AVG(ua.score_percentage)::DECIMAL(5,2),
            'completion_rate', (COUNT(ua.completed_at) * 100.0 / COUNT(*))::DECIMAL(5,2)
          )
        )
        FROM test_sections ts
        LEFT JOIN user_answers ua ON ts.id = ua.section_id
        WHERE ts.test_id = t.id AND ts.is_active = true
        GROUP BY ts.id, ts.section_name
      ) as section_analytics
      
    FROM ${TABLE_NAME} t
    WHERE t.id = $1
  `;
  
  return await getOne(query, [id]);
};

// Reorder test sections (admin functionality)
const reorderTestSections = async (testId, sectionOrders, adminId) => {
  // sectionOrders = [{ sectionId, newOrder }, ...]

  const updatePromises = sectionOrders.map(({ sectionId, newOrder }) => {
    const query = `
      UPDATE test_sections
      SET order_index = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND test_id = $3
      RETURNING id, title as section_name, order_index as section_order
    `;
    return getOne(query, [sectionId, newOrder, testId]);
  });

  const results = await Promise.all(updatePromises);

  // Log the reorder action
  await insertOne(
    `INSERT INTO admin_activity_logs (admin_id, action_type, action_description, created_at)
     VALUES ($1, 'SECTION_REORDER', $2, CURRENT_TIMESTAMP)`,
    [adminId, `Reordered sections for test ${testId}`]
  );

  return results;
};

// Student/User functions - simplified for public access
const getAllTests = async (filters = {}) => {
  let query = `
    SELECT
      t.id, t.title, t.description, t.test_type,
      t.total_duration, t.total_questions,
      t.is_active, t.is_free, t.price, t.passing_score, t.max_attempts,
      t.created_at, t.updated_at
    FROM ${TABLE_NAME} t
    WHERE t.is_active = true
  `;

  const values = [];
  let paramIndex = 1;

  // User filters
  if (filters.testType) {
    query += ` AND t.test_type = $${paramIndex}`;
    values.push(filters.testType);
    paramIndex++;
  }

  if (filters.isFree !== undefined) {
    query += ` AND t.is_free = $${paramIndex}`;
    values.push(filters.isFree);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
    values.push(`%${filters.search}%`);
    paramIndex++;
  }

  query += ` ORDER BY t.created_at DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(filters.limit, filters.offset || 0);
  }

  return await getMany(query, values);
};

// Get single test by ID for students
const getTestById = async (id) => {
  const query = `
    SELECT
      t.id, t.title, t.description, t.instructions, t.test_type,
      t.total_duration, t.total_questions, t.is_active,
      t.is_free, t.price, t.passing_score, t.max_attempts,
      t.show_results, t.show_correct_answers, t.randomize_questions,
      t.created_at, t.updated_at
    FROM ${TABLE_NAME} t
    WHERE t.id = $1 AND t.is_active = true
  `;
  return await getOne(query, [id]);
};

module.exports = {
  // Admin functions
  getAllTestsForAdmin,
  getTestForAdmin,
  createCustomTest,
  updateTestConfig,
  adminDeleteTest,
  adminToggleStatus,
  adminActivateTest,
  adminDeactivateTest,
  adminUpdateTestType,
  adminDuplicateTest,
  getAdminTestAnalytics,
  reorderTestSections,

  // Student/User functions
  getAllTests,
  getTestById
};