-- Script para limpiar cédulas duplicadas en la tabla users
-- Ejecutar este script antes de aplicar las migraciones

-- 1. Verificar cédulas duplicadas
SELECT cedula, COUNT(*) as count
FROM users 
WHERE cedula IS NOT NULL 
GROUP BY cedula 
HAVING COUNT(*) > 1;

-- 2. Mantener solo el registro más reciente para cada cédula duplicada
DELETE FROM users 
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY cedula ORDER BY created_at DESC) as rn
        FROM users 
        WHERE cedula IN (
            SELECT cedula 
            FROM users 
            WHERE cedula IS NOT NULL 
            GROUP BY cedula 
            HAVING COUNT(*) > 1
        )
    ) t 
    WHERE t.rn > 1
);

-- 3. Verificar que no hay duplicados
SELECT cedula, COUNT(*) as count
FROM users 
WHERE cedula IS NOT NULL 
GROUP BY cedula 
HAVING COUNT(*) > 1;

-- 4. Si no hay duplicados, agregar el índice único
-- (Esto se hará automáticamente por TypeORM después de limpiar los datos) 