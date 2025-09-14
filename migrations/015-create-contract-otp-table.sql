-- Create contract_otp table
CREATE TABLE contract_otp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL,
    code VARCHAR(6) NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES contract(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX idx_contract_otp_contract_id ON contract_otp(contract_id);
CREATE INDEX idx_contract_otp_code ON contract_otp(code);
CREATE INDEX idx_contract_otp_expires_at ON contract_otp(expires_at);

