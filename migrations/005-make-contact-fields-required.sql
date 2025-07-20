-- Migración para hacer obligatorios los campos de contacto en bank_info
-- Ejecutar después de verificar que no hay registros con valores NULL

-- Primero, verificar si existen registros con valores NULL
-- SELECT COUNT(*) FROM bank_info WHERE contact_email IS NULL OR contact_phone IS NULL;

-- Si hay registros con valores NULL, actualizarlos primero (opcional)
-- UPDATE bank_info SET contact_email = '' WHERE contact_email IS NULL;
-- UPDATE bank_info SET contact_phone = '' WHERE contact_phone IS NULL;

-- Cambiar las columnas para que no permitan NULL
ALTER TABLE bank_info 
ALTER COLUMN contact_email SET NOT NULL;

ALTER TABLE bank_info 
ALTER COLUMN contact_phone SET NOT NULL;

-- Agregar comentarios a las columnas para claridad
COMMENT ON COLUMN bank_info.contact_email IS 'Correo electrónico para confirmaciones (obligatorio)';
COMMENT ON COLUMN bank_info.contact_phone IS 'Teléfono para confirmaciones (obligatorio)';
