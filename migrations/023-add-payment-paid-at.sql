-- Add paid_at timestamp to payment transactions
ALTER TABLE payment_transactions ADD COLUMN paid_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_payments_payee_status_paid_at
  ON payment_transactions("payeeId", status, paid_at);
