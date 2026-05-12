/**
 * Aplica as regras finais de acesso confirmadas pelo usuário:
 *   • Mantém intactos admins e super_admins.
 *   • Mantém com acesso completo apenas 12 alunos da KEEP_LIST (identificados por ID).
 *   • Rebaixa todos os outros students com acesso completo para "trial vitalício":
 *       role='trial', plan_key=NULL, access_expires_at=NULL,
 *       materials_access=false, invite_code=NULL.
 *   • Para trials já existentes com expiração, define access_expires_at=NULL
 *     (trial vitalício para navegação; conteúdo continua gated pelas regras de aulas).
 *   • Os 12 preservados:
 *        id=8  Dr. Felipe Panzera           (vip_completo)
 *        id=11 Dr. Igor Sampaio Melo        (acesso_vitalicio)
 *        id=12 Dra. Carolina ...            (vip_completo)
 *        id=21 Dr. Alex Monteiro            (vip_completo)
 *        id=37 Dra. Ravine Griep            (acesso_vitalicio)
 *        id=40 Dra. Ludmila Vendramin       (acesso_vitalicio)
 *        id=41 Dra. Tabatta Alves           (acesso_vitalicio)
 *        id=42 Dra. Renata Ramos            (acesso_vitalicio)
 *        id=49 Dra. Denise do Amaral Martins(vip_completo)
 *        id=52 Dra. Jasmine Faria           (vip_completo)
 *        id=53 Dra. Ninive Dantas de Paula  (vip_completo)
 *        id=54 Jessica Vieira Correa Barreto(vip_completo)
 *
 * Uso:
 *   DATABASE_URL='postgresql://...' npx tsx scripts/apply_trial_vitalicio_restrictions.ts          # aplica
 *   DATABASE_URL='postgresql://...' npx tsx scripts/apply_trial_vitalicio_restrictions.ts --dry-run # apenas mostra
 */

import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}
const sql = neon(DB_URL);
const DRY_RUN = process.argv.includes("--dry-run");

// IDs dos 12 alunos a PRESERVAR com acesso completo.
// Lista identificada via scripts/audit_access_state.ts (12/05/2026).
const KEEP_IDS = new Set([8, 11, 12, 21, 37, 40, 41, 42, 49, 52, 53, 54]);

function mask(email: string): string {
  if (!email) return "";
  return email.replace(/^(.).*?(.?)@(.+)$/, "$1***$2@$3");
}

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  plan_key: string | null;
  access_expires_at: string | null;
  invite_code: string | null;
  materials_access: boolean | null;
};

async function main() {
  const now = new Date().toISOString();

  // 1. Snapshot inicial — TODOS os usuários (para auditoria)
  const allRows = (await sql`
    SELECT id, name, email, role, plan_key, access_expires_at, invite_code, materials_access
    FROM users
    ORDER BY id
  `) as unknown as UserRow[];

  const admins = allRows.filter((u) => u.role === "admin" || u.role === "super_admin");
  const students = allRows.filter((u) => u.role === "student");
  const trials = allRows.filter((u) => u.role === "trial");

  // 2. Identificar quem mantém acesso (KEEP_IDS) e quem rebaixar.
  const studentsToKeep = students.filter((u) => KEEP_IDS.has(u.id));
  const studentsToDemote = students.filter((u) => !KEEP_IDS.has(u.id));
  const trialsToVitalicio = trials.filter((u) => u.access_expires_at !== null);

  console.log("=== SNAPSHOT INICIAL ===");
  console.log(`Total users: ${allRows.length}`);
  console.log(`  admins/super_admins (intocados): ${admins.length}`);
  console.log(`  students (total): ${students.length}`);
  console.log(`    → preservar: ${studentsToKeep.length}`);
  console.log(`    → rebaixar para trial vitalício: ${studentsToDemote.length}`);
  console.log(`  trials (total): ${trials.length}`);
  console.log(`    → tornar vitalícios (access_expires_at=NULL): ${trialsToVitalicio.length}`);

  // 3. Validar KEEP_IDS — todos existem e são students?
  console.log("\n=== VALIDAÇÃO DA KEEP_LIST ===");
  let keepInvalid = 0;
  for (const id of KEEP_IDS) {
    const u = allRows.find((r) => r.id === id);
    if (!u) {
      console.error(`  ✗ id=${id} NÃO ENCONTRADO no banco — abortando`);
      keepInvalid++;
    } else if (u.role !== "student") {
      console.error(`  ✗ id=${id} role=${u.role} (esperado 'student') — abortando`);
      keepInvalid++;
    } else {
      console.log(`  ✓ id=${id} role=${u.role} name="${u.name}" planKey=${u.plan_key}`);
    }
  }
  if (keepInvalid > 0) {
    console.error(`\n${keepInvalid} entrada(s) inválida(s) na KEEP_LIST — abortando para evitar erro.`);
    process.exit(2);
  }

  console.log("\n=== ALUNOS A REBAIXAR ===");
  for (const u of studentsToDemote) {
    console.log(
      `  ↓ id=${u.id} name="${u.name}" email=${mask(u.email)} planKey=${u.plan_key} expires=${u.access_expires_at} invite=${u.invite_code || ""}`,
    );
  }

  console.log("\n=== TRIALS A TORNAR VITALÍCIOS (access_expires_at=NULL) ===");
  for (const u of trialsToVitalicio) {
    console.log(
      `  · id=${u.id} name="${u.name}" email=${mask(u.email)} planKey=${u.plan_key} expires=${u.access_expires_at}`,
    );
  }

  if (DRY_RUN) {
    console.log("\n[--dry-run] Nenhuma alteração aplicada.");
    return;
  }

  console.log("\n=== APLICANDO ALTERAÇÕES ===");

  // 4. Rebaixar students fora da KEEP_LIST.
  for (const u of studentsToDemote) {
    await sql`
      UPDATE users SET
        role = 'trial',
        plan_key = NULL,
        access_expires_at = NULL,
        materials_access = false,
        invite_code = NULL,
        trial_started_at = COALESCE(trial_started_at, ${now})
      WHERE id = ${u.id}
    `;
    // Registrar evento (best-effort)
    await sql`
      INSERT INTO lead_events (user_id, event_type, event_description, metadata, created_at)
      VALUES (${u.id}, 'trial_inicio',
              ${'Rebaixado para Trial vitalício (regra de acesso 12/05/2026)'},
              ${JSON.stringify({ previousRole: u.role, previousPlanKey: u.plan_key, previousExpires: u.access_expires_at, previousInvite: u.invite_code, script: "apply_trial_vitalicio_restrictions" })},
              ${now})
    `.catch(() => {});
    await sql`
      INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name, details, created_at)
      VALUES (0, 'Sistema (script apply_trial_vitalicio_restrictions)',
              'student_demoted_to_trial', 'student', ${u.id}, ${u.name},
              ${JSON.stringify({ previousRole: u.role, previousPlanKey: u.plan_key, previousExpires: u.access_expires_at, previousInvite: u.invite_code })},
              ${now})
    `.catch(() => {});
    console.log(`  rebaixado: id=${u.id} ${u.name}`);
  }

  // 5. Trials com expiração → vitalício. Também limpa plan_key=workshop e invite_code
  //    para garantir que o backend não conceda acessAll por causa do invite expirado.
  for (const u of trialsToVitalicio) {
    await sql`
      UPDATE users SET
        access_expires_at = NULL,
        plan_key = NULL,
        invite_code = NULL,
        materials_access = false
      WHERE id = ${u.id}
    `;
    await sql`
      INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name, details, created_at)
      VALUES (0, 'Sistema (script apply_trial_vitalicio_restrictions)',
              'trial_made_lifetime', 'student', ${u.id}, ${u.name},
              ${JSON.stringify({ previousExpires: u.access_expires_at, previousPlanKey: u.plan_key, previousInvite: u.invite_code })},
              ${now})
    `.catch(() => {});
    console.log(`  trial vitalício: id=${u.id} ${u.name}`);
  }

  // 6. Verificação final
  const afterRows = (await sql`
    SELECT id, name, email, role, plan_key, access_expires_at, invite_code, materials_access
    FROM users
    ORDER BY role DESC, id ASC
  `) as unknown as UserRow[];

  const afterAdmins = afterRows.filter((u) => u.role === "admin" || u.role === "super_admin");
  const afterStudents = afterRows.filter((u) => u.role === "student");
  const afterTrials = afterRows.filter((u) => u.role === "trial");

  console.log("\n=== ESTADO FINAL ===");
  console.log(`  admins/super_admins: ${afterAdmins.length}`);
  console.log(`  students (acesso completo): ${afterStudents.length}`);
  for (const u of afterStudents) {
    console.log(`    ✓ id=${u.id} name="${u.name}" planKey=${u.plan_key} expires=${u.access_expires_at}`);
  }
  console.log(`  trials (vitalícios): ${afterTrials.length}`);
  for (const u of afterTrials) {
    const flag = u.access_expires_at === null ? "VITALÍCIO" : `expires=${u.access_expires_at}`;
    console.log(`    · id=${u.id} name="${u.name}" planKey=${u.plan_key} ${flag} materials=${u.materials_access}`);
  }

  console.log("\nOK — regras de acesso aplicadas.");
}

main().catch((e) => {
  console.error("ERRO:", e?.message || e);
  process.exit(1);
});
