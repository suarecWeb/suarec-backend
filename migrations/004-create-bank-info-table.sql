-- Crear tabla bank_info para almacenar información bancaria de usuarios
CREATE TABLE IF NOT EXISTS bank_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_holder_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(10) NOT NULL CHECK (document_type IN ('CC', 'NIT', 'CE', 'TI', 'PAS')),
    document_number VARCHAR(50) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(10) NOT NULL CHECK (account_type IN ('AHORROS', 'CORRIENTE')),
    account_number VARCHAR(50) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL,
    
    -- Relación con usuarios (uno a uno)
    CONSTRAINT fk_bank_info_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Índice único para garantizar un solo registro bancario por usuario
    CONSTRAINT uk_bank_info_user UNIQUE (user_id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_bank_info_user_id ON bank_info(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_info_document ON bank_info(document_type, document_number);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_bank_info_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bank_info_updated_at
    BEFORE UPDATE ON bank_info
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_info_updated_at();
