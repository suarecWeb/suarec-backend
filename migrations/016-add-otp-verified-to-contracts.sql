-- Add otpVerified field to contracts table
ALTER TABLE contract ADD COLUMN otp_verified BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX idx_contract_otp_verified ON contract(otp_verified);

-- Update existing completed contracts to have otpVerified = false
UPDATE contract SET otp_verified = FALSE WHERE status = 'completed';


