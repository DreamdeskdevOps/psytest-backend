const express = require('express');
const adminResultController = require('../../controllers/admin/adminResultController');
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

// GET /api/v1/admin/results - List all test results with filters
router.get('/',
  adminResultController.getAllTestResults
);

// GET /api/v1/admin/results/:testId - Get results for a specific test
router.get('/:testId',
  adminResultController.getResultsByTestId
);

// GET /api/v1/admin/results/single/:id - Get single test result by ID
router.get('/single/:id',
  adminResultController.getTestResultById
);

// POST /api/v1/admin/results - Create new test result (with PDF upload)
router.post('/',
  adminResultController.upload.single('pdf_file'),
  adminResultController.createTestResult
);

// PUT /api/v1/admin/results/:id - Update test result (with optional PDF upload)
router.put('/:id',
  adminResultController.upload.single('pdf_file'),
  adminResultController.updateTestResult
);

// DELETE /api/v1/admin/results/:id - Delete test result
router.delete('/:id',
  adminResultController.deleteTestResult
);

// GET /api/v1/admin/results/statistics/:testId - Get result statistics for a test
router.get('/statistics/:testId',
  adminResultController.getResultStatistics
);

// PUT /api/v1/admin/results/bulk/:testId - Bulk update results for a test
router.put('/bulk/:testId',
  adminResultController.bulkUpdateResults
);

// GET /api/v1/admin/results/download/:id - Download PDF result
router.get('/download/:id',
  adminResultController.downloadResultPDF
);

module.exports = router;