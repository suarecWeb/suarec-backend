-- Migration: convert message timestamps to timestamptz (America/Bogota)
-- NOTE: This assumes existing data is stored in Bogota local time.

ALTER TABLE messages
  ALTER COLUMN sent_at TYPE timestamptz USING sent_at AT TIME ZONE 'America/Bogota',
  ALTER COLUMN read_at TYPE timestamptz USING read_at AT TIME ZONE 'America/Bogota';

ALTER TABLE messages
  ALTER COLUMN sent_at SET DEFAULT CURRENT_TIMESTAMP;
