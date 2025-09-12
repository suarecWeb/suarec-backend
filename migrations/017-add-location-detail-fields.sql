-- Migración 017: Agregar campos de ubicación detallada a publications
-- Fecha: 2025-01-15
-- Descripción: Agregar campos opcionales para sistema de ubicación detallado

-- Agregar nuevos campos de ubicación detallada
ALTER TABLE publications 
ADD COLUMN IF NOT EXISTS "locationType" TEXT,
ADD COLUMN IF NOT EXISTS "serviceLocation" TEXT,
ADD COLUMN IF NOT EXISTS "virtualMeetingLink" TEXT,
ADD COLUMN IF NOT EXISTS "propertyType" TEXT,
ADD COLUMN IF NOT EXISTS "references" TEXT;

-- Agregar comentarios para documentar los campos
COMMENT ON COLUMN publications."locationType" IS 'Tipo de ubicación: presencial o virtual';
COMMENT ON COLUMN publications."serviceLocation" IS 'Modalidad del servicio: domicilio o sitio';
COMMENT ON COLUMN publications."virtualMeetingLink" IS 'Link de videollamada para servicios virtuales';
COMMENT ON COLUMN publications."propertyType" IS 'Tipo de inmueble (casa, apartamento, oficina, etc.)';
COMMENT ON COLUMN publications."references" IS 'Referencias de ubicación (puntos de referencia)';

-- Verificar que los campos se agregaron correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'publications' 
AND column_name IN ('locationType', 'serviceLocation', 'virtualMeetingLink', 'propertyType', 'references');
