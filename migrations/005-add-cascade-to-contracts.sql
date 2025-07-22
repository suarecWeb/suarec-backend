-- Migración para agregar CASCADE DELETE a contratos cuando se elimina una publicación
-- Ejecutar después de que las entidades estén configuradas

-- Primero eliminar la constraint existente si existe
ALTER TABLE contract DROP CONSTRAINT IF EXISTS "FK_contract_publication";

-- Agregar la nueva constraint con CASCADE
ALTER TABLE contract 
ADD CONSTRAINT "FK_contract_publication" 
FOREIGN KEY ("publicationId") 
REFERENCES publication(id) 
ON DELETE CASCADE;

-- Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_contract_publication_id ON contract("publicationId");

-- Comentarios para documentación
COMMENT ON TABLE contract IS 'Tabla para almacenar contratos entre usuarios (se elimina en cascada con la publicación)';
COMMENT ON COLUMN contract."publicationId" IS 'ID de la publicación relacionada (se elimina en cascada)'; 