-- Migration: Create Scoring Patterns Management Table
-- Date: 2024-09-24
-- Description: Creates table for managing reusable scoring patterns (separate from configurations)

BEGIN;

-- Create scoring_patterns table for pattern management
CREATE TABLE IF NOT EXISTS scoring_patterns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,

    -- Pattern categorization
    category VARCHAR(50) NOT NULL DEFAULT 'flag-based', -- 'flag-based', 'range-based'
    type VARCHAR(100) NOT NULL, -- 'preset-highest', 'preset-top-3-rie', 'custom-flag-pattern', etc.

    -- Pattern configuration (stores all the custom settings)
    configuration JSONB NOT NULL DEFAULT '{}',

    -- Status and tracking
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0, -- Track how many sections use this pattern

    -- Audit fields
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scoring_patterns_category ON scoring_patterns(category);
CREATE INDEX IF NOT EXISTS idx_scoring_patterns_type ON scoring_patterns(type);
CREATE INDEX IF NOT EXISTS idx_scoring_patterns_active ON scoring_patterns(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scoring_patterns_name ON scoring_patterns(name);
CREATE INDEX IF NOT EXISTS idx_scoring_patterns_created_at ON scoring_patterns(created_at);

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_scoring_patterns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER scoring_patterns_update_updated_at
    BEFORE UPDATE ON scoring_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_scoring_patterns_updated_at();

-- No default patterns inserted - users will create their own patterns via the interface

-- Add comments for documentation
COMMENT ON TABLE scoring_patterns IS 'Reusable scoring pattern definitions that can be assigned to tests/sections';
COMMENT ON COLUMN scoring_patterns.category IS 'Pattern category: flag-based, range-based (future)';
COMMENT ON COLUMN scoring_patterns.type IS 'Specific pattern type: preset-*, custom-flag-pattern';
COMMENT ON COLUMN scoring_patterns.configuration IS 'JSON configuration with all pattern settings';
COMMENT ON COLUMN scoring_patterns.usage_count IS 'Number of test sections using this pattern';

-- Note: Usage statistics view will be created later when scoring_configurations table exists

COMMIT;