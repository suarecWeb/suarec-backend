-- Script para limpiar todas las tablas de la base de datos Suarec
-- Ejecutar en orden para respetar las dependencias de claves foráneas

-- Deshabilitar verificación de claves foráneas temporalmente
SET session_replication_role = replica;

-- Limpiar tablas de transacciones y pagos
DELETE FROM payment_transactions;

-- Limpiar tablas de calificaciones
DELETE FROM ratings;

-- Limpiar tablas de notificaciones
DELETE FROM notifications;

-- Limpiar tablas de verificación de email
DELETE FROM email_verifications;

-- Limpiar tablas de asistencia
DELETE FROM attendance;

-- Limpiar tablas de mensajes
DELETE FROM messages;

-- Limpiar tablas de comentarios
DELETE FROM comment;

-- Limpiar tablas de ofertas de contratos
DELETE FROM contract_bid;

-- Limpiar tablas de contratos
DELETE FROM contract;

-- Limpiar tablas de contratos de trabajo
DELETE FROM work_contracts;

-- Limpiar tablas de aplicaciones
DELETE FROM applications;

-- Limpiar tablas de publicaciones
DELETE FROM publication;

-- Limpiar tablas de experiencia laboral
DELETE FROM experiences;

-- Limpiar tablas de educación
DELETE FROM education;

-- Limpiar tablas de referencias
DELETE FROM reference;

-- Limpiar tablas de enlaces sociales
DELETE FROM social_link;

-- Limpiar tabla de relación roles-usuarios
DELETE FROM roles_users_users;

-- Limpiar tabla de usuarios
DELETE FROM users;

-- Limpiar tabla de empresas
DELETE FROM company;

-- Limpiar tabla de relación roles-permisos
DELETE FROM role_permission;

-- Limpiar tabla de roles
DELETE FROM roles;

-- Limpiar tabla de permisos
DELETE FROM permissions;

-- Reiniciar secuencias de ID (si existen)
-- Nota: Esto es específico para PostgreSQL
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
        EXECUTE 'ALTER SEQUENCE IF EXISTS ' || quote_ident(r.tablename) || '_id_seq RESTART WITH 1';
    END LOOP;
END $$;

-- Habilitar verificación de claves foráneas nuevamente
SET session_replication_role = DEFAULT;

-- Verificar que todas las tablas estén vacías
SELECT 
    schemaname,
    tablename,
    (SELECT count(*) FROM information_schema.tables t2 WHERE t2.table_schema = t1.schemaname AND t2.table_name = t1.tablename) as row_count
FROM pg_tables t1 
WHERE schemaname = current_schema()
ORDER BY tablename; 