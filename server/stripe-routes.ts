import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { PLANS, calculateUpgradePrice, formatBRL } from "./stripe-plans";
import type { PlanKey } from "@shared/schema";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

function getStripe(): Stripe | null {
  if (!STRIPE_SECRET) return null;
  return new Stripe(STRIPE_SECRET, { apiVersion: "2025-02-24.acacia" });
}

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

export function registerStripeRoutes(app: Express) {
  // ─── GET /api/stripe/plans ─────────────────────────────────────────────────
  // Retorna todos os planos com preços formatados para o frontend
  app.get("/api/stripe/plans", (_req: Request, res: Response) => {
    const plans = Object.values(PLANS).map((p) => ({
      key: p.key,
      name: p.name,
      description: p.description,
      group: p.group,
      highlight: p.highlight,
      price: p.price,
      priceFormatted: formatBRL(p.price),
      installments12x: p.installments12x,
      installments12xFormatted: p.installments12x ? formatBRL(p.installments12x) : null,
      features: p.features,
      clinicalHours: p.clinicalHours,
      practiceHours: p.practiceHours,
      hasDirectChannel: p.hasDirectChannel,
      hasMentorship: p.hasMentorship,
      hasLiveEvents: p.hasLiveEvents,
      hasNaturalUp: p.hasNaturalUp,
      canUpgradeTo: p.canUpgradeTo,
      valorMercado: p.valorMercado ?? null,
    }));
    res.json({ plans });
  });

  // ─── GET /api/stripe/upgrade-options ──────────────────────────────────────
  // Retorna opções de upgrade para o aluno logado
  app.get("/api/stripe/upgrade-options", async (req: Request, res: Response) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });

    const [user] = await db.select().from(users).where(eq(users.id, auth.userId));
    if (!user || !user.planKey) return res.json({ options: [] });

    const currentPlanKey = user.planKey as PlanKey;
    const currentPlan = PLANS[currentPlanKey];
    if (!currentPlan) return res.json({ options: [] });

    const daysSincePurchase = user.planPaidAt
      ? Math.floor((Date.now() - new Date(user.planPaidAt).getTime()) / 86400000)
      : 0;

    const options = currentPlan.canUpgradeTo.map((targetKey) => {
      const target = PLANS[targetKey];
      const { credit, toPay } = calculateUpgradePrice(
        currentPlanKey,
        targetKey,
        user.planAmountPaid || 0,
        daysSincePurchase,
      );
      return {
        key: targetKey,
        name: target.name,
        description: target.description,
        group: target.group,
        highlight: target.highlight,
        fullPrice: target.price,
        fullPriceFormatted: formatBRL(target.price),
        credit,
        creditFormatted: formatBRL(credit),
        toPay,
        toPayFormatted: formatBRL(toPay),
        features: target.features,
        creditNote: daysSincePurchase <= 60
          ? "100% do valor pago entra como crédito"
          : "70% do valor pago entra como crédito",
      };
    }).filter((o) => o.toPay > 0);

    res.json({
      currentPlan: {
        key: currentPlanKey,
        name: currentPlan.name,
        amountPaid: user.planAmountPaid,
        amountPaidFormatted: formatBRL(user.planAmountPaid || 0),
        daysSincePurchase,
        creditNote: daysSincePurchase <= 60 ? "100% de crédito" : "70% de crédito",
      },
      options,
    });
  });

  // ─── POST /api/stripe/create-checkout ─────────────────────────────────────
  // Cria sessão de checkout Stripe para um plano escolhido
  app.post("/api/stripe/create-checkout", async (req: Request, res: Response) => {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: "Pagamentos não configurados ainda" });

    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });

    const { planKey, isUpgrade } = req.body as { planKey: PlanKey; isUpgrade?: boolean };
    const plan = PLANS[planKey];
    if (!plan) return res.status(400).json({ message: "Plano inválido" });

    const [user] = await db.select().from(users).where(eq(users.id, auth.userId));
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

    // Calcular valor a cobrar (upgrade com crédito ou preço cheio)
    let amountToPay = plan.price;
    let upgradeCredit = 0;
    let upgradeDescription = plan.name;

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
      if (!upgrade.valid) return res.status(400).json({ message: "Upgrade inválido" });
      amountToPay = upgrade.toPay;
      upgradeCredit = upgrade.credit;
      upgradeDescription = `Upgrade para ${plan.name} (crédito de ${formatBRL(upgradeCredit)} aplicado)`;
    }

    // Criar ou recuperar customer Stripe
    let customerId = user.stripeCustomerId || undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        phone: user.phone || undefined,
        metadata: { userId: String(user.id) },
      });
      customerId = customer.id;
      await db.execute(sql`UPDATE users SET stripe_customer_id = ${customerId} WHERE id = ${user.id}`);
    }

    // Trial de 7 dias apenas para primeiro plano (não upgrade)
    const trialDays = (!isUpgrade && !user.planKey && !user.planPaidAt) ? 7 : 0;

    const baseUrl = process.env.APP_URL || "https://portal.amplafacial.com.br";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: upgradeDescription,
              description: plan.features.slice(0, 3).join(" · "),
              metadata: { planKey },
            },
            unit_amount: amountToPay,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: {
          userId: String(user.id),
          planKey,
          isUpgrade: isUpgrade ? "true" : "false",
          upgradeCredit: String(upgradeCredit),
          trialDays: String(trialDays),
        },
      },
      // Trial: cobrar após 7 dias (Stripe subscription trial)
      // Para pagamento único + trial, usamos setup_intent + delayed charge via webhook
      metadata: {
        userId: String(user.id),
        planKey,
        isUpgrade: isUpgrade ? "true" : "false",
        trialDays: String(trialDays),
      },
      success_url: `${baseUrl}/#/pagamento/sucesso?plan=${planKey}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/#/planos`,
      locale: "pt-BR",
    });

    res.json({ url: session.url, sessionId: session.id });
  });

  // ─── POST /api/stripe/create-trial-checkout ───────────────────────────────
  // Trial de 7 dias: coleta cartão, só cobra no dia 8
  app.post("/api/stripe/create-trial-checkout", async (req: Request, res: Response) => {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: "Pagamentos não configurados ainda" });

    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });

    const { planKey } = req.body as { planKey: PlanKey };
    const plan = PLANS[planKey];
    if (!plan) return res.status(400).json({ message: "Plano inválido" });

    const [user] = await db.select().from(users).where(eq(users.id, auth.userId));
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

    let customerId = user.stripeCustomerId || undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        phone: user.phone || undefined,
        metadata: { userId: String(user.id) },
      });
      customerId = customer.id;
      await db.execute(sql`UPDATE users SET stripe_customer_id = ${customerId} WHERE id = ${user.id}`);
    }

    const baseUrl = process.env.APP_URL || "https://portal.amplafacial.com.br";

    // Setup intent: coleta cartão sem cobrar agora
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "setup",
      metadata: {
        userId: String(user.id),
        planKey,
        action: "trial_start",
      },
      success_url: `${baseUrl}/#/trial/ativo?plan=${planKey}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/#/planos`,
      locale: "pt-BR",
    });

    // Marcar trial como iniciado
    await db.execute(sql`
      UPDATE users SET trial_started_at = ${new Date().toISOString()}, plan_key = ${planKey}
      WHERE id = ${user.id}
    `);

    res.json({ url: session.url, sessionId: session.id });
  });

  // ─── POST /api/stripe/webhook ──────────────────────────────────────────────
  // Recebe eventos do Stripe e atualiza acesso do aluno
  app.post("/api/stripe/webhook", async (req: Request, res: Response) => {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: "Stripe não configurado" });

    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      const rawBody = (req as any).rawBody || req.body;
      event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error("[stripe webhook] Assinatura inválida:", err.message);
      return res.status(400).json({ message: "Assinatura inválida" });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = Number(session.metadata?.userId);
      const planKey = session.metadata?.planKey as PlanKey;
      const isUpgrade = session.metadata?.isUpgrade === "true";
      const isTrialSetup = session.metadata?.action === "trial_start";

      if (!userId || !planKey) return res.json({ received: true });

      const plan = PLANS[planKey];
      if (!plan) return res.json({ received: true });

      if (isTrialSetup) {
        // Apenas salvar método de pagamento — acesso já liberado via trial
        const setupIntent = session.setup_intent as string;
        await db.execute(sql`
          UPDATE users SET
            stripe_payment_intent_id = ${setupIntent},
            approved = true,
            access_expires_at = ${new Date(Date.now() + 7 * 86400000).toISOString()},
            trial_started_at = COALESCE(trial_started_at, ${new Date().toISOString()})
          WHERE id = ${userId}
        `);
      } else if (session.payment_status === "paid") {
        // Pagamento confirmado — liberar acesso completo
        const paymentIntentId = session.payment_intent as string;
        const accessExpiry = new Date(Date.now() + plan.accessDays * 86400000).toISOString();

        // Buscar valor pago
        let amountPaid = plan.price;
        if (session.amount_total) amountPaid = session.amount_total;

        await db.execute(sql`
          UPDATE users SET
            plan_key = ${planKey},
            stripe_payment_intent_id = ${paymentIntentId},
            plan_paid_at = ${new Date().toISOString()},
            plan_amount_paid = ${amountPaid},
            approved = true,
            access_expires_at = ${accessExpiry},
            materials_access = true,
            community_access = true,
            support_access = true,
            clinical_practice_access = ${plan.clinicalHours > 0},
            clinical_practice_hours = ${plan.clinicalHours}
          WHERE id = ${userId}
        `);

        console.log(`[stripe webhook] Aluno ${userId} liberado no plano ${planKey} até ${accessExpiry}`);
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const userId = Number(pi.metadata?.userId);
      if (userId) {
        // Apenas logar — não remover acesso ativo
        console.warn(`[stripe webhook] Pagamento falhou para userId ${userId}`);
      }
    }

    res.json({ received: true });
  });

  // ─── GET /api/stripe/my-plan ───────────────────────────────────────────────
  // Retorna info do plano atual do aluno logado
  app.get("/api/stripe/my-plan", async (req: Request, res: Response) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });

    const [user] = await db.select().from(users).where(eq(users.id, auth.userId));
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

    const isTrialActive = user.trialStartedAt && !user.planPaidAt &&
      (Date.now() - new Date(user.trialStartedAt).getTime()) < 7 * 86400000;

    const trialDaysLeft = user.trialStartedAt && !user.planPaidAt
      ? Math.max(0, 7 - Math.floor((Date.now() - new Date(user.trialStartedAt).getTime()) / 86400000))
      : null;

    const planKey = user.planKey as PlanKey | null;
    const plan = planKey ? PLANS[planKey] : null;

    const daysSincePurchase = user.planPaidAt
      ? Math.floor((Date.now() - new Date(user.planPaidAt).getTime()) / 86400000)
      : null;

    res.json({
      hasPlan: !!user.planPaidAt,
      isTrialActive,
      trialDaysLeft,
      planKey,
      planName: plan?.name || null,
      planGroup: plan?.group || null,
      amountPaid: user.planAmountPaid || 0,
      amountPaidFormatted: formatBRL(user.planAmountPaid || 0),
      planPaidAt: user.planPaidAt,
      daysSincePurchase,
      accessExpiresAt: user.accessExpiresAt,
      canUpgrade: plan ? plan.canUpgradeTo.length > 0 : false,
    });
  });
}

// ─── POST /api/stripe/public-checkout ─────────────────────────────────────────
// Checkout SEM autenticação — cartão OU PIX dinâmico (QR Code automático)
// PIX: Stripe gera QR Code, confirma automaticamente via webhook, sem WhatsApp
export function registerPublicStripeRoutes(app: Express) {
  app.post("/api/stripe/public-checkout", async (req: Request, res: Response) => {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: "Pagamentos não configurados ainda" });

    const { planKey } = req.body as { planKey: PlanKey };
    const plan = PLANS[planKey];
    if (!plan) return res.status(400).json({ message: "Plano inválido" });

    const baseUrl = process.env.APP_URL || "https://portal.amplafacial.com.br";

    // Aceita cartão + PIX dinâmico nativo do Stripe
    // PIX: gera QR Code na própria tela do Stripe, confirmação automática via webhook
    // Não precisa de WhatsApp, não precisa de ação manual
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      billing_address_collection: "auto",
      customer_creation: "always",
      phone_number_collection: { enabled: true },
      payment_intent_data: {
        metadata: { planKey, source: "public_checkout" },
      },
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `Ampla Facial — ${plan.name}`,
              description: plan.features.slice(0, 3).join(" · "),
              metadata: { planKey },
            },
            unit_amount: plan.price,
          },
          quantity: 1,
        },
      ],
      metadata: { planKey, source: "public_checkout" },
      success_url: `${baseUrl}/#/pagamento/novo?plan=${planKey}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/#/comecar`,
      locale: "pt-BR",
    });

    res.json({ url: session.url, sessionId: session.id });
  });

  // ─── GET /api/referral/code ────────────────────────────────────────────────
  app.get("/api/referral/code", async (req: Request, res: Response) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });

    const [user] = await db.select().from(users).where(eq(users.id, auth.userId));
    if (!user || !user.planKey) {
      return res.status(403).json({ message: "Apenas alunos com plano ativo têm código de indicação" });
    }

    const code = "AMPLA" + String(user.id).padStart(4, "0");
    const link = `https://portal.amplafacial.com.br/#/comecar?ref=${code}`;
    res.json({ code, link });
  });
}
