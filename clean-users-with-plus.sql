-- Script para eliminar usuarios con '+' en su email y todo lo relacionado
-- Ejecutar con precaución - HACER BACKUP ANTES

-- Desactivar restricciones de clave foránea temporalmente
SET session_replication_role = replica;

-- Mostrar usuarios que serán eliminados
SELECT 
    'USUARIOS QUE SERÁN ELIMINADOS:' as info,
    COUNT(*)::text as total_users
FROM users WHERE email LIKE '%+%'
UNION ALL
SELECT 
    'Emails con +:' as info,
    email
FROM users WHERE email LIKE '%+%';

-- Eliminar todo lo relacionado con usuarios que tienen '+' en su email

-- Eliminar asistencia de usuarios con '+'
DELETE FROM attendance WHERE "employeeId" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar historial de empresa de usuarios con '+'
DELETE FROM company_history WHERE "userId" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar aplicaciones de usuarios con '+'
DELETE FROM applications WHERE "userId" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar comentarios de usuarios con '+'
DELETE FROM comment WHERE "userId" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar mensajes de usuarios con '+'
DELETE FROM messages WHERE "senderId" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);
DELETE FROM messages WHERE "recipientId" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar notificaciones de usuarios con '+'
DELETE FROM notifications WHERE "userId" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar calificaciones de usuarios con '+'
DELETE FROM ratings WHERE "reviewerId" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);
DELETE FROM ratings WHERE "revieweeId" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar likes de publicaciones de usuarios con '+'
DELETE FROM publication_likes WHERE "userId" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar publicaciones de usuarios con '+'
DELETE FROM publication WHERE "userId" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar contratos de usuarios con '+'
DELETE FROM contract WHERE "clientId" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);
DELETE FROM contract WHERE "providerId" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar pagos de usuarios con '+'
DELETE FROM payment_transactions WHERE "payerId" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);
DELETE FROM payment_transactions WHERE "payeeId" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar verificaciones de email de usuarios con '+'
DELETE FROM email_verifications WHERE "userId" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar galería de usuarios con '+'
DELETE FROM user_gallery WHERE "user_id" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar educación de usuarios con '+'
DELETE FROM education WHERE "user_id" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar referencias de usuarios con '+'
DELETE FROM reference WHERE "user_id" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar experiencia de usuarios con '+'
DELETE FROM experiences WHERE "userId" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Eliminar enlaces sociales de usuarios con '+'
DELETE FROM social_link WHERE "user_id" IN (
    SELECT id FROM users WHERE email LIKE '%+%'
);

-- Finalmente, eliminar los usuarios con '+' en su email
DELETE FROM users WHERE email LIKE '%+%';

-- Reactivar restricciones de clave foránea
SET session_replication_role = DEFAULT;

-- Mostrar estadísticas finales
SELECT 
    'ESTADÍSTICAS FINALES:' as info,
    '' as value
UNION ALL
SELECT 
    'Users' as info,
    COUNT(*)::text as value
FROM users
UNION ALL
SELECT 
    'Companies' as info,
    COUNT(*)::text as value
FROM company
UNION ALL
SELECT 
    'Publications' as info,
    COUNT(*)::text as value
FROM publication
UNION ALL
SELECT 
    'Applications' as info,
    COUNT(*)::text as value
FROM applications
UNION ALL
SELECT 
    'Comments' as info,
    COUNT(*)::text as value
FROM comment
UNION ALL
SELECT 
    'Messages' as info,
    COUNT(*)::text as value
FROM messages
UNION ALL
SELECT 
    'Ratings' as info,
    COUNT(*)::text as value
FROM ratings
UNION ALL
SELECT 
    'Payment Transactions' as info,
    COUNT(*)::text as value
FROM payment_transactions
ORDER BY info; 