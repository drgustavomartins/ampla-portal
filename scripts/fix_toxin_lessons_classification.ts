/**
 * Garante que as duas aulas de Toxina Botulínica abaixo permaneçam classificadas
 * como `theoretical` e nunca apareçam como "Casos Clínicos e Prática" /
 * "Procedimentos" / outros agregadores que filtram por content_type.
 *
 *   • id=25  "Toxina botulínica  em depressor do septo nasal e sorriso gengival"
 *   • id=28  "Toxina botulínica em Masseter e Temporal"
 *
 * Contexto:
 *   No portal /module/3 (Preenchedores) essas aulas apareciam em "Relacionados",
 *   logo abaixo do divider "━━ CASOS CLÍNICOS E PRÁTICA ━━", dando a
 *   impressão de que eram aulas práticas. Elas são técnicas teóricas
 *   (apresentação dos pontos, doses e indicações) — não são procedimento ao
 *   vivo, demonstração nem caso clínico. Devem permanecer no módulo 2
 *   (Toxina Botulínica) com content_type='theoretical'.
 *
 *   Por que precisamos travar isso aqui:
 *   server/routes.ts (PUT /api/admin/lessons/:id) re-classifica
 *   automaticamente aulas `theoretical` quando o admin edita título/descrição
 *   sem fornecer contentType explícito (ver classifyLesson em
 *   server/classify-lesson.ts). A descrição dessas aulas contém termos como
 *   "Aplicação" e "aplicação", que casariam com PRACTICAL_KEYWORDS e fariam
 *   a aula virar `practical` em qualquer edição futura. Este script reaplica
 *   `theoretical` de forma idempotente — pode ser rerodado sempre que houver
 *   regressão.
 *
 * Uso:
 *   DATABASE_URL='postgresql://...' npx tsx scripts/fix_toxin_lessons_classification.ts
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

const TARGET_LESSON_IDS = [25, 28] as const;
const EXPECTED_TYPE = "theoretical";

async function main() {
  const before = await sql`
    SELECT id, module_id, title, content_type, "order"
    FROM lessons
    WHERE id = ANY(${TARGET_LESSON_IDS as unknown as number[]})
    ORDER BY id
  `;

  if (before.length === 0) {
    console.error(`Nenhuma das aulas alvo (${TARGET_LESSON_IDS.join(", ")}) foi encontrada. Abortando.`);
    process.exit(2);
  }

  console.log("=== Estado ANTES ===");
  for (const l of before) {
    console.log(`  id=${l.id} module_id=${l.module_id} order=${l.order} content_type=${l.content_type} title="${l.title}"`);
  }

  const needFix = before.filter((l: any) => l.content_type !== EXPECTED_TYPE);
  if (needFix.length === 0) {
    console.log(`\nTodas as aulas alvo já estão como '${EXPECTED_TYPE}'. Nada a alterar.`);
  }

  if (DRY_RUN) {
    console.log("\n[--dry-run] Nada será alterado.");
    return;
  }

  // Idempotente: força content_type='theoretical' independentemente do estado
  // atual e atualiza updated_at para fins de auditoria.
  const now = new Date().toISOString();
  const result = await sql`
    UPDATE lessons
    SET content_type = ${EXPECTED_TYPE},
        updated_at = ${now}
    WHERE id = ANY(${TARGET_LESSON_IDS as unknown as number[]})
      AND content_type IS DISTINCT FROM ${EXPECTED_TYPE}
    RETURNING id
  `;
  console.log(`\nLinhas atualizadas: ${(result as any).length}`);

  const after = await sql`
    SELECT id, module_id, title, content_type, "order"
    FROM lessons
    WHERE id = ANY(${TARGET_LESSON_IDS as unknown as number[]})
    ORDER BY id
  `;
  console.log("\n=== Estado FINAL ===");
  for (const l of after) {
    console.log(`  id=${l.id} module_id=${l.module_id} order=${l.order} content_type=${l.content_type} title="${l.title}"`);
  }

  // Audit log para registrar a operação (a tabela existe — outros scripts
  // do projeto a utilizam, ver scripts/grant_lifetime_access_igor_sampaio.ts)
  try {
    const details = JSON.stringify({
      operation: "fix_toxin_lessons_classification",
      lessonIds: [...TARGET_LESSON_IDS],
      forcedContentType: EXPECTED_TYPE,
      script: "scripts/fix_toxin_lessons_classification.ts",
    });
    await sql`
      INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name, details, created_at)
      VALUES (0, 'Sistema (script fix_toxin_lessons_classification)', 'lesson_classification_fixed', 'lesson', 0, 'Toxina Botulínica (id=25, id=28)', ${details}, ${now})
    `;
    console.log("audit_logs: linha registrada");
  } catch (e: any) {
    // audit_logs é best-effort — não falhar se a tabela não existir em algum ambiente
    console.warn("audit_logs: não foi possível registrar (ok ignorar):", e?.message);
  }

  console.log("\nOK — aulas de Toxina (ids 25 e 28) garantidas como 'theoretical'.");
}

main().catch((e) => {
  console.error("ERRO:", e?.message || e);
  process.exit(1);
});
