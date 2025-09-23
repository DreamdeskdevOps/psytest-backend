-- Simple script to add question_flag column
-- Run this in your PostgreSQL database to add the question flag feature

ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_flag VARCHAR(50) DEFAULT NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'questions' AND column_name = 'question_flag';