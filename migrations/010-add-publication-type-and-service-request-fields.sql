-- Migration: Add publication type and service request fields
-- Date: 2024-01-XX

-- Add publication type enum
CREATE TYPE publication_type_enum AS ENUM ('SERVICE_OFFER', 'SERVICE_REQUEST');

-- Add type column to publications table
ALTER TABLE publications 
ADD COLUMN type publication_type_enum DEFAULT 'SERVICE_OFFER';

-- Add service request specific fields
ALTER TABLE publications 
ADD COLUMN requirements TEXT,
ADD COLUMN location TEXT,
ADD COLUMN urgency TEXT,
ADD COLUMN preferred_schedule TEXT;

-- Update existing publications to be SERVICE_OFFER type
UPDATE publications SET type = 'SERVICE_OFFER' WHERE type IS NULL;

-- Make type column NOT NULL after setting default values
ALTER TABLE publications ALTER COLUMN type SET NOT NULL; 