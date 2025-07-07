-- Migración para crear tabla de likes de publicaciones
-- Ejecutar después de que las entidades estén configuradas

-- Crear tabla publication_likes
CREATE TABLE IF NOT EXISTS publication_likes (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "publicationId" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint único para evitar likes duplicados
    CONSTRAINT unique_user_publication_like UNIQUE ("userId", "publicationId"),
    
    -- Foreign keys
    CONSTRAINT fk_publication_likes_user 
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_publication_likes_publication 
        FOREIGN KEY ("publicationId") REFERENCES publication(id) ON DELETE CASCADE
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_publication_likes_user_id ON publication_likes("userId");
CREATE INDEX IF NOT EXISTS idx_publication_likes_publication_id ON publication_likes("publicationId");
CREATE INDEX IF NOT EXISTS idx_publication_likes_created_at ON publication_likes("created_at");

-- Comentarios para documentación
COMMENT ON TABLE publication_likes IS 'Tabla para almacenar los likes de los usuarios en las publicaciones';
COMMENT ON COLUMN publication_likes."userId" IS 'ID del usuario que dio like';
COMMENT ON COLUMN publication_likes."publicationId" IS 'ID de la publicación que recibió like';
COMMENT ON COLUMN publication_likes."created_at" IS 'Fecha y hora cuando se dio el like'; 