/**
 * Testes unitários para isLifetimePlan, hasActiveAccess, isTrialLimited,
 * hasMentoriaAtiva e canAccessMaterials.
 * Executar: npx tsx shared/access-rules.test.ts
 */

import {
  isLifetimePlan,
  hasActiveAccess,
  isTrialLimited,
  hasMentoriaAtiva,
  canAccessMaterials,
} from "./access-rules";

let passed = 0;
let failed = 0;

function assert(desc: string, actual: boolean, expected: boolean) {
  if (actual === expected) {
    passed++;
    console.log(`  ✓ ${desc}`);
  } else {
    failed++;
    console.error(`  ✗ ${desc} — esperado ${expected}, recebeu ${actual}`);
  }
}

console.log("isLifetimePlan:");
assert("null → false", isLifetimePlan(null), false);
assert("undefined → false", isLifetimePlan(undefined), false);
assert("'' → false", isLifetimePlan(""), false);
assert("'tester' → false", isLifetimePlan("tester"), false);
assert("'vip_completo' → true", isLifetimePlan("vip_completo"), true);
assert("'modulo_avulso' → true", isLifetimePlan("modulo_avulso"), true);
assert("'pacote_completo' → true", isLifetimePlan("pacote_completo"), true);
assert("'observador_essencial' → true", isLifetimePlan("observador_essencial"), true);
assert("'imersao' → true", isLifetimePlan("imersao"), true);
assert("'horas_clinicas_1' → true", isLifetimePlan("horas_clinicas_1"), true);
assert("'extensao_acompanhamento' → true", isLifetimePlan("extensao_acompanhamento"), true);

console.log("\nhasActiveAccess (trial vitalício — nav permanente):");
const passado = new Date(Date.now() - 86400000).toISOString();
const futuro = new Date(Date.now() + 86400000).toISOString();

assert("planKey null + sem expiração → true (trial vitalício)", hasActiveAccess({ planKey: null }), true);
assert("planKey null + expiração futura → true", hasActiveAccess({ planKey: null, accessExpiresAt: futuro }), true);
assert("planKey null + expiração passada → false", hasActiveAccess({ planKey: null, accessExpiresAt: passado }), false);
assert("planKey 'tester' + sem expiração → true (trial vitalício)", hasActiveAccess({ planKey: "tester" }), true);
assert("planKey 'tester' + expiração futura → true", hasActiveAccess({ planKey: "tester", accessExpiresAt: futuro }), true);
assert("planKey 'tester' + expiração passada → false", hasActiveAccess({ planKey: "tester", accessExpiresAt: passado }), false);
assert("planKey 'vip_completo' + expiração passada (resíduo) → true", hasActiveAccess({ planKey: "vip_completo", accessExpiresAt: passado }), true);
assert("planKey 'vip_completo' + expiração null → true", hasActiveAccess({ planKey: "vip_completo", accessExpiresAt: null }), true);
assert("planKey 'modulo_avulso' + qualquer expiração → true", hasActiveAccess({ planKey: "modulo_avulso", accessExpiresAt: futuro }), true);

console.log("\nisTrialLimited:");
assert("admin → false", isTrialLimited({ planKey: null, role: "admin" }), false);
assert("super_admin → false", isTrialLimited({ planKey: null, role: "super_admin" }), false);
assert("student vip_completo → false", isTrialLimited({ planKey: "vip_completo", role: "student" }), false);
assert("student acesso_vitalicio → false", isTrialLimited({ planKey: "acesso_vitalicio", role: "student" }), false);
assert("trial sem plano → true", isTrialLimited({ planKey: null, role: "trial" }), true);
assert("trial tester → true", isTrialLimited({ planKey: "tester", role: "trial" }), true);
assert("student sem plano → true (trial vitalício rebaixado)", isTrialLimited({ planKey: null, role: "student" }), true);
assert("student tester → true (trial vitalício rebaixado)", isTrialLimited({ planKey: "tester", role: "student" }), true);

console.log("\nhasMentoriaAtiva:");
assert("admin sem plano → true", hasMentoriaAtiva({ planKey: null, role: "admin" }), true);
assert("super_admin sem plano → true", hasMentoriaAtiva({ planKey: null, role: "super_admin" }), true);
assert("student sem plano → false", hasMentoriaAtiva({ planKey: null, role: "student" }), false);
assert("student 'tester' → false", hasMentoriaAtiva({ planKey: "tester", role: "student" }), false);
assert("trial 'tester' → false", hasMentoriaAtiva({ planKey: "tester", role: "trial" }), false);
assert("student 'modulo_avulso' (vitalício, sem mentoria) → false", hasMentoriaAtiva({ planKey: "modulo_avulso", role: "student" }), false);
assert("student 'pacote_completo' (vitalício, sem mentoria) → false", hasMentoriaAtiva({ planKey: "pacote_completo", role: "student" }), false);
assert("student 'acesso_vitalicio' (vitalício, sem mentoria) → false", hasMentoriaAtiva({ planKey: "acesso_vitalicio", role: "student" }), false);
assert("student 'vip_online' → true", hasMentoriaAtiva({ planKey: "vip_online", role: "student" }), true);
assert("student 'vip_completo' → true", hasMentoriaAtiva({ planKey: "vip_completo", role: "student" }), true);
assert("student 'observador_essencial' → true", hasMentoriaAtiva({ planKey: "observador_essencial", role: "student" }), true);
assert("student 'observador_intensivo' → true", hasMentoriaAtiva({ planKey: "observador_intensivo", role: "student" }), true);
assert("student 'imersao' → true", hasMentoriaAtiva({ planKey: "imersao", role: "student" }), true);
assert("student 'imersao_elite' → true", hasMentoriaAtiva({ planKey: "imersao_elite", role: "student" }), true);
assert("student 'extensao_acompanhamento' → true", hasMentoriaAtiva({ planKey: "extensao_acompanhamento", role: "student" }), true);

console.log("\ncanAccessMaterials:");
assert("admin → true", canAccessMaterials({ planKey: null, role: "admin" }), true);
assert("super_admin → true", canAccessMaterials({ planKey: null, role: "super_admin" }), true);
assert("trial sem plano → false", canAccessMaterials({ planKey: null, role: "trial" }), false);
assert("trial tester → false", canAccessMaterials({ planKey: "tester", role: "trial" }), false);
assert("student rebaixado sem plano → false", canAccessMaterials({ planKey: null, role: "student" }), false);
assert("student vip_completo → true", canAccessMaterials({ planKey: "vip_completo", role: "student" }), true);
assert("student modulo_avulso → true", canAccessMaterials({ planKey: "modulo_avulso", role: "student" }), true);

console.log(`\nResultado: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
