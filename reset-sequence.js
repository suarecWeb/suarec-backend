require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'suarec',
});

async function resetSequences() {
  try {
    await client.connect();
    console.log('Conectado a la base de datos');

    // Resetear secuencia de users (el último ID usado en el seed fue 9)
    await client.query(`
      SELECT setval('users_id_seq', (SELECT MAX(id) FROM users), true);
    `);
    console.log('✅ Secuencia de users reseteada');

    // Resetear secuencia de roles (el último ID usado en el seed fue 3)
    await client.query(`
      SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles), true);
    `);
    console.log('✅ Secuencia de roles reseteada');

    // Resetear secuencia de permissions (el último ID usado en el seed fue 14)
    await client.query(`
      SELECT setval('permissions_id_seq', (SELECT MAX(id) FROM permissions), true);
    `);
    console.log('✅ Secuencia de permissions reseteada');

    // Verificar las secuencias actuales
    console.log('\n📊 Estado actual de las secuencias:');
    
    const usersSeq = await client.query(`SELECT last_value FROM users_id_seq`);
    console.log(`- users_id_seq: ${usersSeq.rows[0].last_value}`);
    
    const rolesSeq = await client.query(`SELECT last_value FROM roles_id_seq`);
    console.log(`- roles_id_seq: ${rolesSeq.rows[0].last_value}`);
    
    const permissionsSeq = await client.query(`SELECT last_value FROM permissions_id_seq`);
    console.log(`- permissions_id_seq: ${permissionsSeq.rows[0].last_value}`);

    console.log('\n🎉 Secuencias reseteadas correctamente. Ahora puedes registrar nuevos usuarios sin conflictos.');

  } catch (error) {
    console.error('Error reseteando secuencias:', error.message);
  } finally {
    await client.end();
  }
}

resetSequences(); 