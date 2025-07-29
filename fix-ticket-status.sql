-- Script para corregir el status de tickets existentes
-- Cambiar tickets que tienen status "message" pero son tickets iniciales (donde id = ticket_id) a "open"

UPDATE messages 
SET status = 'open' 
WHERE CAST(id AS VARCHAR) = ticket_id 
AND status = 'message' 
AND "recipientId" = 0;

-- Verificar los cambios
SELECT id, content, status, ticket_id, "senderId", "recipientId" 
FROM messages 
WHERE CAST(id AS VARCHAR) = ticket_id 
AND "recipientId" = 0 
ORDER BY sent_at DESC; 