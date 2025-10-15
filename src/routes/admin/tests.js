const express = require('express');
const adminTestController = require('../../controllers/admin/adminTestController');
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

// GET /api/v1/admin/tests - List all tests (4 main tests)
router.get('/',
  adminTestController.getAllTests
);

// GET /api/v1/admin/tests/:id - Get test details with sections
router.get('/:id', 
 
  adminTestController.getTestDetails
);

// POST /api/v1/admin/tests - Create new test
router.post('/', 
 
  adminTestController.createTest
);

// PUT /api/v1/admin/tests/:id - Update test basic info
router.put('/:id', 
 
  adminTestController.updateTest
);

// DELETE /api/v1/admin/tests/:id - Delete test
router.delete('/:id', 
 
  adminTestController.deleteTest
);

// POST /api/v1/admin/tests/:id/duplicate - Duplicate entire test
router.post('/:id/duplicate', 
 
  adminTestController.duplicateTest
);

// POST /api/v1/admin/tests/:id/toggle-status - Activate/Deactivate test
router.post('/:id/toggle-status', 
 
  adminTestController.toggleTestStatus
);

// GET /api/v1/admin/tests/:id/preview - Preview entire test
router.get('/:id/preview', 
 
  adminTestController.getTestPreview
);

// POST /api/v1/admin/tests/bulk-actions - Bulk operations
router.post('/bulk-actions', 
 
  adminTestController.bulkActions
);

// GET /api/v1/admin/tests/:id/export - Export test with all sections
router.get('/:id/export', 
 
  adminTestController.exportTest
);

// PUT /api/v1/admin/tests/:id/reorder-sections - Reorder test sections
router.put('/:id/reorder-sections',

  adminTestController.reorderSections
);

// PUT /api/v1/admin/tests/:id/description-fields - Update description fields configuration
router.put('/:id/description-fields',
  adminTestController.updateDescriptionFields
);

// GET /api/v1/admin/tests/:id/description-fields - Get description fields configuration
router.get('/:id/description-fields',
  adminTestController.getDescriptionFields
);

module.exports = router;