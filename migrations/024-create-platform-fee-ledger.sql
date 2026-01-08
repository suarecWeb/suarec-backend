-- Create platform fee ledger
DO $$
BEGIN
  CREATE TYPE platform_fee_status AS ENUM ('PENDING', 'PAID', 'OVERDUE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS platform_fee_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "providerId" integer NOT NULL,
  "contractId" uuid NOT NULL,
  amount numeric(10, 2) NOT NULL,
  status platform_fee_status NOT NULL DEFAULT 'PENDING',
  due_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT fk_platform_fee_provider FOREIGN KEY ("providerId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_platform_fee_contract FOREIGN KEY ("contractId") REFERENCES contract(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_platform_fee_provider_status
  ON platform_fee_ledger("providerId", status);

CREATE INDEX IF NOT EXISTS idx_platform_fee_contract
  ON platform_fee_ledger("contractId");
