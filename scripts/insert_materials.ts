import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_KHvsQVDh8E6F@ep-empty-base-actz06qd-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  // Step 1: Check existing themes
  console.log('=== Existing themes ===');
  const existingThemes = await sql`SELECT id, title FROM material_themes ORDER BY id`;
  console.log(JSON.stringify(existingThemes, null, 2));

  // Step 2: Check material_themes columns
  console.log('\n=== material_themes columns ===');
  const themeColumns = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'material_themes' ORDER BY ordinal_position`;
  console.log(JSON.stringify(themeColumns, null, 2));

  // Step 3: Check material_subcategories columns
  console.log('\n=== material_subcategories columns ===');
  const subColumns = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'material_subcategories' ORDER BY ordinal_position`;
  console.log(JSON.stringify(subColumns, null, 2));

  // Step 4: Check material_files columns
  console.log('\n=== material_files columns ===');
  const fileColumns = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'material_files' ORDER BY ordinal_position`;
  console.log(JSON.stringify(fileColumns, null, 2));
}

main().catch(console.error);
