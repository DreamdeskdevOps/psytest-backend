-- Migration: Add question flag column for result calculation
-- Description: Adds optional flag column to questions table for categorizing questions
--              with characters (e.g., 'A', 'B') or words (e.g., 'Introvert', 'Extrovert')
-- Date: 2024-12-19

BEGIN;

-- Add flag column to questions table
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS question_flag VARCHAR(50) DEFAULT NULL;

-- Add comment to explain the column purpose
COMMENT ON COLUMN questions.question_flag IS 'Optional flag for question categorization. Can be a character (A, B, C) or word (Introvert, Extrovert) for result calculation and scoring purposes.';

-- Create index for faster queries when filtering by flag
CREATE INDEX IF NOT EXISTS idx_questions_flag ON questions(question_flag) WHERE question_flag IS NOT NULL;

-- Update updated_at timestamp
UPDATE questions SET updated_at = CURRENT_TIMESTAMP WHERE question_flag IS NULL;

COMMIT;

-- Verification query (uncomment to run)
-- SELECT
--   column_name,
--   data_type,
--   is_nullable,
--   column_default,
--   col_description(pgc.oid, pa.attnum) as column_comment
-- FROM information_schema.columns pa
-- JOIN pg_class pgc ON pgc.relname = pa.table_name
-- WHERE table_name = 'questions'
--   AND column_name = 'question_flag';