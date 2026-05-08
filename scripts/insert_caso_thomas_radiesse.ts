import { neon } from '@neondatabase/serverless';

// Insere (idempotente) o caso clínico "Caso Thomas — Radiesse Duo 3,0, Radiesse (+) e Belotero Balance"
// na tabela `lessons` em DOIS módulos:
//   • Bioestimuladores de Colágeno (id=5) — categoria primária, com content_type='case_study'.
//   • Método NaturalUp® (id=4) — duplicação intencional pedida pelo Dr. Gustavo,
//     também com content_type='case_study', para o caso aparecer nas linhas:
//       - "✨ Bioestimuladores de Colágeno"
//       - "📐 Método NaturalUp"
//       - "🎬 Assista aos Procedimentos" (deduplicado por video_url no dashboard)
//
// Idempotência: usa par (module_id, YouTube ID em video_url) como chave; nunca duplica
// dentro do mesmo módulo. Pode ser executado múltiplas vezes com segurança.
//
// Uso:
//   DATABASE_URL='postgresql://...' npx tsx scripts/insert_caso_thomas_radiesse.ts

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('DATABASE_URL não definida. Abortando.');
  process.exit(1);
}
const sql = neon(DB_URL);

const YOUTUBE_ID = 'EUtAbqf93KQ';
const VIDEO_URL = `https://youtu.be/${YOUTUBE_ID}`;
const TITLE = 'Caso Thomas — Radiesse Duo 3,0, Radiesse (+) e Belotero Balance';
const DESCRIPTION = 'Caso clínico com associação de Radiesse Duo 3,0, Radiesse (+) e Belotero Balance dentro da lógica de bioestimulação de colágeno e Método NaturalUp®.';
const CONTENT_TYPE = 'case_study';

// (module_id, label) — ordem importa apenas para o log
const PLACEMENTS: { moduleId: number; label: string }[] = [
  { moduleId: 5, label: 'Bioestimuladores de Colágeno' },
  { moduleId: 4, label: 'Método NaturalUp®' },
];

async function ensurePlacement(moduleId: number, label: string) {
  const existing = await sql`
    SELECT id, module_id, title, "order", content_type
    FROM lessons
    WHERE module_id = ${moduleId}
      AND video_url LIKE ${'%' + YOUTUBE_ID + '%'}
  `;
  if (existing.length > 0) {
    const e = existing[0];
    console.log(`[${label}] já existe (id=${e.id}, order=${e.order}). Pulando.`);
    return e;
  }

  const maxOrderRow = await sql`
    SELECT COALESCE(MAX("order"), 0) AS max_order FROM lessons WHERE module_id = ${moduleId}
  `;
  const nextOrder = Number(maxOrderRow[0].max_order) + 1;
  const now = new Date().toISOString();

  const [inserted] = await sql`
    INSERT INTO lessons
      (module_id, title, description, video_url, duration, "order", content_type, created_at, updated_at)
    VALUES
      (${moduleId}, ${TITLE}, ${DESCRIPTION}, ${VIDEO_URL}, NULL, ${nextOrder}, ${CONTENT_TYPE}, ${now}, ${now})
    RETURNING id, module_id, title, video_url, "order", content_type
  `;
  console.log(`[${label}] inserido id=${inserted.id} order=${inserted.order}`);
  return inserted;
}

async function main() {
  console.log('=== Inserindo "Caso Thomas — Radiesse Duo 3,0, Radiesse (+) e Belotero Balance" ===');
  const results: any[] = [];
  for (const p of PLACEMENTS) {
    results.push(await ensurePlacement(p.moduleId, p.label));
  }
  console.log('\n✅ Resultado final:');
  for (const r of results) {
    console.log(`  module_id=${r.module_id} | id=${r.id} | order=${r.order} | content_type=${r.content_type}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
