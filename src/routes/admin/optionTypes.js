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

// Clear any existing conflicting option types on server restart
customOptionTypes = customOptionTypes.filter(type =>
  !['yes_no', 'multiple_choice', 'likert_scale', 'true_false', 'rating_scale', 'frequency_scale'].includes(type.id)
);

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
    const { getMany } = require('../../config/database');

    // Get all option types from database
    const dbOptionTypes = await getMany(`
      SELECT
        id,
        name,
        description,
        pattern_type,
        options,
        is_system_pattern,
        is_active,
        created_at,
        created_by
      FROM answer_patterns
      WHERE is_active = true
      ORDER BY is_system_pattern DESC, created_at DESC
    `);

    console.log('📋 Raw DB option types:', JSON.stringify(dbOptionTypes, null, 2));

    const formattedOptionTypes = dbOptionTypes.map(opt => ({
      id: opt.id,
      typeName: opt.name || 'Unnamed Type',
      displayName: opt.name || 'Unnamed Type',
      description: opt.description || '',
      defaultOptions: opt.options || [], // This is JSONB from database
      minOptions: 2,
      maxOptions: 10,
      allowsCorrectAnswer: false,
      useCases: [],
      isSystemType: opt.is_system_pattern || false,
      isActive: opt.is_active,
      createdAt: opt.created_at,
      createdBy: opt.created_by
    }));

    console.log('✅ Formatted option types:', JSON.stringify(formattedOptionTypes, null, 2));

    return res.status(200).json({
      success: true,
      message: 'Option types retrieved successfully',
      data: formattedOptionTypes
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

    const { insertOne, getOne } = require('../../config/database');

    // Check if name already exists in database
    const existingType = await getOne(`
      SELECT id FROM answer_patterns WHERE name = $1
    `, [typeName]);

    if (existingType) {
      return res.status(400).json({
        success: false,
        message: `Option type with name "${typeName}" already exists. Please use a different name.`,
        data: null
      });
    }

    console.log('📝 Creating option type with name:', typeName);
    console.log('📝 Options to store:', defaultOptions);

    // Insert into database
    const newOptionTypeId = await insertOne(`
      INSERT INTO answer_patterns (
        name,
        description,
        pattern_type,
        options,
        is_system_pattern,
        is_active,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      typeName,
      description || '',
      'CUSTOM',
      JSON.stringify(defaultOptions), // Store complete option objects with {id, text, value, isCorrect}
      false,
      true,
      adminId
    ]);

    console.log('✅ Created option type with ID:', newOptionTypeId);

    const newOptionType = {
      id: newOptionTypeId,
      typeName: typeName,
      displayName: displayName || typeName,
      description: description || '',
      defaultOptions, // Complete option objects from request
      minOptions: minOptions || 2,
      maxOptions: maxOptions || 10,
      allowsCorrectAnswer: Boolean(allowsCorrectAnswer),
      useCases: useCases || [],
      isSystemType: false,
      isActive: true,
      createdAt: new Date(),
      createdBy: adminId
    };

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

    const { executeQuery, getOne } = require('../../config/database');

    // Check if option type exists in database
    const existingType = await getOne(`
      SELECT * FROM answer_patterns WHERE id = $1
    `, [id]);

    if (!existingType) {
      return res.status(404).json({
        success: false,
        message: 'Option type not found',
        data: null
      });
    }

    // Check if it's a system type (cannot be updated)
    if (existingType.is_system_pattern) {
      return res.status(400).json({
        success: false,
        message: 'System option types cannot be modified',
        data: null
      });
    }

    // Update in database
    await executeQuery(`
      UPDATE answer_patterns
      SET
        description = COALESCE($1, description),
        options = COALESCE($2, options),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [
      description,
      defaultOptions ? JSON.stringify(defaultOptions) : null,
      id
    ]);

    const updatedOptionType = {
      id: id,
      typeName: existingType.name,
      displayName: displayName || existingType.name,
      description: description || existingType.description,
      defaultOptions: defaultOptions || existingType.options,
      updatedAt: new Date(),
      updatedBy: adminId
    };

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

    const { executeQuery, getOne } = require('../../config/database');

    // Check if option type exists
    const existingType = await getOne(`
      SELECT * FROM answer_patterns WHERE id = $1
    `, [id]);

    if (!existingType) {
      return res.status(404).json({
        success: false,
        message: 'Option type not found',
        data: null
      });
    }

    // Check if it's a system type (cannot be deleted)
    if (existingType.is_system_pattern) {
      return res.status(400).json({
        success: false,
        message: 'System option types cannot be deleted',
        data: null
      });
    }

    // Soft delete by setting is_active to false
    await executeQuery(`
      UPDATE answer_patterns
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

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