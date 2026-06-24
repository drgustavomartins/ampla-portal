const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_KHvsQVDh8E6F@ep-empty-base-actz06qd-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=verify-full'
});

(async () => {
  const sql = fs.readFileSync('./migrations/migration-discount-coupons.sql', 'utf8');
  const stmts = sql.split(';').filter(s => s.trim());
  
  console.log('Executando ' + stmts.length + ' statements...');
  
  for (const stmt of stmts) {
    if (stmt.trim()) {
      try {
        await pool.query(stmt);
        console.log('✅ ' + stmt.substring(0, 40).replace(/\n/g, ' '));
      } catch (e) {
        console.log('⚠️ ' + e.code);
      }
    }
  }
  
  console.log('\n✅ Migration concluída!');
  process.exit(0);
})();
