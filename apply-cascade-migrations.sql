-- Script para aplicar migraciones de CASCADE DELETE
-- Ejecutar en pgAdmin para arreglar el problema de eliminación de publicaciones

-- 1. Migración para comentarios
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

-- 2. Migración para contratos
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

-- Verificar que las constraints se aplicaron correctamente
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('comment', 'contract')
    AND ccu.table_name = 'publication';

-- Mensaje de confirmación
SELECT 'Migraciones de CASCADE DELETE aplicadas exitosamente' as status; 