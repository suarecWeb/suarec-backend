require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'suarec',
});

async function setupDatabase() {
  try {
    console.log('Configuración de conexión:');
    console.log('Host:', process.env.DB_HOST || 'localhost');
    console.log('Port:', process.env.DB_PORT || 5432);
    console.log('User:', process.env.DB_USER || 'postgres');
    console.log('Database:', process.env.DB_NAME || 'suarec');
    
    await client.connect();
    console.log('Conectado a la base de datos');

    // Verificar si las tablas existen
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('comments', 'publications', 'users')
    `);

    if (tableCheck.rows.length === 0) {
      console.log('Las tablas no existen. Necesitas ejecutar el backend primero para crearlas.');
      console.log('Ejecuta: npm run start:dev');
      console.log('Espera a que el backend se inicie completamente, luego detén el backend (Ctrl+C)');
      console.log('Y finalmente ejecuta: node run-seed.js');
      return;
    }

    console.log('Tablas encontradas:', tableCheck.rows.map(row => row.table_name));

    // Si las tablas existen, ejecutar el seed
    const seedPath = path.join(__dirname, 'src', 'seed', 'seed.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');

    console.log('Ejecutando seed...');
    await client.query(seedSQL);
    
    console.log('Seed ejecutado exitosamente');
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code === '42P01') {
      console.log('\nSolución:');
      console.log('1. Ejecuta el backend: npm run start:dev');
      console.log('2. Espera a que se inicie completamente');
      console.log('3. Detén el backend (Ctrl+C)');
      console.log('4. Ejecuta el seed: node run-seed.js');
    }
  } finally {
    await client.end();
  }
}

setupDatabase(); 