-- Migración para agregar CASCADE DELETE a comentarios cuando se elimina una publicación
-- Ejecutar después de que las entidades estén configuradas

-- Primero eliminar la constraint existente
ALTER TABLE comment DROP CONSTRAINT IF EXISTS "FK_comment_publication";

-- Agregar la nueva constraint con CASCADE
ALTER TABLE comment 
ADD CONSTRAINT "FK_comment_publication" 
FOREIGN KEY ("publicationId") 
REFERENCES publication(id) 
ON DELETE CASCADE;

-- Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_comment_publication_id ON comment("publicationId");

-- Comentarios para documentación
COMMENT ON TABLE comment IS 'Tabla para almacenar comentarios de usuarios en las publicaciones';
COMMENT ON COLUMN comment."publicationId" IS 'ID de la publicación que recibe el comentario (se elimina en cascada)'; 