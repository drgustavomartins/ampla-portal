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

    const { planKey, isUpgrade, creditsToUse, referralCode } = req.body as { planKey: PlanKey; isUpgrade?: boolean; creditsToUse?: number; referralCode?: string };
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

    // Apply credits if requested
    let creditDeduction = 0;
    if (creditsToUse && creditsToUse > 0) {
      const balanceResult = await db.execute(sql`SELECT COALESCE(SUM(amount), 0) as balance FROM credit_transactions WHERE user_id = ${auth.userId}`);
      const balance = Number((balanceResult as any).rows?.[0]?.balance || 0);
      if (creditsToUse > balance) return res.status(400).json({ message: "Saldo de créditos insuficiente" });
      creditDeduction = Math.min(creditsToUse, amountToPay);
      amountToPay -= creditDeduction;
    }

    // If credits cover 100% of the price, skip Stripe and activate directly
    if (amountToPay <= 0) {
      const now = new Date().toISOString();
      const accessExpiry = new Date(Date.now() + plan.accessDays * 86400000).toISOString();
      // Debit credits
      await db.execute(sql`INSERT INTO credit_transactions (user_id, type, amount, description, reference_id, created_at) VALUES (${auth.userId}, 'usage', ${-creditDeduction}, ${'Pagamento integral com créditos: ' + plan.name}, ${'credits_' + Date.now()}, ${now})`);
      // Activate access
      await db.execute(sql`UPDATE users SET plan_key = ${planKey}, plan_paid_at = ${now}, plan_amount_paid = ${plan.price}, approved = true, access_expires_at = ${accessExpiry}, materials_access = true WHERE id = ${auth.userId}`);
      return res.json({ url: null, sessionId: null, paidWithCredits: true });
    }

    // Debit credits now (will be applied regardless of Stripe outcome)
    if (creditDeduction > 0) {
      const now = new Date().toISOString();
      await db.execute(sql`INSERT INTO credit_transactions (user_id, type, amount, description, reference_id, created_at) VALUES (${auth.userId}, 'usage', ${-creditDeduction}, ${'Créditos aplicados: ' + plan.name}, ${'checkout_' + Date.now()}, ${now})`);
      upgradeDescription = `${plan.name} (${formatBRL(creditDeduction)} em créditos aplicados)`;
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
      payment_method_options: {
        card: {
          installments: {
            enabled: true,
          },
        },
      },
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
      metadata: {
        userId: String(user.id),
        planKey,
        isUpgrade: isUpgrade ? "true" : "false",
        trialDays: String(trialDays),
        referralCode: referralCode || "",
        creditsUsed: String(creditDeduction),
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
      payment_method_options: {
        card: {
          installments: {
            enabled: true,
          },
        },
      },
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
        const now = new Date().toISOString();

        // Buscar valor pago e plano anterior (para detectar renovação)
        let amountPaid = plan.price;
        if (session.amount_total) amountPaid = session.amount_total;
        const prevUser = await db.execute(sql`SELECT plan_key FROM users WHERE id = ${userId}`);
        const previousPlanKey = (prevUser as any).rows?.[0]?.plan_key || null;
        const isRenewal = previousPlanKey === planKey;

        // ─── Mapa de módulos por plano ────────────────────────────────────────
        // IDs reais do banco: 6=Boas-vindas, 2=Toxina, 3=Preenchedores,
        //                     5=Bioestimuladores, 7=Moduladores, 4=NaturalUp
        const MODULE_BOAS_VINDAS = 6;
        const MODULE_TOXINA = 2;
        const MODULE_PREENCHEDORES = 3;
        const MODULE_BIOESTIMULADORES = 5;
        const MODULE_MODULADORES = 7;
        const MODULE_NATURALUP = 4;

        const MODULES_4_CORE = [MODULE_BOAS_VINDAS, MODULE_TOXINA, MODULE_PREENCHEDORES, MODULE_BIOESTIMULADORES, MODULE_MODULADORES];
        const MODULES_COMPLETO = [...MODULES_4_CORE, MODULE_NATURALUP];

        // ─── Mapa de materiais por plano ──────────────────────────────────────
        const MAT_TOXINA        = "Toxina Botulínica";
        const MAT_PREENCHEDORES = "Preenchedores Faciais";
        const MAT_BIOESTIM      = "Bioestimuladores de Colágeno";
        const MAT_MODULADORES   = "Moduladores de Matriz Extracelular";
        const MAT_NATURALUP     = "Método NaturalUp®";
        const MATS_4_CORE = [MAT_TOXINA, MAT_PREENCHEDORES, MAT_BIOESTIM, MAT_MODULADORES];
        const MATS_COMPLETO = [...MATS_4_CORE, MAT_NATURALUP];

        type ModuleAccess = { moduleId: number; enabled: boolean };
        type PlanProvisioning = {
          modules: ModuleAccess[];
          materials: string[];
          mentorshipMonths: number;
          supportMonths: number;
        };

        const PLAN_PROVISIONING: Record<string, PlanProvisioning> = {
          modulo_avulso: {
            modules: [MODULE_BOAS_VINDAS].map(id => ({ moduleId: id, enabled: true })),
            materials: [],   // acesso a 1 módulo à escolha — admin confirma qual
            mentorshipMonths: 0,
            supportMonths: 0,
          },
          pacote_completo: {
            modules: MODULES_4_CORE.map(id => ({ moduleId: id, enabled: true })),
            materials: MATS_4_CORE,
            mentorshipMonths: 0,
            supportMonths: 0,
          },
          observador_essencial: {
            modules: MODULES_4_CORE.map(id => ({ moduleId: id, enabled: true })),
            materials: MATS_4_CORE,
            mentorshipMonths: 0,
            supportMonths: 6,
          },
          observador_avancado: {
            modules: MODULES_4_CORE.map(id => ({ moduleId: id, enabled: true })),
            materials: MATS_4_CORE,
            mentorshipMonths: 0,
            supportMonths: 6,
          },
          observador_intensivo: {
            modules: MODULES_4_CORE.map(id => ({ moduleId: id, enabled: true })),
            materials: MATS_4_CORE,
            mentorshipMonths: 0,
            supportMonths: 6,
          },
          imersao: {
            modules: MODULES_4_CORE.map(id => ({ moduleId: id, enabled: true })),
            materials: MATS_4_CORE,
            mentorshipMonths: 3,
            supportMonths: 3,
          },
          vip_online: {
            modules: MODULES_COMPLETO.map(id => ({ moduleId: id, enabled: true })),
            materials: MATS_COMPLETO,
            mentorshipMonths: 6,
            supportMonths: 6,
          },
          vip_presencial: {
            modules: MODULES_COMPLETO.map(id => ({ moduleId: id, enabled: true })),
            materials: MATS_COMPLETO,
            mentorshipMonths: 3,
            supportMonths: 3,
          },
          vip_completo: {
            modules: MODULES_COMPLETO.map(id => ({ moduleId: id, enabled: true })),
            materials: MATS_COMPLETO,
            mentorshipMonths: 6,
            supportMonths: 6,
          },
        };

        const provisioning = PLAN_PROVISIONING[planKey];

        // ─── Calcular datas de mentoria e suporte ─────────────────────────────
        const mentorshipEndDate = provisioning.mentorshipMonths > 0
          ? new Date(Date.now() + provisioning.mentorshipMonths * 30 * 86400000).toISOString().slice(0, 10)
          : null;
        const supportExpiresAt = provisioning.supportMonths > 0
          ? new Date(Date.now() + provisioning.supportMonths * 30 * 86400000).toISOString()
          : accessExpiry;

        // ─── 1. Atualizar campos do usuário ───────────────────────────────────
        await db.execute(sql`
          UPDATE users SET
            plan_key = ${planKey},
            stripe_payment_intent_id = ${paymentIntentId},
            plan_paid_at = ${now},
            plan_amount_paid = ${amountPaid},
            approved = true,
            access_expires_at = ${accessExpiry},
            materials_access = true,
            community_access = true,
            support_access = true,
            support_expires_at = ${supportExpiresAt},
            clinical_practice_access = ${plan.clinicalHours > 0},
            clinical_practice_hours = ${plan.clinicalHours},
            mentorship_start_date = ${provisioning.mentorshipMonths > 0 ? now.slice(0, 10) : null},
            mentorship_end_date = ${mentorshipEndDate}
          WHERE id = ${userId}
        `);

        // ─── 2. Provisionar módulos ───────────────────────────────────────────
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

        // ─── 3. Provisionar materiais ─────────────────────────────────────────
        await db.execute(sql`DELETE FROM user_material_categories WHERE user_id = ${userId}`);
        for (const cat of provisioning.materials) {
          await db.execute(sql`
            INSERT INTO user_material_categories (user_id, category_name, enabled)
            VALUES (${userId}, ${cat}, true)
            ON CONFLICT (user_id, category_name) DO UPDATE SET enabled = true
          `);
        }

        console.log(`[stripe webhook] Aluno ${userId} provisionado no plano ${planKey} até ${accessExpiry} | módulos: ${provisioning.modules.length} | materiais: ${provisioning.materials.length} | mentoria: ${provisioning.mentorshipMonths}m`);

        // Registrar no audit log
        try {
          const buyerResult = await db.execute(sql`SELECT name FROM users WHERE id = ${userId}`);
          const buyer = (buyerResult as any).rows?.[0];
          const actionType = isRenewal ? "plan_renewed" : isUpgrade ? "plan_upgraded" : "plan_purchased";
          const details = JSON.stringify({
            planKey,
            planName: plan.name,
            amountPaid: amountPaid,
            amountFormatted: (amountPaid / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
            isRenewal,
            isUpgrade,
            stripeSession: session.id,
          });
          await db.execute(sql`INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name, details, created_at)
            VALUES (${0}, ${'Sistema Stripe'}, ${actionType}, ${'payment'}, ${userId}, ${buyer?.name || 'Aluno ' + userId}, ${details}, ${new Date().toISOString()})`);
        } catch (logErr: any) {
          console.error("[stripe webhook] Audit log error:", logErr.message);
        }

        // ─── Auto-cashback ──────────────────────────────────────────────
        // Renovação = 10% fixo | Nova compra = % variável por plano
        try {
          const { CASHBACK_RATES } = await import("./stripe-plans");
          const RENEWAL_CASHBACK = 0.10;
          const cashbackRate = isRenewal ? RENEWAL_CASHBACK : (CASHBACK_RATES[planKey as PlanKey] || 0);
          if (cashbackRate > 0 && amountPaid > 0) {
            const cashbackAmount = Math.floor(amountPaid * cashbackRate);
            const label = isRenewal
              ? `Cashback 10% renovação ${plan.name}`
              : `Cashback ${Math.round(cashbackRate * 100)}% ${plan.name}`;
            await db.execute(sql`INSERT INTO credit_transactions (user_id, type, amount, description, reference_id, created_at)
              VALUES (${userId}, 'cashback', ${cashbackAmount}, ${label}, ${session.id}, ${new Date().toISOString()})`);
            console.log(`[stripe webhook] ${isRenewal ? 'RENOVAÇÃO ' : ''}Cashback ${Math.round(cashbackRate * 100)}% = ${cashbackAmount} centavos para userId ${userId}`);
          }
        } catch (e: any) {
          console.error("[stripe webhook] Cashback error:", e.message);
        }

        // ─── Referral credit ────────────────────────────────────────────
        try {
          const referralCode = session.metadata?.referralCode;
          if (referralCode && amountPaid > 0) {
            const ref = await db.execute(sql`SELECT user_id FROM referral_codes WHERE code = ${referralCode}`);
            if ((ref as any).rows?.length > 0) {
              const referrerId = (ref as any).rows[0].user_id;
              const referralCredit = Math.floor(amountPaid * 0.10);
              await db.execute(sql`INSERT INTO credit_transactions (user_id, type, amount, description, reference_id, created_at)
                VALUES (${referrerId}, 'referral', ${referralCredit}, ${'Indicação: ' + planKey}, ${session.id}, ${new Date().toISOString()})`);
              console.log(`[stripe webhook] Referral credit ${referralCredit} centavos para referrer userId ${referrerId}`);
            }
          }
        } catch (e: any) {
          console.error("[stripe webhook] Referral credit error:", e.message);
        }
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

    const { planKey, referralCode } = req.body as { planKey: PlanKey; referralCode?: string };
    const plan = PLANS[planKey];
    if (!plan) return res.status(400).json({ message: "Plano inválido" });

    const baseUrl = process.env.APP_URL || "https://portal.amplafacial.com.br";

    // Aceita cartão + PIX dinâmico nativo do Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      payment_method_options: {
        card: {
          installments: {
            enabled: true,
          },
        },
      },
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
      metadata: { planKey, source: "public_checkout", referralCode: referralCode || "" },
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
