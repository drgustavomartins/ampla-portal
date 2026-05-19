import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_KHvsQVDh8E6F@ep-empty-base-actz06qd-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require');

// Target order:
//  1. Boas vindas
//  2. Toxina Botulínica
//  3. Preenchedores à base de Ácido Hialurônico
//  4. Bioestimuladores de Colágeno
//  5. Biorregeneradores e Moduladores
//  6. Fios de PDO                                       <-- novo, junto aos técnicos
//  7. Método NaturalUp®                                 <-- protocolo integrado
//  8. IA para Clínica: Prontuário, Vendas e Operacional <-- gestão/operacional ao final

const TARGET: { id: number; order: number; title: string }[] = [
  { id: 6, order: 1, title: 'Boas vindas' },
  { id: 2, order: 2, title: 'Toxina Botulínica' },
  { id: 3, order: 3, title: 'Preenchedores à base de Ácido Hialurônico' },
  { id: 5, order: 4, title: 'Bioestimuladores de Colágeno' },
  { id: 7, order: 5, title: 'Biorregeneradores e Moduladores' },
  { id: 8, order: 6, title: 'Fios de PDO' },
  { id: 4, order: 7, title: 'Método NaturalUp®' },
  { id: 9, order: 8, title: 'IA para Clínica: Prontuário, Vendas e Operacional' },
];

async function main() {
  console.log('=== Reorder modules ===');
  for (const t of TARGET) {
    await sql`UPDATE modules SET "order" = ${t.order} WHERE id = ${t.id}`;
    console.log(`  set order=${t.order} for id=${t.id} (${t.title})`);
  }
  const rows: any[] = await sql`SELECT id, title, "order" FROM modules ORDER BY "order"`;
  console.log('\nFinal order:');
  for (const r of rows) console.log(`  ${r.order}. [${r.id}] ${r.title}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
