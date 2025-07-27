-- Script para aplicar SOFT DELETE a todas las entidades relevantes
-- Ejecutar en pgAdmin para agregar funcionalidad de soft delete

-- =====================================================
-- 1. PUBLICACIONES (publication)
-- =====================================================
ALTER TABLE publication 
ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_publication_deleted_at ON publication("deleted_at");
CREATE INDEX IF NOT EXISTS idx_publication_active ON publication("deleted_at") WHERE "deleted_at" IS NULL;

COMMENT ON COLUMN publication."deleted_at" IS 'Timestamp when the publication was soft deleted. NULL means the publication is active.';

-- =====================================================
-- 2. CONTRATOS (contract)
-- =====================================================
ALTER TABLE contract 
ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_contract_deleted_at ON contract("deleted_at");
CREATE INDEX IF NOT EXISTS idx_contract_active ON contract("deleted_at") WHERE "deleted_at" IS NULL;

COMMENT ON COLUMN contract."deleted_at" IS 'Timestamp when the contract was soft deleted. NULL means the contract is active.';

-- =====================================================
-- 3. COMENTARIOS (comment)
-- =====================================================
ALTER TABLE comment 
ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_comment_deleted_at ON comment("deleted_at");
CREATE INDEX IF NOT EXISTS idx_comment_active ON comment("deleted_at") WHERE "deleted_at" IS NULL;

COMMENT ON COLUMN comment."deleted_at" IS 'Timestamp when the comment was soft deleted. NULL means the comment is active.';

-- =====================================================
-- 4. ASOCIACIONES DE EMPLEADOS (attendance)
-- =====================================================
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_deleted_at ON attendance("deleted_at");
CREATE INDEX IF NOT EXISTS idx_attendance_active ON attendance("deleted_at") WHERE "deleted_at" IS NULL;

COMMENT ON COLUMN attendance."deleted_at" IS 'Timestamp when the employee association was soft deleted. NULL means the association is active.';

-- =====================================================
-- 5. VERIFICACIÓN FINAL
-- =====================================================
SELECT 
    'Migración de SOFT DELETE completada' as status,
    'publication' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN "deleted_at" IS NULL THEN 1 END) as active_records,
    COUNT(CASE WHEN "deleted_at" IS NOT NULL THEN 1 END) as deleted_records
FROM publication

UNION ALL

SELECT 
    'Migración de SOFT DELETE completada' as status,
    'contract' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN "deleted_at" IS NULL THEN 1 END) as active_records,
    COUNT(CASE WHEN "deleted_at" IS NOT NULL THEN 1 END) as deleted_records
FROM contract

UNION ALL

SELECT 
    'Migración de SOFT DELETE completada' as status,
    'comment' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN "deleted_at" IS NULL THEN 1 END) as active_records,
    COUNT(CASE WHEN "deleted_at" IS NOT NULL THEN 1 END) as deleted_records
FROM comment

UNION ALL

SELECT 
    'Migración de SOFT DELETE completada' as status,
    'attendance' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN "deleted_at" IS NULL THEN 1 END) as active_records,
    COUNT(CASE WHEN "deleted_at" IS NOT NULL THEN 1 END) as deleted_records
FROM attendance;

-- =====================================================
-- 6. VERIFICAR ÍNDICES CREADOS
-- =====================================================
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('publication', 'contract', 'comment', 'attendance')
    AND indexname LIKE '%deleted_at%'
ORDER BY tablename, indexname; 