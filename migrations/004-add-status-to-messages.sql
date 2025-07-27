-- Migración para agregar campo status a la tabla messages
-- Este campo se usará para manejar el estado de los tickets de soporte

-- Agregar columna status a la tabla messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'open';

-- Crear índice para mejorar el rendimiento de consultas por status
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- Crear índice compuesto para tickets de soporte (recipientId = 0 y status)
CREATE INDEX IF NOT EXISTS idx_support_tickets ON messages("recipientId", status) WHERE "recipientId" = 0;

-- Comentario sobre el uso del campo status
COMMENT ON COLUMN messages.status IS 'Estado del mensaje: open, closed, resolved. Usado principalmente para tickets de soporte.'; 