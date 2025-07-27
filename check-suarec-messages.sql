-- Verificar si existen mensajes con Suarec (ID 0)
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
ORDER BY sent_at DESC;

-- Crear un mensaje de prueba con Suarec si no existe ninguno
INSERT INTO messages (id, content, sender_id, recipient_id, status, ticket_id, sent_at, read, read_at)
SELECT 
    gen_random_uuid(),
    'Bienvenido a Suarec. ¿En qué puedo ayudarte?',
    0,
    108, -- Reemplaza con tu user_id
    'message',
    NULL,
    NOW(),
    false,
    NULL
WHERE NOT EXISTS (
    SELECT 1 FROM messages 
    WHERE (sender_id = 0 AND recipient_id = 108) 
    OR (sender_id = 108 AND recipient_id = 0)
);

-- Verificar el resultado
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
ORDER BY sent_at DESC; 