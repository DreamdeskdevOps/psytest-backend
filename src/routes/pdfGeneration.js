const express = require('express');
const router = express.Router();
const pdfGenerationController = require('../controllers/pdfGenerationController');

// Generate PDF for a test attempt
router.post('/generate', pdfGenerationController.generatePDF);

// Get generated PDF info for an attempt
router.get('/attempt/:attemptId', pdfGenerationController.getGeneratedPDF);

// Download generated PDF
router.get('/download/:attemptId', pdfGenerationController.downloadPDF);

// Regenerate PDF for an attempt
router.post('/regenerate/:attemptId', pdfGenerationController.regeneratePDF);

// Get PDF generation history for a student
router.get('/student/:studentId/history', pdfGenerationController.getStudentPDFHistory);

// Get PDF generation statistics (admin)
router.get('/stats', pdfGenerationController.getPDFStats);

module.exports = router;
