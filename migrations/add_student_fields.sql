-- Add missing student fields to users table
-- These fields are collected during signup but were not in the original schema

ALTER TABLE users
ADD COLUMN IF NOT EXISTS school_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS class VARCHAR(100),
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS age INTEGER;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_school_name ON users(school_name);
CREATE INDEX IF NOT EXISTS idx_users_class ON users(class);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table if not exists
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
