-- Migration: Add encryption and email tracking to pdf_generation_history
-- This adds columns to track whether PDFs are encrypted and if emails were sent

-- Add is_encrypted column to track if PDF is password-protected
ALTER TABLE pdf_generation_history
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- Add email_sent column to track if result email was delivered
ALTER TABLE pdf_generation_history
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN pdf_generation_history.is_encrypted IS 'Indicates if the PDF was encrypted with a password';
COMMENT ON COLUMN pdf_generation_history.email_sent IS 'Indicates if a result email with PDF was sent to the student';

-- Display message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added is_encrypted and email_sent columns to pdf_generation_history';
END $$;
