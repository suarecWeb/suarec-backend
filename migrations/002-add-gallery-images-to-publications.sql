-- Migración para agregar campo gallery_images a la tabla de publicaciones
-- Ejecutar después de que las entidades estén configuradas

-- Agregar columna gallery_images a la tabla publication
ALTER TABLE publication 
ADD COLUMN IF NOT EXISTS gallery_images TEXT[];

-- Comentario para documentación
COMMENT ON COLUMN publication.gallery_images IS 'Array de URLs de imágenes de la galería seleccionadas para la publicación'; 