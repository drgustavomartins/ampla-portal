import { neon } from '@neondatabase/serverless';

// Insere (idempotente) o podcast "Bioestimuladores Geram Gordura ou Apenas Colágeno?"
// na seção "Podcasts e Conteúdos Extras" do dashboard do aluno (tabela supplementary_content).
//
// Idempotente: usa o YouTube ID (80ktBbXOEDs) como chave para evitar duplicatas.
//
// Uso:
//   DATABASE_URL='postgresql://...' npx tsx scripts/insert_podcast_bioestimuladores_gordura_colageno.ts

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('DATABASE_URL não definida. Abortando.');
  process.exit(1);
}
const sql = neon(DB_URL);

const YOUTUBE_ID = '80ktBbXOEDs';
const VIDEO_URL = `https://youtu.be/${YOUTUBE_ID}`;
const TITLE = 'Bioestimuladores Geram Gordura ou Apenas Colágeno? | Podcast Ampla Facial';
const DESCRIPTION = 'Discussão educacional sobre PLLA/PDLLA, CaHA, plano adiposo, adipogênese e matriz extracelular.';
const CATEGORY = 'Bioestimuladores';
const DURATION = '19:33';

async function main() {
  console.log('=== Inserindo podcast "Bioestimuladores Geram Gordura ou Apenas Colágeno?" ===');

  // Idempotência: se já existir um podcast com a mesma URL/YouTube ID, não insere de novo
  const existing = await sql`
    SELECT id, title, "order" FROM supplementary_content
    WHERE video_url LIKE ${'%' + YOUTUBE_ID + '%'}
  `;
  if (existing.length > 0) {
    console.log(`Podcast já cadastrado (id=${existing[0].id}, order=${existing[0].order}). Nada a fazer.`);
    return;
  }

  // Calcula o próximo "order" global (segue o padrão dos episódios já cadastrados)
  const maxOrderRow = await sql`
    SELECT COALESCE(MAX("order"), 0) AS max_order FROM supplementary_content
  `;
  const nextOrder = Number(maxOrderRow[0].max_order) + 1;

  const now = new Date().toISOString();

  const [inserted] = await sql`
    INSERT INTO supplementary_content
      (type, title, description, video_url, category, duration, "order", visible, created_at, updated_at)
    VALUES
      ('podcast', ${TITLE}, ${DESCRIPTION}, ${VIDEO_URL}, ${CATEGORY}, ${DURATION}, ${nextOrder}, true, ${now}, ${now})
    RETURNING id, type, title, video_url, category, duration, "order", visible
  `;

  console.log('\n✅ Podcast inserido com sucesso:');
  console.log(JSON.stringify(inserted, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
