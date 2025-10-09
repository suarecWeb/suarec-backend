-- Migration: Add credit_balance and debit_balance fields to users table
-- and create balance_transactions table with separate credit/debit tracking
-- Description: Implements full support for separate balances (credit and debit)
-- in both users and balance_transactions.

-- Add credit_balance and debit_balance columns to users table
ALTER TABLE users 
ADD COLUMN credit_balance DECIMAL(10,2) DEFAULT 0 NOT NULL,
ADD COLUMN debit_balance DECIMAL(10,2) DEFAULT 0 NOT NULL;

-- Add comments to the new columns
COMMENT ON COLUMN users.credit_balance IS 'User account credit balance (saldo a favor por proveer servicios)';
COMMENT ON COLUMN users.debit_balance IS 'User account debit balance (saldo en contra por recibir servicios)';

-- Create indexes on balances for performance
CREATE INDEX idx_users_credit_balance ON users(credit_balance);
CREATE INDEX idx_users_debit_balance ON users(debit_balance);

-- Create balance_transactions table
CREATE TABLE balance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,

    -- Separate balances for tracking
    credit_balance_before DECIMAL(10,2) NOT NULL DEFAULT 0,
    credit_balance_after DECIMAL(10,2) NOT NULL DEFAULT 0,
    debit_balance_before DECIMAL(10,2) NOT NULL DEFAULT 0,
    debit_balance_after DECIMAL(10,2) NOT NULL DEFAULT 0,

    type VARCHAR(50) NOT NULL CHECK (
        type IN (
            'otp_verification_debit', 
            'otp_verification_credit', 
            'payment_completed_credit'
        )
    ),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    description TEXT,
    reference VARCHAR(255),
    contract_id UUID REFERENCES contract(id) ON DELETE SET NULL,
    payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comments to balance_transactions table
COMMENT ON TABLE balance_transactions IS 'Transaction history for user account balance changes with separate credit and debit tracking';
COMMENT ON COLUMN balance_transactions.amount IS 'Transaction amount (positive or negative)';
COMMENT ON COLUMN balance_transactions.credit_balance_before IS 'User credit balance before transaction';
COMMENT ON COLUMN balance_transactions.credit_balance_after IS 'User credit balance after transaction';
COMMENT ON COLUMN balance_transactions.debit_balance_before IS 'User debit balance before transaction';
COMMENT ON COLUMN balance_transactions.debit_balance_after IS 'User debit balance after transaction';
COMMENT ON COLUMN balance_transactions.type IS 'Type of balance transaction';
COMMENT ON COLUMN balance_transactions.reference IS 'Reference to related contract or payment';

-- Create indexes for performance
CREATE INDEX idx_balance_transactions_user_id ON balance_transactions(user_id);
CREATE INDEX idx_balance_transactions_type ON balance_transactions(type);
CREATE INDEX idx_balance_transactions_created_at ON balance_transactions(created_at);
CREATE INDEX idx_balance_transactions_contract_id ON balance_transactions(contract_id);
CREATE INDEX idx_balance_transactions_payment_transaction_id ON balance_transactions(payment_transaction_id);
CREATE INDEX idx_balance_transactions_credit_balance_before ON balance_transactions(credit_balance_before);
CREATE INDEX idx_balance_transactions_credit_balance_after ON balance_transactions(credit_balance_after);
CREATE INDEX idx_balance_transactions_debit_balance_before ON balance_transactions(debit_balance_before);
CREATE INDEX idx_balance_transactions_debit_balance_after ON balance_transactions(debit_balance_after);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_balance_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_balance_transactions_updated_at
    BEFORE UPDATE ON balance_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_balance_transactions_updated_at();
