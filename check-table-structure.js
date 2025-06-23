require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'suarec',
});

async function checkTableStructure() {
  try {
    await client.connect();
    console.log('Conectado a la base de datos');

    // Verificar estructura de role_permission
    console.log('\nEstructura de la tabla role_permission:');
    const rolePermissionColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'role_permission'
      ORDER BY ordinal_position
    `);
    
    if (rolePermissionColumns.rows.length === 0) {
      console.log('❌ La tabla role_permission no existe');
    } else {
      rolePermissionColumns.rows.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type}`);
      });
    }

    // Verificar estructura de comment
    console.log('\nEstructura de la tabla comment:');
    const commentColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'comment'
      ORDER BY ordinal_position
    `);
    
    if (commentColumns.rows.length === 0) {
      console.log('❌ La tabla comment no existe');
    } else {
      commentColumns.rows.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type}`);
      });
    }

    // Verificar estructura de publication
    console.log('\nEstructura de la tabla publication:');
    const publicationColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'publication'
      ORDER BY ordinal_position
    `);
    
    if (publicationColumns.rows.length === 0) {
      console.log('❌ La tabla publication no existe');
    } else {
      publicationColumns.rows.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type}`);
      });
    }

    // Verificar estructura de attendance
    console.log('\nEstructura de la tabla attendance:');
    const attendanceColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'attendance'
      ORDER BY ordinal_position
    `);
    
    if (attendanceColumns.rows.length === 0) {
      console.log('❌ La tabla attendance no existe');
    } else {
      attendanceColumns.rows.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTableStructure(); 