-- Script para limpiar la base de datos manteniendo solo datos del 21 de julio de 2025
-- Y eliminando usuarios con '+' en su email
-- Ejecutar con precaución - HACER BACKUP ANTES

-- Desactivar restricciones de clave foránea temporalmente
SET session_replication_role = replica;

-- Primero, identificar usuarios con '+' en su email para eliminarlos completamente
-- Eliminar todo lo relacionado con estos usuarios

-- Eliminar asistencia de usuarios con '+'
DELETE FROM attendance WHERE employee_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar historial de empresa de usuarios con '+'
DELETE FROM company_history WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar aplicaciones de usuarios con '+'
DELETE FROM application WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar comentarios de usuarios con '+'
DELETE FROM comment WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar mensajes de usuarios con '+'
DELETE FROM message WHERE sender_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);
DELETE FROM message WHERE recipient_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar notificaciones de usuarios con '+'
DELETE FROM notification WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar calificaciones de usuarios con '+'
DELETE FROM rating WHERE reviewer_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);
DELETE FROM rating WHERE reviewee_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar likes de publicaciones de usuarios con '+'
DELETE FROM publication_like WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar publicaciones de usuarios con '+'
DELETE FROM publication WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar contratos de trabajo de usuarios con '+'
DELETE FROM work_contract WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar contratos de usuarios con '+'
DELETE FROM contract WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar pagos de usuarios con '+'
DELETE FROM payment_transaction WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar verificaciones de email de usuarios con '+'
DELETE FROM email_verification WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar galería de usuarios con '+'
DELETE FROM user_gallery WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar educación de usuarios con '+'
DELETE FROM education WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar referencias de usuarios con '+'
DELETE FROM reference WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar experiencia de usuarios con '+'
DELETE FROM experience WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar enlaces sociales de usuarios con '+'
DELETE FROM social_link WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Ahora eliminar los usuarios con '+' en su email
DELETE FROM users WHERE email LIKE '%+%';

-- Ahora proceder con la limpieza normal por fecha (mantener solo datos del 21 de julio)
-- Limpiar tablas de historial y relaciones
DELETE FROM company_history WHERE DATE(created_at) != '2025-07-21';
DELETE FROM attendance WHERE DATE(created_at) != '2025-07-21';

-- Limpiar aplicaciones
DELETE FROM application WHERE DATE(created_at) != '2025-07-21';

-- Limpiar comentarios
DELETE FROM comment WHERE DATE(created_at) != '2025-07-21';

-- Limpiar mensajes
DELETE FROM message WHERE DATE(created_at) != '2025-07-21';

-- Limpiar notificaciones
DELETE FROM notification WHERE DATE(created_at) != '2025-07-21';

-- Limpiar calificaciones
DELETE FROM rating WHERE DATE(created_at) != '2025-07-21';

-- Limpiar likes de publicaciones
DELETE FROM publication_like WHERE DATE(created_at) != '2025-07-21';

-- Limpiar publicaciones (mantener solo las de hoy)
DELETE FROM publication WHERE DATE(created_at) != '2025-07-21';

-- Limpiar contratos de trabajo
DELETE FROM work_contract WHERE DATE(created_at) != '2025-07-21';

-- Limpiar contratos
DELETE FROM contract WHERE DATE(created_at) != '2025-07-21';

-- Limpiar pagos
DELETE FROM payment_transaction WHERE DATE(created_at) != '2025-07-21';

-- Limpiar verificaciones de email
DELETE FROM email_verification WHERE DATE(created_at) != '2025-07-21';

-- Limpiar galería de empresas
DELETE FROM company_gallery WHERE DATE(created_at) != '2025-07-21';

-- Limpiar galería de usuarios
DELETE FROM user_gallery WHERE DATE(created_at) != '2025-07-21';

-- Limpiar educación de usuarios
DELETE FROM education WHERE DATE(created_at) != '2025-07-21';

-- Limpiar referencias de usuarios
DELETE FROM reference WHERE DATE(created_at) != '2025-07-21';

-- Limpiar experiencia de usuarios
DELETE FROM experience WHERE DATE(created_at) != '2025-07-21';

-- Limpiar enlaces sociales de usuarios
DELETE FROM social_link WHERE DATE(created_at) != '2025-07-21';

-- Limpiar usuarios (mantener solo los creados hoy)
DELETE FROM users WHERE DATE(created_at) != '2025-07-21';

-- Limpiar empresas (mantener solo las creadas hoy)
DELETE FROM company WHERE DATE(created_at) != '2025-07-21';

-- Reiniciar secuencias de ID
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE company_id_seq RESTART WITH 1;
ALTER SEQUENCE publication_id_seq RESTART WITH 1;
ALTER SEQUENCE application_id_seq RESTART WITH 1;
ALTER SEQUENCE comment_id_seq RESTART WITH 1;
ALTER SEQUENCE message_id_seq RESTART WITH 1;
ALTER SEQUENCE notification_id_seq RESTART WITH 1;
ALTER SEQUENCE rating_id_seq RESTART WITH 1;
ALTER SEQUENCE publication_like_id_seq RESTART WITH 1;
ALTER SEQUENCE work_contract_id_seq RESTART WITH 1;
ALTER SEQUENCE contract_id_seq RESTART WITH 1;
ALTER SEQUENCE payment_transaction_id_seq RESTART WITH 1;
ALTER SEQUENCE email_verification_id_seq RESTART WITH 1;
ALTER SEQUENCE company_gallery_id_seq RESTART WITH 1;
ALTER SEQUENCE user_gallery_id_seq RESTART WITH 1;
ALTER SEQUENCE education_id_seq RESTART WITH 1;
ALTER SEQUENCE reference_id_seq RESTART WITH 1;
ALTER SEQUENCE experience_id_seq RESTART WITH 1;
ALTER SEQUENCE social_link_id_seq RESTART WITH 1;
ALTER SEQUENCE company_history_id_seq RESTART WITH 1;
ALTER SEQUENCE attendance_id_seq RESTART WITH 1;

-- Reactivar restricciones de clave foránea
SET session_replication_role = DEFAULT;

-- Mostrar estadísticas de limpieza
SELECT 
    'Users' as table_name,
    COUNT(*) as remaining_records
FROM users
UNION ALL
SELECT 
    'Companies' as table_name,
    COUNT(*) as remaining_records
FROM company
UNION ALL
SELECT 
    'Publications' as table_name,
    COUNT(*) as remaining_records
FROM publication
UNION ALL
SELECT 
    'Applications' as table_name,
    COUNT(*) as remaining_records
FROM application
UNION ALL
SELECT 
    'Comments' as table_name,
    COUNT(*) as remaining_records
FROM comment
UNION ALL
SELECT 
    'Messages' as table_name,
    COUNT(*) as remaining_records
FROM message
UNION ALL
SELECT 
    'Ratings' as table_name,
    COUNT(*) as remaining_records
FROM rating
UNION ALL
SELECT 
    'Payment Transactions' as table_name,
    COUNT(*) as remaining_records
FROM payment_transaction
ORDER BY table_name; 