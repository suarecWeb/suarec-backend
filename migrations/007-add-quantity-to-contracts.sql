-- Migración para agregar campo quantity opcional a contratos
-- Esto permite especificar la cantidad de unidades contratadas (horas, días, meses, etc.)

-- Verificar si la columna ya existe antes de crearla
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contract' AND column_name = 'quantity'
    ) THEN
        ALTER TABLE contract ADD COLUMN quantity INTEGER;
    END IF;
END $$;

-- Comentario explicativo
COMMENT ON COLUMN contract.quantity IS 'Cantidad de unidades contratadas (ej: 2 horas, 3 días, 1 mes). NULL para servicios unitarios';

-- Crear índice para mejorar performance en consultas por cantidad
CREATE INDEX IF NOT EXISTS idx_contract_quantity ON contract(quantity);

-- Agregar constraint para validar que la cantidad sea positiva si no es NULL
ALTER TABLE contract ADD CONSTRAINT chk_contract_quantity_positive 
CHECK (quantity IS NULL OR quantity > 0);

-- Comentario adicional para documentación
COMMENT ON TABLE contract IS 'Tabla para almacenar contratos entre usuarios con soporte para cantidades variables';
