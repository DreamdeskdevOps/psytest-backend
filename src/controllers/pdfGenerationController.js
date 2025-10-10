const pdfGenerationService = require('../services/pdfGenerationService');
const { getOne } = require('../config/database');
const path = require('path');

/**
 * Generate PDF result for a student's test attempt
 * POST /api/v1/pdf/generate
 */
exports.generatePDF = async (req, res) => {
  try {
    const { testId, studentId, attemptId, studentData } = req.body;

    // Validate required fields
    if (!testId || !studentId || !attemptId) {
      return res.status(400).json({
        success: false,
        message: 'testId, studentId, and attemptId are required'
      });
    }

    // Generate PDF
    const pdfPath = await pdfGenerationService.generateStudentPDF(
      testId,
      studentId,
      attemptId,
      studentData || {}
    );

    res.status(200).json({
      success: true,
      message: 'PDF generated successfully',
      data: {
        pdfPath,
        downloadUrl: `/api/v1/pdf/download/${attemptId}`
      }
    });
  } catch (error) {
    console.error('Error in generatePDF controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate PDF',
      error: error.message
    });
  }
};

/**
 * Get generated PDF for an attempt
 * GET /api/v1/pdf/attempt/:attemptId
 */
exports.getGeneratedPDF = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const pdfRecord = await pdfGenerationService.getGeneratedPDF(attemptId);

    if (!pdfRecord) {
      return res.status(404).json({
        success: false,
        message: 'No PDF found for this attempt'
      });
    }

    res.status(200).json({
      success: true,
      data: pdfRecord
    });
  } catch (error) {
    console.error('Error in getGeneratedPDF controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve PDF information',
      error: error.message
    });
  }
};

/**
 * Download generated PDF
 * GET /api/v1/pdf/download/:attemptId
 */
exports.downloadPDF = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const pdfRecord = await pdfGenerationService.getGeneratedPDF(attemptId);

    if (!pdfRecord || !pdfRecord.pdf_file_path) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }

    const filePath = path.join(__dirname, '../../', pdfRecord.pdf_file_path);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="result-${attemptId}.pdf"`);

    // Send file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending PDF file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Failed to download PDF'
          });
        }
      }
    });
  } catch (error) {
    console.error('Error in downloadPDF controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download PDF',
      error: error.message
    });
  }
};

/**
 * Regenerate PDF for an attempt
 * POST /api/v1/pdf/regenerate/:attemptId
 */
exports.regeneratePDF = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { studentData } = req.body;

    const pdfPath = await pdfGenerationService.regeneratePDF(attemptId, studentData || {});

    res.status(200).json({
      success: true,
      message: 'PDF regenerated successfully',
      data: {
        pdfPath,
        downloadUrl: `/api/v1/pdf/download/${attemptId}`
      }
    });
  } catch (error) {
    console.error('Error in regeneratePDF controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to regenerate PDF',
      error: error.message
    });
  }
};

/**
 * Get PDF generation history for a student
 * GET /api/v1/pdf/student/:studentId/history
 */
exports.getStudentPDFHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { getMany } = require('../config/database');

    const history = await getMany(`
      SELECT
        pgh.*,
        pt.template_name,
        t.title as test_title
      FROM pdf_generation_history pgh
      LEFT JOIN pdf_templates pt ON pgh.template_id = pt.template_id
      LEFT JOIN tests t ON pgh.test_id = t.id
      WHERE pgh.student_id = $1
      ORDER BY pgh.generated_at DESC
    `, [studentId]);

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error in getStudentPDFHistory controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve PDF history',
      error: error.message
    });
  }
};

/**
 * Get PDF generation statistics (admin)
 * GET /api/v1/pdf/stats
 */
exports.getPDFStats = async (req, res) => {
  try {
    const { getOne } = require('../config/database');

    const stats = await getOne(`
      SELECT
        COUNT(*) as total_generated,
        COUNT(*) FILTER (WHERE generation_status = 'success') as successful,
        COUNT(*) FILTER (WHERE generation_status = 'failed') as failed,
        COUNT(DISTINCT student_id) as unique_students,
        COUNT(DISTINCT test_id) as unique_tests
      FROM pdf_generation_history
    `);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error in getPDFStats controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve PDF statistics',
      error: error.message
    });
  }
};
