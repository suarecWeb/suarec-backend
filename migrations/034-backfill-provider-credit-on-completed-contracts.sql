-- Idempotencia fuerte para créditos al proveedor por contrato completado.
CREATE UNIQUE INDEX IF NOT EXISTS idx_balance_tx_contract_user_payment_completed_credit
  ON balance_transactions ("contractId", "userId", type)
  WHERE type = 'payment_completed_credit';

-- Backfill: acredita proveedores para contratos COMPLETED con pago aprobado
-- que aún no tengan movimiento payment_completed_credit.
WITH approved_payment AS (
  SELECT DISTINCT ON (p."contractId")
    p."contractId",
    p.id AS payment_transaction_id
  FROM payment_transactions p
  WHERE
    p.paid_at IS NOT NULL
    OR p.status IN ('COMPLETED', 'FINISHED')
    OR (
      p.wompi_response IS NOT NULL
      AND UPPER(COALESCE((p.wompi_response::json ->> 'status'), '')) IN ('APPROVED', 'FINISHED', 'COMPLETED')
    )
  ORDER BY
    p."contractId",
    COALESCE(p.paid_at, p.updated_at, p.created_at) DESC,
    p.created_at DESC
),
eligible_contracts AS (
  SELECT
    c.id AS contract_id,
    c."providerId" AS provider_id,
    ap.payment_transaction_id,
    COALESCE(c."currentPrice", c."totalPrice", c."initialPrice")::numeric(10,2) AS amount,
    COALESCE(c.completed_at, c."updatedAt", c."createdAt") AS completed_at
  FROM contract c
  JOIN approved_payment ap
    ON ap."contractId" = c.id
  WHERE
    c.status = 'completed'
    AND c.deleted_at IS NULL
    AND COALESCE(c."currentPrice", c."totalPrice", c."initialPrice") IS NOT NULL
    AND COALESCE(c."currentPrice", c."totalPrice", c."initialPrice")::numeric(10,2) > 0
    AND NOT EXISTS (
      SELECT 1
      FROM balance_transactions bt
      WHERE bt."contractId" = c.id
        AND bt."userId" = c."providerId"
        AND bt.type = 'payment_completed_credit'
    )
),
provider_base AS (
  SELECT
    ec.contract_id,
    ec.provider_id,
    ec.payment_transaction_id,
    ec.amount,
    ec.completed_at,
    COALESCE(u.credit_balance, 0)::numeric(10,2) AS provider_credit_balance,
    COALESCE(u.debit_balance, 0)::numeric(10,2) AS provider_debit_balance
  FROM eligible_contracts ec
  JOIN users u
    ON u.id = ec.provider_id
),
ordered_backfill AS (
  SELECT
    pb.*,
    SUM(pb.amount) OVER (
      PARTITION BY pb.provider_id
      ORDER BY pb.completed_at, pb.contract_id
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ) AS previous_amounts
  FROM provider_base pb
),
to_insert AS (
  SELECT
    ob.provider_id,
    ob.contract_id,
    ob.payment_transaction_id,
    ob.amount,
    ob.provider_debit_balance AS debit_before,
    ob.provider_debit_balance AS debit_after,
    (ob.provider_credit_balance + COALESCE(ob.previous_amounts, 0))::numeric(10,2) AS credit_before,
    (ob.provider_credit_balance + COALESCE(ob.previous_amounts, 0) + ob.amount)::numeric(10,2) AS credit_after
  FROM ordered_backfill ob
),
inserted AS (
  INSERT INTO balance_transactions (
    "userId",
    amount,
    "creditBalanceBefore",
    "creditBalanceAfter",
    "debitBalanceBefore",
    "debitBalanceAfter",
    type,
    status,
    description,
    reference,
    "contractId",
    "paymentTransactionId",
    "createdAt",
    "updatedAt"
  )
  SELECT
    ti.provider_id,
    ti.amount,
    ti.credit_before,
    ti.credit_after,
    ti.debit_before,
    ti.debit_after,
    'payment_completed_credit',
    'completed',
    'Crédito por contrato completado - Contrato ' || ti.contract_id,
    'CONTRACT-' || ti.contract_id,
    ti.contract_id,
    ti.payment_transaction_id,
    NOW(),
    NOW()
  FROM to_insert ti
  ON CONFLICT ("contractId", "userId", type)
    WHERE type = 'payment_completed_credit'
  DO NOTHING
  RETURNING "userId", amount
),
totals AS (
  SELECT
    i."userId" AS user_id,
    SUM(i.amount)::numeric(10,2) AS amount_to_add
  FROM inserted i
  GROUP BY i."userId"
)
UPDATE users u
SET credit_balance = COALESCE(u.credit_balance, 0)::numeric(10,2) + t.amount_to_add
FROM totals t
WHERE u.id = t.user_id;
