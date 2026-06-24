import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://neondb_owner:npg_KHvsQVDh8E6F@ep-empty-base-actz06qd-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=verify-full'
});

try {
  const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('✅ Tabelas no banco:');
  result.rows.forEach(row => console.log('  • ' + row.table_name));
  
  if (result.rows.some(r => r.table_name === 'discount_coupons')) {
    console.log('\n🎉 Tabela discount_coupons foi criada com sucesso!');
  }
} catch (e) {
  console.error('Erro:', e.message);
} finally {
  await pool.end();
}
