// Trial com cartão — fluxo de cobrança automática após 7 dias.
//
// Visão geral:
// 1. /api/trial/setup-intent: cria customer Stripe e retorna client_secret de SetupIntent
// 2. /api/trial/confirm-card: recebe payment_method_id (já confirmado client-side) e salva
// 3. /api/trial/cancel: aluno cancela cobrança automática
// 4. /api/cron/trial-charge: cron diário que avisa (dia 5) e cobra (dia 7)

import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { Resend } from "resend";

const JWT_SECRET = process.env.JWT_SECRET!;
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";
const RESEND_KEY = process.env.RESEND_API_KEY || "";

// Plano padrão pré-contratado no trial
const DEFAULT_TRIAL_PLAN_KEY = "acesso_vitalicio";
const DEFAULT_TRIAL_PLAN_PRICE_CENTS = 39700; // R$ 397,00
const DEFAULT_TRIAL_PLAN_NAME = "Plataforma Online";

function getStripe(): Stripe | null {
  if (!STRIPE_SECRET) return null;
  return new Stripe(STRIPE_SECRET, { apiVersion: "2025-02-24.acacia" });
}

function authReq(req: Request): { userId: number; role: string } | null {
  const token = req.cookies?.token || req.headers?.authorization?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return { userId: decoded.userId, role: decoded.role };
  } catch {
    return null;
  }
}

export function registerTrialRoutes(app: Express) {
  // ─── 0. Público: chave pública do Stripe pra inicializar Elements ────────
  app.get("/api/stripe/public-key", (_req, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLIC_KEY || "" });
  });

  // ─── 1. SetupIntent: cliente vai usar pra coletar cartão ──────────────────
  app.post("/api/trial/setup-intent", async (req: Request, res: Response) => {
    try {
      const auth = authReq(req);
      if (!auth) return res.status(401).json({ error: "Não autenticado" });

      const stripe = getStripe();
      if (!stripe) return res.status(500).json({ error: "Stripe não configurado" });

      const { db } = await import("./db");
      const [user] = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1);
      if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

      // Se já tem customer, reutiliza; senão cria
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name || undefined,
          phone: user.phone || undefined,
          metadata: { userId: String(user.id), source: "trial_signup" },
        });
        customerId = customer.id;
        await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id));
      }

      // Cria SetupIntent
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        usage: "off_session", // permite cobrar depois sem o aluno presente
        metadata: { userId: String(user.id), purpose: "trial_card" },
      });

      return res.json({
        clientSecret: setupIntent.client_secret,
        customerId,
      });
    } catch (e: any) {
      console.error("[trial setup-intent]", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // ─── 2. Confirma o cartão: aluno deu cartão, salva payment_method ──────────
  app.post("/api/trial/confirm-card", async (req: Request, res: Response) => {
    try {
      const auth = authReq(req);
      if (!auth) return res.status(401).json({ error: "Não autenticado" });

      const { paymentMethodId, planKey } = req.body || {};
      if (!paymentMethodId) return res.status(400).json({ error: "paymentMethodId obrigatório" });

      const stripe = getStripe();
      if (!stripe) return res.status(500).json({ error: "Stripe não configurado" });

      const { db } = await import("./db");
      const [user] = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1);
      if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
      if (!user.stripeCustomerId) return res.status(400).json({ error: "Customer não criado. Chame setup-intent primeiro." });

      // Anexa payment method ao customer (caso ainda não esteja)
      try {
        await stripe.paymentMethods.attach(paymentMethodId, { customer: user.stripeCustomerId });
      } catch (e: any) {
        // Se já está anexado, ignora
        if (!String(e.message || "").includes("already been attached")) throw e;
      }

      // Define como default
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      // Calcula data de cobrança (7 dias a partir de agora)
      const now = new Date();
      const chargeAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const finalPlanKey = planKey || DEFAULT_TRIAL_PLAN_KEY;

      await db.update(users).set({
        stripePaymentMethodId: paymentMethodId,
        trialPendingChargeAt: chargeAt.toISOString(),
        trialStartedAt: user.trialStartedAt || now.toISOString(),
        accessExpiresAt: chargeAt.toISOString(), // trial expira no momento da cobrança
        planKey: null, // ainda não tem plano ativo
      } as any).where(eq(users.id, user.id));

      return res.json({
        ok: true,
        chargeAt: chargeAt.toISOString(),
        plan: finalPlanKey,
        message: "Cartão salvo. Acesso liberado por 7 dias.",
      });
    } catch (e: any) {
      console.error("[trial confirm-card]", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // ─── 3. Cancelar trial (antes da cobrança automática) ────────────────────
  app.post("/api/trial/cancel", async (req: Request, res: Response) => {
    try {
      const auth = authReq(req);
      if (!auth) return res.status(401).json({ error: "Não autenticado" });

      const { db } = await import("./db");
      const [user] = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1);
      if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

      if (user.trialChargedAt) {
        return res.status(400).json({ error: "Trial já foi cobrado. Cancele o plano normalmente." });
      }

      await db.update(users).set({
        trialCancelledAt: new Date().toISOString(),
        trialPendingChargeAt: null,
      } as any).where(eq(users.id, user.id));

      return res.json({ ok: true, message: "Trial cancelado. Você não será cobrado." });
    } catch (e: any) {
      console.error("[trial cancel]", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // ─── 4. Status do trial (pra UI mostrar contador, status, etc.) ─────────
  app.get("/api/trial/status", async (req: Request, res: Response) => {
    try {
      const auth = authReq(req);
      if (!auth) return res.status(401).json({ error: "Não autenticado" });

      const { db } = await import("./db");
      const [user] = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1);
      if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

      const hasCard = !!user.stripePaymentMethodId;
      const willCharge = !!user.trialPendingChargeAt && !user.trialCancelledAt && !user.trialChargedAt;
      const chargeAt = user.trialPendingChargeAt;
      const cancelled = !!user.trialCancelledAt;
      const charged = !!user.trialChargedAt;

      return res.json({
        hasCard,
        willCharge,
        chargeAt,
        cancelled,
        charged,
        trialPlanName: DEFAULT_TRIAL_PLAN_NAME,
        trialPlanPrice: DEFAULT_TRIAL_PLAN_PRICE_CENTS,
      });
    } catch (e: any) {
      console.error("[trial status]", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // ─── 5. Cron diário: avisa no dia 5 e cobra no dia 7 ────────────────────
  app.post("/api/cron/trial-charge", async (req: Request, res: Response) => {
    try {
      const stripe = getStripe();
      if (!stripe) return res.status(500).json({ error: "Stripe não configurado" });
      const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

      const { db } = await import("./db");

      // Busca trials que vão ser cobrados em até 48h e ainda não receberam aviso
      const warningResult = await db.execute(sql`
        SELECT id, email, name, trial_pending_charge_at
          FROM users
         WHERE trial_pending_charge_at IS NOT NULL
           AND trial_cancelled_at IS NULL
           AND trial_charged_at IS NULL
           AND trial_charge_warning_sent_at IS NULL
           AND trial_pending_charge_at <= NOW() + INTERVAL '48 hours'
           AND trial_pending_charge_at > NOW()
      `);

      let warningsSent = 0;
      for (const row of warningResult.rows as any[]) {
        if (resend) {
          try {
            const chargeDate = new Date(row.trial_pending_charge_at);
            const fmtDate = chargeDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
            await resend.emails.send({
              from: "Ampla Facial <contato@amplafacial.com.br>",
              to: row.email,
              subject: "Seu trial termina em 2 dias — Ampla Facial",
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
                  <h1 style="color: #D4A843; font-size: 22px;">Olá ${row.name?.split(" ")[0] || "aluno(a)"}!</h1>
                  <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">
                    Seu trial gratuito da Ampla Facial termina em 2 dias.
                  </p>
                  <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">
                    Em <strong>${fmtDate}</strong>, vamos cobrar automaticamente o plano <strong>${DEFAULT_TRIAL_PLAN_NAME}</strong> por <strong>R$ 397,00</strong> no cartão que você cadastrou.
                  </p>
                  <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">
                    Se preferir cancelar antes, é só acessar o portal e clicar em "Cancelar trial" no banner. Você não será cobrado.
                  </p>
                  <p style="margin-top: 24px;">
                    <a href="https://portal.amplafacial.com.br" style="background: #D4A843; color: #0A0D14; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; display: inline-block;">Acessar portal</a>
                  </p>
                  <p style="color: #888; font-size: 13px; margin-top: 32px;">
                    — Dr. Gustavo Martins, Ampla Facial
                  </p>
                </div>
              `,
            });
            await db.update(users).set({ trialChargeWarningSentAt: new Date().toISOString() } as any).where(eq(users.id, row.id));
            warningsSent++;
          } catch (e) {
            console.error("[trial-charge] erro enviar aviso:", row.email, e);
          }
        }
      }

      // Busca trials que devem ser cobrados AGORA
      const chargeResult = await db.execute(sql`
        SELECT id, email, name, stripe_customer_id, stripe_payment_method_id
          FROM users
         WHERE trial_pending_charge_at IS NOT NULL
           AND trial_cancelled_at IS NULL
           AND trial_charged_at IS NULL
           AND trial_pending_charge_at <= NOW()
           AND stripe_customer_id IS NOT NULL
           AND stripe_payment_method_id IS NOT NULL
      `);

      let chargedOk = 0;
      let chargedFail = 0;
      for (const row of chargeResult.rows as any[]) {
        try {
          // Cria PaymentIntent off_session
          const pi = await stripe.paymentIntents.create({
            amount: DEFAULT_TRIAL_PLAN_PRICE_CENTS,
            currency: "brl",
            customer: row.stripe_customer_id,
            payment_method: row.stripe_payment_method_id,
            off_session: true,
            confirm: true,
            description: `${DEFAULT_TRIAL_PLAN_NAME} — cobrança automática trial`,
            metadata: { userId: String(row.id), source: "trial_auto_charge", plan: DEFAULT_TRIAL_PLAN_KEY },
          });

          if (pi.status === "succeeded") {
            // Concede o plano
            await db.update(users).set({
              planKey: DEFAULT_TRIAL_PLAN_KEY,
              role: "student",
              approved: true,
              trialChargedAt: new Date().toISOString(),
              accessExpiresAt: null, // vitalício
              planPaidAt: new Date().toISOString(),
              planAmountPaid: DEFAULT_TRIAL_PLAN_PRICE_CENTS,
            } as any).where(eq(users.id, row.id));
            chargedOk++;
          } else {
            console.warn("[trial-charge] status inesperado", row.email, pi.status);
            chargedFail++;
          }
        } catch (e: any) {
          console.error("[trial-charge] falha cobrança:", row.email, e.message);
          chargedFail++;
          // Marca falha pra aluno cair em "trial expirado, precisa atualizar cartão"
          await db.update(users).set({
            accessExpiresAt: new Date().toISOString(), // expira agora
          } as any).where(eq(users.id, row.id));
        }
      }

      return res.json({
        ok: true,
        warningsSent,
        chargedOk,
        chargedFail,
      });
    } catch (e: any) {
      console.error("[cron trial-charge]", e);
      return res.status(500).json({ error: e.message });
    }
  });
}
