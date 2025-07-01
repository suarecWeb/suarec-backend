const { Client } = require('pg');
require('dotenv').config();

async function clearDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    database: process.env.DB_NAME || 'suarec',
    user: 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });

  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conexión exitosa');

    console.log('🧹 Limpiando todas las tablas...');
    
    // Leer el archivo SQL
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, 'clear-database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Ejecutar el script SQL
    await client.query(sql);
    
    console.log('✅ Base de datos limpiada exitosamente');
    console.log('📊 Verificando tablas vacías...');

    // Verificar que las tablas estén vacías
    const result = await client.query(`
      SELECT 
        tablename,
        (SELECT count(*) FROM information_schema.tables t2 WHERE t2.table_schema = t1.schemaname AND t2.table_name = t1.tablename) as row_count
      FROM pg_tables t1 
      WHERE schemaname = current_schema()
      ORDER BY tablename;
    `);

    console.log('\n📋 Estado de las tablas:');
    result.rows.forEach(row => {
      console.log(`  - ${row.tablename}: ${row.row_count} filas`);
    });

  } catch (error) {
    console.error('❌ Error al limpiar la base de datos:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  clearDatabase();
}

module.exports = { clearDatabase }; 