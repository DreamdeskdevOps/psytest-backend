const AdminQuestionService = require('../../services/adminQuestionServices');
const { validateUUID } = require('../../utils/validation');
const xlsx = require('xlsx');

// GET /api/v1/admin/sections/:sectionId/questions - Get all questions in section
const getSectionQuestions = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const adminId = req.admin.id;

    // Validate UUID
    if (!validateUUID(sectionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    const result = await AdminQuestionService.getSectionQuestions(sectionId, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Get section questions controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/v1/admin/sections/:sectionId/questions - Add question to section
const createSectionQuestion = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(sectionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    const {
      questionText,
      questionOrder,
      questionNumber,
      options,
      correctAnswer,
      marks,
      difficultyLevel,
      explanation,
      questionType,
      isRequired
    } = req.body;

    // Basic validation
    if (!questionText?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Question text is required',
        data: null
      });
    }

    if (questionText.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Question text must be at least 5 characters long',
        data: null
      });
    }

    if (questionText.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Question text cannot exceed 1000 characters',
        data: null
      });
    }

    const questionData = {
      questionText: questionText.trim(),
      questionOrder: questionOrder ? parseInt(questionOrder) : null,
      questionNumber: questionNumber?.toString().trim(),
      options: options || [],
      correctAnswer: correctAnswer?.toString().trim(),
      marks: marks ? parseFloat(marks) : 1,
      difficultyLevel: difficultyLevel || 'MEDIUM',
      explanation: explanation?.trim(),
      questionType: questionType || 'STANDARD',
      isRequired: isRequired !== undefined ? Boolean(isRequired) : true
    };

    const result = await AdminQuestionService.createSectionQuestion(
      sectionId, 
      questionData, 
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
    console.error('Create section question controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/v1/admin/questions/:id - Get question details
const getQuestionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID format',
        data: null
      });
    }

    const result = await AdminQuestionService.getQuestionDetails(id, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Get question details controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/questions/:id - Update question
const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID format',
        data: null
      });
    }

    const {
      questionText,
      questionNumber,
      options,
      correctAnswer,
      marks,
      difficultyLevel,
      explanation,
      questionType,
      isRequired
    } = req.body;

    // Build update data (only include provided fields)
    const updateData = {};
    if (questionText !== undefined) updateData.questionText = questionText.trim();
    if (questionNumber !== undefined) updateData.questionNumber = questionNumber.toString().trim();
    if (options !== undefined) updateData.options = options;
    if (correctAnswer !== undefined) updateData.correctAnswer = correctAnswer.toString().trim();
    if (marks !== undefined) updateData.marks = parseFloat(marks);
    if (difficultyLevel !== undefined) updateData.difficultyLevel = difficultyLevel;
    if (explanation !== undefined) updateData.explanation = explanation?.trim();
    if (questionType !== undefined) updateData.questionType = questionType;
    if (isRequired !== undefined) updateData.isRequired = Boolean(isRequired);

    const result = await AdminQuestionService.updateQuestionInfo(
      id, 
      updateData, 
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
    console.error('Update question controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// DELETE /api/v1/admin/questions/:id - Delete question
const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID format',
        data: null
      });
    }

    const result = await AdminQuestionService.deleteQuestion(id, adminId, ipAddress, userAgent);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Delete question controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/v1/admin/questions/:id/duplicate - Duplicate question
const duplicateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID format',
        data: null
      });
    }

    const result = await AdminQuestionService.duplicateQuestion(id, adminId, ipAddress, userAgent);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Duplicate question controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/questions/:id/content - Update question text
const updateQuestionContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { questionText } = req.body;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID format',
        data: null
      });
    }

    // Validate question text
    if (!questionText?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Question text is required',
        data: null
      });
    }

    const result = await AdminQuestionService.updateQuestionContent(
      id, 
      questionText, 
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
    console.error('Update question content controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/v1/admin/questions/:id/image - Upload question image
const uploadQuestionImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID format',
        data: null
      });
    }

    const result = await AdminQuestionService.updateQuestionImage(
      id, 
      imageUrl, 
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
    console.error('Upload question image controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/questions/:id/image - Update question image
const updateQuestionImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID format',
        data: null
      });
    }

    const result = await AdminQuestionService.updateQuestionImage(
      id, 
      imageUrl, 
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
    console.error('Update question image controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// DELETE /api/v1/admin/questions/:id/image - Remove question image
const removeQuestionImage = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID format',
        data: null
      });
    }

    const result = await AdminQuestionService.removeQuestionImage(id, adminId, ipAddress, userAgent);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Remove question image controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/v1/admin/questions/:id/preview - Preview question
const getQuestionPreview = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID format',
        data: null
      });
    }

    const result = await AdminQuestionService.getQuestionPreview(id, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Get question preview controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/sections/:sectionId/questions/reorder - Reorder questions
const reorderSectionQuestions = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { questionOrders } = req.body;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(sectionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    // Validate question orders
    if (!Array.isArray(questionOrders) || questionOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Question orders array is required',
        data: null
      });
    }

    // Validate question order structure
    for (const order of questionOrders) {
      if (!order.questionId || !validateUUID(order.questionId) || typeof order.newOrder !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'Each question order must have valid questionId (UUID) and newOrder (number)',
          data: null
        });
      }
    }

    const result = await AdminQuestionService.reorderSectionQuestions(
      sectionId, 
      questionOrders, 
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
    console.error('Reorder questions controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/questions/:id/number - Set custom question number
const setQuestionNumber = async (req, res) => {
  try {
    const { id } = req.params;
    const { questionNumber } = req.body;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID format',
        data: null
      });
    }

    // Validate question number
    if (questionNumber === undefined || questionNumber === null || questionNumber.toString().trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Question number is required',
        data: null
      });
    }

    const result = await AdminQuestionService.setQuestionNumber(
      id, 
      questionNumber, 
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
    console.error('Set question number controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/sections/:sectionId/numbering - Set section numbering style
const setSectionNumbering = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const {
      numberingStyle,
      numberingStart,
      numberingPrefix,
      numberingSuffix
    } = req.body;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(sectionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    const numberingConfig = {
      numberingStyle: numberingStyle || 'NUMERIC',
      numberingStart: numberingStart ? parseInt(numberingStart) : 1,
      numberingPrefix: numberingPrefix || '',
      numberingSuffix: numberingSuffix || ''
    };

    const result = await AdminQuestionService.setSectionNumbering(
      sectionId, 
      numberingConfig, 
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
    console.error('Set section numbering controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

const bulkImportQuestions = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded.',
        data: null
      });
    }

    // Validate UUID
    if (!validateUUID(sectionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    const result = await AdminQuestionService.bulkImportQuestions(
      sectionId,
      req.file.buffer,
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
    console.error('Bulk import questions controller error:', error);
    // Check if the error is a known validation error from the service
    if (error.isJoi || error.isCustom) {
        return res.status(400).json({
            success: false,
            message: error.message,
            data: null
        });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error during bulk import',
      data: null
    });
  }
};

module.exports = {
  getSectionQuestions,
  createSectionQuestion,
  bulkImportQuestions,
  getQuestionDetails,
  updateQuestion,
  deleteQuestion,
  duplicateQuestion,
  updateQuestionContent,
  uploadQuestionImage,
  updateQuestionImage,
  removeQuestionImage,
  getQuestionPreview,
  reorderSectionQuestions,
  setQuestionNumber,
  setSectionNumbering
};