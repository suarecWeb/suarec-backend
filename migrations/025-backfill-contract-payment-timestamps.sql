-- Backfill contract timestamps for historical records
UPDATE contract
SET completed_at = "updatedAt"
WHERE status = 'completed' AND completed_at IS NULL;

UPDATE contract
SET cancelled_at = "updatedAt"
WHERE status = 'cancelled' AND cancelled_at IS NULL;

-- Backfill payment timestamps for historical records
UPDATE payment_transactions
SET paid_at = updated_at
WHERE status IN ('COMPLETED', 'FINISHED') AND paid_at IS NULL;
