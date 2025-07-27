-- Verificar conversaciones duplicadas con Suarec
SELECT 
    sender_id,
    recipient_id,
    COUNT(*) as message_count,
    MIN(sent_at) as first_message,
    MAX(sent_at) as last_message
FROM messages 
WHERE sender_id = 0 OR recipient_id = 0
GROUP BY sender_id, recipient_id
ORDER BY last_message DESC;

-- Verificar si hay usuarios con ID 0 en la tabla users (no debería haber)
SELECT * FROM users WHERE id = 0;

-- Verificar mensajes específicos con Suarec
SELECT 
    id,
    content,
    sender_id,
    recipient_id,
    status,
    ticket_id,
    sent_at
FROM messages 
WHERE sender_id = 0 OR recipient_id = 0
ORDER BY sent_at DESC
LIMIT 10; 