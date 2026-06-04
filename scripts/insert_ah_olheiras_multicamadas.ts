import { neon } from '@neondatabase/serverless';

// Insere (idempotente) a aula prática demonstrativa de AH em olheiras multicamadas
// no módulo Preenchedores à base de Ácido Hialurônico (id=3)
//
// content_type='practical' — aula de prática demonstrativa
//
// Idempotência: usa o YouTube ID como chave dentro do módulo; nunca duplica.
//
// Uso:
//   DATABASE_URL='postgresql://...' npx tsx scripts/insert_ah_olheiras_multicamadas.ts

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('DATABASE_URL não definida. Abortando.');
  process.exit(1);
}
const sql = neon(DB_URL);

const YOUTUBE_ID = 'GaOJj9WJJIY';
const VIDEO_URL  = `https://youtu.be/${YOUTUBE_ID}`;
const MODULE_ID  = 3; // Preenchedores à base de Ácido Hialurônico
const TITLE      = 'Prática — AH em Olheiras Multicamadas';
const DESCRIPTION =
  'Aula prática demonstrativa de aplicação de ácido hialurônico em região de olheiras com abordagem multicamadas.';
const CONTENT_TYPE = 'practical';

async function main() {
  console.log(`=== Inserindo "${TITLE}" (module_id=${MODULE_ID}) ===`);

  const existing = await sql`
    SELECT id, module_id, title, "order", content_type
    FROM lessons
    WHERE module_id = ${MODULE_ID}
      AND video_url LIKE ${'%' + YOUTUBE_ID + '%'}
  `;

  if (existing.length > 0) {
    const e = existing[0];
    console.log(`⚠️  Já existe (id=${e.id}, order=${e.order}). Nada a fazer.`);
    return;
  }

  const maxOrderRow = await sql`
    SELECT COALESCE(MAX("order"), 0) AS max_order FROM lessons WHERE module_id = ${MODULE_ID}
  `;
  const nextOrder = Number(maxOrderRow[0].max_order) + 1;
  const now = new Date().toISOString();

  const [inserted] = await sql`
    INSERT INTO lessons
      (module_id, title, description, video_url, duration, "order", content_type, created_at, updated_at)
    VALUES
      (${MODULE_ID}, ${TITLE}, ${DESCRIPTION}, ${VIDEO_URL}, NULL, ${nextOrder}, ${CONTENT_TYPE}, ${now}, ${now})
    RETURNING id, module_id, title, video_url, "order", content_type
  `;

  console.log(`✅ Inserido com sucesso!`);
  console.log(`   id=${inserted.id} | module_id=${inserted.module_id} | order=${inserted.order}`);
  console.log(`   title="${inserted.title}"`);
  console.log(`   content_type=${inserted.content_type}`);
  console.log(`   video_url=${inserted.video_url}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
