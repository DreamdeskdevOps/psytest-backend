-- Add flag_score column for exact flag-score matching
-- This is used when scoring_pattern is "top_2", "top_3", or "top_4"
-- For these patterns, we need exact score matches (e.g., Flag A with score 7)

ALTER TABLE test_results
ADD COLUMN IF NOT EXISTS flag_score INTEGER DEFAULT NULL;

COMMENT ON COLUMN test_results.flag_score IS 'Exact score for flag-score-based results. Used when result_type is flag_score_based';
COMMENT ON COLUMN test_results.score_range IS 'Score range for range-based results (e.g., 3-4). Used when result_type is range_based';
COMMENT ON COLUMN test_results.result_type IS 'Type of result: flag_based (MBTI), range_based (SMT), or flag_score_based (Top N flags)';
