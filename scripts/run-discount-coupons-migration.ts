import { Pool } from "pg";
import fs from "fs";

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 
      "postgresql://neondb_owner:npg_KHvsQVDh8E6F@ep-empty-base-actz06qd-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
  });

  try {
    console.log("🚀 Conectando ao banco de dados...");
    await pool.query("SELECT 1");
    console.log("✅ Conectado!\n");

    const sql = fs.readFileSync("./migrations/migration-discount-coupons.sql", "utf8");
    const statements = sql.split(";").filter(s => s.trim());

    console.log(`Executando ${statements.length} statements...\n`);

    let count = 0;
    for (const stmt of statements) {
      if (stmt.trim()) {
        count++;
        const preview = stmt.substring(0, 50).replace(/\n/g, " ");
        process.stdout.write(`[${count}] ${preview}... `);
        
        try {
          await pool.query(stmt);
          console.log("✅");
        } catch (e: any) {
          if (e.code === "42P07" || e.code === "42P10") {
            console.log("⚠️ (já existe)");
          } else {
            throw e;
          }
        }
      }
    }

    console.log(`\n✅ Migration concluída com sucesso!`);
    console.log("✅ Tabelas criadas:");
    console.log("  • discount_coupons");
    console.log("  • coupon_usage");
    console.log("  • Índices para performance");

  } catch (err: any) {
    console.error("\n❌ Erro:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
