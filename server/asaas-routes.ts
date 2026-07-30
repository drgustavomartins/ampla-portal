// ─── Rotas Asaas ──────────────────────────────────────────────────────────────
// Checkout hospedado + webhook. O webhook é uma casca fina: valida o token,
// traduz o payload do Asaas para um PurchaseContext e chama fulfillPurchase()
// — a MESMA função que o webhook do Stripe usa. Zero lógica de negócio duplicada.

import type { Express, Request, Response } from "express";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import {
  PLANS,
  calculateUpgradePrice,
  formatBRL,
  maxInstallmentsFor,
} from "./stripe-plans";
import type { PlanKey } from "@shared/schema";
import jwt from "jsonwebtoken";
import {
  asaasRequest,
  isAsaasConfigured,
  checkoutUrl,
  asaasInstallmentPayload,
  MAX_INSTALLMENTS_NO_INTEREST,
} from "./asaas";
import { fulfillPurchase, type PurchaseContext } from "./fulfill-purchase";

const JWT_SECRET = process.env.JWT_SECRET!;
// Token que o Asaas envia no header `asaas-access-token` de cada webhook.
// Configurado no painel do Asaas (Integrações → Webhooks) e aqui como env var.
const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN || "";

function authenticateRequest(req: Request): { userId: number; role: string } | null {
  let token = (req as any).cookies?.ampla_token;
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) token = authHeader.slice(7);
  }
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
  } catch {
    return null;
  }
}

const BASE_URL = process.env.PUBLIC_BASE_URL || "https://portal.amplafacial.com.br";

/**
 * Calcula o valor final a cobrar aplicando, na ordem: crédito de upgrade,
 * desconto de indicação, cupom e créditos. Recorte fiel do create-checkout do
 * Stripe — mantido idêntico de propósito para que os dois provedores cobrem o
 * mesmo valor. Retorna o valor em centavos + metadados para o externalReference.
 */
async function computeAmountToPay(
  userId: number,
  planKey: PlanKey,
  isUpgrade: boolean,
  creditsToUse: number | undefined,
  referralOrCoupon: string | undefined,
): Promise<
  | { ok: true; amountCents: number; creditsUsedCents: number; referralCode: string | null }
  | { ok: false; status: number; message: string }
> {
  const plan = PLANS[planKey];
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return { ok: false, status: 404, message: "Usuário não encontrado" };

  let amountToPay = plan.price;
  let activeReferralCode: string | null = null;

  if (isUpgrade && user.planKey) {
    const daysSince = user.planPaidAt
      ? Math.floor((Date.now() - new Date(user.planPaidAt).getTime()) / 86400000)
      : 0;
    const upgrade = calculateUpgradePrice(
      user.planKey as PlanKey,
      planKey,
      user.planAmountPaid || 0,
      daysSince,
    );
    if (!upgrade.valid) return { ok: false, status: 400, message: "Upgrade inválido" };
    amountToPay = upgrade.toPay;
  }

  // Indicação (10%, só primeira compra, sem self-referral) OU cupom.
  if (referralOrCoupon) {
    const code = referralOrCoupon.trim().toUpperCase();
    const userCheck = await db.execute(sql`SELECT plan_paid_at FROM users WHERE id = ${userId}`);
    const hasPreviousPurchase = !!(userCheck as any).rows?.[0]?.plan_paid_at;

    let referralDiscount = 0;
    if (!hasPreviousPurchase) {
      const refCheck = await db.execute(sql`SELECT user_id FROM referral_codes WHERE UPPER(code) = ${code}`);
      const referrerId = (refCheck as any).rows?.[0]?.user_id;
      if (referrerId && referrerId !== userId) {
        referralDiscount = Math.floor(amountToPay * 0.1);
        amountToPay -= referralDiscount;
        activeReferralCode = code;
      }
    }

    // Cupom (só se não foi indicação)
    if (referralDiscount === 0) {
      const cup = await db.execute(sql`
        SELECT code, discount_percent, expires_at, plan_keys, max_uses, used_count
        FROM invite_codes
        WHERE UPPER(code) = ${code} AND type = 'discount' AND active = true
      `);
      const c: any = (cup as any).rows?.[0];
      if (c) {
        const expirou = c.expires_at ? new Date(c.expires_at) <= new Date() : false;
        const esgotou = c.max_uses > 0 && c.used_count >= c.max_uses;
        let planoOk = true;
        if (c.plan_keys) {
          try {
            planoOk = (JSON.parse(c.plan_keys) as string[]).includes(planKey);
          } catch {
            planoOk = true;
          }
        }
        if (!expirou && !esgotou && planoOk && c.discount_percent > 0) {
          amountToPay -= Math.floor(amountToPay * (c.discount_percent / 100));
        }
      }
    }
  }

  // Créditos (valida saldo; débito real só no fulfill, pós-pagamento)
  let creditDeduction = 0;
  if (creditsToUse && Number.isInteger(creditsToUse) && creditsToUse > 0) {
    const balanceResult = await db.execute(
      sql`SELECT COALESCE(SUM(amount), 0) as balance FROM credit_transactions WHERE (expires_at IS NULL OR expires_at > NOW()::text OR amount < 0) AND user_id = ${userId}`,
    );
    const balance = Number((balanceResult as any).rows?.[0]?.balance || 0);
    if (creditsToUse > balance) return { ok: false, status: 400, message: "Saldo de créditos insuficiente" };
    creditDeduction = Math.min(creditsToUse, amountToPay);
    amountToPay -= creditDeduction;
  }

  if (amountToPay < 0) amountToPay = 0;
  return { ok: true, amountCents: amountToPay, creditsUsedCents: creditDeduction, referralCode: activeReferralCode };
}

export function registerAsaasRoutes(app: Express) {
  // ─── POST /api/asaas/create-checkout ──────────────────────────────────────────
  app.post("/api/asaas/create-checkout", async (req: Request, res: Response) => {
    try {
      if (!isAsaasConfigured()) {
        return res.status(503).json({ message: "Pagamentos não configurados ainda" });
      }
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });

      const { planKey, isUpgrade, creditsToUse, referralCode } = req.body as {
        planKey: PlanKey;
        isUpgrade?: boolean;
        creditsToUse?: number;
        referralCode?: string;
      };

      const plan = PLANS[planKey];
      if (!plan) return res.status(400).json({ message: "Plano inválido" });
      if ((plan as any).deprecated) {
        return res.status(410).json({ message: "Este plano não está mais disponível para compra." });
      }

      // Extensão: exclusiva para VIP atuais/passados
      if (planKey === "extensao_acompanhamento") {
        const userCheck = await db.execute(sql`SELECT plan_key FROM users WHERE id = ${auth.userId}`);
        const userPlanKey = (userCheck as any).rows?.[0]?.plan_key;
        const vipPlans = ["vip_online", "vip_presencial", "vip_completo"];
        if (!vipPlans.includes(userPlanKey)) {
          return res.status(400).json({ message: "A Extensão de Acompanhamento é exclusiva para alunos de Mentoria VIP." });
        }
      }

      const [user] = await db.select().from(users).where(eq(users.id, auth.userId));
      if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

      const calc = await computeAmountToPay(auth.userId, planKey, !!isUpgrade, creditsToUse, referralCode);
      if (!calc.ok) return res.status(calc.status).json({ message: calc.message });

      const amountReais = calc.amountCents / 100;
      const maxInstallments = maxInstallmentsFor(plan);

      // externalReference carrega tudo que o webhook precisa (equivale ao metadata do Stripe)
      const externalReference = JSON.stringify({
        userId: auth.userId,
        planKey,
        isUpgrade: !!isUpgrade,
        creditsUsed: calc.creditsUsedCents,
        referralCode: calc.referralCode,
      });

      const chargeTypes = maxInstallments > 1 ? ["INSTALLMENT", "DETACHED"] : ["DETACHED"];

      const body: any = {
        billingTypes: ["PIX", "CREDIT_CARD"],
        chargeTypes,
        minutesToExpire: 60,
        externalReference,
        callback: {
          successUrl: `${BASE_URL}/#/pagamento/sucesso?plan=${planKey}`,
          cancelUrl: `${BASE_URL}/#/planos`,
          expiredUrl: `${BASE_URL}/#/planos`,
        },
        items: [
          {
            name: plan.name,
            description: isUpgrade ? `Upgrade para ${plan.name}` : plan.name,
            quantity: 1,
            value: amountReais,
          },
        ],
      };

      // Pré-preenche dados do cliente quando temos
      if (user.name || user.email) {
        body.customerData = {
          name: user.name || undefined,
          email: user.email || undefined,
          phone: (user as any).phone || undefined,
        };
      }

      if (maxInstallments > 1) {
        body.installment = { maxInstallmentCount: maxInstallments };
      }

      const checkout = await asaasRequest<{ id: string; link?: string }>("/checkouts", {
        method: "POST",
        body,
      });

      const url = checkout.link || checkoutUrl(checkout.id);
      const parcela12 = calc.amountCents > 0 && maxInstallments >= MAX_INSTALLMENTS_NO_INTEREST
        ? Math.round(calc.amountCents / MAX_INSTALLMENTS_NO_INTEREST)
        : null;

      return res.json({
        url,
        checkoutId: checkout.id,
        amountCents: calc.amountCents,
        amountFormatted: formatBRL(calc.amountCents),
        maxInstallments,
        installments12xFormatted: parcela12 ? formatBRL(parcela12) : null,
      });
    } catch (e: any) {
      console.error("[POST /api/asaas/create-checkout]", e.message);
      return res.status(500).json({ message: "Erro ao criar checkout: " + e.message });
    }
  });

  // ─── POST /api/asaas/webhook ──────────────────────────────────────────────────
  // Casca fina: valida token, resolve o pagamento e chama fulfillPurchase.
  app.post("/api/asaas/webhook", async (req: Request, res: Response) => {
    // Autenticação por token no header (config no painel do Asaas)
    const receivedToken = req.headers["asaas-access-token"] as string;
    if (ASAAS_WEBHOOK_TOKEN && receivedToken !== ASAAS_WEBHOOK_TOKEN) {
      console.error("[asaas webhook] Token inválido");
      return res.status(401).json({ message: "Token inválido" });
    }

    const event = req.body?.event as string;
    const payment = req.body?.payment;

    // Só nos interessa pagamento confirmado/recebido.
    // PAYMENT_CONFIRMED = cartão aprovado · PAYMENT_RECEIVED = Pix/boleto compensado
    if (event !== "PAYMENT_CONFIRMED" && event !== "PAYMENT_RECEIVED") {
      return res.json({ received: true, ignored: event });
    }
    if (!payment) return res.json({ received: true });

    try {
      // externalReference pode vir no payment ou na installment-mãe.
      let ref = payment.externalReference;
      if (!ref && payment.installment) {
        const inst = await asaasRequest<{ externalReference?: string }>(
          `/installments/${payment.installment}`,
        );
        ref = inst.externalReference;
      }
      if (!ref) {
        console.warn(`[asaas webhook] Pagamento ${payment.id} sem externalReference`);
        return res.json({ received: true });
      }

      let meta: any;
      try {
        meta = JSON.parse(ref);
      } catch {
        console.error(`[asaas webhook] externalReference não é JSON: ${ref}`);
        return res.json({ received: true });
      }

      const userId = Number(meta.userId);
      const planKey = meta.planKey as PlanKey;
      if (!userId || !planKey) return res.json({ received: true });

      // Idempotência: parcelas geram vários PAYMENT_RECEIVED com o mesmo installment.
      // Ancoramos o paymentRef na installment (ou no id da cobrança à vista) para que
      // fulfillPurchase rode uma vez só por compra.
      const paymentRef = String(payment.installment || payment.id);

      const ctx: PurchaseContext = {
        userId,
        planKey,
        amountPaidCents: Math.round(Number(payment.value) * 100) || PLANS[planKey].price,
        isUpgrade: !!meta.isUpgrade,
        creditsUsedCents: Number(meta.creditsUsed || 0),
        referralCode: meta.referralCode || null,
        paymentRef,
        paymentIntentRef: String(payment.id),
        providerLabel: "Sistema Asaas",
      };

      await fulfillPurchase(ctx);
      console.log(`[asaas webhook] ${event} processado | user ${userId} | plano ${planKey} | ref ${paymentRef}`);
      return res.json({ received: true });
    } catch (e: any) {
      console.error("[asaas webhook] Erro:", e.message);
      // 200 mesmo em erro evita retry infinito do Asaas; erro fica logado.
      return res.json({ received: true, error: e.message });
    }
  });
}
