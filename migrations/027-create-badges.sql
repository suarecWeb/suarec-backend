-- Create badges and user_badges tables
DO $$
BEGIN
  CREATE TYPE badge_type AS ENUM ('LEVEL', 'ACHIEVEMENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  type badge_type NOT NULL DEFAULT 'LEVEL',
  level_required VARCHAR(50) NULL,
  description TEXT NULL,
  icon TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" integer NOT NULL,
  "badgeId" uuid NOT NULL,
  awarded_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_badges_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_badges_badge FOREIGN KEY ("badgeId") REFERENCES badges(id) ON DELETE CASCADE,
  CONSTRAINT uq_user_badges_user_badge UNIQUE ("userId", "badgeId")
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id
  ON user_badges("userId");

CREATE INDEX IF NOT EXISTS idx_badges_key
  ON badges(key);

INSERT INTO badges (key, name, type, level_required)
VALUES
  ('LEVEL_ACTIVO', 'Usuario Activo', 'LEVEL', 'Activo'),
  ('LEVEL_PROFESIONAL', 'Profesional', 'LEVEL', 'Profesional'),
  ('LEVEL_ELITE', 'Elite SUAREC', 'LEVEL', 'Elite')
ON CONFLICT (key) DO NOTHING;
