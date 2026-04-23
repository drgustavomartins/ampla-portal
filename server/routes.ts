import type { Express, Request, Response } from "express";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { sql } from "drizzle-orm";
import { storage } from "./storage";
import { registerSchema, trialRegisterSchema, loginSchema, insertModuleSchema, insertLessonSchema } from "@shared/schema";
import { Resend } from "resend";
import multer from "multer";
import { registerStripeRoutes, registerPublicStripeRoutes } from "./stripe-routes";
import { registerLiveEventsRoutes } from "./live-events-routes";

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens JPG, PNG ou WebP'));
    }
  }
});

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendWelcomeEmail(user: { name: string; email: string }) {
  if (!resend) return;
  const firstName = user.name.split(" ")[0];
  try {
    await resend.emails.send({
      from: "Dr. Gustavo Martins <gustavo@clinicagustavomartins.com.br>",
      to: user.email,
      subject: "Seu acesso à Ampla Facial está ativo — 7 dias para explorar",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0A1628;color:#fff;padding:40px 32px;border-radius:16px">
          <img src="https://portal.amplafacial.com.br/logo-icon.png" alt="Ampla Facial" style="width:72px;display:block;margin:0 auto 24px" />
          <h1 style="text-align:center;color:#D4A843;font-size:22px;margin:0 0 8px">Bem-vindo à Ampla Facial, ${firstName}!</h1>
          <div style="width:48px;height:1px;background:#D4A843;opacity:0.5;margin:0 auto 24px"></div>
          <p style="color:#ccc;font-size:15px;line-height:1.6;margin:0 0 20px">
            Seu teste gratuito de <strong style="color:#D4A843">7 dias</strong> está ativo. Você tem acesso às primeiras aulas de cada módulo — sem cartão de crédito.
          </p>
          <div style="background:#0D1E35;border-radius:12px;padding:20px;margin:0 0 24px">
            <p style="color:#D4A843;font-size:13px;font-weight:bold;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em">O que você pode explorar:</p>
            <ul style="color:#ccc;font-size:14px;line-height:2;margin:0;padding-left:20px">
              <li>Toxina Botulínica — fundamentos e protocolos</li>
              <li>Preenchedores Faciais — reologia e técnica</li>
              <li>Bioestimuladores de Colágeno</li>
              <li>Moduladores de Matriz Extracelular</li>
              <li>Método NaturalUp® (protocolo registrado)</li>
            </ul>
          </div>
          <div style="text-align:center;margin:0 0 24px">
            <a href="https://portal.amplafacial.com.br" style="display:inline-block;background:#D4A843;color:#0A1628;padding:14px 32px;border-radius:10px;font-weight:bold;font-size:15px;text-decoration:none">Acessar a plataforma</a>
          </div>
          <p style="color:#666;font-size:12px;text-align:center;margin:0">
            Dúvidas? Fale comigo pelo WhatsApp: <a href="https://wa.me/5521976310365" style="color:#D4A843">(21) 97631-0365</a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] Erro ao enviar email de boas-vindas:", err);
  }
}

async function sendPasswordResetEmail(user: { name: string; email: string }, token: string) {
  if (!resend) return;
  const firstName = user.name.split(" ")[0];
  const resetLink = `https://portal.amplafacial.com.br/#/reset-password/${token}`;
  try {
    await resend.emails.send({
      from: "Dr. Gustavo Martins <gustavo@clinicagustavomartins.com.br>",
      to: user.email,
      subject: "Redefinição de senha — Ampla Facial",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0A1628;color:#fff;padding:40px 32px;border-radius:16px">
          <img src="https://portal.amplafacial.com.br/logo-icon.png" alt="Ampla Facial" style="width:64px;display:block;margin:0 auto 24px" />
          <h1 style="text-align:center;color:#D4A843;font-size:20px;margin:0 0 20px">Redefinição de senha</h1>
          <p style="color:#ccc;font-size:15px;line-height:1.6;margin:0 0 24px">
            Olá, ${firstName}. Recebemos uma solicitação para redefinir a senha da sua conta na Ampla Facial.
          </p>
          <p style="color:#ccc;font-size:15px;line-height:1.6;margin:0 0 8px">
            Clique no botão abaixo para criar uma nova senha. O link é válido por <strong style="color:#D4A843">1 hora</strong>.
          </p>
          <div style="text-align:center;margin:24px 0">
            <a href="${resetLink}" style="display:inline-block;background:#D4A843;color:#0A1628;padding:14px 32px;border-radius:10px;font-weight:bold;font-size:15px;text-decoration:none">Redefinir senha</a>
          </div>
          <p style="color:#888;font-size:12px;line-height:1.6;margin:0 0 12px">
            Se você não solicitou isso, pode ignorar este email — sua senha continua a mesma.
          </p>
          <p style="color:#555;font-size:11px;word-break:break-all">${resetLink}</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] Erro ao enviar email de reset:", err);
  }
}

async function notifyNewRegistration(user: { name: string; email: string; phone?: string }) {
  if (!resend) return; // silently skip if API key not configured
  try {
    await resend.emails.send({
      from: "Dr. Gustavo Martins <gustavo@clinicagustavomartins.com.br>",
      to: "gustavo.m.martins@outlook.com",
      subject: `🆕 Novo aluno em Trial: ${user.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0A1628;color:#fff;padding:32px;border-radius:12px">
          <div style="color:#D4A843;font-size:20px;font-weight:bold;margin-bottom:24px">Ampla Facial — Novo Aluno em Trial</div>
          <p style="margin:0 0 16px">Um novo aluno se cadastrou e já está em <strong style="color:#D4A843">Trial (7 dias)</strong>:</p>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#999">Nome</td><td style="padding:8px 0;font-weight:bold">${user.name}</td></tr>
            <tr><td style="padding:8px 0;color:#999">Email</td><td style="padding:8px 0">${user.email}</td></tr>
            <tr><td style="padding:8px 0;color:#999">Telefone</td><td style="padding:8px 0">${user.phone || "—"}</td></tr>
          </table>
          <p style="margin-top:16px;color:#999;font-size:13px">O aluno já tem acesso às primeiras aulas de cada módulo. Nenhuma ação necessária — você pode converter para um plano pago a qualquer momento no painel admin.</p>
          <div style="margin-top:24px">
            <a href="https://portal.amplafacial.com.br/#/admin" style="background:#D4A843;color:#0A1628;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Ver no painel admin</a>
          </div>
          <p style="margin-top:24px;font-size:12px;color:#666">portal.amplafacial.com.br</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] Erro ao enviar notificação de cadastro:", err);
  }
}

// In-memory rate limiter for IP-based throttling
const rateLimitStore = new Map<string, { count: number; resetAt: number; first: number }>();
function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs, first: now });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count++;
  return true;
}
// Clean up stale entries periodically
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  });
}, 60000);

// Validate and parse integer route params safely
function safeParseInt(val: string): number | null {
  const n = parseInt(val, 10);
  if (isNaN(n) || n < 0 || n > 2147483647) return null;
  return n;
}

// Validate URL format (prevent stored XSS via javascript: URLs)
function isValidUrl(url: string): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

function authenticateRequest(req: Request): { userId: number; role: string } | null {
  // Try httpOnly cookie first, then fallback to Bearer header
  let token = (req as any).cookies?.ampla_token;
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as unknown as { userId: number; role: string };
    return payload;
  } catch {
    return null;
  }
}

// Require any admin (admin or super_admin)
function requireAdmin(req: Request, res: Response): { userId: number; role: string } | null {
  const auth = authenticateRequest(req);
  if (!auth || (auth.role !== "admin" && auth.role !== "super_admin")) {
    res.status(401).json({ message: "Não autorizado" });
    return null;
  }
  return auth;
}

// Require super_admin specifically
function requireSuperAdmin(req: Request, res: Response): { userId: number; role: string } | null {
  const auth = authenticateRequest(req);
  if (!auth || auth.role !== "super_admin") {
    res.status(403).json({ message: "Acesso restrito ao super admin" });
    return null;
  }
  return auth;
}

// Audit log helper
async function logAction(adminId: number, adminName: string, action: string, targetType?: string, targetId?: number, targetName?: string, details?: any) {
  try {
    await storage.createAuditLog({
      adminId,
      adminName,
      action,
      targetType: targetType || null,
      targetId: targetId || null,
      targetName: targetName || null,
      details: details ? JSON.stringify(details) : null,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}

// Sanitize string input
function sanitize(val: any): string {
  if (typeof val !== "string") return "";
  return val.trim().slice(0, 500);
}

// Known international dialing codes (sorted longest first for matching)
const KNOWN_COUNTRY_CODES = ["351", "595", "598", "55", "54", "57", "56", "52", "34", "39", "81", "1"];

// Strip phone to raw digits. Accepts international country codes.
// For ambiguous numbers (10-11 digits without a recognized prefix),
// assumes Brazilian and prepends 55 — since most users are Brazilian.
function sanitizePhone(val: any): string {
  if (typeof val !== "string") return "";
  let digits = val.replace(/\D/g, "");
  if (!digits) return "";

  // Check if it already starts with a known country code
  const hasKnownPrefix = KNOWN_COUNTRY_CODES.some(cc => digits.startsWith(cc) && digits.length >= cc.length + 7);
  if (hasKnownPrefix) {
    return digits.slice(0, 15); // max 15 digits per E.164
  }

  // Starts with 0 (old Brazilian trunk dialing): strip 0, prepend 55
  if (digits.startsWith("0") && digits.length >= 11) {
    digits = "55" + digits.slice(1);
    return digits.slice(0, 15);
  }

  // 10-11 digits without a known prefix — assume Brazilian DDD
  if (digits.length >= 10 && digits.length <= 11) {
    const ddd = parseInt(digits.slice(0, 2), 10);
    if (ddd >= 11 && ddd <= 99) {
      digits = "55" + digits;
    }
  }

  return digits.slice(0, 15);
}

// Compute lead_source from utm_source
function computeLeadSource(utmSource?: string | null): string {
  if (!utmSource) return "Direto";
  const src = utmSource.toLowerCase();
  if (src === "instagram" || src === "ig") return "Instagram";
  if (src === "facebook" || src === "fb" || src === "meta") return "Meta Ads";
  if (src === "whatsapp" || src === "wa") return "WhatsApp";
  if (src === "google") return "Google";
  if (src === "referral" || src === "indicacao") return "Indicação";
  if (src === "quiz" || src === "questionario") return "Questionário";
  return "Direto";
}

export async function registerRoutes(server: Server, app: Express) {
  // ==================== AUTO-MIGRATE critical columns on startup ====================
  // This ensures new columns exist before any Drizzle query tries to SELECT them.
  // Without this, db.select().from(plans) generates SQL referencing material_topics,
  // which fails if the column doesn't exist yet — causing all plans to "disappear".
  try {
    const { db } = await import("./db");
    await db.execute(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS material_topics TEXT`);
    await db.execute(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0`);
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS materials_access BOOLEAN NOT NULL DEFAULT true`);
    await db.execute(`ALTER TABLE users ALTER COLUMN materials_access SET DEFAULT true`);
    // Ensure all users have materials access
    await db.execute(`UPDATE users SET materials_access = true WHERE materials_access = false`);
    // Mentorship date columns
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mentorship_start_date TEXT`);
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mentorship_end_date TEXT`);
    // User-Module permissions table
    await db.execute(`CREATE TABLE IF NOT EXISTS user_modules (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, module_id INTEGER NOT NULL, enabled BOOLEAN NOT NULL DEFAULT true, start_date TEXT, end_date TEXT, UNIQUE(user_id, module_id))`);
    // User-Material Category permissions table
    await db.execute(`CREATE TABLE IF NOT EXISTS user_material_categories (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, category_title TEXT NOT NULL, enabled BOOLEAN NOT NULL DEFAULT true, UNIQUE(user_id, category_title))`);
    // Material Themes / Subcategories / Files tables
    await db.execute(`CREATE TABLE IF NOT EXISTS material_themes (id SERIAL PRIMARY KEY, title TEXT NOT NULL, cover_url TEXT NOT NULL, "order" INTEGER NOT NULL DEFAULT 0)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS material_subcategories (id SERIAL PRIMARY KEY, theme_id INTEGER NOT NULL, name TEXT NOT NULL, "order" INTEGER NOT NULL DEFAULT 0)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS material_files (id SERIAL PRIMARY KEY, subcategory_id INTEGER NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL, drive_id TEXT NOT NULL, "order" INTEGER NOT NULL DEFAULT 0)`);
    await db.execute(`ALTER TABLE material_files ADD COLUMN IF NOT EXISTS youtube_id TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE material_themes ADD COLUMN IF NOT EXISTS visible BOOLEAN NOT NULL DEFAULT true`).catch(() => {});
    // Stripe payment columns
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_key TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_paid_at TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_amount_paid INTEGER DEFAULT 0`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS selected_theme TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS lgpd_accepted_at TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS module_content_expires_at TEXT`).catch(() => {});
    // UTM tracking columns
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_source TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_medium TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_campaign TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_content TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_term TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS lead_source TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS converted_at TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS landing_page TEXT`).catch(() => {});
    // Tracking events table (WhatsApp clicks, etc.)
    await db.execute(`CREATE TABLE IF NOT EXISTS tracking_events (id SERIAL PRIMARY KEY, event_type TEXT NOT NULL, source_page TEXT, utm_source TEXT, metadata TEXT, created_at TEXT NOT NULL)`).catch(() => {});
    console.log("[auto-migrate] material_topics, order, materials_access, mentorship dates, user_modules, user_material_categories, material_themes/subcategories/files, stripe columns, utm columns ensured");
    // Tabelas de quiz e funil
    await db.execute(`CREATE TABLE IF NOT EXISTS quiz_leads (id SERIAL PRIMARY KEY, nome TEXT NOT NULL, email TEXT NOT NULL, whatsapp TEXT NOT NULL, resultado TEXT NOT NULL, respostas JSONB, created_at TEXT NOT NULL)`).catch(() => {});
    await db.execute(`CREATE TABLE IF NOT EXISTS quiz_clicks (id SERIAL PRIMARY KEY, source TEXT NOT NULL, ip TEXT, user_agent TEXT, created_at TEXT NOT NULL)`).catch(() => {});
    await db.execute(`CREATE TABLE IF NOT EXISTS funnel_events (id SERIAL PRIMARY KEY, session_id TEXT NOT NULL, email TEXT, event TEXT NOT NULL, metadata JSONB, created_at TEXT NOT NULL)`).catch(() => {});
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_funnel_session ON funnel_events(session_id)`).catch(() => {});
    // Credits system tables
    await db.execute(`CREATE TABLE IF NOT EXISTS referral_codes (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL UNIQUE, code TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL)`).catch(() => {});
    await db.execute(`CREATE TABLE IF NOT EXISTS credit_transactions (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, type TEXT NOT NULL, amount INTEGER NOT NULL, description TEXT NOT NULL, reference_id TEXT, created_at TEXT NOT NULL, expires_at TEXT)`).catch(() => {});
    // Adicionar coluna expires_at se nao existir (migracao segura)
    await db.execute(`ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS expires_at TEXT`).catch(() => {});
    // Clinical sessions table
    await db.execute(`CREATE TABLE IF NOT EXISTS clinical_sessions (id SERIAL PRIMARY KEY, student_id INTEGER NOT NULL, session_date TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, duration_hours REAL NOT NULL, procedures TEXT NOT NULL DEFAULT '[]', notes TEXT, status TEXT NOT NULL DEFAULT 'completed', admin_id INTEGER NOT NULL, created_at TEXT NOT NULL)`).catch(() => {});
    // Contracts table
    await db.execute(`CREATE TABLE IF NOT EXISTS contracts (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, plan_key TEXT NOT NULL, plan_name TEXT NOT NULL, amount_paid INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active', signed_at TEXT, created_at TEXT NOT NULL)`).catch(() => {});
    // Contracts — new columns for digital acceptance
    await db.execute(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS accepted_at TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS accepted_ip TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS accepted_user_agent TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_group TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_html TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS stripe_session_id TEXT`).catch(() => {});
    // Community tables
    await db.execute(`CREATE TABLE IF NOT EXISTS community_posts (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, content TEXT NOT NULL, image_urls TEXT DEFAULT '[]', post_type TEXT NOT NULL DEFAULT 'general', likes_count INTEGER NOT NULL DEFAULT 0, comments_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT)`).catch(() => {});
    await db.execute(`CREATE TABLE IF NOT EXISTS community_comments (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, post_id INTEGER, lesson_id INTEGER, parent_comment_id INTEGER, content TEXT NOT NULL, likes_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`).catch(() => {});
    await db.execute(`CREATE TABLE IF NOT EXISTS community_likes (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, post_id INTEGER, comment_id INTEGER, created_at TEXT NOT NULL, UNIQUE(user_id, post_id), UNIQUE(user_id, comment_id))`).catch(() => {});
    await db.execute(`CREATE TABLE IF NOT EXISTS credit_requests (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, action_type TEXT NOT NULL, reference_type TEXT NOT NULL, reference_id INTEGER NOT NULL, amount INTEGER NOT NULL DEFAULT 5000, status TEXT NOT NULL DEFAULT 'pending', admin_note TEXT, created_at TEXT NOT NULL, reviewed_at TEXT, reviewed_by INTEGER)`).catch(() => {});
    // Lead Events (CRM activity timeline)
    await db.execute(`CREATE TABLE IF NOT EXISTS lead_events (id SERIAL PRIMARY KEY, user_id INTEGER, quiz_lead_id INTEGER, event_type TEXT NOT NULL, event_description TEXT NOT NULL, metadata TEXT, created_at TEXT NOT NULL)`).catch(() => {});
    // Invite codes table
    await db.execute(`CREATE TABLE IF NOT EXISTS invite_codes (id SERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, access_type TEXT NOT NULL DEFAULT 'full', duration_days INTEGER NOT NULL DEFAULT 7, campaign TEXT NOT NULL, max_uses INTEGER NOT NULL DEFAULT 0, used_count INTEGER NOT NULL DEFAULT 0, used_by TEXT NOT NULL DEFAULT '[]', active BOOLEAN NOT NULL DEFAULT true, created_by INTEGER NOT NULL, created_at TEXT NOT NULL)`).catch(() => {});
    // Invite code column on users
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code TEXT`).catch(() => {});
    // Site Visitors / Page Visits (visitor tracking)
    await db.execute(`CREATE TABLE IF NOT EXISTS site_visitors (id SERIAL PRIMARY KEY, visitor_id TEXT NOT NULL UNIQUE, user_id INTEGER, utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT, lead_source TEXT, referrer TEXT, first_page TEXT, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL)`).catch(() => {});
    await db.execute(`CREATE TABLE IF NOT EXISTS page_visits (id SERIAL PRIMARY KEY, visitor_id TEXT NOT NULL, page TEXT NOT NULL, referrer TEXT, created_at TEXT NOT NULL)`).catch(() => {});
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_page_visits_visitor ON page_visits(visitor_id)`).catch(() => {});
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_page_visits_created ON page_visits(created_at)`).catch(() => {});
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_site_visitors_created ON site_visitors(created_at)`).catch(() => {});
    // Live events (Acompanhamento quinzenal) — aulona em grupo
    await db.execute(`CREATE TABLE IF NOT EXISTS live_events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      theme TEXT,
      event_date TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 90,
      meet_link TEXT,
      recording_url TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )`).catch(() => {});
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_live_events_date ON live_events(event_date)`).catch(() => {});

    // Presença em acompanhamento + créditos ganhos por participação
    await db.execute(`CREATE TABLE IF NOT EXISTS live_event_attendance (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      attended BOOLEAN NOT NULL DEFAULT false,
      camera_on BOOLEAN NOT NULL DEFAULT false,
      active_participation BOOLEAN NOT NULL DEFAULT false,
      credits_awarded INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      marked_by INTEGER,
      created_at TEXT NOT NULL,
      UNIQUE(event_id, user_id)
    )`).catch(() => {});
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_lea_user ON live_event_attendance(user_id)`).catch(() => {});
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_lea_event ON live_event_attendance(event_id)`).catch(() => {});

    // Casos clínicos discutidos em cada encontro
    await db.execute(`CREATE TABLE IF NOT EXISTS live_event_cases (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      presented_by INTEGER,
      tags TEXT NOT NULL DEFAULT '[]',
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )`).catch(() => {});
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_lec_event ON live_event_cases(event_id)`).catch(() => {});

    // Lessons: content_type, created_at, updated_at (Phase 2 Netflix redesign)
    await db.execute(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'theoretical'`).catch(() => {});
    await db.execute(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS created_at TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS updated_at TEXT`).catch(() => {});

    // Auto-classify existing lessons that still have the default 'theoretical'
    // Idempotent: only touches lessons with content_type = 'theoretical'
    // case_study first (higher priority), then practical
    await db.execute(`UPDATE lessons SET content_type = 'case_study'
      WHERE content_type = 'theoretical' AND (
        LOWER(title) LIKE '%caso clínico%' OR LOWER(title) LIKE '%caso clinico%'
        OR LOWER(title) LIKE '%antes e depois%' OR LOWER(title) LIKE '%antes/depois%'
        OR LOWER(title) LIKE '%case%' OR LOWER(title) LIKE '%resultado%'
        OR LOWER(title) LIKE '%paciente real%'
      )`).catch(() => {});
    await db.execute(`UPDATE lessons SET content_type = 'practical'
      WHERE content_type = 'theoretical' AND (
        LOWER(title) LIKE '%aplicação%' OR LOWER(title) LIKE '%aplicacao%'
        OR LOWER(title) LIKE '%aplicando%' OR LOWER(title) LIKE '%aplicar%'
        OR LOWER(title) LIKE '%procedimento%'
        OR LOWER(title) LIKE '%passo a passo%' OR LOWER(title) LIKE '%passo-a-passo%'
        OR LOWER(title) LIKE '%demonstra%'
        OR LOWER(title) LIKE '%ao vivo%'
        OR LOWER(title) LIKE '%na paciente%' OR LOWER(title) LIKE '%em paciente%'
        OR LOWER(title) LIKE '%atendimento%' OR LOWER(title) LIKE '%atendendo%'
        OR LOWER(title) LIKE '%prática%' OR LOWER(title) LIKE '%pratica%'
        OR LOWER(title) LIKE '%hands-on%' OR LOWER(title) LIKE '%hands on%'
        OR LOWER(title) LIKE '%injeção%' OR LOWER(title) LIKE '%injecao%'
        OR LOWER(title) LIKE '%infiltra%'
      )`).catch(() => {});

    console.log("[auto-migrate] quiz_leads, quiz_clicks, funnel_events, referral_codes, credit_transactions, clinical_sessions, contracts, community, lead_events, invite_codes, site_visitors, page_visits, live_events, live_event_attendance, live_event_cases, lessons content_type/timestamps ensured");
  } catch (e: any) {
    console.error("[auto-migrate] Failed to ensure columns:", e.message);
  }

  // Migration: clinical session signatures
  try {
    const { db } = await import("./db");
    await db.execute(`CREATE TABLE IF NOT EXISTS migrations_applied (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL)`).catch(() => {});
    const csSignMig = await db.execute(sql`SELECT 1 FROM migrations_applied WHERE name = ${'clinical_sessions_signatures'} LIMIT 1`);
    if (!((csSignMig as any).rows?.length > 0)) {
      await db.execute(`ALTER TABLE clinical_sessions ADD COLUMN IF NOT EXISTS patients_count INTEGER NOT NULL DEFAULT 0`);
      await db.execute(`ALTER TABLE clinical_sessions ADD COLUMN IF NOT EXISTS patients_details TEXT NOT NULL DEFAULT '[]'`);
      await db.execute(`ALTER TABLE clinical_sessions ADD COLUMN IF NOT EXISTS student_signed_at TEXT`);
      await db.execute(`ALTER TABLE clinical_sessions ADD COLUMN IF NOT EXISTS student_signed_ip TEXT`);
      await db.execute(`ALTER TABLE clinical_sessions ADD COLUMN IF NOT EXISTS student_signed_user_agent TEXT`);
      await db.execute(`ALTER TABLE clinical_sessions ADD COLUMN IF NOT EXISTS admin_signed_at TEXT`);
      await db.execute(`ALTER TABLE clinical_sessions ADD COLUMN IF NOT EXISTS admin_signed_ip TEXT`);
      await db.execute(sql`INSERT INTO migrations_applied (name, applied_at) VALUES (${'clinical_sessions_signatures'}, ${new Date().toISOString()})`);
      console.log("[auto-migrate] clinical_sessions_signatures applied");
    }
  } catch (e: any) {
    console.error("[auto-migrate] clinical_sessions_signatures failed:", e.message);
  }

  // Migration: rename "Experiência" plan to "Trial" with 7-day duration
  try {
    const { db } = await import("./db");
    const migName = 'rename_experiencia_to_trial';
    const alreadyApplied = await db.execute(sql`SELECT 1 FROM migrations_applied WHERE name = ${migName} LIMIT 1`);
    if (!((alreadyApplied as any).rows?.length > 0)) {
      // Update any existing "Experiência" plan (various accent/case variants) to "Trial"
      await db.execute(sql`UPDATE plans SET name = 'Trial', duration_days = 7, price = 'R$ 0', description = 'Acesso trial de 7 dias ao portal' WHERE LOWER(name) LIKE '%experiencia%' OR LOWER(name) LIKE '%experiência%'`);
      // If no "Trial" plan exists yet, create one
      const trialExists = await db.execute(sql`SELECT 1 FROM plans WHERE LOWER(name) = 'trial' LIMIT 1`);
      if (!((trialExists as any).rows?.length > 0)) {
        await db.execute(sql`INSERT INTO plans (name, description, duration_days, price, "order") VALUES ('Trial', 'Acesso trial de 7 dias ao portal', 7, 'R$ 0', 0)`);
      }
      await db.execute(sql`INSERT INTO migrations_applied (name, applied_at) VALUES (${migName}, ${new Date().toISOString()})`);
      console.log("[auto-migrate] rename_experiencia_to_trial applied");
    }
  } catch (e: any) {
    console.error("[auto-migrate] rename_experiencia_to_trial failed:", e.message);
  }

  // Migration: fix phone numbers missing the +55 Brazilian country code
  try {
    const { db } = await import("./db");
    const migName = 'fix_phone_55_prefix';
    const alreadyApplied = await db.execute(sql`SELECT 1 FROM migrations_applied WHERE name = ${migName} LIMIT 1`);
    if (!((alreadyApplied as any).rows?.length > 0)) {
      // Fix users.phone: 10-11 digit numbers without 55 prefix (Brazilian DDDs 11-99)
      // These are area codes that were mistakenly stored without the country code.
      // E.g. "21976641728" (11 digits) → "5521976641728" (13 digits)
      await db.execute(sql`UPDATE users SET phone = '55' || phone
        WHERE phone IS NOT NULL
        AND phone ~ '^[0-9]+$'
        AND length(phone) >= 10 AND length(phone) <= 11
        AND NOT phone LIKE '55%'
        AND CAST(substring(phone from 1 for 2) AS INTEGER) BETWEEN 11 AND 99`);
      // Also fix numbers that start with 0 (old trunk prefix): 021... → 5521...
      await db.execute(sql`UPDATE users SET phone = '55' || substring(phone from 2)
        WHERE phone IS NOT NULL
        AND phone ~ '^0[0-9]+$'
        AND length(phone) >= 11 AND length(phone) <= 12`);
      // Fix quiz_leads.whatsapp with same logic
      await db.execute(sql`UPDATE quiz_leads SET whatsapp = '55' || whatsapp
        WHERE whatsapp IS NOT NULL
        AND whatsapp ~ '^[0-9]+$'
        AND length(whatsapp) >= 10 AND length(whatsapp) <= 11
        AND NOT whatsapp LIKE '55%'
        AND CAST(substring(whatsapp from 1 for 2) AS INTEGER) BETWEEN 11 AND 99`).catch(() => {});
      await db.execute(sql`INSERT INTO migrations_applied (name, applied_at) VALUES (${migName}, ${new Date().toISOString()})`);
      console.log("[auto-migrate] fix_phone_55_prefix applied");
    }
  } catch (e: any) {
    console.error("[auto-migrate] fix_phone_55_prefix failed:", e.message);
  }

  // ==================== ONE-TIME: Grant all materials access to existing users ====================
  // This migration sets materials_access = true and inserts user_material_categories rows
  // for ALL 6 categories with enabled = true, for every existing user that doesn't already
  // have them. Uses a migrations_applied table to ensure it runs only once — subsequent
  // restarts will skip it, so admin overrides (disabling access) are never reverted.
  try {
    const { db } = await import("./db");
    await db.execute(`CREATE TABLE IF NOT EXISTS migrations_applied (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL)`);
    const migrationName = "grant_all_materials_access_2026_04";
    const already = await db.execute(sql`SELECT 1 FROM migrations_applied WHERE name = ${migrationName} LIMIT 1`);
    const alreadyRows = Array.isArray(already) ? already : (already as any).rows || [];
    if (alreadyRows.length === 0) {
      // 1. Enable materials_access for all existing users who still have it as false
      await db.execute(`UPDATE users SET materials_access = true WHERE materials_access = false`);
      // 2. Insert user_material_categories for all users × all 6 categories (skip existing)
      const categories = [
        "Toxina Botulínica",
        "Preenchedores Faciais",
        "Bioestimuladores de Colágeno",
        "Moduladores de Matriz Extracelular",
        "Método NaturalUp®",
        "IA na Medicina",
      ];
      for (const cat of categories) {
        await db.execute(sql`INSERT INTO user_material_categories (user_id, category_title, enabled) SELECT id, ${cat}, true FROM users WHERE NOT EXISTS (SELECT 1 FROM user_material_categories WHERE user_material_categories.user_id = users.id AND user_material_categories.category_title = ${cat})`);
      }
      // 3. Mark migration as applied
      await db.execute(sql`INSERT INTO migrations_applied (name, applied_at) VALUES (${migrationName}, ${new Date().toISOString()})`);
      console.log("[one-time-migrate] Granted all materials access to existing users");
    } else {
      console.log("[one-time-migrate] grant_all_materials_access already applied, skipping");
    }
  } catch (e: any) {
    console.error("[one-time-migrate] Failed to grant materials access:", e.message);
  }

  // ==================== ONE-TIME: Seed materials into DB ====================
  try {
    const { db } = await import("./db");
    await db.execute(`CREATE TABLE IF NOT EXISTS migrations_applied (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL)`);
    const migrationName = "seed_materials_db_2026_04";
    const already = await db.execute(sql`SELECT 1 FROM migrations_applied WHERE name = ${migrationName} LIMIT 1`);
    const alreadyRows = Array.isArray(already) ? already : (already as any).rows || [];
    if (alreadyRows.length === 0) {
      const themesData = [
        {
          title: "Toxina Botulínica", coverUrl: "/images/covers/cover_toxina_botulinica.png?v=4", order: 1,
          subcategories: [
            { name: "Compilados e Resumos", order: 1, files: [
              { name: "Compilado Toxina Botulínica — Ampla Facial", type: "pdf", driveId: "1AURBQNKIsduh6EBJV1uUfsgkaipm2qry", order: 1 },
              { name: "Apostila Ampla Facial — Outros mecanismos de ação", type: "pdf", driveId: "1vdMtVZhkNHRK8u86RY7Nk5JzF9zP_QEh", order: 2 },
            ]},
            { name: "Artigos Científicos", order: 2, files: [
              { name: "A Review of Complications Due to the Use of Botulinum Toxin A for Cosmetic Indications", type: "pdf", driveId: "1-HNxeYGn1JJm8NijtxtaiaZPzSiFmOv4", order: 1 },
              { name: "Anatomia e avaliação funcional do músculo frontal", type: "pdf", driveId: "1-X7PiWBjt6n8XrAGIVRvSe88_j9GASRX", order: 2 },
              { name: "Botulinum Toxin in Aesthetic Medicine — Myths and Realities", type: "pdf", driveId: "1-O1GXXgI0DC9t5mbvnsGlF586g_KXZzY", order: 3 },
              { name: "Botulinum toxin in the treatment of myofascial pain syndrome", type: "pdf", driveId: "1-UQQMgpAqgR_hy3A4xA8LlbgHXHklq9l", order: 4 },
              { name: "Botulinum Toxin Injection for Facial Wrinkles", type: "pdf", driveId: "1-8x40NvTVS6M4XS3DQsMvO4X2awaY-Cw", order: 5 },
              { name: "Botulinum toxin type A wear-off phenomenon in chronic migraine patients", type: "pdf", driveId: "1-p-5k1NPV5aMZGwG2PPXbWGfFKN5hVqI", order: 6 },
              { name: "Efecto de la toxina botulínica tipo A en la funcionalidad, las sincinesias y la calidad de vida", type: "pdf", driveId: "1-vBlawZ8iWEJKQb-RQP2WeVpgreDtB25", order: 7 },
              { name: "Estudo piloto dos padrões de contração do músculo frontal", type: "pdf", driveId: "1-3D7_dNgTPFUP6kEkNv0_ekXSAK9VyR8", order: 8 },
              { name: "Evaluación de la duración del efecto de la toxina botulínica en la práctica clínica", type: "pdf", driveId: "1-vv12MpHUwOJbdWTr5pr1uRQFzGR3qnb", order: 9 },
              { name: "Global Aesthetics Consensus — Botulinum Toxin Type A — Evidence-Based Review", type: "pdf", driveId: "1-ObpBZgHXtv4R4aA7VQ94WNaWaHJqVIm", order: 10 },
              { name: "Global Aesthetics Consensus — Hyaluronic Acid Fillers and Botulinum Toxin Type A", type: "pdf", driveId: "1-7D1W2BwPOLJWDZwcMtakQpM9k4zloL7", order: 11 },
              { name: "Hipertrofia maseterina unilateral idiopática", type: "pdf", driveId: "1-d7o5bOTy_ywxq2__EkNSB1-P8QhftMD", order: 12 },
              { name: "La toxina botulínica como adyuvante en el tratamiento de la sonrisa gingival", type: "pdf", driveId: "1-BzZt4_jqBzPCWy1tnh2c4MX0zHBPpEu", order: 13 },
              { name: "The history of botulinum toxin in Brazil", type: "pdf", driveId: "1-3Y1n4HJLdp778ycX53_XS979ENA78uy", order: 14 },
              { name: "Tolerancia inmune al tratamiento con toxina botulínica tipo A", type: "pdf", driveId: "1-BEciSjBVSoLSyAblqRT2dRmsjqwXlzU", order: 15 },
              { name: "Toxina Botulínica para el Tratamiento de los Desórdenes Temporomandibulares", type: "pdf", driveId: "1-fYuESlLoSKc4Itx3Q6n4-6N82aE1gZZ", order: 16 },
              { name: "Treatment of Various Types of Gummy Smile With Botulinum Toxin-A", type: "pdf", driveId: "1-bEx9GhpxFAhpSQaYs4WKDUSOqrJXPO2", order: 17 },
              { name: "Use of botulinum toxin type A in temporomandibular disorder", type: "pdf", driveId: "1-TAMpJ5Dk2OtxSwOhECjDgaGnGGQ7B2k", order: 18 },
            ]},
            { name: "Materiais para Pacientes", order: 3, files: [
              { name: "Contrato toxina botulínica", type: "docx", driveId: "1S4j3kicp9FrWBjgL5rUUeKy_wwmrwRs9", order: 1 },
              { name: "Ficha para Toxina", type: "pdf", driveId: "1K3s2R2Q5dTG3Uma0z6WoJEJ6BX7vCONJ", order: 2 },
            ]},
          ],
        },
        {
          title: "Preenchedores Faciais", coverUrl: "/images/covers/cover_preenchedores_faciais.png?v=2", order: 2,
          subcategories: [
            { name: "Compilados e Resumos", order: 1, files: [
              { name: "Revisão sobre reticulação dos AH com comparativos reológicos", type: "pdf", driveId: "1kU7T9IvhGjndK332K7P-qoFk9KFRhkW_", order: 1 },
              { name: "Compilado CPM e Belotero — Ampla Facial", type: "pdf", driveId: "1JD6WGYvuKqLzQZRyLiqTUwKm75965Kt7", order: 2 },
              { name: "Compilado Crosslinkers (DVS, BDDE e PEG) — Ampla Facial", type: "pdf", driveId: "1W_uZQD_T1sdNWsHmVY5KxUiVxUDGNJuI", order: 3 },
              { name: "Compilado Processo de Fabricação — Ampla Facial", type: "pdf", driveId: "1L8i8gdiPPkJWV9QaTdy_zhgDhWoqsPJo", order: 4 },
              { name: "Compilado Reologia e Propriedades Físicas — Ampla Facial", type: "pdf", driveId: "1iM3ozs7b2R-86dXns70RvaUEFq7JPkF7", order: 5 },
              { name: "Compilado Degradação e Longevidade — Ampla Facial", type: "pdf", driveId: "1IvmnMPSu4iVCBlnF06NcryKeKIo5OG8w", order: 6 },
              { name: "Compilado Segurança e Complicações — Ampla Facial", type: "pdf", driveId: "1dSgYgEWiCjZD_a54yYt-Vv_0IvznoKWq", order: 7 },
              { name: "Compilado Revisões Gerais e Perspectivas — Ampla Facial", type: "pdf", driveId: "1N6RU6wlN2PG7s1oB9ObWboSsVDwxa4rS", order: 8 },
            ]},
            { name: "Artigos — Tecnologia CPM e Belotero", order: 2, files: [
              { name: "Sattler 2025 — CPM-HA Adverse Events NLF", type: "pdf", driveId: "1uRyWVE3c14d7GheeDDdzM0WbsIFKruXS", order: 1 },
              { name: "Gauglitz 2021 — CPM-HA20G Skin Revitalization", type: "pdf", driveId: "151iu1JQHZFKgsGkEjKGWfZ5JyaHTrFuK", order: 2 },
              { name: "Nikolis 2016 — CPM Literature Review", type: "pdf", driveId: "1LTyOmAhTPplFtf0jLQa8FWSZj0xF3gQq", order: 3 },
              { name: "Hanschmann 2019 — CPM-HA20G Early Intervention", type: "pdf", driveId: "1Sp5CH6uNuJpddKbaYhPD16xrxkvj_56G", order: 4 },
              { name: "Vandeputte 2018 — CPM Volume RealWorld", type: "pdf", driveId: "10vUqe9aCvazhpDOwaZisLmx9PejT14Ah", order: 5 },
            ]},
            { name: "Artigos — Crosslinkers (DVS, BDDE e PEG)", order: 3, files: [
              { name: "Chen 2025 — HA Crosslinking Modalities Review", type: "pdf", driveId: "1moLMZOyBFTawLjllz1cbX0QwCO2BvSRY", order: 1 },
              { name: "Wojtkiewicz 2024 — BDDE Harms Scoping Review", type: "pdf", driveId: "1Yoc8-YFUXk-PbNDHiDSYoHdmlIqLns5r", order: 2 },
              { name: "Hinsenkamp 2022 — DVS vs BDDE InVivo", type: "pdf", driveId: "1SUjG-wimVZyUnPRtJD-tcVWqt0jT8TYa", order: 3 },
              { name: "Vilas-Vilela 2019 — DVS BDDE PEG Nanogels", type: "pdf", driveId: "16m__Hz59KskuEZSvy5L4I3H0TNPqNZqE", order: 4 },
              { name: "Zerbinati 2021 — PEG Crosslinked HA Fillers", type: "pdf", driveId: "13Ft5QgkFQ13qezLBwJUkoNZR4WBUrzuG", order: 5 },
              { name: "Tezel 2013 — BDDE Metabolism Review", type: "pdf", driveId: "1zcYt08Y4hymhBF8p3XJZk2IDXnb01Hqu", order: 6 },
              { name: "Luu 2025 — Crosslinker Length Density Skin", type: "pdf", driveId: "1MMhbIha-Dr6CpJJlOqFafmONq5btkUSs", order: 7 },
            ]},
            { name: "Artigos — Processo de Fabricação", order: 4, files: [
              { name: "Hong 2024 — Manufacturing Process HA Fillers", type: "pdf", driveId: "1F2w7IkdUmU6i7a3WgMzFg04coRQzmkJu", order: 1 },
              { name: "Borzacchiello 2024 — HA CMC Composite Hydrogel", type: "pdf", driveId: "1m4T6-mM285PZVULH0QL369m4lmRJGMYJ", order: 2 },
              { name: "Rashid 2024 — Residual Crosslinker GC Analysis", type: "pdf", driveId: "1V1g7xgT7gRnEHwFA4QbzrAf9NJAqRt8z", order: 3 },
              { name: "Cho 2024 — Dispersion Process BDDE Quality", type: "pdf", driveId: "1lHDOy0x18sx8EflFEwVxfCvQhiulqqrL", order: 4 },
              { name: "Yang & Lee 2024 — NMR Structural Analysis HA", type: "pdf", driveId: "1NJ0mV--01y3TqgW1jBoBk-TC8OJejFqy", order: 5 },
            ]},
            { name: "Artigos — Reologia e Propriedades Físicas", order: 5, files: [
              { name: "Soares 2025 — Filler Rheology Future", type: "pdf", driveId: "1z_gh9z_fv_1FfyX6R4Wo6EI06gJlCztc", order: 1 },
              { name: "Micheels 2024 — Injectability 28 Fillers", type: "pdf", driveId: "15V0QXuXJ49RwX95FQoah9T3mUBwb6aS5", order: 2 },
              { name: "Bernardin 2022 — Rheologic Physicochemical Overview", type: "pdf", driveId: "17-Hc5fez-FTzFQJ9r7JBkyGUzlJ7Sawv", order: 3 },
              { name: "Malgapo 2022 — Rheology Clinical Implications", type: "pdf", driveId: "1MBKrtjQ05iLfBKMSpzsO5zoN45cHco-p", order: 4 },
              { name: "Zerbinati 2021 — BDDE Comparative Physicochemical", type: "pdf", driveId: "1VPoXzGGhFec4eE35Vm08uLR_aekgF7IS", order: 5 },
              { name: "Hong 2025 — Conditions Choosing Fillers", type: "pdf", driveId: "1KKZX1D-BGf8tJaXZ4SpMXhfJtitNltHX", order: 6 },
            ]},
            { name: "Artigos — Degradação e Longevidade", order: 6, files: [
              { name: "Hong 2024 — Decomposition InVivo Post HA", type: "pdf", driveId: "1vqLieDBRKo9WZntRVB7Zel9LK4U97ATm", order: 1 },
              { name: "Gallagher 2024 — Hyaluronidase Degradation Kinetics", type: "pdf", driveId: "1Umk9ulBzeLTp1zF5w93W2jRCMcif7SX3", order: 2 },
              { name: "Wollina & Goldman 2023 — Spontaneous Degradation", type: "pdf", driveId: "1ifyTQd8t6roq7MF_Kajy2sOralmyBezj", order: 3 },
              { name: "Foster 2023 — 21 Fillers Hyaluronidase", type: "pdf", driveId: "1VDQpOMQFKYf4fgt7QI-OUKzCl01amWWN", order: 4 },
            ]},
            { name: "Artigos — Segurança e Complicações", order: 7, files: [
              { name: "Arrigoni 2025 — Hyaluronidase Aesthetic Medicine", type: "pdf", driveId: "1BhJzCBysmr_-AN3s3xekOfSxlsUYJOMr", order: 1 },
              { name: "Chakhachiro 2025 — Vascular Occlusion MetaAnalysis", type: "pdf", driveId: "1lTPiPyQVDrTAxz2FEdoFNL6ZkIwaQur7", order: 2 },
              { name: "Baranska 2024 — Late Onset Reactions", type: "pdf", driveId: "17vjlmDgNuLJVWujRefSlgaCyJsfFI71B", order: 3 },
              { name: "Soares 2022 — FIVO Pathophysiology", type: "pdf", driveId: "17tfjc6bhrWqy8Jz8e9qCD_QE7DUXodXi", order: 4 },
              { name: "De Boulle 2016 — Global Consensus Complications", type: "pdf", driveId: "1ip2pcXyk5UumY7-vHl4H7iqyfsHCquAP", order: 5 },
              { name: "Swift 2018 — 10-Point Plan Complications", type: "pdf", driveId: "1qoq_TxREPmIfPhwnF1vKALqw1AWlIcxg", order: 6 },
            ]},
            { name: "Artigos — Revisões Gerais e Perspectivas", order: 8, files: [
              { name: "Schiraldi 2021 — Soft Tissue Fillers Overview", type: "pdf", driveId: "11RPJo52UCFPEZo-GO0WlM_vlecoMHq9I", order: 1 },
              { name: "Guarise 2023 — Crosslinking Parameters Design", type: "pdf", driveId: "1rTzUdOFjJ-qSQn6gwVfCDRKsFib-Y-qs", order: 2 },
              { name: "Akinbiyi 2020 — Better Results Facial Rejuvenation", type: "pdf", driveId: "1Rhsu93o5uOV-XQvyxmb4CfmhYY79G2x0", order: 3 },
              { name: "Peng 2023 — Hydrogel Structure InVivo Performance", type: "pdf", driveId: "1qZDCur848qyaDJvDQG3AQVIJ3x63foAK", order: 4 },
            ]},
          ],
        },
        {
          title: "Bioestimuladores de Colágeno", coverUrl: "/images/covers/cover_bioestimuladores.png?v=2", order: 3,
          subcategories: [
            { name: "Compilados e Resumos", order: 1, files: [
              { name: "Compilado Anti-inflamatórios x Bioestimuladores", type: "pdf", driveId: "1Svq0RTDq0cbgI1U6b5m-OXBN-I1Gv46t", order: 1 },
              { name: "Compilado Radiesse Plus (CaHA-CMC) — Bioestimulação e Mecanotransdução", type: "pdf", driveId: "1bBdy6huD7m6cvi785AFawivDTPNcIjbr", order: 2 },
              { name: "Compilado Mecanismos de Neocolagênese — Evidências sobre Bioestimuladores", type: "pdf", driveId: "1gaM22jyoyEdk_huTiyAiKS10g0M6VdC6", order: 3 },
            ]},
          ],
        },
        {
          title: "Moduladores de Matriz Extracelular", coverUrl: "/images/covers/cover_moduladores_matriz.png?v=3", order: 4,
          subcategories: [],
        },
        {
          title: "Método NaturalUp®", coverUrl: "/images/covers/cover_metodo_naturalup.png?v=2", order: 5,
          subcategories: [
            { name: "Compilados e Resumos", order: 1, files: [
              { name: "Compilado Full Face — Ampla Facial", type: "pdf", driveId: "1wi4rZ7s6bxJHMfpVefo33gaC-Au7roYp", order: 1 },
            ]},
          ],
        },
        {
          title: "IA na Medicina", coverUrl: "/images/covers/cover_ia_medicina.png?v=2", order: 6,
          subcategories: [
            { name: "Compilados e Resumos", order: 1, files: [
              { name: "Compilado IA na Medicina — Ampla Facial", type: "pdf", driveId: "1ZszH0IrVrbh4eW6rdhckEHc4veA0avkN", order: 1 },
            ]},
          ],
        },
      ];
      for (const theme of themesData) {
        const t = await storage.createMaterialTheme({ title: theme.title, coverUrl: theme.coverUrl, order: theme.order });
        for (const sub of theme.subcategories) {
          const s = await storage.createMaterialSubcategory({ themeId: t.id, name: sub.name, order: sub.order });
          for (const file of sub.files) {
            await storage.createMaterialFile({ subcategoryId: s.id, name: file.name, type: file.type, driveId: file.driveId, order: file.order });
          }
        }
      }
      await db.execute(sql`INSERT INTO migrations_applied (name, applied_at) VALUES (${migrationName}, ${new Date().toISOString()})`);
      console.log("[one-time-migrate] Seeded materials into DB");
    } else {
      console.log("[one-time-migrate] seed_materials_db already applied, skipping");
    }
  } catch (e: any) {
    console.error("[one-time-migrate] Failed to seed materials:", e.message);
  }

  // ==================== ONE-TIME: Add Toxina Shorts lesson 2Z9LwcqWohk ====================
  try {
    const { db } = await import("./db");
    await db.execute(`CREATE TABLE IF NOT EXISTS migrations_applied (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL)`);
    const migrationName = "seed_toxina_shorts_2Z9LwcqWohk_2026_04";
    const already = await db.execute(sql`SELECT 1 FROM migrations_applied WHERE name = ${migrationName} LIMIT 1`);
    if (already.rows.length === 0) {
      const exists = await db.execute(`SELECT id FROM lessons WHERE module_id = 2 AND video_url = 'https://youtube.com/shorts/2Z9LwcqWohk' LIMIT 1`);
      if (exists.rows.length === 0) {
        const maxOrder = await db.execute(`SELECT COALESCE(MAX("order"), 0) as max_order FROM lessons WHERE module_id = 2`);
        const nextOrder = (maxOrder.rows[0] as any).max_order + 1;
        await db.execute(`INSERT INTO lessons (module_id, title, description, video_url, duration, "order") VALUES
          (2, 'Toxina Botulínica em paciente — aplicação prática', 'Demonstração prática de aplicação de toxina botulínica em paciente real em ambiente clínico. Veja a técnica de injeção e os detalhes do procedimento.', 'https://youtube.com/shorts/2Z9LwcqWohk', '1:34', ${nextOrder})
        `);
        console.log("[one-time-migrate] Seeded Toxina Shorts lesson 2Z9LwcqWohk");
      }
      await db.execute(sql`INSERT INTO migrations_applied (name, applied_at) VALUES (${migrationName}, ${new Date().toISOString()})`);
    } else {
      console.log("[one-time-migrate] seed_toxina_shorts_2Z9LwcqWohk already applied, skipping");
    }
  } catch (e: any) {
    console.error("[one-time-migrate] Failed to seed Toxina Shorts lesson:", e.message);
  }

  // ==================== ONE-TIME: Add Toxina patient case lesson ====================
  try {
    const { db } = await import("./db");
    await db.execute(`CREATE TABLE IF NOT EXISTS migrations_applied (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL)`);
    const migrationName = "seed_toxina_patient_lesson_2026_04";
    const already = await db.execute(sql`SELECT 1 FROM migrations_applied WHERE name = ${migrationName} LIMIT 1`);
    if (already.rows.length === 0) {
      // Module 2 = Toxina Botulínica, this lesson goes after the existing 26 (order 27)
      const exists = await db.execute(`SELECT id FROM lessons WHERE module_id = 2 AND video_url = 'https://youtu.be/7M53CQwFvK0' LIMIT 1`);
      if (exists.rows.length === 0) {
        await db.execute(`INSERT INTO lessons (module_id, title, description, video_url, duration, "order") VALUES
          (2, 'Toxina Botulínica em paciente — demonstração clínica', 'Demonstração prática de aplicação de toxina botulínica em paciente real. Acompanhe o protocolo de marcação, técnica de injeção e cuidados durante o procedimento em ambiente clínico real.', 'https://youtu.be/7M53CQwFvK0', NULL, 27)
        `);
        console.log("[one-time-migrate] Seeded Toxina patient case lesson");
      }
      await db.execute(sql`INSERT INTO migrations_applied (name, applied_at) VALUES (${migrationName}, ${new Date().toISOString()})`);
    } else {
      console.log("[one-time-migrate] seed_toxina_patient_lesson already applied, skipping");
    }
  } catch (e: any) {
    console.error("[one-time-migrate] Failed to seed Toxina patient lesson:", e.message);
  }

  // ==================== ONE-TIME: Toxina — Terço Superior 60+ NaturalUp ====================
  try {
    const { db } = await import("./db");
    await db.execute(`CREATE TABLE IF NOT EXISTS migrations_applied (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL)`);
    const migrationName = "seed_toxina_tercosuperior_60mais_2026_04";
    const already = await db.execute(sql`SELECT 1 FROM migrations_applied WHERE name = ${migrationName} LIMIT 1`);
    if (already.rows.length === 0) {
      const exists = await db.execute(`SELECT id FROM lessons WHERE module_id = 2 AND video_url = 'https://youtube.com/shorts/2Z9LwcqWohk' LIMIT 1`);
      if (exists.rows.length === 0) {
        await db.execute(`INSERT INTO lessons (module_id, title, description, video_url, duration, "order") VALUES
          (2, 'Protocolo NaturalUp® — Terço Superior em paciente acima de 60 anos', 'Caso clínico real demonstrando o protocolo personalizado de toxina botulínica no terço superior (frontal, glabela e patas de galinha) em paciente acima de 60 anos com histórico de tratamentos prévios. Aborda a leitura individualizada da dinâmica muscular, adaptações de dose e pontos de injeção dentro da metodologia NaturalUp® para preservar expressão e naturalidade em pacientes maduros.', 'https://youtube.com/shorts/2Z9LwcqWohk', NULL, 28)
        `);
        console.log("[one-time-migrate] Seeded Toxina Terço Superior 60+ lesson");
      }
      await db.execute(sql`INSERT INTO migrations_applied (name, applied_at) VALUES (${migrationName}, ${new Date().toISOString()})`);
    } else {
      console.log("[one-time-migrate] seed_toxina_tercosuperior_60mais already applied, skipping");
    }
  } catch (e: any) {
    console.error("[one-time-migrate] Failed to seed Toxina Terço Superior lesson:", e.message);
  }

  // ==================== ONE-TIME: Seed Bioestimuladores lessons ====================
  try {
    const { db } = await import("./db");
    await db.execute(`CREATE TABLE IF NOT EXISTS migrations_applied (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL)`);
    const migrationName = "seed_bioestimuladores_lessons_2026_04";
    const already = await db.execute(sql`SELECT 1 FROM migrations_applied WHERE name = ${migrationName} LIMIT 1`);
    if (already.rows.length === 0) {
      // Module 5 = Bioestimuladores de Colágeno
      const moduleId = 5;
      // Check if lessons already exist for this module
      const existing = await db.execute(`SELECT id FROM lessons WHERE module_id = ${moduleId} LIMIT 1`);
      if (existing.rows.length === 0) {
        await db.execute(`INSERT INTO lessons (module_id, title, description, video_url, duration, "order") VALUES
          (${moduleId}, 'Demonstração de aplicação do Radiesse', 'Demonstração prática da técnica de aplicação do Radiesse (Hidroxiapatita de Cálcio — CaHA), um bioestimulador de colágeno. O vídeo aborda a técnica de aplicação clínica, pontos anatômicos de referência e cuidados durante o procedimento para resultados seguros e progressivos.', 'https://youtu.be/fcSqss0OwuE', NULL, 1),
          (${moduleId}, 'Radiesse Duo vs Radiesse Plus: qual a diferença?', 'Explicação objetiva das diferenças entre as duas apresentações do Radiesse disponíveis no mercado: o Radiesse Duo (com lidocaína) e o Radiesse Plus (formulação concentrada com maior quantidade de CaHA). Aborda indicações clínicas, consistência do produto, comportamento reológico e como escolher a formulação ideal para cada caso.', 'https://youtube.com/shorts/X8DSLPTTdyU', '2:34', 2)
        `);
        console.log("[one-time-migrate] Seeded Bioestimuladores lessons");
      } else {
        console.log("[one-time-migrate] Bioestimuladores module already has lessons, skipping insert");
      }
      await db.execute(sql`INSERT INTO migrations_applied (name, applied_at) VALUES (${migrationName}, ${new Date().toISOString()})`);
    } else {
      console.log("[one-time-migrate] seed_bioestimuladores_lessons already applied, skipping");
    }
  } catch (e: any) {
    console.error("[one-time-migrate] Failed to seed Bioestimuladores lessons:", e.message);
  }

  // Fix coverUrl cache bust para Toxina Botulínica
  try {
    const { db } = await import("./db");
    await db.execute(`CREATE TABLE IF NOT EXISTS migrations_applied (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL)`);
    const migrationName = "fix_toxina_cover_url_v3_2026_04";
    const already = await db.execute(sql`SELECT 1 FROM migrations_applied WHERE name = ${migrationName} LIMIT 1`);
    if (already.rows.length === 0) {
      await db.execute(`UPDATE material_themes SET cover_url = '/images/covers/cover_toxina_botulinica.png?v=4' WHERE title = 'Toxina Botulínica'`);
      await db.execute(sql`INSERT INTO migrations_applied (name, applied_at) VALUES (${migrationName}, ${new Date().toISOString()})`);
      console.log("[one-time-migrate] Updated Toxina Botulínica cover URL to v3");
    } else {
      console.log("[one-time-migrate] fix_toxina_cover_url_v3 already applied, skipping");
    }
  } catch (e: any) {
    console.error("[one-time-migrate] Failed to update toxina cover URL:", e.message);
  }

  // Fix coverUrl cache bust para Moduladores de Matriz Extracelular
  try {
    const { db } = await import("./db");
    await db.execute(`CREATE TABLE IF NOT EXISTS migrations_applied (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL)`);
    const migrationName = "fix_moduladores_cover_url_v3_2026_04";
    const already = await db.execute(sql`SELECT 1 FROM migrations_applied WHERE name = ${migrationName} LIMIT 1`);
    if (already.rows.length === 0) {
      await db.execute(`UPDATE material_themes SET cover_url = '/images/covers/cover_moduladores_matriz.png?v=3' WHERE title = 'Moduladores de Matriz Extracelular'`);
      await db.execute(sql`INSERT INTO migrations_applied (name, applied_at) VALUES (${migrationName}, ${new Date().toISOString()})`);
      console.log("[one-time-migrate] Updated Moduladores cover URL to v3");
    } else {
      console.log("[one-time-migrate] fix_moduladores_cover_url_v3 already applied, skipping");
    }
  } catch (e: any) {
    console.error("[one-time-migrate] Failed to update moduladores cover URL:", e.message);
  }

  // Fix coverUrl v2026 — nomes de arquivo novos para forcar cache bust real no CDN
  try {
    const { db } = await import("./db");
    await db.execute(`CREATE TABLE IF NOT EXISTS migrations_applied (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL)`);
    const migrationName = "fix_all_cover_urls_v2026_04_09";
    const already = await db.execute(sql`SELECT 1 FROM migrations_applied WHERE name = ${migrationName} LIMIT 1`);
    if (already.rows.length === 0) {
      await db.execute(`UPDATE material_themes SET cover_url = '/images/covers/cover_toxina_botulinica_v2026.png' WHERE title = 'Toxina Botulínica'`);
      await db.execute(`UPDATE material_themes SET cover_url = '/images/covers/cover_preenchedores_faciais_v2026.png' WHERE title = 'Preenchedores Faciais'`);
      await db.execute(`UPDATE material_themes SET cover_url = '/images/covers/cover_bioestimuladores_v2026.png' WHERE title = 'Bioestimuladores de Colágeno'`);
      await db.execute(`UPDATE material_themes SET cover_url = '/images/covers/cover_moduladores_matriz_v2026.png' WHERE title = 'Moduladores de Matriz Extracelular'`);
      await db.execute(`UPDATE material_themes SET cover_url = '/images/covers/cover_metodo_naturalup_v2026.png' WHERE title = 'Método NaturalUp®'`);
      await db.execute(sql`INSERT INTO migrations_applied (name, applied_at) VALUES (${migrationName}, ${new Date().toISOString()})`);
      console.log("[one-time-migrate] Updated all cover URLs to v2026 (real filename change for CDN cache bust)");
    } else {
      console.log("[one-time-migrate] fix_all_cover_urls_v2026 already applied, skipping");
    }
  } catch (e: any) {
    console.error("[one-time-migrate] Failed to update cover URLs v2026:", e.message);
  }

  // ==================== QUIZ LEADS ====================

  // Criar tabela de leads do quiz na inicialização
  try {
    const { db } = await import("./db");
    await db.execute(`CREATE TABLE IF NOT EXISTS quiz_leads (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      resultado TEXT NOT NULL,
      respostas JSONB,
      created_at TEXT NOT NULL
    )`);
  } catch (e: any) {
    console.error("[quiz] Failed to create quiz_leads table:", e.message);
  }

  // Tabela de eventos do funil (rastreia cada etapa por fingerprint/email)
  try {
    const { db } = await import("./db");
    await db.execute(`CREATE TABLE IF NOT EXISTS funnel_events (
      id SERIAL PRIMARY KEY,
      session_id TEXT NOT NULL,
      email TEXT,
      event TEXT NOT NULL,
      metadata JSONB,
      created_at TEXT NOT NULL
    )`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_funnel_session ON funnel_events(session_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_funnel_email ON funnel_events(email)`);
  } catch (e: any) {
    console.error("[funnel] Failed to create funnel_events table:", e.message);
  }

  // Migration: clean up orphaned phantom contracts (no valid user data, pre-payment bug)
  try {
    const { db } = await import("./db");
    const migName = 'cleanup_orphaned_contracts_2026_04';
    const alreadyApplied = await db.execute(sql`SELECT 1 FROM migrations_applied WHERE name = ${migName} LIMIT 1`);
    if (!((alreadyApplied as any).rows?.length > 0)) {
      // Contracts #2 (uid 33) and #3 (uid 34) — Imersão, status "active", no user data
      // Contract #8 (uid 51) — Módulo Avulso, no user data
      // Contract #11 (uid 61) — Victor Nobre, Trial user, no Stripe payment
      // Mark as 'cancelled' with note, don't delete (audit trail)
      const orphanedUserIds = [33, 34, 51];
      for (const uid of orphanedUserIds) {
        const userCheck = await db.execute(sql`SELECT id FROM users WHERE id = ${uid} LIMIT 1`);
        if (!((userCheck as any).rows?.length > 0)) {
          await db.execute(sql`UPDATE contracts SET status = 'cancelled' WHERE user_id = ${uid} AND status IN ('active', 'accepted')`);
          console.log(`[cleanup] Cancelled orphaned contracts for non-existent userId ${uid}`);
        }
      }
      // Contract #11 (uid 61, Victor Nobre) — phantom contract, Trial user with no payment
      const victorCheck = await db.execute(sql`SELECT plan_paid_at, stripe_payment_intent_id FROM users WHERE id = 61 LIMIT 1`);
      const victorUser = (victorCheck as any).rows?.[0];
      if (victorUser && !victorUser.plan_paid_at && !victorUser.stripe_payment_intent_id) {
        await db.execute(sql`UPDATE contracts SET status = 'cancelled' WHERE id = 11 AND user_id = 61 AND status = 'accepted'`);
        console.log("[cleanup] Cancelled phantom contract #11 (Victor Nobre, no payment)");
      }
      // NOTE: Contract #12 (uid 12, Dra. Carolina) is NOT orphaned — it was paid with credits
      // (credit transaction: -R$1000, ref checkout_12_1776448863961_g2hs77).
      // Credit-paid contracts legitimately have no stripe_session_id.
      await db.execute(sql`INSERT INTO migrations_applied (name, applied_at) VALUES (${migName}, ${new Date().toISOString()})`);
      console.log("[auto-migrate] cleanup_orphaned_contracts applied");
    }
  } catch (e: any) {
    console.error("[auto-migrate] cleanup_orphaned_contracts failed:", e.message);
  }

  // POST /api/funnel/event — registrar evento do funil
  app.post("/api/funnel/event", async (req, res) => {
    try {
      const trackIp = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || "unknown";
      if (!rateLimit(`tracking:${trackIp}`, 100, 60 * 1000)) {
        return res.status(429).json({ message: "Muitas requisições. Tente novamente em breve." });
      }
      const { db } = await import("./db");
      const { session_id, email, event, metadata } = req.body;
      if (!session_id || !event) return res.status(400).json({ message: "session_id e event são obrigatórios" });
      await db.execute(sql`INSERT INTO funnel_events (session_id, email, event, metadata, created_at) VALUES (${session_id}, ${email || null}, ${event}, ${JSON.stringify(metadata || {})}, ${new Date().toISOString()})`);
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false });
    }
  });

  // GET /api/admin/funnel — listar funil por sessão
  app.get("/api/admin/funnel", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      // Agrupa eventos por session_id, pega o email mais recente e lista eventos
      const result = await db.execute(sql`
        SELECT
          session_id,
          MAX(email) as email,
          json_agg(json_build_object(
            'event', event,
            'metadata', metadata,
            'created_at', created_at
          ) ORDER BY created_at ASC) as events,
          MIN(created_at) as first_seen,
          MAX(created_at) as last_seen
        FROM funnel_events
        GROUP BY session_id
        ORDER BY MAX(created_at) DESC
        LIMIT 200
      `);
      res.json({ sessions: result.rows });
    } catch (e: any) {
      res.status(500).json({ message: "Erro" });
    }
  });

  // POST /api/admin/broadcast-email — envia email para todos os alunos aprovados (super_admin only)
  app.post("/api/admin/broadcast-email", async (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    try {
      const { subject, html, excludeEmails = [] } = req.body;
      if (!subject || !html) return res.status(400).json({ message: "subject e html s\u00e3o obrigat\u00f3rios" });
      if (!resend) return res.status(503).json({ message: "Servi\u00e7o de email n\u00e3o configurado (RESEND_API_KEY ausente)" });
      const { db } = await import("./db");
      const result = await db.execute(sql`SELECT id, name, email FROM users WHERE approved = true AND role NOT IN ('admin','super_admin')`);
      const recipients = result.rows.filter((u: any) => !excludeEmails.includes(u.email));
      const results: any[] = [];
      for (const user of recipients) {
        const personalizedHtml = html.replace(/\[nome\]/gi, (user as any).name?.split(' ')[0] || 'M\u00e9dico(a)');
        try {
          await resend.emails.send({
            from: "Dr. Gustavo Martins <gustavo@clinicagustavomartins.com.br>",
            to: (user as any).email,
            subject,
            html: personalizedHtml,
          });
          results.push({ email: (user as any).email, status: 'sent' });
        } catch (err: any) {
          results.push({ email: (user as any).email, status: 'error', error: err.message });
        }
      }
      const admin = await storage.getUser(auth.userId);
      await logAction(auth.userId, admin?.name || 'Admin', 'broadcast_email', 'email', 0, subject, { total: recipients.length });
      res.json({ sent: results.filter(r => r.status === 'sent').length, failed: results.filter(r => r.status === 'error').length, results });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Tabela de tracking de cliques no banner do quiz
  try {
    const { db } = await import("./db");
    await db.execute(`CREATE TABLE IF NOT EXISTS quiz_clicks (
      id SERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    )`);
  } catch (e: any) {
    console.error("[quiz] Failed to create quiz_clicks table:", e.message);
  }

  // POST /api/quiz/click — registrar clique no banner
  app.post("/api/quiz/click", async (req, res) => {
    try {
      const clickIp = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || "unknown";
      if (!rateLimit(`tracking:${clickIp}`, 100, 60 * 1000)) {
        return res.status(429).json({ message: "Muitas requisições. Tente novamente em breve." });
      }
      const { db } = await import("./db");
      const source = req.body?.source || "unknown";
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "";
      const ua = req.headers["user-agent"] || "";
      await db.execute(sql`INSERT INTO quiz_clicks (source, ip, user_agent, created_at) VALUES (${source}, ${ip}, ${ua}, ${new Date().toISOString()})`);
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false });
    }
  });

  // GET /api/admin/quiz-stats — stats de cliques e conversão
  app.get("/api/admin/quiz-stats", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const clicks = await db.execute(sql`SELECT source, COUNT(*) as total FROM quiz_clicks GROUP BY source ORDER BY total DESC`);
      const totalClicks = await db.execute(sql`SELECT COUNT(*) as total FROM quiz_clicks`);
      const totalLeads = await db.execute(sql`SELECT COUNT(*) as total FROM quiz_leads`);
      res.json({
        totalClicks: Number(totalClicks.rows[0]?.total || 0),
        totalLeads: Number(totalLeads.rows[0]?.total || 0),
        bySource: clicks.rows,
      });
    } catch (e: any) {
      res.status(500).json({ message: "Erro" });
    }
  });

  // POST /api/quiz/lead — salvar lead do quiz
  app.post("/api/quiz/lead", async (req, res) => {
    // Rate limit: 5 leads per IP per 15 minutes
    const quizIp = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || "unknown";
    const quizRlKey = `quiz_lead_${quizIp}`;
    const quizRl = rateLimitStore.get(quizRlKey);
    if (quizRl && quizRl.count >= 5 && Date.now() - quizRl.first < 900000) {
      return res.status(429).json({ message: "Muitas tentativas. Aguarde alguns minutos." });
    }
    if (!quizRl || Date.now() - quizRl.first >= 900000) {
      rateLimitStore.set(quizRlKey, { count: 1, first: Date.now(), resetAt: Date.now() + 900000 });
    } else {
      quizRl.count++;
    }
    try {
      const { db } = await import("./db");
      const { nome, email, whatsapp, resultado, respostas } = req.body;
      if (!nome || !email || !whatsapp || !resultado) {
        return res.status(400).json({ message: "Dados incompletos" });
      }

      // Garantir que a tabela existe
      await db.execute(sql`CREATE TABLE IF NOT EXISTS quiz_leads (
        id SERIAL PRIMARY KEY, nome TEXT NOT NULL, email TEXT NOT NULL,
        whatsapp TEXT NOT NULL, resultado TEXT NOT NULL, respostas JSONB, created_at TEXT NOT NULL
      )`);

      // Salvar lead do quiz (upsert por email - 1 registro por pessoa, resultado final sobrescreve parcial)
      const existing_lead = await db.execute(sql`SELECT id, resultado FROM quiz_leads WHERE email = ${email} LIMIT 1`);
      let quizLeadId: number | null = null;
      if (existing_lead.rows.length === 0) {
        // Novo lead (parcial ou final)
        const qlInsert = await db.execute(sql`INSERT INTO quiz_leads (nome, email, whatsapp, resultado, respostas, created_at)
           VALUES (${nome}, ${email}, ${whatsapp}, ${resultado}, ${JSON.stringify(respostas || {})}, ${new Date().toISOString()}) RETURNING id`);
        quizLeadId = (qlInsert.rows[0]?.id as number) ?? null;
      } else {
        // Lead existente: atualizar com resultado final (nunca regredir de final para parcial)
        const lid = existing_lead.rows[0].id as number;
        quizLeadId = lid;
        const currentResult = existing_lead.rows[0].resultado as string;
        if (currentResult === "parcial" || resultado !== "parcial") {
          await db.execute(sql`UPDATE quiz_leads SET nome = ${nome}, whatsapp = ${whatsapp}, resultado = ${resultado}, respostas = ${JSON.stringify(respostas || {})} WHERE id = ${lid}`);
        }
      }

      // Log quiz event for the quiz_lead (for leads who haven't registered yet)
      if (quizLeadId && resultado !== "parcial") {
        const existingUser = await db.execute(sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`);
        if (existingUser.rows.length === 0) {
          await db.execute(sql`INSERT INTO lead_events (quiz_lead_id, event_type, event_description, metadata, created_at)
            VALUES (${quizLeadId}, 'quiz_completo', ${'Completou questionário: ' + (resultado === 'vip' ? 'Mentoria VIP' : resultado === 'observador' ? 'Plano Observador' : 'Acesso Digital')}, ${JSON.stringify({ resultado, respostas: respostas || {} })}, ${new Date().toISOString()})`).catch(() => {});
        }
      }

      // Se o quiz foi completado (não parcial), criar conta trial automaticamente
      if (resultado !== "parcial") {
        const existing = await db.execute(sql`SELECT id, role FROM users WHERE email = ${email} LIMIT 1`);

        let userId: number | null = null;
        let tempPassword: string | null = null;
        let isNew = false;

        if (existing.rows.length === 0) {
          // Criar conta trial automaticamente
          const bcrypt = await import("bcryptjs");
          const crypto = await import("crypto");
          tempPassword = crypto.randomBytes(4).toString("hex"); // senha temporária de 8 chars
          const hash = await bcrypt.hash(tempPassword, 10);
          const trialExpiry = new Date(Date.now() + 7 * 86400000).toISOString();

          const now = new Date().toISOString();
          const inserted = await db.execute(sql`INSERT INTO users (name, email, phone, password, role, approved, access_expires_at, materials_access, trial_started_at, created_at, lead_source)
             VALUES (${nome}, ${email}, ${sanitizePhone(whatsapp)}, ${hash}, 'trial', true, ${trialExpiry}, false, ${now}, ${now}, 'Questionário')
             RETURNING id`);
          userId = (inserted.rows[0]?.id as number) ?? null;
          isNew = true;
          console.log(`[quiz] Trial criado automaticamente para ${email} (userId: ${userId})`);

          // Log lead events for new quiz-created users
          if (userId) {
            await db.execute(sql`INSERT INTO lead_events (user_id, event_type, event_description, metadata, created_at)
              VALUES (${userId}, 'cadastro', ${'Cadastrou via Questionário'}, ${JSON.stringify({ source: 'quiz', resultado })}, ${now})`).catch(() => {});
            await db.execute(sql`INSERT INTO lead_events (user_id, event_type, event_description, metadata, created_at)
              VALUES (${userId}, 'quiz_completo', ${'Completou questionário: ' + (resultado === 'vip' ? 'Mentoria VIP' : resultado === 'observador' ? 'Plano Observador' : 'Acesso Digital')}, ${JSON.stringify({ resultado, respostas: respostas || {} })}, ${now})`).catch(() => {});
            await db.execute(sql`INSERT INTO lead_events (user_id, event_type, event_description, metadata, created_at)
              VALUES (${userId}, 'trial_inicio', ${'Iniciou Trial (7 dias)'}, ${JSON.stringify({ source: 'quiz' })}, ${now})`).catch(() => {});
          }
        } else {
          userId = (existing.rows[0].id as number) ?? null;
          // Update lead_source to "Questionário" if not already set
          await db.execute(sql`UPDATE users SET lead_source = 'Questionário' WHERE id = ${userId} AND (lead_source IS NULL OR lead_source = 'Direto')`).catch(() => {});
          console.log(`[quiz] Usuário já existe: ${email}`);
        }

        // Gerar token de acesso direto (auto-login)
        if (userId) {
          const jwt = await import("jsonwebtoken");
          const token = jwt.sign(
            { userId, role: "trial" },
            process.env.JWT_SECRET!,
            { expiresIn: "7d" }
          );

          // Enviar e-mail de boas-vindas com senha e link (se tiver Resend configurado)
          if (isNew && tempPassword && process.env.RESEND_API_KEY) {
            try {
              const { Resend } = await import("resend");
              const resend = new Resend(process.env.RESEND_API_KEY);
              await resend.emails.send({
                from: "Dr. Gustavo Martins <gustavo@clinicagustavomartins.com.br>",
                to: email,
                subject: "Seu acesso gratuito está pronto — Ampla Facial",
                html: `
                  <div style="background:#0A1628;color:#fff;padding:40px;font-family:sans-serif;border-radius:12px">
                    <img src="https://portal.amplafacial.com.br/logo-transparent.png" height="48" />
                    <h2 style="color:#D4A843;margin-top:24px">Olá, ${nome.split(" ")[0]}!</h2>
                    <p>Seu resultado no quiz foi: <strong style="color:#D4A843">${resultado === "vip" ? "Mentoria VIP" : resultado === "observador" ? "Plano Observador" : "Acesso Digital"}</strong></p>
                    <p>Criei um acesso gratuito de 7 dias para você explorar a plataforma Ampla Facial.</p>
                    <div style="background:#0D1E35;border-radius:8px;padding:20px;margin:24px 0">
                      <p style="margin:0;color:#aaa">E-mail: <strong style="color:#fff">${email}</strong></p>
                      <p style="margin:8px 0 0;color:#aaa">Senha temporária: <strong style="color:#D4A843;font-size:18px">${tempPassword}</strong></p>
                    </div>
                    <a href="https://portal.amplafacial.com.br" style="display:inline-block;background:#D4A843;color:#0A1628;padding:14px 32px;border-radius:8px;font-weight:bold;text-decoration:none">Acessar a plataforma</a>
                    <p style="margin-top:32px;color:#666;font-size:12px">Altere sua senha após o primeiro acesso. Dúvidas? Responda este e-mail.</p>
                  </div>
                `,
              });
              console.log(`[quiz] E-mail de boas-vindas enviado para ${email}`);
            } catch (emailErr: any) {
              console.error("[quiz] Erro ao enviar e-mail:", emailErr.message);
            }
          }

          return res.json({ success: true, token, isNew, userId });
        }
      }

      res.json({ success: true });
    } catch (e: any) {
      console.error("[quiz] Failed to save lead:", e.message, e.stack);
      res.status(500).json({ message: "Erro ao salvar", detail: e.message });
    }
  });

  // GET /api/admin/quiz-leads — listar leads do quiz (admin)
  app.get("/api/admin/quiz-leads", async (req: any, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const result = await db.execute(
        `SELECT * FROM quiz_leads ORDER BY created_at DESC LIMIT 500`
      );
      res.json({ leads: result.rows });
    } catch (e: any) {
      res.status(500).json({ message: "Erro ao buscar leads" });
    }
  });

  // ==================== CRON: TRIAL DAY-5 URGENCY EMAIL ====================

  app.post("/api/cron/trial-urgency", async (req, res) => {
    try {
      const { db } = await import("./db");
      if (!resend) return res.json({ sent: 0, message: "Resend not configured" });

      // Find trial users on day 5 (2 days left) who haven't received this email
      const now = new Date();
      const trials = await db.execute(sql`
        SELECT id, name, email, trial_started_at, created_at
        FROM users
        WHERE role = 'trial'
          AND trial_started_at IS NOT NULL
          AND trial_urgency_sent IS NOT TRUE
      `);

      let sent = 0;
      for (const user of trials.rows) {
        const startDate = new Date(user.trial_started_at || user.created_at);
        const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceStart >= 5) {
          const firstName = (user.name as string || "").split(" ")[0];
          try {
            await resend.emails.send({
              from: "Dr. Gustavo Martins <gustavo@clinicagustavomartins.com.br>",
              to: user.email as string,
              subject: "Seu teste gratuito termina em 2 dias",
              html: `
                <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0A1628;color:#fff;padding:40px 32px;border-radius:16px">
                  <img src="https://portal.amplafacial.com.br/logo-icon.png" alt="Ampla Facial" style="width:72px;display:block;margin:0 auto 24px" />
                  <h1 style="text-align:center;color:#D4A843;font-size:22px;margin:0 0 8px">${firstName}, seu teste termina em 2 dias</h1>
                  <div style="width:48px;height:1px;background:#D4A843;opacity:0.5;margin:0 auto 24px"></div>
                  <div style="text-align:center;margin:0 0 24px">
                    <div style="display:inline-block;width:64px;height:64px;border-radius:50%;border:3px solid #D4A843;line-height:64px;font-size:28px;font-weight:bold;color:#D4A843">2</div>
                    <p style="color:#D4A843;font-size:14px;margin:8px 0 0;font-weight:600">dias restantes</p>
                  </div>
                  <p style="color:#ccc;font-size:15px;line-height:1.6;margin:0 0 20px">
                    Voce teve acesso a uma amostra do que a Ampla Facial oferece. Imagina ter acesso a <strong style="color:#D4A843">todos os modulos</strong>, todos os materiais cientificos e acompanhamento direto com o Dr. Gustavo.
                  </p>
                  <p style="color:#ccc;font-size:15px;line-height:1.6;margin:0 0 24px">
                    Assine antes que seu acesso expire e continue evoluindo na harmonizacao orofacial.
                  </p>
                  <div style="text-align:center">
                    <a href="https://portal.amplafacial.com.br/#/lp" style="display:inline-block;background:#D4A843;color:#0A0D14;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none">
                      Conheca a formacao completa
                    </a>
                  </div>
                  <p style="color:#666;font-size:12px;text-align:center;margin:24px 0 0">
                    Se preferir, fale diretamente com o Dr. Gustavo pelo <a href="https://wa.me/5521976263881" style="color:#D4A843">WhatsApp</a>
                  </p>
                </div>
              `,
            });
            await db.execute(sql`UPDATE users SET trial_urgency_sent = true WHERE id = ${user.id}`);
            sent++;
          } catch (e) {
            console.error("Trial urgency email failed for", user.email, e);
          }
        }
      }

      res.json({ sent, message: `${sent} trial urgency email(s) sent` });
    } catch (err: any) {
      console.error("Trial urgency cron error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== CRON: REENGAJAMENTO QUIZ ====================

  // POST /api/cron/reengajamento-quiz
  // Chamado pelo agendador externo (Perplexity Computer) a cada hora.
  // Busca leads com resultado='parcial' que ainda nao receberam e-mail
  // de reengajamento e foram criados ha mais de 60 minutos.
  app.post("/api/cron/reengajamento-quiz", async (req, res) => {
    // Autenticacao simples via header secret
    const secret = req.headers["x-cron-secret"];
    const CRON_SECRET = process.env.CRON_SECRET;
    if (!CRON_SECRET || secret !== CRON_SECRET) {
      return res.status(401).json({ message: "Nao autorizado" });
    }

    try {
      const { db } = await import("./db");
      const { sql: sqlTag } = await import("drizzle-orm");
      // Buscar leads parciais com mais de 60 minutos sem reengajamento
      const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Marca atomicamente como enviado antes de processar (evita duplicatas em execuções paralelas)
      const claimed = await db.execute(
        sqlTag`UPDATE quiz_leads
         SET reengajamento_enviado = TRUE, reengajamento_enviado_at = NOW()
         WHERE id IN (
           SELECT id FROM quiz_leads
           WHERE resultado = 'parcial'
             AND (reengajamento_enviado IS NULL OR reengajamento_enviado = FALSE)
             AND created_at < ${cutoff}
           ORDER BY created_at ASC
           LIMIT 50
           FOR UPDATE SKIP LOCKED
         )
         RETURNING id, nome, email, whatsapp, created_at`
      );

      const leads = claimed.rows;
      let enviados = 0;
      let erros = 0;

      if (leads.length === 0) {
        return res.json({ message: "Nenhum lead pendente", enviados: 0 });
      }

      const { Resend } = await import("resend");
      const resendClient = new Resend(process.env.RESEND_API_KEY!);

      for (const lead of leads) {
        const primeiroNome = (lead.nome as string).split(" ")[0];
        const quizUrl = "https://portal.amplafacial.com.br/#/quiz";

        const htmlEmail = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0A1628;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A1628;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0D1E35;border-radius:16px;border:1px solid rgba(212,168,67,0.25);overflow:hidden;max-width:560px;width:100%">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a0e1a 0%,#0f1829 100%);padding:32px 40px;text-align:center;border-bottom:1px solid rgba(212,168,67,0.2)">
            <img src="https://portal.amplafacial.com.br/logo-transparent.png" height="48" alt="Ampla Facial" style="display:block;margin:0 auto 16px" />
            <div style="display:inline-block;background:rgba(212,168,67,0.12);border:1px solid rgba(212,168,67,0.35);border-radius:100px;padding:6px 18px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#D4A843">Quiz de Perfil HOF</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            <p style="margin:0 0 8px;font-size:13px;color:#D4A843;font-weight:600;letter-spacing:0.06em;text-transform:uppercase">Oi, ${primeiroNome}!</p>
            <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#ffffff;line-height:1.3">Voc&ecirc; ficou a um passo<br/>do seu resultado 🎯</h1>
            <p style="margin:0 0 24px;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.7">
              Voc&ecirc; come&ccedil;ou o quiz da Ampla Facial mas n&atilde;o chegou at&eacute; o final &mdash; e seu resultado personalizado ainda est&aacute; esperando por voc&ecirc;.
            </p>

            <!-- Info cards -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr>
                <td style="padding:4px">
                  <table width="100%" cellpadding="14" style="background:#0A1628;border:1px solid rgba(212,168,67,0.15);border-radius:10px">
                    <tr>
                      <td style="font-size:22px;width:36px">⚡</td>
                      <td>
                        <p style="margin:0;font-size:13px;font-weight:600;color:#fff">S&oacute; 5 perguntas r&aacute;pidas</p>
                        <p style="margin:2px 0 0;font-size:12px;color:rgba(255,255,255,0.4)">menos de 2 minutos para completar</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:4px">
                  <table width="100%" cellpadding="14" style="background:#0A1628;border:1px solid rgba(212,168,67,0.15);border-radius:10px">
                    <tr>
                      <td style="font-size:22px;width:36px">🎯</td>
                      <td>
                        <p style="margin:0;font-size:13px;font-weight:600;color:#fff">Resultado 100% personalizado</p>
                        <p style="margin:2px 0 0;font-size:12px;color:rgba(255,255,255,0.4)">Observador, Digital ou Mentoria VIP &mdash; ideal para o seu momento</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:4px">
                  <table width="100%" cellpadding="14" style="background:#0A1628;border:1px solid rgba(212,168,67,0.15);border-radius:10px">
                    <tr>
                      <td style="font-size:22px;width:36px">🏆</td>
                      <td>
                        <p style="margin:0;font-size:13px;font-weight:600;color:#fff">Concorra a 1 m&ecirc;s de Mentoria VIP gr&aacute;tis</p>
                        <p style="margin:2px 0 0;font-size:12px;color:rgba(255,255,255,0.4)">Sorteio entre quem completar o quiz</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${quizUrl}" style="display:inline-block;background:#D4A843;color:#0A1628;padding:16px 40px;border-radius:10px;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:0.02em">Completar meu quiz agora &rarr;</a>
                </td>
              </tr>
            </table>

            <p style="margin:20px 0 0;font-size:12px;color:rgba(255,255,255,0.25);text-align:center">Ou acesse: <a href="${quizUrl}" style="color:#D4A843">${quizUrl}</a></p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0A1628;border-top:1px solid rgba(255,255,255,0.06);padding:24px 40px;text-align:center">
            <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.3)">Ampla Facial &mdash; Mentoria em Harmoniza&ccedil;&atilde;o Orofacial</p>
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2)">Dr. Gustavo Martins &middot; Rio de Janeiro</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

        try {
          await resendClient.emails.send({
            from: "Dr. Gustavo Martins <gustavo@clinicagustavomartins.com.br>",
            to: lead.email as string,
            subject: `${primeiroNome}, seu resultado do quiz ainda est\u00e1 esperando por voc\u00ea — Ampla Facial`,
            html: htmlEmail,
          });
          // Lead já foi marcado como enviado atomicamente antes do loop
          enviados++;
          console.log(`[cron:quiz] Reengajamento enviado para ${lead.email}`);
        } catch (emailErr: any) {
          // Se o envio falhou, reverter o flag para que possa ser tentado novamente
          const leadId = lead.id as number;
          await db.execute(
            sqlTag`UPDATE quiz_leads SET reengajamento_enviado = FALSE, reengajamento_enviado_at = NULL WHERE id = ${leadId}`
          ).catch(() => {});
          console.error(`[cron:quiz] Erro ao enviar para ${lead.email}:`, emailErr.message);
          erros++;
        }
      }

      res.json({
        message: "Cron executado",
        leads_encontrados: leads.length,
        enviados,
        erros,
      });
    } catch (e: any) {
      console.error("[cron:quiz] Erro geral:", e.message);
      res.status(500).json({ message: "Erro interno", erro: e.message });
    }
  });

  // ==================== AUTH ====================

  app.post("/api/auth/register", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      if (!rateLimit(`register:${ip}`, 5, 15 * 60 * 1000)) {
        return res.status(429).json({ message: "Muitas tentativas. Tente novamente mais tarde." });
      }
      const data = registerSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const now = new Date().toISOString();

      // Compute lead_source from utm_source if not explicitly provided
      const leadSource = data.lead_source || computeLeadSource(data.utm_source);

      // Check for invite code
      let inviteData: { code: string; durationDays: number; campaign: string; id: number } | null = null;
      if (data.invite_code) {
        const { db: invDb } = await import("./db");
        const invResult = await invDb.execute(sql`SELECT * FROM invite_codes WHERE code = ${data.invite_code} AND active = true`);
        const inv = (invResult as any).rows?.[0];
        if (inv && (inv.max_uses === 0 || inv.used_count < inv.max_uses)) {
          inviteData = { code: inv.code, durationDays: inv.duration_days, campaign: inv.campaign, id: inv.id };
        }
      }

      const accessExpires = new Date();
      accessExpires.setDate(accessExpires.getDate() + (inviteData ? inviteData.durationDays : 7));

      const user = await storage.createUser({
        name: sanitize(data.name),
        email: data.email.trim().toLowerCase(),
        phone: sanitizePhone(data.phone),
        password: hashedPassword,
        instagram: data.instagram ? sanitize(data.instagram.replace(/^@/, "").trim()) : "",
        planId: null,
        createdAt: now,
      });

      const role = inviteData ? "student" : "trial";
      const updateFields: any = {
        role,
        approved: true,
        accessExpiresAt: accessExpires.toISOString(),
        trialStartedAt: now,
        lgpdAcceptedAt: now,
        utmSource: data.utm_source || null,
        utmMedium: data.utm_medium || null,
        utmCampaign: data.utm_campaign || null,
        utmContent: data.utm_content || null,
        utmTerm: data.utm_term || null,
        leadSource,
        landingPage: data.landing_page || null,
      };
      if (inviteData) {
        updateFields.planKey = "workshop";
        updateFields.inviteCode = inviteData.code;
      }
      await storage.updateUser(user.id, updateFields);

      // If invite code was used, increment usage
      if (inviteData) {
        try {
          const { db: invDb } = await import("./db");
          const usedByEntry = JSON.stringify({ email: data.email.trim().toLowerCase(), usedAt: now });
          await invDb.execute(sql`UPDATE invite_codes SET used_count = used_count + 1, used_by = used_by::jsonb || ${usedByEntry}::jsonb WHERE id = ${inviteData.id}`);
        } catch {
          // Non-blocking: fallback to simple text concat if jsonb fails
          try {
            const { db: invDb } = await import("./db");
            await invDb.execute(sql`UPDATE invite_codes SET used_count = used_count + 1 WHERE id = ${inviteData.id}`);
          } catch {}
        }
      }

      // Link anonymous visitor to this user account
      if (data.visitor_id) {
        try {
          const { db: vDb } = await import("./db");
          await vDb.execute(sql`UPDATE site_visitors SET user_id = ${user.id} WHERE visitor_id = ${data.visitor_id} AND user_id IS NULL`);
        } catch {} // non-blocking
      }

      // Issue JWT so frontend can log in immediately
      const token = jwt.sign({ userId: user.id, role }, JWT_SECRET, { expiresIn: inviteData ? `${inviteData.durationDays}d` : "7d" });
      res.cookie("ampla_token", token, { httpOnly: true, secure: true, sameSite: "strict", maxAge: 30 * 24 * 60 * 60 * 1000, path: "/" });

      // Send welcome email and notify admin (non-blocking)
      sendWelcomeEmail({ name: user.name, email: user.email });
      notifyNewRegistration({ name: user.name, email: user.email, phone: user.phone ?? undefined });

      const { password: _p, lockedUntil: _l, loginAttempts: _a, ...safeUser } = user;
      const message = inviteData
        ? `Acesso completo ativado por ${inviteData.durationDays} dias!`
        : "Seu teste gratuito de 7 dias foi ativado!";
      return res.json({
        message,
        user: { ...safeUser, role, approved: true, accessExpiresAt: accessExpires.toISOString(), planKey: inviteData ? "workshop" : null, inviteCode: inviteData?.code || null },
        token,
      });
    } catch (e: any) {
      return res.status(400).json({ message: e.message || "Erro no cadastro" });
    }
  });

  // ==================== AUTH: Trial Register ====================
  // Auto-approves the user with role='trial' and 7-day expiry. No admin needed.
  // If invite code is present and valid, grants full workshop access instead.
  app.post("/api/auth/register-trial", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      if (!rateLimit(`register:${ip}`, 5, 15 * 60 * 1000)) {
        return res.status(429).json({ message: "Muitas tentativas. Tente novamente mais tarde." });
      }
      const data = trialRegisterSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Email já cadastrado. Tente fazer login ou recuperar sua senha." });
      }
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const now = new Date().toISOString();

      // Compute lead_source from utm_source if not explicitly provided
      const leadSource = data.lead_source || computeLeadSource(data.utm_source);

      // Check for invite code
      let inviteData: { code: string; durationDays: number; campaign: string; id: number } | null = null;
      if (data.invite_code) {
        const { db: invDb } = await import("./db");
        const invResult = await invDb.execute(sql`SELECT * FROM invite_codes WHERE code = ${data.invite_code} AND active = true`);
        const inv = (invResult as any).rows?.[0];
        if (inv && (inv.max_uses === 0 || inv.used_count < inv.max_uses)) {
          inviteData = { code: inv.code, durationDays: inv.duration_days, campaign: inv.campaign, id: inv.id };
        }
      }

      const accessExpires = new Date();
      accessExpires.setDate(accessExpires.getDate() + (inviteData ? inviteData.durationDays : 7));

      const user = await storage.createUser({
        name: sanitize(data.name),
        email: data.email.trim().toLowerCase(),
        phone: sanitizePhone(data.phone),
        password: hashedPassword,
        instagram: data.instagram ? sanitize(data.instagram.replace(/^@/, "").trim()) : "",
        planId: null,
        createdAt: now,
      });

      const role = inviteData ? "student" : "trial";
      const updateFields: any = {
        role,
        approved: true,
        accessExpiresAt: accessExpires.toISOString(),
        trialStartedAt: now,
        lgpdAcceptedAt: now,
        utmSource: data.utm_source || null,
        utmMedium: data.utm_medium || null,
        utmCampaign: data.utm_campaign || null,
        utmContent: data.utm_content || null,
        utmTerm: data.utm_term || null,
        leadSource,
        landingPage: data.landing_page || null,
      };
      if (inviteData) {
        updateFields.planKey = "workshop";
        updateFields.inviteCode = inviteData.code;
      }
      await storage.updateUser(user.id, updateFields);

      // If invite code was used, increment usage
      if (inviteData) {
        try {
          const { db: invDb } = await import("./db");
          const usedByEntry = JSON.stringify({ email: data.email.trim().toLowerCase(), usedAt: now });
          await invDb.execute(sql`UPDATE invite_codes SET used_count = used_count + 1, used_by = used_by::jsonb || ${usedByEntry}::jsonb WHERE id = ${inviteData.id}`);
        } catch {
          try {
            const { db: invDb } = await import("./db");
            await invDb.execute(sql`UPDATE invite_codes SET used_count = used_count + 1 WHERE id = ${inviteData.id}`);
          } catch {}
        }
      }

      // Issue JWT so frontend can log in immediately without a second request
      const token = jwt.sign({ userId: user.id, role }, JWT_SECRET, { expiresIn: inviteData ? `${inviteData.durationDays}d` : "7d" });
      res.cookie("ampla_token", token, { httpOnly: true, secure: true, sameSite: "strict", maxAge: 30 * 24 * 60 * 60 * 1000, path: "/" });

      // Link anonymous visitor to this user account
      if (data.visitor_id) {
        try {
          const { db: vDb } = await import("./db");
          await vDb.execute(sql`UPDATE site_visitors SET user_id = ${user.id} WHERE visitor_id = ${data.visitor_id} AND user_id IS NULL`);
        } catch {} // non-blocking
      }

      // Log lead events for registration
      try {
        const { db: evDb } = await import("./db");
        const regSource = inviteData ? `convite (${inviteData.campaign})` : leadSource;
        await evDb.execute(sql`INSERT INTO lead_events (user_id, event_type, event_description, metadata, created_at)
          VALUES (${user.id}, 'cadastro', ${'Cadastrou na plataforma via ' + regSource}, ${JSON.stringify({ source: regSource, utm_source: data.utm_source, invite_code: inviteData?.code })}, ${now})`);
        if (inviteData) {
          await evDb.execute(sql`INSERT INTO lead_events (user_id, event_type, event_description, metadata, created_at)
            VALUES (${user.id}, 'workshop_acesso', ${'Acesso Workshop ativado — ' + inviteData.campaign + ' (' + inviteData.durationDays + ' dias)'}, ${JSON.stringify({ campaign: inviteData.campaign, code: inviteData.code, durationDays: inviteData.durationDays })}, ${now})`);
        } else {
          await evDb.execute(sql`INSERT INTO lead_events (user_id, event_type, event_description, metadata, created_at)
            VALUES (${user.id}, 'trial_inicio', 'Iniciou Trial (7 dias)', ${JSON.stringify({ source: 'registration' })}, ${now})`);
        }
      } catch {} // non-blocking

      // Send welcome email and notify admin (non-blocking)
      sendWelcomeEmail({ name: user.name, email: user.email });
      notifyNewRegistration({ name: user.name, email: user.email, phone: user.phone ?? undefined });

      const { password: _p, lockedUntil: _l, loginAttempts: _a, ...safeUser } = user;
      const message = inviteData
        ? `Acesso completo ativado por ${inviteData.durationDays} dias!`
        : "Seu teste gratuito de 7 dias foi ativado!";
      return res.json({
        message,
        user: { ...safeUser, role, approved: true, accessExpiresAt: accessExpires.toISOString(), planKey: inviteData ? "workshop" : null, inviteCode: inviteData?.code || null },
        token,
      });
    } catch (e: any) {
      if (e?.errors) {
        const msg = e.errors[0]?.message || "Dados inválidos";
        return res.status(400).json({ message: msg });
      }
      return res.status(400).json({ message: e.message || "Erro no cadastro" });
    }
  });

  // Forgot password — sends reset link by email
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      if (!rateLimit(`forgot:${ip}`, 3, 15 * 60 * 1000)) {
        return res.status(429).json({ message: "Muitas tentativas. Tente novamente em 15 minutos." });
      }
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email inválido" });
      }
      const user = await storage.getUserByEmail(email.trim().toLowerCase());
      // Always return 200 to prevent email enumeration
      if (!user) {
        return res.json({ message: "Se este email estiver cadastrado, você receberá um link em instantes." });
      }
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
      await storage.createPasswordReset(user.id, token, expiresAt);
      sendPasswordResetEmail({ name: user.name, email: user.email }, token);
      return res.json({ message: "Se este email estiver cadastrado, você receberá um link em instantes." });
    } catch (e: any) {
      return res.status(500).json({ message: "Erro interno. Tente novamente." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      if (!rateLimit(`login:${ip}`, 5, 60 * 1000)) {
        return res.status(429).json({ message: "Muitas tentativas de login. Tente novamente mais tarde." });
      }
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email.trim().toLowerCase());
      if (!user) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      // Rate limiting: check if account is locked
      if (user.lockedUntil) {
        const lockExpiry = new Date(user.lockedUntil);
        if (new Date() < lockExpiry) {
          const minutesLeft = Math.ceil((lockExpiry.getTime() - Date.now()) / 60000);
          return res.status(429).json({ message: `Conta bloqueada temporariamente. Tente novamente em ${minutesLeft} minuto(s).` });
        }
        // Lock expired — reset
        await storage.updateUser(user.id, { loginAttempts: 0, lockedUntil: null });
        user.loginAttempts = 0;
        user.lockedUntil = null;
      }

      // Check if attempts exceeded
      if ((user.loginAttempts || 0) >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await storage.updateUser(user.id, { lockedUntil: lockUntil });
        return res.status(429).json({ message: "Conta bloqueada temporariamente. Tente novamente em 15 minuto(s)." });
      }

      const validPassword = await bcrypt.compare(data.password, user.password);
      if (!validPassword) {
        const newAttempts = (user.loginAttempts || 0) + 1;
        const updateData: any = { loginAttempts: newAttempts };
        if (newAttempts >= 5) {
          updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        }
        await storage.updateUser(user.id, updateData);
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      // Successful login — reset attempts
      if ((user.loginAttempts || 0) > 0) {
        await storage.updateUser(user.id, { loginAttempts: 0, lockedUntil: null });
      }

      // Students must be approved and not expired
      if (user.role === "student" && !user.approved) {
        return res.status(403).json({ message: "Sua conta ainda não foi aprovada. Aguarde o administrador." });
      }
      if (user.role === "student" && user.accessExpiresAt) {
        const now = new Date();
        const expires = new Date(user.accessExpiresAt);
        if (now > expires) {
          return res.status(403).json({ message: "Seu acesso expirou. Entre em contato com o administrador." });
        }
      }
      // Trial users: allow login even if expired (they keep portal access for credits)
      // The frontend will show locked modules and CTA to buy a plan

      const { password, lockedUntil: _l, loginAttempts: _a, ...safeUser } = user;
      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

      // Register last login for ALL users (non-blocking)
      try {
        const { db: loginDb } = await import("./db");
        await loginDb.execute(sql`UPDATE users SET last_login_at = ${new Date().toISOString()}, login_count = COALESCE(login_count, 0) + 1 WHERE id = ${user.id}`);
      } catch (loginTrackErr: any) {
        console.error("[login] tracking error (non-fatal):", loginTrackErr.message);
      }

      // Log admin login
      if (user.role === "admin" || user.role === "super_admin") {
        await logAction(user.id, user.name, "admin_login");
      }

      // Log student/trial login
      if (user.role === "student" || user.role === "trial") {
        await logAction(user.id, user.name, "student_login", "user", user.id, user.name, {
          ip,
          user_agent: (req.headers["user-agent"] || "").slice(0, 120),
        });
      }

      // Set httpOnly cookie
      res.cookie("ampla_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: "/",
      });

      return res.json({ user: safeUser, token });
    } catch (e: any) {
      return res.status(400).json({ message: e.message || "Erro no login" });
    }
  });

  // ==================== AUTH: Me ====================
  app.post("/api/auth/logout", (_req, res) => {
    res.clearCookie("ampla_token", { path: "/" });
    res.json({ message: "Logout realizado" });
  });

  app.get("/api/auth/me", async (req, res) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    const user = await storage.getUser(auth.userId);
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
    const { password, loginAttempts, lockedUntil, ...safeUser } = user;

    // Sliding session: issue a fresh token on every auth check
    // This keeps iOS PWA sessions alive across app restarts
    const freshToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("ampla_token", freshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/",
    });
    res.json({ user: safeUser, token: freshToken });
  });

  // ==================== PLANS ====================
  app.get("/api/plans", async (_req, res) => {
    try {
      const p = await storage.getPlans();
      res.json(p);
    } catch (e: any) {
      console.error("GET /api/plans error:", e?.message || e);
      // Fallback: raw SQL query without the material_topics column
      try {
        const { db } = await import("./db");
        const result = await db.execute(sql`SELECT id, name, description, duration_days as "durationDays", price FROM plans`);
        const rows = (result as any).rows || [];
        res.json(rows.map((r: any) => ({ ...r, materialTopics: null })));
      } catch (e2: any) {
        console.error("GET /api/plans fallback error:", e2?.message || e2);
        res.status(500).json({ message: "Erro ao carregar planos" });
      }
    }
  });

  // ==================== ADMIN: Plans CRUD ====================
  app.post("/api/admin/plans", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const { name, description, durationDays, price, moduleIds, materialTopics } = req.body;
      if (!name || !durationDays) {
        return res.status(400).json({ message: "Nome e duração são obrigatórios" });
      }
      const plan = await storage.createPlan({ name: sanitize(name), description: description ? sanitize(description) : null, durationDays: parseInt(durationDays), price: price ? sanitize(price) : null, materialTopics: Array.isArray(materialTopics) ? JSON.stringify(materialTopics) : null });
      if (Array.isArray(moduleIds)) {
        await storage.setPlanModules(plan.id, moduleIds.map(Number));
      }
      const admin = await storage.getUser(auth.userId);
      await logAction(auth.userId, admin?.name || "Admin", "plan_created", "plan", plan.id, plan.name, { moduleIds, materialTopics });
      res.json(plan);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/plans/:id", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    const { name, description, durationDays, price, moduleIds, materialTopics } = req.body;
    const planUpdate: Partial<{ name: string; description: string | null; durationDays: number; price: string | null; materialTopics: string | null }> = {};
    if (name !== undefined) planUpdate.name = sanitize(name);
    if (description !== undefined) planUpdate.description = description ? sanitize(description) : null;
    if (durationDays !== undefined) planUpdate.durationDays = parseInt(durationDays);
    if (price !== undefined) planUpdate.price = price ? sanitize(price) : null;
    if (materialTopics !== undefined) planUpdate.materialTopics = Array.isArray(materialTopics) && materialTopics.length > 0 ? JSON.stringify(materialTopics) : null;
    const updated = await storage.updatePlan(parseInt(req.params.id), planUpdate);
    if (!updated) return res.status(404).json({ message: "Plano não encontrado" });
    if (Array.isArray(moduleIds)) {
      await storage.setPlanModules(updated.id, moduleIds.map(Number));
    }
    const admin = await storage.getUser(auth.userId);
    await logAction(auth.userId, admin?.name || "Admin", "plan_updated", "plan", updated.id, updated.name, { ...planUpdate, moduleIds, materialTopics });
    res.json(updated);
  });

  app.delete("/api/admin/plans/:id", async (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    const plan = await storage.getPlan(parseInt(req.params.id));
    const ok = await storage.deletePlan(parseInt(req.params.id));
    const admin = await storage.getUser(auth.userId);
    await logAction(auth.userId, admin?.name || "Admin", "plan_deleted", "plan", parseInt(req.params.id), plan?.name || "?");
    res.json({ success: ok });
  });

  // ==================== PLAN MODULES ====================
  app.get("/api/admin/plan-modules", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const all = await storage.getAllPlanModules();
    res.json(all);
  });

  app.get("/api/admin/plan-modules/:planId", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const pm = await storage.getPlanModules(parseInt(req.params.planId));
    res.json(pm.map(p => p.moduleId));
  });

  app.put("/api/admin/plan-modules/:planId", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    const { moduleIds } = req.body;
    if (!Array.isArray(moduleIds)) {
      return res.status(400).json({ message: "moduleIds array obrigatório" });
    }
    await storage.setPlanModules(parseInt(req.params.planId), moduleIds.map(Number));
    const admin = await storage.getUser(auth.userId);
    await logAction(auth.userId, admin?.name || "Admin", "plan_modules_updated", "plan", parseInt(req.params.planId), undefined, { moduleIds });
    res.json({ success: true, moduleIds });
  });

  // ==================== STUDENT INIT (combined payload) ====================
  // Returns modules, lessons, progress, plans, my-modules, and lesson-access
  // in a SINGLE request — eliminates 6-request waterfall on student dashboard.
  app.get("/api/student/init", async (req, res) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    try {
      // Fire all independent DB queries in parallel
      const [allModules, allLessons, allPlans, userProgress] = await Promise.all([
        storage.getModules(),
        storage.getLessons(),
        storage.getPlans(),
        storage.getProgress(auth.userId),
      ]);

      // Compute my-modules access (inlined from /api/my-modules logic)
      let myModules: { accessAll: boolean; moduleIds: number[] } = { accessAll: false, moduleIds: [] };
      if (auth.role === "admin" || auth.role === "super_admin" || auth.role === "trial") {
        myModules = { accessAll: true, moduleIds: [] };
      } else {
        const user = await storage.getUser(auth.userId);
        if (user) {
          const accessExpired = user.accessExpiresAt
            ? new Date(user.accessExpiresAt) < new Date()
            : false;
          if (accessExpired || (user as any).planKey === "workshop" || (user as any).inviteCode) {
            myModules = { accessAll: true, moduleIds: [] };
          } else {
            const userMods = await storage.getUserModules(auth.userId);
            if (userMods.length > 0) {
              const now = new Date().toISOString();
              const enabledModuleIds = userMods
                .filter(um => {
                  if (!um.enabled) return false;
                  if (um.startDate && now < um.startDate) return false;
                  if (um.endDate && now > um.endDate) return false;
                  return true;
                })
                .map(um => um.moduleId);
              myModules = { accessAll: false, moduleIds: enabledModuleIds };
            } else if (user.planId) {
              const pm = await storage.getPlanModules(user.planId);
              myModules = pm.length === 0
                ? { accessAll: true, moduleIds: [] }
                : { accessAll: false, moduleIds: pm.map(p => p.moduleId) };
            }
          }
        }
      }

      // Compute lesson access (inlined from /api/lessons/access logic)
      const { canSeeVideo, allowedLessonIds } = await getVideoAccessInfo(auth);
      const filteredLessons = filterLessons(allLessons, canSeeVideo, allowedLessonIds);

      let lessonAccess: { accessType: string; allowedLessonIds: number[] } = { accessType: "full", allowedLessonIds: [] };
      if (allowedLessonIds !== null) {
        lessonAccess = { accessType: "tester", allowedLessonIds };
      }

      // Set Cache-Control for semi-static data (modules/plans change rarely)
      res.set("Cache-Control", "private, max-age=60");
      res.json({
        modules: allModules,
        lessons: filteredLessons,
        plans: allPlans,
        progress: userProgress,
        myModules,
        lessonAccess,
      });
    } catch (e: any) {
      console.error("[GET /api/student/init]", e?.message || e);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ==================== MODULES ====================
  // Mapa: tema do plano Modulo Avulso com Pratica -> IDs dos modulos
  // [2] Toxina, [3] Preenchedores, [5] Bioestimuladores, [7] Biorregeneradores
  // [6] Boas vindas = sempre liberado como módulo introdutório
  const THEME_TO_MODULE_IDS: Record<string, number[]> = {
    toxina: [6, 2],
    preenchedores: [6, 3],
    bioestimuladores: [6, 5],
    biorregeneradores: [6, 7],
  };

  app.get("/api/modules", async (_req, res) => {
    const m = await storage.getModules();
    res.json(m);
  });

  // Aluno escolhe/altera o tema do plano Modulo Avulso com Pratica
  app.post("/api/select-theme", async (req, res) => {
    try {
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });
      const { theme } = req.body as { theme: string };
      if (!theme || !THEME_TO_MODULE_IDS[theme]) {
        return res.status(400).json({ message: "Tema inválido. Escolha: toxina, preenchedores, bioestimuladores ou biorregeneradores" });
      }
      const { db } = await import("./db");
      const [user] = await db.select().from(users).where(eq(users.id, auth.userId));
      if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
      if (user.planKey !== "modulo_pratica") {
        return res.status(403).json({ message: "Apenas alunos do plano Módulo Avulso com Prática podem escolher tema" });
      }
      // Uma vez escolhido, não permite trocar (admin pode alterar)
      if (user.selectedTheme) {
        return res.status(409).json({
          message: "Você já escolheu o tema " + user.selectedTheme + ". Fale com o Dr. Gustavo se precisar trocar.",
          currentTheme: user.selectedTheme,
        });
      }
      await db.update(users).set({ selectedTheme: theme }).where(eq(users.id, auth.userId));
      return res.json({ ok: true, selectedTheme: theme, moduleIds: THEME_TO_MODULE_IDS[theme] });
    } catch (err: any) {
      console.error("[POST /api/select-theme]", err.message);
      return res.status(500).json({ message: "Erro ao salvar tema" });
    }
  });

  // Admin altera tema de um aluno específico
  app.post("/api/admin/users/:id/theme", async (req, res) => {
    try {
      const adm = requireAdmin(req, res);
      if (!adm) return;
      const { theme } = req.body as { theme: string | null };
      if (theme !== null && (!theme || !THEME_TO_MODULE_IDS[theme])) {
        return res.status(400).json({ message: "Tema inválido" });
      }
      const userId = Number(req.params.id);
      const { db } = await import("./db");
      await db.update(users).set({ selectedTheme: theme }).where(eq(users.id, userId));
      return res.json({ ok: true, selectedTheme: theme });
    } catch (err: any) {
      console.error("[POST /api/admin/users/:id/theme]", err.message);
      return res.status(500).json({ message: "Erro ao alterar tema" });
    }
  });

  app.get("/api/modules/:id", async (req, res) => {
    const mod = await storage.getModule(parseInt(req.params.id));
    if (!mod) return res.status(404).json({ message: "Módulo não encontrado" });
    res.json(mod);
  });

  // ==================== MY ACCESSIBLE MODULES ====================
  app.get("/api/my-modules", async (req, res) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    // Admins see all modules
    if (auth.role === "admin" || auth.role === "super_admin") {
      return res.json({ accessAll: true, moduleIds: [] });
    }
    // Trial users see all modules (lesson restriction handled on frontend)
    if (auth.role === "trial") {
      return res.json({ accessAll: true, moduleIds: [], isTrial: true });
    }
    const user = await storage.getUser(auth.userId);
    if (!user) {
      return res.json({ accessAll: false, moduleIds: [] });
    }

    // Check if access is expired (for ANY plan type)
    const accessExpired = user.accessExpiresAt
      ? new Date(user.accessExpiresAt) < new Date()
      : false;

    // If access is expired, return all modules visible but flagged as expired
    // so the frontend can show locked overlays with CTA
    if (accessExpired) {
      return res.json({ accessAll: true, moduleIds: [], expired: true });
    }

    // Workshop invite users get full access to all modules
    if ((user as any).planKey === "workshop" || (user as any).inviteCode) {
      return res.json({ accessAll: true, moduleIds: [] });
    }

    // PLANO MODULO AVULSO COM PRATICA: libera apenas o modulo do tema escolhido
    if ((user as any).planKey === "modulo_pratica") {
      const theme = (user as any).selectedTheme as string | null;
      if (theme && THEME_TO_MODULE_IDS[theme]) {
        return res.json({ accessAll: false, moduleIds: THEME_TO_MODULE_IDS[theme], selectedTheme: theme });
      }
      // Se ainda não escolheu tema, libera apenas Boas Vindas até escolher
      return res.json({ accessAll: false, moduleIds: [6], needsThemeSelection: true });
    }

    // Check for per-user module overrides first
    const userMods = await storage.getUserModules(auth.userId);
    if (userMods.length > 0) {
      const now = new Date().toISOString();
      const enabledModuleIds = userMods
        .filter(um => {
          if (!um.enabled) return false;
          if (um.startDate && now < um.startDate) return false;
          if (um.endDate && now > um.endDate) return false;
          return true;
        })
        .map(um => um.moduleId);
      return res.json({ accessAll: false, moduleIds: enabledModuleIds });
    }

    // Fallback to plan-based access
    if (!user.planId) {
      return res.json({ accessAll: false, moduleIds: [] });
    }

    const pm = await storage.getPlanModules(user.planId);
    // No plan_modules records = access to all (backwards compatible)
    if (pm.length === 0) {
      return res.json({ accessAll: true, moduleIds: [] });
    }
    return res.json({ accessAll: false, moduleIds: pm.map(p => p.moduleId) });
  });

  // ==================== MY ACCESSIBLE MATERIAL TOPICS ====================
  app.get("/api/my-materials", async (req, res) => {
    try {
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });
      // Admins see all material topics
      if (auth.role === "admin" || auth.role === "super_admin") {
        return res.json({ accessAll: true, topics: [] });
      }
      const user = await storage.getUser(auth.userId);
      if (!user) {
        return res.json({ accessAll: false, topics: [] });
      }
      // Check per-user material category overrides first
      let userCats: Awaited<ReturnType<typeof storage.getUserMaterialCategories>> = [];
      try {
        userCats = await storage.getUserMaterialCategories(auth.userId);
      } catch {
        // Table may not exist yet — skip per-user categories
      }
      if (userCats.length > 0) {
        const enabledTopics = userCats.filter(c => c.enabled).map(c => c.categoryTitle);
        return res.json({ accessAll: false, topics: enabledTopics });
      }

      // Fallback to plan-based material access
      if (!user.planId) {
        // materialsAccess is true but no per-user categories and no plan — grant full access
        return res.json({ accessAll: true, topics: [] });
      }
      const plan = await storage.getPlan(user.planId);
      if (!plan || !plan.materialTopics) {
        // materialsAccess is true but plan has no specific topics — grant full access
        return res.json({ accessAll: true, topics: [] });
      }
      try {
        const topics: string[] = JSON.parse(plan.materialTopics);
        if (topics.length === 0) {
          // materialsAccess is true but plan topics are empty — grant full access
          return res.json({ accessAll: true, topics: [] });
        }
        return res.json({ accessAll: false, topics });
      } catch {
        // materialsAccess is true but parse failed — grant full access
        return res.json({ accessAll: true, topics: [] });
      }
    } catch (err) {
      console.error("Error in /api/my-materials:", err);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ==================== LESSONS ====================
  // Helper: determine video access level for a user.
  // Returns { canSeeVideo: boolean, allowedLessonIds: number[] | null }
  // allowedLessonIds = null means full access; number[] means only those IDs get videoUrl
  async function getVideoAccessInfo(auth: { userId: number; role: string } | null): Promise<{ canSeeVideo: boolean; allowedLessonIds: number[] | null }> {
    if (!auth) return { canSeeVideo: false, allowedLessonIds: null };
    if (auth.role === "admin" || auth.role === "super_admin") return { canSeeVideo: true, allowedLessonIds: null };
    try {
      const { db } = await import("./db");
      const userRow = await db.execute(sql`SELECT role, approved, access_expires_at, plan_key FROM users WHERE id = ${auth.userId}`);
      const user = (userRow as any).rows?.[0];
      if (!user || user.approved === false) return { canSeeVideo: false, allowedLessonIds: null };
      if (user.access_expires_at) {
        const expires = new Date(user.access_expires_at);
        if (new Date() > expires) return { canSeeVideo: false, allowedLessonIds: null };
      }
      // Workshop invite users get full access
      if (user.plan_key === "workshop") return { canSeeVideo: true, allowedLessonIds: null };
      // Paid plan users get full access
      const isTester = user.plan_key === "tester" || user.role === "trial" || !user.plan_key;
      if (!isTester && user.plan_key) return { canSeeVideo: true, allowedLessonIds: null };
      // Trial/tester: first 2 lessons per module only
      const lessonsResult = await db.execute(sql`SELECT id, module_id, "order" FROM lessons ORDER BY module_id, "order"`);
      const rows = (lessonsResult as any).rows || [];
      const moduleMap: Record<number, number[]> = {};
      for (const l of rows) {
        if (!moduleMap[l.module_id]) moduleMap[l.module_id] = [];
        moduleMap[l.module_id].push(l.id);
      }
      const allowedIds: number[] = [];
      for (const moduleId of Object.keys(moduleMap)) {
        allowedIds.push(...moduleMap[Number(moduleId)].slice(0, 2));
      }
      return { canSeeVideo: true, allowedLessonIds: allowedIds };
    } catch { return { canSeeVideo: false, allowedLessonIds: null }; }
  }

  // Strip videoUrl from lessons the user cannot access
  function filterLessons(lessons: any[], canSeeVideo: boolean, allowedLessonIds: number[] | null) {
    if (!canSeeVideo) {
      return lessons.map(({ videoUrl, ...rest }) => rest);
    }
    if (allowedLessonIds !== null) {
      const allowedSet = new Set(allowedLessonIds);
      return lessons.map((lesson) => {
        if (allowedSet.has(lesson.id)) return lesson;
        const { videoUrl, ...rest } = lesson;
        return rest;
      });
    }
    return lessons;
  }

  app.get("/api/lessons", async (req, res) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    const l = await storage.getLessons();
    const { canSeeVideo, allowedLessonIds } = await getVideoAccessInfo(auth);
    res.json(filterLessons(l, canSeeVideo, allowedLessonIds));
  });

  app.get("/api/modules/:id/lessons", async (req, res) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    const l = await storage.getLessonsByModule(parseInt(req.params.id));
    const { canSeeVideo, allowedLessonIds } = await getVideoAccessInfo(auth);
    res.json(filterLessons(l, canSeeVideo, allowedLessonIds));
  });

  app.get("/api/lessons/:id", async (req, res) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    const lesson = await storage.getLesson(parseInt(req.params.id));
    if (!lesson) return res.status(404).json({ message: "Aula não encontrada" });
    const { canSeeVideo, allowedLessonIds } = await getVideoAccessInfo(auth);
    const [filtered] = filterLessons([lesson], canSeeVideo, allowedLessonIds);
    res.json(filtered);
  });

  // ==================== LESSON ACCESS (tester gating) ====================
  app.get("/api/lessons/access", async (req: Request, res: Response) => {
    try {
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });
      const { db } = await import("./db");

      const userResult = await db.execute(sql`SELECT role, plan_key, access_expires_at FROM users WHERE id = ${auth.userId}`);
      const user = (userResult as any).rows?.[0];
      if (!user) return res.json({ accessType: "none", allowedLessonIds: [] });

      // Check if access is expired (for ANY plan type)
      if (user.access_expires_at) {
        const expires = new Date(user.access_expires_at);
        if (new Date() > expires) {
          return res.json({ accessType: "expired", allowedLessonIds: [] });
        }
      }

      // Workshop invite users get full access
      if (user.plan_key === "workshop") {
        return res.json({ accessType: "full", allowedLessonIds: [] });
      }

      const isTester = user.plan_key === "tester" || user.role === "trial" || !user.plan_key;

      if (!isTester && user.plan_key) {
        return res.json({ accessType: "full", allowedLessonIds: [] });
      }

      // Tester: first 2 lessons per module
      const lessonsResult = await db.execute(sql`
        SELECT id, module_id, "order" FROM lessons ORDER BY module_id, "order"
      `);
      const rows = (lessonsResult as any).rows || [];

      const moduleMap: Record<number, number[]> = {};
      for (const l of rows) {
        if (!moduleMap[l.module_id]) moduleMap[l.module_id] = [];
        moduleMap[l.module_id].push(l.id);
      }

      const allowedIds: number[] = [];
      for (const moduleId of Object.keys(moduleMap)) {
        const sorted = moduleMap[Number(moduleId)];
        allowedIds.push(...sorted.slice(0, 2));
      }

      return res.json({ accessType: "tester", allowedLessonIds: allowedIds });
    } catch (e: any) {
      console.error("[GET /api/lessons/access]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ==================== PROGRESS ====================
  app.get("/api/progress/:userId", async (req, res) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    const targetUserId = parseInt(req.params.userId);
    if (auth.role !== "admin" && auth.role !== "super_admin" && auth.userId !== targetUserId) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    const progress = await storage.getProgress(targetUserId);
    res.json(progress);
  });

  app.post("/api/progress/:userId/lesson/:lessonId/complete", async (req, res) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    const targetUserId = parseInt(req.params.userId);
    if (auth.role === "student" && auth.userId !== targetUserId) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    const p = await storage.markLessonComplete(targetUserId, parseInt(req.params.lessonId));
    res.json(p);
  });

  app.post("/api/progress/:userId/lesson/:lessonId/incomplete", async (req, res) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    const targetUserId = parseInt(req.params.userId);
    if (auth.role === "student" && auth.userId !== targetUserId) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    await storage.markLessonIncomplete(targetUserId, parseInt(req.params.lessonId));
    res.json({ success: true });
  });

  // ==================== ADMIN: Students ====================
  app.get("/api/admin/students", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const students = await storage.getStudents();
    const safe = students.map(({ password, ...s }) => s);
    res.json(safe);
  });

  app.get("/api/admin/students/trial", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const trialUsers = await storage.getTrialStudents();
    const safe = trialUsers.map(({ password, ...s }) => s);
    res.json(safe);
  });

  app.get("/api/admin/students/pending", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const pending = await storage.getPendingStudents();
    const safe = pending.map(({ password, ...s }) => s);
    res.json(safe);
  });

  app.get("/api/admin/students/progress", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const allProgress = await db_getProgress();
    res.json(allProgress);
  });

  app.get("/api/admin/students/modules-summary", async (req: Request, res: Response) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const { db } = await import("./db");
      const result = await db.execute(sql`SELECT user_id, module_id FROM user_modules WHERE enabled = true`);
      const rows = (result as any).rows || [];
      const map: Record<number, number[]> = {};
      for (const row of rows) {
        if (!map[row.user_id]) map[row.user_id] = [];
        map[row.user_id].push(row.module_id);
      }
      res.json(map);
    } catch (e: any) {
      console.error("[GET /api/admin/students/modules-summary]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  app.post("/api/admin/students/:id/approve", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    const user = await storage.getUser(parseInt(req.params.id));
    if (!user) return res.status(404).json({ message: "Aluno não encontrado" });
    const bodyPlanId = req.body?.planId ? parseInt(req.body.planId) : null;
    const effectivePlanId = bodyPlanId || user.planId;
    const plan = effectivePlanId ? await storage.getPlan(effectivePlanId) : null;
    const durationDays = plan ? plan.durationDays : 90;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);
    const updateData: any = {
      approved: true,
      role: "student",
      trialStartedAt: null,
      accessExpiresAt: expiresAt.toISOString(),
      moduleContentExpiresAt: expiresAt.toISOString(),
      materialsAccess: true,
      convertedAt: new Date().toISOString(),
    };
    if (bodyPlanId) updateData.planId = bodyPlanId;
    const updated = await storage.updateUser(user.id, updateData);
    if (!updated) return res.status(500).json({ message: "Erro ao aprovar" });
    const { password, ...safe } = updated;
    const admin = await storage.getUser(auth.userId);
    await logAction(auth.userId, admin?.name || "Admin", "student_approved", "student", user.id, user.name, { planId: effectivePlanId, planName: plan?.name });
    // Log lead event for conversion
    try {
      const { db: evDb } = await import("./db");
      await evDb.execute(sql`INSERT INTO lead_events (user_id, event_type, event_description, metadata, created_at)
        VALUES (${user.id}, 'convertido', ${'Convertido para ' + (plan?.name || 'Aluno Pagante') + ' por ' + (admin?.name || 'Admin')}, ${JSON.stringify({ planId: effectivePlanId, planName: plan?.name, adminId: auth.userId })}, ${new Date().toISOString()})`);
    } catch {} // non-blocking
    res.json(safe);
  });

  app.post("/api/admin/students/:id/revoke", async (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    const student = await storage.getUser(parseInt(req.params.id));
    const updated = await storage.updateUser(parseInt(req.params.id), { approved: false, accessExpiresAt: null });
    if (!updated) return res.status(404).json({ message: "Aluno não encontrado" });
    const { password, ...safe } = updated;
    const admin = await storage.getUser(auth.userId);
    await logAction(auth.userId, admin?.name || "Admin", "student_revoked", "student", parseInt(req.params.id), student?.name || "?");
    res.json(safe);
  });

  app.delete("/api/admin/students/:id", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const { db } = await import("./db");
      const userId = parseInt(req.params.id);
      const student = await storage.getUser(userId);
      if (!student) return res.status(404).json({ message: "Aluno não encontrado" });
      // Cascade delete related records
      await db.execute(sql`DELETE FROM user_modules WHERE user_id = ${userId}`).catch(() => {});
      await db.execute(sql`DELETE FROM user_material_categories WHERE user_id = ${userId}`).catch(() => {});
      await db.execute(sql`DELETE FROM credit_transactions WHERE user_id = ${userId}`).catch(() => {});
      await db.execute(sql`DELETE FROM lesson_progress WHERE user_id = ${userId}`).catch(() => {});
      const ok = await storage.deleteUser(userId);
      const admin = await storage.getUser(auth.userId);
      await logAction(auth.userId, admin?.name || "Admin", "student_deleted", "student", userId, student?.name || "?");
      res.json({ success: ok });
    } catch (err: any) {
      console.error("delete-student error:", err);
      res.status(500).json({ message: "Erro ao excluir aluno" });
    }
  });

  app.patch("/api/admin/students/:id", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    const allowedFields = ['name', 'email', 'phone', 'instagram', 'planId', 'approved', 'accessExpiresAt',
      'communityAccess', 'supportAccess', 'supportExpiresAt', 'clinicalPracticeAccess',
      'clinicalPracticeHours', 'clinicalObservationHours', 'materialsAccess', 'mentorshipStartDate', 'mentorshipEndDate',
      'planKey', 'planPaidAt', 'planAmountPaid', 'moduleContentExpiresAt'];
    const updateData: any = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        if (key === "phone") {
          updateData[key] = sanitizePhone(req.body[key]);
        } else if (typeof req.body[key] === "string" && !['accessExpiresAt', 'supportExpiresAt', 'mentorshipStartDate', 'mentorshipEndDate', 'moduleContentExpiresAt', 'email'].includes(key)) {
          updateData[key] = sanitize(req.body[key]);
        } else {
          updateData[key] = req.body[key];
        }
      }
    }
    const student = await storage.getUser(parseInt(req.params.id));
    const updated = await storage.updateUser(parseInt(req.params.id), updateData);
    if (!updated) return res.status(404).json({ message: "Aluno não encontrado" });
    const { password, ...safe } = updated;
    const admin = await storage.getUser(auth.userId);
    await logAction(auth.userId, admin?.name || "Admin", "student_updated", "student", parseInt(req.params.id), student?.name || "?", updateData);
    res.json(safe);
  });

  // ==================== ADMIN: Extend trial access ====================
  app.put("/api/admin/students/:id/extend-trial", async (req: Request, res: Response) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const { db } = await import("./db");
      const userId = parseInt(req.params.id as string);
      const { days } = req.body as { days: number };
      if (!days || days < 1 || days > 365) {
        return res.status(400).json({ message: "days deve ser entre 1 e 365" });
      }
      const student = await storage.getUser(userId);
      if (!student) return res.status(404).json({ message: "Aluno não encontrado" });
      const currentExpiry = student.accessExpiresAt ? new Date(student.accessExpiresAt) : new Date();
      const base = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = new Date(base.getTime() + days * 86400000).toISOString();
      await db.execute(sql`UPDATE users SET access_expires_at = ${newExpiry} WHERE id = ${userId}`);
      const admin = await storage.getUser(auth.userId);
      await logAction(auth.userId, admin?.name || "Admin", "student_updated", "student", userId, student.name, { action: "extend_trial", days, newExpiry });
      const updated = await storage.getUser(userId);
      if (!updated) return res.status(404).json({ message: "Aluno não encontrado" });
      const { password, ...safe } = updated;
      res.json(safe);
    } catch (err: any) {
      console.error("extend-trial error:", err);
      res.status(500).json({ message: "Erro ao estender trial" });
    }
  });

  // ==================== ADMIN: Change student role ====================
  app.put("/api/admin/students/:id/role", async (req: Request, res: Response) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const { db } = await import("./db");
      const userId = parseInt(req.params.id as string);
      const { role } = req.body as { role: string };
      if (!role || !["student", "trial"].includes(role)) {
        return res.status(400).json({ message: "role deve ser 'student' ou 'trial'" });
      }
      const student = await storage.getUser(userId);
      if (!student) return res.status(404).json({ message: "Aluno não encontrado" });
      await db.execute(sql`UPDATE users SET role = ${role} WHERE id = ${userId}`);
      const admin = await storage.getUser(auth.userId);
      await logAction(auth.userId, admin?.name || "Admin", "student_updated", "student", userId, student.name, { action: "role_changed", oldRole: student.role, newRole: role });
      const updated = await storage.getUser(userId);
      if (!updated) return res.status(404).json({ message: "Aluno não encontrado" });
      const { password, ...safe } = updated;
      res.json(safe);
    } catch (err: any) {
      console.error("change-role error:", err);
      res.status(500).json({ message: "Erro ao alterar role" });
    }
  });

  // ==================== ADMIN: Provision student by planKey ====================
  app.post("/api/admin/students/:id/provision", async (req: Request, res: Response) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const { db } = await import("./db");
      const userId = parseInt(req.params.id as string);
      const { planKey } = req.body as { planKey: string };
      if (!planKey) return res.status(400).json({ message: "planKey é obrigatório" });

      const { PLAN_PROVISIONING } = await import("./plan-provisioning");
      const { PLANS } = await import("./stripe-plans");
      const provisioning = PLAN_PROVISIONING[planKey];
      if (!provisioning) return res.status(400).json({ message: "planKey inválido para provisionamento" });

      const plan = PLANS[planKey as keyof typeof PLANS];
      const now = new Date().toISOString();
      const accessDays = plan ? plan.accessDays : 180;
      const accessExpiry = new Date(Date.now() + accessDays * 86400000).toISOString();

      // Calculate mentorship and support dates
      const mentorshipStartDate = provisioning.mentorshipMonths > 0 ? now.slice(0, 10) : null;
      const mentorshipEndDate = provisioning.mentorshipMonths > 0
        ? new Date(Date.now() + provisioning.mentorshipMonths * 30 * 86400000).toISOString().slice(0, 10)
        : null;
      const supportExpiresAt = provisioning.supportMonths > 0
        ? new Date(Date.now() + provisioning.supportMonths * 30 * 86400000).toISOString()
        : accessExpiry;

      // Clinical + practice hours from plan config
      const clinicalHours = plan ? (plan.clinicalHours + plan.practiceHours) : 0;

      // 1. Update user fields (clear trial, set role to student, set plan_paid_at)
      const moduleExpiry = new Date(Date.now() + accessDays * 86400000).toISOString();
      await db.execute(sql`UPDATE users SET
        plan_key = ${planKey},
        role = 'student',
        approved = true,
        trial_started_at = NULL,
        plan_paid_at = COALESCE(plan_paid_at, ${now}),
        access_expires_at = ${accessExpiry},
        module_content_expires_at = ${moduleExpiry},
        materials_access = true,
        community_access = true,
        support_access = true,
        support_expires_at = ${supportExpiresAt},
        clinical_practice_access = ${clinicalHours > 0},
        clinical_practice_hours = ${clinicalHours},
        mentorship_start_date = ${mentorshipStartDate},
        mentorship_end_date = ${mentorshipEndDate}
      WHERE id = ${userId}`);

      // 2. Provision modules
      if (provisioning.modules.length > 0) {
        await db.execute(sql`DELETE FROM user_modules WHERE user_id = ${userId}`);
        for (const m of provisioning.modules) {
          await db.execute(sql`INSERT INTO user_modules (user_id, module_id, enabled, start_date, end_date)
            VALUES (${userId}, ${m.moduleId}, ${m.enabled}, ${now.slice(0, 10)}, ${accessExpiry.slice(0, 10)})
            ON CONFLICT (user_id, module_id) DO UPDATE SET enabled = ${m.enabled}`);
        }
      }

      // 3. Provision materials
      if (provisioning.materials.length > 0) {
        await db.execute(sql`DELETE FROM user_material_categories WHERE user_id = ${userId}`);
        for (const cat of provisioning.materials) {
          await db.execute(sql`INSERT INTO user_material_categories (user_id, category_name, enabled)
            VALUES (${userId}, ${cat}, true)
            ON CONFLICT (user_id, category_name) DO UPDATE SET enabled = true`);
        }
      }

      // 4. Audit log
      const admin = await storage.getUser(auth.userId);
      const student = await storage.getUser(userId);
      await logAction(auth.userId, admin?.name || "Admin", "student_provisioned", "student", userId, student?.name || "?", {
        planKey, modules: provisioning.modules.length, materials: provisioning.materials.length,
        mentorshipMonths: provisioning.mentorshipMonths, supportMonths: provisioning.supportMonths,
      });

      console.log(`[admin provision] userId ${userId} provisionado no perfil ${planKey} | módulos: ${provisioning.modules.length} | materiais: ${provisioning.materials.length}`);
      res.json({ message: "Provisionamento concluído", planKey });
    } catch (e: any) {
      console.error("[admin provision] Error:", e.message);
      res.status(500).json({ message: "Erro ao provisionar aluno" });
    }
  });

  // ==================== ADMIN: User Modules ====================
  app.get("/api/admin/students/:id/modules", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });
    const um = await storage.getUserModules(id);
    res.json(um);
  });

  app.put("/api/admin/students/:id/modules", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });
    const { modules: moduleEntries } = req.body;
    if (!Array.isArray(moduleEntries)) {
      return res.status(400).json({ message: "modules array obrigatório" });
    }
    await storage.setUserModules(id, moduleEntries.map((e: any) => ({
      moduleId: Number(e.moduleId),
      enabled: Boolean(e.enabled),
      startDate: e.startDate || null,
      endDate: e.endDate || null,
    })));
    const admin = await storage.getUser(auth.userId);
    const student = await storage.getUser(id);
    await logAction(auth.userId, admin?.name || "Admin", "student_modules_updated", "student", id, student?.name || "?", { moduleCount: moduleEntries.length });
    res.json({ success: true });
  });

  // ==================== ADMIN: User Material Categories ====================
  app.get("/api/admin/students/:id/material-categories", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });
    const umc = await storage.getUserMaterialCategories(id);
    res.json(umc);
  });

  app.put("/api/admin/students/:id/material-categories", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });
    const { categories } = req.body;
    if (!Array.isArray(categories)) {
      return res.status(400).json({ message: "categories array obrigatório" });
    }
    await storage.setUserMaterialCategories(id, categories.map((e: any) => ({
      categoryTitle: String(e.categoryTitle),
      enabled: Boolean(e.enabled),
    })));
    const admin = await storage.getUser(auth.userId);
    const student = await storage.getUser(id);
    await logAction(auth.userId, admin?.name || "Admin", "student_material_categories_updated", "student", id, student?.name || "?", { categoryCount: categories.length });
    res.json({ success: true });
  });

  // Reorder modules
  app.post("/api/admin/modules/reorder", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { orderedIds } = req.body;
    if (!orderedIds || !Array.isArray(orderedIds) || orderedIds.length > 500) {
      return res.status(400).json({ message: "orderedIds array obrigatório" });
    }
    if (!orderedIds.every((id: any) => typeof id === "number" && Number.isInteger(id) && id > 0)) {
      return res.status(400).json({ message: "orderedIds deve conter apenas IDs inteiros positivos" });
    }
    for (let i = 0; i < orderedIds.length; i++) {
      await storage.updateModule(orderedIds[i], { order: i + 1 });
    }
    const updated = await storage.getModules();
    res.json(updated);
  });

  // Reorder plans
  app.post("/api/admin/plans/reorder", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { orderedIds } = req.body;
    if (!orderedIds || !Array.isArray(orderedIds) || orderedIds.length > 500) {
      return res.status(400).json({ message: "orderedIds array obrigatório" });
    }
    if (!orderedIds.every((id: any) => typeof id === "number" && Number.isInteger(id) && id > 0)) {
      return res.status(400).json({ message: "orderedIds deve conter apenas IDs inteiros positivos" });
    }
    for (let i = 0; i < orderedIds.length; i++) {
      await storage.updatePlan(orderedIds[i], { order: i + 1 });
    }
    const updated = await storage.getPlans();
    res.json(updated);
  });

  // Reorder lessons
  app.post("/api/admin/lessons/reorder", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { orderedIds } = req.body;
    if (!orderedIds || !Array.isArray(orderedIds) || orderedIds.length > 500) {
      return res.status(400).json({ message: "orderedIds array obrigatório" });
    }
    if (!orderedIds.every((id: any) => typeof id === "number" && Number.isInteger(id) && id > 0)) {
      return res.status(400).json({ message: "orderedIds deve conter apenas IDs inteiros positivos" });
    }
    for (let i = 0; i < orderedIds.length; i++) {
      await storage.updateLesson(orderedIds[i], { order: i + 1 });
    }
    const updated = await storage.getLessons();
    res.json(updated);
  });

  app.post("/api/admin/modules", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const data = insertModuleSchema.parse(req.body);
      const mod = await storage.createModule(data);
      const admin = await storage.getUser(auth.userId);
      await logAction(auth.userId, admin?.name || "Admin", "module_created", "module", mod.id, mod.title);
      res.json(mod);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/modules/:id", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    const { title, description, order, imageUrl } = req.body;
    const moduleUpdate: Partial<{ title: string; description: string | null; order: number; imageUrl: string | null }> = {};
    if (title !== undefined) moduleUpdate.title = sanitize(title);
    if (description !== undefined) moduleUpdate.description = description ? sanitize(description) : null;
    if (order !== undefined) moduleUpdate.order = order;
    if (imageUrl !== undefined) {
      if (imageUrl && !isValidUrl(imageUrl)) return res.status(400).json({ message: "URL de imagem inválida" });
      moduleUpdate.imageUrl = imageUrl;
    }
    const updated = await storage.updateModule(parseInt(req.params.id), moduleUpdate);
    if (!updated) return res.status(404).json({ message: "Módulo não encontrado" });
    const admin = await storage.getUser(auth.userId);
    await logAction(auth.userId, admin?.name || "Admin", "module_updated", "module", updated.id, updated.title, moduleUpdate);
    res.json(updated);
  });

  app.delete("/api/admin/modules/:id", async (req, res) => {
    // Only super_admin can delete modules
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    const mod = await storage.getModule(parseInt(req.params.id));
    const ok = await storage.deleteModule(parseInt(req.params.id));
    const admin = await storage.getUser(auth.userId);
    await logAction(auth.userId, admin?.name || "Admin", "module_deleted", "module", parseInt(req.params.id), mod?.title || "?");
    res.json({ success: ok });
  });

  app.post("/api/admin/lessons", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const { classifyLesson } = await import("./classify-lesson");
      const now = new Date().toISOString();
      const body = { ...req.body, createdAt: now, updatedAt: now };
      // Auto-classify if admin didn't provide an explicit contentType
      if (!body.contentType) {
        body.contentType = classifyLesson(body.title || "", body.description);
      }
      const data = insertLessonSchema.parse(body);
      const lesson = await storage.createLesson(data);
      const admin = await storage.getUser(auth.userId);
      await logAction(auth.userId, admin?.name || "Admin", "lesson_created", "lesson", lesson.id, lesson.title);
      res.json(lesson);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/lessons/:id", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    const { moduleId, title, description, videoUrl, duration, order, contentType } = req.body;
    const lessonUpdate: Partial<{ moduleId: number; title: string; description: string | null; videoUrl: string | null; duration: string | null; order: number; contentType: string; updatedAt: string }> = {};
    if (moduleId !== undefined) lessonUpdate.moduleId = moduleId;
    if (title !== undefined) lessonUpdate.title = sanitize(title);
    if (description !== undefined) lessonUpdate.description = description ? sanitize(description) : null;
    if (videoUrl !== undefined) {
      if (videoUrl && !isValidUrl(videoUrl)) return res.status(400).json({ message: "URL de vídeo inválida" });
      lessonUpdate.videoUrl = videoUrl;
    }
    if (duration !== undefined) lessonUpdate.duration = duration ? sanitize(duration) : null;
    if (order !== undefined) lessonUpdate.order = order;
    if (contentType !== undefined) {
      // Admin explicitly set contentType — respect the override
      lessonUpdate.contentType = contentType;
    } else if (title !== undefined || description !== undefined) {
      // Title or description changed without explicit contentType — auto-classify
      const { classifyLesson } = await import("./classify-lesson");
      const existing = await storage.getLesson(parseInt(req.params.id));
      const effectiveTitle = title !== undefined ? sanitize(title) : (existing?.title || "");
      const effectiveDesc = description !== undefined ? (description ? sanitize(description) : null) : (existing?.description || null);
      lessonUpdate.contentType = classifyLesson(effectiveTitle, effectiveDesc);
    }
    lessonUpdate.updatedAt = new Date().toISOString();
    const updated = await storage.updateLesson(parseInt(req.params.id), lessonUpdate);
    if (!updated) return res.status(404).json({ message: "Aula não encontrada" });
    const admin = await storage.getUser(auth.userId);
    await logAction(auth.userId, admin?.name || "Admin", "lesson_updated", "lesson", updated.id, updated.title, lessonUpdate);
    res.json(updated);
  });

  app.delete("/api/admin/lessons/:id", async (req, res) => {
    // Only super_admin can delete lessons
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    const lesson = await storage.getLesson(parseInt(req.params.id));
    const ok = await storage.deleteLesson(parseInt(req.params.id));
    const admin = await storage.getUser(auth.userId);
    await logAction(auth.userId, admin?.name || "Admin", "lesson_deleted", "lesson", parseInt(req.params.id), lesson?.title || "?");
    res.json({ success: ok });
  });

  // ==================== ADMIN: Password Reset ====================
  app.post("/api/admin/students/:id/reset-password", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) return res.status(404).json({ message: "Aluno não encontrado" });
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await storage.createPasswordReset(user.id, token, expiresAt);
      const admin = await storage.getUser(auth.userId);
      await logAction(auth.userId, admin?.name || "Admin", "password_reset", "student", user.id, user.name);
      res.json({ token, link: `/reset-password/${token}` });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Erro ao gerar link de reset" });
    }
  });

  // ==================== AUTH: Reset Password ====================
  app.get("/api/auth/reset-password/:token", async (req, res) => {
    try {
      const pr = await storage.getPasswordResetByToken(req.params.token);
      if (!pr || pr.used || new Date() > new Date(pr.expiresAt)) {
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }
      res.json({ valid: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/auth/reset-password/:token", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      if (!rateLimit(`reset:${ip}`, 5, 15 * 60 * 1000)) {
        return res.status(429).json({ message: "Muitas tentativas. Tente novamente mais tarde." });
      }
      const { password } = req.body;
      if (!password || password.length < 6) {
        return res.status(400).json({ message: "Senha deve ter pelo menos 6 caracteres" });
      }
      const pr = await storage.getPasswordResetByToken(req.params.token);
      if (!pr || pr.used || new Date() > new Date(pr.expiresAt)) {
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }
      const hashed = await bcrypt.hash(password, 10);
      await storage.updateUser(pr.userId, { password: hashed });
      await storage.markPasswordResetUsed(pr.id);
      res.json({ message: "Senha alterada com sucesso" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ==================== AUTH: Profile Update ====================
  app.patch("/api/auth/profile", async (req, res) => {
    try {
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });
      const { currentPassword, name, email, phone, newPassword, instagram } = req.body;
      if (!currentPassword) {
        return res.status(400).json({ message: "Senha atual é obrigatória" });
      }
      const userId = auth.userId;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(401).json({ message: "Senha atual incorreta" });

      const updateData: any = {};
      if (name && name !== user.name) updateData.name = sanitize(name);
      if (phone !== undefined && sanitizePhone(phone) !== (user.phone || "")) updateData.phone = sanitizePhone(phone);
      if (instagram !== undefined) {
        const normalizedIg = sanitize((instagram || "").replace(/^@/, "").trim());
        if (normalizedIg !== (user as any).instagram) updateData.instagram = normalizedIg;
      }
      if (email && email !== user.email) {
        const existing = await storage.getUserByEmail(email);
        if (existing && existing.id !== user.id) {
          return res.status(400).json({ message: "Este email já está em uso" });
        }
        updateData.email = email.trim().toLowerCase();
      }
      if (newPassword) {
        if (newPassword.length < 6) {
          return res.status(400).json({ message: "Nova senha deve ter pelo menos 6 caracteres" });
        }
        updateData.password = await bcrypt.hash(newPassword, 10);
      }

      if (Object.keys(updateData).length === 0) {
        return res.json({ message: "Nenhuma alteração", user: { id: user.id, name: user.name, email: user.email, role: user.role, planId: user.planId, approved: user.approved, accessExpiresAt: user.accessExpiresAt, createdAt: user.createdAt } });
      }

      const updated = await storage.updateUser(userId, updateData);
      if (!updated) return res.status(500).json({ message: "Erro ao atualizar" });
      const { password: _, loginAttempts: _la, lockedUntil: _lu, ...safe } = updated;
      res.json({ message: "Perfil atualizado com sucesso", user: safe });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Erro ao atualizar perfil" });
    }
  });

  // ==================== ADMIN: Admin Management (super_admin only) ====================
  app.get("/api/admin/admins", async (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    const admins = await storage.getAllAdmins();
    const safe = admins.map(({ password, ...s }) => s);
    res.json(safe);
  });

  app.post("/api/admin/admins", async (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    try {
      const { name, email, password, phone } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Nome, email e senha são obrigatórios" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Senha deve ter pelo menos 6 caracteres" });
      }
      const existing = await storage.getUserByEmail(email.trim().toLowerCase());
      if (existing) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newAdmin = await storage.createUser({
        name: sanitize(name),
        email: email.trim().toLowerCase(),
        phone: phone ? sanitizePhone(phone) : null,
        password: hashedPassword,
        planId: null,
        role: "admin",
        approved: true,
        createdAt: new Date().toISOString(),
      });
      const { password: _, ...safe } = newAdmin;
      const superAdmin = await storage.getUser(auth.userId);
      await logAction(auth.userId, superAdmin?.name || "Super Admin", "admin_created", "admin", newAdmin.id, newAdmin.name);
      res.json(safe);
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Erro ao criar admin" });
    }
  });

  // PATCH /api/admin/admins/:id/role — super_admin altera role de outro admin (nao pode escalar para super_admin)
  app.patch("/api/admin/admins/:id/role", async (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    const targetId = parseInt(req.params.id);
    if (targetId === auth.userId) {
      return res.status(400).json({ message: "Não é possível alterar a própria role" });
    }
    const { role } = req.body;
    if (!role || ![ "admin" ].includes(role)) {
      return res.status(400).json({ message: "Role inválida. Apenas 'admin' é permitido" });
    }
    const target = await storage.getUser(targetId);
    if (!target) return res.status(404).json({ message: "Usuário não encontrado" });
    // Nao permite rebaixar a si mesmo nem escalar outro para super_admin
    // Permite rebaixar super_admin para admin (caso de auditoria/gestao)
    const updated = await storage.updateUser(targetId, { role });
    const superAdmin = await storage.getUser(auth.userId);
    await logAction(auth.userId, superAdmin?.name || "Super Admin", "admin_role_changed", "admin", targetId, target.name, { from: target.role, to: role });
    const { password: _, ...safe } = updated!;
    res.json(safe);
  });

  app.delete("/api/admin/admins/:id", async (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    const targetId = parseInt(req.params.id);
    if (targetId === auth.userId) {
      return res.status(400).json({ message: "Não é possível excluir a própria conta" });
    }
    const target = await storage.getUser(targetId);
    if (!target || target.role === "super_admin") {
      return res.status(400).json({ message: "Não é possível excluir este usuário" });
    }
    await storage.deleteUser(targetId);
    const superAdmin = await storage.getUser(auth.userId);
    await logAction(auth.userId, superAdmin?.name || "Super Admin", "admin_deleted", "admin", targetId, target.name);
    res.json({ success: true });
  });

  // ==================== MATERIALS (DB-driven) ====================
  // Public endpoint: get all themes with nested subcategories and files
  // Mapa canônico de capas — fonte da verdade, nunca depende do banco
  // Atualizar este mapa sempre que gerar novas imagens de capa
  const COVER_MAP: Record<string, string> = {
    "Toxina Botul\u00ednica":                  "/images/covers/cover_toxina_botulinica_v2026.png",
    "Preenchedores Faciais":               "/images/covers/cover_preenchedores_faciais_v2026.png",
    "Bioestimuladores de Col\u00e1geno":       "/images/covers/cover_bioestimuladores_v2026.png",
    "Moduladores de Matriz Extracelular":  "/images/covers/cover_moduladores_matriz_v2026.png",
    "M\u00e9todo NaturalUp\u00ae":                  "/images/covers/cover_metodo_naturalup_v2026.png",
    "IA na Medicina Est\u00e9tica":             "/images/covers/cover_ia_medicina.png",
  };

  app.get("/api/materials", async (req, res) => {
    // Materials catalog: structure is visible to authenticated users, but driveId/youtubeId
    // only for users with active non-expired access
    try {
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });
      const isAdmin = auth.role === "admin" || auth.role === "super_admin";

      // Determine if this user has active materials access (approved + non-expired)
      let hasActiveAccess = isAdmin;
      if (!isAdmin) {
        try {
          const { db: matDb } = await import("./db");
          const uRow = await matDb.execute(sql`SELECT approved, access_expires_at, materials_access FROM users WHERE id = ${auth.userId}`);
          const u = (uRow as any).rows?.[0];
          if (u && u.approved !== false && u.materials_access !== false) {
            if (u.access_expires_at) {
              hasActiveAccess = new Date() <= new Date(u.access_expires_at);
            } else {
              hasActiveAccess = true;
            }
          }
        } catch { /* default to no access */ }
      }

      const allThemes = await storage.getMaterialThemes();
      const themes = isAdmin ? allThemes : allThemes.filter(t => t.visible !== false);
      // Fetch all subcategories in parallel (one query per theme, all themes at once)
      const allSubcategories = await Promise.all(themes.map(t => storage.getMaterialSubcategories(t.id)));
      // Collect all subcategory IDs, then fetch all files in parallel
      const allSubsFlat = allSubcategories.flat();
      const allFiles = await Promise.all(allSubsFlat.map(sub => storage.getMaterialFiles(sub.id)));
      // Build a map: subcategoryId -> files
      const filesMap = new Map<number, typeof allFiles[0]>();
      allSubsFlat.forEach((sub, i) => { filesMap.set(sub.id, allFiles[i]); });
      // Assemble result
      const result = themes.map((theme, themeIdx) => {
        const subcategories = allSubcategories[themeIdx];
        const subsWithFiles = subcategories.map(sub => {
          const files = filesMap.get(sub.id) || [];
          const sanitizedFiles = hasActiveAccess
            ? files
            : files.map(({ driveId: _d, youtubeId: _y, ...rest }) => rest);
          return { ...sub, files: sanitizedFiles };
        });
        const fileCount = subsWithFiles.reduce((acc, sub) => acc + sub.files.length, 0);
        const coverUrl = COVER_MAP[theme.title] ?? theme.coverUrl;
        return { ...theme, coverUrl, subcategories: subsWithFiles, fileCount };
      });
      // Cache materials response (catalog changes infrequently)
      res.set("Cache-Control", "private, max-age=300");
      res.json(result);
    } catch (e: any) {
      console.error("GET /api/materials error:", e?.message || e);
      res.status(500).json({ message: "Erro ao carregar materiais" });
    }
  });

  // Admin CRUD: Themes
  app.post("/api/admin/materials/themes", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const { title, coverUrl, order } = req.body;
      if (!title || !coverUrl) return res.status(400).json({ message: "Título e URL da capa são obrigatórios" });
      const theme = await storage.createMaterialTheme({ title: sanitize(title), coverUrl: sanitize(coverUrl), order: order ?? 0 });
      const admin = await storage.getUser(auth.userId);
      await logAction(auth.userId, admin?.name || "Admin", "material_theme_created", "material_theme", theme.id, theme.title);
      res.json(theme);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/admin/materials/themes/:id", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });
    const { title, coverUrl, order, visible } = req.body;
    const updateData: any = {};
    if (title !== undefined) updateData.title = sanitize(title);
    if (coverUrl !== undefined) updateData.coverUrl = sanitize(coverUrl);
    if (order !== undefined) updateData.order = order;
    if (visible !== undefined) updateData.visible = visible;
    const updated = await storage.updateMaterialTheme(id, updateData);
    if (!updated) return res.status(404).json({ message: "Tema não encontrado" });
    const admin = await storage.getUser(auth.userId);
    await logAction(auth.userId, admin?.name || "Admin", "material_theme_updated", "material_theme", updated.id, updated.title);
    res.json(updated);
  });

  app.delete("/api/admin/materials/themes/:id", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });
    const theme = await storage.getMaterialTheme(id);
    await storage.deleteMaterialTheme(id);
    const admin = await storage.getUser(auth.userId);
    await logAction(auth.userId, admin?.name || "Admin", "material_theme_deleted", "material_theme", id, theme?.title || "?");
    res.json({ success: true });
  });

  // Admin CRUD: Subcategories
  app.post("/api/admin/materials/subcategories", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const { themeId, name, order } = req.body;
      if (!themeId || !name) return res.status(400).json({ message: "themeId e nome são obrigatórios" });
      const sub = await storage.createMaterialSubcategory({ themeId, name: sanitize(name), order: order ?? 0 });
      const admin = await storage.getUser(auth.userId);
      await logAction(auth.userId, admin?.name || "Admin", "material_subcategory_created", "material_subcategory", sub.id, sub.name);
      res.json(sub);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/admin/materials/subcategories/:id", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });
    const { name, order } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = sanitize(name);
    if (order !== undefined) updateData.order = order;
    const updated = await storage.updateMaterialSubcategory(id, updateData);
    if (!updated) return res.status(404).json({ message: "Subcategoria não encontrada" });
    const admin = await storage.getUser(auth.userId);
    await logAction(auth.userId, admin?.name || "Admin", "material_subcategory_updated", "material_subcategory", updated.id, updated.name);
    res.json(updated);
  });

  app.delete("/api/admin/materials/subcategories/:id", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });
    await storage.deleteMaterialSubcategory(id);
    const admin = await storage.getUser(auth.userId);
    await logAction(auth.userId, admin?.name || "Admin", "material_subcategory_deleted", "material_subcategory", id);
    res.json({ success: true });
  });

  // Admin CRUD: Files
  app.post("/api/admin/materials/files", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const { subcategoryId, name, type, driveId, order } = req.body;
      if (!subcategoryId || !name || !type || !driveId) return res.status(400).json({ message: "subcategoryId, nome, tipo e driveId são obrigatórios" });
      if (!["pdf","docx","mp3","youtube"].includes(type)) return res.status(400).json({ message: "Tipo deve ser 'pdf', 'docx', 'mp3' ou 'youtube'" });
      const { youtubeId } = req.body;
      const file = await storage.createMaterialFile({ subcategoryId, name: sanitize(name), type, driveId: sanitize(driveId), youtubeId: youtubeId ? sanitize(youtubeId) : null, order: order ?? 0 });
      const admin = await storage.getUser(auth.userId);
      await logAction(auth.userId, admin?.name || "Admin", "material_file_created", "material_file", file.id, file.name);
      res.json(file);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/admin/materials/files/:id", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });
    const { name, type, driveId, youtubeId, order } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = sanitize(name);
    if (type !== undefined) {
      if (!["pdf","docx","mp3","youtube"].includes(type)) return res.status(400).json({ message: "Tipo deve ser 'pdf', 'docx', 'mp3' ou 'youtube'" });
      updateData.type = type;
    }
    if (driveId !== undefined) updateData.driveId = sanitize(driveId);
    if (youtubeId !== undefined) updateData.youtubeId = youtubeId ? sanitize(youtubeId) : null;
    if (order !== undefined) updateData.order = order;
    const updated = await storage.updateMaterialFile(id, updateData);
    if (!updated) return res.status(404).json({ message: "Arquivo não encontrado" });
    const admin = await storage.getUser(auth.userId);
    await logAction(auth.userId, admin?.name || "Admin", "material_file_updated", "material_file", updated.id, updated.name);
    res.json(updated);
  });

  app.delete("/api/admin/materials/files/:id", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    const id = safeParseInt(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });
    await storage.deleteMaterialFile(id);
    const admin = await storage.getUser(auth.userId);
    await logAction(auth.userId, admin?.name || "Admin", "material_file_deleted", "material_file", id);
    res.json({ success: true });
  });

  // ==================== ADMIN: Audit Logs ====================
  app.get("/api/admin/audit-logs", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    // Secondary admins can only see their own logs
    if (auth.role === "admin") {
      const logs = await storage.getAuditLogsByAdmin(auth.userId);
      return res.json(logs);
    }
    // Super admin sees all
    const adminId = req.query.adminId ? parseInt(req.query.adminId as string) : undefined;
    const action = req.query.action as string | undefined;
    const logs = await storage.getAuditLogs({ adminId, action });
    res.json(logs);
  });

  // GET /api/admin/activity-log - combined activity log with type filter
  app.get("/api/admin/activity-log", async (req: Request, res: Response) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const { db } = await import("./db");
      
      // Admin actions from audit_logs
      const adminLogs = await db.execute(sql`
        SELECT al.id, al.action, al.details, al.created_at, 
          COALESCE(u.name, 'Admin') as actor_name,
          'admin' as log_type
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al.admin_id
        ORDER BY al.created_at DESC LIMIT 50
      `);
      
      // Student logins (from users table)
      const studentLogins = await db.execute(sql`
        SELECT id, name, email, last_login_at, login_count, role, plan_key
        FROM users 
        WHERE last_login_at IS NOT NULL AND role NOT IN ('admin', 'super_admin')
        ORDER BY last_login_at DESC LIMIT 50
      `);
      
      res.json({
        adminActions: (adminLogs as any).rows || [],
        studentActivity: (studentLogins as any).rows || [],
      });
    } catch (e: any) {
      res.status(500).json({ message: "Erro" });
    }
  });

  // ==================== SEED (only if empty) ====================
  app.post("/api/admin/seed", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const existingPlans = await storage.getPlans();
    if (existingPlans.length > 0) {
      return res.json({ message: "Banco já possui dados" });
    }

    // Create plans
    await storage.createPlan({ name: "Online", description: "Mentoria online com acesso às aulas gravadas", durationDays: 90, price: "R$ 7.430" });
    await storage.createPlan({ name: "Presencial", description: "Mentoria presencial + acesso às aulas gravadas", durationDays: 180, price: "R$ 12.390" });
    await storage.createPlan({ name: "Completo", description: "Mentoria completa: online + presencial + acesso total", durationDays: 365, price: "R$ 17.350" });

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return res.status(500).json({ message: "ADMIN_PASSWORD environment variable is required for seeding" });
    }
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const admin = await storage.createUser({
      name: "Dr. Gustavo Martins",
      email: "admin@amplafacial.com",
      password: hashedPassword,
      planId: null,
      createdAt: new Date().toISOString(),
    });
    await storage.updateUser(admin.id, { role: "super_admin", approved: true });

    // Create modules
    await storage.createModule({ title: "Fundamentos", description: "Introdução à Harmonização Orofacial", order: 1, imageUrl: null });
    await storage.createModule({ title: "Toxina Botulínica", description: "Técnicas e protocolos de aplicação", order: 2, imageUrl: null });
    await storage.createModule({ title: "Preenchedores à Base de Ácido Hialurônico", description: "Preenchimentos e volumização", order: 3, imageUrl: null });
    await storage.createModule({ title: "Método NaturalUp®", description: "O protocolo integrado completo", order: 4, imageUrl: null });

    // Create sample lessons
    await storage.createLesson({ moduleId: 1, title: "Boas-vindas à Mentoria", description: "Apresentação do programa e metodologia", videoUrl: "", duration: "12:00", order: 1 });
    await storage.createLesson({ moduleId: 1, title: "Anatomia Facial Aplicada", description: "Revisão anatômica para procedimentos", videoUrl: "", duration: "45:00", order: 2 });
    await storage.createLesson({ moduleId: 2, title: "Mecanismo de Ação", description: "Como a toxina botulínica funciona", videoUrl: "", duration: "25:00", order: 1 });
    await storage.createLesson({ moduleId: 3, title: "Tipos de Ácido Hialurônico", description: "Classificação e indicações", videoUrl: "", duration: "35:00", order: 1 });
    await storage.createLesson({ moduleId: 4, title: "Visão Integrada NaturalUp®", description: "Como combinar todas as técnicas", videoUrl: "", duration: "60:00", order: 1 });

    res.json({ message: "Banco populado com sucesso!" });
  });

  // ==================== MIGRATE ====================
  app.post("/api/admin/migrate", async (req, res) => {
    const migrateKey = req.headers["x-migrate-key"];
    const expectedKey = process.env.MIGRATE_KEY;
    // Auth: require either valid MIGRATE_KEY or super_admin JWT
    if (migrateKey) {
      if (!expectedKey || migrateKey !== expectedKey) {
        return res.status(401).json({ message: "Chave inválida" });
      }
    } else {
      const auth = requireSuperAdmin(req, res);
      if (!auth) return;
    }
    const db = (await import("./db")).db;
    const results: string[] = [];
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`);
      results.push("phone column ensured");
    } catch (e: any) { results.push(`phone: ${e.message}`); }
    try {
      await db.execute(`CREATE TABLE IF NOT EXISTS password_resets (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, token TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, used BOOLEAN NOT NULL DEFAULT false, created_at TEXT NOT NULL)`);
      results.push("password_resets table ensured");
    } catch (e: any) { results.push(`password_resets: ${e.message}`); }
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0`);
      results.push("login_attempts column ensured");
    } catch (e: any) { results.push(`login_attempts: ${e.message}`); }
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TEXT`);
      results.push("locked_until column ensured");
    } catch (e: any) { results.push(`locked_until: ${e.message}`); }
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TEXT`);
      await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0`);
      results.push("last_login_at + login_count columns ensured");
    } catch (e: any) { results.push(`login tracking: ${e.message}`); }
    // New columns for granular access control
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS community_access BOOLEAN NOT NULL DEFAULT true`);
      results.push("community_access column ensured");
    } catch (e: any) { results.push(`community_access: ${e.message}`); }
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS support_access BOOLEAN NOT NULL DEFAULT true`);
      results.push("support_access column ensured");
    } catch (e: any) { results.push(`support_access: ${e.message}`); }
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS support_expires_at TEXT`);
      results.push("support_expires_at column ensured");
    } catch (e: any) { results.push(`support_expires_at: ${e.message}`); }
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS clinical_practice_access BOOLEAN NOT NULL DEFAULT true`);
      results.push("clinical_practice_access column ensured");
    } catch (e: any) { results.push(`clinical_practice_access: ${e.message}`); }
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS clinical_practice_hours INTEGER NOT NULL DEFAULT 0`);
      results.push("clinical_practice_hours column ensured");
    } catch (e: any) { results.push(`clinical_practice_hours: ${e.message}`); }
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS clinical_observation_hours INTEGER NOT NULL DEFAULT 0`);
      results.push("clinical_observation_hours column ensured");
    } catch (e: any) { results.push(`clinical_observation_hours: ${e.message}`); }
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS materials_access BOOLEAN NOT NULL DEFAULT false`);
      await db.execute(`ALTER TABLE users ALTER COLUMN materials_access SET DEFAULT false`);
      // Grant materials access to existing users — only if no user already has access (one-time migration)
      await db.execute(`UPDATE users SET materials_access = true WHERE materials_access = false`);
      results.push("materials_access column ensured");
    } catch (e: any) { results.push(`materials_access: ${e.message}`); }
    // Audit logs table
    try {
      await db.execute(`CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, admin_id INTEGER NOT NULL, admin_name TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT, target_id INTEGER, target_name TEXT, details TEXT, created_at TEXT NOT NULL)`);
      results.push("audit_logs table ensured");
    } catch (e: any) { results.push(`audit_logs: ${e.message}`); }
    // Plan-Module associations table
    try {
      await db.execute(`CREATE TABLE IF NOT EXISTS plan_modules (id SERIAL PRIMARY KEY, plan_id INTEGER NOT NULL, module_id INTEGER NOT NULL, UNIQUE(plan_id, module_id))`);
      results.push("plan_modules table ensured");
    } catch (e: any) { results.push(`plan_modules: ${e.message}`); }
    // Material topics column on plans (JSON array of topic titles)
    try {
      await db.execute(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS material_topics TEXT`);
      results.push("material_topics column ensured");
    } catch (e: any) { results.push(`material_topics: ${e.message}`); }
    // Order column on plans
    try {
      await db.execute(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0`);
      results.push("plans order column ensured");
    } catch (e: any) { results.push(`plans_order: ${e.message}`); }
    // Add role column (MUST come before any role-based UPDATE statements)
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student'`);
      results.push("role column ensured");
    } catch (e: any) { results.push(`role: ${e.message}`); }
    // Role escalation removed for security — manage roles via admin dashboard only
    results.push("role_management: use admin dashboard to manage roles (escalation SQL removed)");
    // Mentorship date columns
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mentorship_start_date TEXT`);
      await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mentorship_end_date TEXT`);
      results.push("mentorship date columns ensured");
    } catch (e: any) { results.push(`mentorship_dates: ${e.message}`); }
    // User-Module permissions table
    try {
      await db.execute(`CREATE TABLE IF NOT EXISTS user_modules (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, module_id INTEGER NOT NULL, enabled BOOLEAN NOT NULL DEFAULT true, start_date TEXT, end_date TEXT, UNIQUE(user_id, module_id))`);
      results.push("user_modules table ensured");
    } catch (e: any) { results.push(`user_modules: ${e.message}`); }
    // User-Material Category permissions table
    try {
      await db.execute(`CREATE TABLE IF NOT EXISTS user_material_categories (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, category_title TEXT NOT NULL, enabled BOOLEAN NOT NULL DEFAULT true, UNIQUE(user_id, category_title))`);
      results.push("user_material_categories table ensured");
    } catch (e: any) { results.push(`user_material_categories: ${e.message}`); }
    // Migrate video URLs from Google Drive to YouTube (parameterized queries)
    const ytMigrations = [
      { id: 7,  url: "https://youtu.be/UlrX0ZigQUc" },
      { id: 8,  url: "https://youtu.be/F9X6wAA6ruI" },
      { id: 9,  url: "https://youtu.be/D8mPWcHkxPI" },
      { id: 10, url: "https://youtu.be/bAoMvimzb7c" },
      { id: 11, url: "https://youtu.be/2cRE7SbOBjo" },
      { id: 12, url: "https://youtu.be/FDB1slpYRQg" },
      { id: 13, url: "https://youtu.be/WV_0tRncQc0" },
      { id: 14, url: "https://youtu.be/P58M9KYtLz0" },
      { id: 15, url: "https://youtu.be/wGA2Hbuit_Y" },
      { id: 16, url: "https://youtu.be/mxA1koHKE9Q" },
    ];
    for (const yt of ytMigrations) {
      try {
        await db.execute(sql`UPDATE lessons SET video_url = ${yt.url} WHERE id = ${yt.id}`);
        results.push(`lesson ${yt.id}: YouTube URL set`);
      } catch (e: any) { results.push(`lesson ${yt.id}: ${e.message}`); }
    }
    // Migrate lesson descriptions (parameterized queries)
    const descMigrations = [
      { title: "Aula inicial", desc: "Introdução ao curso e orientações gerais para aproveitar ao máximo sua mentoria." },
      { title: "Introdução", desc: "Visão geral sobre a toxina botulínica e sua importância na prática clínica estética." },
      { title: "Apresentação à toxina botulínica", desc: "Conheça as principais características e propriedades da toxina botulínica." },
      { title: "Mecanismo de ação no músculo", desc: "Entenda como a toxina botulínica atua na junção neuromuscular e seus efeitos fisiológicos." },
      { title: "Tipos e subtipos de toxina botulínica", desc: "Classificação dos diferentes tipos e subtipos de toxina botulínica disponíveis no mercado." },
      { title: "Tempo de duração dos efeitos e recuperação dos movimentos", desc: "Aprenda sobre a duração clínica dos efeitos e o processo de recuperação neuromuscular." },
      { title: "Tem como fazer a toxina durar mais?", desc: "Estratégias e evidências para prolongar os resultados da aplicação de toxina botulínica." },
      { title: "Indicações terapêuticas e estéticas", desc: "Principais indicações clínicas da toxina botulínica nas áreas terapêutica e estética." },
      { title: "Usos off-label e contraindicações", desc: "Aplicações off-label da toxina botulínica e situações em que o uso é contraindicado." },
      { title: "Reconstituição e seringas de aplicação", desc: "Técnicas de reconstituição da toxina e escolha adequada de seringas para aplicação." },
      { title: "Toxina Dysport", desc: "Particularidades da toxina Dysport: diluição, difusão e protocolos específicos." },
      { title: "O procedimento e a parte burocrática", desc: "Aspectos práticos do procedimento e documentação necessária para a prática clínica." },
    ];
    for (const dm of descMigrations) {
      try {
        await db.execute(sql`UPDATE lessons SET description = ${dm.desc} || E'\n\n' || COALESCE(description, '') WHERE title = ${dm.title} AND (description IS NULL OR description = '' OR description LIKE 'Drive com%' OR description LIKE 'Seringa de%' OR description LIKE 'Essa toxina%' OR description LIKE 'Links %')`);
        results.push(`desc migration: ${dm.title} updated`);
      } catch (e: any) { results.push(`desc migration ${dm.title}: ${e.message}`); }
    }

    // Migrate lesson descriptions for preenchimento and toxina_revisao modules (by ID)
    const lessonDescUpdates = [
      // Preenchimento module (9 lessons)
      { id: 34, desc: "Boas-vindas ao módulo de preenchedores faciais full face com a metodologia NaturalUp. Visão geral sobre o cenário atual do mercado de preenchimento, a busca por resultados mais naturais e duradouros, e como os preenchedores se encaixam como pilar do protocolo NaturalUp. Apresentação de casos clínicos incluindo mento, lábios, full face e reconstrução labial." },
      { id: 35, desc: "Entenda a fundo as tecnologias de reticulação dos preenchedores à base de ácido hialurônico. Aprenda sobre agentes reticuladores (BDDE, DVS, PEG), diferenças entre cadeias de alto, médio e baixo peso molecular, a importância da pureza do gel e como cada marca (Restylane Nasha, Skinbooster, entre outras) constrói seus preenchedores com características únicas de G Prime e estabilidade." },
      { id: 36, desc: "Classificação dos preenchedores por capacidade de volumização — de não reticulados a altíssima volumização. Entenda os conceitos de G Prime (módulo elástico), G Double Prime (módulo viscoso) e Swelling Factor (potencial hidrofílico) e como essas propriedades influenciam a escolha do preenchedor ideal para cada região da face e cada resultado desejado." },
      { id: 37, desc: "Como o gel de ácido hialurônico se comporta no organismo após a aplicação: cronologia do edema, efeito scaffold do gel de carboximetilcelulose (CMC), estabilidade do resultado ao longo dos meses e o temido ETIP (edema tardio intermitente persistente). Contraindicações absolutas e relativas do preenchimento, incluindo PMMA, gravidez, infecções ativas, uso de isotretinoína e cuidados com a mistura de tecnologias de reticulação diferentes." },
      { id: 38, desc: "Conheça a seringa de ácido hialurônico: graduação, marcações, tipos de agulhas e cânulas que acompanham cada marca. Durabilidade esperada do preenchedor (6 a 12 meses) e fatores que influenciam essa variação, como tecnologia de reticulação, região aplicada e metabolismo individual." },
      { id: 39, desc: "Anatomia aplicada ao preenchimento facial: camadas da face (osso, músculo, gordura, pele), ligamentos verdadeiros e pseudoligamentos, e a divisão entre face estática e dinâmica. Entenda o padrão das sete quedas faciais, a reabsorção óssea progressiva (maxila, órbita, cavidade piriforme, temporal) e como os coxins de gordura se conectam, fundamentando o raciocínio clínico para reestruturação facial com preenchedores." },
      { id: 40, desc: "Ferramentas essenciais para o planejamento da harmonização: visagismo (perfil psicológico, personalidade, como o paciente quer ser percebido) e análise facial (terços da face, proporções verticais e horizontais, distância bizigomática vs bigoníaca). Estudo dos perfis faciais braquifacial, mesofacial e dólicofacial, avaliação de simetria, e casos clínicos demonstrando como personalizar o tratamento respeitando as proporções individuais." },
      { id: 41, desc: "Continuação da análise facial com foco em perfil lateral: avaliação de maxila e mandíbula, deficiência de projeção maxilar, uso de radiografia cefalométrica como referência. Casos clínicos de reestruturação maxilar, arco zigomático (top model look), mento e mandíbula. Como o preenchedor de ácido hialurônico serve de andaime para a reestruturação facial, entregando resultados personalizados com raciocínio crítico — não apenas técnica, mas pensamento clínico." },
      { id: 42, desc: "Fundamentos práticos do procedimento de preenchimento com ácido hialurônico: os dois grandes planos de injeção (subcutâneo superficial e supraperiosteal), quando usar cada abordagem, diferenças entre aplicação com agulha e cânula, e substituição de gorduras profundas e superficiais. Protocolo de biossegurança e antissepsia pré-procedimento — higienização da pele, uso de clorexidina e álcool 70." },
      // Toxina revisão module (2 lessons) — uses "revised" descriptions
      { id: 8,  desc: "Visão geral sobre a toxina botulínica e sua importância na prática clínica estética. Artigos complementares disponíveis nos slides do Drive." },
      { id: 33, desc: "Encerramento do módulo de toxina botulínica com considerações finais, revisão dos pontos-chave abordados ao longo das aulas e orientações práticas para aplicação segura e eficiente na rotina clínica." },
    ];
    for (const ld of lessonDescUpdates) {
      try {
        await db.execute(sql`UPDATE lessons SET description = ${ld.desc} WHERE id = ${ld.id}`);
        results.push(`lesson_desc_by_id ${ld.id}: updated`);
      } catch (e: any) { results.push(`lesson_desc_by_id ${ld.id}: ${e.message}`); }
    }

    return res.json({ message: "Migração concluída", results });
  });

  // ─── Credits System Routes ──────────────────────────────────────────────────

  // GET /api/credits/balance — authenticated user gets their balance + referral code
  app.get("/api/credits/balance", async (req: Request, res: Response) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    try {
      const { db } = await import("./db");
      // Calculate balance from all transactions
      const balanceResult = await db.execute(sql`SELECT COALESCE(SUM(amount), 0) as balance FROM credit_transactions WHERE (expires_at IS NULL OR expires_at > NOW()::text OR amount < 0) AND user_id = ${auth.userId}`);
      const balance = Number((balanceResult as any).rows?.[0]?.balance || 0);

      // Get or create referral code
      const existingCode = await db.execute(sql`SELECT code FROM referral_codes WHERE user_id = ${auth.userId}`);
      let referralCode = (existingCode as any).rows?.[0]?.code;
      if (!referralCode) {
        const userResult = await db.execute(sql`SELECT name FROM users WHERE id = ${auth.userId}`);
        const userName = (userResult as any).rows?.[0]?.name || "USER";
        const firstName = userName.split(" ")[0].toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
        referralCode = `${firstName}-${randomChars}`;
        await db.execute(sql`INSERT INTO referral_codes (user_id, code, created_at) VALUES (${auth.userId}, ${referralCode}, ${new Date().toISOString()}) ON CONFLICT (user_id) DO NOTHING`);
        const refetch = await db.execute(sql`SELECT code FROM referral_codes WHERE user_id = ${auth.userId}`);
        referralCode = (refetch as any).rows?.[0]?.code || referralCode;
      }
      res.json({ balance, referralCode });
    } catch (e: any) {
      console.error("[credits/balance] Error:", e.message);
      res.status(500).json({ message: "Erro ao buscar saldo" });
    }
  });

  // GET /api/credits/transactions — authenticated user gets their history
  app.get("/api/credits/transactions", async (req: Request, res: Response) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    try {
      const { db } = await import("./db");
      const result = await db.execute(sql`SELECT id, type, amount, description, reference_id, created_at, expires_at FROM credit_transactions WHERE user_id = ${auth.userId} ORDER BY created_at DESC`);
      const rows = (result as any).rows || [];
      // Para bônus, extrair o admin_id do reference_id (formato: admin_bonus_<adminId>_<timestamp>)
      const adminIds = new Set<number>();
      for (const r of rows) {
        if (r.type === 'bonus' && r.reference_id) {
          const match = r.reference_id.match(/admin_bonus_(\d+)_/);
          if (match) adminIds.add(Number(match[1]));
        }
      }
      const adminNames: Record<number, string> = {};
      for (const aid of adminIds) {
        const admin = await storage.getUser(aid);
        if (admin) adminNames[aid] = admin.name;
      }
      const transactions = rows.map((r: any) => {
        let creditedBy: string | null = null;
        if (r.type === 'bonus' && r.reference_id) {
          const match = r.reference_id.match(/admin_bonus_(\d+)_/);
          if (match) creditedBy = adminNames[Number(match[1])] || null;
        }
        const isExpired = r.expires_at && new Date(r.expires_at) < new Date();
        return {
          id: r.id,
          type: r.type,
          amount: r.amount,
          description: r.description,
          creditedBy,
          createdAt: r.created_at,
          expiresAt: r.expires_at || null,
          expired: !!isExpired,
        };
      });
      res.json({ transactions });
    } catch (e: any) {
      console.error("[credits/transactions] Error:", e.message);
      res.status(500).json({ message: "Erro ao buscar transações" });
    }
  });

  // POST /api/credits/apply — apply credits to a checkout
  app.post("/api/credits/apply", async (req: Request, res: Response) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    try {
      const { db } = await import("./db");
      const { planKey, creditsToUse } = req.body as { planKey: string; creditsToUse: number };
      if (!planKey || typeof creditsToUse !== "number" || creditsToUse < 0) {
        return res.status(400).json({ message: "Parâmetros inválidos" });
      }
      const { PLANS: plans } = await import("./stripe-plans");
      const plan = plans[planKey as keyof typeof plans];
      if (!plan) return res.status(400).json({ message: "Plano inválido" });

      // Check balance
      const balanceResult = await db.execute(sql`SELECT COALESCE(SUM(amount), 0) as balance FROM credit_transactions WHERE (expires_at IS NULL OR expires_at > NOW()::text OR amount < 0) AND user_id = ${auth.userId}`);
      const balance = Number((balanceResult as any).rows?.[0]?.balance || 0);
      if (creditsToUse > balance) return res.status(400).json({ message: "Saldo insuficiente" });
      if (creditsToUse > plan.price) return res.status(400).json({ message: "Créditos excedem o valor do plano" });

      const creditsApplied = Math.min(creditsToUse, plan.price);
      const finalPrice = plan.price - creditsApplied;
      const needsStripe = finalPrice > 0;

      if (!needsStripe) {
        // Full credit payment — activate access directly
        const now = new Date().toISOString();
        const accessExpiry = new Date(Date.now() + plan.accessDays * 86400000).toISOString();
        // Debit credits
        await db.execute(sql`INSERT INTO credit_transactions (user_id, type, amount, description, reference_id, created_at) VALUES (${auth.userId}, 'usage', ${-creditsApplied}, ${'Pagamento integral com créditos: ' + plan.name}, ${'credits_' + Date.now()}, ${now})`);
        // Activate access (simplified — same fields as webhook)
        await db.execute(sql`UPDATE users SET plan_key = ${planKey}, plan_paid_at = ${now}, plan_amount_paid = ${plan.price}, approved = true, access_expires_at = ${accessExpiry}, materials_access = true WHERE id = ${auth.userId}`);
      }

      res.json({ originalPrice: plan.price, creditsApplied, finalPrice, needsStripe });
    } catch (e: any) {
      console.error("[credits/apply] Error:", e.message);
      res.status(500).json({ message: "Erro ao aplicar créditos" });
    }
  });

  // GET /api/credits/validate-referral?code=XXXX — valida código de indicação (público)
  app.get("/api/credits/validate-referral", async (req: Request, res: Response) => {
    try {
      const code = (req.query.code as string || "").trim().toUpperCase();
      if (!code) return res.json({ valid: false });
      const { db } = await import("./db");
      const result = await db.execute(sql`SELECT rc.user_id, u.name FROM referral_codes rc LEFT JOIN users u ON u.id = rc.user_id WHERE UPPER(rc.code) = ${code} LIMIT 1`);
      const row = (result as any).rows?.[0];
      if (row) {
        const firstName = (row.name || "").split(" ")[0];
        return res.json({ valid: true, name: firstName });
      }
      res.json({ valid: false });
    } catch (e: any) {
      res.json({ valid: false });
    }
  });

  // GET /api/credits/referral-stats — how many people used my code
  app.get("/api/credits/referral-stats", async (req: Request, res: Response) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    try {
      const { db } = await import("./db");
      // Get referral transactions for this user
      const result = await db.execute(sql`SELECT amount, description, created_at FROM credit_transactions WHERE user_id = ${auth.userId} AND type = 'referral' ORDER BY created_at DESC`);
      const referrals = ((result as any).rows || []).map((r: any) => ({
        description: r.description,
        date: r.created_at,
        earned: r.amount,
      }));
      const totalReferrals = referrals.length;
      const totalEarned = referrals.reduce((sum: number, r: any) => sum + r.earned, 0);
      res.json({ totalReferrals, totalEarned, referrals });
    } catch (e: any) {
      console.error("[credits/referral-stats] Error:", e.message);
      res.status(500).json({ message: "Erro ao buscar estatísticas de indicação" });
    }
  });

  // GET /api/admin/credits — admin view of all credit transactions
  app.get("/api/admin/credits", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const result = await db.execute(sql`
        SELECT ct.id, ct.user_id, ct.type, ct.amount, ct.description, ct.reference_id, ct.created_at, u.name as user_name, u.email as user_email, u.plan_key as plan_key
        FROM credit_transactions ct
        LEFT JOIN users u ON u.id = ct.user_id
        ORDER BY ct.created_at DESC
        LIMIT 500
      `);
      const transactions = ((result as any).rows || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
        planKey: r.plan_key || null,
        type: r.type,
        amount: r.amount,
        description: r.description,
        referenceId: r.reference_id,
        createdAt: r.created_at,
      }));
      // Also get per-user balances
      const balancesResult = await db.execute(sql`
        SELECT ct.user_id, u.name as user_name, u.email as user_email, u.plan_key as plan_key, SUM(ct.amount) as balance
        FROM credit_transactions ct
        LEFT JOIN users u ON u.id = ct.user_id
        WHERE (ct.expires_at IS NULL OR ct.expires_at > NOW()::text OR ct.amount < 0)
        GROUP BY ct.user_id, u.name, u.email, u.plan_key
        ORDER BY balance DESC
      `);
      const balances = ((balancesResult as any).rows || []).map((r: any) => ({
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
        planKey: r.plan_key || null,
        balance: Number(r.balance),
      }));
      const totalOutstanding = balances.reduce((sum: number, b: any) => sum + Math.max(0, b.balance), 0);
      res.json({ transactions, balances, totalOutstanding });
    } catch (e: any) {
      console.error("[admin/credits] Error:", e.message);
      res.status(500).json({ message: "Erro ao buscar créditos" });
    }
  });

  // POST /api/admin/credits/bonus — bonificação manual de créditos
  app.post("/api/admin/credits/bonus", async (req: Request, res: Response) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const { userId, amount, description } = req.body;
      if (!userId || !amount || amount <= 0) {
        return res.status(400).json({ message: "userId e amount (positivo, em centavos) são obrigatórios" });
      }
      const { db } = await import("./db");
      const target = await storage.getUser(userId);
      if (!target) return res.status(404).json({ message: "Usuário não encontrado" });

      const now = new Date().toISOString();
      const bonusExpiresAt = new Date(Date.now() + 180 * 86400000).toISOString(); // 6 meses
      const desc = description || "Bonificação especial";
      await db.execute(sql`INSERT INTO credit_transactions (user_id, type, amount, description, reference_id, created_at, expires_at)
        VALUES (${userId}, 'bonus', ${amount}, ${desc}, ${'admin_bonus_' + auth.userId + '_' + Date.now()}, ${now}, ${bonusExpiresAt})`);

      const admin = await storage.getUser(auth.userId);
      await logAction(auth.userId, admin?.name || "Admin", "credit_bonus", "credits", userId, target.name, { amount, description: desc });

      const balResult = await db.execute(sql`SELECT COALESCE(SUM(amount), 0) as balance FROM credit_transactions WHERE (expires_at IS NULL OR expires_at > NOW()::text OR amount < 0) AND user_id = ${userId}`);
      const newBalance = Number((balResult as any).rows?.[0]?.balance || 0);

      res.json({ success: true, userId, credited: amount, newBalance, description: desc });
    } catch (e: any) {
      console.error("[admin/credits/bonus] Error:", e.message);
      res.status(500).json({ message: "Erro ao creditar bônus" });
    }
  });

  // POST /api/admin/credits/attendance — creditação de presença em aula ao vivo
  app.post("/api/admin/credits/attendance", async (req: Request, res: Response) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const { title, date, studentIds, amount } = req.body;
      if (!title || !date || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: "title, date e studentIds (array não vazio) são obrigatórios" });
      }
      const creditAmount = amount && amount > 0 ? amount : 10000; // default R$100
      const { db } = await import("./db");
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 180 * 86400000).toISOString(); // 6 meses

      const credited: { userId: number; name: string }[] = [];
      const skipped: { userId: number; name: string; reason: string }[] = [];

      for (const studentId of studentIds) {
        const user = await storage.getUser(studentId);
        if (!user) {
          skipped.push({ userId: studentId, name: "?", reason: "Usuário não encontrado" });
          continue;
        }

        // Prevent duplicates: check if this student already got credit for this class
        const refId = `attendance_${date}_${studentId}`;
        const existing = await db.execute(sql`SELECT id FROM credit_transactions WHERE reference_id = ${refId} LIMIT 1`);
        if ((existing as any).rows?.length > 0) {
          skipped.push({ userId: studentId, name: user.name, reason: "Já creditado para esta aula" });
          continue;
        }

        const desc = `Presença ativa: ${title} — ${date}`;
        await db.execute(sql`INSERT INTO credit_transactions (user_id, type, amount, description, reference_id, created_at, expires_at)
          VALUES (${studentId}, 'attendance_bonus', ${creditAmount}, ${desc}, ${refId}, ${now}, ${expiresAt})`);
        credited.push({ userId: studentId, name: user.name });
      }

      const admin = await storage.getUser(auth.userId);
      await logAction(auth.userId, admin?.name || "Admin", "credit_attendance", "credits", undefined, undefined, {
        title, date, amount: creditAmount, creditedCount: credited.length, skippedCount: skipped.length,
        creditedStudents: credited.map(s => s.name),
      });

      res.json({
        success: true,
        credited: credited.length,
        skipped: skipped.length,
        skippedDetails: skipped,
        totalAmount: credited.length * creditAmount,
        students: credited,
      });
    } catch (e: any) {
      console.error("[admin/credits/attendance] Error:", e.message);
      res.status(500).json({ message: "Erro ao creditar presença" });
    }
  });

  // GET /api/cron/credit-expiry-notify — notify users about expiring credits
  app.get("/api/cron/credit-expiry-notify", async (req: Request, res: Response) => {
    const cronSecret = req.headers["x-cron-secret"];
    const CRON_SECRET_ENV = process.env.CRON_SECRET;
    if (!CRON_SECRET_ENV || cronSecret !== CRON_SECRET_ENV) {
      return res.status(401).json({ message: "Não autorizado" });
    }
    try {
      const { db } = await import("./db");
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      if (!RESEND_API_KEY) return res.json({ message: "RESEND_API_KEY not set" });

      // Find credits expiring in 7 days
      const sevenDays = new Date(Date.now() + 7 * 86400000).toISOString();
      const today = new Date().toISOString();
      const expiring = await db.execute(sql`
        SELECT ct.user_id, ct.amount, ct.description, ct.expires_at, u.name, u.email
        FROM credit_transactions ct
        JOIN users u ON u.id = ct.user_id
        WHERE ct.amount > 0 AND ct.expires_at IS NOT NULL
        AND ct.expires_at > ${today} AND ct.expires_at <= ${sevenDays}
      `);

      const rows = (expiring as any).rows || [];
      // Group by user
      const byUser: Record<number, { name: string; email: string; credits: any[] }> = {};
      for (const r of rows) {
        if (!byUser[r.user_id]) byUser[r.user_id] = { name: r.name, email: r.email, credits: [] };
        byUser[r.user_id].credits.push({ amount: r.amount, description: r.description, expiresAt: r.expires_at });
      }

      let sent = 0;
      for (const [userId, data] of Object.entries(byUser)) {
        // Check if already notified this week
        const alreadySent = await db.execute(sql`SELECT 1 FROM audit_logs WHERE action = 'credit_expiry_email' AND target_id = ${Number(userId)} AND created_at > ${new Date(Date.now() - 7 * 86400000).toISOString()} LIMIT 1`);
        if ((alreadySent as any).rows?.length > 0) continue;

        const firstName = data.name?.split(" ")[0] || "Aluno";
        const totalExpiring = data.credits.reduce((sum: number, c: any) => sum + c.amount, 0);
        const totalBRL = (totalExpiring / 100).toFixed(2).replace(".", ",");

        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({
              from: "Ampla Facial <noreply@amplafacial.com.br>",
              to: [data.email],
              subject: `${firstName}, seus R$ ${totalBRL} em creditos vao expirar em breve`,
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
                <div style="background:#0A0D14;padding:30px;text-align:center">
                  <h1 style="color:#D4A843;margin:0;font-size:24px">Ampla Facial</h1>
                </div>
                <div style="padding:30px">
                  <p>Oi, ${firstName}!</p>
                  <p>Voce tem <strong>R$ ${totalBRL}</strong> em creditos que vao expirar nos proximos 7 dias.</p>
                  <p>Use seus creditos como desconto na compra de qualquer produto ou mentoria antes que expirem.</p>
                  <div style="text-align:center;margin:30px 0">
                    <a href="https://portal.amplafacial.com.br/#/planos" style="background:#D4A843;color:#0A0D14;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold;display:inline-block">Usar meus creditos agora</a>
                  </div>
                  <p style="color:#666;font-size:13px">Dr. Gustavo Martins<br>Ampla Facial</p>
                </div>
              </div>`
            }),
          });
          if (emailRes.ok) {
            sent++;
            await db.execute(sql`INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, details, created_at) VALUES (${0}, ${'Sistema CRON'}, ${'credit_expiry_email'}, ${'user'}, ${Number(userId)}, ${'R$ ' + totalBRL + ' expiring'}, ${new Date().toISOString()})`);
          }
        } catch {}
      }

      res.json({ message: `${sent} emails enviados`, usersWithExpiring: Object.keys(byUser).length, sent });
    } catch (e: any) {
      console.error("[cron/credit-expiry] Error:", e.message);
      res.status(500).json({ message: "Erro" });
    }
  });

  // ─── Clinical Sessions Routes ───────────────────────────────────────────────

  // POST /api/admin/clinical-sessions — create a session
  app.post("/api/admin/clinical-sessions", async (req: Request, res: Response) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const { db } = await import("./db");
      const { studentId, sessionDate, startTime, endTime, durationHours, procedures, notes, patientsCount, patientsDetails } = req.body as {
        studentId: number; sessionDate: string; startTime: string; endTime: string;
        durationHours: number; procedures: string[]; notes?: string;
        patientsCount?: number; patientsDetails?: string[];
      };
      if (!studentId || !sessionDate || !startTime || !endTime || !durationHours) {
        return res.status(400).json({ message: "Campos obrigatórios faltando" });
      }
      const now = new Date().toISOString();
      const proceduresJson = JSON.stringify(procedures || []);
      const patientsDetailsJson = JSON.stringify(patientsDetails || []);
      await db.execute(sql`INSERT INTO clinical_sessions (student_id, session_date, start_time, end_time, duration_hours, procedures, notes, patients_count, patients_details, status, admin_id, created_at)
        VALUES (${studentId}, ${sessionDate}, ${startTime}, ${endTime}, ${durationHours}, ${proceduresJson}, ${notes || null}, ${patientsCount || 0}, ${patientsDetailsJson}, 'pending_signatures', ${auth.userId}, ${now})`);
      // Deduct hours from user's bank
      await db.execute(sql`UPDATE users SET clinical_practice_hours = GREATEST(0, clinical_practice_hours - ${durationHours}) WHERE id = ${studentId}`);
      // Audit log
      const studentResult = await db.execute(sql`SELECT name FROM users WHERE id = ${studentId}`);
      const studentName = (studentResult as any).rows?.[0]?.name || `ID ${studentId}`;
      const adminResult = await db.execute(sql`SELECT name FROM users WHERE id = ${auth.userId}`);
      const adminName = (adminResult as any).rows?.[0]?.name || "Admin";
      await logAction(auth.userId, adminName, "register_clinical_session", "user", studentId, studentName, { sessionDate, durationHours, procedures });
      res.json({ message: "Sessão registrada", sessionDate, durationHours });
    } catch (e: any) {
      console.error("[admin/clinical-sessions] POST Error:", e.message);
      res.status(500).json({ message: "Erro ao registrar sessão" });
    }
  });

  // GET /api/admin/clinical-sessions — list all sessions
  app.get("/api/admin/clinical-sessions", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const result = await db.execute(sql`
        SELECT cs.*, u.name as student_name, u.email as student_email, a.name as admin_name
        FROM clinical_sessions cs
        LEFT JOIN users u ON u.id = cs.student_id
        LEFT JOIN users a ON a.id = cs.admin_id
        ORDER BY cs.session_date DESC, cs.created_at DESC
        LIMIT 200
      `);
      const sessions = ((result as any).rows || []).map((r: any) => ({
        id: r.id,
        studentId: r.student_id,
        studentName: r.student_name,
        studentEmail: r.student_email,
        sessionDate: r.session_date,
        startTime: r.start_time,
        endTime: r.end_time,
        durationHours: r.duration_hours,
        procedures: (() => { try { return JSON.parse(r.procedures); } catch { return []; } })(),
        patientsCount: r.patients_count,
        patientsDetails: (() => { try { return JSON.parse(r.patients_details); } catch { return []; } })(),
        notes: r.notes,
        status: r.status,
        adminName: r.admin_name,
        studentSignedAt: r.student_signed_at,
        adminSignedAt: r.admin_signed_at,
        createdAt: r.created_at,
      }));
      res.json({ sessions });
    } catch (e: any) {
      console.error("[admin/clinical-sessions] GET Error:", e.message);
      res.status(500).json({ message: "Erro ao listar sessões" });
    }
  });

  // GET /api/admin/clinical-sessions/:id/pdf — session data for PDF
  app.get("/api/admin/clinical-sessions/:id/pdf", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const sessionId = Number(req.params.id);
      const result = await db.execute(sql`
        SELECT cs.*, u.name as student_name, u.email as student_email, u.phone as student_phone,
        a.name as admin_name
        FROM clinical_sessions cs
        LEFT JOIN users u ON u.id = cs.student_id
        LEFT JOIN users a ON a.id = cs.admin_id
        WHERE cs.id = ${sessionId}
      `);
      const row = (result as any).rows?.[0];
      if (!row) return res.status(404).json({ message: "Sessao nao encontrada" });
      res.json({
        id: row.id,
        studentName: row.student_name,
        studentEmail: row.student_email,
        studentPhone: row.student_phone,
        adminName: row.admin_name,
        sessionDate: row.session_date,
        startTime: row.start_time,
        endTime: row.end_time,
        durationHours: row.duration_hours,
        procedures: (() => { try { return JSON.parse(row.procedures); } catch { return []; } })(),
        patientsCount: row.patients_count,
        patientsDetails: (() => { try { return JSON.parse(row.patients_details); } catch { return []; } })(),
        notes: row.notes,
        status: row.status,
        studentSignedAt: row.student_signed_at,
        studentSignedIp: row.student_signed_ip,
        adminSignedAt: row.admin_signed_at,
        adminSignedIp: row.admin_signed_ip,
        createdAt: row.created_at,
      });
    } catch (e: any) {
      console.error("[admin/clinical-sessions/:id/pdf] Error:", e.message);
      res.status(500).json({ message: "Erro ao buscar sessao" });
    }
  });

  // GET /api/clinical-sessions/:id/certificate — HTML certificate for print/PDF
  app.get("/api/clinical-sessions/:id/certificate", async (req: Request, res: Response) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Nao autorizado" });
    try {
      const { db } = await import("./db");
      const sessionId = Number(req.params.id);
      const result = await db.execute(sql`
        SELECT cs.*, u.name as student_name, u.email as student_email, u.phone as student_phone,
        a.name as admin_name
        FROM clinical_sessions cs
        LEFT JOIN users u ON u.id = cs.student_id
        LEFT JOIN users a ON a.id = cs.admin_id
        WHERE cs.id = ${sessionId}
      `);
      const row = (result as any).rows?.[0];
      if (!row) return res.status(404).json({ message: "Sessao nao encontrada" });
      // Only admin or the student themselves can view
      if (auth.role !== "admin" && auth.role !== "super_admin" && row.student_id !== auth.userId) {
        return res.status(403).json({ message: "Sem permissao" });
      }
      const procedures = (() => { try { return JSON.parse(row.procedures); } catch { return []; } })();
      const patients = (() => { try { return JSON.parse(row.patients_details); } catch { return []; } })();
      const dateFormatted = row.session_date ? new Date(row.session_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "";
      const adminSignDate = row.admin_signed_at ? new Date(row.admin_signed_at).toLocaleDateString("pt-BR") + " " + new Date(row.admin_signed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null;
      const studentSignDate = row.student_signed_at ? new Date(row.student_signed_at).toLocaleDateString("pt-BR") + " " + new Date(row.student_signed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null;

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comprovante de Pratica Clinica</title>
<style>
  @page { margin: 20mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 700px; margin: 0 auto; padding: 40px 20px; }
  .header { text-align: center; border-bottom: 2px solid #D4A843; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { font-size: 22px; color: #0A0D14; margin: 0; }
  .header h2 { font-size: 14px; color: #D4A843; margin: 4px 0 0; font-weight: normal; }
  .header p { font-size: 11px; color: #666; margin: 8px 0 0; }
  .section { margin-bottom: 24px; }
  .section h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #D4A843; border-bottom: 1px solid #eee; padding-bottom: 6px; margin-bottom: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .field { font-size: 13px; }
  .field .label { color: #888; font-size: 11px; }
  .field .value { font-weight: 600; }
  ul { padding-left: 20px; margin: 0; }
  li { font-size: 13px; margin-bottom: 4px; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee; }
  .sig-box { text-align: center; }
  .sig-box .line { border-top: 1px solid #333; margin-top: 40px; padding-top: 8px; }
  .sig-box .name { font-weight: 600; font-size: 14px; }
  .sig-box .role { font-size: 11px; color: #666; }
  .sig-box .stamp { font-size: 10px; color: #22c55e; margin-top: 4px; }
  .sig-box .pending { font-size: 10px; color: #f59e0b; margin-top: 4px; }
  .footer { text-align: center; font-size: 10px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 16px; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="header">
  <h1>COMPROVANTE DE PRATICA CLINICA</h1>
  <h2>Ampla Facial - Metodo NaturalUp</h2>
  <p>Instituto Medeiros Martins LTDA - CNPJ 50.421.964/0001-81</p>
</div>

<div class="section">
  <h3>Dados da Sessao</h3>
  <div class="grid">
    <div class="field"><span class="label">Data</span><br><span class="value">${dateFormatted}</span></div>
    <div class="field"><span class="label">Horario</span><br><span class="value">${row.start_time || ""} - ${row.end_time || ""}</span></div>
    <div class="field"><span class="label">Carga Horaria</span><br><span class="value">${row.duration_hours || 0} horas</span></div>
    <div class="field"><span class="label">Pacientes Atendidos</span><br><span class="value">${row.patients_count || 0}</span></div>
  </div>
</div>

<div class="section">
  <h3>Aluno</h3>
  <div class="grid">
    <div class="field"><span class="label">Nome</span><br><span class="value">${row.student_name || ""}</span></div>
    <div class="field"><span class="label">Email</span><br><span class="value">${row.student_email || ""}</span></div>
  </div>
</div>

<div class="section">
  <h3>Procedimentos Realizados</h3>
  <ul>${procedures.map((p: string) => "<li>" + p + "</li>").join("")}</ul>
</div>

${patients.length > 0 ? '<div class="section"><h3>Detalhes dos Pacientes</h3><ul>' + patients.map((p: string, i: number) => "<li>Paciente " + (i + 1) + ": " + p + "</li>").join("") + "</ul></div>" : ""}

${row.notes ? '<div class="section"><h3>Observacoes</h3><p style="font-size:13px">' + row.notes + "</p></div>" : ""}

<div class="signatures">
  <div class="sig-box">
    <div class="line">
      <p class="name">${row.admin_name || "Dr. Gustavo Martins"}</p>
      <p class="role">Orientador</p>
      ${adminSignDate ? '<p class="stamp">Assinado digitalmente em ' + adminSignDate + '</p><p class="stamp">IP: ' + (row.admin_signed_ip || "") + '</p>' : '<p class="pending">Assinatura pendente</p>'}
    </div>
  </div>
  <div class="sig-box">
    <div class="line">
      <p class="name">${row.student_name || ""}</p>
      <p class="role">Aluno(a)</p>
      ${studentSignDate ? '<p class="stamp">Assinado digitalmente em ' + studentSignDate + '</p><p class="stamp">IP: ' + (row.student_signed_ip || "") + '</p>' : '<p class="pending">Assinatura pendente</p>'}
    </div>
  </div>
</div>

<div class="footer">
  <p>Documento gerado eletronicamente pela plataforma Ampla Facial</p>
  <p>portal.amplafacial.com.br - Sessao #${row.id}</p>
</div>
</body></html>`;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (e: any) {
      console.error("[clinical-sessions/certificate] Error:", e.message);
      res.status(500).json({ message: "Erro ao gerar comprovante" });
    }
  });

  // POST /api/admin/clinical-sessions/:id/sign - admin signs the session
  app.post("/api/admin/clinical-sessions/:id/sign", async (req: Request, res: Response) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const { db } = await import("./db");
      const sessionId = Number(req.params.id);
      const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || "unknown";
      const now = new Date().toISOString();

      // Check session exists and is not already admin-signed
      const existing = await db.execute(sql`SELECT id, admin_signed_at, student_signed_at, status FROM clinical_sessions WHERE id = ${sessionId}`);
      const session = (existing as any).rows?.[0];
      if (!session) return res.status(404).json({ message: "Sessao nao encontrada" });
      if (session.admin_signed_at) return res.status(400).json({ message: "Sessao ja assinada pelo orientador" });

      // Sign
      await db.execute(sql`UPDATE clinical_sessions SET admin_signed_at = ${now}, admin_signed_ip = ${ip} WHERE id = ${sessionId}`);

      // If student already signed, mark as completed
      if (session.student_signed_at) {
        await db.execute(sql`UPDATE clinical_sessions SET status = 'completed' WHERE id = ${sessionId}`);
      } else {
        await db.execute(sql`UPDATE clinical_sessions SET status = 'pending_student' WHERE id = ${sessionId}`);
      }

      res.json({ message: "Sessao assinada pelo orientador", signedAt: now });
    } catch (e: any) {
      console.error("[admin/clinical-sessions/sign] Error:", e.message);
      res.status(500).json({ message: "Erro ao assinar sessao" });
    }
  });

  // GET /api/student/clinical-sessions - student sees their sessions
  app.get("/api/student/clinical-sessions", async (req: Request, res: Response) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Nao autorizado" });
    try {
      const { db } = await import("./db");
      const result = await db.execute(sql`
        SELECT cs.*, a.name as admin_name
        FROM clinical_sessions cs
        LEFT JOIN users a ON a.id = cs.admin_id
        WHERE cs.student_id = ${auth.userId}
        ORDER BY cs.session_date DESC
      `);
      const sessions = ((result as any).rows || []).map((r: any) => ({
        id: r.id,
        sessionDate: r.session_date,
        startTime: r.start_time,
        endTime: r.end_time,
        durationHours: r.duration_hours,
        procedures: (() => { try { return JSON.parse(r.procedures); } catch { return []; } })(),
        patientsCount: r.patients_count,
        patientsDetails: (() => { try { return JSON.parse(r.patients_details); } catch { return []; } })(),
        notes: r.notes,
        status: r.status,
        adminName: r.admin_name,
        studentSignedAt: r.student_signed_at,
        adminSignedAt: r.admin_signed_at,
        createdAt: r.created_at,
      }));
      res.json({ sessions });
    } catch (e: any) {
      console.error("[student/clinical-sessions] Error:", e.message);
      res.status(500).json({ message: "Erro ao listar sessoes" });
    }
  });

  // POST /api/student/clinical-sessions/:id/sign - student signs the session
  app.post("/api/student/clinical-sessions/:id/sign", async (req: Request, res: Response) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Nao autorizado" });
    try {
      const { db } = await import("./db");
      const sessionId = Number(req.params.id);
      const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      const now = new Date().toISOString();

      // Check session belongs to student and not already signed
      const existing = await db.execute(sql`SELECT id, student_id, student_signed_at, admin_signed_at, status FROM clinical_sessions WHERE id = ${sessionId}`);
      const session = (existing as any).rows?.[0];
      if (!session) return res.status(404).json({ message: "Sessao nao encontrada" });
      if (session.student_id !== auth.userId) return res.status(403).json({ message: "Sessao nao pertence a voce" });
      if (session.student_signed_at) return res.status(400).json({ message: "Sessao ja assinada" });

      // Sign
      await db.execute(sql`UPDATE clinical_sessions SET student_signed_at = ${now}, student_signed_ip = ${ip}, student_signed_user_agent = ${userAgent} WHERE id = ${sessionId}`);

      // If admin already signed, mark as completed
      if (session.admin_signed_at) {
        await db.execute(sql`UPDATE clinical_sessions SET status = 'completed' WHERE id = ${sessionId}`);
      } else {
        await db.execute(sql`UPDATE clinical_sessions SET status = 'pending_admin' WHERE id = ${sessionId}`);
      }

      res.json({ message: "Sessao assinada pelo aluno", signedAt: now });
    } catch (e: any) {
      console.error("[student/clinical-sessions/sign] Error:", e.message);
      res.status(500).json({ message: "Erro ao assinar sessao" });
    }
  });

  // ─── Contracts Routes ─────────────────────────────────────────────────────

  // GET /api/admin/contracts — list all contracts
  app.get("/api/admin/contracts", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const result = await db.execute(sql`
        SELECT c.*, u.name as user_name, u.email as user_email
        FROM contracts c
        LEFT JOIN users u ON u.id = c.user_id
        ORDER BY c.created_at DESC
        LIMIT 200
      `);
      const contracts = ((result as any).rows || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
        planKey: r.plan_key,
        planName: r.plan_name,
        amountPaid: r.amount_paid,
        status: r.status,
        signedAt: r.signed_at,
        contractGroup: r.contract_group || null,
        acceptedAt: r.accepted_at || null,
        acceptedIp: r.accepted_ip || null,
        contractHtml: r.contract_html || null,
        stripeSessionId: r.stripe_session_id || null,
        createdAt: r.created_at,
      }));
      res.json({ contracts });
    } catch (e: any) {
      console.error("[admin/contracts] Error:", e.message);
      res.status(500).json({ message: "Erro ao listar contratos" });
    }
  });

  // GET /api/contracts/my — student sees their own contracts
  app.get("/api/contracts/my", async (req: Request, res: Response) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    try {
      const { db } = await import("./db");
      const result = await db.execute(sql`SELECT id, plan_key, plan_name, amount_paid, status, signed_at, created_at FROM contracts WHERE user_id = ${auth.userId} ORDER BY created_at DESC`);
      const contracts = ((result as any).rows || []).map((r: any) => ({
        id: r.id,
        planKey: r.plan_key,
        planName: r.plan_name,
        amountPaid: r.amount_paid,
        status: r.status,
        signedAt: r.signed_at,
        createdAt: r.created_at,
      }));
      res.json({ contracts });
    } catch (e: any) {
      console.error("[contracts/my] Error:", e.message);
      res.status(500).json({ message: "Erro ao buscar contratos" });
    }
  });

  // GET /api/contracts/terms/:planKey — full contract HTML for acceptance flow
  app.get("/api/contracts/terms/:planKey", async (req: Request, res: Response) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    try {
      const { PLANS } = await import("./stripe-plans");
      const { getContractHTML, getContractGroup } = await import("./contract-templates");
      const planKey = req.params.planKey as string;
      const plan = PLANS[planKey as keyof typeof PLANS];
      if (!plan) return res.status(404).json({ message: "Plano não encontrado" });
      const { db } = await import("./db");
      const userResult = await db.execute(sql`SELECT name, email, phone FROM users WHERE id = ${auth.userId}`);
      const user = (userResult as any).rows?.[0];
      const group = getContractGroup(planKey);
      const html = getContractHTML(planKey, {
        studentName: user?.name || "N/A",
        studentEmail: user?.email || "N/A",
        studentPhone: user?.phone || "",
        startDate: new Date().toLocaleDateString("pt-BR"),
      });
      res.json({ html, planKey, planName: plan.name, group });
    } catch (e: any) {
      console.error("[contracts/terms] Error:", e.message);
      res.status(500).json({ message: "Erro ao gerar contrato" });
    }
  });

  // POST /api/contracts/accept — student accepts contract terms
  // For paid plans (price > 0), contracts are now created AFTER Stripe payment
  // confirmation in the webhook. This endpoint only works for free plans (Trial/R$0)
  // or admin-initiated flows.
  app.post("/api/contracts/accept", async (req: Request, res: Response) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    try {
      const { db } = await import("./db");
      const { PLANS } = await import("./stripe-plans");
      const { getContractHTML, getContractGroup } = await import("./contract-templates");
      const { planKey } = req.body as { planKey: string };
      if (!planKey) return res.status(400).json({ message: "planKey obrigatório" });
      const plan = PLANS[planKey as keyof typeof PLANS];
      if (!plan) return res.status(404).json({ message: "Plano não encontrado" });

      // Block contract acceptance for paid plans — contracts for paid plans
      // are created after Stripe payment confirmation in the webhook
      if (plan.price > 0 && auth.role !== "admin" && auth.role !== "super_admin") {
        return res.status(400).json({
          message: "Contratos para planos pagos são gerados automaticamente após a confirmação do pagamento.",
          previewOnly: true,
        });
      }

      const userResult = await db.execute(sql`SELECT name, email, phone FROM users WHERE id = ${auth.userId}`);
      const user = (userResult as any).rows?.[0];
      const group = getContractGroup(planKey);
      const contractHtml = getContractHTML(planKey, {
        studentName: user?.name || "N/A",
        studentEmail: user?.email || "N/A",
        studentPhone: user?.phone || "",
        startDate: new Date().toLocaleDateString("pt-BR"),
      });
      const now = new Date().toISOString();
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      const result = await db.execute(sql`INSERT INTO contracts (user_id, plan_key, plan_name, amount_paid, status, contract_group, contract_html, accepted_at, accepted_ip, accepted_user_agent, created_at)
        VALUES (${auth.userId}, ${planKey}, ${plan.name}, ${plan.price}, 'accepted', ${group}, ${contractHtml}, ${now}, ${ip}, ${userAgent}, ${now}) RETURNING id`);
      const contractId = (result as any).rows?.[0]?.id;
      res.json({ contractId, accepted: true });
    } catch (e: any) {
      console.error("[contracts/accept] Error:", e.message);
      res.status(500).json({ message: "Erro ao aceitar contrato" });
    }
  });

  // GET /api/contracts/check/:planKey — check if user already accepted contract
  app.get("/api/contracts/check/:planKey", async (req: Request, res: Response) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    try {
      const { db } = await import("./db");
      const planKey = req.params.planKey;
      const result = await db.execute(sql`SELECT id FROM contracts WHERE user_id = ${auth.userId} AND plan_key = ${planKey} AND status = 'accepted' ORDER BY created_at DESC LIMIT 1`);
      const row = (result as any).rows?.[0];
      res.json({ accepted: !!row, contractId: row?.id || null });
    } catch (e: any) {
      console.error("[contracts/check] Error:", e.message);
      res.status(500).json({ message: "Erro ao verificar contrato" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── COMMUNITY FEED ─────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── GET /api/community/posts ─────────────────────────────────────────────
  app.get("/api/community/posts", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });

      const limit = Math.min(Number(req.query.limit) || 20, 50);
      const offset = Number(req.query.offset) || 0;
      const postType = req.query.postType as string | undefined;

      let posts;
      if (postType) {
        posts = await db.execute(sql`
          SELECT cp.*, u.name as author_name, u.avatar_url as author_avatar, u.username as author_username
          FROM community_posts cp
          JOIN users u ON u.id = cp.user_id
          WHERE cp.post_type = ${postType}
          ORDER BY cp.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `);
      } else {
        posts = await db.execute(sql`
          SELECT cp.*, u.name as author_name, u.avatar_url as author_avatar, u.username as author_username
          FROM community_posts cp
          JOIN users u ON u.id = cp.user_id
          ORDER BY cp.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `);
      }

      const rows = (posts as any).rows || [];

      // Check which posts the current user has liked
      let likedPostIds: Set<number> = new Set();
      if (rows.length > 0 && auth.userId) {
        const postIds = rows.map((r: any) => r.id);
        const likes = await db.execute(sql`
          SELECT post_id FROM community_likes
          WHERE user_id = ${auth.userId} AND post_id IN (${sql.join(postIds.map((id: number) => sql`${id}`), sql`, `)})
        `);
        likedPostIds = new Set(((likes as any).rows || []).map((l: any) => l.post_id));
      }

      const result = rows.map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        content: p.content,
        imageUrls: JSON.parse(p.image_urls || '[]'),
        postType: p.post_type,
        likesCount: p.likes_count,
        commentsCount: p.comments_count,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        authorName: p.author_name,
        authorInitial: (p.author_name || '?')[0].toUpperCase(),
        authorAvatar: p.author_avatar || null,
        authorUsername: p.author_username || null,
        liked: likedPostIds.has(p.id),
      }));

      res.json({ posts: result });
    } catch (e: any) {
      console.error("[GET /api/community/posts]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── POST /api/community/posts ────────────────────────────────────────────
  app.post("/api/community/posts", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });

      const { content, imageUrls, postType } = req.body as { content: string; imageUrls?: string[]; postType?: string };
      if (!content || !content.trim()) return res.status(400).json({ message: "Conteúdo é obrigatório" });

      const validTypes = ['general', 'case_study', 'before_after'];
      const type = validTypes.includes(postType || '') ? postType! : 'general';
      const now = new Date().toISOString();
      const imgJson = JSON.stringify(imageUrls || []);

      const result = await db.execute(sql`
        INSERT INTO community_posts (user_id, content, image_urls, post_type, created_at)
        VALUES (${auth.userId}, ${content.trim()}, ${imgJson}, ${type}, ${now})
        RETURNING id
      `);
      const postId = (result as any).rows?.[0]?.id;

      // Create credit request (prevent duplicate via unique reference)
      const creditRef = `post_created_${auth.userId}_${postId}`;
      await db.execute(sql`
        INSERT INTO credit_requests (user_id, action_type, reference_type, reference_id, amount, status, created_at)
        SELECT ${auth.userId}, ${'post_created'}, ${'post'}, ${postId}, ${5000}, ${'pending'}, ${now}
        WHERE NOT EXISTS (
          SELECT 1 FROM credit_requests WHERE user_id = ${auth.userId} AND action_type = 'post_created' AND reference_id = ${postId}
        )
      `);

      res.json({ id: postId, message: "Post criado com sucesso" });
    } catch (e: any) {
      console.error("[POST /api/community/posts]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── DELETE /api/community/posts/:id ──────────────────────────────────────
  app.delete("/api/community/posts/:id", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });

      const postId = Number(req.params.id);
      if (!postId) return res.status(400).json({ message: "ID inválido" });

      const isAdmin = auth.role === "admin" || auth.role === "super_admin";

      // Check ownership (or admin)
      if (!isAdmin) {
        const post = await db.execute(sql`SELECT user_id FROM community_posts WHERE id = ${postId}`);
        const owner = (post as any).rows?.[0]?.user_id;
        if (owner !== auth.userId) return res.status(403).json({ message: "Sem permissão" });
      }

      // Delete related likes, comments, then the post
      await db.execute(sql`DELETE FROM community_likes WHERE post_id = ${postId}`);
      await db.execute(sql`DELETE FROM community_likes WHERE comment_id IN (SELECT id FROM community_comments WHERE post_id = ${postId})`);
      await db.execute(sql`DELETE FROM community_comments WHERE post_id = ${postId}`);
      await db.execute(sql`DELETE FROM community_posts WHERE id = ${postId}`);

      res.json({ message: "Post removido" });
    } catch (e: any) {
      console.error("[DELETE /api/community/posts/:id]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── GET /api/community/posts/:postId/comments ────────────────────────────
  app.get("/api/community/posts/:postId/comments", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });

      const postId = Number(req.params.postId);
      if (!postId) return res.status(400).json({ message: "ID inválido" });

      const comments = await db.execute(sql`
        SELECT cc.*, u.name as author_name, u.avatar_url as author_avatar, u.username as author_username
        FROM community_comments cc
        JOIN users u ON u.id = cc.user_id
        WHERE cc.post_id = ${postId}
        ORDER BY cc.created_at ASC
      `);

      const rows = (comments as any).rows || [];

      // Check which comments the current user has liked
      let likedCommentIds: Set<number> = new Set();
      if (rows.length > 0 && auth.userId) {
        const commentIds = rows.map((r: any) => r.id);
        const likes = await db.execute(sql`
          SELECT comment_id FROM community_likes
          WHERE user_id = ${auth.userId} AND comment_id IN (${sql.join(commentIds.map((id: number) => sql`${id}`), sql`, `)})
        `);
        likedCommentIds = new Set(((likes as any).rows || []).map((l: any) => l.comment_id));
      }

      const result = rows.map((c: any) => ({
        id: c.id,
        userId: c.user_id,
        postId: c.post_id,
        parentCommentId: c.parent_comment_id,
        content: c.content,
        likesCount: c.likes_count,
        createdAt: c.created_at,
        authorName: c.author_name,
        authorInitial: (c.author_name || '?')[0].toUpperCase(),
        authorAvatar: c.author_avatar || null,
        authorUsername: c.author_username || null,
        liked: likedCommentIds.has(c.id),
      }));

      res.json({ comments: result });
    } catch (e: any) {
      console.error("[GET /api/community/posts/:postId/comments]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── GET /api/community/lessons/:lessonId/comments ────────────────────────
  app.get("/api/community/lessons/:lessonId/comments", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });

      const lessonId = Number(req.params.lessonId);
      if (!lessonId) return res.status(400).json({ message: "ID inválido" });

      const comments = await db.execute(sql`
        SELECT cc.*, u.name as author_name, u.avatar_url as author_avatar, u.username as author_username
        FROM community_comments cc
        JOIN users u ON u.id = cc.user_id
        WHERE cc.lesson_id = ${lessonId}
        ORDER BY cc.created_at ASC
      `);

      const rows = (comments as any).rows || [];

      let likedCommentIds: Set<number> = new Set();
      if (rows.length > 0 && auth.userId) {
        const commentIds = rows.map((r: any) => r.id);
        const likes = await db.execute(sql`
          SELECT comment_id FROM community_likes
          WHERE user_id = ${auth.userId} AND comment_id IN (${sql.join(commentIds.map((id: number) => sql`${id}`), sql`, `)})
        `);
        likedCommentIds = new Set(((likes as any).rows || []).map((l: any) => l.comment_id));
      }

      const result = rows.map((c: any) => ({
        id: c.id,
        userId: c.user_id,
        lessonId: c.lesson_id,
        parentCommentId: c.parent_comment_id,
        content: c.content,
        likesCount: c.likes_count,
        createdAt: c.created_at,
        authorName: c.author_name,
        authorInitial: (c.author_name || '?')[0].toUpperCase(),
        authorAvatar: c.author_avatar || null,
        authorUsername: c.author_username || null,
        liked: likedCommentIds.has(c.id),
      }));

      res.json({ comments: result });
    } catch (e: any) {
      console.error("[GET /api/community/lessons/:lessonId/comments]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── GET /api/community/lessons/:lessonId/comment-count ───────────────────
  app.get("/api/community/lessons/:lessonId/comment-count", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });

      const lessonId = Number(req.params.lessonId);
      if (!lessonId) return res.status(400).json({ message: "ID inválido" });

      const result = await db.execute(sql`
        SELECT COUNT(*)::int as count FROM community_comments WHERE lesson_id = ${lessonId}
      `);
      const count = (result as any).rows?.[0]?.count || 0;

      res.json({ count });
    } catch (e: any) {
      console.error("[GET /api/community/lessons/:lessonId/comment-count]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── POST /api/community/posts/:postId/comments ──────────────────────────
  app.post("/api/community/posts/:postId/comments", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });

      const postId = Number(req.params.postId);
      if (!postId) return res.status(400).json({ message: "ID inválido" });

      const { content, parentCommentId } = req.body as { content: string; parentCommentId?: number };
      if (!content || !content.trim()) return res.status(400).json({ message: "Conteúdo é obrigatório" });

      const now = new Date().toISOString();
      const result = await db.execute(sql`
        INSERT INTO community_comments (user_id, post_id, parent_comment_id, content, created_at)
        VALUES (${auth.userId}, ${postId}, ${parentCommentId || null}, ${content.trim()}, ${now})
        RETURNING id
      `);
      const commentId = (result as any).rows?.[0]?.id;

      // Update comments_count on the post
      await db.execute(sql`
        UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = ${postId}
      `);

      // Create credit request (prevent duplicate)
      await db.execute(sql`
        INSERT INTO credit_requests (user_id, action_type, reference_type, reference_id, amount, status, created_at)
        SELECT ${auth.userId}, ${'comment_on_post'}, ${'comment'}, ${commentId}, ${5000}, ${'pending'}, ${now}
        WHERE NOT EXISTS (
          SELECT 1 FROM credit_requests WHERE user_id = ${auth.userId} AND action_type = 'comment_on_post' AND reference_id = ${commentId}
        )
      `);

      res.json({ id: commentId, message: "Comentário adicionado" });
    } catch (e: any) {
      console.error("[POST /api/community/posts/:postId/comments]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── POST /api/community/lessons/:lessonId/comments ──────────────────────
  app.post("/api/community/lessons/:lessonId/comments", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });

      const lessonId = Number(req.params.lessonId);
      if (!lessonId) return res.status(400).json({ message: "ID inválido" });

      const { content, parentCommentId } = req.body as { content: string; parentCommentId?: number };
      if (!content || !content.trim()) return res.status(400).json({ message: "Conteúdo é obrigatório" });

      const now = new Date().toISOString();
      const result = await db.execute(sql`
        INSERT INTO community_comments (user_id, lesson_id, parent_comment_id, content, created_at)
        VALUES (${auth.userId}, ${lessonId}, ${parentCommentId || null}, ${content.trim()}, ${now})
        RETURNING id
      `);
      const commentId = (result as any).rows?.[0]?.id;

      // Create credit request (prevent duplicate)
      await db.execute(sql`
        INSERT INTO credit_requests (user_id, action_type, reference_type, reference_id, amount, status, created_at)
        SELECT ${auth.userId}, ${'comment_on_video'}, ${'comment'}, ${commentId}, ${5000}, ${'pending'}, ${now}
        WHERE NOT EXISTS (
          SELECT 1 FROM credit_requests WHERE user_id = ${auth.userId} AND action_type = 'comment_on_video' AND reference_id = ${commentId}
        )
      `);

      res.json({ id: commentId, message: "Comentário adicionado" });
    } catch (e: any) {
      console.error("[POST /api/community/lessons/:lessonId/comments]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── DELETE /api/community/comments/:id ───────────────────────────────────
  app.delete("/api/community/comments/:id", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });

      const commentId = Number(req.params.id);
      if (!commentId) return res.status(400).json({ message: "ID inválido" });

      const isAdmin = auth.role === "admin" || auth.role === "super_admin";

      // Check ownership
      const comment = await db.execute(sql`SELECT user_id, post_id FROM community_comments WHERE id = ${commentId}`);
      const row = (comment as any).rows?.[0];
      if (!row) return res.status(404).json({ message: "Comentário não encontrado" });

      if (!isAdmin && row.user_id !== auth.userId) {
        return res.status(403).json({ message: "Sem permissão" });
      }

      // Delete likes on this comment
      await db.execute(sql`DELETE FROM community_likes WHERE comment_id = ${commentId}`);
      await db.execute(sql`DELETE FROM community_comments WHERE id = ${commentId}`);

      // Decrement comments_count on the parent post if applicable
      if (row.post_id) {
        await db.execute(sql`
          UPDATE community_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = ${row.post_id}
        `);
      }

      res.json({ message: "Comentário removido" });
    } catch (e: any) {
      console.error("[DELETE /api/community/comments/:id]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── POST /api/community/posts/:id/like ───────────────────────────────────
  app.post("/api/community/posts/:id/like", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });

      const postId = Number(req.params.id);
      if (!postId) return res.status(400).json({ message: "ID inválido" });

      const now = new Date().toISOString();

      // Check if already liked
      const existing = await db.execute(sql`
        SELECT id FROM community_likes WHERE user_id = ${auth.userId} AND post_id = ${postId}
      `);

      if ((existing as any).rows?.length > 0) {
        // Unlike
        await db.execute(sql`DELETE FROM community_likes WHERE user_id = ${auth.userId} AND post_id = ${postId}`);
        await db.execute(sql`UPDATE community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ${postId}`);
        res.json({ liked: false });
      } else {
        // Like
        await db.execute(sql`
          INSERT INTO community_likes (user_id, post_id, created_at)
          VALUES (${auth.userId}, ${postId}, ${now})
          ON CONFLICT (user_id, post_id) DO NOTHING
        `);
        await db.execute(sql`UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = ${postId}`);
        res.json({ liked: true });
      }
    } catch (e: any) {
      console.error("[POST /api/community/posts/:id/like]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── POST /api/community/comments/:id/like ────────────────────────────────
  app.post("/api/community/comments/:id/like", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });

      const commentId = Number(req.params.id);
      if (!commentId) return res.status(400).json({ message: "ID inválido" });

      const now = new Date().toISOString();

      const existing = await db.execute(sql`
        SELECT id FROM community_likes WHERE user_id = ${auth.userId} AND comment_id = ${commentId}
      `);

      if ((existing as any).rows?.length > 0) {
        await db.execute(sql`DELETE FROM community_likes WHERE user_id = ${auth.userId} AND comment_id = ${commentId}`);
        await db.execute(sql`UPDATE community_comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ${commentId}`);
        res.json({ liked: false });
      } else {
        await db.execute(sql`
          INSERT INTO community_likes (user_id, comment_id, created_at)
          VALUES (${auth.userId}, ${commentId}, ${now})
          ON CONFLICT (user_id, comment_id) DO NOTHING
        `);
        await db.execute(sql`UPDATE community_comments SET likes_count = likes_count + 1 WHERE id = ${commentId}`);
        res.json({ liked: true });
      }
    } catch (e: any) {
      console.error("[POST /api/community/comments/:id/like]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── ADMIN: CREDIT REQUESTS ─────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── GET /api/admin/credit-requests ───────────────────────────────────────
  app.get("/api/admin/credit-requests", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const admin = requireAdmin(req, res);
      if (!admin) return;

      const status = (req.query.status as string) || 'pending';

      const result = await db.execute(sql`
        SELECT cr.*, u.name as user_name, u.email as user_email
        FROM credit_requests cr
        JOIN users u ON u.id = cr.user_id
        WHERE cr.status = ${status}
        ORDER BY cr.created_at DESC
      `);

      const rows = ((result as any).rows || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
        actionType: r.action_type,
        referenceType: r.reference_type,
        referenceId: r.reference_id,
        amount: r.amount,
        status: r.status,
        adminNote: r.admin_note,
        createdAt: r.created_at,
        reviewedAt: r.reviewed_at,
        reviewedBy: r.reviewed_by,
      }));

      res.json({ requests: rows });
    } catch (e: any) {
      console.error("[GET /api/admin/credit-requests]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── POST /api/admin/credit-requests/:id/approve ──────────────────────────
  app.post("/api/admin/credit-requests/:id/approve", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const admin = requireAdmin(req, res);
      if (!admin) return;

      const requestId = Number(req.params.id);
      if (!requestId) return res.status(400).json({ message: "ID inválido" });

      const now = new Date().toISOString();

      // Fetch the request
      const reqResult = await db.execute(sql`SELECT * FROM credit_requests WHERE id = ${requestId} AND status = 'pending'`);
      const creditReq = (reqResult as any).rows?.[0];
      if (!creditReq) return res.status(404).json({ message: "Solicitação não encontrada ou já processada" });

      // Update status
      await db.execute(sql`
        UPDATE credit_requests SET status = 'approved', reviewed_at = ${now}, reviewed_by = ${admin.userId}
        WHERE id = ${requestId}
      `);

      // Insert credit transaction
      const description = creditReq.action_type === 'post_created'
        ? 'Recompensa: post na comunidade'
        : creditReq.action_type === 'comment_on_video'
          ? 'Recompensa: comentário em aula'
          : 'Recompensa: comentário na comunidade';
      const refId = `credit_request_${requestId}`;
      const expiresAt = new Date(Date.now() + 180 * 86400000).toISOString();

      await db.execute(sql`
        INSERT INTO credit_transactions (user_id, type, amount, description, reference_id, created_at, expires_at)
        VALUES (${creditReq.user_id}, ${'community_reward'}, ${creditReq.amount}, ${description}, ${refId}, ${now}, ${expiresAt})
      `);

      res.json({ message: "Solicitação aprovada e crédito liberado" });
    } catch (e: any) {
      console.error("[POST /api/admin/credit-requests/:id/approve]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── POST /api/admin/credit-requests/:id/reject ───────────────────────────
  app.post("/api/admin/credit-requests/:id/reject", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const admin = requireAdmin(req, res);
      if (!admin) return;

      const requestId = Number(req.params.id);
      if (!requestId) return res.status(400).json({ message: "ID inválido" });

      const { adminNote } = req.body as { adminNote?: string };
      const now = new Date().toISOString();

      const result = await db.execute(sql`
        UPDATE credit_requests SET status = 'rejected', reviewed_at = ${now}, reviewed_by = ${admin.userId}, admin_note = ${adminNote || null}
        WHERE id = ${requestId} AND status = 'pending'
        RETURNING id
      `);

      if ((result as any).rows?.length === 0) {
        return res.status(404).json({ message: "Solicitação não encontrada ou já processada" });
      }

      res.json({ message: "Solicitação rejeitada" });
    } catch (e: any) {
      console.error("[POST /api/admin/credit-requests/:id/reject]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── POST /api/admin/credit-requests/approve-all ──────────────────────────
  app.post("/api/admin/credit-requests/approve-all", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const admin = requireAdmin(req, res);
      if (!admin) return;

      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 180 * 86400000).toISOString();

      // Fetch all pending requests
      const pending = await db.execute(sql`SELECT * FROM credit_requests WHERE status = 'pending' ORDER BY id`);
      const rows = (pending as any).rows || [];

      if (rows.length === 0) return res.json({ message: "Nenhuma solicitação pendente", approved: 0 });

      let approved = 0;
      for (const creditReq of rows) {
        // Update status
        await db.execute(sql`
          UPDATE credit_requests SET status = 'approved', reviewed_at = ${now}, reviewed_by = ${admin.userId}
          WHERE id = ${creditReq.id}
        `);

        // Insert credit
        const description = creditReq.action_type === 'post_created'
          ? 'Recompensa: post na comunidade'
          : creditReq.action_type === 'comment_on_video'
            ? 'Recompensa: comentário em aula'
            : 'Recompensa: comentário na comunidade';
        const refId = `credit_request_${creditReq.id}`;

        await db.execute(sql`
          INSERT INTO credit_transactions (user_id, type, amount, description, reference_id, created_at, expires_at)
          VALUES (${creditReq.user_id}, ${'community_reward'}, ${creditReq.amount}, ${description}, ${refId}, ${now}, ${expiresAt})
        `);
        approved++;
      }

      res.json({ message: `${approved} solicitações aprovadas`, approved });
    } catch (e: any) {
      console.error("[POST /api/admin/credit-requests/approve-all]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── GET /api/admin/community-stats ───────────────────────────────────────
  app.get("/api/admin/community-stats", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const admin = requireAdmin(req, res);
      if (!admin) return;

      const postsResult = await db.execute(sql`SELECT COUNT(*)::int as count FROM community_posts`);
      const commentsResult = await db.execute(sql`SELECT COUNT(*)::int as count FROM community_comments`);
      const pendingResult = await db.execute(sql`SELECT COUNT(*)::int as count FROM credit_requests WHERE status = 'pending'`);

      res.json({
        totalPosts: (postsResult as any).rows?.[0]?.count || 0,
        totalComments: (commentsResult as any).rows?.[0]?.count || 0,
        pendingCreditRequests: (pendingResult as any).rows?.[0]?.count || 0,
      });
    } catch (e: any) {
      console.error("[GET /api/admin/community-stats]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── GET /api/profile ────────────────────────────────────────────────────────
  app.get("/api/profile", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });

      const result = await db.execute(sql`SELECT name, email, phone, username, avatar_url, instagram FROM users WHERE id = ${auth.userId}`);
      const user = (result as any).rows?.[0];
      if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

      res.json({
        name: user.name,
        email: user.email,
        phone: user.phone,
        username: user.username,
        avatarUrl: user.avatar_url,
        instagram: user.instagram,
      });
    } catch (e: any) {
      console.error("[GET /api/profile]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── PUT /api/profile ────────────────────────────────────────────────────────
  app.put("/api/profile", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });

      const { name, phone, username, avatarUrl, instagram } = req.body as { name?: string; phone?: string; username?: string; avatarUrl?: string; instagram?: string };

      // Validate username if provided
      if (username !== undefined && username !== null && username !== "") {
        if (!/^[a-zA-Z0-9_]{1,30}$/.test(username)) {
          return res.status(400).json({ message: "Nome de usuario deve ter no maximo 30 caracteres (letras, numeros e _)" });
        }
        const existing = await db.execute(sql`SELECT id FROM users WHERE LOWER(username) = ${username.toLowerCase()} AND id != ${auth.userId} LIMIT 1`);
        if ((existing as any).rows?.length > 0) {
          return res.status(400).json({ message: "Nome de usuario ja esta em uso" });
        }
      }

      // Normalize instagram handle (strip @, whitespace)
      const normalizedInstagram = instagram !== undefined ? (instagram || "").replace(/^@/, "").trim() : undefined;

      await db.execute(sql`
        UPDATE users SET
          name = COALESCE(${name || null}, name),
          phone = COALESCE(${phone ? sanitizePhone(phone) : null}, phone),
          username = ${username !== undefined ? (username || null) : null},
          avatar_url = ${avatarUrl !== undefined ? (avatarUrl || null) : null},
          instagram = ${normalizedInstagram !== undefined ? (normalizedInstagram || null) : null}
        WHERE id = ${auth.userId}
      `);

      res.json({ message: "Perfil atualizado" });
    } catch (e: any) {
      console.error("[PUT /api/profile]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── POST /api/upload/avatar ──────────────────────────────────────────────────
  app.post("/api/upload/avatar", avatarUpload.single("avatar"), async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });

      if (!req.file) return res.status(400).json({ message: "Nenhuma imagem enviada" });

      const base64 = req.file.buffer.toString('base64');
      const dataUri = `data:${req.file.mimetype};base64,${base64}`;

      await db.execute(sql`UPDATE users SET avatar_url = ${dataUri} WHERE id = ${auth.userId}`);

      res.json({ avatarUrl: dataUri });
    } catch (e: any) {
      console.error("[upload/avatar]", e.message);
      res.status(500).json({ message: "Erro ao enviar imagem" });
    }
  });

  // ─── GET /api/users/:id/profile ─────────────────────────────────────────────
  app.get("/api/users/:id/profile", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });

      const userId = Number(req.params.id);
      if (!userId) return res.status(400).json({ message: "ID inválido" });

      const result = await db.execute(sql`SELECT name, username, avatar_url FROM users WHERE id = ${userId}`);
      const user = (result as any).rows?.[0];
      if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

      res.json({
        name: user.name,
        username: user.username,
        avatarUrl: user.avatar_url,
      });
    } catch (e: any) {
      console.error("[GET /api/users/:id/profile]", e.message);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ==================== TRACKING EVENTS ====================
  app.post("/api/tracking/event", async (req, res) => {
    try {
      const trkIp = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || "unknown";
      if (!rateLimit(`tracking:${trkIp}`, 100, 60 * 1000)) {
        return res.status(429).json({ message: "Muitas requisições. Tente novamente em breve." });
      }
      const { db } = await import("./db");
      const { event_type, source_page, utm_source, metadata } = req.body;
      if (!event_type) return res.status(400).json({ message: "event_type required" });
      await db.execute(
        sql`INSERT INTO tracking_events (event_type, source_page, utm_source, metadata, created_at)
            VALUES (${event_type}, ${source_page || null}, ${utm_source || null}, ${metadata ? JSON.stringify(metadata) : null}, ${new Date().toISOString()})`
      );
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ message: "Erro interno" });
    }
  });

  // ==================== VISITOR TRACKING ====================

  // POST /api/tracking/pagevisit — record a page visit for an anonymous or logged-in visitor
  app.post("/api/tracking/pagevisit", async (req, res) => {
    try {
      const pvIp = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || "unknown";
      if (!rateLimit(`tracking:${pvIp}`, 100, 60 * 1000)) {
        return res.status(429).json({ message: "Muitas requisições. Tente novamente em breve." });
      }
      const { db } = await import("./db");
      const { visitor_id, page, referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term, lead_source } = req.body;
      if (!visitor_id || !page) return res.status(400).json({ message: "visitor_id and page required" });
      const now = new Date().toISOString();

      // Upsert visitor
      await db.execute(sql`
        INSERT INTO site_visitors (visitor_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, lead_source, referrer, first_page, created_at, last_seen_at)
        VALUES (${visitor_id}, ${utm_source || null}, ${utm_medium || null}, ${utm_campaign || null}, ${utm_content || null}, ${utm_term || null}, ${lead_source || null}, ${referrer || null}, ${page}, ${now}, ${now})
        ON CONFLICT (visitor_id) DO UPDATE SET last_seen_at = ${now},
          utm_source = COALESCE(NULLIF(${utm_source || null}::text, ''), site_visitors.utm_source),
          utm_medium = COALESCE(NULLIF(${utm_medium || null}::text, ''), site_visitors.utm_medium),
          utm_campaign = COALESCE(NULLIF(${utm_campaign || null}::text, ''), site_visitors.utm_campaign),
          lead_source = COALESCE(NULLIF(${lead_source || null}::text, ''), site_visitors.lead_source)
      `);

      // Record page visit
      await db.execute(sql`
        INSERT INTO page_visits (visitor_id, page, referrer, created_at)
        VALUES (${visitor_id}, ${page}, ${referrer || null}, ${now})
      `);

      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ message: "Erro interno" });
    }
  });

  // POST /api/tracking/link-visitor — link a visitor_id to the authenticated user
  app.post("/api/tracking/link-visitor", async (req, res) => {
    try {
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autorizado" });
      const { db } = await import("./db");
      const { visitor_id } = req.body;
      if (!visitor_id) return res.status(400).json({ message: "visitor_id é obrigatório" });
      await db.execute(sql`
        UPDATE site_visitors SET user_id = ${auth.userId} WHERE visitor_id = ${visitor_id} AND user_id IS NULL
      `);
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ message: "Erro interno" });
    }
  });

  // ==================== ANALYTICS ADMIN ENDPOINTS ====================

  // GET /api/admin/analytics/overview — visits today/week/month, registrations, conversion rate
  app.get("/api/admin/analytics/overview", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Visit counts
      const visitsToday = await db.execute(sql`SELECT COUNT(*) as count FROM page_visits WHERE created_at >= ${todayStart}`).catch(() => ({ rows: [{ count: 0 }] }));
      const visitsWeek = await db.execute(sql`SELECT COUNT(*) as count FROM page_visits WHERE created_at >= ${weekStart}`).catch(() => ({ rows: [{ count: 0 }] }));
      const visitsMonth = await db.execute(sql`SELECT COUNT(*) as count FROM page_visits WHERE created_at >= ${monthStart}`).catch(() => ({ rows: [{ count: 0 }] }));

      // Unique visitors
      const uniqueToday = await db.execute(sql`SELECT COUNT(DISTINCT visitor_id) as count FROM page_visits WHERE created_at >= ${todayStart}`).catch(() => ({ rows: [{ count: 0 }] }));
      const uniqueWeek = await db.execute(sql`SELECT COUNT(DISTINCT visitor_id) as count FROM page_visits WHERE created_at >= ${weekStart}`).catch(() => ({ rows: [{ count: 0 }] }));
      const uniqueMonth = await db.execute(sql`SELECT COUNT(DISTINCT visitor_id) as count FROM page_visits WHERE created_at >= ${monthStart}`).catch(() => ({ rows: [{ count: 0 }] }));

      // Registrations this month
      const registrations = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE created_at >= ${monthStart} AND role IN ('trial', 'student')`).catch(() => ({ rows: [{ count: 0 }] }));
      const regCount = Number((registrations as any).rows?.[0]?.count || 0);

      // Conversion rate: visitors who registered / total unique visitors this month
      const uniqueMonthCount = Number((uniqueMonth as any).rows?.[0]?.count || 0);
      const conversionRate = uniqueMonthCount > 0 ? Math.round((regCount / uniqueMonthCount) * 100) : 0;

      return res.json({
        visitsToday: Number((visitsToday as any).rows?.[0]?.count || 0),
        visitsWeek: Number((visitsWeek as any).rows?.[0]?.count || 0),
        visitsMonth: Number((visitsMonth as any).rows?.[0]?.count || 0),
        uniqueToday: Number((uniqueToday as any).rows?.[0]?.count || 0),
        uniqueWeek: Number((uniqueWeek as any).rows?.[0]?.count || 0),
        uniqueMonth: Number((uniqueMonth as any).rows?.[0]?.count || 0),
        registrations: regCount,
        conversionRate,
      });
    } catch (e: any) {
      console.error("[GET /api/admin/analytics/overview]", e.message);
      return res.status(500).json({ message: "Erro interno" });
    }
  });

  // GET /api/admin/analytics/funnel — visits → registration started → completed → trial active → paid
  app.get("/api/admin/analytics/funnel", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");

      // Total unique visitors
      const totalVisitors = await db.execute(sql`SELECT COUNT(*) as count FROM site_visitors`).catch(() => ({ rows: [{ count: 0 }] }));
      // Visitors who started registration (visited comecar/planos/lp pages)
      const regStarted = await db.execute(sql`SELECT COUNT(DISTINCT visitor_id) as count FROM page_visits WHERE page LIKE '%comecar%' OR page LIKE '%planos%' OR page LIKE '%trial%'`).catch(() => ({ rows: [{ count: 0 }] }));
      // Visitors who completed registration (linked to a user)
      const regCompleted = await db.execute(sql`SELECT COUNT(*) as count FROM site_visitors WHERE user_id IS NOT NULL`).catch(() => ({ rows: [{ count: 0 }] }));
      // Active trials
      const activeTrials = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE role = 'trial' AND approved = true`).catch(() => ({ rows: [{ count: 0 }] }));
      // Paid conversions
      const paidUsers = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE (converted_at IS NOT NULL OR (role = 'student' AND plan_key IS NOT NULL))`).catch(() => ({ rows: [{ count: 0 }] }));

      return res.json({
        visitors: Number((totalVisitors as any).rows?.[0]?.count || 0),
        regStarted: Number((regStarted as any).rows?.[0]?.count || 0),
        regCompleted: Number((regCompleted as any).rows?.[0]?.count || 0),
        trialActive: Number((activeTrials as any).rows?.[0]?.count || 0),
        paidConversion: Number((paidUsers as any).rows?.[0]?.count || 0),
      });
    } catch (e: any) {
      console.error("[GET /api/admin/analytics/funnel]", e.message);
      return res.status(500).json({ message: "Erro interno" });
    }
  });

  // GET /api/admin/analytics/sources — traffic sources breakdown
  app.get("/api/admin/analytics/sources", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const result = await db.execute(sql`
        SELECT COALESCE(lead_source, 'Direto') as source,
               COUNT(*) as visitors,
               COUNT(user_id) as converted
        FROM site_visitors
        GROUP BY COALESCE(lead_source, 'Direto')
        ORDER BY COUNT(*) DESC
      `).catch(() => ({ rows: [] }));
      return res.json((result as any).rows || []);
    } catch (e: any) {
      console.error("[GET /api/admin/analytics/sources]", e.message);
      return res.status(500).json({ message: "Erro interno" });
    }
  });

  // GET /api/admin/analytics/pages — most visited pages
  app.get("/api/admin/analytics/pages", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const result = await db.execute(sql`
        SELECT page, COUNT(*) as views, COUNT(DISTINCT visitor_id) as unique_visitors
        FROM page_visits
        GROUP BY page
        ORDER BY COUNT(*) DESC
        LIMIT 20
      `).catch(() => ({ rows: [] }));
      return res.json((result as any).rows || []);
    } catch (e: any) {
      console.error("[GET /api/admin/analytics/pages]", e.message);
      return res.status(500).json({ message: "Erro interno" });
    }
  });

  // GET /api/admin/analytics/visitors — list all tracked visitors with status
  app.get("/api/admin/analytics/visitors", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const result = await db.execute(sql`
        SELECT sv.id, sv.visitor_id, sv.user_id, sv.utm_source, sv.utm_medium, sv.utm_campaign,
               sv.lead_source, sv.referrer, sv.first_page, sv.created_at, sv.last_seen_at,
               u.name, u.email, u.phone, u.role, u.plan_key, u.access_expires_at,
               (SELECT COUNT(*) FROM page_visits pv WHERE pv.visitor_id = sv.visitor_id) as page_count
        FROM site_visitors sv
        LEFT JOIN users u ON sv.user_id = u.id
        ORDER BY sv.last_seen_at DESC
        LIMIT 500
      `).catch(() => ({ rows: [] }));
      return res.json((result as any).rows || []);
    } catch (e: any) {
      console.error("[GET /api/admin/analytics/visitors]", e.message);
      return res.status(500).json({ message: "Erro interno" });
    }
  });

  // GET /api/admin/analytics/visitor/:visitorId — full journey for a specific visitor
  app.get("/api/admin/analytics/visitor/:visitorId", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const { visitorId } = req.params;

      // Get visitor info
      const visitorResult = await db.execute(sql`
        SELECT sv.*, u.name, u.email, u.phone, u.role, u.plan_key, u.plan_id,
               u.created_at as user_created_at, u.access_expires_at, u.converted_at,
               u.trial_started_at, u.plan_amount_paid, u.plan_paid_at,
               p.name as plan_name
        FROM site_visitors sv
        LEFT JOIN users u ON sv.user_id = u.id
        LEFT JOIN plans p ON u.plan_id = p.id
        WHERE sv.visitor_id = ${visitorId}
      `);
      const visitor = (visitorResult as any).rows?.[0];
      if (!visitor) return res.status(404).json({ message: "Visitor not found" });

      // Get all page visits
      const pagesResult = await db.execute(sql`
        SELECT page, referrer, created_at FROM page_visits
        WHERE visitor_id = ${visitorId}
        ORDER BY created_at ASC
      `);

      // Get lead events if linked to a user
      let events: any[] = [];
      if (visitor.user_id) {
        const eventsResult = await db.execute(sql`
          SELECT * FROM lead_events WHERE user_id = ${visitor.user_id} ORDER BY created_at ASC
        `);
        events = (eventsResult as any).rows || [];
      }

      return res.json({
        visitor,
        pages: (pagesResult as any).rows || [],
        events,
      });
    } catch (e: any) {
      console.error("[GET /api/admin/analytics/visitor/:visitorId]", e.message);
      return res.status(500).json({ message: "Erro interno" });
    }
  });

  // ==================== CRM / LEAD ANALYTICS ENDPOINTS ====================

  // CRM overview stats
  app.get("/api/admin/crm/stats", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // All users (for leads and conversions)
      const allUsersResult = await db.execute(sql`
        SELECT id, role, lead_source, utm_source, utm_medium, utm_campaign,
               created_at, converted_at, plan_key, plan_amount_paid,
               access_expires_at, trial_started_at
        FROM users
        WHERE role IN ('trial', 'student')
        ORDER BY created_at DESC
      `);
      const allUsers = (allUsersResult as any).rows || [];

      // Leads this month
      const leadsThisMonth = allUsers.filter((u: any) => u.created_at >= monthStart);

      // Leads by source
      const sourceMap: Record<string, number> = {};
      leadsThisMonth.forEach((u: any) => {
        const src = u.lead_source || "Direto";
        sourceMap[src] = (sourceMap[src] || 0) + 1;
      });

      // Conversion rate (users who converted from trial to paid)
      const totalTrialEver = allUsers.filter((u: any) => u.trial_started_at).length;
      const totalConverted = allUsers.filter((u: any) => u.converted_at || (u.role === "student" && u.plan_key)).length;
      const conversionRate = totalTrialEver > 0 ? Math.round((totalConverted / totalTrialEver) * 100) : 0;

      // Source performance (aggregate table)
      const sources = ["Instagram", "Meta Ads", "WhatsApp", "Google", "Indicação", "Questionário", "Direto"];
      const sourcePerformance = sources.map(src => {
        const leads = allUsers.filter((u: any) => (u.lead_source || "Direto") === src);
        const converted = leads.filter((u: any) => u.converted_at || (u.role === "student" && u.plan_key));
        const revenue = converted.reduce((sum: number, u: any) => sum + (u.plan_amount_paid || 0), 0);
        return {
          source: src,
          leads: leads.length,
          converted: converted.length,
          rate: leads.length > 0 ? Math.round((converted.length / leads.length) * 100) : 0,
          revenue,
        };
      }).filter(s => s.leads > 0);

      // Funnel: LP visits (from funnel_events), registered, converted
      const lpVisitsResult = await db.execute(sql`
        SELECT COUNT(DISTINCT session_id) as count FROM funnel_events
        WHERE event = 'banner_click' OR event = 'quiz_start' OR event = 'plan_click'
      `).catch(() => ({ rows: [{ count: 0 }] }));
      const lpVisits = Number((lpVisitsResult as any).rows?.[0]?.count || 0);

      // WhatsApp click count
      const waClicksResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM tracking_events WHERE event_type = 'whatsapp_click'
      `).catch(() => ({ rows: [{ count: 0 }] }));
      const waClicks = Number((waClicksResult as any).rows?.[0]?.count || 0);

      return res.json({
        leadsThisMonth: leadsThisMonth.length,
        leadsBySource: sourceMap,
        conversionRate,
        totalTrials: totalTrialEver,
        totalConverted,
        sourcePerformance,
        funnel: {
          lpVisits,
          registered: allUsers.length,
          converted: totalConverted,
        },
        waClicks,
      });
    } catch (e: any) {
      console.error("[GET /api/admin/crm/stats]", e.message);
      return res.status(500).json({ message: "Erro interno" });
    }
  });

  // CRM leads list (all users with UTM data)
  app.get("/api/admin/crm/leads", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const result = await db.execute(sql`
        SELECT u.id, u.name, u.email, u.phone, u.role, u.plan_key, u.plan_id,
               u.created_at, u.access_expires_at, u.approved,
               u.utm_source, u.utm_medium, u.utm_campaign, u.utm_content, u.utm_term,
               u.lead_source, u.converted_at, u.landing_page,
               u.trial_started_at, u.plan_amount_paid,
               p.name as plan_name
        FROM users u
        LEFT JOIN plans p ON u.plan_id = p.id
        WHERE u.role IN ('trial', 'student')
        ORDER BY u.created_at DESC
      `);
      const leads = (result as any).rows || [];
      return res.json(leads);
    } catch (e: any) {
      console.error("[GET /api/admin/crm/leads]", e.message);
      return res.status(500).json({ message: "Erro interno" });
    }
  });

  // ==================== CRM PIPELINE ENDPOINTS ====================

  // GET /api/admin/crm/pipeline — unified pipeline view with all stages
  app.get("/api/admin/crm/pipeline", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const now = new Date().toISOString();

      // Get all users (trial + student)
      const usersResult = await db.execute(sql`
        SELECT u.id, u.name, u.email, u.phone, u.role, u.plan_key, u.plan_id,
               u.created_at, u.access_expires_at, u.approved,
               u.lead_source, u.trial_started_at, u.converted_at,
               u.plan_amount_paid, p.name as plan_name
        FROM users u
        LEFT JOIN plans p ON u.plan_id = p.id
        WHERE u.role IN ('trial', 'student')
        ORDER BY u.created_at DESC
      `);
      const allUsers = (usersResult as any).rows || [];

      // Get quiz leads
      const quizResult = await db.execute(sql`SELECT * FROM quiz_leads ORDER BY created_at DESC`);
      const quizLeads = (quizResult as any).rows || [];

      // Cross-reference: find quiz leads that have NOT registered
      const registeredEmails = new Set(allUsers.map((u: any) => u.email.toLowerCase()));

      // Build pipeline stages
      const pipeline: Record<string, any[]> = {
        novo_lead: [],
        quiz_completo: [],
        trial_ativo: [],
        trial_expirado: [],
        aluno_pagante: [],
        expirado: [],
      };

      // Classify users into stages
      for (const u of allUsers) {
        const isTrialRole = u.role === "trial";
        const isStudentRole = u.role === "student";
        const expiresAt = u.access_expires_at ? new Date(u.access_expires_at) : null;
        const isExpired = expiresAt ? expiresAt < new Date() : false;
        const hasPlan = !!u.plan_key;
        const isApproved = u.approved;

        // Find matching quiz lead data
        const ql = quizLeads.find((q: any) => q.email.toLowerCase() === u.email.toLowerCase());
        const userData = {
          ...u,
          quiz_resultado: ql?.resultado || null,
          quiz_respostas: ql?.respostas || null,
          days_in_stage: Math.ceil((Date.now() - new Date(u.created_at).getTime()) / 86400000),
        };

        if (isStudentRole && hasPlan && isApproved) {
          if (isExpired) {
            pipeline.expirado.push(userData);
          } else {
            pipeline.aluno_pagante.push(userData);
          }
        } else if (isTrialRole) {
          if (isExpired) {
            pipeline.trial_expirado.push(userData);
          } else {
            pipeline.trial_ativo.push(userData);
          }
        } else {
          // No plan, not trial — "Novo Lead" (registered but no trial)
          pipeline.novo_lead.push(userData);
        }
      }

      // Quiz leads without user accounts
      for (const ql of quizLeads) {
        if (!registeredEmails.has(ql.email.toLowerCase())) {
          const quizData = {
            id: `ql_${ql.id}`,
            quiz_lead_id: ql.id,
            name: ql.nome,
            email: ql.email,
            phone: ql.whatsapp,
            role: null,
            lead_source: "Questionário",
            created_at: ql.created_at,
            quiz_resultado: ql.resultado,
            quiz_respostas: ql.respostas,
            days_in_stage: Math.ceil((Date.now() - new Date(ql.created_at).getTime()) / 86400000),
          };
          if (ql.resultado && ql.resultado !== "parcial") {
            pipeline.quiz_completo.push(quizData);
          } else {
            pipeline.novo_lead.push(quizData);
          }
        }
      }

      return res.json(pipeline);
    } catch (e: any) {
      console.error("[GET /api/admin/crm/pipeline]", e.message);
      return res.status(500).json({ message: "Erro interno" });
    }
  });

  // POST /api/admin/crm/pipeline/move — move a lead between stages
  app.post("/api/admin/crm/pipeline/move", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const { userId, targetStage } = req.body;
      if (!userId || !targetStage) return res.status(400).json({ message: "userId and targetStage required" });

      const now = new Date().toISOString();
      const adminId = (req as any).user?.id || 0;
      const adminName = (req as any).user?.name || "Admin";

      if (targetStage === "trial_ativo") {
        // Convert to trial: set role=trial, approved=true, 7-day expiry
        const trialExpiry = new Date(Date.now() + 7 * 86400000).toISOString();
        await db.execute(sql`UPDATE users SET role = 'trial', approved = true, access_expires_at = ${trialExpiry}, trial_started_at = ${now} WHERE id = ${userId}`);
        await db.execute(sql`INSERT INTO lead_events (user_id, event_type, event_description, metadata, created_at)
          VALUES (${userId}, 'trial_inicio', 'Iniciou Trial (7 dias)', ${JSON.stringify({ adminId, action: 'pipeline_move' })}, ${now})`).catch(() => {});
      } else if (targetStage === "aluno_pagante") {
        // Convert to paid student
        await db.execute(sql`UPDATE users SET role = 'student', approved = true, converted_at = ${now} WHERE id = ${userId}`);
        await db.execute(sql`INSERT INTO lead_events (user_id, event_type, event_description, metadata, created_at)
          VALUES (${userId}, 'convertido', ${'Convertido para Aluno Pagante por ' + adminName}, ${JSON.stringify({ adminId, action: 'pipeline_move' })}, ${now})`).catch(() => {});
      }

      return res.json({ ok: true });
    } catch (e: any) {
      console.error("[POST /api/admin/crm/pipeline/move]", e.message);
      return res.status(500).json({ message: "Erro interno" });
    }
  });

  // ==================== CRM LEAD EVENTS / TIMELINE ENDPOINTS ====================

  // GET /api/admin/crm/leads/:id/events — activity timeline for a lead
  app.get("/api/admin/crm/leads/:id/events", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const leadId = parseInt(req.params.id);
      if (isNaN(leadId)) return res.status(400).json({ message: "Invalid ID" });

      const events = await db.execute(sql`
        SELECT * FROM lead_events
        WHERE user_id = ${leadId}
        ORDER BY created_at DESC
      `);

      return res.json((events as any).rows || []);
    } catch (e: any) {
      console.error("[GET /api/admin/crm/leads/:id/events]", e.message);
      return res.status(500).json({ message: "Erro interno" });
    }
  });

  // GET /api/admin/crm/leads/:id/detail — full lead detail including quiz answers
  app.get("/api/admin/crm/leads/:id/detail", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const leadId = parseInt(req.params.id);
      if (isNaN(leadId)) return res.status(400).json({ message: "Invalid ID" });

      // Get user data
      const userResult = await db.execute(sql`
        SELECT u.*, p.name as plan_name
        FROM users u
        LEFT JOIN plans p ON u.plan_id = p.id
        WHERE u.id = ${leadId}
      `);
      if (!((userResult as any).rows?.length > 0)) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }
      const user = (userResult as any).rows[0];

      // Get quiz data if available
      const quizResult = await db.execute(sql`
        SELECT * FROM quiz_leads WHERE email = ${user.email} LIMIT 1
      `);
      const quizData = (quizResult as any).rows?.[0] || null;

      // Get events
      const eventsResult = await db.execute(sql`
        SELECT * FROM lead_events WHERE user_id = ${leadId} ORDER BY created_at DESC
      `);

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          plan_key: user.plan_key,
          plan_name: user.plan_name,
          created_at: user.created_at,
          access_expires_at: user.access_expires_at,
          approved: user.approved,
          lead_source: user.lead_source,
          utm_source: user.utm_source,
          utm_medium: user.utm_medium,
          utm_campaign: user.utm_campaign,
          trial_started_at: user.trial_started_at,
          converted_at: user.converted_at,
          plan_amount_paid: user.plan_amount_paid,
          landing_page: user.landing_page,
        },
        quiz: quizData,
        events: (eventsResult as any).rows || [],
      });
    } catch (e: any) {
      console.error("[GET /api/admin/crm/leads/:id/detail]", e.message);
      return res.status(500).json({ message: "Erro interno" });
    }
  });

  // GET /api/admin/crm/quiz-leads/:id/detail — detail for quiz-only leads (not registered)
  app.get("/api/admin/crm/quiz-leads/:id/detail", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const quizId = parseInt(req.params.id);
      if (isNaN(quizId)) return res.status(400).json({ message: "Invalid ID" });

      const quizResult = await db.execute(sql`SELECT * FROM quiz_leads WHERE id = ${quizId}`);
      if (!((quizResult as any).rows?.length > 0)) {
        return res.status(404).json({ message: "Quiz lead não encontrado" });
      }
      const quiz = (quizResult as any).rows[0];

      // Get events for this quiz lead
      const eventsResult = await db.execute(sql`
        SELECT * FROM lead_events WHERE quiz_lead_id = ${quizId} ORDER BY created_at DESC
      `);

      return res.json({
        user: null,
        quiz,
        events: (eventsResult as any).rows || [],
      });
    } catch (e: any) {
      console.error("[GET /api/admin/crm/quiz-leads/:id/detail]", e.message);
      return res.status(500).json({ message: "Erro interno" });
    }
  });

  // POST /api/admin/crm/leads/:id/note — add admin note to timeline
  app.post("/api/admin/crm/leads/:id/note", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const leadId = parseInt(req.params.id);
      const { note } = req.body;
      if (isNaN(leadId) || !note?.trim()) return res.status(400).json({ message: "ID and note required" });

      const adminName = (req as any).user?.name || "Admin";
      const now = new Date().toISOString();

      await db.execute(sql`INSERT INTO lead_events (user_id, event_type, event_description, metadata, created_at)
        VALUES (${leadId}, 'nota_admin', ${note.trim()}, ${JSON.stringify({ admin: adminName })}, ${now})`);

      return res.json({ ok: true });
    } catch (e: any) {
      console.error("[POST /api/admin/crm/leads/:id/note]", e.message);
      return res.status(500).json({ message: "Erro interno" });
    }
  });

  // POST /api/admin/crm/quiz-leads/:id/note — add admin note for quiz-only lead
  app.post("/api/admin/crm/quiz-leads/:id/note", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { db } = await import("./db");
      const quizId = parseInt(req.params.id);
      const { note } = req.body;
      if (isNaN(quizId) || !note?.trim()) return res.status(400).json({ message: "ID and note required" });

      const adminName = (req as any).user?.name || "Admin";
      const now = new Date().toISOString();

      await db.execute(sql`INSERT INTO lead_events (quiz_lead_id, event_type, event_description, metadata, created_at)
        VALUES (${quizId}, 'nota_admin', ${note.trim()}, ${JSON.stringify({ admin: adminName })}, ${now})`);

      return res.json({ ok: true });
    } catch (e: any) {
      console.error("[POST /api/admin/crm/quiz-leads/:id/note]", e.message);
      return res.status(500).json({ message: "Erro interno" });
    }
  });

  // ==================== INVITE CODES (Workshop Access) ====================

  // Validate invite code (public — used during registration)
  app.get("/api/invite/:code", async (req, res) => {
    try {
      const inviteIp = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || "unknown";
      if (!rateLimit(`invite_check:${inviteIp}`, 10, 15 * 60 * 1000)) {
        return res.status(429).json({ message: "Muitas tentativas. Aguarde alguns minutos." });
      }
      const { db } = await import("./db");
      const code = req.params.code?.trim();
      if (!code) return res.status(400).json({ message: "Código inválido" });

      const result = await db.execute(sql`SELECT * FROM invite_codes WHERE code = ${code} AND active = true`);
      const invite = (result as any).rows?.[0];
      if (!invite) return res.status(404).json({ message: "Código de convite inválido ou expirado" });

      if (invite.max_uses > 0 && invite.used_count >= invite.max_uses) {
        return res.status(410).json({ message: "Este código de convite já atingiu o limite de usos" });
      }

      return res.json({
        code: invite.code,
        accessType: invite.access_type,
        durationDays: invite.duration_days,
        campaign: invite.campaign,
      });
    } catch (e: any) {
      return res.status(500).json({ message: "Erro ao validar código" });
    }
  });

  // Admin: List all invite codes
  app.get("/api/admin/invite-codes", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const { db } = await import("./db");
      const result = await db.execute(sql`SELECT * FROM invite_codes ORDER BY created_at DESC`);
      return res.json((result as any).rows || []);
    } catch (e: any) {
      return res.status(500).json({ message: "Erro ao listar códigos" });
    }
  });

  // Admin: Create invite code
  app.post("/api/admin/invite-codes", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const { db } = await import("./db");
      const { campaign, durationDays, maxUses, code: customCode } = req.body;
      if (!campaign?.trim()) return res.status(400).json({ message: "Nome da campanha é obrigatório" });

      const code = customCode?.trim() || crypto.randomBytes(4).toString("hex").toUpperCase();
      const duration = parseInt(durationDays) || 7;
      const max = parseInt(maxUses) || 0;
      const now = new Date().toISOString();

      // Check for duplicate code
      const existing = await db.execute(sql`SELECT id FROM invite_codes WHERE code = ${code}`);
      if ((existing as any).rows?.length > 0) {
        return res.status(409).json({ message: "Este código já existe. Escolha outro." });
      }

      await db.execute(sql`INSERT INTO invite_codes (code, access_type, duration_days, campaign, max_uses, used_count, used_by, active, created_by, created_at)
        VALUES (${code}, 'full', ${duration}, ${campaign.trim()}, ${max}, 0, '[]', true, ${auth.userId}, ${now})`);

      // Audit log
      const admin = await storage.getUser(auth.userId);
      await logAction(auth.userId, admin?.name || "Admin", "create_invite_code", "invite_code", 0, code, { campaign: campaign.trim(), durationDays: duration, maxUses: max });

      return res.json({ code, campaign: campaign.trim(), durationDays: duration, maxUses: max });
    } catch (e: any) {
      return res.status(500).json({ message: "Erro ao criar código de convite" });
    }
  });

  // Admin: Toggle invite code active/inactive
  app.patch("/api/admin/invite-codes/:id", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const { db } = await import("./db");
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });

      const { active } = req.body;
      if (typeof active !== "boolean") return res.status(400).json({ message: "Campo 'active' é obrigatório" });

      await db.execute(sql`UPDATE invite_codes SET active = ${active} WHERE id = ${id}`);

      const admin = await storage.getUser(auth.userId);
      await logAction(auth.userId, admin?.name || "Admin", active ? "activate_invite_code" : "deactivate_invite_code", "invite_code", id, "", {});

      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ message: "Erro ao atualizar código" });
    }
  });

  // Admin: Delete invite code
  app.delete("/api/admin/invite-codes/:id", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const { db } = await import("./db");
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });

      await db.execute(sql`DELETE FROM invite_codes WHERE id = ${id}`);

      const admin = await storage.getUser(auth.userId);
      await logAction(auth.userId, admin?.name || "Admin", "delete_invite_code", "invite_code", id, "", {});

      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ message: "Erro ao excluir código" });
    }
  });

  // Admin: Delete test account by email
  app.delete("/api/admin/test-account/:email", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    try {
      const email = decodeURIComponent(req.params.email).trim().toLowerCase();
      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(404).json({ message: "Conta não encontrada" });

      await storage.deleteUser(user.id);

      const admin = await storage.getUser(auth.userId);
      await logAction(auth.userId, admin?.name || "Admin", "delete_test_account", "user", user.id, user.name, { email });

      return res.json({ ok: true, message: `Conta ${email} excluída` });
    } catch (e: any) {
      return res.status(500).json({ message: "Erro ao excluir conta" });
    }
  });

  // ─── Rotas de pagamento Stripe ──────────────────────────────────────────────
  registerStripeRoutes(app);
  registerPublicStripeRoutes(app);

  // ─── Rotas de Acompanhamento (encontros ao vivo em grupo) ──────────────
  registerLiveEventsRoutes(app);
}

// Helper to get all progress (not in storage since it's a simple select-all)
async function db_getProgress() {
  const { db } = await import("./db");
  const { lessonProgress } = await import("@shared/schema");
  return db.select().from(lessonProgress);
}

