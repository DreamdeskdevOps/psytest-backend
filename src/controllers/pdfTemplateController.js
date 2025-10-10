const { getOne, getMany, executeQuery } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

// Create new PDF template
exports.createTemplate = async (req, res) => {
  try {
    const {
      template_name,
      template_description,
      template_type = 'result',
      template_config,
      is_default = false,
      is_active = true
    } = req.body;

    // Validate required fields
    if (!template_name || !template_config) {
      return res.status(400).json({
        success: false,
        message: 'Template name and configuration are required'
      });
    }

    // Handle PDF file upload
    let pdf_file_path = null;
    if (req.file) {
      pdf_file_path = `/uploads/pdf-templates/${req.file.filename}`;
    }

    // Insert template into database
    const insertQuery = `
      INSERT INTO pdf_templates (
        template_name,
        template_description,
        template_type,
        pdf_file_path,
        template_config,
        is_default,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await getOne(insertQuery, [
      template_name,
      template_description,
      template_type,
      pdf_file_path,
      JSON.stringify(template_config),
      is_default,
      is_active
    ]);

    res.status(201).json({
      success: true,
      message: 'PDF template created successfully',
      data: result
    });

  } catch (error) {
    console.error('Error creating PDF template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create PDF template',
      error: error.message
    });
  }
};

// Get all PDF templates
exports.getAllTemplates = async (req, res) => {
  try {
    const { template_type, is_active } = req.query;

    let query = 'SELECT * FROM pdf_templates WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (template_type) {
      query += ` AND template_type = $${paramIndex}`;
      params.push(template_type);
      paramIndex++;
    }

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(is_active === 'true');
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const templates = await getMany(query, params);

    res.status(200).json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
};

// Get active templates for dropdown (simplified list)
exports.getActiveTemplatesForDropdown = async (req, res) => {
  try {
    const templates = await getMany(
      'SELECT template_id, template_name, template_description, template_type FROM pdf_templates WHERE is_active = true ORDER BY template_name ASC'
    );

    res.status(200).json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Error fetching active templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
};

// Get single PDF template by ID
exports.getTemplateById = async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await getOne(
      'SELECT * FROM pdf_templates WHERE template_id = $1',
      [templateId]
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.status(200).json({
      success: true,
      data: template
    });

  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template',
      error: error.message
    });
  }
};

// Update PDF template
exports.updateTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const {
      template_name,
      template_description,
      template_type,
      template_config,
      is_default,
      is_active
    } = req.body;

    // Check if template exists
    const existingTemplate = await getOne(
      'SELECT * FROM pdf_templates WHERE template_id = $1',
      [templateId]
    );

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Handle PDF file upload if new file provided
    let pdf_file_path = existingTemplate.pdf_file_path;
    if (req.file) {
      pdf_file_path = `/uploads/pdf-templates/${req.file.filename}`;

      // Delete old file if it exists
      if (existingTemplate.pdf_file_path) {
        try {
          const oldFilePath = path.join(__dirname, '../..', existingTemplate.pdf_file_path);
          await fs.unlink(oldFilePath);
        } catch (err) {
          console.error('Error deleting old PDF file:', err);
        }
      }
    }

    // Update template
    const updateQuery = `
      UPDATE pdf_templates
      SET
        template_name = COALESCE($1, template_name),
        template_description = COALESCE($2, template_description),
        template_type = COALESCE($3, template_type),
        pdf_file_path = COALESCE($4, pdf_file_path),
        template_config = COALESCE($5, template_config),
        is_default = COALESCE($6, is_default),
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
      WHERE template_id = $8
      RETURNING *
    `;

    const result = await getOne(updateQuery, [
      template_name,
      template_description,
      template_type,
      pdf_file_path,
      template_config ? JSON.stringify(template_config) : null,
      is_default,
      is_active,
      templateId
    ]);

    res.status(200).json({
      success: true,
      message: 'Template updated successfully',
      data: result
    });

  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update template',
      error: error.message
    });
  }
};

// Delete PDF template
exports.deleteTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;

    // Check if template exists
    const template = await getOne(
      'SELECT * FROM pdf_templates WHERE template_id = $1',
      [templateId]
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check if template is assigned to any tests
    const assignedTests = await getMany(
      'SELECT id, title FROM tests WHERE pdf_template_id = $1',
      [templateId]
    );

    if (assignedTests && assignedTests.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete template. It is assigned to ${assignedTests.length} test(s). Please unassign it first.`,
        assignedTests: assignedTests.map(t => t.title)
      });
    }

    // Delete PDF generation history records first (to avoid foreign key constraint)
    await executeQuery(
      'DELETE FROM pdf_generation_history WHERE template_id = $1',
      [templateId]
    );
    console.log(`🗑️ Deleted generation history records for template ${templateId}`);

    // Delete PDF file if it exists
    if (template.pdf_file_path) {
      try {
        const filePath = path.join(__dirname, '../..', template.pdf_file_path);
        await fs.unlink(filePath);
        console.log(`🗑️ Deleted PDF file: ${template.pdf_file_path}`);
      } catch (err) {
        console.error('Error deleting PDF file:', err);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete template from database
    await executeQuery('DELETE FROM pdf_templates WHERE template_id = $1', [templateId]);
    console.log(`✅ Deleted template: ${template.template_name}`);

    res.status(200).json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template',
      error: error.message
    });
  }
};

// Duplicate template
exports.duplicateTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;

    // Get original template
    const originalTemplate = await getOne(
      'SELECT * FROM pdf_templates WHERE template_id = $1',
      [templateId]
    );

    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Create duplicate with new name
    const newName = `${originalTemplate.template_name} (Copy)`;

    const insertQuery = `
      INSERT INTO pdf_templates (
        template_name,
        template_description,
        template_type,
        pdf_file_path,
        template_config,
        is_default,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await getOne(insertQuery, [
      newName,
      originalTemplate.template_description,
      originalTemplate.template_type,
      originalTemplate.pdf_file_path,
      originalTemplate.template_config,
      false, // Duplicate is never default
      originalTemplate.is_active
    ]);

    res.status(201).json({
      success: true,
      message: 'Template duplicated successfully',
      data: result
    });

  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate template',
      error: error.message
    });
  }
};

// Get available template fields dynamically from database schema
exports.getAvailableFields = async (req, res) => {
  try {
    // Fields based on actual database structure
    const fieldCategories = [
      {
        category: 'Student Information',
        fields: [
          { name: 'first_name', label: 'First Name', placeholder: '{{first_name}}', type: 'text', example: 'John', table: 'users.first_name' },
          { name: 'last_name', label: 'Last Name', placeholder: '{{last_name}}', type: 'text', example: 'Doe', table: 'users.last_name' },
          { name: 'full_name', label: 'Full Name', placeholder: '{{full_name}}', type: 'text', example: 'John Doe', computed: true },
          { name: 'email', label: 'Email', placeholder: '{{email}}', type: 'text', example: 'john@example.com', table: 'users.email' },
          { name: 'phone_number', label: 'Phone Number', placeholder: '{{phone_number}}', type: 'text', example: '+1234567890', table: 'users.phone_number' },
          { name: 'date_of_birth', label: 'Date of Birth', placeholder: '{{date_of_birth}}', type: 'text', example: '1995-01-15', table: 'users.date_of_birth' },
          { name: 'gender', label: 'Gender', placeholder: '{{gender}}', type: 'text', example: 'male', table: 'users.gender' },
          { name: 'user_id', label: 'User ID', placeholder: '{{user_id}}', type: 'text', example: 'uuid-xxx', table: 'users.id' },
          { name: 'avatar', label: 'Student Photo', placeholder: '{{avatar}}', type: 'image', example: '/uploads/avatars/student.jpg', table: 'users.avatar' },
          { name: 'school_name', label: 'School Name', placeholder: '{{school_name}}', type: 'text', example: 'ABC High School', table: 'users.address.school_name' },
          { name: 'class', label: 'Class/Grade', placeholder: '{{class}}', type: 'text', example: '12th Grade', table: 'users.address.class' },
          { name: 'roll_number', label: 'Roll Number', placeholder: '{{roll_number}}', type: 'text', example: 'ROLL-001', table: 'users.address.roll_number' },
          { name: 'address_street', label: 'Street Address', placeholder: '{{address_street}}', type: 'text', example: '123 Main St', table: 'users.address.street' },
          { name: 'address_city', label: 'City', placeholder: '{{address_city}}', type: 'text', example: 'New York', table: 'users.address.city' },
          { name: 'address_state', label: 'State', placeholder: '{{address_state}}', type: 'text', example: 'NY', table: 'users.address.state' },
          { name: 'address_country', label: 'Country', placeholder: '{{address_country}}', type: 'text', example: 'USA', table: 'users.address.country' }
        ]
      },
      {
        category: 'Test Information',
        fields: [
          { name: 'test_title', label: 'Test Title', placeholder: '{{test_title}}', type: 'text', example: 'DBDA Test', table: 'tests.title' },
          { name: 'test_description', label: 'Test Description', placeholder: '{{test_description}}', type: 'text', example: 'Assessment test...', table: 'tests.description' },
          { name: 'test_type', label: 'Test Type', placeholder: '{{test_type}}', type: 'text', example: 'multiple_choice', table: 'tests.test_type' },
          { name: 'total_duration', label: 'Duration (minutes)', placeholder: '{{total_duration}}', type: 'text', example: '45', table: 'tests.total_duration' },
          { name: 'total_questions', label: 'Total Questions', placeholder: '{{total_questions}}', type: 'text', example: '50', table: 'tests.total_questions' },
          { name: 'passing_score', label: 'Passing Score', placeholder: '{{passing_score}}', type: 'text', example: '50.00', table: 'tests.passing_score' },
          { name: 'test_thumbnail', label: 'Test Thumbnail', placeholder: '{{test_thumbnail}}', type: 'image', example: '/uploads/thumbnails/test.jpg', table: 'tests.thumbnail' }
        ]
      },
      {
        category: 'Test Attempt Information',
        fields: [
          { name: 'attempt_number', label: 'Attempt Number', placeholder: '{{attempt_number}}', type: 'text', example: '1', table: 'test_attempts.attempt_number' },
          { name: 'started_at', label: 'Started At', placeholder: '{{started_at}}', type: 'text', example: '2025-01-10 10:00', table: 'test_attempts.started_at' },
          { name: 'completed_at', label: 'Completed At', placeholder: '{{completed_at}}', type: 'text', example: '2025-01-10 11:30', table: 'test_attempts.completed_at' },
          { name: 'total_time_spent', label: 'Time Spent (seconds)', placeholder: '{{total_time_spent}}', type: 'text', example: '5400', table: 'test_attempts.total_time_spent' },
          { name: 'status', label: 'Status', placeholder: '{{status}}', type: 'text', example: 'completed', table: 'test_attempts.status' }
        ]
      },
      {
        category: 'Score & Results',
        fields: [
          { name: 'total_score', label: 'Total Score', placeholder: '{{total_score}}', type: 'text', example: '85.50', table: 'test_attempts.total_score' },
          { name: 'percentage', label: 'Percentage', placeholder: '{{percentage}}', type: 'text', example: '85.50', table: 'test_attempts.percentage' },
          { name: 'max_possible_score', label: 'Max Score', placeholder: '{{max_possible_score}}', type: 'text', example: '100.00', table: 'test_attempts.max_possible_score' },
          { name: 'total_questions_answered', label: 'Questions Answered', placeholder: '{{total_questions_answered}}', type: 'text', example: '50', table: 'test_attempts.total_questions_answered' },
          { name: 'grade', label: 'Grade', placeholder: '{{grade}}', type: 'text', example: 'A+', computed: true },
          { name: 'result_status', label: 'Result Status', placeholder: '{{result_status}}', type: 'text', example: 'PASSED', computed: true }
        ]
      },
      {
        category: 'Section Scores',
        fields: [
          { name: 'section_scores', label: 'Section Scores (JSON)', placeholder: '{{section_scores}}', type: 'text', example: '{"Verbal":85}', table: 'test_attempts.section_scores' },
          { name: 'section_results', label: 'Section Results (formatted)', placeholder: '{{section_results}}', type: 'text', example: 'Verbal: 85, Math: 90', computed: true }
        ]
      },
      {
        category: 'Result Component Information',
        fields: [
          { name: 'result_code', label: 'Result Code', placeholder: '{{result_code}}', type: 'text', example: 'ENFJ', table: 'result_components.code' },
          { name: 'component_name', label: 'Component Name', placeholder: '{{component_name}}', type: 'text', example: 'Extraversion', table: 'result_components.name' },
          { name: 'result_title', label: 'Result Title', placeholder: '{{result_title}}', type: 'text', example: 'The Protagonist', table: 'test_results.title' },
          { name: 'result_description', label: 'Result Description', placeholder: '{{result_description}}', type: 'text', example: 'You are inspiring...', table: 'test_results.description' }
        ]
      },
      {
        category: 'Certificate & Additional',
        fields: [
          { name: 'certificate_id', label: 'Certificate ID', placeholder: '{{certificate_id}}', type: 'text', example: 'CERT-202501-1234', computed: true },
          { name: 'issue_date', label: 'Issue Date', placeholder: '{{issue_date}}', type: 'text', example: 'January 10, 2025', computed: true },
          { name: 'qr_code', label: 'QR Code', placeholder: '{{qr_code}}', type: 'image', example: 'data:image/png;base64,...', computed: true },
          { name: 'signature', label: 'Signature', placeholder: '{{signature}}', type: 'image', example: '/uploads/signatures/signature.png', computed: true },
          { name: 'school_logo', label: 'School/Org Logo', placeholder: '{{school_logo}}', type: 'image', example: '/uploads/logos/school.png', computed: true }
        ]
      }
    ];

    res.status(200).json({
      success: true,
      data: fieldCategories,
      metadata: {
        totalCategories: fieldCategories.length,
        totalFields: fieldCategories.reduce((sum, cat) => sum + cat.fields.length, 0),
        textFields: fieldCategories.reduce((sum, cat) =>
          sum + cat.fields.filter(f => f.type === 'text').length, 0),
        imageFields: fieldCategories.reduce((sum, cat) =>
          sum + cat.fields.filter(f => f.type === 'image').length, 0)
      }
    });

  } catch (error) {
    console.error('Error fetching available fields:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available fields',
      error: error.message
    });
  }
};

// Get PDF generation history
exports.getGenerationHistory = async (req, res) => {
  try {
    const { student_id, test_id, template_id } = req.query;

    let query = `
      SELECT
        pgh.*,
        pt.template_name,
        u.name as student_name,
        t.test_name
      FROM pdf_generation_history pgh
      LEFT JOIN pdf_templates pt ON pgh.template_id = pt.template_id
      LEFT JOIN users u ON pgh.student_id = u.user_id
      LEFT JOIN tests t ON pgh.test_id = t.test_id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (student_id) {
      query += ` AND pgh.student_id = $${paramIndex}`;
      params.push(student_id);
      paramIndex++;
    }

    if (test_id) {
      query += ` AND pgh.test_id = $${paramIndex}`;
      params.push(test_id);
      paramIndex++;
    }

    if (template_id) {
      query += ` AND pgh.template_id = $${paramIndex}`;
      params.push(template_id);
      paramIndex++;
    }

    query += ' ORDER BY pgh.generated_at DESC';

    const history = await getMany(query, params);

    res.status(200).json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Error fetching generation history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch generation history',
      error: error.message
    });
  }
};
