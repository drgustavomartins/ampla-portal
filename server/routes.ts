import type { Express, Request, Response } from "express";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { sql } from "drizzle-orm";
import { storage } from "./storage";
import { registerSchema, loginSchema, insertModuleSchema, insertLessonSchema } from "@shared/schema";

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
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
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
    console.log("[auto-migrate] material_topics and order columns ensured on plans table");
  } catch (e: any) {
    console.error("[auto-migrate] Failed to ensure plans columns:", e.message);
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
      return res.json({ message: "Cadastro realizado! Aguarde a aprovação do administrador.", user: { id: user.id, name: user.name, email: user.email } });
    } catch (e: any) {
      return res.status(400).json({ message: e.message || "Erro no cadastro" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
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

      const { password, lockedUntil: _l, loginAttempts: _a, ...safeUser } = user;
      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

      // Log admin login
      if (user.role === "admin" || user.role === "super_admin") {
        await logAction(user.id, user.name, "admin_login");
      }

      return res.json({ user: safeUser, token });
    } catch (e: any) {
      return res.status(400).json({ message: e.message || "Erro no login" });
    }
  });

  // ==================== AUTH: Me ====================
  app.get("/api/auth/me", async (req, res) => {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    const user = await storage.getUser(auth.userId);
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
    const { password, loginAttempts, lockedUntil, ...safeUser } = user;
    res.json({ user: safeUser });
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
    const user = await storage.getUser(auth.userId);
    if (!user || !user.planId) {
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
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ message: "Não autorizado" });
    // Admins see all material topics
    if (auth.role === "admin" || auth.role === "super_admin") {
      return res.json({ accessAll: true, topics: [] });
    }
    const user = await storage.getUser(auth.userId);
    if (!user || !user.planId) {
      return res.json({ accessAll: false, topics: [] });
    }
    const plan = await storage.getPlan(user.planId);
    if (!plan || !plan.materialTopics) {
      // No materialTopics set = no access to materials (inverse of modules logic)
      return res.json({ accessAll: false, topics: [] });
    }
    try {
      const topics: string[] = JSON.parse(plan.materialTopics);
      return res.json({ accessAll: false, topics });
    } catch {
      return res.json({ accessAll: false, topics: [] });
    }
  });

  // ==================== LESSONS ====================
  app.get("/api/lessons", async (_req, res) => {
    const l = await storage.getLessons();
    res.json(l);
  });

  app.get("/api/modules/:id/lessons", async (req, res) => {
    const l = await storage.getLessonsByModule(parseInt(req.params.id));
    res.json(l);
  });

  app.get("/api/lessons/:id", async (req, res) => {
    const lesson = await storage.getLesson(parseInt(req.params.id));
    if (!lesson) return res.status(404).json({ message: "Aula não encontrada" });
    res.json(lesson);
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
      'communityAccess', 'supportAccess', 'supportExpiresAt', 'clinicalPracticeAccess', 'clinicalPracticeHours'];
    const updateData: any = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        // Sanitize string values
        if (typeof req.body[key] === "string" && !['accessExpiresAt', 'supportExpiresAt', 'email'].includes(key)) {
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
    const auth = authenticateRequest(req);
    const expectedKey = process.env.MIGRATE_KEY;
    if (!migrateKey && (!auth || (auth.role !== "admin" && auth.role !== "super_admin"))) {
      return res.status(401).json({ message: "Não autorizado" });
    }
    if (migrateKey && (!expectedKey || migrateKey !== expectedKey)) {
      return res.status(401).json({ message: "Chave inválida" });
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
    // Set the known super_admin by email
    try {
      await db.execute(`UPDATE users SET role = 'super_admin' WHERE email = 'gustavo.m.martins@outlook.com'`);
      results.push("email-based super_admin ensured");
    } catch (e: any) { results.push(`email_super_admin: ${e.message}`); }
    // Upgrade existing admin(s) to super_admin — multiple strategies
    try {
      await db.execute(`UPDATE users SET role = 'super_admin' WHERE role = 'admin'`);
      results.push("strategy1: upgraded role='admin' users");
    } catch (e: any) { results.push(`strategy1: ${e.message}`); }
    try {
      await db.execute(`UPDATE users SET role = 'super_admin' WHERE id = 1 AND role != 'student'`);
      results.push("strategy2: ensured first user is super_admin");
    } catch (e: any) { results.push(`strategy2: ${e.message}`); }
    try {
      const checkResult = await db.execute(`SELECT COUNT(*) as cnt FROM users WHERE role = 'super_admin'`);
      const rows = Array.isArray(checkResult) ? checkResult : (checkResult as any).rows || [];
      const firstRow = rows[0] || {};
      const count = Number(firstRow.cnt || firstRow.count || 0);
      if (count === 0) {
        await db.execute(`UPDATE users SET role = 'super_admin' WHERE id = (SELECT MIN(id) FROM users WHERE role != 'student') AND role != 'student'`);
        results.push("strategy3: promoted first non-student to super_admin (no super_admin existed)");
      } else {
        results.push(`strategy3: skipped (${count} super_admin(s) already exist)`);
      }
    } catch (e: any) { results.push(`strategy3: ${e.message}`); }
    try {
      const adminResult = await db.execute(`SELECT id, name, email, role FROM users WHERE role IN ('admin', 'super_admin')`);
      const adminRows = Array.isArray(adminResult) ? adminResult : (adminResult as any).rows || [];
      results.push(`current_admins: ${JSON.stringify(adminRows)}`);
    } catch (e: any) { results.push(`admin_check: ${e.message}`); }
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

    return res.json({ message: "Migração concluída", results });
  });
}

// Helper to get all progress (not in storage since it's a simple select-all)
async function db_getProgress() {
  const { db } = await import("./db");
  const { lessonProgress } = await import("@shared/schema");
  return db.select().from(lessonProgress);
}
