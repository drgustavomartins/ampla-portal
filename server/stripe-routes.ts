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
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
if (!STRIPE_WEBHOOK_SECRET) {
  console.error("[STRIPE] AVISO: STRIPE_WEBHOOK_SECRET nao configurado! Webhooks serao rejeitados.");
}

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
    try {
    const { db } = await import("./db");
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
    } catch (e: any) {
      console.error("[GET /api/stripe/upgrade-options]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── POST /api/stripe/create-checkout ─────────────────────────────────────
  // Cria sessão de checkout Stripe para um plano escolhido
  app.post("/api/stripe/create-checkout", async (req: Request, res: Response) => {
    try {
    const { db } = await import("./db");
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

    // Desconto de 10% para quem usa codigo de indicacao valido
    // Regras: sem self-referral, apenas primeira compra (sem plan_paid_at)
    let referralDiscount = 0;
    if (referralCode) {
      const userCheck = await db.execute(sql`SELECT plan_paid_at FROM users WHERE id = ${auth.userId}`);
      const hasPreviousPurchase = !!(userCheck as any).rows?.[0]?.plan_paid_at;
      if (hasPreviousPurchase) {
        console.log(`[checkout] Indicacao bloqueada - usuario ${auth.userId} ja tem compra anterior`);
      } else {
        const refCheck = await db.execute(sql`SELECT user_id FROM referral_codes WHERE UPPER(code) = ${referralCode.trim().toUpperCase()}`);
        const referrerId = (refCheck as any).rows?.[0]?.user_id;
        if (referrerId && referrerId !== auth.userId) {
          referralDiscount = Math.floor(amountToPay * 0.10);
          amountToPay -= referralDiscount;
          console.log(`[checkout] Desconto indicacao 10% = ${referralDiscount} centavos para userId ${auth.userId} (referrer: ${referrerId})`);
        } else if (referrerId === auth.userId) {
          console.log(`[checkout] Self-referral bloqueado para userId ${auth.userId}`);
        }
      }
    }

    // Validar extensao: só para VIP atuais ou passados
    if (planKey === "extensao_acompanhamento") {
      const userCheck = await db.execute(sql`SELECT plan_key FROM users WHERE id = ${auth.userId}`);
      const userPlanKey = (userCheck as any).rows?.[0]?.plan_key;
      const vipPlans = ["vip_online", "vip_presencial", "vip_completo"];
      if (!vipPlans.includes(userPlanKey)) {
        return res.status(400).json({ message: "A Extens\u00e3o de Acompanhamento \u00e9 exclusiva para alunos de Mentoria VIP." });
      }
    }

    // Apply credits if requested — validate balance but only debit after payment confirmation
    let creditDeduction = 0;
    if (creditsToUse && Number.isInteger(creditsToUse) && creditsToUse > 0) {
      const balanceResult = await db.execute(sql`SELECT COALESCE(SUM(amount), 0) as balance FROM credit_transactions WHERE (expires_at IS NULL OR expires_at > NOW()::text OR amount < 0) AND user_id = ${auth.userId}`);
      const balance = Number((balanceResult as any).rows?.[0]?.balance || 0);
      if (creditsToUse > balance) return res.status(400).json({ message: "Saldo de créditos insuficiente" });
      creditDeduction = Math.min(creditsToUse, amountToPay);
      amountToPay -= creditDeduction;

      if (amountToPay <= 0) {
        // Credits cover 100% — debit and activate directly (no Stripe needed)
        const uniqueRef = `checkout_${auth.userId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const now = new Date().toISOString();
        await db.execute(sql`INSERT INTO credit_transactions (user_id, type, amount, description, reference_id, created_at) VALUES (${auth.userId}, 'usage', ${-creditDeduction}, ${'Pagamento integral com creditos: ' + plan.name}, ${uniqueRef}, ${now})`);

        const isHoursPackage = plan.group === "horas" || plan.group === "observacao_extra";
        if (isHoursPackage) {
          if (plan.group === "observacao_extra") {
            // Observacao clinica: somar em clinical_observation_hours
            const addHours = plan.clinicalHours || 0;
            await db.execute(sql`UPDATE users SET clinical_observation_hours = COALESCE(clinical_observation_hours, 0) + ${addHours}, clinical_practice_access = true WHERE id = ${auth.userId}`);
            console.log(`[checkout credits 100%] Adicionadas ${addHours}h observacao para userId ${auth.userId}`);
          } else {
            // Pratica clinica: somar em clinical_practice_hours
            const addHours = plan.practiceHours || 0;
            await db.execute(sql`UPDATE users SET clinical_practice_hours = COALESCE(clinical_practice_hours, 0) + ${addHours}, clinical_practice_access = true WHERE id = ${auth.userId}`);
            console.log(`[checkout credits 100%] Adicionadas ${addHours}h pratica para userId ${auth.userId}`);
          }
        } else {
          // Plano normal: atualizar plan_key, acesso, etc
          const accessExpiry = new Date(Date.now() + plan.accessDays * 86400000).toISOString();
          await db.execute(sql`UPDATE users SET plan_key = ${planKey}, role = 'student', trial_started_at = NULL, plan_paid_at = ${now}, plan_amount_paid = ${plan.price}, approved = true, access_expires_at = ${accessExpiry}, materials_access = true WHERE id = ${auth.userId}`);
        }
        return res.json({ url: null, sessionId: null, paidWithCredits: true });
      } else {
        // Partial credits — do NOT debit now, will debit in webhook after payment confirmed
        upgradeDescription = `${plan.name} (${formatBRL(creditDeduction)} em creditos aplicados)`;
      }
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
    } catch (e: any) {
      console.error("[POST /api/stripe/create-checkout]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── POST /api/stripe/create-trial-checkout ───────────────────────────────
  // Trial de 7 dias: coleta cartão, só cobra no dia 8
  app.post("/api/stripe/create-trial-checkout", async (req: Request, res: Response) => {
    try {
    const { db } = await import("./db");
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
    } catch (e: any) {
      console.error("[POST /api/stripe/create-trial-checkout]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── POST /api/stripe/webhook ──────────────────────────────────────────────
  // Recebe eventos do Stripe e atualiza acesso do aluno
  app.post("/api/stripe/webhook", async (req: Request, res: Response) => {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: "Stripe não configurado" });

    if (!STRIPE_WEBHOOK_SECRET) {
      console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET not configured");
      return res.status(500).json({ message: "Webhook not configured" });
    }

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
      let userId = Number(session.metadata?.userId);
      const planKey = session.metadata?.planKey as PlanKey;
      const isUpgrade = session.metadata?.isUpgrade === "true";
      const isTrialSetup = session.metadata?.action === "trial_start";

      // Fallback: if userId missing (public checkout), look up by customer email
      if (!userId && planKey) {
        const customerEmail = session.customer_details?.email || session.metadata?.email;
        if (customerEmail) {
          const lookup = await db.execute(sql`SELECT id FROM users WHERE email = ${customerEmail} LIMIT 1`);
          userId = Number((lookup as any).rows?.[0]?.id) || 0;
          if (userId) {
            console.log(`[stripe webhook] Public checkout: resolved userId ${userId} from email ${customerEmail}`);
          }
        }
      }

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

        // ─── Provisioning map (shared with admin provision route) ──────────
        const { PLAN_PROVISIONING } = await import("./plan-provisioning");

        const provisioning = PLAN_PROVISIONING[planKey];

        // ─── Calcular datas de mentoria e suporte ─────────────────────────────
        const mentorshipEndDate = provisioning.mentorshipMonths > 0
          ? new Date(Date.now() + provisioning.mentorshipMonths * 30 * 86400000).toISOString().slice(0, 10)
          : null;
        const supportExpiresAt = provisioning.supportMonths > 0
          ? new Date(Date.now() + provisioning.supportMonths * 30 * 86400000).toISOString()
          : accessExpiry;

        // ─── 1. Atualizar campos do usuário ───────────────────────────────────
        const totalHours = plan.clinicalHours + plan.practiceHours;
        const isHorasExtra = plan.group === "horas";

        const isExtensao = planKey === "extensao_acompanhamento";

        if (isHorasExtra) {
          // Horas extras: SOMA ao banco existente, não altera plano/acesso
          await db.execute(sql`
            UPDATE users SET
              stripe_payment_intent_id = ${paymentIntentId},
              plan_amount_paid = COALESCE(plan_amount_paid, 0) + ${amountPaid},
              clinical_practice_access = true,
              clinical_practice_hours = clinical_practice_hours + ${totalHours}
            WHERE id = ${userId}
          `);
        } else if (isExtensao) {
          // Extensão: SOMA meses de mentoria/suporte ao existente
          const extMonths = plan.mentorshipMonths;
          const extMs = extMonths * 30 * 86400000;
          // Buscar datas atuais do aluno
          const currentUser = await db.execute(sql`SELECT support_expires_at, mentorship_end_date FROM users WHERE id = ${userId}`);
          const cu = (currentUser as any).rows?.[0];
          const currentSupport = cu?.support_expires_at ? new Date(cu.support_expires_at).getTime() : 0;
          const currentMentorship = cu?.mentorship_end_date ? new Date(cu.mentorship_end_date).getTime() : 0;
          const nowMs = Date.now();
          // Se já expirou, começa de hoje; se não, soma a partir da data atual
          const newSupportExpiry = new Date(Math.max(currentSupport, nowMs) + extMs).toISOString();
          const newMentorshipEnd = new Date(Math.max(currentMentorship, nowMs) + extMs).toISOString().slice(0, 10);
          await db.execute(sql`
            UPDATE users SET
              stripe_payment_intent_id = ${paymentIntentId},
              plan_amount_paid = COALESCE(plan_amount_paid, 0) + ${amountPaid},
              support_access = true,
              support_expires_at = ${newSupportExpiry},
              mentorship_end_date = ${newMentorshipEnd}
            WHERE id = ${userId}
          `);
          console.log(`[stripe webhook] Extensão de ${extMonths} meses para userId ${userId} | suporte até ${newSupportExpiry} | mentoria até ${newMentorshipEnd}`);
        } else {
          // Plano normal: define tudo do zero (sai do trial)
          await db.execute(sql`
            UPDATE users SET
              plan_key = ${planKey},
              role = 'student',
              trial_started_at = NULL,
              stripe_payment_intent_id = ${paymentIntentId},
              plan_paid_at = ${now},
              plan_amount_paid = ${amountPaid},
              approved = true,
              access_expires_at = ${accessExpiry},
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

        // ─── Debitar creditos usados (so apos pagamento confirmado) ──────
        try {
          const creditsUsed = Number(session.metadata?.creditsUsed || 0);
          if (creditsUsed > 0) {
            const uniqueRef = `webhook_credit_${userId}_${session.id}`;
            // Verificar se ja foi debitado (idempotencia)
            const existing = await db.execute(sql`SELECT id FROM credit_transactions WHERE reference_id = ${uniqueRef} LIMIT 1`);
            if ((existing as any).rows?.length === 0) {
              await db.execute(sql`INSERT INTO credit_transactions (user_id, type, amount, description, reference_id, created_at) VALUES (${userId}, 'usage', ${-creditsUsed}, ${'Creditos aplicados: ' + plan.name}, ${uniqueRef}, ${new Date().toISOString()})`);
              console.log(`[stripe webhook] Creditos debitados: ${creditsUsed} centavos para userId ${userId} (${plan.name})`);
            } else {
              console.log(`[stripe webhook] Creditos ja debitados anteriormente para ${uniqueRef}`);
            }
          }
        } catch (e: any) {
          console.error("[stripe webhook] Credit debit error:", e.message);
        }

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
            const cashbackRef = 'cashback_' + session.id;
            const existingCashback = await db.execute(sql`SELECT id FROM credit_transactions WHERE reference_id = ${cashbackRef} LIMIT 1`);
            if ((existingCashback as any).rows?.length === 0) {
            const cashbackAmount = Math.floor(amountPaid * cashbackRate);
            const label = isRenewal
              ? `Cashback 10% renovação ${plan.name}`
              : `Cashback ${Math.round(cashbackRate * 100)}% ${plan.name}`;
            const expiresAt = new Date(Date.now() + 180 * 86400000).toISOString(); // 6 meses
            await db.execute(sql`INSERT INTO credit_transactions (user_id, type, amount, description, reference_id, created_at, expires_at)
              VALUES (${userId}, 'cashback', ${cashbackAmount}, ${label}, ${cashbackRef}, ${new Date().toISOString()}, ${expiresAt})`);
            console.log(`[stripe webhook] ${isRenewal ? 'RENOVAÇÃO ' : ''}Cashback ${Math.round(cashbackRate * 100)}% = ${cashbackAmount} centavos para userId ${userId} (expira ${expiresAt})`);
            } else {
              console.log(`[stripe webhook] Cashback ja processado para ${cashbackRef}`);
            }
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
              // Bloquear self-referral
              if (referrerId === userId) {
                console.log(`[stripe webhook] Self-referral bloqueado para userId ${userId}`);
              } else {
              const referralRef = 'referral_' + session.id;
              const existingReferral = await db.execute(sql`SELECT id FROM credit_transactions WHERE reference_id = ${referralRef} LIMIT 1`);
              if ((existingReferral as any).rows?.length === 0) {
              const referralCredit = Math.floor(amountPaid * 0.10);
              const refExpiresAt = new Date(Date.now() + 180 * 86400000).toISOString(); // 6 meses
              await db.execute(sql`INSERT INTO credit_transactions (user_id, type, amount, description, reference_id, created_at, expires_at)
                VALUES (${referrerId}, 'referral', ${referralCredit}, ${'Indicação: ' + planKey}, ${referralRef}, ${new Date().toISOString()}, ${refExpiresAt})`);
              console.log(`[stripe webhook] Referral credit ${referralCredit} centavos para referrer userId ${referrerId} (expira ${refExpiresAt})`);
              } else {
                console.log(`[stripe webhook] Referral credit ja processado para ${referralRef}`);
              }
              }
            }
          }
        } catch (e: any) {
          console.error("[stripe webhook] Referral credit error:", e.message);
        }

        // ─── Auto-generate contract ─────────────────────────────────────
        try {
          if (!isUpgrade) {
            const { getContractGroup } = await import("./contract-templates");
            const group = getContractGroup(planKey);
            const now = new Date().toISOString();
            await db.execute(sql`INSERT INTO contracts (user_id, plan_key, plan_name, amount_paid, status, contract_group, created_at)
              VALUES (${userId}, ${planKey}, ${plan.name}, ${amountPaid}, 'active', ${group}, ${now})`);
            console.log(`[stripe webhook] Contrato gerado para userId ${userId} plano ${planKey} grupo ${group}`);
          }
        } catch (e: any) {
          console.error("[stripe webhook] Contract generation error:", e.message);
        }
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const userId = Number(pi.metadata?.userId);
      if (userId) {
        console.warn(`[stripe webhook] Pagamento falhou para userId ${userId}`);

        try {
          // Buscar dados do aluno
          const userResult = await db.execute(sql`SELECT name, email, role, plan_key, approved FROM users WHERE id = ${userId}`);
          const failedUser = (userResult as any).rows?.[0];
          if (!failedUser) {
            console.warn(`[stripe webhook] User ${userId} not found for payment failure`);
          } else {
            // Bloquear acesso: setar access_expires_at para agora (expira imediatamente)
            await db.execute(sql`UPDATE users SET access_expires_at = ${new Date().toISOString()} WHERE id = ${userId}`);
            console.warn(`[stripe webhook] Acesso bloqueado para userId ${userId} (${failedUser.email})`);

            // Registrar no audit log
            await db.execute(sql`INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name, details, created_at)
              VALUES (${0}, ${'Sistema Stripe'}, ${'payment_failed'}, ${'payment'}, ${userId}, ${failedUser.name || 'Aluno'}, ${JSON.stringify({
                paymentIntentId: pi.id,
                error: pi.last_payment_error?.message || 'Cartao recusado',
                planKey: pi.metadata?.planKey || null,
              })}, ${new Date().toISOString()})`);

            // Enviar e-mail de recuperação
            const RESEND_KEY = process.env.RESEND_API_KEY;
            if (RESEND_KEY && failedUser.email) {
              try {
                const { Resend } = await import("resend");
                const resendClient = new Resend(RESEND_KEY);
                await resendClient.emails.send({
                  from: "Dr. Gustavo Martins <gustavo@clinicagustavomartins.com.br>",
                  to: failedUser.email,
                  subject: "Houve um problema com seu pagamento",
                  html: `
                    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1a2e">
                      <h2 style="color:#0A1628;margin-bottom:16px">Olá, ${(failedUser.name || '').split(' ')[0] || 'aluno(a)'}!</h2>
                      <p style="line-height:1.7;color:#333">Identificamos que houve um problema com o pagamento do seu plano na plataforma Ampla Facial.</p>
                      <p style="line-height:1.7;color:#333">Seu acesso foi temporariamente suspenso até a regularização. Para resolver, basta acessar o portal e tentar novamente com outro cartão ou forma de pagamento:</p>
                      <div style="text-align:center;margin:32px 0">
                        <a href="https://portal.amplafacial.com.br/#/planos" style="display:inline-block;padding:14px 36px;background:#D4A843;color:#0A1628;font-weight:bold;text-decoration:none;border-radius:10px;font-family:Georgia,serif">Regularizar pagamento</a>
                      </div>
                      <p style="line-height:1.7;color:#333">Se precisar de ajuda, entre em contato pelo WhatsApp: (21) 99552-3509.</p>
                      <p style="line-height:1.7;color:#333;margin-top:24px">Atenciosamente,<br><strong>Dr. Gustavo Martins</strong><br>Ampla Facial</p>
                    </div>
                  `,
                });
                console.log(`[stripe webhook] Email de falha de pagamento enviado para ${failedUser.email}`);
              } catch (emailErr: any) {
                console.error(`[stripe webhook] Erro ao enviar email de falha:`, emailErr.message);
              }
            }
          }
        } catch (failErr: any) {
          console.error(`[stripe webhook] Erro ao processar falha de pagamento:`, failErr.message);
        }
      }
    }

    // ─── invoice.payment_failed — falha em renovação/cobrança recorrente ─────────
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerEmail = invoice.customer_email;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : (invoice.customer as any)?.id;

      console.warn(`[stripe webhook] invoice.payment_failed | customer: ${customerId} | email: ${customerEmail}`);

      try {
        // Buscar aluno por stripe_customer_id ou email
        let userRow = null;
        if (customerId) {
          const byCustomer = await db.execute(sql`SELECT id, name, email, role, plan_key FROM users WHERE stripe_customer_id = ${customerId} LIMIT 1`);
          userRow = (byCustomer as any).rows?.[0];
        }
        if (!userRow && customerEmail) {
          const byEmail = await db.execute(sql`SELECT id, name, email, role, plan_key FROM users WHERE email = ${customerEmail} LIMIT 1`);
          userRow = (byEmail as any).rows?.[0];
        }

        if (userRow) {
          const failedUserId = userRow.id;

          // Bloquear acesso
          await db.execute(sql`UPDATE users SET access_expires_at = ${new Date().toISOString()} WHERE id = ${failedUserId}`);
          console.warn(`[stripe webhook] Acesso bloqueado por invoice.payment_failed: userId ${failedUserId} (${userRow.email})`);

          // Audit log
          await db.execute(sql`INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name, details, created_at)
            VALUES (${0}, ${'Sistema Stripe'}, ${'invoice_payment_failed'}, ${'payment'}, ${failedUserId}, ${userRow.name || 'Aluno'}, ${JSON.stringify({
              invoiceId: invoice.id,
              customerId,
              amountDue: invoice.amount_due,
              attemptCount: invoice.attempt_count,
              nextAttempt: invoice.next_payment_attempt ? new Date((invoice.next_payment_attempt as number) * 1000).toISOString() : null,
              planKey: userRow.plan_key,
            })}, ${new Date().toISOString()})`);

          // E-mail de recuperação
          const RESEND_KEY = process.env.RESEND_API_KEY;
          if (RESEND_KEY && userRow.email) {
            try {
              const { Resend } = await import("resend");
              const resendClient = new Resend(RESEND_KEY);
              const firstName = (userRow.name || '').split(' ')[0] || 'aluno(a)';
              await resendClient.emails.send({
                from: "Dr. Gustavo Martins <gustavo@clinicagustavomartins.com.br>",
                to: userRow.email,
                subject: "Problema na renova\u00e7\u00e3o do seu plano",
                html: `
                  <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1a2e">
                    <h2 style="color:#0A1628;margin-bottom:16px">Ol\u00e1, ${firstName}!</h2>
                    <p style="line-height:1.7;color:#333">A cobran\u00e7a da renova\u00e7\u00e3o do seu plano na Ampla Facial n\u00e3o foi processada com sucesso.</p>
                    <p style="line-height:1.7;color:#333">Seu acesso foi temporariamente suspenso at\u00e9 a regulariza\u00e7\u00e3o. Para resolver, acesse o portal e atualize sua forma de pagamento:</p>
                    <div style="text-align:center;margin:32px 0">
                      <a href="https://portal.amplafacial.com.br/#/planos" style="display:inline-block;padding:14px 36px;background:#D4A843;color:#0A1628;font-weight:bold;text-decoration:none;border-radius:10px;font-family:Georgia,serif">Regularizar pagamento</a>
                    </div>
                    <p style="line-height:1.7;color:#333">Se precisar de ajuda, entre em contato pelo WhatsApp: (21) 99552-3509.</p>
                    <p style="line-height:1.7;color:#333;margin-top:24px">Atenciosamente,<br><strong>Dr. Gustavo Martins</strong><br>Ampla Facial</p>
                  </div>
                `,
              });
              console.log(`[stripe webhook] Email de falha de renova\u00e7\u00e3o enviado para ${userRow.email}`);
            } catch (emailErr: any) {
              console.error(`[stripe webhook] Erro ao enviar email de falha de renova\u00e7\u00e3o:`, emailErr.message);
            }
          }
        } else {
          console.warn(`[stripe webhook] invoice.payment_failed: aluno n\u00e3o encontrado para customer ${customerId} / ${customerEmail}`);
        }
      } catch (invErr: any) {
        console.error(`[stripe webhook] Erro ao processar invoice.payment_failed:`, invErr.message);
      }
    }

    res.json({ received: true });
  });

  // GET /api/cron/abandoned-checkout — send email to users with pending checkouts
  app.get("/api/cron/abandoned-checkout", async (req: Request, res: Response) => {
    const cronSecret = req.headers["x-cron-secret"] || req.query.secret;
    if (cronSecret !== (process.env.CRON_SECRET || "ampla-cron-x8k2m9p4")) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const { db } = await import("./db");
      // Find contracts accepted in last 48h where user hasn't purchased the plan
      const abandoned = await db.execute(sql`
        SELECT c.user_id, c.plan_key, c.accepted_at, u.name, u.email, u.plan_key as current_plan
        FROM contracts c
        JOIN users u ON u.id = c.user_id
        WHERE c.accepted_at > ${new Date(Date.now() - 48 * 3600000).toISOString()}
        AND (u.plan_key IS NULL OR u.plan_key = '' OR u.plan_key != c.plan_key)
        AND u.role != 'admin' AND u.role != 'super_admin'
      `);

      const rows = (abandoned as any).rows || [];
      let sent = 0;

      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      if (!RESEND_API_KEY || rows.length === 0) {
        return res.json({ message: "Nenhum carrinho abandonado", checked: rows.length });
      }

      for (const row of rows) {
        // Check if we already sent this email (avoid spam)
        const alreadySent = await db.execute(sql`SELECT 1 FROM audit_logs WHERE action = 'abandoned_checkout_email' AND target_id = ${row.user_id} AND created_at > ${new Date(Date.now() - 48 * 3600000).toISOString()} LIMIT 1`);
        if ((alreadySent as any).rows?.length > 0) continue;

        const firstName = row.name?.split(" ")[0] || "Aluno";

        // Check if user has credits
        const creditsResult = await db.execute(sql`SELECT COALESCE(SUM(amount), 0) as balance FROM credit_transactions WHERE user_id = ${row.user_id} AND (expires_at IS NULL OR expires_at > NOW()::text OR amount < 0)`);
        const creditBalance = Number((creditsResult as any).rows?.[0]?.balance || 0);
        const creditMsg = creditBalance > 0 ? `\n\nVoce tem R$ ${(creditBalance / 100).toFixed(2).replace(".", ",")} em creditos que serao aplicados automaticamente como desconto.` : "";

        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({
              from: "Ampla Facial <noreply@amplafacial.com.br>",
              to: [row.email],
              subject: `${firstName}, voce deixou seu plano esperando`,
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
                <div style="background:#0A0D14;padding:30px;text-align:center">
                  <h1 style="color:#D4A843;margin:0;font-size:24px">Ampla Facial</h1>
                </div>
                <div style="padding:30px">
                  <p>Oi, ${firstName}!</p>
                  <p>Notei que voce comecou a adquirir um plano na Ampla Facial mas nao finalizou. Aconteceu algum problema?</p>
                  <p>Se tiver qualquer duvida sobre os planos ou sobre o Metodo NaturalUp, estou a disposicao.${creditMsg}</p>
                  <div style="text-align:center;margin:30px 0">
                    <a href="https://portal.amplafacial.com.br/#/planos" style="background:#D4A843;color:#0A0D14;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold;display:inline-block">Finalizar minha inscricao</a>
                  </div>
                  <p style="color:#666;font-size:13px">Dr. Gustavo Martins<br>Ampla Facial</p>
                </div>
              </div>`
            }),
          });
          if (emailRes.ok) {
            sent++;
            await db.execute(sql`INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_name, details, created_at) VALUES (${0}, ${'Sistema'}, ${'abandoned_checkout_email'}, ${'user'}, ${row.user_id}, ${row.name || 'Aluno'}, ${'plan: ' + row.plan_key}, ${new Date().toISOString()})`);
          }
        } catch (emailErr: any) {
          console.error("[cron/abandoned] Email error:", emailErr.message);
        }
      }

      res.json({ message: `${sent} emails enviados`, checked: rows.length, sent });
    } catch (e: any) {
      console.error("[cron/abandoned-checkout] Error:", e.message);
      res.status(500).json({ message: "Erro" });
    }
  });

  // ─── GET /api/stripe/my-plan ───────────────────────────────────────────────
  // Retorna info do plano atual do aluno logado
  app.get("/api/stripe/my-plan", async (req: Request, res: Response) => {
    try {
    const { db } = await import("./db");
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
    } catch (e: any) {
      console.error("[GET /api/stripe/my-plan]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });
}

// ─── POST /api/stripe/public-checkout ─────────────────────────────────────────
// Checkout SEM autenticação — cartão OU PIX dinâmico (QR Code automático)
// PIX: Stripe gera QR Code, confirma automaticamente via webhook, sem WhatsApp
export function registerPublicStripeRoutes(app: Express) {
  app.post("/api/stripe/public-checkout", async (req: Request, res: Response) => {
    try {
    const { db } = await import("./db");
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: "Pagamentos não configurados ainda" });

    const { planKey, referralCode, email } = req.body as { planKey: PlanKey; referralCode?: string; email?: string };
    const plan = PLANS[planKey];
    if (!plan) return res.status(400).json({ message: "Plano inválido" });

    // Desconto de 10% para quem usa codigo de indicacao valido
    let finalPrice = plan.price;
    let referralDiscount = 0;
    if (referralCode) {
      const refCheck = await db.execute(sql`SELECT user_id FROM referral_codes WHERE UPPER(code) = ${referralCode.trim().toUpperCase()}`);
      if ((refCheck as any).rows?.length > 0) {
        referralDiscount = Math.floor(finalPrice * 0.10);
        finalPrice -= referralDiscount;
        console.log(`[public-checkout] Desconto indicacao 10% = ${referralDiscount} centavos`);
      }
    }

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
        metadata: { planKey, source: "public_checkout", email: email || "" },
      },
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `Ampla Facial — ${plan.name}${referralDiscount > 0 ? ' (10% indicacao)' : ''}`,
              description: plan.features.slice(0, 3).join(" · "),
              metadata: { planKey },
            },
            unit_amount: finalPrice,
          },
          quantity: 1,
        },
      ],
      metadata: { planKey, source: "public_checkout", referralCode: referralCode || "", email: email || "" },
      success_url: `${baseUrl}/#/pagamento/novo?plan=${planKey}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/#/comecar`,
      locale: "pt-BR",
    });

    res.json({ url: session.url, sessionId: session.id });
    } catch (e: any) {
      console.error("[POST /api/stripe/public-checkout]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── GET /api/referral/code ────────────────────────────────────────────────
  app.get("/api/referral/code", async (req: Request, res: Response) => {
    try {
    const { db } = await import("./db");
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });

    const [user] = await db.select().from(users).where(eq(users.id, auth.userId));
    if (!user || !user.planKey) {
      return res.status(403).json({ message: "Apenas alunos com plano ativo têm código de indicação" });
    }

    const code = "AMPLA" + String(user.id).padStart(4, "0");
    const link = `https://portal.amplafacial.com.br/#/comecar?ref=${code}`;
    res.json({ code, link });
    } catch (e: any) {
      console.error("[GET /api/referral/code]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── GET /api/referral/validate?code=XXXX ───────────────────────────────────
  // Valida codigo de indicacao SEM autenticacao (para pagina publica)
  app.get("/api/referral/validate", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const code = (req.query.code as string || "").trim().toUpperCase();
      if (!code) return res.json({ valid: false });

      const result = await db.execute(sql`SELECT rc.user_id, u.name FROM referral_codes rc JOIN users u ON u.id = rc.user_id WHERE UPPER(rc.code) = ${code}`);
      const rows = (result as any).rows || [];
      if (rows.length === 0) return res.json({ valid: false });

      const referrerName = rows[0].name || "";
      // Mostrar apenas primeiro nome para privacidade
      const firstName = referrerName.split(" ")[0];
      res.json({ valid: true, referrerName: firstName, discount: "10%" });
    } catch (err) {
      console.error("[referral/validate]", err);
      res.json({ valid: false });
    }
  });
}
