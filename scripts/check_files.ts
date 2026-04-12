import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_KHvsQVDh8E6F@ep-empty-base-actz06qd-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const files = await sql`SELECT id, name, type, drive_id, youtube_id FROM material_files LIMIT 5`;
  console.log(JSON.stringify(files, null, 2));
}

main().catch(console.error);
