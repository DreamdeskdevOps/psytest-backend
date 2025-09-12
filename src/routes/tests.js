const express = require('express');
const router = express.Router();
const testController = require('../controllers/tests');
const { validateTest } = require('../middleware/validation');

// Route to create a new test
router.post('/', validateTest, testController.createTest);

// Route to get all tests
router.get('/', testController.getAllTests);

// Route to get a specific test by ID
router.get('/:id', testController.getTestById);

// Route to update a test by ID
router.put('/:id', validateTest, testController.updateTest);

// Route to delete a test by ID
router.delete('/:id', testController.deleteTest);

module.exports = router;