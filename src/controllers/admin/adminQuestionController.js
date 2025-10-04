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
      isRequired,
      questionFlag
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
    if (questionFlag !== undefined) updateData.questionFlag = questionFlag;

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

// PUT /api/v1/admin/questions/:id/with-images - Update question with images (identical to create)
const updateQuestionWithImages = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const imageFiles = req.files;

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID format',
        data: null
      });
    }

    const questionData = req.body;

    console.log('🔄 Received question update data:', questionData);
    console.log('🏷️ Question flag from body:', questionData.questionFlag);

    // Normalize field names for validation
    if (questionData.questionContentType) {
      questionData.question_content_type = questionData.questionContentType;
    }

    // Always normalize question flag, even if empty/null
    questionData.question_flag = questionData.questionFlag || null;
    console.log('🏷️ Normalized question_flag:', questionData.question_flag);

    const result = await AdminQuestionService.updateQuestionWithImages(
      id,
      questionData,
      imageFiles,
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
    console.error('Update question with images controller error:', error);
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

// POST /api/v1/admin/questions/bulk-delete - Bulk delete questions
const bulkDeleteQuestions = async (req, res) => {
  try {
    const { questionIds } = req.body;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate input
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Question IDs array is required and cannot be empty',
        data: null
      });
    }

    // Validate all UUIDs
    for (const id of questionIds) {
      if (!validateUUID(id)) {
        return res.status(400).json({
          success: false,
          message: `Invalid question ID format: ${id}`,
          data: null
        });
      }
    }

    const result = await AdminQuestionService.bulkDeleteQuestions(questionIds, adminId, ipAddress, userAgent);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Bulk delete questions controller error:', error);
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

// GET column mapping information for bulk import
const getBulkImportColumnMapping = async (req, res) => {
  try {
    const columnMapping = {
      required: [
        {
          excelColumn: 'question_text',
          databaseColumn: 'question_text',
          description: 'The question text content',
          example: 'What is the capital of France?',
          dataType: 'TEXT'
        },
        {
          excelColumn: 'order_index',
          databaseColumn: 'order_index',
          description: 'Order/position of question in section (1, 2, 3...)',
          example: '1',
          dataType: 'INTEGER'
        }
      ],
      optional: [
        {
          excelColumn: 'question_flag',
          alternateColumn: 'flag',
          databaseColumn: 'question_flag',
          description: 'Flag code for scoring (e.g., I, E, N, S for MBTI)',
          example: 'I',
          dataType: 'TEXT',
          default: ''
        },
        {
          excelColumn: 'question_type',
          databaseColumn: 'question_type',
          description: 'Type of question',
          example: 'MULTIPLE_CHOICE',
          dataType: 'ENUM',
          allowedValues: ['STANDARD', 'TEXT', 'IMAGE', 'MIXED', 'SCENARIO', 'IMAGE_BASED', 'AUDIO_BASED', 'VIDEO_BASED', 'MULTIPLE_CHOICE', 'SINGLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'FILL_BLANK'],
          default: 'MULTIPLE_CHOICE'
        },
        {
          excelColumn: 'difficulty_level',
          alternateColumn: 'difficulty',
          databaseColumn: 'difficulty_level',
          description: 'Difficulty level of question',
          example: 'MEDIUM',
          dataType: 'ENUM',
          allowedValues: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'],
          default: 'MEDIUM'
        },
        {
          excelColumn: 'marks',
          databaseColumn: 'marks',
          description: 'Marks/points for this question',
          example: '1',
          dataType: 'DECIMAL',
          default: '1'
        },
        {
          excelColumn: 'explanation',
          alternateColumn: 'answer_explanation',
          databaseColumn: 'explanation',
          description: 'Explanation or answer key',
          example: 'The capital of France is Paris',
          dataType: 'TEXT',
          default: ''
        },
        {
          excelColumn: 'question_number',
          databaseColumn: 'custom_number',
          description: 'Custom question number (e.g., Q1, 1a, etc.)',
          example: 'Q1',
          dataType: 'TEXT',
          default: ''
        },
        {
          excelColumn: 'is_required',
          databaseColumn: 'is_required',
          description: 'Whether question is required',
          example: 'true',
          dataType: 'BOOLEAN',
          default: 'true'
        }
      ]
    };

    return res.status(200).json({
      success: true,
      message: 'Column mapping retrieved successfully',
      data: columnMapping
    });

  } catch (error) {
    console.error('Get column mapping error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// Download Excel template for bulk import
const downloadBulkImportTemplate = async (req, res) => {
  try {
    const xlsx = require('xlsx');

    // Create template data with headers and sample row
    const templateData = [
      {
        question_text: 'Sample question: What is 2 + 2?',
        order_index: 1,
        question_flag: 'I',
        question_type: 'MULTIPLE_CHOICE',
        difficulty_level: 'EASY',
        marks: 1,
        explanation: 'The answer is 4',
        question_number: 'Q1',
        is_required: true
      }
    ];

    // Create workbook and worksheet
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(templateData);

    // Set column widths
    ws['!cols'] = [
      { wch: 50 },  // question_text
      { wch: 12 },  // order_index
      { wch: 15 },  // question_flag
      { wch: 20 },  // question_type
      { wch: 17 },  // difficulty_level
      { wch: 10 },  // marks
      { wch: 40 },  // explanation
      { wch: 15 },  // question_number
      { wch: 12 }   // is_required
    ];

    xlsx.utils.book_append_sheet(wb, ws, 'Questions');

    // Generate buffer
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    res.setHeader('Content-Disposition', 'attachment; filename=question_import_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    return res.send(buffer);

  } catch (error) {
    console.error('Download template error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate template',
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

// Enhanced controller methods for multi-image support

// POST /api/v1/admin/sections/:sectionId/questions-with-images - Create question with images
const createQuestionWithImages = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const imageFiles = req.files;

    // Validate UUID
    if (!validateUUID(sectionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    const questionData = req.body;

    console.log('🚀 Received question data:', questionData);
    console.log('🏷️ Question flag from body:', questionData.questionFlag);

    // Normalize field names for validation
    if (questionData.questionContentType) {
      questionData.question_content_type = questionData.questionContentType;
    }

    // Always normalize question flag, even if empty/null
    questionData.question_flag = questionData.questionFlag || null;
    console.log('🏷️ Normalized question_flag:', questionData.question_flag);

    // Basic validation
    if (!questionData.questionText?.trim() && questionData.questionContentType !== 'options_only') {
      return res.status(400).json({
        success: false,
        message: 'Question text is required for this content type',
        data: null
      });
    }

    const result = await AdminQuestionService.createQuestionWithImages(
      sectionId,
      questionData,
      imageFiles,
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
    console.error('Create question with images controller error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      data: null,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// POST /api/v1/admin/questions/:id/images - Add multiple images to question
const addQuestionImages = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const imageFiles = req.files;

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID format',
        data: null
      });
    }

    if (!imageFiles || imageFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided',
        data: null
      });
    }

    const result = await AdminQuestionService.addQuestionImages(
      id,
      imageFiles,
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
    console.error('Add question images controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// DELETE /api/v1/admin/questions/:questionId/images/:imageId - Remove specific image
const removeQuestionImageById = async (req, res) => {
  try {
    const { questionId, imageId } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUIDs
    if (!validateUUID(questionId) || !validateUUID(imageId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format',
        data: null
      });
    }

    const result = await AdminQuestionService.removeQuestionImageById(
      questionId,
      imageId,
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
    console.error('Remove question image controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/questions/:id/images/reorder - Reorder question images
const reorderQuestionImages = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageOrders } = req.body;
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

    if (!Array.isArray(imageOrders) || imageOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Image orders array is required',
        data: null
      });
    }

    const result = await AdminQuestionService.reorderQuestionImages(
      id,
      imageOrders,
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
    console.error('Reorder question images controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/questions/:id/images/numbers - Set image numbers
const setQuestionImageNumbers = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageNumberMap } = req.body;
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

    if (!Array.isArray(imageNumberMap) || imageNumberMap.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Image number map array is required',
        data: null
      });
    }

    const result = await AdminQuestionService.setQuestionImageNumbers(
      id,
      imageNumberMap,
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
    console.error('Set question image numbers controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/questions/:id/content-type - Update question content type
const updateQuestionContentType = async (req, res) => {
  try {
    const { id } = req.params;
    const { contentType } = req.body;
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

    if (!contentType) {
      return res.status(400).json({
        success: false,
        message: 'Content type is required',
        data: null
      });
    }

    const result = await AdminQuestionService.updateQuestionContentType(
      id,
      contentType,
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
    console.error('Update question content type controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/v1/admin/questions/:id/formatted - Get formatted question with images
const getFormattedQuestion = async (req, res) => {
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

    const result = await AdminQuestionService.getFormattedQuestion(id, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Get formatted question controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

module.exports = {
  getSectionQuestions,
  createSectionQuestion,
  getBulkImportColumnMapping,
  downloadBulkImportTemplate,
  bulkImportQuestions,
  getQuestionDetails,
  updateQuestion,
  deleteQuestion,
  bulkDeleteQuestions,
  duplicateQuestion,
  updateQuestionContent,
  uploadQuestionImage,
  updateQuestionImage,
  removeQuestionImage,
  getQuestionPreview,
  reorderSectionQuestions,
  setQuestionNumber,
  setSectionNumbering,
  // Enhanced methods
  createQuestionWithImages,
  updateQuestionWithImages,
  addQuestionImages,
  removeQuestionImageById,
  reorderQuestionImages,
  setQuestionImageNumbers,
  updateQuestionContentType,
  getFormattedQuestion
};