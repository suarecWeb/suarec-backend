const { Pool } = require('pg');

// Configuración de la base de datos
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'suarec_db',
  user: 'postgres',
  password: 'postgres'
});

async function migratePublicationTypes() {
  const client = await pool.connect();
  
  try {
    console.log('Iniciando migración de tipos de publicación...');
    
    // Agregar columna publicationType si no existe
    await client.query(`
      ALTER TABLE publication 
      ADD COLUMN IF NOT EXISTS "publicationType" TEXT NOT NULL DEFAULT 'SERVICE_OFFER'
    `);
    
    console.log('Columna publicationType agregada/verificada');
    
    // Actualizar publicaciones existentes basándose en el rol del usuario
    const result = await client.query(`
      UPDATE publication 
      SET "publicationType" = CASE 
        WHEN u.company_id IS NOT NULL THEN 'COMPANY_JOB_OFFER'
        ELSE 'SERVICE_OFFER'
      END
      FROM users u 
      WHERE publication."userId" = u.id 
      AND publication."publicationType" = 'SERVICE_OFFER'
    `);
    
    console.log(`Migración completada. ${result.rowCount} publicaciones actualizadas.`);
    
    // Mostrar estadísticas
    const stats = await client.query(`
      SELECT "publicationType", COUNT(*) as count 
      FROM publication 
      GROUP BY "publicationType"
    `);
    
    console.log('\nEstadísticas de tipos de publicación:');
    stats.rows.forEach(row => {
      console.log(`- ${row.publicationType}: ${row.count} publicaciones`);
    });
    
  } catch (error) {
    console.error('Error durante la migración:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar migración
migratePublicationTypes()
  .then(() => {
    console.log('Migración completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error en la migración:', error);
    process.exit(1);
  }); 