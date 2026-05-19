import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_KHvsQVDh8E6F@ep-empty-base-actz06qd-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Insert "Fios de PDO" and "IA para Clínica" modules ===\n');

  const existing: any[] = await sql`SELECT id, title, "order" FROM modules ORDER BY "order"`;
  console.log('Existing modules:');
  for (const m of existing) console.log(`  ${m.order}. [${m.id}] ${m.title}`);

  const existingTitles = new Set(existing.map((m: any) => m.title));
  const maxOrder = existing.reduce((max: number, m: any) => Math.max(max, m.order || 0), 0);

  // Module 1: Fios de PDO — técnico, perto dos demais módulos de procedimento
  const FIOS_TITLE = 'Fios de PDO';
  const FIOS_DESC = 'Sustentação, tração e bioestimulação com fios de Polidioxanona (PDO)';
  const FIOS_COVER = '/images/covers/cover_fios_pdo_v2026.png';

  // Module 2: IA para Clínica — gestão/operacional
  const IA_TITLE = 'IA para Clínica: Prontuário, Vendas e Operacional';
  const IA_DESC = 'Inteligência artificial aplicada à rotina clínica — prontuário, vendas, gestão e operacional do consultório';
  const IA_COVER = '/images/covers/cover_ia_clinica_v2026.png';

  let nextOrder = maxOrder + 1;

  if (existingTitles.has(FIOS_TITLE)) {
    console.log(`⚠️  "${FIOS_TITLE}" already exists, skipping insertion.`);
  } else {
    const [row] = await sql`
      INSERT INTO modules (title, description, "order", image_url)
      VALUES (${FIOS_TITLE}, ${FIOS_DESC}, ${nextOrder}, ${FIOS_COVER})
      RETURNING id, title, "order", image_url
    `;
    console.log(`✅ Inserted: [${row.id}] "${row.title}" (order ${row.order}, cover ${row.image_url})`);
    nextOrder++;
  }

  if (existingTitles.has(IA_TITLE)) {
    console.log(`⚠️  "${IA_TITLE}" already exists, skipping insertion.`);
  } else {
    const [row] = await sql`
      INSERT INTO modules (title, description, "order", image_url)
      VALUES (${IA_TITLE}, ${IA_DESC}, ${nextOrder}, ${IA_COVER})
      RETURNING id, title, "order", image_url
    `;
    console.log(`✅ Inserted: [${row.id}] "${row.title}" (order ${row.order}, cover ${row.image_url})`);
    nextOrder++;
  }

  console.log('\n=== Final state ===');
  const final: any[] = await sql`SELECT id, title, description, "order", image_url FROM modules ORDER BY "order"`;
  for (const m of final) {
    console.log(`  ${m.order}. [${m.id}] ${m.title}\n     cover: ${m.image_url}\n     desc:  ${m.description}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
