const express = require('express');
const adminAnswerOptionsController = require('../../controllers/admin/adminAnswerOptionsController');
const { authenticateAdmin, checkPermission } = require('../../middleware/auth');
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

// Answer Options CRUD Operations
// GET /api/v1/admin/questions/:questionId/options - Get question answer options
router.get('/questions/:questionId/options', 
  checkPermission('TEST_MANAGEMENT'), 
  adminAnswerOptionsController.getQuestionOptions
);

// POST /api/v1/admin/questions/:questionId/options - Add answer option
router.post('/questions/:questionId/options', 
  checkPermission('TEST_MANAGEMENT'), 
  adminAnswerOptionsController.addAnswerOption
);

// PUT /api/v1/admin/options/:id - Update answer option
router.put('/options/:id', 
  checkPermission('TEST_MANAGEMENT'), 
  adminAnswerOptionsController.updateAnswerOption
);

// DELETE /api/v1/admin/options/:id - Delete answer option
router.delete('/options/:id', 
  checkPermission('TEST_MANAGEMENT'), 
  adminAnswerOptionsController.deleteAnswerOption
);

// PUT /api/v1/admin/questions/:questionId/options/reorder - Reorder options
router.put('/questions/:questionId/options/reorder', 
  checkPermission('TEST_MANAGEMENT'), 
  adminAnswerOptionsController.reorderQuestionOptions
);

// Option Types & Patterns
// PUT /api/v1/admin/questions/:id/option-type - Set option type (yes/no, 2-5 options)
router.put('/questions/:id/option-type', 
  checkPermission('TEST_MANAGEMENT'), 
  adminAnswerOptionsController.setQuestionOptionType
);

// GET /api/v1/admin/option-types - Get available option types
router.get('/option-types', 
  checkPermission('TEST_MANAGEMENT'), 
  adminAnswerOptionsController.getAvailableOptionTypes
);

// POST /api/v1/admin/questions/:id/set-correct-answer - Set correct answer
router.post('/questions/:id/set-correct-answer', 
  checkPermission('TEST_MANAGEMENT'), 
  adminAnswerOptionsController.setCorrectAnswer
);

// PUT /api/v1/admin/questions/:id/answer-pattern - Set answer pattern (odd/even)
router.put('/questions/:id/answer-pattern', 
  checkPermission('TEST_MANAGEMENT'), 
  adminAnswerOptionsController.setAnswerPattern
);

module.exports = router;