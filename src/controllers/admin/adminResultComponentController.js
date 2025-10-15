const adminResultComponentService = require('../../services/adminResultComponentService');
const { validateUUID, validatePagination } = require('../../utils/validation');

// GET /api/admin/result-components - List all result components with filters
const getAllResultComponents = async (req, res) => {
  try {
    const adminId = req.admin.id;

    // Extract query parameters
    const {
      page = 1,
      limit = 20,
      sortBy = 'order_priority',
      sortOrder = 'ASC',
      testId,
      componentCategory,
      isActive,
      search
    } = req.query;

    // Validate pagination
    const paginationValidation = validatePagination(page, limit);
    if (!paginationValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: paginationValidation.message,
        data: null
      });
    }

    // Validate test ID if provided
    if (testId && !validateUUID(testId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format',
        data: null
      });
    }

    // Build filters
    const filters = {
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      sortBy,
      sortOrder,
      search: search?.trim()
    };

    // Add optional filters
    if (testId) filters.testId = testId;
    if (componentCategory) filters.componentCategory = componentCategory;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const result = await adminResultComponentService.getAllResultComponents(filters, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.data?.pagination?.total || 0
      }
    });

  } catch (error) {
    console.error('Error in getAllResultComponents:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/admin/result-components/:testId - Get components for a specific test
const getComponentsByTestId = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { testId } = req.params;

    // Validate test ID
    if (!validateUUID(testId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format',
        data: null
      });
    }

    const result = await adminResultComponentService.getComponentsByTestId(testId, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in getComponentsByTestId:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/admin/result-components/single/:id - Get single result component by ID
const getResultComponentById = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { id } = req.params;

    // Validate component ID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid component ID format',
        data: null
      });
    }

    const result = await adminResultComponentService.getResultComponentById(id, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in getResultComponentById:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/admin/result-components - Create new result component
const createResultComponent = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const {
      test_id,
      component_code,
      component_name,
      description,
      score_value = 0,
      order_priority = 1,
      component_category,
      component_weight = 1.0
    } = req.body;

    // Validate required fields
    if (!test_id || !component_code || !component_name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: test_id, component_code, component_name',
        data: null
      });
    }

    // Validate test ID
    if (!validateUUID(test_id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format',
        data: null
      });
    }

    // Validate numeric fields
    if (isNaN(score_value) || isNaN(order_priority) || isNaN(component_weight)) {
      return res.status(400).json({
        success: false,
        message: 'score_value, order_priority, and component_weight must be numbers',
        data: null
      });
    }

    // Validate component weight range (0.1 to 5.0)
    if (component_weight < 0.1 || component_weight > 5.0) {
      return res.status(400).json({
        success: false,
        message: 'component_weight must be between 0.1 and 5.0',
        data: null
      });
    }

    // Prepare component data
    const componentData = {
      test_id,
      component_code: component_code.trim().toUpperCase(),
      component_name: component_name.trim(),
      description: typeof description === 'string' ? (description.trim() || null) : (description ? JSON.stringify(description) : null),
      score_value: parseInt(score_value),
      order_priority: parseInt(order_priority),
      component_category: component_category?.trim() || null,
      component_weight: parseFloat(component_weight)
    };

    const result = await adminResultComponentService.createResultComponent(componentData, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in createResultComponent:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/admin/result-components/:id - Update result component
const updateResultComponent = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { id } = req.params;
    const {
      component_code,
      component_name,
      description,
      score_value,
      order_priority,
      component_category,
      component_weight,
      is_active
    } = req.body;

    // Validate component ID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid component ID format',
        data: null
      });
    }

    // Prepare update data
    const updateData = {};
    if (component_code !== undefined) updateData.component_code = component_code.trim().toUpperCase();
    if (component_name !== undefined) updateData.component_name = component_name.trim();
    if (description !== undefined) {
      // Handle description as string (can be JSON string or plain text)
      if (typeof description === 'string') {
        updateData.description = description.trim() || null;
      } else if (typeof description === 'object') {
        // If it's already an object, stringify it
        updateData.description = JSON.stringify(description);
      } else {
        updateData.description = null;
      }
    }
    if (score_value !== undefined) {
      if (isNaN(score_value)) {
        return res.status(400).json({
          success: false,
          message: 'score_value must be a number',
          data: null
        });
      }
      updateData.score_value = parseInt(score_value);
    }
    if (order_priority !== undefined) {
      if (isNaN(order_priority)) {
        return res.status(400).json({
          success: false,
          message: 'order_priority must be a number',
          data: null
        });
      }
      updateData.order_priority = parseInt(order_priority);
    }
    if (component_category !== undefined) updateData.component_category = component_category?.trim() || null;
    if (component_weight !== undefined) {
      if (isNaN(component_weight) || component_weight < 0.1 || component_weight > 5.0) {
        return res.status(400).json({
          success: false,
          message: 'component_weight must be a number between 0.1 and 5.0',
          data: null
        });
      }
      updateData.component_weight = parseFloat(component_weight);
    }
    if (is_active !== undefined) updateData.is_active = is_active;

    const result = await adminResultComponentService.updateResultComponent(id, updateData, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in updateResultComponent:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/admin/result-components/:id/priority - Update component priority
const updateComponentPriority = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { id } = req.params;
    const { order_priority } = req.body;

    // Validate component ID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid component ID format',
        data: null
      });
    }

    // Validate priority
    if (!order_priority || isNaN(order_priority) || order_priority < 1) {
      return res.status(400).json({
        success: false,
        message: 'order_priority must be a positive number',
        data: null
      });
    }

    const result = await adminResultComponentService.updateComponentPriority(id, parseInt(order_priority), adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in updateComponentPriority:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// DELETE /api/admin/result-components/:id - Delete result component
const deleteResultComponent = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { id } = req.params;

    // Validate component ID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid component ID format',
        data: null
      });
    }

    const result = await adminResultComponentService.deleteResultComponent(id, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in deleteResultComponent:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/admin/result-components/statistics/:testId - Get component statistics for a test
const getComponentStatistics = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { testId } = req.params;

    // Validate test ID
    if (!validateUUID(testId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format',
        data: null
      });
    }

    const result = await adminResultComponentService.getComponentStatistics(testId, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in getComponentStatistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/admin/result-components/reorder/:testId - Reorder component priorities
const reorderComponentPriorities = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { testId } = req.params;

    // Validate test ID
    if (!validateUUID(testId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format',
        data: null
      });
    }

    const result = await adminResultComponentService.reorderComponentPriorities(testId, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in reorderComponentPriorities:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/admin/result-components/bulk/:testId - Bulk update components for a test
const bulkUpdateComponents = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { testId } = req.params;
    const { updates } = req.body;

    // Validate test ID
    if (!validateUUID(testId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format',
        data: null
      });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Updates object is required',
        data: null
      });
    }

    const result = await adminResultComponentService.bulkUpdateComponents(testId, updates, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in bulkUpdateComponents:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/admin/result-components/categories/:testId - Get component categories for a test
const getComponentCategories = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { testId } = req.params;

    // Validate test ID
    if (!validateUUID(testId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format',
        data: null
      });
    }

    const result = await adminResultComponentService.getComponentCategories(testId, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in getComponentCategories:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/admin/result-components/swap/:id1/:id2 - Swap component priorities
const swapComponentPriorities = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { id1, id2 } = req.params;

    // Validate component IDs
    if (!validateUUID(id1) || !validateUUID(id2)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid component ID format',
        data: null
      });
    }

    if (id1 === id2) {
      return res.status(400).json({
        success: false,
        message: 'Cannot swap component with itself',
        data: null
      });
    }

    const result = await adminResultComponentService.swapComponentPriorities(id1, id2, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in swapComponentPriorities:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/admin/result-components/generate/:testId - Generate component combination
const generateComponentCombination = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { testId } = req.params;
    const { scoreData, maxComponents = 4 } = req.body;

    // Validate test ID
    if (!validateUUID(testId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format',
        data: null
      });
    }

    if (!scoreData || typeof scoreData !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'scoreData object is required',
        data: null
      });
    }

    if (isNaN(maxComponents) || maxComponents < 1 || maxComponents > 10) {
      return res.status(400).json({
        success: false,
        message: 'maxComponents must be a number between 1 and 10',
        data: null
      });
    }

    const result = await adminResultComponentService.generateComponentCombination(
      testId,
      scoreData,
      parseInt(maxComponents),
      adminId
    );

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in generateComponentCombination:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

module.exports = {
  getAllResultComponents,
  getComponentsByTestId,
  getResultComponentById,
  createResultComponent,
  updateResultComponent,
  updateComponentPriority,
  deleteResultComponent,
  getComponentStatistics,
  reorderComponentPriorities,
  bulkUpdateComponents,
  getComponentCategories,
  swapComponentPriorities,
  generateComponentCombination
};