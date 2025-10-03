const express = require('express');
const router = express.Router();
const userTestService = require('../services/userTestService');
const { authMiddleware } = require('../middleware/auth');

// Get available tests for user
router.get('/available', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await userTestService.getAvailableTests(userId);
    res.status(result.statusCode).json(result);

  } catch (error) {
    console.error('Get available tests route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get detailed test information
router.get('/:testId/details', authMiddleware, async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user.id;

    const result = await userTestService.getTestDetails(testId, userId);
    res.status(result.statusCode).json(result);

  } catch (error) {
    console.error('Get test details route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Check if user can take a test
router.get('/:testId/eligibility', authMiddleware, async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user.id;

    const result = await userTestService.canUserTakeTest(userId, testId);
    res.status(result.statusCode).json(result);

  } catch (error) {
    console.error('Check test eligibility route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;