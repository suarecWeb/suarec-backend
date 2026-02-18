-- Contract status: add in_progress
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'contract_status_enum'
      AND e.enumlabel = 'in_progress'
  ) THEN
    ALTER TYPE contract_status_enum ADD VALUE 'in_progress';
  END IF;
END $$;

-- Contract: OTP verification timestamp
ALTER TABLE contract
  ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_contract_otp_verified_at
  ON contract (otp_verified_at);

-- OTP table hardening: store hash + attempts and stop storing plain codes
ALTER TABLE contract_otp
  ALTER COLUMN code DROP NOT NULL;

ALTER TABLE contract_otp
  ADD COLUMN IF NOT EXISTS "codeHash" TEXT NULL;

ALTER TABLE contract_otp
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE contract_otp
  ADD COLUMN IF NOT EXISTS "maxAttempts" INTEGER NOT NULL DEFAULT 5;

ALTER TABLE contract_otp
  ADD COLUMN IF NOT EXISTS "otpLength" INTEGER NOT NULL DEFAULT 4;

CREATE INDEX IF NOT EXISTS idx_contract_otp_active
  ON contract_otp ("contractId", "isUsed", "expiresAt");
