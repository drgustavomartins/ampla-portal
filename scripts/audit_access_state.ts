/**
 * Audit script: lê o estado atual de todos os usuários relevantes
 * (admins, students com acesso, trials) e imprime relatório que
 * orientará a regra de rebaixamento.
 *
 * Uso: DATABASE_URL='...' npx tsx scripts/audit_access_state.ts
 */
import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}
const sql = neon(DB_URL);

function mask(email: string): string {
  if (!email) return "";
  return email.replace(/^(.).*?(.?)@(.+)$/, "$1***$2@$3");
}

const KEEP_LIST = [
  "igor sampaio",
  "igor sampaio melo",
  "felipe panzera",
  "carolina",
  "alex monteiro",
  "denise",
  "jasmine",
  "ninive",
  "jessica",
  "jéssica",
  "ravine",
  "ludmila",
  "tabatta",
  "renata",
];

function matchesKeep(name: string): boolean {
  const lower = (name || "").toLowerCase();
  return KEEP_LIST.some((k) => lower.includes(k));
}

async function main() {
  const all = await sql`
    SELECT id, name, email, role, plan_key, approved, access_expires_at,
           trial_started_at, materials_access, community_access, support_access,
           created_at, invite_code
    FROM users
    ORDER BY role DESC, id ASC
  `;

  const admins = all.filter((u: any) => u.role === "admin" || u.role === "super_admin");
  const students = all.filter((u: any) => u.role === "student");
  const trials = all.filter((u: any) => u.role === "trial");
  const others = all.filter((u: any) => !["admin", "super_admin", "student", "trial"].includes(u.role));

  console.log(`\n=== ADMINS / SUPER_ADMINS (${admins.length}) ===`);
  for (const u of admins) {
    console.log(`  id=${u.id} role=${u.role} name="${u.name}" email=${mask(u.email)} planKey=${u.plan_key}`);
  }

  console.log(`\n=== STUDENTS (${students.length}) ===`);
  console.log("Candidatos a PRESERVAR (acesso completo):");
  const keepCandidates = students.filter((u: any) => matchesKeep(u.name));
  for (const u of keepCandidates) {
    console.log(`  ✓ id=${u.id} name="${u.name}" email=${mask(u.email)} planKey=${u.plan_key} expires=${u.access_expires_at}`);
  }

  console.log("\nStudents a REBAIXAR (não estão na keep list):");
  const demoteCandidates = students.filter((u: any) => !matchesKeep(u.name));
  for (const u of demoteCandidates) {
    console.log(`  ↓ id=${u.id} name="${u.name}" email=${mask(u.email)} planKey=${u.plan_key} expires=${u.access_expires_at} invite=${u.invite_code || ""}`);
  }

  console.log(`\n=== TRIALS (${trials.length}) ===`);
  for (const u of trials) {
    console.log(`  id=${u.id} name="${u.name}" email=${mask(u.email)} planKey=${u.plan_key} expires=${u.access_expires_at}`);
  }

  console.log(`\n=== OUTROS (${others.length}) ===`);
  for (const u of others) {
    console.log(`  id=${u.id} role=${u.role} name="${u.name}" email=${mask(u.email)} planKey=${u.plan_key}`);
  }

  console.log("\n=== KEEP-LIST que não tem match ===");
  for (const k of KEEP_LIST) {
    const found = all.find((u: any) => (u.name || "").toLowerCase().includes(k));
    if (!found) {
      console.log(`  ! "${k}" — NENHUM USUÁRIO ENCONTRADO`);
    }
  }

  console.log("\n=== AMBIGUIDADES (keep-list com múltiplos matches) ===");
  for (const k of KEEP_LIST) {
    const found = students.filter((u: any) => (u.name || "").toLowerCase().includes(k));
    if (found.length > 1) {
      console.log(`  ! "${k}" tem ${found.length} students:`);
      for (const u of found) console.log(`      id=${u.id} name="${u.name}" email=${mask(u.email)} planKey=${u.plan_key}`);
    }
  }

  console.log(`\nTotal users=${all.length} | admins=${admins.length} | students=${students.length} | trials=${trials.length}`);
}

main().catch((e) => {
  console.error("ERRO:", e?.message || e);
  process.exit(1);
});
