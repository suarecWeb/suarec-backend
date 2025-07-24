-- Migración para agregar campo type opcional a publicaciones
-- Esto permite distinguir entre SERVICE y JOB sin romper publicaciones existentes

-- Verificar si la columna ya existe antes de crearla
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'publication' AND column_name = 'type'
    ) THEN
        ALTER TABLE publication ADD COLUMN type VARCHAR(50);
    END IF;
END $$;

-- Comentario explicativo
COMMENT ON COLUMN publication.type IS 'Tipo de publicación: SERVICE, JOB, etc. NULL para compatibilidad con publicaciones existentes';

-- Crear índice solo si no existe
CREATE INDEX IF NOT EXISTS idx_publication_type ON publication(type);

-- Opcional: Agregar constraint para validar valores permitidos (comentado por flexibilidad)
-- ALTER TABLE publication ADD CONSTRAINT chk_publication_type 
-- CHECK (type IS NULL OR type IN ('SERVICE', 'JOB', 'PRODUCT'));
