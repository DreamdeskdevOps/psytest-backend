const adminTestService = require('../../services/adminTestServices');
const { validateUUID, validatePagination } = require('../../utils/validation');

// GET /api/admin/tests - List all tests with filters
const getAllTests = async (req, res) => {
  try {
    const adminId = req.admin.id;

    // Extract query parameters
    const {
      page = 1,
      limit = 20,
      sortBy = 'newest',
      isActive,
      testType,
      isFree,
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

    // Build filters
    const filters = {
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      sortBy,
      search: search?.trim()
    };

    // Add boolean filters
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (isFree !== undefined) filters.isFree = isFree === 'true';
    if (testType) filters.testType = testType;

    const result = await adminTestService.getAllTests(filters, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount: result.data?.totalCount || 0
      }
    });

  } catch (error) {
    console.error('Get all tests controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/admin/tests/:id - Get test details with sections
const getTestDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format',
        data: null
      });
    }

    const result = await adminTestService.getTestDetails(id, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Get test details controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/admin/tests - Create new test
const createTest = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const {
      title,
      description,
      instructions,
      testType,
      durationMinutes,
      isFree = true,
      price = 0,
      passingScore = 60,
      maxAttempts = 1,
      settings = {}
    } = req.body;

    // Basic validation
    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Test title is required',
        data: null
      });
    }

    if (!testType) {
      return res.status(400).json({
        success: false,
        message: 'Test type is required',
        data: null
      });
    }

    const testData = {
      title: title.trim(),
      description: description?.trim(),
      instructions: instructions?.trim(),
      testType,
      durationMinutes: parseInt(durationMinutes) || 60,
      isFree: Boolean(isFree),
      price: parseFloat(price) || 0,
      passingScore: parseInt(passingScore) || 60,
      maxAttempts: parseInt(maxAttempts) || 1,
      settings
    };

    const result = await adminTestService.createTest(testData, adminId, ipAddress, userAgent);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Create test controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/admin/tests/:id - Update test basic info
const updateTest = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format',
        data: null
      });
    }

    const {
      title,
      description,
      instructions,
      testType,
      durationMinutes,
      isFree,
      price,
      passingScore,
      maxAttempts,
      settings
    } = req.body;

    // Build update data (only include provided fields)
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (instructions !== undefined) updateData.instructions = instructions?.trim();
    if (testType !== undefined) updateData.testType = testType;
    if (durationMinutes !== undefined) updateData.durationMinutes = parseInt(durationMinutes);
    if (isFree !== undefined) updateData.isFree = Boolean(isFree);
    if (price !== undefined) updateData.price = parseFloat(price);
    if (passingScore !== undefined) updateData.passingScore = parseInt(passingScore);
    if (maxAttempts !== undefined) updateData.maxAttempts = parseInt(maxAttempts);
    if (settings !== undefined) updateData.settings = settings;

    const result = await adminTestService.updateTest(id, updateData, adminId, ipAddress, userAgent);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Update test controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// DELETE /api/admin/tests/:id - Delete test
const deleteTest = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format',
        data: null
      });
    }

    const result = await adminTestService.deleteTest(id, adminId, ipAddress, userAgent);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Delete test controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/admin/tests/:id/duplicate - Duplicate entire test
const duplicateTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { newTitle } = req.body;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format',
        data: null
      });
    }

    const result = await adminTestService.duplicateTest(id, newTitle, adminId, ipAddress, userAgent);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Duplicate test controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/admin/tests/:id/toggle-status - Activate/Deactivate test
const toggleTestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format',
        data: null
      });
    }

    const result = await adminTestService.toggleTestStatus(id, adminId, ipAddress, userAgent);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Toggle test status controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/admin/tests/:id/preview - Preview entire test
const getTestPreview = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format',
        data: null
      });
    }

    const result = await adminTestService.getTestPreview(id, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Get test preview controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/admin/tests/bulk-actions - Bulk operations
const bulkActions = async (req, res) => {
  try {
    const { operation, testIds, operationData = {} } = req.body;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validation
    if (!operation) {
      return res.status(400).json({
        success: false,
        message: 'Operation is required',
        data: null
      });
    }

    if (!Array.isArray(testIds) || testIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Test IDs array is required',
        data: null
      });
    }

    // Validate all UUIDs
    const invalidIds = testIds.filter(id => !validateUUID(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid test ID format: ${invalidIds.join(', ')}`,
        data: null
      });
    }

    const allowedOperations = ['activate', 'deactivate', 'delete', 'update_test_type'];
    if (!allowedOperations.includes(operation)) {
      return res.status(400).json({
        success: false,
        message: `Invalid operation. Allowed: ${allowedOperations.join(', ')}`,
        data: null
      });
    }

    const result = await adminTestService.bulkOperations(
      operation,
      testIds,
      operationData,
      adminId,
      ipAddress,
      userAgent
    );

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Bulk actions controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/admin/tests/:id/export - Export test with all sections
const exportTest = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format',
        data: null
      });
    }

    const result = await adminTestService.getTestDetails(id, adminId);

    if (!result.success) {
      return res.status(result.statusCode).json({
        success: result.success,
        message: result.message,
        data: result.data
      });
    }

    // Format for export
    const exportData = {
      exportInfo: {
        exportedAt: new Date().toISOString(),
        exportedBy: adminId,
        version: '1.0'
      },
      test: result.data
    };

    // Set download headers
    const fileName = `test_${result.data.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/json');

    return res.status(200).json(exportData);

  } catch (error) {
    console.error('Export test controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/admin/tests/:id/reorder-sections - Reorder test sections
const reorderSections = async (req, res) => {
  try {
    const { id } = req.params;
    const { sectionOrders } = req.body;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format',
        data: null
      });
    }

    // Validate section orders
    if (!Array.isArray(sectionOrders) || sectionOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Section orders array is required',
        data: null
      });
    }

    // Validate section order structure
    for (const order of sectionOrders) {
      if (!order.sectionId || !validateUUID(order.sectionId) || typeof order.newOrder !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'Each section order must have valid sectionId (UUID) and newOrder (number)',
          data: null
        });
      }
    }

    const result = await adminTestService.reorderSections(id, sectionOrders, adminId, ipAddress, userAgent);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Reorder sections controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

module.exports = {
  getAllTests,
  getTestDetails,
  createTest,
  updateTest,
  deleteTest,
  duplicateTest,
  toggleTestStatus,
  getTestPreview,
  bulkActions,
  exportTest,
  reorderSections
};