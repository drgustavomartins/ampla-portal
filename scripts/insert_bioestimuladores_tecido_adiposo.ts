import { neon } from '@neondatabase/serverless';

// Insere o material educacional "Bioestimuladores e Tecido Adiposo" (PDF, 8 páginas)
// na seção Materiais Complementares, dentro do tema "Bioestimuladores de Colageno" (id=5),
// subcategoria "Compilados e Resumos" (id=18).
//
// O PDF está hospedado em /materiais/bioestimuladores-tecido-adiposo.pdf no próprio portal.
// Como o schema usa o campo drive_id e a UI suporta URL completa (helpers isFullUrl),
// gravamos a URL absoluta de produção como drive_id — mesmo padrão usado para artigos
// científicos que apontam para PubMed/DOI (ver scripts/insert_new_themes.ts).
//
// Uso:
//   DATABASE_URL='postgresql://...' npx tsx scripts/insert_bioestimuladores_tecido_adiposo.ts

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('DATABASE_URL não definida. Abortando.');
  process.exit(1);
}
const sql = neon(DB_URL);

const PDF_URL = 'https://portal.amplafacial.com.br/materiais/bioestimuladores-tecido-adiposo.pdf';
const FILE_NAME = 'Bioestimuladores e Tecido Adiposo — PLLA/PDLLA, CaHA e o Plano Adiposo';
const SUBCATEGORY_ID = 18; // Bioestimuladores de Colageno → Compilados e Resumos

async function main() {
  console.log('=== Inserindo material "Bioestimuladores e Tecido Adiposo" ===');

  // Verifica se a subcategoria existe
  const sub = await sql`SELECT id, name, theme_id FROM material_subcategories WHERE id = ${SUBCATEGORY_ID}`;
  if (sub.length === 0) {
    console.error(`Subcategoria ID ${SUBCATEGORY_ID} não encontrada. Abortando.`);
    process.exit(1);
  }
  console.log(`Subcategoria alvo: [${sub[0].id}] ${sub[0].name} (theme_id=${sub[0].theme_id})`);

  // Evita duplicação: se já existir um material com mesmo drive_id, não insere de novo
  const existing = await sql`SELECT id, name FROM material_files WHERE drive_id = ${PDF_URL}`;
  if (existing.length > 0) {
    console.log(`Material já cadastrado (id=${existing[0].id}). Nada a fazer.`);
    return;
  }

  // Calcula o próximo "order" dentro da subcategoria
  const maxOrderRow = await sql`
    SELECT COALESCE(MAX("order"), -1) AS max_order
    FROM material_files
    WHERE subcategory_id = ${SUBCATEGORY_ID}
  `;
  const nextOrder = Number(maxOrderRow[0].max_order) + 1;

  const [inserted] = await sql`
    INSERT INTO material_files (subcategory_id, name, type, drive_id, youtube_id, "order")
    VALUES (${SUBCATEGORY_ID}, ${FILE_NAME}, 'pdf', ${PDF_URL}, NULL, ${nextOrder})
    RETURNING id, name, type, drive_id, "order"
  `;

  console.log('\n✅ Material inserido com sucesso:');
  console.log(JSON.stringify(inserted, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
