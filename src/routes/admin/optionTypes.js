const express = require('express');
const { checkPermission } = require('../../middleware/auth');

const router = express.Router();

// Temporary mock admin for testing
router.use((req, res, next) => {
  req.admin = { id: '227fd748-ae43-477e-b4c5-1f4253aba945' };
  next();
});

// In-memory storage for custom option types (in production, this would be a database)
let customOptionTypes = [];

// System option types (hardcoded)
const systemOptionTypes = [
      {
        id: 'yes_no',
        typeName: 'YES_NO',
        displayName: 'Yes/No',
        description: 'Binary yes or no questions',
        defaultOptions: ['Yes', 'No'],
        minOptions: 2,
        maxOptions: 2,
        allowsCorrectAnswer: false,
        useCases: ['Preferences', 'Binary decisions', 'Fact checking'],
        isSystemType: true,
        isActive: true
      },
      {
        id: 'multiple_choice',
        typeName: 'MULTIPLE_CHOICE',
        displayName: 'Multiple Choice',
        description: 'Single correct answer from multiple options',
        defaultOptions: ['Option A', 'Option B', 'Option C', 'Option D'],
        minOptions: 2,
        maxOptions: 6,
        allowsCorrectAnswer: true,
        useCases: ['Knowledge tests', 'Aptitude tests', 'Skill assessments'],
        isSystemType: true,
        isActive: true
      },
      {
        id: 'likert_scale',
        typeName: 'LIKERT_SCALE',
        displayName: 'Likert Scale',
        description: 'Rating scale for agreement or frequency',
        defaultOptions: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
        minOptions: 3,
        maxOptions: 10,
        allowsCorrectAnswer: false,
        useCases: ['Surveys', 'Personality tests', 'Attitude measurement'],
        isSystemType: true,
        isActive: true
      },
      {
        id: 'true_false',
        typeName: 'TRUE_FALSE',
        displayName: 'True/False',
        description: 'Binary true or false questions',
        defaultOptions: ['True', 'False'],
        minOptions: 2,
        maxOptions: 2,
        allowsCorrectAnswer: true,
        useCases: ['Knowledge tests', 'Fact checking', 'Quick assessments'],
        isSystemType: true,
        isActive: true
      },
      {
        id: 'rating_scale',
        typeName: 'RATING_SCALE',
        displayName: 'Rating Scale',
        description: 'Numeric rating scale',
        defaultOptions: ['1', '2', '3', '4', '5'],
        minOptions: 3,
        maxOptions: 10,
        allowsCorrectAnswer: false,
        useCases: ['Quality ratings', 'Performance evaluations', 'Satisfaction surveys'],
        isSystemType: true,
        isActive: true
      },
      {
        id: 'frequency_scale',
        typeName: 'FREQUENCY_SCALE',
        displayName: 'Frequency Scale',
        description: 'How often something occurs',
        defaultOptions: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
        minOptions: 3,
        maxOptions: 7,
        allowsCorrectAnswer: false,
        useCases: ['Behavioral frequency', 'Habit tracking', 'Activity assessment'],
        isSystemType: true,
        isActive: true
      }
    ];

// Option Types CRUD Controllers
const getAllOptionTypes = async (req, res) => {
  try {
    // Combine system types and custom types
    const allOptionTypes = [...systemOptionTypes, ...customOptionTypes];

    return res.status(200).json({
      success: true,
      message: 'Option types retrieved successfully',
      data: allOptionTypes
    });

  } catch (error) {
    console.error('Get all option types error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

const createOptionType = async (req, res) => {
  try {
    const { typeName, displayName, description, defaultOptions, minOptions, maxOptions, allowsCorrectAnswer, useCases } = req.body;
    const adminId = req.admin.id;

    // Basic validation
    if (!typeName || !displayName) {
      return res.status(400).json({
        success: false,
        message: 'Type name and display name are required',
        data: null
      });
    }

    if (!defaultOptions || !Array.isArray(defaultOptions) || defaultOptions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Default options array is required',
        data: null
      });
    }

    // Create new option type object
    const newOptionType = {
      id: typeName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      typeName: typeName.toUpperCase(),
      displayName,
      description: description || '',
      defaultOptions,
      minOptions: minOptions || 2,
      maxOptions: maxOptions || 10,
      allowsCorrectAnswer: Boolean(allowsCorrectAnswer),
      useCases: useCases || [],
      isSystemType: false,
      isActive: true,
      createdAt: new Date(),
      createdBy: adminId
    };

    // Store the new option type in memory
    customOptionTypes.push(newOptionType);

    return res.status(201).json({
      success: true,
      message: 'Option type created successfully',
      data: newOptionType
    });

  } catch (error) {
    console.error('Create option type error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

const updateOptionType = async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, description, defaultOptions, minOptions, maxOptions, allowsCorrectAnswer, useCases } = req.body;
    const adminId = req.admin.id;

    // Check if it's a system type (cannot be updated)
    if (['yes_no', 'multiple_choice', 'likert_scale', 'true_false', 'rating_scale', 'frequency_scale'].includes(id)) {
      return res.status(400).json({
        success: false,
        message: 'System option types cannot be modified',
        data: null
      });
    }

    // Find the custom option type to update
    const optionTypeIndex = customOptionTypes.findIndex(type => type.id === id);
    if (optionTypeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Option type not found',
        data: null
      });
    }

    // Update the option type
    const existingType = customOptionTypes[optionTypeIndex];
    const updatedOptionType = {
      ...existingType,
      displayName: displayName || existingType.displayName,
      description: description || existingType.description,
      defaultOptions: defaultOptions || existingType.defaultOptions,
      minOptions: minOptions || existingType.minOptions,
      maxOptions: maxOptions || existingType.maxOptions,
      allowsCorrectAnswer: allowsCorrectAnswer !== undefined ? Boolean(allowsCorrectAnswer) : existingType.allowsCorrectAnswer,
      useCases: useCases || existingType.useCases,
      updatedAt: new Date(),
      updatedBy: adminId
    };

    // Replace in the array
    customOptionTypes[optionTypeIndex] = updatedOptionType;

    return res.status(200).json({
      success: true,
      message: 'Option type updated successfully',
      data: updatedOptionType
    });

  } catch (error) {
    console.error('Update option type error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

const deleteOptionType = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Check if it's a system type (cannot be deleted)
    if (['yes_no', 'multiple_choice', 'likert_scale', 'true_false', 'rating_scale', 'frequency_scale'].includes(id)) {
      return res.status(400).json({
        success: false,
        message: 'System option types cannot be deleted',
        data: null
      });
    }

    // Find and remove the custom option type
    const optionTypeIndex = customOptionTypes.findIndex(type => type.id === id);
    if (optionTypeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Option type not found',
        data: null
      });
    }

    // Remove from array
    customOptionTypes.splice(optionTypeIndex, 1);

    return res.status(200).json({
      success: true,
      message: 'Option type deleted successfully',
      data: { id, deletedAt: new Date(), deletedBy: adminId }
    });

  } catch (error) {
    console.error('Delete option type error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// Routes
// GET /api/v1/admin/option-types - Get all option types
router.get('/', checkPermission('TEST_MANAGEMENT'), getAllOptionTypes);

// POST /api/v1/admin/option-types - Create new option type
router.post('/', checkPermission('TEST_MANAGEMENT'), createOptionType);

// PUT /api/v1/admin/option-types/:id - Update option type
router.put('/:id', checkPermission('TEST_MANAGEMENT'), updateOptionType);

// DELETE /api/v1/admin/option-types/:id - Delete option type
router.delete('/:id', checkPermission('TEST_MANAGEMENT'), deleteOptionType);

module.exports = router;