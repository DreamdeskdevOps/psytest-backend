-- ============================================
-- ADD PDF TEMPLATE ASSIGNMENT TO TESTS
-- Allows tests to have assigned PDF templates for result generation
-- ============================================

-- Add pdf_template_id column to tests table
ALTER TABLE tests
ADD COLUMN IF NOT EXISTS pdf_template_id UUID REFERENCES pdf_templates(template_id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tests_pdf_template ON tests(pdf_template_id) WHERE pdf_template_id IS NOT NULL;

-- Update pdf_generation_history table structure
ALTER TABLE pdf_generation_history
ADD COLUMN IF NOT EXISTS test_id UUID,
ADD COLUMN IF NOT EXISTS student_id UUID,
ADD COLUMN IF NOT EXISTS attempt_id UUID,
ADD COLUMN IF NOT EXISTS pdf_file_path TEXT,
ADD COLUMN IF NOT EXISTS generation_status VARCHAR(50) DEFAULT 'completed';

-- Rename columns if they exist with different names (skip if student_id already exists)
DO $$
BEGIN
    -- Check and rename user_id to student_id if it exists and student_id doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'pdf_generation_history'
               AND column_name = 'user_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'pdf_generation_history'
                       AND column_name = 'student_id') THEN
        ALTER TABLE pdf_generation_history RENAME COLUMN user_id TO student_id;
    END IF;

    -- Check and rename test_attempt_id to attempt_id if it exists and attempt_id doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'pdf_generation_history'
               AND column_name = 'test_attempt_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'pdf_generation_history'
                       AND column_name = 'attempt_id') THEN
        ALTER TABLE pdf_generation_history RENAME COLUMN test_attempt_id TO attempt_id;
    END IF;

    -- Check and rename pdf_url to pdf_file_path if it exists and pdf_file_path doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'pdf_generation_history'
               AND column_name = 'pdf_url')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'pdf_generation_history'
                       AND column_name = 'pdf_file_path') THEN
        ALTER TABLE pdf_generation_history RENAME COLUMN pdf_url TO pdf_file_path;
    END IF;
END $$;

-- Add indexes for pdf_generation_history
CREATE INDEX IF NOT EXISTS idx_pdf_gen_history_test ON pdf_generation_history(test_id);
CREATE INDEX IF NOT EXISTS idx_pdf_gen_history_student ON pdf_generation_history(student_id);
CREATE INDEX IF NOT EXISTS idx_pdf_gen_history_attempt ON pdf_generation_history(attempt_id);
CREATE INDEX IF NOT EXISTS idx_pdf_gen_history_status ON pdf_generation_history(generation_status);

-- Add pdf_file_path to pdf_templates if not exists
ALTER TABLE pdf_templates
ADD COLUMN IF NOT EXISTS pdf_file_path TEXT;

-- Note: pdf_templates table uses 'template_id' as primary key

-- Comments
COMMENT ON COLUMN tests.pdf_template_id IS 'Reference to PDF template used for generating student result certificates';
COMMENT ON COLUMN pdf_generation_history.generation_status IS 'Status: pending, processing, completed, failed';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'PDF template assignment schema updated successfully!';
END $$;
