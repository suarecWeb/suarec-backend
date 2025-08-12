-- Migration: Fix publication type enum to match the code
-- Date: 2024-01-XX

-- Drop the incorrect enum type if it exists
DROP TYPE IF EXISTS publication_type_enum;

-- Create the correct enum type
CREATE TYPE publication_type_enum AS ENUM ('SERVICE', 'SERVICE_REQUEST', 'JOB');

-- Update the type column to use the correct enum
ALTER TABLE publication 
ALTER COLUMN type TYPE publication_type_enum USING type::text::publication_type_enum;

-- Set default value for existing records
UPDATE publication SET type = 'SERVICE' WHERE type IS NULL;

-- Make the column NOT NULL
ALTER TABLE publication ALTER COLUMN type SET NOT NULL;

