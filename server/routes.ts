import type { Express, Request, Response } from "express";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { sql } from "drizzle-orm";
import { storage } from "./storage";
import { registerSchema, loginSchema, insertModuleSchema, insertLessonSchema } from "@shared/schema";
import { Resend } from "resend";
import { registerStripeRoutes } from "./stripe-routes";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function notifyNewRegistration(user: { name: string; email: string; phone?: string }) {
  if (!resend) return; // silently skip if API key not configured
  try {
    await resend.emails.send({
      from: "Ampla Facial Portal <onboarding@resend.dev>",
      to: "gustavo.m.martins@outlook.com",
      subject: `🔔 Novo cadastro: ${user.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0A1628;color:#fff;padding:32px;border-radius:12px">
          <div style="color:#D4A843;font-size:20px;font-weight:bold;margin-bottom:24px">Ampla Facial — Novo Cadastro</div>
          <p style="margin:0 0 16px">Um novo aluno solicitou acesso à plataforma:</p>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#999">Nome</td><td style="padding:8px 0;font-weight:bold">${user.name}</td></tr>
            <tr><td style="padding:8px 0;color:#999">Email</td><td style="padding:8px 0">${user.email}</td></tr>
            <tr><td style="padding:8px 0;color:#999">Telefone</td><td style="padding:8px 0">${user.phone || "—"}</td></tr>
          </table>
          <div style="margin-top:24px">
            <a href="https://portal.amplafacial.com.br/#/admin" style="background:#D4A843;color:#0A1628;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Aprovar no painel admin</a>
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
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
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

const JWT_SECRET = process.env.JWT_SECRET;
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
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
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
    // Stripe & payment columns
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_key TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_paid_at TEXT`).catch(() => {});
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TEXT`).catch(() => {});
    console.log("[auto-migrate] material_topics, order, materials_access, mentorship dates, user_modules, user_material_categories, material_themes/subcategories/files, stripe columns ensured");
  } catch (e: any) {
    console.error("[auto-migrate] Failed to ensure columns:", e.message);
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
    const already = await db.execute(`SELECT 1 FROM migrations_applied WHERE name = '${migrationName}' LIMIT 1`);
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
        await db.execute(`INSERT INTO user_material_categories (user_id, category_title, enabled) SELECT id, '${cat.replace(/'/g, "''")}', true FROM users WHERE NOT EXISTS (SELECT 1 FROM user_material_categories WHERE user_material_categories.user_id = users.id AND user_material_categories.category_title = '${cat.replace(/'/g, "''")}')`);
      }
      // 3. Mark migration as applied
      await db.execute(`INSERT INTO migrations_applied (name, applied_at) VALUES ('${migrationName}', '${new Date().toISOString()}')`);
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
    const already = await db.execute(`SELECT 1 FROM migrations_applied WHERE name = '${migrationName}' LIMIT 1`);
    const alreadyRows = Array.isArray(already) ? already : (already as any).rows || [];
    if (alreadyRows.length === 0) {
      const themesData = [
        {
          title: "Toxina Botulínica", coverUrl: "/images/covers/cover_toxina_botulinica.png?v=2", order: 1,
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
          title: "Moduladores de Matriz Extracelular", coverUrl: "/images/covers/cover_moduladores_matriz.png?v=2", order: 4,
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
      await db.execute(`INSERT INTO migrations_applied (name, applied_at) VALUES ('${migrationName}', '${new Date().toISOString()}')`);
      console.log("[one-time-migrate] Seeded materials into DB");
    } else {
      console.log("[one-time-migrate] seed_materials_db already applied, skipping");
    }
  } catch (e: any) {
    console.error("[one-time-migrate] Failed to seed materials:", e.message);
  }

  // ==================== ONE-TIME: Seed Bioestimuladores lessons ====================
  try {
    const { db } = await import("./db");
    await db.execute(`CREATE TABLE IF NOT EXISTS migrations_applied (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL)`);
    const migrationName = "seed_bioestimuladores_lessons_2026_04";
    const already = await db.execute(`SELECT 1 FROM migrations_applied WHERE name = '${migrationName}' LIMIT 1`);
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
      await db.execute(`INSERT INTO migrations_applied (name, applied_at) VALUES ('${migrationName}', '${new Date().toISOString()}')`);
    } else {
      console.log("[one-time-migrate] seed_bioestimuladores_lessons already applied, skipping");
    }
  } catch (e: any) {
    console.error("[one-time-migrate] Failed to seed Bioestimuladores lessons:", e.message);
  }

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
      const user = await storage.createUser({
        name: sanitize(data.name),
        email: data.email.trim().toLowerCase(),
        phone: sanitize(data.phone),
        password: hashedPassword,
        planId: null,
        createdAt: new Date().toISOString(),
      });
      // Notify admin via email (non-blocking)
      notifyNewRegistration({ name: user.name, email: user.email, phone: user.phone ?? undefined });

      return res.json({ message: "Cadastro realizado! Aguarde a aprovação do administrador.", user: { id: user.id, name: user.name, email: user.email } });
    } catch (e: any) {
      return res.status(400).json({ message: e.message || "Erro no cadastro" });
    }
  });

  // ==================== AUTH: Trial Register ====================
  // Auto-approves the user with role='trial' and 7-day expiry. No admin needed.
  app.post("/api/auth/register-trial", async (req, res) => {
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
      const trialExpires = new Date();
      trialExpires.setDate(trialExpires.getDate() + 7);

      const user = await storage.createUser({
        name: sanitize(data.name),
        email: data.email.trim().toLowerCase(),
        phone: sanitize(data.phone),
        password: hashedPassword,
        planId: null,
        createdAt: new Date().toISOString(),
      });

      // Auto-approve as trial with 7-day expiry
      await storage.updateUser(user.id, {
        role: "trial",
        approved: true,
        accessExpiresAt: trialExpires.toISOString(),
      });

      // Notify admin (non-blocking)
      notifyNewRegistration({ name: user.name, email: user.email, phone: user.phone ?? undefined });

      return res.json({ message: "Seu teste gratuito de 7 dias foi ativado!", user: { id: user.id, name: user.name, email: user.email } });
    } catch (e: any) {
      return res.status(400).json({ message: e.message || "Erro no cadastro" });
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
      // Trial users: check expiry with a specific message
      if (user.role === "trial" && user.accessExpiresAt) {
        const now = new Date();
        const expires = new Date(user.accessExpiresAt);
        if (now > expires) {
          return res.status(403).json({ message: "Seu período de teste gratuito encerrou. Assine a plataforma para continuar acessando." });
        }
      }

      const { password, lockedUntil: _l, loginAttempts: _a, ...safeUser } = user;
      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });

      // Log admin login
      if (user.role === "admin" || user.role === "super_admin") {
        await logAction(user.id, user.name, "admin_login");
      }

      // Set httpOnly cookie
      res.cookie("ampla_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
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
    const freshToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
    res.cookie("ampla_token", freshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
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
        const result = await db.execute(`SELECT id, name, description, duration_days as "durationDays", price FROM plans`);
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

  // ==================== MODULES ====================
  app.get("/api/modules", async (_req, res) => {
    const m = await storage.getModules();
    res.json(m);
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
  app.get("/api/lessons", async (req, res) => {
    const auth = authenticateRequest(req);
    const l = await storage.getLessons();
    if (!auth) {
      res.json(l.map(({ videoUrl, ...rest }) => rest));
    } else {
      res.json(l);
    }
  });

  app.get("/api/modules/:id/lessons", async (req, res) => {
    const auth = authenticateRequest(req);
    const l = await storage.getLessonsByModule(parseInt(req.params.id));
    if (!auth) {
      res.json(l.map(({ videoUrl, ...rest }) => rest));
    } else {
      res.json(l);
    }
  });

  app.get("/api/lessons/:id", async (req, res) => {
    const lesson = await storage.getLesson(parseInt(req.params.id));
    if (!lesson) return res.status(404).json({ message: "Aula não encontrada" });
    const auth = authenticateRequest(req);
    if (!auth) {
      const { videoUrl, ...rest } = lesson;
      res.json(rest);
    } else {
      res.json(lesson);
    }
  });

  // ==================== PROGRESS ====================
  app.get("/api/progress/:userId", async (req, res) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    const targetUserId = parseInt(req.params.userId);
    if (auth.role === "student" && auth.userId !== targetUserId) {
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
    const updateData: any = { approved: true, accessExpiresAt: expiresAt.toISOString() };
    if (bodyPlanId) updateData.planId = bodyPlanId;
    const updated = await storage.updateUser(user.id, updateData);
    if (!updated) return res.status(500).json({ message: "Erro ao aprovar" });
    const { password, ...safe } = updated;
    const admin = await storage.getUser(auth.userId);
    await logAction(auth.userId, admin?.name || "Admin", "student_approved", "student", user.id, user.name, { planId: effectivePlanId, planName: plan?.name });
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
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    const student = await storage.getUser(parseInt(req.params.id));
    const ok = await storage.deleteUser(parseInt(req.params.id));
    const admin = await storage.getUser(auth.userId);
    await logAction(auth.userId, admin?.name || "Admin", "student_deleted", "student", parseInt(req.params.id), student?.name || "?");
    res.json({ success: ok });
  });

  app.patch("/api/admin/students/:id", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    const allowedFields = ['name', 'email', 'phone', 'planId', 'approved', 'accessExpiresAt',
      'communityAccess', 'supportAccess', 'supportExpiresAt', 'clinicalPracticeAccess',
      'materialsAccess', 'mentorshipStartDate', 'mentorshipEndDate'];
    const updateData: any = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        // Sanitize string values
        if (typeof req.body[key] === "string" && !['accessExpiresAt', 'supportExpiresAt', 'mentorshipStartDate', 'mentorshipEndDate', 'email'].includes(key)) {
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
      const data = insertLessonSchema.parse(req.body);
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
    const { moduleId, title, description, videoUrl, duration, order } = req.body;
    const lessonUpdate: Partial<{ moduleId: number; title: string; description: string | null; videoUrl: string | null; duration: string | null; order: number }> = {};
    if (moduleId !== undefined) lessonUpdate.moduleId = moduleId;
    if (title !== undefined) lessonUpdate.title = sanitize(title);
    if (description !== undefined) lessonUpdate.description = description ? sanitize(description) : null;
    if (videoUrl !== undefined) {
      if (videoUrl && !isValidUrl(videoUrl)) return res.status(400).json({ message: "URL de vídeo inválida" });
      lessonUpdate.videoUrl = videoUrl;
    }
    if (duration !== undefined) lessonUpdate.duration = duration ? sanitize(duration) : null;
    if (order !== undefined) lessonUpdate.order = order;
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
      const { currentPassword, name, email, phone, newPassword } = req.body;
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
      if (phone !== undefined && phone !== user.phone) updateData.phone = sanitize(phone);
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
        phone: phone ? sanitize(phone) : null,
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

  // ==================== ADMIN: User Module Permissions ====================
  app.get("/api/admin/students/:id/modules", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const userId = safeParseInt(req.params.id);
    if (!userId) return res.status(400).json({ message: "ID inválido" });
    const entries = await storage.getUserModules(userId);
    res.json(entries);
  });

  app.put("/api/admin/students/:id/modules", async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    const userId = safeParseInt(req.params.id);
    if (!userId) return res.status(400).json({ message: "ID inválido" });
    const { modules: moduleEntries } = req.body;
    if (!Array.isArray(moduleEntries)) {
      return res.status(400).json({ message: "modules array obrigatório" });
    }
    await storage.setUserModules(userId, moduleEntries.map((e: any) => ({
      moduleId: Number(e.moduleId),
      enabled: Boolean(e.enabled),
      startDate: e.startDate || null,
      endDate: e.endDate || null,
    })));
    const admin = await storage.getUser(auth.userId);
    const student = await storage.getUser(userId);
    await logAction(auth.userId, admin?.name || "Admin", "student_updated", "student", userId, student?.name || "?", { userModulesUpdated: true });
    res.json({ success: true });
  });


  // ==================== MATERIALS (DB-driven) ====================
  // Public endpoint: get all themes with nested subcategories and files
  app.get("/api/materials", async (req, res) => {
    // Public endpoint — materials catalog is visible to all (files are PDFs/links, not sensitive)
    try {
      const auth = authenticateRequest(req);
      const isAdmin = auth && (auth.role === "admin" || auth.role === "super_admin");
      const allThemes = await storage.getMaterialThemes();
      const themes = isAdmin ? allThemes : allThemes.filter(t => t.visible !== false);
      const result = await Promise.all(themes.map(async (theme) => {
        const subcategories = await storage.getMaterialSubcategories(theme.id);
        const subsWithFiles = await Promise.all(subcategories.map(async (sub) => {
          const files = await storage.getMaterialFiles(sub.id);
          return { ...sub, files };
        }));
        const fileCount = subsWithFiles.reduce((acc, sub) => acc + sub.files.length, 0);
        return { ...theme, subcategories: subsWithFiles, fileCount };
      }));
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
      if (type !== "pdf" && type !== "docx" && type !== "mp3") return res.status(400).json({ message: "Tipo deve ser 'pdf', 'docx' ou 'mp3'" });
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
      if (type !== "pdf" && type !== "docx" && type !== "mp3") return res.status(400).json({ message: "Tipo deve ser 'pdf', 'docx' ou 'mp3'" });
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

  // ==================== SEED (only if empty) ====================
  app.all("/api/admin/seed", async (req, res) => {
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
    const migrateKey = req.headers["x-migrate-key"] || req.body?.migrateKey;
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

  // ─── Rotas de pagamento Stripe ──────────────────────────────────────────────
  registerStripeRoutes(app);
}

// Helper to get all progress (not in storage since it's a simple select-all)
async function db_getProgress() {
  const { db } = await import("./db");
  const { lessonProgress } = await import("@shared/schema");
  return db.select().from(lessonProgress);
}
