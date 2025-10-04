const express = require('express');
const adminQuestionController = require('../../controllers/admin/adminQuestionController');
const { authenticateAdmin } = require('../../middleware/auth');
const { rateLimitAPI } = require('../../middleware/rateLimiter');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });
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

// Question CRUD Operations
// GET /api/v1/admin/sections/:sectionId/questions - Get all questions in section
router.get('/sections/:sectionId/questions', 
  adminQuestionController.getSectionQuestions
);

// POST /api/v1/admin/sections/:sectionId/questions - Add question to section
router.post('/sections/:sectionId/questions', 
  adminQuestionController.createSectionQuestion
);

// GET /api/v1/admin/questions/bulk-import/column-mapping - Get column mapping info
router.get('/bulk-import/column-mapping',
  adminQuestionController.getBulkImportColumnMapping
);

// GET /api/v1/admin/questions/bulk-import/template - Download Excel template
router.get('/bulk-import/template',
  adminQuestionController.downloadBulkImportTemplate
);

// POST /api/v1/admin/questions/sections/:sectionId/questions/bulk-import - Bulk import questions from Excel
router.post(
  '/sections/:sectionId/questions/bulk-import',
  upload.single('file'), // 'file' should be the name of the form field
  adminQuestionController.bulkImportQuestions
);

// GET /api/v1/admin/questions/:id - Get question details
router.get('/questions/:id', 
  adminQuestionController.getQuestionDetails
);

// PUT /api/v1/admin/questions/:id - Update question
router.put('/questions/:id',
  adminQuestionController.updateQuestion
);

// PUT /api/v1/admin/questions/:id/with-images - Update question with images (identical to create)
router.put('/:id/with-images',
  upload.array('images', 10),
  adminQuestionController.updateQuestionWithImages
);

// DELETE /api/v1/admin/questions/questions/:id - Delete question
router.delete('/questions/:id',
  adminQuestionController.deleteQuestion
);

// POST /api/v1/admin/questions/bulk-delete - Bulk delete questions
router.post('/bulk-delete',
  adminQuestionController.bulkDeleteQuestions
);

// POST /api/v1/admin/questions/:id/duplicate - Duplicate question
router.post('/questions/:id/duplicate', 
  adminQuestionController.duplicateQuestion
);

// Question Content Management
// PUT /api/v1/admin/questions/:id/content - Update question text
router.put('/questions/:id/content', 
  adminQuestionController.updateQuestionContent
);

// POST /api/v1/admin/questions/:id/image - Upload question image
router.post('/questions/:id/image', 
  adminQuestionController.uploadQuestionImage
);

// PUT /api/v1/admin/questions/:id/image - Update question image
router.put('/questions/:id/image', 
  adminQuestionController.updateQuestionImage
);

// DELETE /api/v1/admin/questions/:id/image - Remove question image
router.delete('/questions/:id/image', 
  adminQuestionController.removeQuestionImage
);

// GET /api/v1/admin/questions/:id/preview - Preview question
router.get('/questions/:id/preview', 
  adminQuestionController.getQuestionPreview
);

// Question Numbering & Ordering
// PUT /api/v1/admin/sections/:sectionId/questions/reorder - Reorder questions
router.put('/sections/:sectionId/questions/reorder', 
  adminQuestionController.reorderSectionQuestions
);

// PUT /api/v1/admin/questions/:id/number - Set custom question number
router.put('/questions/:id/number', 
  adminQuestionController.setQuestionNumber
);

// PUT /api/v1/admin/sections/:sectionId/numbering - Set section numbering style
router.put('/sections/:sectionId/numbering',
  adminQuestionController.setSectionNumbering
);

// Enhanced Image Management Routes
// POST /api/v1/admin/questions/:id/images - Add multiple images to question
router.post('/questions/:id/images',
  upload.array('images', 10), // Allow up to 10 images
  adminQuestionController.addQuestionImages
);

// DELETE /api/v1/admin/questions/:questionId/images/:imageId - Remove specific image
router.delete('/questions/:questionId/images/:imageId',
  adminQuestionController.removeQuestionImageById
);

// PUT /api/v1/admin/questions/:id/images/reorder - Reorder question images
router.put('/questions/:id/images/reorder',
  adminQuestionController.reorderQuestionImages
);

// PUT /api/v1/admin/questions/:id/images/numbers - Set image numbers
router.put('/questions/:id/images/numbers',
  adminQuestionController.setQuestionImageNumbers
);

// PUT /api/v1/admin/questions/:id/content-type - Update question content type
router.put('/questions/:id/content-type',
  adminQuestionController.updateQuestionContentType
);

// GET /api/v1/admin/questions/:id/formatted - Get formatted question with images
router.get('/questions/:id/formatted',
  adminQuestionController.getFormattedQuestion
);

// POST /api/v1/admin/sections/:sectionId/questions-with-images - Create question with images
router.post('/sections/:sectionId/questions-with-images',
  upload.array('images', 10),
  adminQuestionController.createQuestionWithImages
);

module.exports = router;