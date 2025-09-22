const express = require('express');
const adminSectionController = require('../../controllers/admin/adminSectionController');
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

// GET /api/v1/admin/tests/:testId/sections - Get all sections of test
router.get('/tests/:testId/sections',
  adminSectionController.getTestSections
);

// POST /api/v1/admin/tests/:testId/sections - Add new section to test
router.post('/tests/:testId/sections',
  adminSectionController.createTestSection
);

// GET /api/v1/admin/sections/:id - Get section details
router.get('/sections/:id',
  adminSectionController.getSectionDetails
);

// PUT /api/v1/admin/sections/:id - Update section basic info
router.put('/sections/:id',
  adminSectionController.updateSectionInfo
);

// DELETE /api/v1/admin/sections/:id - Delete section
router.delete('/sections/:id',
  adminSectionController.deleteSection
);

// POST /api/v1/admin/sections/:id/duplicate - Duplicate section
router.post('/sections/:id/duplicate',
  adminSectionController.duplicateSection
);

// PUT /api/v1/admin/sections/:id/timing - Set section timing
router.put('/sections/:id/timing',
  adminSectionController.setSectionTiming
);

// GET /api/v1/admin/sections/:id/timing - Get section timing
router.get('/sections/:id/timing',
  adminSectionController.getSectionTiming
);

// PUT /api/v1/admin/tests/:testId/sections/reorder - Reorder sections
router.put('/tests/:testId/sections/reorder',
  adminSectionController.reorderTestSections
);

// POST /api/v1/admin/sections/bulk-update - Bulk update sections
router.post('/sections/bulk-update',
  adminSectionController.bulkUpdateSections
);

// Section-level Answer Options Management
// GET /api/v1/admin/sections/:id/options - Get section answer options
router.get('/sections/:id/options',
  adminSectionController.getSectionOptions
);

// PUT /api/v1/admin/sections/:id/options - Set section answer options
router.put('/sections/:id/options',
  adminSectionController.setSectionOptions
);

// POST /api/v1/admin/sections/:id/options - Add answer option to section
router.post('/sections/:id/options',
  adminSectionController.addSectionOption
);

// DELETE /api/v1/admin/sections/:sectionId/options/:optionId - Delete section option
router.delete('/sections/:sectionId/options/:optionId',
  adminSectionController.deleteSectionOption
);

module.exports = router;