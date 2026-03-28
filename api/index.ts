import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { eq, and, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import ws from "ws";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// ─── Neon DB (lazy init) ───
neonConfig.webSocketConstructor = ws;

let _db: ReturnType<typeof drizzle> | null = null;
function getDb() {
  if (!_db) {
    const connStr = process.env.DATABASE_URL;
    if (!connStr) throw new Error("DATABASE_URL not configured");
    const pool = new Pool({ connectionString: connStr });
    _db = drizzle(pool);
  }
  return _db;
}

// ─── Schema (inline to avoid path alias issues) ───
const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  durationDays: integer("duration_days").notNull(),
  price: text("price"),
});

const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  password: text("password").notNull(),
  role: text("role").notNull().default("student"),
  planId: integer("plan_id"),
  approved: boolean("approved").notNull().default(false),
  accessExpiresAt: text("access_expires_at"),
  createdAt: text("created_at").notNull(),
  loginAttempts: integer("login_attempts").notNull().default(0),
  lockedUntil: text("locked_until"),
  // Granular access control
  communityAccess: boolean("community_access").notNull().default(true),
  supportAccess: boolean("support_access").notNull().default(true),
  supportExpiresAt: text("support_expires_at"),
  clinicalPracticeAccess: boolean("clinical_practice_access").notNull().default(true),
  clinicalPracticeHours: integer("clinical_practice_hours").notNull().default(0),
});

const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  imageUrl: text("image_url"),
});

const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url"),
  duration: text("duration"),
  order: integer("order").notNull().default(0),
});

const lessonProgress = pgTable("lesson_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: text("completed_at"),
});

const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull(),
  expiresAt: text("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: text("created_at").notNull(),
});

const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull(),
  adminName: text("admin_name").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: integer("target_id"),
  targetName: text("target_name"),
  details: text("details"),
  createdAt: text("created_at").notNull(),
});

// ─── Helpers ───
function json(res: VercelResponse, data: any, status = 200) {
  return res.status(status).json(data);
}

function sanitize(val: any): string {
  if (typeof val !== "string") return "";
  return val.trim().slice(0, 500);
}

// ─── JWT Auth Helpers ───
function authenticateRequest(req: VercelRequest): { userId: number; role: string } | null {
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

function requireAdmin(req: VercelRequest, res: VercelResponse): { userId: number; role: string } | null {
  const auth = authenticateRequest(req);
  if (!auth || (auth.role !== "admin" && auth.role !== "super_admin")) {
    json(res, { message: "Não autorizado" }, 401);
    return null;
  }
  return auth;
}

function requireSuperAdmin(req: VercelRequest, res: VercelResponse): { userId: number; role: string } | null {
  const auth = authenticateRequest(req);
  if (!auth || auth.role !== "super_admin") {
    json(res, { message: "Acesso restrito ao super admin" }, 403);
    return null;
  }
  return auth;
}

async function logAction(adminId: number, adminName: string, action: string, targetType?: string, targetId?: number, targetName?: string, details?: any) {
  try {
    await getDb().insert(auditLogs).values({
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

// ─── Handler ───
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;
  const url = typeof req.url === "string" ? req.url : "";
  const path = url.split("?")[0];

  try {
    // ── AUTH: Register ──
    if (path === "/api/auth/register" && method === "POST") {
      const { name, email, phone, password } = req.body;
      if (!name || !email || !phone || !password) {
        return json(res, { message: "Campos obrigatórios faltando" }, 400);
      }
      const [existing] = await getDb().select().from(users).where(eq(users.email, email.trim().toLowerCase()));
      if (existing) return json(res, { message: "Email já cadastrado" }, 400);
      const hashed = await bcrypt.hash(password, 10);
      const [user] = await getDb().insert(users).values({
        name: sanitize(name), email: email.trim().toLowerCase(), phone: sanitize(phone), password: hashed, planId: null, createdAt: new Date().toISOString(),
      }).returning();
      return json(res, { message: "Cadastro realizado! Aguarde a aprovação do administrador.", user: { id: user.id, name: user.name, email: user.email } });
    }

    // ── AUTH: Login ──
    if (path === "/api/auth/login" && method === "POST") {
      const { email, password } = req.body;
      if (!email || !password) return json(res, { message: "Email e senha obrigatórios" }, 400);
      const [user] = await getDb().select().from(users).where(eq(users.email, email.trim().toLowerCase()));
      if (!user) return json(res, { message: "Email ou senha incorretos" }, 401);

      if (user.lockedUntil) {
        const lockExpiry = new Date(user.lockedUntil);
        if (new Date() < lockExpiry) {
          const minutesLeft = Math.ceil((lockExpiry.getTime() - Date.now()) / 60000);
          return json(res, { message: `Conta bloqueada temporariamente. Tente novamente em ${minutesLeft} minuto(s).` }, 429);
        }
        await getDb().update(users).set({ loginAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));
        user.loginAttempts = 0;
        user.lockedUntil = null;
      }

      if ((user.loginAttempts || 0) >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await getDb().update(users).set({ lockedUntil: lockUntil }).where(eq(users.id, user.id));
        return json(res, { message: "Conta bloqueada temporariamente. Tente novamente em 15 minuto(s)." }, 429);
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        const newAttempts = (user.loginAttempts || 0) + 1;
        const updateData: any = { loginAttempts: newAttempts };
        if (newAttempts >= 5) {
          updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        }
        await getDb().update(users).set(updateData).where(eq(users.id, user.id));
        return json(res, { message: "Email ou senha incorretos" }, 401);
      }

      if ((user.loginAttempts || 0) > 0) {
        await getDb().update(users).set({ loginAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));
      }

      if (user.role === "student" && !user.approved) {
        return json(res, { message: "Sua conta ainda não foi aprovada. Aguarde o administrador." }, 403);
      }
      if (user.role === "student" && user.accessExpiresAt) {
        if (new Date() > new Date(user.accessExpiresAt)) {
          return json(res, { message: "Seu acesso expirou. Entre em contato com o administrador." }, 403);
        }
      }
      const { password: _, lockedUntil: _l, loginAttempts: _a, ...safeUser } = user;
      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

      if (user.role === "admin" || user.role === "super_admin") {
        await logAction(user.id, user.name, "admin_login");
      }

      return json(res, { user: safeUser, token });
    }

    // ── AUTH: Me ──
    if (path === "/api/auth/me" && method === "GET") {
      const auth = authenticateRequest(req);
      if (!auth) return json(res, { message: "Não autorizado" }, 401);
      const [user] = await getDb().select().from(users).where(eq(users.id, auth.userId));
      if (!user) return json(res, { message: "Usuário não encontrado" }, 404);
      const { password: _, ...safeUser } = user;
      return json(res, { user: safeUser });
    }

    // ── PLANS ──
    if (path === "/api/plans" && method === "GET") {
      const p = await getDb().select().from(plans);
      return json(res, p);
    }

    // ── ADMIN: Plans CRUD ──
    if (path === "/api/admin/plans" && method === "POST") {
      const auth = requireAdmin(req, res);
      if (!auth) return;
      const { name, description, durationDays, price } = req.body;
      if (!name || !durationDays) {
        return json(res, { message: "Nome e duração são obrigatórios" }, 400);
      }
      const [plan] = await getDb().insert(plans).values({ name: sanitize(name), description: description ? sanitize(description) : null, durationDays: parseInt(durationDays), price: price ? sanitize(price) : null }).returning();
      const [admin] = await getDb().select().from(users).where(eq(users.id, auth.userId));
      await logAction(auth.userId, admin?.name || "Admin", "plan_created", "plan", plan.id, plan.name);
      return json(res, plan);
    }

    const patchPlanMatch = path.match(/^\/api\/admin\/plans\/(\d+)$/);
    if (patchPlanMatch && method === "PATCH") {
      const auth = requireAdmin(req, res);
      if (!auth) return;
      const { name, description, durationDays, price } = req.body;
      const planUpdate: Record<string, any> = {};
      if (name !== undefined) planUpdate.name = sanitize(name);
      if (description !== undefined) planUpdate.description = description ? sanitize(description) : null;
      if (durationDays !== undefined) planUpdate.durationDays = parseInt(durationDays);
      if (price !== undefined) planUpdate.price = price ? sanitize(price) : null;
      const [updated] = await getDb().update(plans).set(planUpdate).where(eq(plans.id, parseInt(patchPlanMatch[1]))).returning();
      if (!updated) return json(res, { message: "Plano não encontrado" }, 404);
      const [admin] = await getDb().select().from(users).where(eq(users.id, auth.userId));
      await logAction(auth.userId, admin?.name || "Admin", "plan_updated", "plan", updated.id, updated.name, planUpdate);
      return json(res, updated);
    }

    const deletePlanMatch = path.match(/^\/api\/admin\/plans\/(\d+)$/);
    if (deletePlanMatch && method === "DELETE") {
      const auth = requireAdmin(req, res);
      if (!auth) return;
      const [plan] = await getDb().select().from(plans).where(eq(plans.id, parseInt(deletePlanMatch[1])));
      await getDb().delete(plans).where(eq(plans.id, parseInt(deletePlanMatch[1])));
      const [admin] = await getDb().select().from(users).where(eq(users.id, auth.userId));
      await logAction(auth.userId, admin?.name || "Admin", "plan_deleted", "plan", parseInt(deletePlanMatch[1]), plan?.name || "?");
      return json(res, { success: true });
    }

    // ── MODULES ──
    if (path === "/api/modules" && method === "GET") {
      const m = await getDb().select().from(modules).orderBy(modules.order);
      return json(res, m);
    }

    const moduleMatch = path.match(/^\/api\/modules\/(\d+)$/);
    if (moduleMatch && method === "GET") {
      const [mod] = await getDb().select().from(modules).where(eq(modules.id, parseInt(moduleMatch[1])));
      if (!mod) return json(res, { message: "Módulo não encontrado" }, 404);
      return json(res, mod);
    }

    // ── LESSONS ──
    if (path === "/api/lessons" && method === "GET") {
      const l = await getDb().select().from(lessons).orderBy(lessons.order);
      return json(res, l);
    }

    const moduleLessonsMatch = path.match(/^\/api\/modules\/(\d+)\/lessons$/);
    if (moduleLessonsMatch && method === "GET") {
      const l = await getDb().select().from(lessons).where(eq(lessons.moduleId, parseInt(moduleLessonsMatch[1]))).orderBy(lessons.order);
      return json(res, l);
    }

    const lessonMatch = path.match(/^\/api\/lessons\/(\d+)$/);
    if (lessonMatch && method === "GET") {
      const [lesson] = await getDb().select().from(lessons).where(eq(lessons.id, parseInt(lessonMatch[1])));
      if (!lesson) return json(res, { message: "Aula não encontrada" }, 404);
      return json(res, lesson);
    }

    // ── PROGRESS ──
    const progressMatch = path.match(/^\/api\/progress\/(\d+)$/);
    if (progressMatch && method === "GET") {
      const auth = authenticateRequest(req);
      if (!auth) return json(res, { message: "Não autorizado" }, 401);
      const targetUserId = parseInt(progressMatch[1]);
      if (auth.role === "student" && auth.userId !== targetUserId) {
        return json(res, { message: "Acesso negado" }, 403);
      }
      const progress = await getDb().select().from(lessonProgress).where(eq(lessonProgress.userId, targetUserId));
      return json(res, progress);
    }

    const completeMatch = path.match(/^\/api\/progress\/(\d+)\/lesson\/(\d+)\/complete$/);
    if (completeMatch && method === "POST") {
      const auth = authenticateRequest(req);
      if (!auth) return json(res, { message: "Não autorizado" }, 401);
      const userId = parseInt(completeMatch[1]);
      if (auth.role === "student" && auth.userId !== userId) {
        return json(res, { message: "Acesso negado" }, 403);
      }
      const lessonId = parseInt(completeMatch[2]);
      const [existing] = await getDb().select().from(lessonProgress).where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)));
      if (existing) {
        const [updated] = await getDb().update(lessonProgress).set({ completed: true, completedAt: new Date().toISOString() }).where(eq(lessonProgress.id, existing.id)).returning();
        return json(res, updated);
      }
      const [p] = await getDb().insert(lessonProgress).values({ userId, lessonId, completed: true, completedAt: new Date().toISOString() }).returning();
      return json(res, p);
    }

    const incompleteMatch = path.match(/^\/api\/progress\/(\d+)\/lesson\/(\d+)\/incomplete$/);
    if (incompleteMatch && method === "POST") {
      const auth = authenticateRequest(req);
      if (!auth) return json(res, { message: "Não autorizado" }, 401);
      const targetUserId = parseInt(incompleteMatch[1]);
      if (auth.role === "student" && auth.userId !== targetUserId) {
        return json(res, { message: "Acesso negado" }, 403);
      }
      await getDb().delete(lessonProgress).where(and(eq(lessonProgress.userId, targetUserId), eq(lessonProgress.lessonId, parseInt(incompleteMatch[2]))));
      return json(res, { success: true });
    }

    // ── ADMIN: Students ──
    if (path === "/api/admin/students" && method === "GET") {
      if (!requireAdmin(req, res)) return;
      const students = await getDb().select().from(users).where(eq(users.role, "student"));
      const safe = students.map(({ password, ...s }) => s);
      return json(res, safe);
    }

    if (path === "/api/admin/students/pending" && method === "GET") {
      if (!requireAdmin(req, res)) return;
      const pending = await getDb().select().from(users).where(and(eq(users.role, "student"), eq(users.approved, false)));
      const safe = pending.map(({ password, ...s }) => s);
      return json(res, safe);
    }

    if (path === "/api/admin/students/progress" && method === "GET") {
      if (!requireAdmin(req, res)) return;
      const allProgress = await getDb().select().from(lessonProgress);
      return json(res, allProgress);
    }

    const approveMatch = path.match(/^\/api\/admin\/students\/(\d+)\/approve$/);
    if (approveMatch && method === "POST") {
      const auth = requireAdmin(req, res);
      if (!auth) return;
      const id = parseInt(approveMatch[1]);
      const [user] = await getDb().select().from(users).where(eq(users.id, id));
      if (!user) return json(res, { message: "Aluno não encontrado" }, 404);
      const bodyPlanId = req.body?.planId ? parseInt(req.body.planId) : null;
      const effectivePlanId = bodyPlanId || user.planId;
      const [plan] = effectivePlanId ? await getDb().select().from(plans).where(eq(plans.id, effectivePlanId)) : [null];
      const days = plan ? plan.durationDays : 90;
      const expires = new Date();
      expires.setDate(expires.getDate() + days);
      const updateData: any = { approved: true, accessExpiresAt: expires.toISOString() };
      if (bodyPlanId) updateData.planId = bodyPlanId;
      const [updated] = await getDb().update(users).set(updateData).where(eq(users.id, id)).returning();
      const { password, ...safe } = updated;
      const [admin] = await getDb().select().from(users).where(eq(users.id, auth.userId));
      await logAction(auth.userId, admin?.name || "Admin", "student_approved", "student", id, user.name, { planId: effectivePlanId, planName: plan?.name });
      return json(res, safe);
    }

    const revokeMatch = path.match(/^\/api\/admin\/students\/(\d+)\/revoke$/);
    if (revokeMatch && method === "POST") {
      const auth = requireAdmin(req, res);
      if (!auth) return;
      const studentId = parseInt(revokeMatch[1]);
      const [student] = await getDb().select().from(users).where(eq(users.id, studentId));
      const [updated] = await getDb().update(users).set({ approved: false, accessExpiresAt: null }).where(eq(users.id, studentId)).returning();
      if (!updated) return json(res, { message: "Aluno não encontrado" }, 404);
      const { password, ...safe } = updated;
      const [admin] = await getDb().select().from(users).where(eq(users.id, auth.userId));
      await logAction(auth.userId, admin?.name || "Admin", "student_revoked", "student", studentId, student?.name || "?");
      return json(res, safe);
    }

    const deleteStudentMatch = path.match(/^\/api\/admin\/students\/(\d+)$/);
    if (deleteStudentMatch && method === "DELETE") {
      const auth = requireAdmin(req, res);
      if (!auth) return;
      const studentId = parseInt(deleteStudentMatch[1]);
      const [student] = await getDb().select().from(users).where(eq(users.id, studentId));
      await getDb().delete(users).where(eq(users.id, studentId));
      const [admin] = await getDb().select().from(users).where(eq(users.id, auth.userId));
      await logAction(auth.userId, admin?.name || "Admin", "student_deleted", "student", studentId, student?.name || "?");
      return json(res, { success: true });
    }

    const patchStudentMatch = path.match(/^\/api\/admin\/students\/(\d+)$/);
    if (patchStudentMatch && method === "PATCH") {
      const auth = requireAdmin(req, res);
      if (!auth) return;
      const allowedFields = ['name', 'email', 'phone', 'planId', 'approved', 'accessExpiresAt',
        'communityAccess', 'supportAccess', 'supportExpiresAt', 'clinicalPracticeAccess', 'clinicalPracticeHours'];
      const updateData: any = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          if (typeof req.body[key] === "string" && !['accessExpiresAt', 'supportExpiresAt', 'email'].includes(key)) {
            updateData[key] = sanitize(req.body[key]);
          } else {
            updateData[key] = req.body[key];
          }
        }
      }
      const [student] = await getDb().select().from(users).where(eq(users.id, parseInt(patchStudentMatch[1])));
      const [updated] = await getDb().update(users).set(updateData).where(eq(users.id, parseInt(patchStudentMatch[1]))).returning();
      if (!updated) return json(res, { message: "Aluno não encontrado" }, 404);
      const { password, ...safe } = updated;
      const [admin] = await getDb().select().from(users).where(eq(users.id, auth.userId));
      await logAction(auth.userId, admin?.name || "Admin", "student_updated", "student", parseInt(patchStudentMatch[1]), student?.name || "?", updateData);
      return json(res, safe);
    }

    // ── ADMIN: Reset Password ──
    const resetPasswordMatch = path.match(/^\/api\/admin\/students\/(\d+)\/reset-password$/);
    if (resetPasswordMatch && method === "POST") {
      const auth = requireAdmin(req, res);
      if (!auth) return;
      const id = parseInt(resetPasswordMatch[1]);
      const [user] = await getDb().select().from(users).where(eq(users.id, id));
      if (!user) return json(res, { message: "Aluno não encontrado" }, 404);
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await getDb().insert(passwordResets).values({ userId: user.id, token, expiresAt, createdAt: new Date().toISOString() });
      const [admin] = await getDb().select().from(users).where(eq(users.id, auth.userId));
      await logAction(auth.userId, admin?.name || "Admin", "password_reset", "student", user.id, user.name);
      return json(res, { token, link: `/reset-password/${token}` });
    }

    // ── AUTH: Validate Reset Token ──
    const validateResetMatch = path.match(/^\/api\/auth\/reset-password\/([a-f0-9-]+)$/);
    if (validateResetMatch && method === "GET") {
      const [pr] = await getDb().select().from(passwordResets).where(eq(passwordResets.token, validateResetMatch[1]));
      if (!pr || pr.used || new Date() > new Date(pr.expiresAt)) {
        return json(res, { message: "Token inválido ou expirado" }, 400);
      }
      return json(res, { valid: true });
    }

    // ── AUTH: Execute Reset Password ──
    const executeResetMatch = path.match(/^\/api\/auth\/reset-password\/([a-f0-9-]+)$/);
    if (executeResetMatch && method === "POST") {
      const { password } = req.body;
      if (!password || password.length < 6) {
        return json(res, { message: "Senha deve ter pelo menos 6 caracteres" }, 400);
      }
      const [pr] = await getDb().select().from(passwordResets).where(eq(passwordResets.token, executeResetMatch[1]));
      if (!pr || pr.used || new Date() > new Date(pr.expiresAt)) {
        return json(res, { message: "Token inválido ou expirado" }, 400);
      }
      const hashed = await bcrypt.hash(password, 10);
      await getDb().update(users).set({ password: hashed }).where(eq(users.id, pr.userId));
      await getDb().update(passwordResets).set({ used: true }).where(eq(passwordResets.id, pr.id));
      return json(res, { message: "Senha alterada com sucesso" });
    }

    // ── AUTH: Profile Update ──
    if (path === "/api/auth/profile" && method === "PATCH") {
      const auth = authenticateRequest(req);
      if (!auth) return json(res, { message: "Não autorizado" }, 401);
      const { currentPassword, name, email, phone, newPassword } = req.body;
      if (!currentPassword) {
        return json(res, { message: "Senha atual é obrigatória" }, 400);
      }
      const userId = auth.userId;
      const [user] = await getDb().select().from(users).where(eq(users.id, userId));
      if (!user) return json(res, { message: "Usuário não encontrado" }, 404);
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return json(res, { message: "Senha atual incorreta" }, 401);

      const updateData: any = {};
      if (name && name !== user.name) updateData.name = sanitize(name);
      if (phone !== undefined && phone !== user.phone) updateData.phone = sanitize(phone);
      if (email && email !== user.email) {
        const [existing] = await getDb().select().from(users).where(eq(users.email, email.trim().toLowerCase()));
        if (existing && existing.id !== user.id) {
          return json(res, { message: "Este email já está em uso" }, 400);
        }
        updateData.email = email.trim().toLowerCase();
      }
      if (newPassword) {
        if (newPassword.length < 6) {
          return json(res, { message: "Nova senha deve ter pelo menos 6 caracteres" }, 400);
        }
        updateData.password = await bcrypt.hash(newPassword, 10);
      }

      if (Object.keys(updateData).length === 0) {
        const { password: _, ...safeUser } = user;
        return json(res, { message: "Nenhuma alteração", user: safeUser });
      }

      const [updated] = await getDb().update(users).set(updateData).where(eq(users.id, userId)).returning();
      const { password: _, ...safeUser } = updated;
      return json(res, { message: "Perfil atualizado com sucesso", user: safeUser });
    }

    // ── ADMIN: Reorder Modules ──
    if (path === "/api/admin/modules/reorder" && method === "POST") {
      if (!requireAdmin(req, res)) return;
      const { orderedIds } = req.body;
      if (!orderedIds || !Array.isArray(orderedIds)) {
        return json(res, { message: "orderedIds array obrigatório" }, 400);
      }
      for (let i = 0; i < orderedIds.length; i++) {
        await getDb().update(modules).set({ order: i + 1 }).where(eq(modules.id, orderedIds[i]));
      }
      const updated = await getDb().select().from(modules).orderBy(modules.order);
      return json(res, updated);
    }

    // ── ADMIN: Reorder Lessons ──
    if (path === "/api/admin/lessons/reorder" && method === "POST") {
      if (!requireAdmin(req, res)) return;
      const { orderedIds } = req.body;
      if (!orderedIds || !Array.isArray(orderedIds)) {
        return json(res, { message: "orderedIds array obrigatório" }, 400);
      }
      for (let i = 0; i < orderedIds.length; i++) {
        await getDb().update(lessons).set({ order: i + 1 }).where(eq(lessons.id, orderedIds[i]));
      }
      const updated = await getDb().select().from(lessons).orderBy(lessons.order);
      return json(res, updated);
    }

    // ── ADMIN: Modules CRUD ──
    if (path === "/api/admin/modules" && method === "POST") {
      const auth = requireAdmin(req, res);
      if (!auth) return;
      const { title, description, order, imageUrl } = req.body;
      if (!title) return json(res, { message: "Título é obrigatório" }, 400);
      const [mod] = await getDb().insert(modules).values({ title: sanitize(title), description: description ? sanitize(description) : null, order: order || 0, imageUrl: imageUrl || null }).returning();
      const [admin] = await getDb().select().from(users).where(eq(users.id, auth.userId));
      await logAction(auth.userId, admin?.name || "Admin", "module_created", "module", mod.id, mod.title);
      return json(res, mod);
    }

    const patchModuleMatch = path.match(/^\/api\/admin\/modules\/(\d+)$/);
    if (patchModuleMatch && method === "PATCH") {
      const auth = requireAdmin(req, res);
      if (!auth) return;
      const { title, description, order, imageUrl } = req.body;
      const moduleUpdate: Record<string, any> = {};
      if (title !== undefined) moduleUpdate.title = sanitize(title);
      if (description !== undefined) moduleUpdate.description = description ? sanitize(description) : null;
      if (order !== undefined) moduleUpdate.order = order;
      if (imageUrl !== undefined) moduleUpdate.imageUrl = imageUrl;
      const [updated] = await getDb().update(modules).set(moduleUpdate).where(eq(modules.id, parseInt(patchModuleMatch[1]))).returning();
      if (!updated) return json(res, { message: "Módulo não encontrado" }, 404);
      const [admin] = await getDb().select().from(users).where(eq(users.id, auth.userId));
      await logAction(auth.userId, admin?.name || "Admin", "module_updated", "module", updated.id, updated.title, moduleUpdate);
      return json(res, updated);
    }

    const deleteModuleMatch = path.match(/^\/api\/admin\/modules\/(\d+)$/);
    if (deleteModuleMatch && method === "DELETE") {
      // Only super_admin can delete modules
      const auth = requireSuperAdmin(req, res);
      if (!auth) return;
      const [mod] = await getDb().select().from(modules).where(eq(modules.id, parseInt(deleteModuleMatch[1])));
      await getDb().delete(lessons).where(eq(lessons.moduleId, parseInt(deleteModuleMatch[1])));
      await getDb().delete(modules).where(eq(modules.id, parseInt(deleteModuleMatch[1])));
      const [admin] = await getDb().select().from(users).where(eq(users.id, auth.userId));
      await logAction(auth.userId, admin?.name || "Admin", "module_deleted", "module", parseInt(deleteModuleMatch[1]), mod?.title || "?");
      return json(res, { success: true });
    }

    // ── ADMIN: Lessons CRUD ──
    if (path === "/api/admin/lessons" && method === "POST") {
      const auth = requireAdmin(req, res);
      if (!auth) return;
      const { moduleId, title, description, videoUrl, duration, order } = req.body;
      if (!moduleId || !title) return json(res, { message: "moduleId e title são obrigatórios" }, 400);
      const [lesson] = await getDb().insert(lessons).values({ moduleId, title: sanitize(title), description: description ? sanitize(description) : null, videoUrl: videoUrl || null, duration: duration || null, order: order || 0 }).returning();
      const [admin] = await getDb().select().from(users).where(eq(users.id, auth.userId));
      await logAction(auth.userId, admin?.name || "Admin", "lesson_created", "lesson", lesson.id, lesson.title);
      return json(res, lesson);
    }

    const patchLessonMatch = path.match(/^\/api\/admin\/lessons\/(\d+)$/);
    if (patchLessonMatch && method === "PATCH") {
      const auth = requireAdmin(req, res);
      if (!auth) return;
      const { moduleId, title, description, videoUrl, duration, order } = req.body;
      const lessonUpdate: Record<string, any> = {};
      if (moduleId !== undefined) lessonUpdate.moduleId = moduleId;
      if (title !== undefined) lessonUpdate.title = sanitize(title);
      if (description !== undefined) lessonUpdate.description = description ? sanitize(description) : null;
      if (videoUrl !== undefined) lessonUpdate.videoUrl = videoUrl;
      if (duration !== undefined) lessonUpdate.duration = duration;
      if (order !== undefined) lessonUpdate.order = order;
      const [updated] = await getDb().update(lessons).set(lessonUpdate).where(eq(lessons.id, parseInt(patchLessonMatch[1]))).returning();
      if (!updated) return json(res, { message: "Aula não encontrada" }, 404);
      const [admin] = await getDb().select().from(users).where(eq(users.id, auth.userId));
      await logAction(auth.userId, admin?.name || "Admin", "lesson_updated", "lesson", updated.id, updated.title, lessonUpdate);
      return json(res, updated);
    }

    const deleteLessonMatch = path.match(/^\/api\/admin\/lessons\/(\d+)$/);
    if (deleteLessonMatch && method === "DELETE") {
      // Only super_admin can delete lessons
      const auth = requireSuperAdmin(req, res);
      if (!auth) return;
      const [lesson] = await getDb().select().from(lessons).where(eq(lessons.id, parseInt(deleteLessonMatch[1])));
      await getDb().delete(lessons).where(eq(lessons.id, parseInt(deleteLessonMatch[1])));
      const [admin] = await getDb().select().from(users).where(eq(users.id, auth.userId));
      await logAction(auth.userId, admin?.name || "Admin", "lesson_deleted", "lesson", parseInt(deleteLessonMatch[1]), lesson?.title || "?");
      return json(res, { success: true });
    }

    // ── ADMIN: Admin Management (super_admin only) ──
    if (path === "/api/admin/admins" && method === "GET") {
      const auth = requireSuperAdmin(req, res);
      if (!auth) return;
      const allUsers = await getDb().select().from(users);
      const admins = allUsers.filter(u => u.role === "admin" || u.role === "super_admin");
      const safe = admins.map(({ password, ...s }) => s);
      return json(res, safe);
    }

    if (path === "/api/admin/admins" && method === "POST") {
      const auth = requireSuperAdmin(req, res);
      if (!auth) return;
      const { name, email, password, phone } = req.body;
      if (!name || !email || !password) {
        return json(res, { message: "Nome, email e senha são obrigatórios" }, 400);
      }
      if (password.length < 6) {
        return json(res, { message: "Senha deve ter pelo menos 6 caracteres" }, 400);
      }
      const [existing] = await getDb().select().from(users).where(eq(users.email, email.trim().toLowerCase()));
      if (existing) return json(res, { message: "Email já cadastrado" }, 400);
      const hashed = await bcrypt.hash(password, 10);
      const [newAdmin] = await getDb().insert(users).values({
        name: sanitize(name), email: email.trim().toLowerCase(), phone: phone ? sanitize(phone) : null,
        password: hashed, planId: null, role: "admin", approved: true, createdAt: new Date().toISOString(),
      }).returning();
      const { password: _, ...safe } = newAdmin;
      const [superAdmin] = await getDb().select().from(users).where(eq(users.id, auth.userId));
      await logAction(auth.userId, superAdmin?.name || "Super Admin", "admin_created", "admin", newAdmin.id, newAdmin.name);
      return json(res, safe);
    }

    const deleteAdminMatch = path.match(/^\/api\/admin\/admins\/(\d+)$/);
    if (deleteAdminMatch && method === "DELETE") {
      const auth = requireSuperAdmin(req, res);
      if (!auth) return;
      const targetId = parseInt(deleteAdminMatch[1]);
      if (targetId === auth.userId) {
        return json(res, { message: "Não é possível excluir a própria conta" }, 400);
      }
      const [target] = await getDb().select().from(users).where(eq(users.id, targetId));
      if (!target || target.role === "super_admin") {
        return json(res, { message: "Não é possível excluir este usuário" }, 400);
      }
      await getDb().delete(users).where(eq(users.id, targetId));
      const [superAdmin] = await getDb().select().from(users).where(eq(users.id, auth.userId));
      await logAction(auth.userId, superAdmin?.name || "Super Admin", "admin_deleted", "admin", targetId, target.name);
      return json(res, { success: true });
    }

    // ── ADMIN: Audit Logs ──
    if (path === "/api/admin/audit-logs" && method === "GET") {
      const auth = requireAdmin(req, res);
      if (!auth) return;
      if (auth.role === "admin") {
        // Secondary admins only see their own logs
        const logs = await getDb().select().from(auditLogs).where(eq(auditLogs.adminId, auth.userId)).orderBy(desc(auditLogs.createdAt)).limit(200);
        return json(res, logs);
      }
      // Super admin sees all, with optional filters
      const adminIdFilter = req.query?.adminId ? parseInt(req.query.adminId as string) : undefined;
      let query = getDb().select().from(auditLogs);
      if (adminIdFilter) {
        query = query.where(eq(auditLogs.adminId, adminIdFilter)) as any;
      }
      const logs = await (query as any).orderBy(desc(auditLogs.createdAt)).limit(200);
      return json(res, logs);
    }

    // ── SEED ──
    if (path === "/api/admin/seed") {
      if (!requireAdmin(req, res)) return;
      const existingPlans = await getDb().select().from(plans);
      if (existingPlans.length > 0) {
        return json(res, { message: "Banco já possui dados" });
      }

      await getDb().insert(plans).values([
        { name: "Online", description: "Mentoria online com acesso às aulas gravadas", durationDays: 90, price: "R$ 7.430" },
        { name: "Presencial", description: "Mentoria presencial + acesso às aulas gravadas", durationDays: 180, price: "R$ 12.390" },
        { name: "Completo", description: "Mentoria completa: online + presencial + acesso total", durationDays: 365, price: "R$ 17.350" },
      ]);

      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        return json(res, { message: "ADMIN_PASSWORD environment variable is required for seeding" }, 500);
      }
      const hashed = await bcrypt.hash(adminPassword, 10);
      const [admin] = await getDb().insert(users).values({
        name: "Dr. Gustavo Martins",
        email: "admin@amplafacial.com",
        password: hashed,
        planId: null,
        role: "super_admin",
        approved: true,
        createdAt: new Date().toISOString(),
      }).returning();

      await getDb().insert(modules).values([
        { title: "Fundamentos", description: "Introdução à Harmonização Orofacial", order: 1 },
        { title: "Toxina Botulínica", description: "Técnicas e protocolos de aplicação", order: 2 },
        { title: "Preenchedores à Base de Ácido Hialurônico", description: "Preenchimentos e volumização", order: 3 },
        { title: "Método NaturalUp®", description: "O protocolo integrado completo", order: 4 },
      ]);

      const allModules = await getDb().select().from(modules);
      const mod1 = allModules.find(m => m.order === 1);
      const mod2 = allModules.find(m => m.order === 2);
      const mod3 = allModules.find(m => m.order === 3);
      const mod4 = allModules.find(m => m.order === 4);

      await getDb().insert(lessons).values([
        { moduleId: mod1!.id, title: "Boas-vindas à Mentoria", description: "Apresentação do programa e metodologia", videoUrl: "", duration: "12:00", order: 1 },
        { moduleId: mod1!.id, title: "Anatomia Facial Aplicada", description: "Revisão anatômica para procedimentos", videoUrl: "", duration: "45:00", order: 2 },
        { moduleId: mod2!.id, title: "Mecanismo de Ação", description: "Como a toxina botulínica funciona", videoUrl: "", duration: "25:00", order: 1 },
        { moduleId: mod3!.id, title: "Tipos de Ácido Hialurônico", description: "Classificação e indicações", videoUrl: "", duration: "35:00", order: 1 },
        { moduleId: mod4!.id, title: "Visão Integrada NaturalUp®", description: "Como combinar todas as técnicas", videoUrl: "", duration: "60:00", order: 1 },
      ]);

      return json(res, { message: "Banco populado com sucesso!" });
    }

    // ── MIGRATE ──
    if (path === "/api/admin/migrate" && method === "POST") {
      const migrateKey = req.headers["x-migrate-key"] || req.body?.migrateKey;
      const auth = authenticateRequest(req);
      const expectedKey = process.env.MIGRATE_KEY;
      if (!migrateKey && (!auth || (auth.role !== "admin" && auth.role !== "super_admin"))) {
        return json(res, { message: "Não autorizado" }, 401);
      }
      if (migrateKey && (!expectedKey || migrateKey !== expectedKey)) {
        return json(res, { message: "Chave inválida" }, 401);
      }
      const results: string[] = [];
      try {
        await getDb().execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`);
        results.push("phone column ensured");
      } catch (e: any) { results.push(`phone: ${e.message}`); }
      try {
        await getDb().execute(`CREATE TABLE IF NOT EXISTS password_resets (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, token TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, used BOOLEAN NOT NULL DEFAULT false, created_at TEXT NOT NULL)`);
        results.push("password_resets table ensured");
      } catch (e: any) { results.push(`password_resets: ${e.message}`); }
      try {
        await getDb().execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0`);
        results.push("login_attempts column ensured");
      } catch (e: any) { results.push(`login_attempts: ${e.message}`); }
      try {
        await getDb().execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TEXT`);
        results.push("locked_until column ensured");
      } catch (e: any) { results.push(`locked_until: ${e.message}`); }
      // Granular access control columns
      try {
        await getDb().execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS community_access BOOLEAN NOT NULL DEFAULT true`);
        results.push("community_access column ensured");
      } catch (e: any) { results.push(`community_access: ${e.message}`); }
      try {
        await getDb().execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS support_access BOOLEAN NOT NULL DEFAULT true`);
        results.push("support_access column ensured");
      } catch (e: any) { results.push(`support_access: ${e.message}`); }
      try {
        await getDb().execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS support_expires_at TEXT`);
        results.push("support_expires_at column ensured");
      } catch (e: any) { results.push(`support_expires_at: ${e.message}`); }
      try {
        await getDb().execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS clinical_practice_access BOOLEAN NOT NULL DEFAULT true`);
        results.push("clinical_practice_access column ensured");
      } catch (e: any) { results.push(`clinical_practice_access: ${e.message}`); }
      try {
        await getDb().execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS clinical_practice_hours INTEGER NOT NULL DEFAULT 0`);
        results.push("clinical_practice_hours column ensured");
      } catch (e: any) { results.push(`clinical_practice_hours: ${e.message}`); }
      // Audit logs table
      try {
        await getDb().execute(`CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, admin_id INTEGER NOT NULL, admin_name TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT, target_id INTEGER, target_name TEXT, details TEXT, created_at TEXT NOT NULL)`);
        results.push("audit_logs table ensured");
      } catch (e: any) { results.push(`audit_logs: ${e.message}`); }
      // Add role column (MUST come before any role-based UPDATE statements)
      try {
        await getDb().execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student'`);
        results.push("role column ensured");
      } catch (e: any) { results.push(`role: ${e.message}`); }
      // Set the known super_admin by email
      try {
        await getDb().execute(`UPDATE users SET role = 'super_admin' WHERE email = 'gustavo.m.martins@outlook.com'`);
        results.push("email-based super_admin ensured");
      } catch (e: any) { results.push(`email_super_admin: ${e.message}`); }
      // Upgrade existing admin(s) to super_admin — multiple strategies
      try {
        // Strategy 1: Upgrade users with role = 'admin'
        const r1 = await getDb().execute(`UPDATE users SET role = 'super_admin' WHERE role = 'admin'`);
        results.push("strategy1: upgraded role='admin' users");
      } catch (e: any) { results.push(`strategy1: ${e.message}`); }
      try {
        // Strategy 2: Ensure the first user (id=1) is super_admin if they are not a student
        const r2 = await getDb().execute(`UPDATE users SET role = 'super_admin' WHERE id = 1 AND role != 'student'`);
        results.push("strategy2: ensured first user is super_admin");
      } catch (e: any) { results.push(`strategy2: ${e.message}`); }
      try {
        // Strategy 3: If no super_admin exists at all, promote the first non-student user
        const checkResult = await getDb().execute(`SELECT COUNT(*) as cnt FROM users WHERE role = 'super_admin'`);
        const rows = Array.isArray(checkResult) ? checkResult : (checkResult as any).rows || [];
        const firstRow = rows[0] || {};
        const count = Number(firstRow.cnt || firstRow.count || 0);
        if (count === 0) {
          await getDb().execute(`UPDATE users SET role = 'super_admin' WHERE id = (SELECT MIN(id) FROM users WHERE role != 'student') AND role != 'student'`);
          results.push("strategy3: promoted first non-student to super_admin (no super_admin existed)");
        } else {
          results.push(`strategy3: skipped (${count} super_admin(s) already exist)`);
        }
      } catch (e: any) { results.push(`strategy3: ${e.message}`); }
      // Report current admin roles for debugging
      try {
        const adminResult = await getDb().execute(`SELECT id, name, email, role FROM users WHERE role IN ('admin', 'super_admin')`);
        const adminRows = Array.isArray(adminResult) ? adminResult : (adminResult as any).rows || [];
        results.push(`current_admins: ${JSON.stringify(adminRows)}`);
      } catch (e: any) { results.push(`admin_check: ${e.message}`); }
      return json(res, { message: "Migração concluída", results });
    }

    // ── Not found ──
    return json(res, { message: "Rota não encontrada" }, 404);

  } catch (error: any) {
    console.error("API Error:", error?.message || error);
    return json(res, { message: "Erro interno do servidor" }, 500);
  }
}
