-- migrations/029-fix-messages-timestamptz-utc.sql
BEGIN;

ALTER TABLE messages
  ALTER COLUMN sent_at TYPE timestamptz USING sent_at AT TIME ZONE 'UTC',
  ALTER COLUMN read_at TYPE timestamptz USING read_at AT TIME ZONE 'UTC';

ALTER TABLE messages
  ALTER COLUMN sent_at SET DEFAULT CURRENT_TIMESTAMP;

COMMIT;
