import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_KHvsQVDh8E6F@ep-empty-base-actz06qd-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const types = await sql`SELECT DISTINCT type FROM material_files`;
  console.log('Distinct types:', JSON.stringify(types, null, 2));

  // Also check subcategories to understand ordering
  const subs = await sql`SELECT id, theme_id, name, "order" FROM material_subcategories ORDER BY theme_id, "order" LIMIT 10`;
  console.log('\nSample subcategories:', JSON.stringify(subs, null, 2));

  // Check themes order
  const themes = await sql`SELECT id, title, "order" FROM material_themes ORDER BY "order"`;
  console.log('\nThemes with order:', JSON.stringify(themes, null, 2));
}

main().catch(console.error);
