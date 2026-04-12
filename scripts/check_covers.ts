import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_KHvsQVDh8E6F@ep-empty-base-actz06qd-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const themes = await sql`SELECT id, title, cover_url, "order", visible FROM material_themes ORDER BY "order"`;
  console.log(JSON.stringify(themes, null, 2));
}

main().catch(console.error);
