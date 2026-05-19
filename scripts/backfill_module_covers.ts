import { neon } from '@neondatabase/serverless';

// Idempotent backfill: ensures every known module has its current cover path in
// image_url. Safe to run multiple times; only updates rows whose image_url
// differs from the canonical path.
//
// Matches by exact title (case-insensitive). Each canonical title maps to a
// list of accepted variants so we tolerate small typographic differences
// already present in production rows.

type Mapping = {
  canonicalTitle: string;
  titleVariants: string[];
  cover: string;
};

const MAPPINGS: Mapping[] = [
  {
    canonicalTitle: 'Boas vindas',
    titleVariants: ['boas vindas', 'boas-vindas'],
    cover: '/images/boas-vindas-v2.png',
  },
  {
    canonicalTitle: 'Toxina Botulínica',
    titleVariants: ['toxina botulínica', 'toxina botulinica'],
    cover: '/images/covers/cover_toxina_botulinica_v2026.png',
  },
  {
    canonicalTitle: 'Preenchedores à base de Ácido Hialurônico',
    titleVariants: [
      'preenchedores à base de ácido hialurônico',
      'preenchedores a base de acido hialuronico',
      'preenchedores à base de acido hialuronico',
    ],
    cover: '/images/covers/cover_preenchedores_faciais_v2026.png',
  },
  {
    canonicalTitle: 'Bioestimuladores de Colágeno',
    titleVariants: ['bioestimuladores de colágeno', 'bioestimuladores de colageno'],
    cover: '/images/covers/cover_bioestimuladores_v2026.png',
  },
  {
    canonicalTitle: 'Biorregeneradores e Moduladores',
    titleVariants: [
      'biorregeneradores e moduladores',
      'moduladores de matriz extracelular',
      'biorregeneradores',
    ],
    cover: '/images/covers/cover_biorregeneradores_v2026.png',
  },
  {
    canonicalTitle: 'Fios de PDO',
    titleVariants: ['fios de pdo'],
    cover: '/images/covers/cover_fios_pdo_v2026.png',
  },
  {
    canonicalTitle: 'Método NaturalUp®',
    titleVariants: ['método naturalup®', 'metodo naturalup', 'método naturalup', 'naturalup'],
    cover: '/images/covers/cover_metodo_naturalup_v2026.png',
  },
  {
    canonicalTitle: 'IA para Clínica: Prontuário, Vendas e Operacional',
    titleVariants: [
      'ia para clínica: prontuário, vendas e operacional',
      'ia para clinica: prontuario, vendas e operacional',
      'ia para clínica',
      'ia para clinica',
    ],
    cover: '/images/covers/cover_ia_clinica_v2026.png',
  },
];

async function main() {
  const url = process.env.DATABASE_URL
    || 'postgresql://neondb_owner:npg_KHvsQVDh8E6F@ep-empty-base-actz06qd-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
  const sql = neon(url);

  console.log('=== Backfill module covers (idempotent) ===\n');

  const rows: any[] = await sql`SELECT id, title, "order", image_url FROM modules ORDER BY "order"`;
  console.log('Before:');
  for (const m of rows) console.log(`  ${m.order}. [${m.id}] ${m.title}  ← ${m.image_url ?? 'NULL'}`);
  console.log('');

  let touched = 0;
  for (const row of rows) {
    const title = String(row.title || '').trim().toLowerCase();
    const mapping = MAPPINGS.find((m) => m.titleVariants.includes(title));
    if (!mapping) continue;
    if (row.image_url === mapping.cover) continue;

    await sql`UPDATE modules SET image_url = ${mapping.cover} WHERE id = ${row.id}`;
    console.log(`✓ Updated [${row.id}] "${row.title}": ${row.image_url ?? 'NULL'} → ${mapping.cover}`);
    touched += 1;
  }

  console.log(`\n${touched} row(s) updated.\n`);

  const after: any[] = await sql`SELECT id, title, "order", image_url FROM modules ORDER BY "order"`;
  console.log('After:');
  for (const m of after) console.log(`  ${m.order}. [${m.id}] ${m.title}  ← ${m.image_url ?? 'NULL'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
