-- Create scoring_configurations table for test and section scoring configurations
CREATE TABLE IF NOT EXISTS scoring_configurations (
    id SERIAL PRIMARY KEY,
    test_id UUID NOT NULL,
    section_id UUID NULL,
    scoring_type VARCHAR(50) NOT NULL DEFAULT 'flag_based',
    scoring_pattern JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NULL,
    updated_by UUID NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraints
    CONSTRAINT fk_scoring_test FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    CONSTRAINT fk_scoring_section FOREIGN KEY (section_id) REFERENCES test_sections(id) ON DELETE CASCADE,
    CONSTRAINT fk_scoring_created_by FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL,
    CONSTRAINT fk_scoring_updated_by FOREIGN KEY (updated_by) REFERENCES admins(id) ON DELETE SET NULL,

    -- Unique constraint for test/section combination (only one active config per test/section)
    CONSTRAINT unique_test_section_config UNIQUE (test_id, section_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scoring_configurations_test_id ON scoring_configurations(test_id);
CREATE INDEX IF NOT EXISTS idx_scoring_configurations_section_id ON scoring_configurations(section_id);
CREATE INDEX IF NOT EXISTS idx_scoring_configurations_active ON scoring_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_scoring_configurations_created_at ON scoring_configurations(created_at);

-- Add comments for documentation
COMMENT ON TABLE scoring_configurations IS 'Stores scoring pattern configurations for tests and sections';
COMMENT ON COLUMN scoring_configurations.test_id IS 'Reference to the test this configuration applies to';
COMMENT ON COLUMN scoring_configurations.section_id IS 'Reference to the specific section (NULL means entire test)';
COMMENT ON COLUMN scoring_configurations.scoring_type IS 'Type of scoring: flag_based, range_based, etc.';
COMMENT ON COLUMN scoring_configurations.scoring_pattern IS 'JSON configuration for the scoring pattern';
COMMENT ON COLUMN scoring_configurations.is_active IS 'Whether this configuration is currently active';

-- Trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_scoring_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scoring_configurations_updated_at
    BEFORE UPDATE ON scoring_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_scoring_configurations_updated_at();

-- Insert some sample configurations for development (optional)
-- INSERT INTO scoring_configurations (test_id, section_id, scoring_type, scoring_pattern, created_by) VALUES
-- ('sample-test-id', NULL, 'flag_based', '{"type":"highest_only","order":[],"topN":1}', NULL);

COMMIT;