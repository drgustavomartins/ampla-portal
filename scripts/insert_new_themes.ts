import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_KHvsQVDh8E6F@ep-empty-base-actz06qd-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Starting insertion of new themes ===\n');

  // Check existing themes to avoid duplicates and determine next order
  const existingThemes = await sql`SELECT id, title, "order" FROM material_themes ORDER BY "order"`;
  console.log('Existing themes:', existingThemes.map((t: any) => `${t.id}: ${t.title}`));

  const existingTitles = existingThemes.map((t: any) => t.title);
  const maxOrder = existingThemes.reduce((max: number, t: any) => Math.max(max, t.order || 0), 0);
  console.log(`Max order: ${maxOrder}\n`);

  // Define new themes
  const newThemes = [
    {
      title: 'i-PRF',
      cover_url: '/images/covers/cover_iprf_v2026.png',
      order: maxOrder + 1,
      subcategories: [
        {
          name: 'Protocolos de Centrifugação',
          order: 1,
          files: [
            {
              name: 'Microneedling with Injectable Platelet-Rich Fibrin for Facial Rejuvenation (Vesala et al., 2021)',
              type: 'pdf',
              drive_id: 'https://doi.org/10.20517/2347-9264.2021.57',
              youtube_id: null,
              order: 1,
            },
            {
              name: 'PRP X I-PRF — Comparação de protocolos e indicações clínicas (Roberto Puertas)',
              type: 'youtube',
              drive_id: 'rAwdc2NRE8E',
              youtube_id: 'rAwdc2NRE8E',
              order: 2,
            },
          ],
        },
        {
          name: 'Aplicações Clínicas em Face',
          order: 2,
          files: [
            {
              name: 'Injectable Platelet-Rich Fibrin for Facial Rejuvenation: A Prospective Study (Hassan et al., 2020)',
              type: 'pdf',
              drive_id: 'https://doi.org/10.1111/jocd.13692',
              youtube_id: null,
              order: 1,
            },
            {
              name: 'Fibrina Rica em Plaquetas: onde e como ela entra na harmonização orofacial? (Webinar TV Dental News)',
              type: 'youtube',
              drive_id: 'xrWwBne8e2o',
              youtube_id: 'xrWwBne8e2o',
              order: 2,
            },
          ],
        },
      ],
    },
    {
      title: 'PDRN',
      cover_url: '/images/covers/cover_pdrn_v2026.png',
      order: maxOrder + 2,
      subcategories: [
        {
          name: 'Mecanismo de Ação e Protocolos',
          order: 1,
          files: [
            {
              name: 'Polydeoxyribonucleotide: A Promising Biological Platform to Accelerate Impaired Skin Wound Healing (Bitto et al., 2021)',
              type: 'pdf',
              drive_id: 'https://doi.org/10.3390/ph14111103',
              youtube_id: null,
              order: 1,
            },
            {
              name: 'PDRN: What It Is and How It Can Improve Your Skin — Salmon DNA (Dra. Marina Hayashida)',
              type: 'youtube',
              drive_id: 'PSMG8U_f64A',
              youtube_id: 'PSMG8U_f64A',
              order: 2,
            },
          ],
        },
        {
          name: 'PDRN vs Polinucleotídeos',
          order: 2,
          files: [
            {
              name: 'From PDRNs to PNs: Bridging the Gap Between Scientific Definitions, Molecular Insights, and Clinical Applications (Laurent et al., 2025)',
              type: 'pdf',
              drive_id: 'https://doi.org/10.3390/biom15010148',
              youtube_id: null,
              order: 1,
            },
            {
              name: 'A Mixture of Topical Forms of PDRN, Vitamin C, and Niacinamide Attenuated Skin Pigmentation and Increased Skin Elasticity (Park et al., 2022)',
              type: 'pdf',
              drive_id: 'https://doi.org/10.3390/molecules27041276',
              youtube_id: null,
              order: 2,
            },
          ],
        },
      ],
    },
    {
      title: 'Exossomos',
      cover_url: '/images/covers/cover_exossomos_v2026.png',
      order: maxOrder + 3,
      subcategories: [
        {
          name: 'Biologia e Mecanismo',
          order: 1,
          files: [
            {
              name: 'Exosomes in Aesthetic Medicine: An Overview (Aesthetic Surgery Journal, 2026)',
              type: 'pdf',
              drive_id: 'https://doi.org/10.1093/asj/sjaf178',
              youtube_id: null,
              order: 1,
            },
            {
              name: 'Clinical Applications of Exosomes in Cosmetic Dermatology (Bai et al., 2024)',
              type: 'pdf',
              drive_id: 'https://doi.org/10.1002/ski2.348',
              youtube_id: null,
              order: 2,
            },
          ],
        },
        {
          name: 'Aplicações em Estética Facial',
          order: 2,
          files: [
            {
              name: 'EXOSSOMOS na Estética: A Revolução na Regeneração Facial (Medicatriz Dermocosméticos)',
              type: 'youtube',
              drive_id: 'I_TB1w4egI8',
              youtube_id: 'I_TB1w4egI8',
              order: 1,
            },
            {
              name: 'EXOSSOMAS | TENDÊNCIA MUNDIAL NA ESTÉTICA FACIAL — Análise baseada em evidências (Prof. Heitor Cruz)',
              type: 'youtube',
              drive_id: 'DwD7kCWVKXY',
              youtube_id: 'DwD7kCWVKXY',
              order: 2,
            },
          ],
        },
      ],
    },
  ];

  for (const theme of newThemes) {
    if (existingTitles.includes(theme.title)) {
      console.log(`⚠️  Theme "${theme.title}" already exists, skipping...`);
      continue;
    }

    console.log(`\n--- Inserting theme: ${theme.title} (order: ${theme.order}) ---`);
    const [insertedTheme] = await sql`
      INSERT INTO material_themes (title, cover_url, "order", visible)
      VALUES (${theme.title}, ${(theme as any).cover_url}, ${theme.order}, true)
      RETURNING id, title, "order"
    `;
    console.log(`✅ Theme inserted: ID=${insertedTheme.id}, title="${insertedTheme.title}"`);

    for (const sub of theme.subcategories) {
      console.log(`  Inserting subcategory: "${sub.name}"`);
      const [insertedSub] = await sql`
        INSERT INTO material_subcategories (theme_id, name, "order")
        VALUES (${insertedTheme.id}, ${sub.name}, ${sub.order})
        RETURNING id, name
      `;
      console.log(`  ✅ Subcategory inserted: ID=${insertedSub.id}, name="${insertedSub.name}"`);

      for (const file of sub.files) {
        console.log(`    Inserting file: "${file.name.substring(0, 60)}..."`);
        const [insertedFile] = await sql`
          INSERT INTO material_files (subcategory_id, name, type, drive_id, youtube_id, "order")
          VALUES (${insertedSub.id}, ${file.name}, ${file.type}, ${file.drive_id}, ${file.youtube_id}, ${file.order})
          RETURNING id, name, type
        `;
        console.log(`    ✅ File inserted: ID=${insertedFile.id}, type="${insertedFile.type}"`);
      }
    }
  }

  // Final verification
  console.log('\n=== Final verification ===');
  const allThemes = await sql`
    SELECT 
      mt.id as theme_id, mt.title as theme_title, mt.order as theme_order,
      ms.id as sub_id, ms.name as sub_name,
      mf.id as file_id, mf.name as file_name, mf.type as file_type
    FROM material_themes mt
    LEFT JOIN material_subcategories ms ON ms.theme_id = mt.id
    LEFT JOIN material_files mf ON mf.subcategory_id = ms.id
    WHERE mt.title IN ('i-PRF', 'PDRN', 'Exossomos')
    ORDER BY mt.order, ms.order, mf.order
  `;
  
  console.log(`\nTotal records found for new themes: ${allThemes.length}`);
  
  let currentTheme = '';
  let currentSub = '';
  for (const row of allThemes) {
    if (row.theme_title !== currentTheme) {
      currentTheme = row.theme_title;
      console.log(`\n📁 Theme [${row.theme_id}]: ${row.theme_title}`);
    }
    if (row.sub_name !== currentSub) {
      currentSub = row.sub_name;
      console.log(`  📂 Subcategory [${row.sub_id}]: ${row.sub_name}`);
    }
    if (row.file_id) {
      console.log(`    📄 File [${row.file_id}]: ${row.file_name?.substring(0, 70)} (${row.file_type})`);
    }
  }

  console.log('\n✅ All insertions complete!');
}

main().catch(console.error);
