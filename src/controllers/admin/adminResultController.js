const adminResultService = require('../../services/adminResultService');
const { validateUUID, validatePagination } = require('../../utils/validation');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'results');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `result-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// GET /api/admin/results - List all test results with filters
const getAllTestResults = async (req, res) => {
  try {
    const adminId = req.admin.id;

    // Extract query parameters
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      testId,
      resultType,
      isActive,
      search,
      hasPdf
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
    if (resultType) filters.resultType = resultType;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (hasPdf !== undefined) filters.hasPdf = hasPdf === 'true';

    const result = await adminResultService.getAllTestResults(filters, adminId);

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
    console.error('Error in getAllTestResults:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/admin/results/:testId - Get results for a specific test
const getResultsByTestId = async (req, res) => {
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

    const result = await adminResultService.getResultsByTestId(testId, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in getResultsByTestId:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/admin/results/single/:id - Get single test result by ID
const getTestResultById = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { id } = req.params;

    // Validate result ID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid result ID format',
        data: null
      });
    }

    const result = await adminResultService.getTestResultById(id, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in getTestResultById:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/admin/results - Create new test result
const createTestResult = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const {
      test_id,
      section_id,
      result_code,
      score_range,
      title,
      description,
      result_type = 'range_based'
    } = req.body;

    // Validate required fields
    if (!test_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: test_id, title',
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

    // Validate result type
    const validResultTypes = ['range_based', 'flag_based', 'hybrid'];
    if (!validResultTypes.includes(result_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid result type. Must be one of: ' + validResultTypes.join(', '),
        data: null
      });
    }

    // Prepare result data
    const resultData = {
      test_id,
      section_id: section_id || null,
      result_code: result_code?.trim() || `R_${Date.now()}`,
      score_range: score_range?.trim() || null,
      title: title.trim(),
      description: description?.trim() || null,
      result_type
    };

    // Handle file upload
    if (req.file) {
      resultData.pdf_file = req.file.filename;
      resultData.pdf_file_size = req.file.size;
    }

    const result = await adminResultService.createTestResult(resultData, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in createTestResult:', error);

    // Clean up uploaded file if there was an error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/admin/results/:id - Update test result
const updateTestResult = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { id } = req.params;
    const {
      section_id,
      result_code,
      score_range,
      title,
      description,
      result_type,
      is_active
    } = req.body;

    // Validate result ID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid result ID format',
        data: null
      });
    }

    // Validate result type if provided
    if (result_type) {
      const validResultTypes = ['range_based', 'flag_based', 'hybrid'];
      if (!validResultTypes.includes(result_type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid result type. Must be one of: ' + validResultTypes.join(', '),
          data: null
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (section_id !== undefined) updateData.section_id = section_id || null;
    if (result_code !== undefined) updateData.result_code = result_code.trim();
    if (score_range !== undefined) updateData.score_range = score_range?.trim() || null;
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (result_type !== undefined) updateData.result_type = result_type;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Handle file upload
    if (req.file) {
      updateData.pdf_file = req.file.filename;
      updateData.pdf_file_size = req.file.size;
    }

    const result = await adminResultService.updateTestResult(id, updateData, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in updateTestResult:', error);

    // Clean up uploaded file if there was an error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// DELETE /api/admin/results/:id - Delete test result
const deleteTestResult = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { id } = req.params;

    // Validate result ID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid result ID format',
        data: null
      });
    }

    const result = await adminResultService.deleteTestResult(id, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in deleteTestResult:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/admin/results/statistics/:testId - Get result statistics for a test
const getResultStatistics = async (req, res) => {
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

    const result = await adminResultService.getResultStatistics(testId, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in getResultStatistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/admin/results/bulk/:testId - Bulk update results for a test
const bulkUpdateResults = async (req, res) => {
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

    const result = await adminResultService.bulkUpdateResults(testId, updates, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Error in bulkUpdateResults:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/admin/results/download/:id - Download PDF result
const downloadResultPDF = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { id } = req.params;

    // Validate result ID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid result ID format',
        data: null
      });
    }

    const result = await adminResultService.getTestResultById(id, adminId);

    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        message: 'Result not found',
        data: null
      });
    }

    const resultData = result.data;

    if (!resultData.pdf_file) {
      return res.status(404).json({
        success: false,
        message: 'No PDF file associated with this result',
        data: null
      });
    }

    const filePath = path.join(process.cwd(), 'uploads', 'results', resultData.pdf_file);

    try {
      await fs.access(filePath);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${resultData.result_code}.pdf"`);

      return res.sendFile(filePath);
    } catch (fileError) {
      return res.status(404).json({
        success: false,
        message: 'PDF file not found on server',
        data: null
      });
    }

  } catch (error) {
    console.error('Error in downloadResultPDF:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

module.exports = {
  upload,
  getAllTestResults,
  getResultsByTestId,
  getTestResultById,
  createTestResult,
  updateTestResult,
  deleteTestResult,
  getResultStatistics,
  bulkUpdateResults,
  downloadResultPDF
};