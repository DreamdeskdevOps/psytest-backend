-- Migration: Create Flag-Based Scoring System Tables
-- Description: Creates tables for scoring configurations and test results
-- Date: 2024-12-19

BEGIN;

-- Create scoring configurations table
CREATE TABLE IF NOT EXISTS scoring_configurations (
    id SERIAL PRIMARY KEY,
    test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
    section_id INTEGER REFERENCES test_sections(id) ON DELETE CASCADE,

    -- Scoring type and pattern
    scoring_type VARCHAR(50) NOT NULL DEFAULT 'flag_based',
    scoring_pattern JSONB NOT NULL DEFAULT '{}',

    -- Configuration details
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create test results table for storing calculated results
CREATE TABLE IF NOT EXISTS test_results (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
    section_id INTEGER REFERENCES test_sections(id) ON DELETE CASCADE,

    -- Score calculations
    flag_scores JSONB, -- Raw flag scores: {"E": 25, "I": 18, "R": 12}
    total_score INTEGER DEFAULT 0,
    max_possible_score INTEGER DEFAULT 0,

    -- Results based on scoring pattern
    final_result JSONB, -- Final result: {"primary": "E", "top_3": ["E", "I", "R"], "scores": {...}}
    result_summary TEXT, -- Human readable result

    -- Metadata
    completion_time INTEGER, -- in seconds
    is_complete BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create flag scores detail table for tracking individual question contributions
CREATE TABLE IF NOT EXISTS flag_score_details (
    id SERIAL PRIMARY KEY,
    test_result_id INTEGER REFERENCES test_results(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    question_flag VARCHAR(50),
    user_answer TEXT,
    correct_answer TEXT,
    is_correct BOOLEAN,
    points_earned INTEGER DEFAULT 0,
    points_possible INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scoring_configurations_test_id ON scoring_configurations(test_id);
CREATE INDEX IF NOT EXISTS idx_scoring_configurations_section_id ON scoring_configurations(section_id);
CREATE INDEX IF NOT EXISTS idx_scoring_configurations_active ON scoring_configurations(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_test_results_user_test ON test_results(user_id, test_id);
CREATE INDEX IF NOT EXISTS idx_test_results_complete ON test_results(is_complete) WHERE is_complete = true;
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at);

CREATE INDEX IF NOT EXISTS idx_flag_score_details_result_id ON flag_score_details(test_result_id);
CREATE INDEX IF NOT EXISTS idx_flag_score_details_question_flag ON flag_score_details(question_flag);

-- Add comments
COMMENT ON TABLE scoring_configurations IS 'Stores scoring patterns and configurations for tests/sections';
COMMENT ON COLUMN scoring_configurations.scoring_pattern IS 'JSON configuration: {"type": "highest_only|top_3|top_4|top_5", "order": ["E", "I", "R"], "weights": {...}}';

COMMENT ON TABLE test_results IS 'Stores calculated test results based on scoring configurations';
COMMENT ON COLUMN test_results.flag_scores IS 'Raw calculated scores for each flag';
COMMENT ON COLUMN test_results.final_result IS 'Final result based on applied scoring pattern';

COMMENT ON TABLE flag_score_details IS 'Detailed breakdown of how each question contributed to flag scores';

COMMIT;