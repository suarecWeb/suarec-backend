-- Script temporal para deshabilitar la restricción única de cédula
-- Usar solo si la Opción 1 no funciona

-- 1. Verificar si existe la restricción
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'users' 
AND constraint_type = 'UNIQUE' 
AND constraint_name LIKE '%cedula%';

-- 2. Si existe, eliminarla temporalmente
-- (Ejecutar solo si la restricción existe)
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS "UQ_4772b80e9faf033812ebe3d6a96";

-- 3. Limpiar datos duplicados (usar el script anterior)

-- 4. Volver a agregar la restricción después de limpiar
-- ALTER TABLE users ADD CONSTRAINT "UQ_cedula" UNIQUE ("cedula"); 