/**
 * Testes unitários para o modelo unificado de acesso.
 * Executar: npx tsx shared/access-rules.test.ts
 */

import {
  isLifetimePlan,
  hasActiveAccess,
  isTrialLimited,
  isTrialLifetime,
  isModuleAccess,
  hasFullAccess,
  hasModuleAccess,
  canWatchLesson,
  allowedModuleIds,
  hasMentoriaAtiva,
  canAccessLiveRecordings,
  canAccessMaterials,
  getAccessType,
  TRIAL_FREE_LESSONS_PER_MODULE,
  type AccessType,
} from "./access-rules";

let passed = 0;
let failed = 0;

function assert(desc: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log(`  ✓ ${desc}`);
  } else {
    failed++;
    console.error(`  ✗ ${desc} — esperado ${JSON.stringify(expected)}, recebeu ${JSON.stringify(actual)}`);
  }
}

// ─── getAccessType ─────────────────────────────────────────────────────────
console.log("getAccessType (fonte única):");
assert("null → trial", getAccessType(null), "trial" as AccessType);
assert("admin → admin", getAccessType({ role: "admin" }), "admin");
assert("super_admin → admin", getAccessType({ role: "super_admin" }), "admin");
assert("vip_completo → full", getAccessType({ role: "student", planKey: "vip_completo" }), "full");
assert("acesso_vitalicio → full", getAccessType({ role: "student", planKey: "acesso_vitalicio" }), "full");
assert("imersao → full", getAccessType({ role: "student", planKey: "imersao" }), "full");
assert("observador_essencial → full", getAccessType({ role: "student", planKey: "observador_essencial" }), "full");
assert("modulo_avulso → module", getAccessType({ role: "student", planKey: "modulo_avulso" }), "module");
assert("modulo_pratica → module", getAccessType({ role: "student", planKey: "modulo_pratica" }), "module");
assert("student + user_modules sem plano → module", getAccessType({ role: "student", planKey: null, moduleIds: [2, 6] }), "module");
assert("trial null → trial", getAccessType({ role: "trial", planKey: null }), "trial");
assert("trial tester → trial", getAccessType({ role: "trial", planKey: "tester" }), "trial");
assert("student null sem user_modules → trial", getAccessType({ role: "student", planKey: null }), "trial");

// ─── Casos específicos solicitados ──────────────────────────────────────────
console.log("\nCasos específicos (Ioanna / Alex / Douglas / Nathália):");
const ioanna = { role: "student", planKey: "vip_completo", moduleIds: [2, 3, 4, 5, 6, 7] };
const alex = { role: "trial", planKey: null };
const douglas = { role: "trial", planKey: null };
const nathalia = { role: "trial", planKey: null };
assert("Ioanna → full", getAccessType(ioanna), "full");
assert("Ioanna canAccessMaterials → true", canAccessMaterials(ioanna), true);
assert("Ioanna hasMentoriaAtiva → true", hasMentoriaAtiva(ioanna), true);
assert("Ioanna hasModuleAccess(2) → true", hasModuleAccess(ioanna, 2), true);
assert("Alex → trial", getAccessType(alex), "trial");
assert("Alex canAccessMaterials → false", canAccessMaterials(alex), false);
assert("Alex hasMentoriaAtiva → false", hasMentoriaAtiva(alex), false);
assert("Alex canWatchLesson(2, 0) → true (1ª aula)", canWatchLesson(alex, 2, 0), true);
assert("Alex canWatchLesson(2, 1) → true (2ª aula)", canWatchLesson(alex, 2, 1), true);
assert("Alex canWatchLesson(2, 2) → false (3ª aula)", canWatchLesson(alex, 2, 2), false);
assert("Douglas → trial", getAccessType(douglas), "trial");
assert("Nathalia → trial", getAccessType(nathalia), "trial");

// ─── hasFullAccess / isTrialLifetime / isModuleAccess ──────────────────────
console.log("\nPredicados de tipo:");
assert("admin → hasFullAccess", hasFullAccess({ role: "admin" }), true);
assert("vip_completo → hasFullAccess", hasFullAccess({ planKey: "vip_completo" }), true);
assert("modulo_avulso → !hasFullAccess", hasFullAccess({ planKey: "modulo_avulso" }), false);
assert("trial null → !hasFullAccess", hasFullAccess({ planKey: null }), false);
assert("trial null → isTrialLifetime", isTrialLifetime({ planKey: null }), true);
assert("modulo_pratica → isModuleAccess", isModuleAccess({ planKey: "modulo_pratica" }), true);

// ─── hasModuleAccess / canWatchLesson ─────────────────────────────────────
console.log("\nAcesso por módulo:");
const moduloToxina = { role: "student", planKey: "modulo_pratica", selectedTheme: "toxina" };
assert("modulo_pratica+toxina libera mod 2", hasModuleAccess(moduloToxina, 2), true);
assert("modulo_pratica+toxina libera mod 6 (Boas Vindas)", hasModuleAccess(moduloToxina, 6), true);
assert("modulo_pratica+toxina NÃO libera mod 3 (Preenchedores)", hasModuleAccess(moduloToxina, 3), false);
assert("modulo_pratica+toxina canWatchLesson(2, 5) → true", canWatchLesson(moduloToxina, 2, 5), true);
assert("modulo_pratica+toxina canWatchLesson(3, 0) → true (preview)", canWatchLesson(moduloToxina, 3, 0), true);
assert("modulo_pratica+toxina canWatchLesson(3, 5) → false", canWatchLesson(moduloToxina, 3, 5), false);

const moduloCustom = { role: "student", planKey: "modulo_avulso", moduleIds: [3] };
assert("modulo_avulso com user_modules [3] hasModuleAccess(3)", hasModuleAccess(moduloCustom, 3), true);
assert("modulo_avulso com user_modules [3] !hasModuleAccess(2)", hasModuleAccess(moduloCustom, 2), false);

assert("allowedModuleIds full → null", allowedModuleIds({ planKey: "vip_completo" }), null);
assert("allowedModuleIds trial → []", allowedModuleIds({ planKey: null }), []);
assert("allowedModuleIds modulo_pratica+toxina → [6,2]", allowedModuleIds(moduloToxina), [6, 2]);

// ─── isLifetimePlan (compat legado) ────────────────────────────────────────
console.log("\nisLifetimePlan (compat):");
assert("null → false", isLifetimePlan(null), false);
assert("'tester' → false", isLifetimePlan("tester"), false);
assert("'vip_completo' → true", isLifetimePlan("vip_completo"), true);
assert("'modulo_avulso' → true", isLifetimePlan("modulo_avulso"), true);
assert("'horas_clinicas_1' → true", isLifetimePlan("horas_clinicas_1"), true);
assert("'observacao_extra_2' → true", isLifetimePlan("observacao_extra_2"), true);
assert("'observador_essencial' → true", isLifetimePlan("observador_essencial"), true);

// ─── hasActiveAccess (compat legado) ───────────────────────────────────────
console.log("\nhasActiveAccess (compat):");
const passado = new Date(Date.now() - 86400000).toISOString();
const futuro = new Date(Date.now() + 86400000).toISOString();
assert("trial sem expiração → true", hasActiveAccess({ planKey: null }), true);
assert("trial expirado → false", hasActiveAccess({ planKey: null, accessExpiresAt: passado }), false);
assert("vip_completo + expiração passada → true (vitalício)", hasActiveAccess({ planKey: "vip_completo", accessExpiresAt: passado }), true);
assert("modulo_avulso + futuro → true", hasActiveAccess({ planKey: "modulo_avulso", accessExpiresAt: futuro }), true);
assert("admin → true", hasActiveAccess({ role: "admin", planKey: null }), true);

// ─── isTrialLimited (compat) ───────────────────────────────────────────────
console.log("\nisTrialLimited (compat — alias de isTrialLifetime):");
assert("admin → false", isTrialLimited({ planKey: null, role: "admin" }), false);
assert("vip_completo → false", isTrialLimited({ planKey: "vip_completo", role: "student" }), false);
assert("trial null → true", isTrialLimited({ planKey: null, role: "trial" }), true);
assert("student rebaixado sem plano → true", isTrialLimited({ planKey: null, role: "student" }), true);
assert("modulo_pratica → false", isTrialLimited({ planKey: "modulo_pratica", role: "student" }), false);

// ─── hasMentoriaAtiva ──────────────────────────────────────────────────────
console.log("\nhasMentoriaAtiva:");
assert("admin → true", hasMentoriaAtiva({ planKey: null, role: "admin" }), true);
assert("vip_completo → true", hasMentoriaAtiva({ planKey: "vip_completo", role: "student" }), true);
assert("imersao_elite → true", hasMentoriaAtiva({ planKey: "imersao_elite", role: "student" }), true);
assert("pacote_completo → false (não tem mentoria)", hasMentoriaAtiva({ planKey: "pacote_completo", role: "student" }), false);
assert("modulo_avulso → false", hasMentoriaAtiva({ planKey: "modulo_avulso", role: "student" }), false);
assert("trial → false", hasMentoriaAtiva({ planKey: null, role: "trial" }), false);
assert("canAccessLiveRecordings = hasMentoriaAtiva", canAccessLiveRecordings({ planKey: "vip_completo" }), true);

// ─── canAccessMaterials ────────────────────────────────────────────────────
console.log("\ncanAccessMaterials:");
assert("admin → true", canAccessMaterials({ role: "admin", planKey: null }), true);
assert("vip_completo → true", canAccessMaterials({ planKey: "vip_completo", role: "student" }), true);
assert("trial → false", canAccessMaterials({ planKey: null, role: "trial" }), false);
assert("student rebaixado → false", canAccessMaterials({ planKey: null, role: "student" }), false);
assert("modulo_avulso → false (acesso só ao módulo, sem materiais)", canAccessMaterials({ planKey: "modulo_avulso", role: "student" }), false);

// ─── TRIAL_FREE_LESSONS_PER_MODULE ─────────────────────────────────────────
console.log("\nConstantes:");
assert("TRIAL_FREE_LESSONS_PER_MODULE = 2", TRIAL_FREE_LESSONS_PER_MODULE, 2);

console.log(`\nResultado: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
