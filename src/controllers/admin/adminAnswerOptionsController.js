const AdminAnswerOptionsService = require('../../services/adminAnswerOptionsService');
const { validateUUID } = require('../../utils/validation');

// GET /api/v1/admin/questions/:questionId/options - Get question answer options
const getQuestionOptions = async (req, res) => {
  try {
    const { questionId } = req.params;
    const adminId = req.admin.id;

    // Validate UUID
    if (!validateUUID(questionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID format',
        data: null
      });
    }

    const result = await AdminAnswerOptionsService.getQuestionAnswerOptions(questionId, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Get question options controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};


// POST /api/v1/admin/questions/:questionId/options - Add answer option
const addAnswerOption = async (req, res) => {
  try {
    const { questionId } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(questionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID format',
        data: null
      });
    }

    const {
      optionText,
      optionValue,
      optionOrder,
      isCorrect,
      optionType
    } = req.body;

    // Basic validation
    if (!optionText?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Option text is required',
        data: null
      });
    }

    if (optionText.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Option text cannot exceed 500 characters',
        data: null
      });
    }

    const optionData = {
      optionText: optionText.trim(),
      optionValue: optionValue?.trim() || optionText.trim(),
      optionOrder: optionOrder ? parseInt(optionOrder) : null,
      isCorrect: Boolean(isCorrect),
      optionType: optionType || 'STANDARD'
    };

    const result = await AdminAnswerOptionsService.addAnswerOption(
      questionId, 
      optionData, 
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
    console.error('Add answer option controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/options/:id - Update answer option
const updateAnswerOption = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid option ID format',
        data: null
      });
    }

    const {
      optionText,
      optionValue,
      isCorrect,
      optionType
    } = req.body;

    // Build update data (only include provided fields)
    const updateData = {};
    if (optionText !== undefined) {
      if (!optionText.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Option text cannot be empty',
          data: null
        });
      }
      updateData.optionText = optionText.trim();
    }
    if (optionValue !== undefined) updateData.optionValue = optionValue?.trim();
    if (isCorrect !== undefined) updateData.isCorrect = Boolean(isCorrect);
    if (optionType !== undefined) updateData.optionType = optionType;

    const result = await AdminAnswerOptionsService.updateAnswerOption(
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
    console.error('Update answer option controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// DELETE /api/v1/admin/options/:id - Delete answer option
const deleteAnswerOption = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid option ID format',
        data: null
      });
    }

    const result = await AdminAnswerOptionsService.deleteAnswerOption(id, adminId, ipAddress, userAgent);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Delete answer option controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/questions/:questionId/options/reorder - Reorder options
const reorderQuestionOptions = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { optionOrders } = req.body;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(questionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID format',
        data: null
      });
    }

    // Validate option orders
    if (!Array.isArray(optionOrders) || optionOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Option orders array is required',
        data: null
      });
    }

    // Validate option order structure
    for (const order of optionOrders) {
      if (!order.optionId || !validateUUID(order.optionId) || typeof order.newOrder !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'Each option order must have valid optionId (UUID) and newOrder (number)',
          data: null
        });
      }
    }

    const result = await AdminAnswerOptionsService.reorderQuestionOptions(
      questionId, 
      optionOrders, 
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
    console.error('Reorder options controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/questions/:id/option-type - Set option type
const setQuestionOptionType = async (req, res) => {
  try {
    const { id } = req.params;
    const { optionType, customOptions } = req.body;
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

    // Validate option type
    if (!optionType) {
      return res.status(400).json({
        success: false,
        message: 'Option type is required',
        data: null
      });
    }

    const allowedTypes = [
      'YES_NO', 'MULTIPLE_CHOICE', 'LIKERT_SCALE', 'ODD_EVEN', 
      'TRUE_FALSE', 'RATING_SCALE', 'FREQUENCY_SCALE'
    ];

    if (!allowedTypes.includes(optionType)) {
      return res.status(400).json({
        success: false,
        message: `Option type must be one of: ${allowedTypes.join(', ')}`,
        data: null
      });
    }

    // Validate custom options if provided
    if (customOptions) {
      if (!Array.isArray(customOptions) || customOptions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Custom options must be a non-empty array',
          data: null
        });
      }

      if (customOptions.length > 10) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 10 custom options allowed',
          data: null
        });
      }

      // Check for empty or duplicate options
      const cleanOptions = customOptions.map(opt => opt.toString().trim()).filter(opt => opt.length > 0);
      const uniqueOptions = [...new Set(cleanOptions.map(opt => opt.toLowerCase()))];
      
      if (cleanOptions.length !== customOptions.length) {
        return res.status(400).json({
          success: false,
          message: 'Custom options cannot be empty',
          data: null
        });
      }

      if (uniqueOptions.length !== cleanOptions.length) {
        return res.status(400).json({
          success: false,
          message: 'Custom options must be unique',
          data: null
        });
      }
    }

    const result = await AdminAnswerOptionsService.setQuestionOptionType(
      id, 
      optionType, 
      customOptions, 
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
    console.error('Set option type controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/v1/admin/option-types - Get available option types
const getAvailableOptionTypes = async (req, res) => {
  try {
    const result = await AdminAnswerOptionsService.getAvailableOptionTypes();

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Get option types controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/v1/admin/questions/:id/set-correct-answer - Set correct answer
const setCorrectAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const { correctAnswer } = req.body;
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

    // Validate correct answer
    if (!correctAnswer?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Correct answer text is required',
        data: null
      });
    }

    const result = await AdminAnswerOptionsService.setCorrectAnswer(
      id, 
      correctAnswer.trim(), 
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
    console.error('Set correct answer controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/questions/:id/answer-pattern - Set answer pattern
const setAnswerPattern = async (req, res) => {
  try {
    const { id } = req.params;
    const { answerPattern, patternConfig } = req.body;
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

    // Validate answer pattern
    if (!answerPattern) {
      return res.status(400).json({
        success: false,
        message: 'Answer pattern is required',
        data: null
      });
    }

    const allowedPatterns = ['ODD_EVEN', 'STANDARD', 'WEIGHTED', 'REVERSE_SCORED'];
    if (!allowedPatterns.includes(answerPattern)) {
      return res.status(400).json({
        success: false,
        message: `Answer pattern must be one of: ${allowedPatterns.join(', ')}`,
        data: null
      });
    }

    const result = await AdminAnswerOptionsService.setAnswerPattern(
      id, 
      answerPattern, 
      patternConfig || {}, 
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
    console.error('Set answer pattern controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

module.exports = {
  getQuestionOptions,
  addAnswerOption,
  updateAnswerOption,
  deleteAnswerOption,
  reorderQuestionOptions,
  setQuestionOptionType,
  getAvailableOptionTypes,
  setCorrectAnswer,
  setAnswerPattern
};