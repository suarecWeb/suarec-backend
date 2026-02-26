require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "suarec",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  ssl: process.env.DB_HOST ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log("🚀 Iniciando migración 035: social-security-docs...");

    const migrationPath = path.join(
      __dirname,
      "migrations",
      "035-create-social-security-docs.sql",
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("📖 Ejecutando migración...");
    await client.query(migrationSQL);

    console.log("✅ Migración completada exitosamente");

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('social_security_documents', 'social_security_doc_idempotency')
      ORDER BY table_name;
    `);

    const indexes = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname IN ('idx_social_security_docs_user_type_current', 'idx_ss_doc_idempotency_unique')
      ORDER BY indexname;
    `);

    console.log("📋 Tablas encontradas:", tables.rows.map((row) => row.table_name));
    console.log("📋 Índices encontrados:", indexes.rows.map((row) => row.indexname));
  } catch (error) {
    console.error("❌ Error durante la migración:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log("\n🎉 Migración 035 aplicada");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Falló migración 035:", error.message);
    process.exit(1);
  });

