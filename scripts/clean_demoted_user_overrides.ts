/**
 * Limpa overrides per-user (user_modules / user_material_categories) dos usuários
 * que foram rebaixados para trial vitalício, para garantir que o backend não conceda
 * acesso a módulos ou materiais via tabelas auxiliares.
 *
 * Usuários afetados: todos com role='trial' (após apply_trial_vitalicio_restrictions).
 * Os 12 alunos preservados (KEEP_IDS) e admins ficam intocados.
 */

import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}
const sql = neon(DB_URL);
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const trials = (await sql`SELECT id, name FROM users WHERE role = 'trial' ORDER BY id`) as any[];
  console.log(`Trials a limpar: ${trials.length}`);

  for (const u of trials) {
    const um = (await sql`SELECT COUNT(*)::int AS c FROM user_modules WHERE user_id = ${u.id}`) as any[];
    const umc = (await sql`SELECT COUNT(*)::int AS c FROM user_material_categories WHERE user_id = ${u.id}`) as any[];
    const umCount = um[0]?.c || 0;
    const umcCount = umc[0]?.c || 0;
    if (umCount === 0 && umcCount === 0) continue;
    console.log(`  id=${u.id} ${u.name} — user_modules=${umCount}, user_material_categories=${umcCount}`);
    if (!DRY_RUN) {
      await sql`DELETE FROM user_modules WHERE user_id = ${u.id}`;
      await sql`DELETE FROM user_material_categories WHERE user_id = ${u.id}`;
      console.log(`    → limpo`);
    }
  }

  if (DRY_RUN) {
    console.log("[--dry-run] Nenhuma alteração aplicada.");
  } else {
    console.log("OK — overrides limpos para trials.");
  }
}

main().catch((e) => {
  console.error("ERRO:", e?.message || e);
  process.exit(1);
});
