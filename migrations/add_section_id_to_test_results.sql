-- Migration: Add section_id column to test_results table
-- This allows results to be defined per section (e.g., for DBDA test with VA, NA, RA, SA, CA sections)

-- Add section_id column as nullable (to maintain backward compatibility with existing test-level results)
ALTER TABLE test_results
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES test_sections(id) ON DELETE SET NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_test_results_section_id ON test_results(section_id);

-- Add comment to explain the column
COMMENT ON COLUMN test_results.section_id IS 'Optional section ID for section-specific results. NULL means test-level result.';

-- Note: This change is backward compatible:
-- - Existing results will have section_id = NULL (test-level results)
-- - New results can optionally specify a section_id for section-specific results
-- - Tests without sections will continue to work with section_id = NULL
