-- Social Security docs: metadata + idempotency + versioning by type

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_security_document_type_enum') THEN
    CREATE TYPE social_security_document_type_enum AS ENUM ('eps', 'pension', 'arl', 'aportes');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_security_document_status_enum') THEN
    CREATE TYPE social_security_document_status_enum AS ENUM ('pending_upload', 'pending', 'approved', 'rejected', 'deleted');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS social_security_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type social_security_document_type_enum NOT NULL,
  status social_security_document_status_enum NOT NULL DEFAULT 'pending_upload',
  version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT false,
  bucket TEXT NOT NULL DEFAULT 'suarec-media',
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  size_bytes INTEGER NOT NULL,
  sha256 TEXT NULL,
  review_note TEXT NULL,
  reviewed_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP NULL,
  deleted_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP NULL,
  storage_delete_scheduled_at TIMESTAMP NULL,
  storage_deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- One active version per (user, type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_security_docs_user_type_current
  ON social_security_documents (user_id, document_type)
  WHERE is_current = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_social_security_docs_user_created_at
  ON social_security_documents (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_security_docs_user_type_version
  ON social_security_documents (user_id, document_type, version DESC);

CREATE TABLE IF NOT EXISTS social_security_doc_idempotency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_payload JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ss_doc_idempotency_unique
  ON social_security_doc_idempotency (user_id, scope, idempotency_key);
