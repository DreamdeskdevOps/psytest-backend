-- ============================================
-- PDF TEMPLATE SYSTEM - INDEPENDENT MODULE
-- This is a NEW feature that does NOT affect existing tests/results
-- ============================================

-- PDF Templates Table
-- Stores custom PDF templates created by admins
CREATE TABLE IF NOT EXISTS pdf_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(255) NOT NULL UNIQUE,
    template_description TEXT,

    -- Template configuration (JSON structure)
    template_config JSONB NOT NULL DEFAULT '{}',
    -- Structure: {
    --   pageSize: 'A4' | 'Letter',
    --   orientation: 'portrait' | 'landscape',
    --   margins: { top: 20, right: 20, bottom: 20, left: 20 },
    --   components: [...]
    -- }

    -- Template metadata
    template_type VARCHAR(50) DEFAULT 'result',
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Preview image
    preview_image TEXT,

    -- Optional: Which tests/results can use this template
    -- NULL means available for all
    assigned_tests JSONB DEFAULT NULL,
    assigned_results JSONB DEFAULT NULL,
    assigned_sections JSONB DEFAULT NULL,

    -- Versioning
    version INTEGER DEFAULT 1,

    -- Audit fields
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Available data fields reference for admins
CREATE TABLE IF NOT EXISTS pdf_template_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_description TEXT,
    field_category VARCHAR(50),
    field_type VARCHAR(50),
    placeholder_syntax VARCHAR(100),
    example_value TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PDF Generation History (optional tracking)
CREATE TABLE IF NOT EXISTS pdf_generation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES pdf_templates(id),
    test_attempt_id UUID,
    user_id UUID,
    pdf_url TEXT,
    pdf_filename VARCHAR(255),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default available fields
INSERT INTO pdf_template_fields (field_name, field_label, field_description, field_category, field_type, placeholder_syntax, example_value) VALUES
-- Student Info
('studentName', 'Student Name', 'Full name of the student', 'student', 'text', '{{studentName}}', 'John Doe'),
('studentEmail', 'Student Email', 'Email address', 'student', 'text', '{{studentEmail}}', 'john@example.com'),
('studentPhone', 'Student Phone', 'Phone number', 'student', 'text', '{{studentPhone}}', '+1234567890'),
('studentClass', 'Student Class', 'Class/Grade', 'student', 'text', '{{studentClass}}', '12th'),
('studentSchool', 'School Name', 'School name', 'student', 'text', '{{studentSchool}}', 'ABC School'),

-- Test Info
('testTitle', 'Test Title', 'Name of the test', 'test', 'text', '{{testTitle}}', 'DBDA Test'),
('testDescription', 'Test Description', 'Test description', 'test', 'text', '{{testDescription}}', 'Assessment test'),
('testDate', 'Test Date', 'Completion date', 'test', 'date', '{{testDate}}', '2025-01-10'),
('testDuration', 'Duration', 'Time taken', 'test', 'text', '{{testDuration}}', '45 min'),

-- Result Info
('overallScore', 'Overall Score', 'Total score', 'result', 'number', '{{overallScore}}', '85'),
('percentageScore', 'Percentage', 'Score percentage', 'result', 'number', '{{percentageScore}}', '92.5'),
('resultCode', 'Result Code', 'Result code', 'result', 'text', '{{resultCode}}', 'A+'),
('resultTitle', 'Result Title', 'Result title', 'result', 'text', '{{resultTitle}}', 'Excellent'),
('resultDescription', 'Description', 'Result description', 'result', 'text', '{{resultDescription}}', 'Great performance'),

-- Section Info (for multi-section tests)
('sectionResults', 'Section Results Array', 'All sections', 'section', 'array', '{{#sectionResults}}...{{/sectionResults}}', '[]'),
('sectionName', 'Section Name', 'Section name', 'section', 'text', '{{sectionName}}', 'VA'),
('sectionScore', 'Section Score', 'Section score', 'section', 'number', '{{sectionScore}}', '85'),
('sectionResult', 'Section Result', 'Section result', 'section', 'text', '{{sectionResult}}', 'Good'),

-- System
('currentDate', 'Current Date', 'Generation date', 'system', 'date', '{{currentDate}}', '2025-01-10'),
('certificateNumber', 'Certificate Number', 'Unique number', 'system', 'text', '{{certificateNumber}}', 'CERT-001')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pdf_templates_active ON pdf_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_type ON pdf_templates(template_type);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_pdf_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pdf_template_timestamp
    BEFORE UPDATE ON pdf_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_pdf_template_timestamp();

COMMENT ON TABLE pdf_templates IS 'NEW FEATURE: Custom PDF templates - Does not affect existing test functionality';
