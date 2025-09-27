const { getOne, insertOne, updateOne, deleteOne, getMany } = require('../config/database');

const TABLE_NAME = 'test_results';

// Get all test results for admin management
const getAllTestResults = async (filters = {}) => {
  let query = `
    SELECT
      tr.id, tr.test_id, tr.result_code, tr.score_range,
      tr.title, tr.description, tr.pdf_file, tr.pdf_upload_date,
      tr.pdf_file_size, tr.result_type, tr.usage_count,
      tr.last_used, tr.is_active, tr.created_at, tr.updated_at,

      -- Test information
      t.title as test_title, t.test_type, t.description as test_description

    FROM ${TABLE_NAME} tr
    LEFT JOIN tests t ON tr.test_id = t.id
    WHERE 1=1
  `;

  const values = [];
  let paramIndex = 1;

  // Filter by test
  if (filters.testId) {
    query += ` AND tr.test_id = $${paramIndex}`;
    values.push(filters.testId);
    paramIndex++;
  }

  // Filter by result type
  if (filters.resultType) {
    query += ` AND tr.result_type = $${paramIndex}`;
    values.push(filters.resultType);
    paramIndex++;
  }

  // Filter by active status
  if (filters.isActive !== undefined) {
    query += ` AND tr.is_active = $${paramIndex}`;
    values.push(filters.isActive);
    paramIndex++;
  }

  // Search filter
  if (filters.search) {
    query += ` AND (tr.result_code ILIKE $${paramIndex} OR tr.title ILIKE $${paramIndex} OR tr.description ILIKE $${paramIndex})`;
    values.push(`%${filters.search}%`);
    paramIndex++;
  }

  // Filter results with/without PDF
  if (filters.hasPdf !== undefined) {
    if (filters.hasPdf) {
      query += ` AND tr.pdf_file IS NOT NULL`;
    } else {
      query += ` AND tr.pdf_file IS NULL`;
    }
  }

  // Sort options
  const sortBy = filters.sortBy || 'created_at';
  const sortOrder = filters.sortOrder || 'DESC';
  query += ` ORDER BY tr.${sortBy} ${sortOrder}`;

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

// Get results by test ID
const getResultsByTestId = async (testId) => {
  const query = `
    SELECT
      tr.id, tr.test_id, tr.result_code, tr.score_range,
      tr.title, tr.description, tr.pdf_file, tr.pdf_upload_date,
      tr.pdf_file_size, tr.result_type, tr.usage_count,
      tr.last_used, tr.is_active, tr.created_at, tr.updated_at
    FROM ${TABLE_NAME} tr
    WHERE tr.test_id = $1 AND tr.is_active = true
    ORDER BY tr.result_code ASC
  `;

  return await getMany(query, [testId]);
};

// Get single test result by ID
const getTestResultById = async (id) => {
  const query = `
    SELECT
      tr.id, tr.test_id, tr.result_code, tr.score_range,
      tr.title, tr.description, tr.pdf_file, tr.pdf_upload_date,
      tr.pdf_file_size, tr.result_type, tr.usage_count,
      tr.last_used, tr.is_active, tr.created_at, tr.updated_at,

      -- Test information
      t.title as test_title, t.test_type

    FROM ${TABLE_NAME} tr
    LEFT JOIN tests t ON tr.test_id = t.id
    WHERE tr.id = $1
  `;

  return await getOne(query, [id]);
};

// Get result by test ID and result code (checks all records, not just active ones, to match DB constraint)
const getResultByTestAndCode = async (testId, resultCode) => {
  const query = `
    SELECT * FROM ${TABLE_NAME}
    WHERE test_id = $1 AND result_code = $2
  `;

  return await getOne(query, [testId, resultCode]);
};

// Get result by score range for a test
const getResultByScoreRange = async (testId, score) => {
  const query = `
    SELECT * FROM ${TABLE_NAME}
    WHERE test_id = $1
    AND result_type IN ('range_based', 'hybrid')
    AND is_active = true
    AND (
      -- Handle different score range formats
      (score_range ~ '^[0-9]+-[0-9]+$' AND $2 BETWEEN
        CAST(split_part(score_range, '-', 1) AS INTEGER) AND
        CAST(split_part(score_range, '-', 2) AS INTEGER))
      OR
      (score_range ~ '^>[0-9]+$' AND $2 > CAST(substring(score_range from 2) AS INTEGER))
      OR
      (score_range ~ '^<[0-9]+$' AND $2 < CAST(substring(score_range from 2) AS INTEGER))
      OR
      (score_range ~ '^>=[0-9]+$' AND $2 >= CAST(substring(score_range from 3) AS INTEGER))
      OR
      (score_range ~ '^<=[0-9]+$' AND $2 <= CAST(substring(score_range from 3) AS INTEGER))
    )
    ORDER BY
      CASE
        WHEN score_range ~ '^[0-9]+-[0-9]+$' THEN CAST(split_part(score_range, '-', 1) AS INTEGER)
        ELSE 0
      END DESC
    LIMIT 1
  `;

  return await getOne(query, [testId, score]);
};

// Create new test result
const createTestResult = async (resultData) => {
  const {
    test_id,
    result_code,
    score_range,
    title,
    description,
    pdf_file,
    pdf_file_size,
    result_type = 'range_based'
  } = resultData;

  const query = `
    INSERT INTO ${TABLE_NAME} (
      test_id, result_code, score_range, title, description,
      pdf_file, pdf_file_size, result_type, pdf_upload_date
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const values = [
    test_id,
    result_code,
    score_range || null,
    title,
    description || null,
    pdf_file || null,
    pdf_file_size || null,
    result_type,
    pdf_file ? new Date() : null
  ];

  return await insertOne(query, values);
};

// Update test result
const updateTestResult = async (id, updateData) => {
  const allowedFields = [
    'result_code', 'score_range', 'title', 'description',
    'pdf_file', 'pdf_file_size', 'result_type', 'is_active'
  ];

  const updates = [];
  const values = [];
  let paramIndex = 1;

  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key) && updateData[key] !== undefined) {
      updates.push(`${key} = $${paramIndex}`);
      values.push(updateData[key]);
      paramIndex++;
    }
  });

  // Update PDF upload date if PDF file is being updated
  if (updateData.pdf_file) {
    updates.push(`pdf_upload_date = $${paramIndex}`);
    values.push(new Date());
    paramIndex++;
  }

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

// Increment usage count
const incrementUsageCount = async (id) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET usage_count = usage_count + 1,
        last_used = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;

  return await updateOne(query, [id]);
};

// Delete test result (soft delete by setting inactive)
const deleteTestResult = async (id) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET is_active = false,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;

  return await updateOne(query, [id]);
};

// Hard delete test result
const hardDeleteTestResult = async (id) => {
  const query = `DELETE FROM ${TABLE_NAME} WHERE id = $1 RETURNING *`;
  return await deleteOne(query, [id]);
};

// Get result statistics
const getResultStatistics = async (testId) => {
  const query = `
    SELECT
      COUNT(*) as total_results,
      COUNT(CASE WHEN pdf_file IS NOT NULL THEN 1 END) as results_with_pdf,
      COUNT(CASE WHEN result_type = 'range_based' THEN 1 END) as range_based_results,
      COUNT(CASE WHEN result_type = 'flag_based' THEN 1 END) as flag_based_results,
      SUM(usage_count) as total_usage,
      MAX(last_used) as last_used_date
    FROM ${TABLE_NAME}
    WHERE test_id = $1 AND is_active = true
  `;

  return await getOne(query, [testId]);
};

// Bulk update results for a test
const bulkUpdateResults = async (testId, updates) => {
  const allowedFields = ['is_active', 'result_type'];
  const updatePairs = [];
  const values = [testId];
  let paramIndex = 2;

  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key) && updates[key] !== undefined) {
      updatePairs.push(`${key} = $${paramIndex}`);
      values.push(updates[key]);
      paramIndex++;
    }
  });

  if (updatePairs.length === 0) {
    throw new Error('No valid fields to update');
  }

  updatePairs.push('updated_at = CURRENT_TIMESTAMP');

  const query = `
    UPDATE ${TABLE_NAME}
    SET ${updatePairs.join(', ')}
    WHERE test_id = $1
    RETURNING *
  `;

  return await getMany(query, values);
};

module.exports = {
  getAllTestResults,
  getResultsByTestId,
  getTestResultById,
  getResultByTestAndCode,
  getResultByScoreRange,
  createTestResult,
  updateTestResult,
  incrementUsageCount,
  deleteTestResult,
  hardDeleteTestResult,
  getResultStatistics,
  bulkUpdateResults
};