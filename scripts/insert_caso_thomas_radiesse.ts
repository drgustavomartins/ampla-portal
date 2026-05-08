import { neon } from '@neondatabase/serverless';

// Insere (idempotente) o caso clínico "Caso Thomas — Radiesse Duo 3,0, Radiesse (+) e Belotero Balance"
// na tabela `lessons` dentro do módulo "Bioestimuladores de Colágeno" (id=5),
// como `content_type='case_study'`.
//
// Visibilidade no portal:
//   • Aparece na linha "✨ Bioestimuladores de Colágeno" do dashboard do aluno
//     (lessons cujo módulo casa com keyword "bioestimulador").
//   • Aparece na linha "🎬 Assista aos Procedimentos" (todas as lessons com
//     content_type='case_study' agregadas).
//   • Aparece na página do módulo "Bioestimuladores de Colágeno".
//   • NÃO aparece na linha "📐 Método NaturalUp" — a tabela `lessons` é 1:1 com
//     module_id; o padrão existente (ex.: "Caso Vênus", "Demonstração Radiesse")
//     é placement único pelo módulo principal. Bioestimuladores foi a categoria
//     primária indicada pelo usuário para este caso.
//
// Idempotente: usa o YouTube ID (EUtAbqf93KQ) na coluna video_url como chave.
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
const MODULE_ID = 5; // Bioestimuladores de Colágeno
const TITLE = 'Caso Thomas — Radiesse Duo 3,0, Radiesse (+) e Belotero Balance';
const DESCRIPTION = 'Caso clínico com associação de Radiesse Duo 3,0, Radiesse (+) e Belotero Balance dentro da lógica de bioestimulação de colágeno e Método NaturalUp®.';
const CONTENT_TYPE = 'case_study';

async function main() {
  console.log('=== Inserindo caso clínico "Caso Thomas — Radiesse Duo 3,0, Radiesse (+) e Belotero Balance" ===');

  // Idempotência: se já existir uma lesson com esse YouTube ID, não insere de novo
  const existing = await sql`
    SELECT id, module_id, title, "order", content_type
    FROM lessons
    WHERE video_url LIKE ${'%' + YOUTUBE_ID + '%'}
  `;
  if (existing.length > 0) {
    console.log(`Caso clínico já cadastrado (id=${existing[0].id}, module_id=${existing[0].module_id}, order=${existing[0].order}). Nada a fazer.`);
    return;
  }

  // Próximo "order" dentro do módulo Bioestimuladores
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

  console.log('\n✅ Caso clínico inserido com sucesso:');
  console.log(JSON.stringify(inserted, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
