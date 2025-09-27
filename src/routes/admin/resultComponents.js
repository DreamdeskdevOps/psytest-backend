const express = require('express');
const adminResultComponentController = require('../../controllers/admin/adminResultComponentController');
const { authenticateAdmin } = require('../../middleware/auth');
const { rateLimitAPI } = require('../../middleware/rateLimiter');

const router = express.Router();

// Apply admin authentication to all routes (temporarily disabled for testing)
// router.use(authenticateAdmin);

// Apply rate limiting (temporarily disabled for testing)
// router.use(rateLimitAPI);

// Temporary mock admin for testing
router.use((req, res, next) => {
  req.admin = { id: '227fd748-ae43-477e-b4c5-1f4253aba945' };
  next();
});

// GET /api/v1/admin/result-components - List all result components with filters
router.get('/',
  adminResultComponentController.getAllResultComponents
);

// GET /api/v1/admin/result-components/:testId - Get components for a specific test
router.get('/:testId',
  adminResultComponentController.getComponentsByTestId
);

// GET /api/v1/admin/result-components/single/:id - Get single result component by ID
router.get('/single/:id',
  adminResultComponentController.getResultComponentById
);

// POST /api/v1/admin/result-components - Create new result component
router.post('/',
  adminResultComponentController.createResultComponent
);

// PUT /api/v1/admin/result-components/:id - Update result component
router.put('/:id',
  adminResultComponentController.updateResultComponent
);

// PUT /api/v1/admin/result-components/:id/priority - Update component priority
router.put('/:id/priority',
  adminResultComponentController.updateComponentPriority
);

// DELETE /api/v1/admin/result-components/:id - Delete result component
router.delete('/:id',
  adminResultComponentController.deleteResultComponent
);

// GET /api/v1/admin/result-components/statistics/:testId - Get component statistics for a test
router.get('/statistics/:testId',
  adminResultComponentController.getComponentStatistics
);

// PUT /api/v1/admin/result-components/reorder/:testId - Reorder component priorities
router.put('/reorder/:testId',
  adminResultComponentController.reorderComponentPriorities
);

// PUT /api/v1/admin/result-components/bulk/:testId - Bulk update components for a test
router.put('/bulk/:testId',
  adminResultComponentController.bulkUpdateComponents
);

// GET /api/v1/admin/result-components/categories/:testId - Get component categories for a test
router.get('/categories/:testId',
  adminResultComponentController.getComponentCategories
);

// PUT /api/v1/admin/result-components/swap/:id1/:id2 - Swap component priorities
router.put('/swap/:id1/:id2',
  adminResultComponentController.swapComponentPriorities
);

// POST /api/v1/admin/result-components/generate/:testId - Generate component combination
router.post('/generate/:testId',
  adminResultComponentController.generateComponentCombination
);

module.exports = router;