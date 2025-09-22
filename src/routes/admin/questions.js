const express = require('express');
const adminQuestionController = require('../../controllers/admin/adminQuestionController');
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

// Question CRUD Operations
// GET /api/v1/admin/sections/:sectionId/questions - Get all questions in section
router.get('/sections/:sectionId/questions', 
  adminQuestionController.getSectionQuestions
);

// POST /api/v1/admin/sections/:sectionId/questions - Add question to section
router.post('/sections/:sectionId/questions', 
  adminQuestionController.createSectionQuestion
);

// GET /api/v1/admin/questions/:id - Get question details
router.get('/questions/:id', 
  adminQuestionController.getQuestionDetails
);

// PUT /api/v1/admin/questions/:id - Update question
router.put('/questions/:id', 
  adminQuestionController.updateQuestion
);

// DELETE /api/v1/admin/questions/:id - Delete question
router.delete('/questions/:id', 
  adminQuestionController.deleteQuestion
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

module.exports = router;