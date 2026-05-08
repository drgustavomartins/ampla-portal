/**
 * Concede acesso total e vitalício (`acesso_vitalicio`) ao aluno Igor Sampaio.
 *
 * Segue o padrão real da aplicação para o plano `acesso_vitalicio`:
 *   • users.plan_key = 'acesso_vitalicio'
 *   • users.access_expires_at = '2099-12-31T23:59:59.000Z' (mesmo valor usado pelo webhook do Stripe)
 *   • users.module_content_expires_at = mesma data
 *   • flags de acesso completas: approved, materials_access, community_access, support_access
 *   • user_modules: todos os módulos do MODULES_COMPLETO habilitados, sem end_date (NULL = sem expiração)
 *   • user_material_categories: todas as categorias do MATS_COMPLETO habilitadas
 *
 * Notas importantes:
 *   • A coluna na tabela `user_material_categories` no banco de produção é `category_name`
 *     (e não `category_title` como aparece em shared/schema.ts). Esta divergência já existe
 *     no código (ver server/stripe-routes.ts e server/routes.ts linha ~3855). Este script
 *     usa o nome real da coluna do banco para não falhar.
 *   • Idempotente: pode ser executado N vezes; usa ON CONFLICT em ambas as tabelas auxiliares.
 *   • Desambiguação: se houver mais de um aluno com nome "Igor Sampaio", o script aborta
 *     listando os candidatos com email mascarado.
 *
 * Uso:
 *   DATABASE_URL='postgresql://...' npx tsx scripts/grant_lifetime_access_igor_sampaio.ts
 *   # adicione --dry-run para apenas imprimir o estado atual sem alterar o banco
 */

import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL não definida. Abortando.");
  process.exit(1);
}
const sql = neon(DB_URL);

const DRY_RUN = process.argv.includes("--dry-run");

// Constantes copiadas de server/plan-provisioning.ts (MODULES_COMPLETO + MATS_COMPLETO)
const MODULE_BOAS_VINDAS = 6;
const MODULE_TOXINA = 2;
const MODULE_PREENCHEDORES = 3;
const MODULE_BIOESTIMULADORES = 5;
const MODULE_MODULADORES = 7;
const MODULE_NATURALUP = 4;
const MODULES_COMPLETO = [
  MODULE_BOAS_VINDAS,
  MODULE_TOXINA,
  MODULE_PREENCHEDORES,
  MODULE_BIOESTIMULADORES,
  MODULE_MODULADORES,
  MODULE_NATURALUP,
];

const MAT_TOXINA = "Toxina Botulínica";
const MAT_PREENCHEDORES = "Preenchedores Faciais";
const MAT_BIOESTIM = "Bioestimuladores de Colágeno";
const MAT_MODULADORES = "Moduladores de Matriz Extracelular";
const MAT_NATURALUP = "Método NaturalUp®";
const MATS_COMPLETO = [MAT_TOXINA, MAT_PREENCHEDORES, MAT_BIOESTIM, MAT_MODULADORES, MAT_NATURALUP];

// Mesmo valor de "vitalício" usado em server/stripe-routes.ts (webhook do Stripe)
const LIFETIME_EXPIRY = "2099-12-31T23:59:59.000Z";
const LIFETIME_DATE = "2099-12-31"; // para colunas DATE em user_modules

const TARGET_NAME_PATTERN = "%igor%sampaio%";

function maskEmail(email: string): string {
  if (!email) return "";
  return email.replace(/^(.).*?(.?)@(.+)$/, "$1***$2@$3");
}

async function findCandidates() {
  return await sql`
    SELECT id, name, email, role, plan_key, approved, access_expires_at,
           materials_access, community_access, support_access, support_expires_at,
           module_content_expires_at, mentorship_start_date, mentorship_end_date,
           clinical_practice_access, clinical_practice_hours, plan_paid_at, created_at
    FROM users
    WHERE name ILIKE ${TARGET_NAME_PATTERN}
    ORDER BY id
  `;
}

async function main() {
  const candidates = await findCandidates();
  if (candidates.length === 0) {
    console.error('Nenhum aluno encontrado com nome contendo "Igor Sampaio". Abortando.');
    process.exit(2);
  }
  if (candidates.length > 1) {
    console.error(`Múltiplos candidatos (${candidates.length}). Abortando para evitar alteração indevida:`);
    for (const c of candidates) {
      console.error(`  • id=${c.id} name="${c.name}" email=${maskEmail(String(c.email || ""))} role=${c.role} plan_key=${c.plan_key}`);
    }
    process.exit(3);
  }

  const user = candidates[0];
  const userId: number = user.id;
  const emailMasked = maskEmail(String(user.email || ""));

  console.log("=== Aluno encontrado ===");
  console.log(`id=${userId}  name="${user.name}"  email=${emailMasked}`);
  console.log(`role=${user.role}  plan_key=${user.plan_key}  approved=${user.approved}`);
  console.log(`access_expires_at=${user.access_expires_at}`);
  console.log(`module_content_expires_at=${user.module_content_expires_at}`);
  console.log(`materials_access=${user.materials_access}  community_access=${user.community_access}  support_access=${user.support_access}`);

  const beforeModules = await sql`SELECT module_id, enabled, start_date, end_date FROM user_modules WHERE user_id = ${userId} ORDER BY module_id`;
  const beforeMats = await sql`SELECT category_name, enabled FROM user_material_categories WHERE user_id = ${userId} ORDER BY id`;
  console.log(`\nuser_modules ANTES (${beforeModules.length}):`);
  for (const m of beforeModules) console.log(`  module_id=${m.module_id} enabled=${m.enabled} start=${m.start_date} end=${m.end_date}`);
  console.log(`user_material_categories ANTES (${beforeMats.length}):`);
  for (const c of beforeMats) console.log(`  ${c.category_name} enabled=${c.enabled}`);

  if (DRY_RUN) {
    console.log("\n[--dry-run] Nada será alterado.");
    return;
  }

  console.log("\n=== Aplicando acesso vitalício (acesso_vitalicio) ===");

  // 1. users — define plan_key='acesso_vitalicio', acesso vitalício, todas as flags true
  //    Mantém role='student' (não rebaixa admin/super_admin se já forem); mantém plan_paid_at.
  const result = await sql`
    UPDATE users SET
      plan_key = 'acesso_vitalicio',
      role = CASE WHEN role IN ('admin', 'super_admin') THEN role ELSE 'student' END,
      approved = true,
      trial_started_at = NULL,
      access_expires_at = ${LIFETIME_EXPIRY},
      module_content_expires_at = ${LIFETIME_EXPIRY},
      support_expires_at = ${LIFETIME_EXPIRY},
      materials_access = true,
      community_access = true,
      support_access = true,
      plan_paid_at = COALESCE(plan_paid_at, ${new Date().toISOString()})
    WHERE id = ${userId}
    RETURNING id
  `;
  console.log(`users atualizado: ${(result as any).length} linha(s)`);

  // 2. user_modules — habilita TODOS os módulos do MODULES_COMPLETO sem end_date
  //    Idempotente via ON CONFLICT (user_id, module_id).
  for (const moduleId of MODULES_COMPLETO) {
    await sql`
      INSERT INTO user_modules (user_id, module_id, enabled, start_date, end_date)
      VALUES (${userId}, ${moduleId}, true, ${new Date().toISOString().slice(0, 10)}, ${LIFETIME_DATE})
      ON CONFLICT (user_id, module_id) DO UPDATE SET
        enabled = true,
        end_date = ${LIFETIME_DATE}
    `;
  }
  console.log(`user_modules: ${MODULES_COMPLETO.length} módulos habilitados até ${LIFETIME_DATE}`);

  // 3. user_material_categories — habilita TODAS as categorias do MATS_COMPLETO
  //    Idempotente via ON CONFLICT (user_id, category_name) — col real do banco.
  for (const cat of MATS_COMPLETO) {
    await sql`
      INSERT INTO user_material_categories (user_id, category_name, enabled)
      VALUES (${userId}, ${cat}, true)
      ON CONFLICT (user_id, category_name) DO UPDATE SET enabled = true
    `;
  }
  console.log(`user_material_categories: ${MATS_COMPLETO.length} categorias habilitadas`);

  // 4. Audit log — registrar a operação
  const details = JSON.stringify({
    operation: "grant_lifetime_access",
    planKey: "acesso_vitalicio",
    modules: MODULES_COMPLETO.length,
    materials: MATS_COMPLETO.length,
    accessExpiry: LIFETIME_EXPIRY,
    script: "scripts/grant_lifetime_access_igor_sampaio.ts",
  });
  await sql`
    INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name, details, created_at)
    VALUES (0, 'Sistema (script grant_lifetime_access_igor_sampaio)', 'student_provisioned', 'student', ${userId}, ${user.name}, ${details}, ${new Date().toISOString()})
  `;
  console.log("audit_logs: linha registrada");

  // 5. Verificação final
  const after = await sql`SELECT id, plan_key, role, approved, access_expires_at, module_content_expires_at, materials_access, community_access, support_access, support_expires_at FROM users WHERE id = ${userId}`;
  const afterModules = await sql`SELECT module_id, enabled, end_date FROM user_modules WHERE user_id = ${userId} ORDER BY module_id`;
  const afterMats = await sql`SELECT category_name, enabled FROM user_material_categories WHERE user_id = ${userId} ORDER BY id`;
  console.log("\n=== Estado FINAL ===");
  console.log(JSON.stringify(after[0], null, 2));
  console.log(`user_modules: ${afterModules.length}`);
  for (const m of afterModules) console.log(`  module_id=${m.module_id} enabled=${m.enabled} end=${m.end_date}`);
  console.log(`user_material_categories: ${afterMats.length}`);
  for (const c of afterMats) console.log(`  ${c.category_name} enabled=${c.enabled}`);

  console.log("\nOK — Igor Sampaio agora possui acesso total e vitalício à plataforma.");
}

main().catch((e) => {
  console.error("ERRO:", e?.message || e);
  process.exit(1);
});
