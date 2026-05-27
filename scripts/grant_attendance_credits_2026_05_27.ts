/**
 * Concede crédito de presença (R$150 = 15000 centavos) aos participantes ativos
 * da aula ao vivo de 2026-05-27.
 *
 * Participantes:
 *   • Carolina Pinto
 *   • Renata Ramos
 *   • Felipe Panzera
 *   • Igor (resolver para o único Igor candidato; se houver ambiguidade entre
 *     múltiplos Igors, NÃO aplicar a este e reportar — os demais são processados.)
 *
 * Comportamento (mesma lógica do endpoint POST /api/admin/credits/attendance):
 *   • INSERT em credit_transactions com:
 *       type        = 'attendance_bonus'
 *       amount      = 15000 (centavos BRL)
 *       description = `Presença ativa: Participação na aula - 27 de maio de 2026 — 2026-05-27`
 *       reference_id = `attendance_2026-05-27_<userId>`
 *       expires_at  = +180 dias (mesma política do endpoint)
 *   • Idempotente via reference_id: se já existir crédito com a mesma referência,
 *     o aluno é marcado como "already_credited" e nada é inserido novamente.
 *   • Audit log em audit_logs (action = 'credit_attendance').
 *
 * Uso:
 *   DATABASE_URL='postgresql://...' npx tsx scripts/grant_attendance_credits_2026_05_27.ts
 *   # adicione --dry-run para apenas listar o que seria feito (sem alterar)
 *   # adicione --json para imprimir o relatório final em JSON
 */

import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL não definida. Abortando.");
  process.exit(1);
}
const sql = neon(DB_URL);

const DRY_RUN = process.argv.includes("--dry-run");
const JSON_OUT = process.argv.includes("--json");

const CLASS_TITLE = "Participação na aula - 27 de maio de 2026";
const CLASS_DATE = "2026-05-27";
const AMOUNT_CENTS = 15000;
const EXPIRES_MS = 180 * 86400000;

type Candidate = {
  pattern: string;
  label: string;
  // If true, ambiguity should not abort — the unambiguous others still proceed,
  // and this name's status becomes "ambiguous".
  toleratesAmbiguity: boolean;
};

const TARGETS: Candidate[] = [
  { pattern: "%carolina%pinto%", label: "Carolina Pinto", toleratesAmbiguity: false },
  { pattern: "%renata%ramos%", label: "Renata Ramos", toleratesAmbiguity: false },
  { pattern: "%felipe%panzera%", label: "Felipe Panzera", toleratesAmbiguity: false },
  // For "Igor": match any user whose name begins with "Igor".
  // If exactly one row -> use it (regardless of last name).
  // If multiple -> mark as ambiguous and skip.
  { pattern: "igor%", label: "Igor", toleratesAmbiguity: true },
];

function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  return email.replace(/^(.).*?(.?)@(.+)$/, "$1***$2@$3");
}

type ReportRow = {
  name: string;
  status: "applied" | "already_credited" | "user_not_found" | "ambiguous" | "error";
  userId?: number;
  resolvedName?: string;
  emailMasked?: string;
  amountCents?: number;
  referenceId?: string;
  detail?: string;
  candidates?: { id: number; name: string; emailMasked: string }[];
};

async function findUsers(pattern: string): Promise<any[]> {
  return await sql`
    SELECT id, name, email, role, plan_key, approved
    FROM users
    WHERE name ILIKE ${pattern}
    ORDER BY id
  `;
}

async function alreadyCredited(userId: number): Promise<boolean> {
  const refId = `attendance_${CLASS_DATE}_${userId}`;
  const rows = await sql`
    SELECT id FROM credit_transactions WHERE reference_id = ${refId} LIMIT 1
  `;
  return rows.length > 0;
}

async function insertCredit(userId: number): Promise<void> {
  const refId = `attendance_${CLASS_DATE}_${userId}`;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + EXPIRES_MS).toISOString();
  const desc = `Presença ativa: ${CLASS_TITLE} — ${CLASS_DATE}`;
  await sql`
    INSERT INTO credit_transactions
      (user_id, type, amount, description, reference_id, created_at, expires_at)
    VALUES
      (${userId}, 'attendance_bonus', ${AMOUNT_CENTS}, ${desc}, ${refId}, ${now}, ${expiresAt})
  `;
}

async function main() {
  const report: ReportRow[] = [];

  for (const target of TARGETS) {
    const rows = await findUsers(target.pattern);

    if (rows.length === 0) {
      report.push({ name: target.label, status: "user_not_found" });
      continue;
    }

    if (rows.length > 1) {
      const candidates = rows.map((r) => ({
        id: Number(r.id),
        name: String(r.name),
        emailMasked: maskEmail(String(r.email || "")),
      }));
      if (target.toleratesAmbiguity) {
        report.push({
          name: target.label,
          status: "ambiguous",
          detail: `Múltiplos candidatos (${rows.length}) — nenhum crédito aplicado a este nome.`,
          candidates,
        });
        continue;
      }
      report.push({
        name: target.label,
        status: "error",
        detail: `Múltiplos candidatos (${rows.length}); resolver manualmente.`,
        candidates,
      });
      continue;
    }

    const user = rows[0];
    const userId = Number(user.id);
    const emailMasked = maskEmail(String(user.email || ""));
    const refId = `attendance_${CLASS_DATE}_${userId}`;

    try {
      if (await alreadyCredited(userId)) {
        report.push({
          name: target.label,
          status: "already_credited",
          userId,
          resolvedName: String(user.name),
          emailMasked,
          amountCents: AMOUNT_CENTS,
          referenceId: refId,
          detail: "Já existia crédito para esta aula (reference_id duplicada). Nada inserido.",
        });
        continue;
      }

      if (DRY_RUN) {
        report.push({
          name: target.label,
          status: "applied",
          userId,
          resolvedName: String(user.name),
          emailMasked,
          amountCents: AMOUNT_CENTS,
          referenceId: refId,
          detail: "[dry-run] não inserido",
        });
        continue;
      }

      await insertCredit(userId);
      report.push({
        name: target.label,
        status: "applied",
        userId,
        resolvedName: String(user.name),
        emailMasked,
        amountCents: AMOUNT_CENTS,
        referenceId: refId,
      });
    } catch (e: any) {
      report.push({
        name: target.label,
        status: "error",
        userId,
        resolvedName: String(user.name),
        emailMasked,
        detail: e?.message || String(e),
      });
    }
  }

  // Audit log único para a operação (somente se algo foi efetivamente aplicado e não é dry-run)
  const applied = report.filter((r) => r.status === "applied" && !DRY_RUN);
  if (applied.length > 0) {
    const details = JSON.stringify({
      operation: "credit_attendance_bulk_script",
      title: CLASS_TITLE,
      date: CLASS_DATE,
      amount: AMOUNT_CENTS,
      creditedCount: applied.length,
      creditedStudents: applied.map((r) => ({
        userId: r.userId,
        name: r.resolvedName,
        referenceId: r.referenceId,
      })),
      report: report.map(({ candidates, ...rest }) => rest),
      script: "scripts/grant_attendance_credits_2026_05_27.ts",
    });
    try {
      await sql`
        INSERT INTO audit_logs
          (admin_id, admin_name, action, target_type, target_id, target_name, details, created_at)
        VALUES
          (0, 'Sistema (script grant_attendance_credits_2026_05_27)', 'credit_attendance',
           'credits', NULL, ${CLASS_TITLE}, ${details}, ${new Date().toISOString()})
      `;
    } catch (e: any) {
      console.error("Aviso: falha ao gravar audit log:", e?.message || e);
    }
  }

  // Verificação final: lê as transações criadas/existentes para os IDs resolvidos
  const verify: any[] = [];
  for (const r of report) {
    if (!r.userId) continue;
    const refId = `attendance_${CLASS_DATE}_${r.userId}`;
    const rows = await sql`
      SELECT ct.id, ct.user_id, ct.type, ct.amount, ct.description, ct.reference_id,
             ct.created_at, ct.expires_at, u.name AS user_name, u.email AS user_email
      FROM credit_transactions ct
      LEFT JOIN users u ON u.id = ct.user_id
      WHERE ct.reference_id = ${refId}
      LIMIT 1
    `;
    if (rows.length > 0) {
      verify.push({
        targetLabel: r.name,
        userId: r.userId,
        userName: rows[0].user_name,
        userEmailMasked: maskEmail(String(rows[0].user_email || "")),
        amount: rows[0].amount,
        type: rows[0].type,
        description: rows[0].description,
        referenceId: rows[0].reference_id,
        createdAt: rows[0].created_at,
        expiresAt: rows[0].expires_at,
      });
    }
  }

  const summary = {
    classTitle: CLASS_TITLE,
    classDate: CLASS_DATE,
    amountCents: AMOUNT_CENTS,
    dryRun: DRY_RUN,
    report: report.map((r) => ({
      ...r,
      // remove campos pesados do log final
    })),
    verifiedInDb: verify,
    counts: {
      applied: report.filter((r) => r.status === "applied").length,
      alreadyCredited: report.filter((r) => r.status === "already_credited").length,
      userNotFound: report.filter((r) => r.status === "user_not_found").length,
      ambiguous: report.filter((r) => r.status === "ambiguous").length,
      error: report.filter((r) => r.status === "error").length,
    },
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log("=== Crédito de presença — 2026-05-27 ===");
    console.log(`Aula: ${CLASS_TITLE}`);
    console.log(`Valor por aluno: R$${(AMOUNT_CENTS / 100).toFixed(2)} (${AMOUNT_CENTS} centavos)`);
    console.log(`Modo: ${DRY_RUN ? "DRY-RUN (nada gravado)" : "execução real"}`);
    console.log("");
    console.log("Status por aluno:");
    for (const r of summary.report) {
      const id = r.userId ? ` id=${r.userId}` : "";
      const em = r.emailMasked ? ` ${r.emailMasked}` : "";
      const rn = r.resolvedName && r.resolvedName !== r.name ? ` ("${r.resolvedName}")` : "";
      console.log(`  • ${r.name}${rn}${id}${em} — ${r.status}${r.detail ? ` :: ${r.detail}` : ""}`);
      if ((r as any).candidates) {
        for (const c of (r as any).candidates) {
          console.log(`      candidato: id=${c.id} "${c.name}" ${c.emailMasked}`);
        }
      }
    }
    console.log("");
    console.log("Verificação no banco (credit_transactions encontradas):");
    for (const v of verify) {
      console.log(
        `  • user_id=${v.userId} "${v.userName}" ${v.userEmailMasked} amount=${v.amount} type=${v.type} ref=${v.referenceId}`,
      );
    }
    console.log("");
    console.log("Resumo:", JSON.stringify(summary.counts));
  }
}

main().catch((e) => {
  console.error("ERRO FATAL:", e?.message || e);
  process.exit(1);
});
