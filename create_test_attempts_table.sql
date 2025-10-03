-- Create test_attempts table for tracking user test sessions
CREATE TABLE IF NOT EXISTS test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned', 'expired')),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  time_limit_minutes INTEGER NOT NULL DEFAULT 30,
  expires_at TIMESTAMP NOT NULL,
  current_question_index INTEGER DEFAULT 1,
  answers JSONB DEFAULT '{}',
  total_score DECIMAL(10,2) NULL,
  percentage_score DECIMAL(5,2) NULL,
  section_scores JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_test_attempts_user_id ON test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_test_id ON test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_session_token ON test_attempts(session_token);
CREATE INDEX IF NOT EXISTS idx_test_attempts_status ON test_attempts(status);
CREATE INDEX IF NOT EXISTS idx_test_attempts_expires_at ON test_attempts(expires_at);

-- Add constraint to prevent multiple active attempts for same user/test
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_attempt
ON test_attempts(user_id, test_id)
WHERE status = 'in_progress';

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_test_attempts_updated_at
BEFORE UPDATE ON test_attempts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();