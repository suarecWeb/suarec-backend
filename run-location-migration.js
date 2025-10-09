const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'suarec',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runLocationMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando migración de campos de ubicación detallada...');
    
    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, 'migrations', '017-add-location-detail-fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📖 Ejecutando migración...');
    await client.query(migrationSQL);
    
    console.log('✅ Migración completada exitosamente');
    console.log('📋 Campos agregados:');
    console.log('   - locationType: Tipo de ubicación (presencial/virtual)');
    console.log('   - serviceLocation: Modalidad del servicio (domicilio/sitio)');
    console.log('   - virtualMeetingLink: Link de videollamada');
    console.log('   - propertyType: Tipo de inmueble');
    console.log('   - references: Referencias de ubicación');
    
    // Verificar que los campos se agregaron
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'publications' 
      AND column_name IN ('locationType', 'serviceLocation', 'virtualMeetingLink', 'propertyType', 'references')
      ORDER BY column_name;
    `);
    
    console.log('\n🔍 Verificación de campos:');
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar la migración
runLocationMigration()
  .then(() => {
    console.log('\n🎉 Migración completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error en la migración:', error);
    process.exit(1);
  });
