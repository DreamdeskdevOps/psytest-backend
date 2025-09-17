-- SQL script to add missing columns to answer_patterns table
-- This makes the database compatible with the application code

DO $$ 
BEGIN
    -- Add pattern_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'answer_patterns' AND column_name = 'pattern_name') THEN
        ALTER TABLE answer_patterns ADD COLUMN pattern_name VARCHAR(100) UNIQUE;
    END IF;
    
    -- Add display_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'answer_patterns' AND column_name = 'display_name') THEN
        ALTER TABLE answer_patterns ADD COLUMN display_name VARCHAR(200);
    END IF;
    
    -- Add configuration column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'answer_patterns' AND column_name = 'configuration') THEN
        ALTER TABLE answer_patterns ADD COLUMN configuration JSONB;
    END IF;
    
    -- Add use_cases column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'answer_patterns' AND column_name = 'use_cases') THEN
        ALTER TABLE answer_patterns ADD COLUMN use_cases JSONB;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'answer_patterns' AND column_name = 'updated_at') THEN
        ALTER TABLE answer_patterns ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- Add updated_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'answer_patterns' AND column_name = 'updated_by') THEN
        ALTER TABLE answer_patterns ADD COLUMN updated_by UUID REFERENCES admins(id);
    END IF;
    
    -- Copy data from name to pattern_name where pattern_name is NULL
    UPDATE answer_patterns 
    SET pattern_name = name 
    WHERE pattern_name IS NULL;
    
    -- Make the old name column nullable
    ALTER TABLE answer_patterns ALTER COLUMN name DROP NOT NULL;
    
END $$;