const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pdfTemplateController = require('../controllers/pdfTemplateController');

// Configure multer for PDF file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/pdf-templates/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'template-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB limit (increased for PDF templates)
  }
});

// Create new PDF template
router.post('/', upload.single('pdfFile'), pdfTemplateController.createTemplate);

// Get all PDF templates
router.get('/', pdfTemplateController.getAllTemplates);

// Get active templates for dropdown
router.get('/active', pdfTemplateController.getActiveTemplatesForDropdown);

// Get available template fields
router.get('/available-fields', pdfTemplateController.getAvailableFields);

// Get segment fields for a specific test
router.get('/segment-fields/:testId', pdfTemplateController.getSegmentFields);

// Get PDF generation history
router.get('/generation-history', pdfTemplateController.getGenerationHistory);

// Get single template by ID
router.get('/:templateId', pdfTemplateController.getTemplateById);

// Update PDF template
router.put('/:templateId', upload.single('pdfFile'), pdfTemplateController.updateTemplate);

// Delete PDF template
router.delete('/:templateId', pdfTemplateController.deleteTemplate);

// Duplicate PDF template
router.post('/:templateId/duplicate', pdfTemplateController.duplicateTemplate);

module.exports = router;
