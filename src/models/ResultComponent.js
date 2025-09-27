const { getOne, insertOne, updateOne, deleteOne, getMany } = require('../config/database');

const TABLE_NAME = 'result_components';

// Get all result components for admin management
const getAllResultComponents = async (filters = {}) => {
  let query = `
    SELECT
      rc.id, rc.test_id, rc.component_code, rc.component_name,
      rc.description, rc.score_value, rc.order_priority,
      rc.component_category, rc.component_weight, rc.usage_count,
      rc.is_active, rc.created_at, rc.updated_at,

      -- Test information
      t.title as test_title, t.test_type, t.description as test_description

    FROM ${TABLE_NAME} rc
    LEFT JOIN tests t ON rc.test_id = t.id
    WHERE 1=1
  `;

  const values = [];
  let paramIndex = 1;

  // Filter by test
  if (filters.testId) {
    query += ` AND rc.test_id = $${paramIndex}`;
    values.push(filters.testId);
    paramIndex++;
  }

  // Filter by component category
  if (filters.componentCategory) {
    query += ` AND rc.component_category = $${paramIndex}`;
    values.push(filters.componentCategory);
    paramIndex++;
  }

  // Filter by active status
  if (filters.isActive !== undefined) {
    query += ` AND rc.is_active = $${paramIndex}`;
    values.push(filters.isActive);
    paramIndex++;
  }

  // Search filter
  if (filters.search) {
    query += ` AND (rc.component_code ILIKE $${paramIndex} OR rc.component_name ILIKE $${paramIndex} OR rc.description ILIKE $${paramIndex})`;
    values.push(`%${filters.search}%`);
    paramIndex++;
  }

  // Sort options
  const sortBy = filters.sortBy || 'order_priority';
  const sortOrder = filters.sortOrder || 'ASC';
  query += ` ORDER BY rc.${sortBy} ${sortOrder}`;

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

// Get components by test ID
const getComponentsByTestId = async (testId) => {
  const query = `
    SELECT
      rc.id, rc.test_id, rc.component_code, rc.component_name,
      rc.description, rc.score_value, rc.order_priority,
      rc.component_category, rc.component_weight, rc.usage_count,
      rc.is_active, rc.created_at, rc.updated_at
    FROM ${TABLE_NAME} rc
    WHERE rc.test_id = $1 AND rc.is_active = true
    ORDER BY rc.order_priority ASC, rc.component_code ASC
  `;

  return await getMany(query, [testId]);
};

// Get single result component by ID
const getResultComponentById = async (id) => {
  const query = `
    SELECT
      rc.id, rc.test_id, rc.component_code, rc.component_name,
      rc.description, rc.score_value, rc.order_priority,
      rc.component_category, rc.component_weight, rc.usage_count,
      rc.is_active, rc.created_at, rc.updated_at,

      -- Test information
      t.title as test_title, t.test_type

    FROM ${TABLE_NAME} rc
    LEFT JOIN tests t ON rc.test_id = t.id
    WHERE rc.id = $1
  `;

  return await getOne(query, [id]);
};

// Get component by test ID and component code (checks all records, not just active ones, to match DB constraint)
const getComponentByTestAndCode = async (testId, componentCode) => {
  const query = `
    SELECT * FROM ${TABLE_NAME}
    WHERE test_id = $1 AND component_code = $2
  `;

  return await getOne(query, [testId, componentCode]);
};

// Get components for combination generation (sorted by priority)
const getComponentsForCombination = async (testId, limit = null) => {
  let query = `
    SELECT
      component_code, component_name, score_value,
      order_priority, component_weight
    FROM ${TABLE_NAME}
    WHERE test_id = $1 AND is_active = true
    ORDER BY order_priority ASC, score_value DESC
  `;

  const values = [testId];

  if (limit) {
    query += ` LIMIT $2`;
    values.push(limit);
  }

  return await getMany(query, values);
};

// Create new result component
const createResultComponent = async (componentData) => {
  const {
    test_id,
    component_code,
    component_name,
    description,
    score_value = 0,
    order_priority = 1,
    component_category,
    component_weight = 1.0
  } = componentData;

  const query = `
    INSERT INTO ${TABLE_NAME} (
      test_id, component_code, component_name, description,
      score_value, order_priority, component_category, component_weight
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const values = [
    test_id,
    component_code,
    component_name,
    description || null,
    score_value,
    order_priority,
    component_category || null,
    component_weight
  ];

  return await insertOne(query, values);
};

// Update result component
const updateResultComponent = async (id, updateData) => {
  const allowedFields = [
    'component_code', 'component_name', 'description',
    'score_value', 'order_priority', 'component_category',
    'component_weight', 'is_active'
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

// Update component priority
const updateComponentPriority = async (id, newPriority) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET order_priority = $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;

  return await updateOne(query, [newPriority, id]);
};

// Increment usage count
const incrementUsageCount = async (id) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET usage_count = usage_count + 1
    WHERE id = $1
    RETURNING *
  `;

  return await updateOne(query, [id]);
};

// Delete result component (soft delete by setting inactive)
const deleteResultComponent = async (id) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET is_active = false,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;

  return await updateOne(query, [id]);
};

// Hard delete result component
const hardDeleteResultComponent = async (id) => {
  const query = `DELETE FROM ${TABLE_NAME} WHERE id = $1 RETURNING *`;
  return await deleteOne(query, [id]);
};

// Get component statistics for a test
const getComponentStatistics = async (testId) => {
  const query = `
    SELECT
      COUNT(*) as total_components,
      COUNT(DISTINCT component_category) as unique_categories,
      SUM(usage_count) as total_usage,
      AVG(score_value) as average_score_value,
      MIN(order_priority) as min_priority,
      MAX(order_priority) as max_priority
    FROM ${TABLE_NAME}
    WHERE test_id = $1 AND is_active = true
  `;

  return await getOne(query, [testId]);
};

// Reorder component priorities for a test
const reorderComponentPriorities = async (testId) => {
  const query = `
    WITH ordered_components AS (
      SELECT id,
             ROW_NUMBER() OVER (ORDER BY order_priority ASC, created_at ASC) as new_priority
      FROM ${TABLE_NAME}
      WHERE test_id = $1 AND is_active = true
    )
    UPDATE ${TABLE_NAME}
    SET order_priority = oc.new_priority,
        updated_at = CURRENT_TIMESTAMP
    FROM ordered_components oc
    WHERE ${TABLE_NAME}.id = oc.id
    RETURNING *
  `;

  return await getMany(query, [testId]);
};

// Generate component combination based on score/flags
const generateComponentCombination = async (testId, scoreData, maxComponents = 4) => {
  const query = `
    SELECT
      component_code, component_name, score_value,
      order_priority, component_weight
    FROM ${TABLE_NAME}
    WHERE test_id = $1 AND is_active = true
    ORDER BY
      CASE
        WHEN $2::jsonb ? component_code THEN ($2::jsonb ->> component_code)::numeric * component_weight
        ELSE score_value * component_weight
      END DESC,
      order_priority ASC
    LIMIT $3
  `;

  return await getMany(query, [testId, JSON.stringify(scoreData), maxComponents]);
};

// Bulk update components for a test
const bulkUpdateComponents = async (testId, updates) => {
  const allowedFields = ['is_active', 'component_category', 'component_weight'];
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

// Get component categories for a test
const getComponentCategories = async (testId) => {
  const query = `
    SELECT DISTINCT component_category
    FROM ${TABLE_NAME}
    WHERE test_id = $1 AND is_active = true
    AND component_category IS NOT NULL
    ORDER BY component_category
  `;

  return await getMany(query, [testId]);
};

// Swap component priorities
const swapComponentPriorities = async (id1, id2) => {
  const client = require('../config/database').getClient();

  try {
    await client.query('BEGIN');

    // Get current priorities
    const result1 = await client.query(`SELECT order_priority FROM ${TABLE_NAME} WHERE id = $1`, [id1]);
    const result2 = await client.query(`SELECT order_priority FROM ${TABLE_NAME} WHERE id = $1`, [id2]);

    if (!result1.rows[0] || !result2.rows[0]) {
      throw new Error('One or both components not found');
    }

    const priority1 = result1.rows[0].order_priority;
    const priority2 = result2.rows[0].order_priority;

    // Swap priorities
    await client.query(`UPDATE ${TABLE_NAME} SET order_priority = $1 WHERE id = $2`, [priority2, id1]);
    await client.query(`UPDATE ${TABLE_NAME} SET order_priority = $1 WHERE id = $2`, [priority1, id2]);

    await client.query('COMMIT');

    // Return updated components
    return await getMany(`SELECT * FROM ${TABLE_NAME} WHERE id IN ($1, $2)`, [id1, id2]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

module.exports = {
  getAllResultComponents,
  getComponentsByTestId,
  getResultComponentById,
  getComponentByTestAndCode,
  getComponentsForCombination,
  createResultComponent,
  updateResultComponent,
  updateComponentPriority,
  incrementUsageCount,
  deleteResultComponent,
  hardDeleteResultComponent,
  getComponentStatistics,
  reorderComponentPriorities,
  generateComponentCombination,
  bulkUpdateComponents,
  getComponentCategories,
  swapComponentPriorities
};