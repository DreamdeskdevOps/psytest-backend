const ResultComponentModel = require('../models/ResultComponent');
const TestModel = require('../models/Test');
const { generateResponse } = require('../utils/helpers');

// Get all result components for admin with filters and pagination
const getAllResultComponents = async (filters = {}, adminId) => {
  try {
    const components = await ResultComponentModel.getAllResultComponents(filters);

    // Calculate total count for pagination
    const totalCountFilters = { ...filters };
    delete totalCountFilters.limit;
    delete totalCountFilters.offset;

    const allComponents = await ResultComponentModel.getAllResultComponents(totalCountFilters);
    const totalCount = allComponents.length;

    const responseData = {
      components,
      pagination: {
        total: totalCount,
        page: Math.floor(filters.offset / filters.limit) + 1,
        limit: filters.limit,
        totalPages: Math.ceil(totalCount / filters.limit)
      },
      filters: filters,
      adminId: adminId
    };

    return generateResponse(true, 'Result components retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get all result components service error:', error);
    return generateResponse(false, 'Failed to retrieve result components', null, 500);
  }
};

// Get components for a specific test
const getComponentsByTestId = async (testId, adminId) => {
  try {
    // First verify the test exists
    const testQuery = `SELECT id, title FROM tests WHERE id = $1`;
    const testExists = await ResultComponentModel.getOne ?
      await ResultComponentModel.getOne(testQuery, [testId]) :
      true; // Fallback for testing

    if (!testExists && ResultComponentModel.getOne) {
      return generateResponse(false, 'Test not found', null, 404);
    }

    const components = await ResultComponentModel.getComponentsByTestId(testId);

    const responseData = {
      components,
      testId: testId,
      totalCount: components.length,
      adminId: adminId
    };

    return generateResponse(true, 'Result components retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get components by test ID service error:', error);
    return generateResponse(false, 'Failed to retrieve result components', null, 500);
  }
};

// Get single result component by ID
const getResultComponentById = async (id, adminId) => {
  try {
    const component = await ResultComponentModel.getResultComponentById(id);

    if (!component) {
      return generateResponse(false, 'Result component not found', null, 404);
    }

    const responseData = {
      component,
      adminId: adminId
    };

    return generateResponse(true, 'Result component retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get result component by ID service error:', error);
    return generateResponse(false, 'Failed to retrieve result component', null, 500);
  }
};

// Create new result component
const createResultComponent = async (componentData, adminId) => {
  try {
    // Validate that the test exists
    const testQuery = `SELECT id, title FROM tests WHERE id = $1`;
    const testExists = await ResultComponentModel.getOne ?
      await ResultComponentModel.getOne(testQuery, [componentData.test_id]) :
      true; // Fallback for testing

    if (!testExists && ResultComponentModel.getOne) {
      return generateResponse(false, 'Test not found', null, 404);
    }

    // Check if component code already exists for this test
    const existingComponent = await ResultComponentModel.getComponentByTestAndCode(
      componentData.test_id,
      componentData.component_code
    );

    if (existingComponent) {
      // If component exists but is soft-deleted, reactivate it with new data
      if (!existingComponent.is_active) {
        const updatedData = {
          ...componentData,
          is_active: true,
          updated_at: new Date()
        };

        const reactivatedComponent = await ResultComponentModel.updateResultComponent(existingComponent.id, updatedData);

        const responseData = {
          component: reactivatedComponent,
          adminId: adminId,
          message: 'Result component reactivated and updated successfully'
        };

        return generateResponse(true, 'Result component reactivated and updated successfully', responseData, 200);
      }

      // If component exists and is active, return conflict
      return generateResponse(false, 'Component code already exists for this test', null, 409);
    }

    // If no priority specified, set to next available priority
    if (!componentData.order_priority || componentData.order_priority <= 0) {
      const existingComponents = await ResultComponentModel.getComponentsByTestId(componentData.test_id);
      const maxPriority = existingComponents.length > 0
        ? Math.max(...existingComponents.map(c => c.order_priority || 0))
        : 0;
      componentData.order_priority = maxPriority + 1;
    }

    const newComponent = await ResultComponentModel.createResultComponent(componentData);

    const responseData = {
      component: newComponent,
      adminId: adminId,
      message: 'Result component created successfully'
    };

    return generateResponse(true, 'Result component created successfully', responseData, 201);

  } catch (error) {
    console.error('Create result component service error:', error);

    // Handle duplicate constraint errors
    if (error.code === '23505') { // PostgreSQL unique violation
      return generateResponse(false, 'Component code already exists for this test', null, 409);
    }

    return generateResponse(false, 'Failed to create result component', null, 500);
  }
};

// Update result component
const updateResultComponent = async (id, updateData, adminId) => {
  try {
    // Check if component exists
    const existingComponent = await ResultComponentModel.getResultComponentById(id);
    if (!existingComponent) {
      return generateResponse(false, 'Result component not found', null, 404);
    }

    // If updating component_code, check for duplicates within the same test
    if (updateData.component_code && updateData.component_code !== existingComponent.component_code) {
      const duplicateComponent = await ResultComponentModel.getComponentByTestAndCode(
        existingComponent.test_id,
        updateData.component_code
      );

      if (duplicateComponent && duplicateComponent.id !== id) {
        return generateResponse(false, 'Component code already exists for this test', null, 409);
      }
    }

    const updatedComponent = await ResultComponentModel.updateResultComponent(id, updateData);

    const responseData = {
      component: updatedComponent,
      adminId: adminId,
      message: 'Result component updated successfully'
    };

    return generateResponse(true, 'Result component updated successfully', responseData, 200);

  } catch (error) {
    console.error('Update result component service error:', error);

    // Handle duplicate constraint errors
    if (error.code === '23505') {
      return generateResponse(false, 'Component code already exists for this test', null, 409);
    }

    return generateResponse(false, 'Failed to update result component', null, 500);
  }
};

// Update component priority
const updateComponentPriority = async (id, newPriority, adminId) => {
  try {
    // Check if component exists
    const existingComponent = await ResultComponentModel.getResultComponentById(id);
    if (!existingComponent) {
      return generateResponse(false, 'Result component not found', null, 404);
    }

    const updatedComponent = await ResultComponentModel.updateComponentPriority(id, newPriority);

    const responseData = {
      component: updatedComponent,
      adminId: adminId,
      message: 'Component priority updated successfully'
    };

    return generateResponse(true, 'Component priority updated successfully', responseData, 200);

  } catch (error) {
    console.error('Update component priority service error:', error);
    return generateResponse(false, 'Failed to update component priority', null, 500);
  }
};

// Delete result component (soft delete)
const deleteResultComponent = async (id, adminId) => {
  try {
    // Check if component exists
    const existingComponent = await ResultComponentModel.getResultComponentById(id);
    if (!existingComponent) {
      return generateResponse(false, 'Result component not found', null, 404);
    }

    // Check if component is being used in any user results
    const usageQuery = `
      SELECT COUNT(*) as usage_count
      FROM user_test_results
      WHERE component_combination::text LIKE '%${existingComponent.component_code}%'
    `;

    let isInUse = false;
    try {
      const usageResult = await ResultComponentModel.getOne ?
        await ResultComponentModel.getOne(usageQuery) : null;

      if (usageResult && usageResult.usage_count > 0) {
        isInUse = true;
      }
    } catch (usageError) {
      console.warn('Could not check component usage:', usageError);
    }

    if (isInUse) {
      return generateResponse(
        false,
        'Cannot delete component: it is currently being used in student results',
        null,
        409
      );
    }

    const deletedComponent = await ResultComponentModel.deleteResultComponent(id);

    const responseData = {
      component: deletedComponent,
      adminId: adminId,
      message: 'Result component deleted successfully'
    };

    return generateResponse(true, 'Result component deleted successfully', responseData, 200);

  } catch (error) {
    console.error('Delete result component service error:', error);
    return generateResponse(false, 'Failed to delete result component', null, 500);
  }
};

// Get component statistics for a test
const getComponentStatistics = async (testId, adminId) => {
  try {
    const statistics = await ResultComponentModel.getComponentStatistics(testId);

    if (!statistics) {
      return generateResponse(false, 'No statistics found for this test', null, 404);
    }

    const responseData = {
      statistics,
      testId: testId,
      adminId: adminId
    };

    return generateResponse(true, 'Component statistics retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get component statistics service error:', error);
    return generateResponse(false, 'Failed to retrieve component statistics', null, 500);
  }
};

// Reorder component priorities for a test
const reorderComponentPriorities = async (testId, adminId) => {
  try {
    // Validate that the test exists
    const testQuery = `SELECT id FROM tests WHERE id = $1`;
    const testExists = await ResultComponentModel.getOne ?
      await ResultComponentModel.getOne(testQuery, [testId]) :
      true; // Fallback for testing

    if (!testExists && ResultComponentModel.getOne) {
      return generateResponse(false, 'Test not found', null, 404);
    }

    const reorderedComponents = await ResultComponentModel.reorderComponentPriorities(testId);

    const responseData = {
      components: reorderedComponents,
      reorderedCount: reorderedComponents.length,
      testId: testId,
      adminId: adminId
    };

    return generateResponse(true, 'Component priorities reordered successfully', responseData, 200);

  } catch (error) {
    console.error('Reorder component priorities service error:', error);
    return generateResponse(false, 'Failed to reorder component priorities', null, 500);
  }
};

// Bulk update components for a test
const bulkUpdateComponents = async (testId, updates, adminId) => {
  try {
    // Validate that the test exists
    const testQuery = `SELECT id FROM tests WHERE id = $1`;
    const testExists = await ResultComponentModel.getOne ?
      await ResultComponentModel.getOne(testQuery, [testId]) :
      true; // Fallback for testing

    if (!testExists && ResultComponentModel.getOne) {
      return generateResponse(false, 'Test not found', null, 404);
    }

    const updatedComponents = await ResultComponentModel.bulkUpdateComponents(testId, updates);

    const responseData = {
      components: updatedComponents,
      updatedCount: updatedComponents.length,
      testId: testId,
      adminId: adminId,
      updates: updates
    };

    return generateResponse(true, 'Components updated successfully', responseData, 200);

  } catch (error) {
    console.error('Bulk update components service error:', error);
    return generateResponse(false, 'Failed to update components', null, 500);
  }
};

// Get component categories for a test
const getComponentCategories = async (testId, adminId) => {
  try {
    const categories = await ResultComponentModel.getComponentCategories(testId);

    const responseData = {
      categories: categories.map(cat => cat.component_category),
      testId: testId,
      adminId: adminId
    };

    return generateResponse(true, 'Component categories retrieved successfully', responseData, 200);

  } catch (error) {
    console.error('Get component categories service error:', error);
    return generateResponse(false, 'Failed to retrieve component categories', null, 500);
  }
};

// Swap component priorities
const swapComponentPriorities = async (id1, id2, adminId) => {
  try {
    const swappedComponents = await ResultComponentModel.swapComponentPriorities(id1, id2);

    if (!swappedComponents || swappedComponents.length !== 2) {
      return generateResponse(false, 'Failed to swap components or components not found', null, 404);
    }

    const responseData = {
      components: swappedComponents,
      adminId: adminId,
      message: 'Component priorities swapped successfully'
    };

    return generateResponse(true, 'Component priorities swapped successfully', responseData, 200);

  } catch (error) {
    console.error('Swap component priorities service error:', error);
    return generateResponse(false, 'Failed to swap component priorities', null, 500);
  }
};

// Generate component combination
const generateComponentCombination = async (testId, scoreData, maxComponents, adminId) => {
  try {
    const combination = await ResultComponentModel.generateComponentCombination(
      testId,
      scoreData,
      maxComponents
    );

    // Generate result code from combination
    const resultCode = combination.map(comp => comp.component_code).join('');

    // Calculate weighted score
    const totalScore = combination.reduce((sum, comp, index) => {
      const scoreValue = scoreData[comp.component_code] || comp.score_value;
      const positionWeight = 1.0 - (index * 0.1); // Decrease weight by position
      return sum + (scoreValue * comp.component_weight * positionWeight);
    }, 0);

    const responseData = {
      combination,
      resultCode,
      totalScore: Math.round(totalScore * 100) / 100,
      maxComponents,
      testId,
      adminId,
      scoreData
    };

    return generateResponse(true, 'Component combination generated successfully', responseData, 200);

  } catch (error) {
    console.error('Generate component combination service error:', error);
    return generateResponse(false, 'Failed to generate component combination', null, 500);
  }
};

// Validate component data before creation/update
const validateComponentData = (data, isUpdate = false) => {
  const errors = [];

  // Required fields for creation
  if (!isUpdate) {
    if (!data.test_id) errors.push('test_id is required');
    if (!data.component_code) errors.push('component_code is required');
    if (!data.component_name) errors.push('component_name is required');
  }

  // Validate component_code format (single letter or short alphanumeric)
  if (data.component_code && !/^[A-Za-z0-9]{1,5}$/.test(data.component_code)) {
    errors.push('component_code must be 1-5 alphanumeric characters');
  }

  // Validate numeric fields
  if (data.score_value !== undefined && (isNaN(data.score_value) || data.score_value < -1000 || data.score_value > 1000)) {
    errors.push('score_value must be a number between -1000 and 1000');
  }

  if (data.order_priority !== undefined && (isNaN(data.order_priority) || data.order_priority < 1)) {
    errors.push('order_priority must be a positive number');
  }

  if (data.component_weight !== undefined && (isNaN(data.component_weight) || data.component_weight < 0.1 || data.component_weight > 5.0)) {
    errors.push('component_weight must be a number between 0.1 and 5.0');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Duplicate component for easy creation
const duplicateComponent = async (sourceId, newComponentCode, adminId) => {
  try {
    const sourceComponent = await ResultComponentModel.getResultComponentById(sourceId);

    if (!sourceComponent) {
      return generateResponse(false, 'Source component not found', null, 404);
    }

    // Get existing components to set new priority
    const existingComponents = await ResultComponentModel.getComponentsByTestId(sourceComponent.test_id);
    const maxPriority = existingComponents.length > 0
      ? Math.max(...existingComponents.map(c => c.order_priority || 0))
      : 0;

    // Create new component data
    const newComponentData = {
      test_id: sourceComponent.test_id,
      component_code: newComponentCode,
      component_name: `${sourceComponent.component_name} (Copy)`,
      description: sourceComponent.description,
      score_value: sourceComponent.score_value,
      order_priority: maxPriority + 1,
      component_category: sourceComponent.component_category,
      component_weight: sourceComponent.component_weight
    };

    return await createResultComponent(newComponentData, adminId);

  } catch (error) {
    console.error('Duplicate component service error:', error);
    return generateResponse(false, 'Failed to duplicate component', null, 500);
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
  generateComponentCombination,
  validateComponentData,
  duplicateComponent
};