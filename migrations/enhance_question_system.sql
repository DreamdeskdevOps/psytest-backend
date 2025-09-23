-- ============================================
-- ENHANCED QUESTION SYSTEM MIGRATION
-- Adds support for multiple question types with image support
-- ============================================

-- Add new columns to support enhanced question types
ALTER TABLE questions
DROP CONSTRAINT IF EXISTS questions_question_type_check;

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS question_images JSONB DEFAULT '[]', -- Array of image objects
ADD COLUMN IF NOT EXISTS question_content_type VARCHAR(30) DEFAULT 'text_only'
    CHECK (question_content_type IN (
        'text_only',           -- 1. Question only (no images)
        'single_image',        -- 2. Question with single image
        'multiple_images',     -- 3. Question with multiple images
        'numbered_images',     -- 4. Question with numbered images (1.image1, 2.image2)
        'options_only'         -- 5. No question text, only options
    ));

-- Update question_type to support more types
ALTER TABLE questions
ALTER COLUMN question_type TYPE VARCHAR(30),
ALTER COLUMN question_type SET DEFAULT 'multiple_choice';

ALTER TABLE questions
ADD CONSTRAINT questions_question_type_check
CHECK (question_type IN (
    'multiple_choice',
    'true_false',
    'single_select',
    'multi_select',
    'likert_scale',
    'rating_scale',
    'text_input',
    'image_choice',
    'options_only'
));

-- Create table for question images to support multiple images per question
CREATE TABLE IF NOT EXISTS question_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,

    -- Image Content
    image_url TEXT NOT NULL,
    image_filename VARCHAR(255),
    image_alt_text TEXT,
    image_caption TEXT,

    -- Image Settings
    display_order INTEGER NOT NULL DEFAULT 1,
    image_number VARCHAR(10), -- For numbered images like "1", "2", "A", "B"
    image_position VARCHAR(20) DEFAULT 'inline'
        CHECK (image_position IN ('before_question', 'inline', 'after_question')),

    -- Image Metadata
    file_size INTEGER, -- in bytes
    mime_type VARCHAR(50),
    width INTEGER,
    height INTEGER,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_question_images_question_id ON question_images(question_id);
CREATE INDEX IF NOT EXISTS idx_question_images_display_order ON question_images(question_id, display_order);

-- Create table for local file storage management
CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- File Information
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL UNIQUE,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,

    -- File Metadata
    file_type VARCHAR(20) NOT NULL
        CHECK (file_type IN ('question_image', 'option_image', 'avatar', 'certificate', 'other')),
    entity_type VARCHAR(50), -- 'question', 'answer_option', 'user', etc.
    entity_id UUID, -- Reference to the entity this file belongs to

    -- File Processing
    processing_status VARCHAR(20) DEFAULT 'uploaded'
        CHECK (processing_status IN ('uploading', 'uploaded', 'processing', 'processed', 'failed')),
    thumbnail_path TEXT,
    compressed_path TEXT,

    -- Access Control
    is_public BOOLEAN DEFAULT FALSE,
    access_token VARCHAR(255), -- For private file access

    -- Audit Trail
    uploaded_by UUID REFERENCES admins(id),
    uploaded_by_type VARCHAR(20) DEFAULT 'admin' CHECK (uploaded_by_type IN ('admin', 'user', 'system')),

    -- Cleanup
    expires_at TIMESTAMP,
    is_temporary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for file management
CREATE INDEX IF NOT EXISTS idx_file_uploads_entity ON file_uploads(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_type ON file_uploads(file_type);
CREATE INDEX IF NOT EXISTS idx_file_uploads_stored_filename ON file_uploads(stored_filename);

-- Update existing questions to set default content type
UPDATE questions
SET question_content_type = CASE
    WHEN question_image IS NOT NULL THEN 'single_image'
    ELSE 'text_only'
END
WHERE question_content_type IS NULL;

-- Migrate existing question images to new structure
INSERT INTO question_images (question_id, image_url, display_order, image_position, created_at, updated_at)
SELECT
    id,
    question_image,
    1,
    'inline',
    created_at,
    updated_at
FROM questions
WHERE question_image IS NOT NULL
AND question_image != '';

-- Add sample question content types for reference
INSERT INTO answer_patterns (name, description, pattern_type, options, is_system_pattern, created_at) VALUES
('Multiple Choice (A-D)', 'Standard 4-option multiple choice', 'multiple_choice',
 '[{"value": "A", "label": "Option A"}, {"value": "B", "label": "Option B"}, {"value": "C", "label": "Option C"}, {"value": "D", "label": "Option D"}]'::jsonb, true, CURRENT_TIMESTAMP),

('True/False', 'Simple true or false questions', 'true_false',
 '[{"value": "true", "label": "True"}, {"value": "false", "label": "False"}]'::jsonb, true, CURRENT_TIMESTAMP),

('Likert Scale 5-Point', '5-point agreement scale', 'likert_scale',
 '[{"value": "1", "label": "Strongly Disagree"}, {"value": "2", "label": "Disagree"}, {"value": "3", "label": "Neutral"}, {"value": "4", "label": "Agree"}, {"value": "5", "label": "Strongly Agree"}]'::jsonb, true, CURRENT_TIMESTAMP),

('Yes/No', 'Simple yes or no questions', 'yes_no',
 '[{"value": "yes", "label": "Yes"}, {"value": "no", "label": "No"}]'::jsonb, true, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Create function to generate unique filenames
CREATE OR REPLACE FUNCTION generate_unique_filename(original_name TEXT, file_extension TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    base_name TEXT;
    extension TEXT;
    unique_name TEXT;
    counter INTEGER := 0;
BEGIN
    -- Extract extension if not provided
    IF file_extension IS NULL THEN
        extension := CASE
            WHEN original_name ~ '\.[^.]+$' THEN
                regexp_replace(original_name, '^.*\.([^.]+)$', '\1')
            ELSE
                ''
        END;
        base_name := regexp_replace(original_name, '\.[^.]+$', '');
    ELSE
        extension := file_extension;
        base_name := original_name;
    END IF;

    -- Generate unique filename
    unique_name := base_name || '_' || extract(epoch from now())::bigint::text;
    IF extension != '' THEN
        unique_name := unique_name || '.' || extension;
    END IF;

    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM file_uploads WHERE stored_filename = unique_name) LOOP
        counter := counter + 1;
        unique_name := base_name || '_' || extract(epoch from now())::bigint::text || '_' || counter;
        IF extension != '' THEN
            unique_name := unique_name || '.' || extension;
        END IF;
    END LOOP;

    RETURN unique_name;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up expired temporary files
CREATE OR REPLACE FUNCTION cleanup_expired_files()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Mark expired files as inactive
    UPDATE file_uploads
    SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
    WHERE is_temporary = TRUE
    AND expires_at < CURRENT_TIMESTAMP
    AND is_active = TRUE;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_question_images_updated_at
    BEFORE UPDATE ON question_images
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_uploads_updated_at
    BEFORE UPDATE ON file_uploads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for question with images
CREATE OR REPLACE VIEW questions_with_images AS
SELECT
    q.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', qi.id,
                'image_url', qi.image_url,
                'image_filename', qi.image_filename,
                'image_alt_text', qi.image_alt_text,
                'image_caption', qi.image_caption,
                'display_order', qi.display_order,
                'image_number', qi.image_number,
                'image_position', qi.image_position,
                'width', qi.width,
                'height', qi.height
            ) ORDER BY qi.display_order
        ) FILTER (WHERE qi.id IS NOT NULL),
        '[]'::json
    ) AS images
FROM questions q
LEFT JOIN question_images qi ON q.id = qi.question_id AND qi.is_active = true
GROUP BY q.id;

COMMENT ON TABLE question_images IS 'Stores multiple images per question with display order and positioning';
COMMENT ON TABLE file_uploads IS 'Central file storage management for all uploaded files';
COMMENT ON VIEW questions_with_images IS 'Questions joined with their associated images';