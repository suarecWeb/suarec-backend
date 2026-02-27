-- Create push_tokens and push_send_logs tables

CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform varchar(20) NOT NULL,
  "deviceId" text,
  "appVersion" text,
  "lastSeen" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_push_tokens_token'
  ) THEN
    ALTER TABLE push_tokens
    ADD CONSTRAINT uq_push_tokens_token UNIQUE (token);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens("userId");

CREATE TABLE IF NOT EXISTS push_send_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider text NOT NULL,
  status varchar(20) NOT NULL,
  "errorCode" text,
  "errorMessage" text,
  payload jsonb,
  token text,
  "userId" integer,
  "createdAt" timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_send_logs_user_id ON push_send_logs("userId");
CREATE INDEX IF NOT EXISTS idx_push_send_logs_token ON push_send_logs(token);
