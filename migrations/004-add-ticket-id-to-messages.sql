-- Migration: Add ticket_id column to messages table
-- This will allow us to associate messages with specific tickets

ALTER TABLE messages ADD COLUMN ticket_id VARCHAR(255);

-- Create index for better performance
CREATE INDEX idx_messages_ticket_id ON messages(ticket_id);

-- Update existing messages to have a ticket_id based on their status
-- Messages with status 'open' will get their own ID as ticket_id
UPDATE messages 
SET ticket_id = id 
WHERE status = 'open' AND recipient_id = 0;

-- Messages with status 'message' will get the ticket_id of the most recent 'open' ticket
-- for the same sender before this message
UPDATE messages m1
SET ticket_id = (
    SELECT m2.id 
    FROM messages m2 
    WHERE m2.sender_id = m1.sender_id 
    AND m2.recipient_id = 0 
    AND m2.status = 'open' 
    AND m2.sent_at <= m1.sent_at
    ORDER BY m2.sent_at DESC 
    LIMIT 1
)
WHERE m1.status = 'message' 
AND m1.recipient_id = 0 
AND m1.ticket_id IS NULL;

-- Messages with status 'resolved' or 'closed' will get the ticket_id of the most recent 'open' ticket
-- for the same sender before this message
UPDATE messages m1
SET ticket_id = (
    SELECT m2.id 
    FROM messages m2 
    WHERE m2.sender_id = m1.sender_id 
    AND m2.recipient_id = 0 
    AND m2.status = 'open' 
    AND m2.sent_at <= m1.sent_at
    ORDER BY m2.sent_at DESC 
    LIMIT 1
)
WHERE m1.status IN ('resolved', 'closed') 
AND m1.recipient_id = 0 
AND m1.ticket_id IS NULL; 