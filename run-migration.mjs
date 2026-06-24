import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_KHvsQVDh8E6F@ep-empty-base-actz06qd-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=verify-full'
});

const sql = fs.readFileSync('./migrations/migration-discount-coupons.sql', 'utf8');
const stmts = sql.split(';').filter(s => s.trim());

console.log('🚀 Executando ' + stmts.length + ' statements na migration...\n');

let executed = 0;
for (const stmt of stmts) {
  if (stmt.trim()) {
    try {
      await pool.query(stmt);
      executed++;
      console.log('[' + executed + '] ✅ ' + stmt.substring(0, 50).replace(/\n/g, ' '));
    } catch (e) {
      console.log('⚠️ Código: ' + e.code + ' - ' + e.message.substring(0, 40));
    }
  }
}

console.log('\n✅ Migration concluída! ' + executed + ' statements executados com sucesso');
await pool.end();
process.exit(0);
