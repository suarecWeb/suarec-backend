const { Pool } = require('pg');
require('dotenv').config();

// Configuración de la base de datos PostgreSQL usando las mismas variables de entorno
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function updateContractTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Actualizando tabla de contratos...');
    console.log('📊 Conectando a:', process.env.DB_HOST, 'Puerto:', process.env.DB_PORT, 'DB:', process.env.DB_NAME);
    
    // Verificar si las columnas ya existen
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contract' 
      AND column_name IN ('providerMessage', 'requestedDate', 'requestedTime', 'agreedDate', 'agreedTime')
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    console.log('Columnas existentes:', existingColumns);
    
    // Agregar columnas que no existen
    const columnsToAdd = [
      {
        name: 'providerMessage',
        type: 'TEXT',
        nullable: 'NULL'
      },
      {
        name: 'requestedDate',
        type: 'TIMESTAMP',
        nullable: 'NULL'
      },
      {
        name: 'requestedTime',
        type: 'VARCHAR(10)',
        nullable: 'NULL'
      },
      {
        name: 'agreedDate',
        type: 'TIMESTAMP',
        nullable: 'NULL'
      },
      {
        name: 'agreedTime',
        type: 'VARCHAR(10)',
        nullable: 'NULL'
      }
    ];
    
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        console.log(`➕ Agregando columna: ${column.name}`);
        await client.query(`
          ALTER TABLE contract 
          ADD COLUMN "${column.name}" ${column.type} ${column.nullable}
        `);
        console.log(`✅ Columna ${column.name} agregada exitosamente`);
      } else {
        console.log(`ℹ️  Columna ${column.name} ya existe`);
      }
    }
    
    console.log('🎉 Actualización de tabla completada exitosamente');
    
    // Mostrar la estructura final de la tabla
    const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'contract'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estructura final de la tabla contract:');
    tableStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
  } catch (error) {
    console.error('❌ Error actualizando la tabla:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await updateContractTable();
    console.log('✅ Script ejecutado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en el script:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar el script
if (require.main === module) {
  main();
}

module.exports = { updateContractTable }; 