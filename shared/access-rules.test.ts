/**
 * Testes unitários para isLifetimePlan e hasActiveAccess.
 * Executar: npx tsx shared/access-rules.test.ts
 */

import { isLifetimePlan, hasActiveAccess } from "./access-rules";

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

console.log("\nhasActiveAccess:");
const passado = new Date(Date.now() - 86400000).toISOString();
const futuro = new Date(Date.now() + 86400000).toISOString();

assert("planKey null + sem expiração → false", hasActiveAccess({ planKey: null }), false);
assert("planKey null + expiração futura → true (trial ativo)", hasActiveAccess({ planKey: null, accessExpiresAt: futuro }), true);
assert("planKey 'tester' + expiração futura → true", hasActiveAccess({ planKey: "tester", accessExpiresAt: futuro }), true);
assert("planKey 'tester' + expiração passada → false", hasActiveAccess({ planKey: "tester", accessExpiresAt: passado }), false);
assert("planKey 'tester' + sem expiração → false", hasActiveAccess({ planKey: "tester" }), false);
assert("planKey 'vip_completo' + expiração passada (resíduo) → true", hasActiveAccess({ planKey: "vip_completo", accessExpiresAt: passado }), true);
assert("planKey 'vip_completo' + expiração null → true", hasActiveAccess({ planKey: "vip_completo", accessExpiresAt: null }), true);
assert("planKey 'modulo_avulso' + qualquer expiração → true", hasActiveAccess({ planKey: "modulo_avulso", accessExpiresAt: futuro }), true);

console.log(`\nResultado: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
