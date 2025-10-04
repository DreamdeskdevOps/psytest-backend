const { getOne, insertOne, updateOne, deleteOne, getMany } = require('../config/database');

const TABLE_NAME = 'test_attempts';

// Get all test attempts for admin management
const getAllTestAttempts = async (filters = {}) => {
  let query = `
    SELECT
      ta.id, ta.user_id, ta.test_id,
      ta.status, ta.started_at, ta.completed_at, ta.created_at,

      -- User information
      u.first_name, u.last_name, u.email,

      -- Test information
      t.title as test_title, t.test_type, t.total_questions

    FROM ${TABLE_NAME} ta
    LEFT JOIN users u ON ta.user_id = u.id
    LEFT JOIN tests t ON ta.test_id = t.id
    WHERE 1=1
  `;

  const values = [];
  let paramIndex = 1;

  // Filter by user
  if (filters.userId) {
    query += ` AND ta.user_id = $${paramIndex}`;
    values.push(filters.userId);
    paramIndex++;
  }

  // Filter by test
  if (filters.testId) {
    query += ` AND ta.test_id = $${paramIndex}`;
    values.push(filters.testId);
    paramIndex++;
  }

  // Filter by status
  if (filters.status) {
    query += ` AND ta.status = $${paramIndex}`;
    values.push(filters.status);
    paramIndex++;
  }

  // Sort options
  const sortBy = filters.sortBy || 'created_at';
  const sortOrder = filters.sortOrder || 'DESC';
  query += ` ORDER BY ta.${sortBy} ${sortOrder}`;

  // Pagination
  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    values.push(filters.limit);
    paramIndex++;
  }

  if (filters.offset) {
    query += ` OFFSET $${paramIndex}`;
    values.push(filters.offset);
    paramIndex++;
  }

  return await getMany(query, values);
};

// Get test attempts by user ID
const getTestAttemptsByUserId = async (userId) => {
  const query = `
    SELECT
      ta.id, ta.test_id, ta.status,
      ta.started_at, ta.completed_at, ta.created_at,

      -- Test information
      t.title as test_title, t.test_type, t.description as test_description

    FROM ${TABLE_NAME} ta
    LEFT JOIN tests t ON ta.test_id = t.id
    WHERE ta.user_id = $1
    ORDER BY ta.created_at DESC
  `;

  return await getMany(query, [userId]);
};

// Get single test attempt by ID
const getTestAttemptById = async (id) => {
  const query = `
    SELECT
      ta.id, ta.user_id, ta.test_id,
      ta.status, ta.started_at, ta.completed_at,
      ta.answers,
      ta.created_at, ta.updated_at,

      -- User information
      u.first_name, u.last_name, u.email,

      -- Test information
      t.title as test_title, t.test_type, t.total_questions, t.time_limit

    FROM ${TABLE_NAME} ta
    LEFT JOIN users u ON ta.user_id = u.id
    LEFT JOIN tests t ON ta.test_id = t.id
    WHERE ta.id = $1
  `;

  return await getOne(query, [id]);
};

// Get test attempt by session token (using id as session token)
const getTestAttemptBySessionToken = async (sessionToken) => {
  const query = `
    SELECT
      ta.id, ta.user_id, ta.test_id,
      ta.status, ta.started_at, ta.completed_at,
      ta.current_question_number, ta.time_remaining,
      ta.total_score, ta.percentage, ta.section_scores,

      -- Test information
      t.title as test_title, t.test_type, t.total_questions

    FROM ${TABLE_NAME} ta
    LEFT JOIN tests t ON ta.test_id = t.id
    WHERE ta.id = $1
  `;

  return await getOne(query, [sessionToken]);
};

// Get active test attempt for user and test
const getActiveTestAttempt = async (userId, testId) => {
  const query = `
    SELECT * FROM ${TABLE_NAME}
    WHERE user_id = $1 AND test_id = $2
    AND status = 'in_progress'
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return await getOne(query, [userId, testId]);
};

// Create new test attempt (using actual database schema)
const createTestAttempt = async (attemptData) => {
  const {
    user_id,
    test_id,
    time_limit_minutes = 30
  } = attemptData;

  const query = `
    INSERT INTO ${TABLE_NAME} (
      user_id, test_id, status, started_at, attempt_number,
      current_question_number, time_remaining
    )
    VALUES ($1, $2, 'in_progress', CURRENT_TIMESTAMP, 1, 1, $3)
    RETURNING *
  `;

  const values = [
    user_id,
    test_id,
    time_limit_minutes * 60 // Store time remaining in seconds
  ];

  return await insertOne(query, values);
};

// Update test attempt
const updateTestAttempt = async (id, updateData) => {
  const allowedFields = [
    'status', 'answers', 'completed_at'
  ];

  const updates = [];
  const values = [];
  let paramIndex = 1;

  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key) && updateData[key] !== undefined) {
      if (key === 'answers' || key === 'section_scores') {
        updates.push(`${key} = $${paramIndex}`);
        values.push(JSON.stringify(updateData[key]));
      } else {
        updates.push(`${key} = $${paramIndex}`);
        values.push(updateData[key]);
      }
      paramIndex++;
    }
  });

  if (updates.length === 0) {
    throw new Error('No valid fields to update');
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');

  const query = `
    UPDATE ${TABLE_NAME}
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  values.push(id);

  return await updateOne(query, values);
};

// Save answer for test attempt - store in user_responses table
const saveAnswer = async (attemptId, questionId, answer) => {
  const { insertOne, updateOne, getOne } = require('../config/database');

  // First get the test attempt and question details
  const attempt = await getOne(
    'SELECT user_id, test_id FROM test_attempts WHERE id = $1',
    [attemptId]
  );

  if (!attempt) {
    throw new Error('Test attempt not found');
  }

  // Get question details to fill required fields
  const question = await getOne(
    'SELECT section_id, order_index FROM questions WHERE id = $1',
    [questionId]
  );

  if (!question) {
    throw new Error('Question not found');
  }

  // Check if answer already exists
  const existingAnswer = await getOne(
    'SELECT id FROM user_responses WHERE attempt_id = $1 AND question_id = $2',
    [attemptId, questionId]
  );

  if (existingAnswer) {
    // Update existing answer
    const query = `
      UPDATE user_responses
      SET selected_answer = $3,
          last_updated = CURRENT_TIMESTAMP
      WHERE attempt_id = $1 AND question_id = $2
      RETURNING *
    `;
    return await updateOne(query, [attemptId, questionId, answer]);
  } else {
    // Insert new answer with all required fields
    const query = `
      INSERT INTO user_responses (
        attempt_id, user_id, test_id, section_id, question_id,
        question_number, selected_answer, answered_at, last_updated
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    return await insertOne(query, [
      attemptId,
      attempt.user_id,
      attempt.test_id,
      question.section_id,
      questionId,
      question.order_index || 1,
      answer
    ]);
  }
};

// Update current question index
const updateCurrentQuestion = async (attemptId, questionIndex) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET current_question_index = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;

  return await updateOne(query, [attemptId, questionIndex]);
};

// Complete test attempt
const completeTestAttempt = async (attemptId, totalScore, percentageScore, sectionScores) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET status = 'completed',
        completed_at = CURRENT_TIMESTAMP,
        total_score = $2,
        percentage = $3,
        section_scores = $4,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;

  const values = [
    attemptId,
    totalScore,
    percentageScore,
    sectionScores ? JSON.stringify(sectionScores) : null
  ];

  return await updateOne(query, values);
};

// Abandon test attempt (user left)
const abandonTestAttempt = async (attemptId) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET status = 'abandoned',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;

  return await updateOne(query, [attemptId]);
};

// Expire test attempts that have passed time limit
const expireTestAttempts = async () => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET status = 'expired',
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'in_progress'
    AND started_at < NOW() - INTERVAL '2 hours'
    RETURNING *
  `;

  return await getMany(query, []);
};

// Delete test attempt
const deleteTestAttempt = async (id) => {
  const query = `DELETE FROM ${TABLE_NAME} WHERE id = $1 RETURNING *`;
  return await deleteOne(query, [id]);
};

// Get test attempt statistics
const getTestAttemptStatistics = async (filters = {}) => {
  let query = `
    SELECT
      COUNT(*) as total_attempts,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_attempts,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_attempts,
      COUNT(CASE WHEN status = 'abandoned' THEN 1 END) as abandoned_attempts,
      AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) FILTER (WHERE status = 'completed') as average_completion_time_minutes
    FROM ${TABLE_NAME}
    WHERE 1=1
  `;

  const values = [];
  let paramIndex = 1;

  if (filters.testId) {
    query += ` AND test_id = $${paramIndex}`;
    values.push(filters.testId);
    paramIndex++;
  }

  if (filters.userId) {
    query += ` AND user_id = $${paramIndex}`;
    values.push(filters.userId);
    paramIndex++;
  }

  if (filters.dateFrom) {
    query += ` AND created_at >= $${paramIndex}`;
    values.push(filters.dateFrom);
    paramIndex++;
  }

  if (filters.dateTo) {
    query += ` AND created_at <= $${paramIndex}`;
    values.push(filters.dateTo);
    paramIndex++;
  }

  return await getOne(query, values);
};

module.exports = {
  getAllTestAttempts,
  getTestAttemptsByUserId,
  getTestAttemptById,
  getTestAttemptBySessionToken,
  getActiveTestAttempt,
  createTestAttempt,
  updateTestAttempt,
  saveAnswer,
  updateCurrentQuestion,
  completeTestAttempt,
  abandonTestAttempt,
  expireTestAttempts,
  deleteTestAttempt,
  getTestAttemptStatistics
};
