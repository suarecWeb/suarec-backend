-- Migración para crear las tablas de galería de imágenes
-- Ejecutar después de que las entidades estén configuradas

-- Tabla para galería de usuarios
CREATE TABLE IF NOT EXISTS user_gallery (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  image_path TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla para galería de empresas
CREATE TABLE IF NOT EXISTS company_gallery (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  image_path TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_user_gallery_user_id ON user_gallery(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gallery_order ON user_gallery(user_id, order_index);
CREATE INDEX IF NOT EXISTS idx_company_gallery_company_id ON company_gallery(company_id);
CREATE INDEX IF NOT EXISTS idx_company_gallery_order ON company_gallery(company_id, order_index);

-- Comentarios para documentación
COMMENT ON TABLE user_gallery IS 'Galería de imágenes de usuarios';
COMMENT ON TABLE company_gallery IS 'Galería de imágenes de empresas';
COMMENT ON COLUMN user_gallery.image_url IS 'URL pública de la imagen en Supabase';
COMMENT ON COLUMN user_gallery.image_path IS 'Ruta de la imagen en el bucket de Supabase';
COMMENT ON COLUMN user_gallery.order_index IS 'Orden de la imagen en la galería';
COMMENT ON COLUMN company_gallery.image_url IS 'URL pública de la imagen en Supabase';
COMMENT ON COLUMN company_gallery.image_path IS 'Ruta de la imagen en el bucket de Supabase';
COMMENT ON COLUMN company_gallery.order_index IS 'Orden de la imagen en la galería'; 