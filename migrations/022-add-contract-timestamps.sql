-- Add completed_at and cancelled_at timestamps to contracts
ALTER TABLE contract ADD COLUMN completed_at TIMESTAMP NULL;
ALTER TABLE contract ADD COLUMN cancelled_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_contract_provider_completed_at ON contract("providerId", completed_at);
CREATE INDEX IF NOT EXISTS idx_contract_provider_cancelled_at ON contract("providerId", cancelled_at);
