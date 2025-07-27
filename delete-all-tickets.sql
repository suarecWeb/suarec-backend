-- Script para eliminar todos los tickets de soporte
-- ⚠️ ADVERTENCIA: Este script eliminará TODOS los tickets y sus mensajes asociados
-- Ejecutar solo si estás seguro de que quieres eliminar todos los datos

-- Primero, mostrar cuántos tickets se van a eliminar
SELECT 
    COUNT(*) as total_tickets,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as tickets_abiertos,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as tickets_resueltos,
    COUNT(CASE WHEN status = 'closed' THEN 1 END) as tickets_cerrados
FROM messages 
WHERE recipientId = 0 
AND CAST(id AS VARCHAR) = ticket_id;

-- Mostrar los tickets que se van a eliminar
SELECT 
    id,
    content,
    status,
    sent_at,
    senderId,
    "senderId",
    "recipientId"
FROM messages 
WHERE recipientId = 0 
AND CAST(id AS VARCHAR) = ticket_id
ORDER BY sent_at DESC;

-- Eliminar todos los mensajes asociados a tickets (incluyendo los tickets mismos)
DELETE FROM messages 
WHERE recipientId = 0 
AND ticket_id IS NOT NULL;

-- Eliminar los tickets iniciales (donde id = ticket_id)
DELETE FROM messages 
WHERE recipientId = 0 
AND CAST(id AS VARCHAR) = ticket_id;

-- Verificar que se eliminaron todos los tickets
SELECT 
    COUNT(*) as tickets_restantes
FROM messages 
WHERE recipientId = 0 
AND CAST(id AS VARCHAR) = ticket_id;

-- Mostrar mensajes restantes con Suarec (deberían ser 0)
SELECT 
    COUNT(*) as mensajes_con_suarec_restantes
FROM messages 
WHERE recipientId = 0 OR senderId = 0; 