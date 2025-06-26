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

async function runSeed() {
  try {
    console.log('Configuración de conexión:');
    console.log('Host:', process.env.DB_HOST || 'localhost');
    console.log('Port:', process.env.DB_PORT || 5432);
    console.log('User:', process.env.DB_USER || 'postgres');
    console.log('Database:', process.env.DB_NAME || 'suarec');
    
    await client.connect();
    console.log('Conectado a la base de datos');

    const seedPath = path.join(__dirname, 'src', 'seed', 'seed.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');

    console.log('Ejecutando seed...');
    await client.query(seedSQL);
    
    console.log('Seed ejecutado exitosamente');
  } catch (error) {
    console.error('Error ejecutando seed:', error);
  } finally {
    await client.end();
  }
}

runSeed(); 