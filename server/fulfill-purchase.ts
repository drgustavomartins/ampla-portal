// ─── Fulfillment agnóstico de provedor ────────────────────────────────────────
// Extraído do webhook do Stripe em 30/07/2026 para que Stripe e Asaas compartilhem
// exatamente a mesma lógica de provisionamento. Antes disso, todo este fluxo vivia
// inline no handler do Stripe; duplicá-lo para o Asaas garantiria divergência com
// o tempo — o mesmo erro que o `installments12x` cravado à mão causou.
//
// Regra de ouro: NENHUMA lógica de negócio nova aqui. Isto é um recorte fiel do
// que já rodava. Os dois webhooks (Stripe e Asaas) traduzem o payload do provedor
// para um PurchaseContext e chamam fulfillPurchase().

import { db } from "./db";
import { sql } from "drizzle-orm";
import { PLANS } from "./stripe-plans";
import type { PlanKey } from "@shared/schema";

export interface PurchaseContext {
  userId: number;
  planKey: PlanKey;
  /** Valor efetivamente pago, em centavos. */
  amountPaidCents: number;
  isUpgrade: boolean;
  /** Créditos aplicados no checkout, em centavos (débito idempotente pós-pagamento). */
  creditsUsedCents?: number;
  /** Código de indicação, se houver. */
  referralCode?: string | null;
  /**
   * Identificador único e estável do pagamento no provedor. Usado como sufixo de
   * TODAS as chaves de idempotência (crédito, cashback, referral, contrato).
   * Stripe: session.id · Asaas: payment.id
   */
  paymentRef: string;
  /** Referência do intent/pagamento gravada em stripe_payment_intent_id. */
  paymentIntentRef: string;
  /** Nome do provedor para o audit log. Ex.: "Sistema Stripe", "Sistema Asaas". */
  providerLabel: string;
}

/**
 * Provisiona uma compra confirmada: acesso, módulos, materiais, crédito, cashback,
 * indicação e contrato. Idempotente por paymentRef — chamar duas vezes com o mesmo
 * paymentRef não duplica crédito, cashback nem contrato.
 */
export async function fulfillPurchase(ctx: PurchaseContext): Promise<void> {
  const { userId, planKey, isUpgrade, paymentRef, paymentIntentRef, providerLabel } = ctx;
  const plan = PLANS[planKey];
  if (!plan) {
    console.error(`[fulfill] Plano desconhecido: ${planKey}`);
    return;
  }
  const amountPaid = ctx.amountPaidCents || plan.price;

  const accessExpiry =
    planKey === "acesso_vitalicio"
      ? "2099-12-31T23:59:59.000Z"
      : new Date(Date.now() + plan.accessDays * 86400000).toISOString();
  const now = new Date().toISOString();

  // Detectar renovação (mesmo plano recomprado)
  const prevUser = await db.execute(
    sql`SELECT plan_key FROM users WHERE id = ${userId}`,
  );
  const previousPlanKey = (prevUser as any).rows?.[0]?.plan_key || null;
  const isRenewal = previousPlanKey === planKey;

  const { PLAN_PROVISIONING } = await import("./plan-provisioning");
  const provisioning = PLAN_PROVISIONING[planKey];

  const mentorshipEndDate =
    provisioning.mentorshipMonths > 0
      ? new Date(Date.now() + provisioning.mentorshipMonths * 30 * 86400000)
          .toISOString()
          .slice(0, 10)
      : null;
  const supportExpiresAt =
    provisioning.supportMonths > 0
      ? new Date(Date.now() + provisioning.supportMonths * 30 * 86400000).toISOString()
      : accessExpiry;

  const totalHours = plan.clinicalHours + plan.practiceHours;
  const isHorasExtra = plan.group === "horas";
  const isExtensao = planKey === "extensao_acompanhamento";

  // ─── 1. Atualizar campos do usuário ──────────────────────────────────────────
  if (isHorasExtra) {
    // Horas extras: SOMA ao banco existente, não altera plano/acesso
    await db.execute(sql`
      UPDATE users SET
        stripe_payment_intent_id = ${paymentIntentRef},
        plan_amount_paid = COALESCE(plan_amount_paid, 0) + ${amountPaid},
        clinical_practice_access = true,
        clinical_practice_hours = clinical_practice_hours + ${totalHours}
      WHERE id = ${userId}
    `);
  } else if (isExtensao) {
    // Extensão: SOMA meses de mentoria/suporte ao existente
    const extMonths = plan.mentorshipMonths;
    const extMs = extMonths * 30 * 86400000;
    const currentUser = await db.execute(
      sql`SELECT support_expires_at, mentorship_end_date FROM users WHERE id = ${userId}`,
    );
    const cu = (currentUser as any).rows?.[0];
    const currentSupport = cu?.support_expires_at
      ? new Date(cu.support_expires_at).getTime()
      : 0;
    const currentMentorship = cu?.mentorship_end_date
      ? new Date(cu.mentorship_end_date).getTime()
      : 0;
    const nowMs = Date.now();
    const newSupportExpiry = new Date(Math.max(currentSupport, nowMs) + extMs).toISOString();
    const newMentorshipEnd = new Date(Math.max(currentMentorship, nowMs) + extMs)
      .toISOString()
      .slice(0, 10);
    await db.execute(sql`
      UPDATE users SET
        stripe_payment_intent_id = ${paymentIntentRef},
        plan_amount_paid = COALESCE(plan_amount_paid, 0) + ${amountPaid},
        support_access = true,
        support_expires_at = ${newSupportExpiry},
        mentorship_end_date = ${newMentorshipEnd}
      WHERE id = ${userId}
    `);
    console.log(
      `[fulfill] Extensão de ${extMonths} meses para userId ${userId} | suporte até ${newSupportExpiry} | mentoria até ${newMentorshipEnd}`,
    );
  } else {
    // Plano normal: define tudo do zero (sai do trial)
    await db.execute(sql`
      UPDATE users SET
        plan_key = ${planKey},
        role = 'student',
        trial_started_at = NULL,
        stripe_payment_intent_id = ${paymentIntentRef},
        plan_paid_at = ${now},
        plan_amount_paid = ${amountPaid},
        approved = true,
        access_expires_at = ${accessExpiry},
        module_content_expires_at = ${accessExpiry},
        materials_access = true,
        community_access = true,
        support_access = true,
        support_expires_at = ${supportExpiresAt},
        clinical_practice_access = ${totalHours > 0},
        clinical_practice_hours = ${totalHours},
        mentorship_start_date = ${provisioning.mentorshipMonths > 0 ? now.slice(0, 10) : null},
        mentorship_end_date = ${mentorshipEndDate}
      WHERE id = ${userId}
    `);
  }

  // ─── 2. Provisionar módulos ──────────────────────────────────────────────────
  if (provisioning.modules.length > 0) {
    await db.execute(sql`DELETE FROM user_modules WHERE user_id = ${userId}`);
    for (const m of provisioning.modules) {
      await db.execute(sql`
        INSERT INTO user_modules (user_id, module_id, enabled, start_date, end_date)
        VALUES (${userId}, ${m.moduleId}, ${m.enabled}, ${now.slice(0, 10)}, ${accessExpiry.slice(0, 10)})
        ON CONFLICT (user_id, module_id) DO UPDATE SET enabled = ${m.enabled}
      `);
    }
  }

  // ─── 3. Provisionar materiais ────────────────────────────────────────────────
  await db.execute(sql`DELETE FROM user_material_categories WHERE user_id = ${userId}`);
  for (const cat of provisioning.materials) {
    await db.execute(sql`
      INSERT INTO user_material_categories (user_id, category_name, enabled)
      VALUES (${userId}, ${cat}, true)
      ON CONFLICT (user_id, category_name) DO UPDATE SET enabled = true
    `);
  }

  console.log(
    `[fulfill] Aluno ${userId} provisionado no plano ${planKey} até ${accessExpiry} | módulos: ${provisioning.modules.length} | materiais: ${provisioning.materials.length} | mentoria: ${provisioning.mentorshipMonths}m`,
  );

  // ─── 4. Debitar créditos usados (idempotente) ────────────────────────────────
  try {
    const creditsUsed = Number(ctx.creditsUsedCents || 0);
    if (creditsUsed > 0) {
      const uniqueRef = `webhook_credit_${userId}_${paymentRef}`;
      const existing = await db.execute(
        sql`SELECT id FROM credit_transactions WHERE reference_id = ${uniqueRef} LIMIT 1`,
      );
      if ((existing as any).rows?.length === 0) {
        await db.execute(
          sql`INSERT INTO credit_transactions (user_id, type, amount, description, reference_id, created_at) VALUES (${userId}, 'usage', ${-creditsUsed}, ${"Creditos aplicados: " + plan.name}, ${uniqueRef}, ${new Date().toISOString()})`,
        );
        console.log(`[fulfill] Creditos debitados: ${creditsUsed} centavos para userId ${userId} (${plan.name})`);
      } else {
        console.log(`[fulfill] Creditos ja debitados anteriormente para ${uniqueRef}`);
      }
    }
  } catch (e: any) {
    console.error("[fulfill] Credit debit error:", e.message);
  }

  // ─── 5. Audit log ────────────────────────────────────────────────────────────
  try {
    const buyerResult = await db.execute(sql`SELECT name FROM users WHERE id = ${userId}`);
    const buyer = (buyerResult as any).rows?.[0];
    const actionType = isRenewal ? "plan_renewed" : isUpgrade ? "plan_upgraded" : "plan_purchased";
    const details = JSON.stringify({
      planKey,
      planName: plan.name,
      amountPaid,
      amountFormatted: (amountPaid / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      isRenewal,
      isUpgrade,
      paymentRef,
    });
    await db.execute(
      sql`INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name, details, created_at)
        VALUES (${0}, ${providerLabel}, ${actionType}, ${"payment"}, ${userId}, ${buyer?.name || "Aluno " + userId}, ${details}, ${new Date().toISOString()})`,
    );
  } catch (logErr: any) {
    console.error("[fulfill] Audit log error:", logErr.message);
  }

  // ─── 6. Auto-cashback (renovação = 10% fixo | nova compra = % por plano) ──────
  try {
    const { CASHBACK_RATES } = await import("./stripe-plans");
    const RENEWAL_CASHBACK = 0.1;
    const cashbackRate = isRenewal ? RENEWAL_CASHBACK : CASHBACK_RATES[planKey as PlanKey] || 0;
    if (cashbackRate > 0 && amountPaid > 0) {
      const cashbackRef = "cashback_" + paymentRef;
      const existingCashback = await db.execute(
        sql`SELECT id FROM credit_transactions WHERE reference_id = ${cashbackRef} LIMIT 1`,
      );
      if ((existingCashback as any).rows?.length === 0) {
        const cashbackAmount = Math.floor(amountPaid * cashbackRate);
        const label = isRenewal
          ? `Cashback 10% renovação ${plan.name}`
          : `Cashback ${Math.round(cashbackRate * 100)}% ${plan.name}`;
        const expiresAt = new Date(Date.now() + 180 * 86400000).toISOString();
        await db.execute(
          sql`INSERT INTO credit_transactions (user_id, type, amount, description, reference_id, created_at, expires_at)
            VALUES (${userId}, 'cashback', ${cashbackAmount}, ${label}, ${cashbackRef}, ${new Date().toISOString()}, ${expiresAt})`,
        );
        console.log(`[fulfill] ${isRenewal ? "RENOVAÇÃO " : ""}Cashback ${Math.round(cashbackRate * 100)}% = ${cashbackAmount} centavos para userId ${userId} (expira ${expiresAt})`);
      } else {
        console.log(`[fulfill] Cashback ja processado para ${cashbackRef}`);
      }
    }
  } catch (e: any) {
    console.error("[fulfill] Cashback error:", e.message);
  }

  // ─── 7. Referral credit (bloqueia auto-indicação, idempotente) ────────────────
  try {
    const referralCode = ctx.referralCode;
    if (referralCode && amountPaid > 0) {
      const ref = await db.execute(sql`SELECT user_id FROM referral_codes WHERE code = ${referralCode}`);
      if ((ref as any).rows?.length > 0) {
        const referrerId = (ref as any).rows[0].user_id;
        if (referrerId === userId) {
          console.log(`[fulfill] Self-referral bloqueado para userId ${userId}`);
        } else {
          const referralRef = "referral_" + paymentRef;
          const existingReferral = await db.execute(
            sql`SELECT id FROM credit_transactions WHERE reference_id = ${referralRef} LIMIT 1`,
          );
          if ((existingReferral as any).rows?.length === 0) {
            const referralCredit = Math.floor(amountPaid * 0.1);
            const refExpiresAt = new Date(Date.now() + 180 * 86400000).toISOString();
            await db.execute(
              sql`INSERT INTO credit_transactions (user_id, type, amount, description, reference_id, created_at, expires_at)
                VALUES (${referrerId}, 'referral', ${referralCredit}, ${"Indicação: " + planKey}, ${referralRef}, ${new Date().toISOString()}, ${refExpiresAt})`,
            );
            console.log(`[fulfill] Referral credit ${referralCredit} centavos para referrer userId ${referrerId} (expira ${refExpiresAt})`);
          } else {
            console.log(`[fulfill] Referral credit ja processado para ${referralRef}`);
          }
        }
      }
    }
  } catch (e: any) {
    console.error("[fulfill] Referral credit error:", e.message);
  }

  // ─── 8. Contrato (pós-pagamento, só em compra nova) ──────────────────────────
  try {
    if (!isUpgrade) {
      // Idempotência: parcelamento e retries do webhook chamam fulfill várias
      // vezes com o mesmo paymentRef. Sem esta checagem, cada chamada inseria um
      // contrato novo (bug herdado do fluxo Stripe, onde nunca disparava porque
      // o Stripe não reenvia o mesmo session.id).
      const existingContract = await db.execute(
        sql`SELECT id FROM contracts WHERE stripe_session_id = ${paymentRef} LIMIT 1`,
      );
      if ((existingContract as any).rows?.length > 0) {
        console.log(`[fulfill] Contrato ja existe para ref ${paymentRef} — pulando`);
      } else {
        const { getContractGroup, getContractHTML } = await import("./contract-templates");
        const group = getContractGroup(planKey);
        const contractNow = new Date().toISOString();
        const studentResult = await db.execute(sql`SELECT name, email, phone FROM users WHERE id = ${userId}`);
        const student = (studentResult as any).rows?.[0];
        const contractHtml = getContractHTML(planKey, {
          studentName: student?.name || "N/A",
          studentEmail: student?.email || "N/A",
          studentPhone: student?.phone || "",
          startDate: new Date().toLocaleDateString("pt-BR"),
        });
        await db.execute(
          sql`INSERT INTO contracts (user_id, plan_key, plan_name, amount_paid, status, contract_group, contract_html, accepted_at, stripe_session_id, created_at)
            VALUES (${userId}, ${planKey}, ${plan.name}, ${amountPaid}, 'accepted', ${group}, ${contractHtml}, ${contractNow}, ${paymentRef}, ${contractNow})`,
        );
        console.log(`[fulfill] Contrato aceito automaticamente para userId ${userId} plano ${planKey} grupo ${group} (ref: ${paymentRef})`);
      }
    }
  } catch (e: any) {
    console.error("[fulfill] Contract generation error:", e.message);
  }
}
