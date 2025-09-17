-- Add missing columns to answer_patterns table to match the application code expectations

-- Add missing columns
ALTER TABLE answer_patterns 
ADD COLUMN IF NOT EXISTS pattern_name VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS display_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS configuration JSONB,
ADD COLUMN IF NOT EXISTS use_cases JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES admins(id);

-- Copy data from existing name column to pattern_name
UPDATE answer_patterns 
SET pattern_name = name 
WHERE pattern_name IS NULL;

-- Make the old name column nullable since we'll use pattern_name
ALTER TABLE answer_patterns 
ALTER COLUMN name DROP NOT NULL;