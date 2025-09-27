const { getOne, insertOne, updateOne, deleteOne, getMany } = require('../config/database');

const TABLE_NAME = 'user_test_results';

// Get all user test results for admin management
const getAllUserTestResults = async (filters = {}) => {
  let query = `
    SELECT
      utr.id, utr.user_id, utr.test_id, utr.test_attempt_id,
      utr.result_id, utr.generated_result_code, utr.final_score,
      utr.result_title, utr.result_description, utr.result_pdf_path,
      utr.generation_method, utr.component_combination, utr.calculation_details,
      utr.is_final, utr.is_visible_to_user, utr.admin_notes,
      utr.viewed_count, utr.first_viewed_at, utr.last_viewed_at,
      utr.pdf_downloaded_count, utr.created_at, utr.updated_at,

      -- User information
      u.first_name, u.last_name, u.email,

      -- Test information
      t.title as test_title, t.test_type,

      -- Test attempt information
      ta.status as attempt_status, ta.completed_at as attempt_completed_at,

      -- Predefined result information
      tr.result_code as predefined_result_code, tr.title as predefined_title

    FROM ${TABLE_NAME} utr
    LEFT JOIN users u ON utr.user_id = u.id
    LEFT JOIN tests t ON utr.test_id = t.id
    LEFT JOIN test_attempts ta ON utr.test_attempt_id = ta.id
    LEFT JOIN test_results tr ON utr.result_id = tr.id
    WHERE 1=1
  `;

  const values = [];
  let paramIndex = 1;

  // Filter by user
  if (filters.userId) {
    query += ` AND utr.user_id = $${paramIndex}`;
    values.push(filters.userId);
    paramIndex++;
  }

  // Filter by test
  if (filters.testId) {
    query += ` AND utr.test_id = $${paramIndex}`;
    values.push(filters.testId);
    paramIndex++;
  }

  // Filter by test attempt
  if (filters.testAttemptId) {
    query += ` AND utr.test_attempt_id = $${paramIndex}`;
    values.push(filters.testAttemptId);
    paramIndex++;
  }

  // Filter by generation method
  if (filters.generationMethod) {
    query += ` AND utr.generation_method = $${paramIndex}`;
    values.push(filters.generationMethod);
    paramIndex++;
  }

  // Filter by final status
  if (filters.isFinal !== undefined) {
    query += ` AND utr.is_final = $${paramIndex}`;
    values.push(filters.isFinal);
    paramIndex++;
  }

  // Filter by visibility to user
  if (filters.isVisibleToUser !== undefined) {
    query += ` AND utr.is_visible_to_user = $${paramIndex}`;
    values.push(filters.isVisibleToUser);
    paramIndex++;
  }

  // Search filter
  if (filters.search) {
    query += ` AND (utr.result_title ILIKE $${paramIndex} OR utr.generated_result_code ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
    values.push(`%${filters.search}%`);
    paramIndex++;
  }

  // Sort options
  const sortBy = filters.sortBy || 'created_at';
  const sortOrder = filters.sortOrder || 'DESC';
  query += ` ORDER BY utr.${sortBy} ${sortOrder}`;

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

// Get user test results by user ID
const getUserTestResults = async (userId, filters = {}) => {
  let query = `
    SELECT
      utr.id, utr.test_id, utr.test_attempt_id, utr.generated_result_code,
      utr.final_score, utr.result_title, utr.result_description,
      utr.result_pdf_path, utr.generation_method, utr.viewed_count,
      utr.first_viewed_at, utr.last_viewed_at, utr.created_at,

      -- Test information
      t.title as test_title, t.test_type, t.description as test_description,

      -- Test attempt information
      ta.completed_at as attempt_completed_at, ta.total_score

    FROM ${TABLE_NAME} utr
    LEFT JOIN tests t ON utr.test_id = t.id
    LEFT JOIN test_attempts ta ON utr.test_attempt_id = ta.id
    WHERE utr.user_id = $1 AND utr.is_visible_to_user = true
  `;

  const values = [userId];
  let paramIndex = 2;

  // Filter by test
  if (filters.testId) {
    query += ` AND utr.test_id = $${paramIndex}`;
    values.push(filters.testId);
    paramIndex++;
  }

  // Sort by creation date (most recent first)
  query += ` ORDER BY utr.created_at DESC`;

  return await getMany(query, values);
};

// Get single user test result by ID
const getUserTestResultById = async (id, userId = null) => {
  let query = `
    SELECT
      utr.id, utr.user_id, utr.test_id, utr.test_attempt_id,
      utr.result_id, utr.generated_result_code, utr.final_score,
      utr.result_title, utr.result_description, utr.result_pdf_path,
      utr.generation_method, utr.component_combination, utr.calculation_details,
      utr.is_final, utr.is_visible_to_user, utr.admin_notes,
      utr.viewed_count, utr.first_viewed_at, utr.last_viewed_at,
      utr.pdf_downloaded_count, utr.created_at, utr.updated_at,

      -- User information
      u.first_name, u.last_name, u.email,

      -- Test information
      t.title as test_title, t.test_type, t.description as test_description,

      -- Test attempt information
      ta.status as attempt_status, ta.completed_at as attempt_completed_at,
      ta.total_score, ta.percentage_score

    FROM ${TABLE_NAME} utr
    LEFT JOIN users u ON utr.user_id = u.id
    LEFT JOIN tests t ON utr.test_id = t.id
    LEFT JOIN test_attempts ta ON utr.test_attempt_id = ta.id
    WHERE utr.id = $1
  `;

  const values = [id];

  // If userId is provided, ensure the result belongs to that user
  if (userId) {
    query += ` AND utr.user_id = $2 AND utr.is_visible_to_user = true`;
    values.push(userId);
  }

  return await getOne(query, values);
};

// Get result by user, test, and attempt
const getResultByUserTestAttempt = async (userId, testId, testAttemptId) => {
  const query = `
    SELECT * FROM ${TABLE_NAME}
    WHERE user_id = $1 AND test_id = $2 AND test_attempt_id = $3
  `;

  return await getOne(query, [userId, testId, testAttemptId]);
};

// Create new user test result
const createUserTestResult = async (resultData) => {
  const {
    user_id,
    test_id,
    test_attempt_id,
    result_id = null,
    generated_result_code,
    final_score,
    result_title,
    result_description,
    result_pdf_path = null,
    generation_method = 'range_based',
    component_combination = null,
    calculation_details = null,
    is_final = true,
    is_visible_to_user = true,
    admin_notes = null
  } = resultData;

  const query = `
    INSERT INTO ${TABLE_NAME} (
      user_id, test_id, test_attempt_id, result_id,
      generated_result_code, final_score, result_title, result_description,
      result_pdf_path, generation_method, component_combination,
      calculation_details, is_final, is_visible_to_user, admin_notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `;

  const values = [
    user_id, test_id, test_attempt_id, result_id,
    generated_result_code, final_score, result_title, result_description,
    result_pdf_path, generation_method,
    component_combination ? JSON.stringify(component_combination) : null,
    calculation_details ? JSON.stringify(calculation_details) : null,
    is_final, is_visible_to_user, admin_notes
  ];

  return await insertOne(query, values);
};

// Update user test result
const updateUserTestResult = async (id, updateData) => {
  const allowedFields = [
    'result_id', 'generated_result_code', 'final_score',
    'result_title', 'result_description', 'result_pdf_path',
    'generation_method', 'component_combination', 'calculation_details',
    'is_final', 'is_visible_to_user', 'admin_notes'
  ];

  const updates = [];
  const values = [];
  let paramIndex = 1;

  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key) && updateData[key] !== undefined) {
      if (key === 'component_combination' || key === 'calculation_details') {
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

// Mark result as viewed
const markAsViewed = async (id, userId = null) => {
  let query = `
    UPDATE ${TABLE_NAME}
    SET viewed_count = viewed_count + 1,
        last_viewed_at = CURRENT_TIMESTAMP,
        first_viewed_at = COALESCE(first_viewed_at, CURRENT_TIMESTAMP)
    WHERE id = $1
  `;

  const values = [id];

  // If userId provided, ensure it belongs to that user
  if (userId) {
    query += ` AND user_id = $2`;
    values.push(userId);
  }

  query += ` RETURNING *`;

  return await updateOne(query, values);
};

// Increment PDF download count
const incrementPdfDownloadCount = async (id, userId = null) => {
  let query = `
    UPDATE ${TABLE_NAME}
    SET pdf_downloaded_count = pdf_downloaded_count + 1
    WHERE id = $1
  `;

  const values = [id];

  if (userId) {
    query += ` AND user_id = $2`;
    values.push(userId);
  }

  query += ` RETURNING *`;

  return await updateOne(query, values);
};

// Delete user test result
const deleteUserTestResult = async (id) => {
  const query = `DELETE FROM ${TABLE_NAME} WHERE id = $1 RETURNING *`;
  return await deleteOne(query, [id]);
};

// Get result statistics for admin
const getResultStatistics = async (filters = {}) => {
  let query = `
    SELECT
      COUNT(*) as total_results,
      COUNT(CASE WHEN generation_method = 'range_based' THEN 1 END) as range_based_count,
      COUNT(CASE WHEN generation_method = 'flag_based' THEN 1 END) as flag_based_count,
      COUNT(CASE WHEN generation_method = 'manual' THEN 1 END) as manual_count,
      COUNT(CASE WHEN is_visible_to_user = true THEN 1 END) as visible_results,
      SUM(viewed_count) as total_views,
      SUM(pdf_downloaded_count) as total_downloads,
      AVG(final_score) as average_score
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

// Get recent results for dashboard
const getRecentResults = async (limit = 10) => {
  const query = `
    SELECT
      utr.id, utr.generated_result_code, utr.final_score,
      utr.result_title, utr.created_at,

      -- User information
      u.first_name, u.last_name,

      -- Test information
      t.title as test_title, t.test_type

    FROM ${TABLE_NAME} utr
    LEFT JOIN users u ON utr.user_id = u.id
    LEFT JOIN tests t ON utr.test_id = t.id
    WHERE utr.is_final = true
    ORDER BY utr.created_at DESC
    LIMIT $1
  `;

  return await getMany(query, [limit]);
};

// Bulk update results visibility
const bulkUpdateVisibility = async (resultIds, isVisible) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET is_visible_to_user = $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ANY($2::uuid[])
    RETURNING *
  `;

  return await getMany(query, [isVisible, resultIds]);
};

module.exports = {
  getAllUserTestResults,
  getUserTestResults,
  getUserTestResultById,
  getResultByUserTestAttempt,
  createUserTestResult,
  updateUserTestResult,
  markAsViewed,
  incrementPdfDownloadCount,
  deleteUserTestResult,
  getResultStatistics,
  getRecentResults,
  bulkUpdateVisibility
};