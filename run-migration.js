require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'suarec',
  password: process.env.DB_PASSWORD || 'suarec123',
  database: process.env.DB_NAME || 'suarec_db',
});

async function runMigration() {
  try {
    console.log('🔧 Ejecutando migración para agregar campo otp_verified...');
    
    await client.connect();
    console.log('✅ Conectado a la base de datos');

    // Verificar si la columna ya existe
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contract' 
      AND column_name = 'otp_verified'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('✅ La columna otp_verified ya existe');
      return;
    }

    // Agregar la columna
    console.log('📝 Agregando columna otp_verified...');
    await client.query(`
      ALTER TABLE contract ADD COLUMN otp_verified BOOLEAN DEFAULT FALSE
    `);
    console.log('✅ Columna otp_verified agregada');

    // Crear índice
    console.log('📊 Creando índice...');
    await client.query(`
      CREATE INDEX idx_contract_otp_verified ON contract(otp_verified)
    `);
    console.log('✅ Índice creado');

    // Actualizar contratos existentes
    console.log('🔄 Actualizando contratos existentes...');
    const updateResult = await client.query(`
      UPDATE contract SET otp_verified = FALSE WHERE status = 'completed'
    `);
    console.log(`✅ ${updateResult.rowCount} contratos actualizados`);

    console.log('🎉 Migración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

runMigration();
