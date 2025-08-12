-- Migration: Fix service request fields for publication table
-- Date: 2024-01-XX

-- Add service request specific fields to the correct table (publication, not publications)
ALTER TABLE publication 
ADD COLUMN IF NOT EXISTS requirements TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS urgency TEXT,
ADD COLUMN IF NOT EXISTS "preferredSchedule" TEXT;

-- Add comments for the new columns
COMMENT ON COLUMN publication.requirements IS 'Requisitos específicos del trabajo/servicio solicitado';
COMMENT ON COLUMN publication.location IS 'Ubicación donde se requiere el servicio';
COMMENT ON COLUMN publication.urgency IS 'Nivel de urgencia: LOW, MEDIUM, HIGH, URGENT';
COMMENT ON COLUMN publication."preferredSchedule" IS 'Horario preferido para el servicio';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_publication_urgency ON publication(urgency);
CREATE INDEX IF NOT EXISTS idx_publication_location ON publication(location);
