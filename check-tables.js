require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'suarec',
});

async function checkTables() {
  try {
    await client.connect();
    console.log('Conectado a la base de datos');

    // Verificar todas las tablas
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\nTablas existentes en la base de datos:');
    if (tables.rows.length === 0) {
      console.log('❌ No hay tablas en la base de datos');
    } else {
      tables.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.table_name}`);
      });
    }

    // Verificar específicamente las tablas que necesitamos
    const requiredTables = ['comments', 'publications', 'users', 'companies', 'roles'];
    console.log('\nVerificando tablas requeridas:');
    
    for (const tableName of requiredTables) {
      const exists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName]);
      
      console.log(`${tableName}: ${exists.rows[0].exists ? '✅' : '❌'}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTables(); 