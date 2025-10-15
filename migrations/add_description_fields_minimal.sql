-- ============================================
-- MINIMAL DATABASE CHANGE: Description Fields
-- This ONLY adds new columns, does NOT modify existing ones
-- Existing functionality will NOT be affected
-- ============================================

BEGIN;

-- Add description_fields to tests table (stores field definitions)
-- This is NULLABLE and OPTIONAL - existing tests work fine without it
ALTER TABLE tests
ADD COLUMN IF NOT EXISTS description_fields JSONB DEFAULT NULL;

-- Add description_structure to test_results table (stores structured data)
-- This is NULLABLE and OPTIONAL - existing results still use 'description' column
ALTER TABLE test_results
ADD COLUMN IF NOT EXISTS description_structure JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN tests.description_fields IS 'Optional: JSON configuration for result description segments. Format: [{"key": "intro", "label": "Introduction", "type": "text", "order": 1, "required": true}]';
COMMENT ON COLUMN test_results.description_structure IS 'Optional: Structured description data. If NULL, falls back to description column. Format: {"intro": {"content": "...", "type": "text"}}';

-- Create index for performance (optional, doesn't affect functionality)
CREATE INDEX IF NOT EXISTS idx_tests_description_fields ON tests USING GIN (description_fields) WHERE description_fields IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_test_results_description_structure ON test_results USING GIN (description_structure) WHERE description_structure IS NOT NULL;

COMMIT;

-- ============================================
-- BACKWARD COMPATIBILITY NOTES:
-- ============================================
-- 1. Existing tests: description_fields = NULL (use old description)
-- 2. Existing results: description_structure = NULL (use old description column)
-- 3. New tests: can optionally define description_fields
-- 4. New results: can optionally use description_structure
-- 5. NO breaking changes to existing code
-- ============================================
