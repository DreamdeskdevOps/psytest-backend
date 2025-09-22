const AdminSectionService = require('../../services/adminSectionServices');
const { validateUUID } = require('../../utils/validation');

// GET /api/v1/admin/tests/:testId/sections - Get all sections of test
const getTestSections = async (req, res) => {
  try {
    console.log('🔍 getTestSections called with testId:', req.params.testId);
    const { testId } = req.params;
    const adminId = req.admin.id;

    // Validate UUID
    if (!validateUUID(testId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format',
        data: null
      });
    }

    const result = await AdminSectionService.getTestSections(testId, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Get test sections controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/v1/admin/tests/:testId/sections - Add new section to test
const createTestSection = async (req, res) => {
  try {
    const { testId } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(testId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format',
        data: null
      });
    }

    const {
      sectionName,
      sectionOrder,
      questionCount,
      scoringLogic,
      answerPattern,
      answerOptions,
      maxScore,
      timeLimitMinutes,
      instructions,
      customScoringConfig
    } = req.body;

    // Basic validation
    if (!sectionName?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Section name is required',
        data: null
      });
    }

    if (!questionCount || questionCount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Question count must be at least 1',
        data: null
      });
    }

    if (!answerPattern) {
      return res.status(400).json({
        success: false,
        message: 'Answer pattern is required',
        data: null
      });
    }

    const sectionData = {
      sectionName: sectionName.trim(),
      sectionOrder: sectionOrder ? parseInt(sectionOrder) : null,
      questionCount: parseInt(questionCount),
      scoringLogic: scoringLogic || 'STANDARD',
      answerPattern: answerPattern,
      answerOptions: answerOptions ? parseInt(answerOptions) : null,
      maxScore: maxScore ? parseFloat(maxScore) : null,
      timeLimitMinutes: timeLimitMinutes ? parseInt(timeLimitMinutes) : null,
      instructions: instructions?.trim(),
      customScoringConfig: customScoringConfig || {}
    };

    const result = await AdminSectionService.createTestSection(
      testId, 
      sectionData, 
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
    console.error('Create test section controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/v1/admin/sections/:id - Get section details
const getSectionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    const result = await AdminSectionService.getSectionDetails(id, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Get section details controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/sections/:id - Update section basic info
const updateSectionInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    const {
      sectionName,
      questionCount,
      scoringLogic,
      answerPattern,
      answerOptions,
      maxScore,
      instructions,
      customScoringConfig
    } = req.body;

    // Build update data (only include provided fields)
    const updateData = {};
    if (sectionName !== undefined) updateData.sectionName = sectionName.trim();
    if (questionCount !== undefined) updateData.questionCount = parseInt(questionCount);
    if (scoringLogic !== undefined) updateData.scoringLogic = scoringLogic;
    if (answerPattern !== undefined) updateData.answerPattern = answerPattern;
    if (answerOptions !== undefined) updateData.answerOptions = parseInt(answerOptions);
    if (maxScore !== undefined) updateData.maxScore = parseFloat(maxScore);
    if (instructions !== undefined) updateData.instructions = instructions?.trim();
    if (customScoringConfig !== undefined) updateData.customScoringConfig = customScoringConfig;

    const result = await AdminSectionService.updateSectionInfo(
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
    console.error('Update section controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// DELETE /api/v1/admin/sections/:id - Delete section
const deleteSection = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    const result = await AdminSectionService.deleteSection(id, adminId, ipAddress, userAgent);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Delete section controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/v1/admin/sections/:id/duplicate - Duplicate section
const duplicateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { newSectionName } = req.body;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    const result = await AdminSectionService.duplicateSection(
      id, 
      newSectionName, 
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
    console.error('Duplicate section controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/sections/:id/timing - Set section timing
const setSectionTiming = async (req, res) => {
  try {
    const { id } = req.params;
    const { timeLimitMinutes } = req.body;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    // Validate time limit
    if (timeLimitMinutes !== null && timeLimitMinutes !== undefined) {
      const timeLimit = parseInt(timeLimitMinutes);
      if (isNaN(timeLimit) || timeLimit < 1 || timeLimit > 180) {
        return res.status(400).json({
          success: false,
          message: 'Time limit must be between 1 and 180 minutes, or null to remove limit',
          data: null
        });
      }
    }

    const finalTimeLimit = timeLimitMinutes === null ? null : parseInt(timeLimitMinutes);

    const result = await AdminSectionService.setSectionTiming(
      id, 
      finalTimeLimit, 
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
    console.error('Set section timing controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/v1/admin/sections/:id/timing - Get section timing
const getSectionTiming = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    const result = await AdminSectionService.getSectionTiming(id, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Get section timing controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/tests/:testId/sections/reorder - Reorder sections
const reorderTestSections = async (req, res) => {
  try {
    const { testId } = req.params;
    const { sectionOrders } = req.body;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(testId)) {
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

    const result = await AdminSectionService.reorderTestSections(
      testId, 
      sectionOrders, 
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
    console.error('Reorder sections controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/v1/admin/sections/bulk-update - Bulk update sections
const bulkUpdateSections = async (req, res) => {
  try {
    const { updates } = req.body;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validation
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required',
        data: null
      });
    }

    if (updates.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update more than 20 sections at once',
        data: null
      });
    }

    // Validate each update structure
    for (const update of updates) {
      if (!update.sectionId || !validateUUID(update.sectionId) || !update.updateData) {
        return res.status(400).json({
          success: false,
          message: 'Each update must have valid sectionId (UUID) and updateData object',
          data: null
        });
      }
    }

    const result = await AdminSectionService.bulkUpdateSections(
      updates, 
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
    console.error('Bulk update sections controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// GET /api/v1/admin/sections/:id/options - Get section answer options
const getSectionOptions = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    const result = await AdminSectionService.getSectionOptions(id, adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Get section options controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// PUT /api/v1/admin/sections/:id/options - Set section answer options
const setSectionOptions = async (req, res) => {
  try {
    const { id } = req.params;
    const { options } = req.body;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    // Validate options array
    if (!Array.isArray(options) || options.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Options array is required',
        data: null
      });
    }

    // Validate option structure
    for (const option of options) {
      if (!option.text || typeof option.text !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Each option must have a text field',
          data: null
        });
      }
    }

    const result = await AdminSectionService.setSectionOptions(
      id,
      options,
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
    console.error('Set section options controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// POST /api/v1/admin/sections/:id/options - Add answer option to section
const addSectionOption = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, value, isCorrect } = req.body;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUID
    if (!validateUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    // Validate option
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Option text is required',
        data: null
      });
    }

    const optionData = {
      text: text.trim(),
      value: value || null,
      isCorrect: Boolean(isCorrect)
    };

    const result = await AdminSectionService.addSectionOption(
      id,
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
    console.error('Add section option controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// DELETE /api/v1/admin/sections/:sectionId/options/:optionId - Delete section option
const deleteSectionOption = async (req, res) => {
  try {
    const { sectionId, optionId } = req.params;
    const adminId = req.admin.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate UUIDs
    if (!validateUUID(sectionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID format',
        data: null
      });
    }

    const result = await AdminSectionService.deleteSectionOption(
      sectionId,
      optionId,
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
    console.error('Delete section option controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

module.exports = {
  getTestSections,
  createTestSection,
  getSectionDetails,
  updateSectionInfo,
  deleteSection,
  duplicateSection,
  setSectionTiming,
  getSectionTiming,
  reorderTestSections,
  bulkUpdateSections,
  getSectionOptions,
  setSectionOptions,
  addSectionOption,
  deleteSectionOption
};