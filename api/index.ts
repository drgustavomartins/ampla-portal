import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import ws from "ws";

const JWT_SECRET = process.env.JWT_SECRET || "ampla-facial-dev-secret-2026";

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
  password: text("password").notNull(),
  role: text("role").notNull().default("student"),
  planId: integer("plan_id"),
  approved: boolean("approved").notNull().default(false),
  accessExpiresAt: text("access_expires_at"),
  createdAt: text("created_at").notNull(),
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

// ─── Helper ───
function json(res: VercelResponse, data: any, status = 200) {
  return res.status(status).json(data);
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

function requireAdmin(req: VercelRequest, res: VercelResponse): boolean {
  const auth = authenticateRequest(req);
  if (!auth || auth.role !== "admin") {
    json(res, { message: "Não autorizado" }, 401);
    return false;
  }
  return true;
}

// ─── Handler ───
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;
  const url = typeof req.url === "string" ? req.url : "";
  // Strip query string for matching
  const path = url.split("?")[0];

  try {
    // ── AUTH: Register ──
    if (path === "/api/auth/register" && method === "POST") {
      const { name, email, password, planId } = req.body;
      if (!name || !email || !password || !planId) {
        return json(res, { message: "Campos obrigatórios faltando" }, 400);
      }
      const [existing] = await getDb().select().from(users).where(eq(users.email, email));
      if (existing) return json(res, { message: "Email já cadastrado" }, 400);
      const [plan] = await getDb().select().from(plans).where(eq(plans.id, planId));
      if (!plan) return json(res, { message: "Plano inválido" }, 400);
      const hashed = await bcrypt.hash(password, 10);
      const [user] = await getDb().insert(users).values({
        name, email, password: hashed, planId, createdAt: new Date().toISOString(),
      }).returning();
      return json(res, { message: "Cadastro realizado! Aguarde a aprovação do administrador.", user: { id: user.id, name: user.name, email: user.email } });
    }

    // ── AUTH: Login ──
    if (path === "/api/auth/login" && method === "POST") {
      const { email, password } = req.body;
      if (!email || !password) return json(res, { message: "Email e senha obrigatórios" }, 400);
      const [user] = await getDb().select().from(users).where(eq(users.email, email));
      if (!user) return json(res, { message: "Email ou senha incorretos" }, 401);
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return json(res, { message: "Email ou senha incorretos" }, 401);
      if (user.role === "student" && !user.approved) {
        return json(res, { message: "Sua conta ainda não foi aprovada. Aguarde o administrador." }, 403);
      }
      if (user.role === "student" && user.accessExpiresAt) {
        if (new Date() > new Date(user.accessExpiresAt)) {
          return json(res, { message: "Seu acesso expirou. Entre em contato com o administrador." }, 403);
        }
      }
      const { password: _, ...safeUser } = user;
      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
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
      if (!requireAdmin(req, res)) return;
      const { name, description, durationDays, price } = req.body;
      if (!name || !durationDays) {
        return json(res, { message: "Nome e duração são obrigatórios" }, 400);
      }
      const [plan] = await getDb().insert(plans).values({ name, description: description || null, durationDays, price: price || null }).returning();
      return json(res, plan);
    }

    const patchPlanMatch = path.match(/^\/api\/admin\/plans\/(\d+)$/);
    if (patchPlanMatch && method === "PATCH") {
      if (!requireAdmin(req, res)) return;
      const [updated] = await getDb().update(plans).set(req.body).where(eq(plans.id, parseInt(patchPlanMatch[1]))).returning();
      if (!updated) return json(res, { message: "Plano não encontrado" }, 404);
      return json(res, updated);
    }

    const deletePlanMatch = path.match(/^\/api\/admin\/plans\/(\d+)$/);
    if (deletePlanMatch && method === "DELETE") {
      if (!requireAdmin(req, res)) return;
      await getDb().delete(plans).where(eq(plans.id, parseInt(deletePlanMatch[1])));
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
      const progress = await getDb().select().from(lessonProgress).where(eq(lessonProgress.userId, parseInt(progressMatch[1])));
      return json(res, progress);
    }

    const completeMatch = path.match(/^\/api\/progress\/(\d+)\/lesson\/(\d+)\/complete$/);
    if (completeMatch && method === "POST") {
      const userId = parseInt(completeMatch[1]);
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
      await getDb().delete(lessonProgress).where(and(eq(lessonProgress.userId, parseInt(incompleteMatch[1])), eq(lessonProgress.lessonId, parseInt(incompleteMatch[2]))));
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

    const approveMatch = path.match(/^\/api\/admin\/students\/(\d+)\/approve$/);
    if (approveMatch && method === "POST") {
      if (!requireAdmin(req, res)) return;
      const id = parseInt(approveMatch[1]);
      const [user] = await getDb().select().from(users).where(eq(users.id, id));
      if (!user) return json(res, { message: "Aluno não encontrado" }, 404);
      const [plan] = user.planId ? await getDb().select().from(plans).where(eq(plans.id, user.planId)) : [null];
      const days = plan ? plan.durationDays : 90;
      const expires = new Date();
      expires.setDate(expires.getDate() + days);
      const [updated] = await getDb().update(users).set({ approved: true, accessExpiresAt: expires.toISOString() }).where(eq(users.id, id)).returning();
      const { password, ...safe } = updated;
      return json(res, safe);
    }

    const revokeMatch = path.match(/^\/api\/admin\/students\/(\d+)\/revoke$/);
    if (revokeMatch && method === "POST") {
      if (!requireAdmin(req, res)) return;
      const [updated] = await getDb().update(users).set({ approved: false, accessExpiresAt: null }).where(eq(users.id, parseInt(revokeMatch[1]))).returning();
      if (!updated) return json(res, { message: "Aluno não encontrado" }, 404);
      const { password, ...safe } = updated;
      return json(res, safe);
    }

    const deleteStudentMatch = path.match(/^\/api\/admin\/students\/(\d+)$/);
    if (deleteStudentMatch && method === "DELETE") {
      if (!requireAdmin(req, res)) return;
      await getDb().delete(users).where(eq(users.id, parseInt(deleteStudentMatch[1])));
      return json(res, { success: true });
    }

    const patchStudentMatch = path.match(/^\/api\/admin\/students\/(\d+)$/);
    if (patchStudentMatch && method === "PATCH") {
      if (!requireAdmin(req, res)) return;
      const [updated] = await getDb().update(users).set(req.body).where(eq(users.id, parseInt(patchStudentMatch[1]))).returning();
      if (!updated) return json(res, { message: "Aluno não encontrado" }, 404);
      const { password, ...safe } = updated;
      return json(res, safe);
    }

    // ── ADMIN: Reset Password ──
    const resetPasswordMatch = path.match(/^\/api\/admin\/students\/(\d+)\/reset-password$/);
    if (resetPasswordMatch && method === "POST") {
      if (!requireAdmin(req, res)) return;
      const id = parseInt(resetPasswordMatch[1]);
      const [user] = await getDb().select().from(users).where(eq(users.id, id));
      if (!user) return json(res, { message: "Aluno não encontrado" }, 404);
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await getDb().insert(passwordResets).values({ userId: user.id, token, expiresAt, createdAt: new Date().toISOString() });
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
      const { userId, currentPassword, name, email, newPassword } = req.body;
      if (!userId || !currentPassword) {
        return json(res, { message: "userId e senha atual são obrigatórios" }, 400);
      }
      const [user] = await getDb().select().from(users).where(eq(users.id, userId));
      if (!user) return json(res, { message: "Usuário não encontrado" }, 404);
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return json(res, { message: "Senha atual incorreta" }, 401);

      const updateData: any = {};
      if (name && name !== user.name) updateData.name = name;
      if (email && email !== user.email) {
        const [existing] = await getDb().select().from(users).where(eq(users.email, email));
        if (existing && existing.id !== user.id) {
          return json(res, { message: "Este email já está em uso" }, 400);
        }
        updateData.email = email;
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

    // ── ADMIN: Student Progress (all students) ──
    if (path === "/api/admin/students/progress" && method === "GET") {
      if (!requireAdmin(req, res)) return;
      const allProgress = await getDb().select().from(lessonProgress);
      return json(res, allProgress);
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

    // ── ADMIN: Modules ──
    if (path === "/api/admin/modules" && method === "POST") {
      if (!requireAdmin(req, res)) return;
      const [mod] = await getDb().insert(modules).values(req.body).returning();
      return json(res, mod);
    }

    const patchModuleMatch = path.match(/^\/api\/admin\/modules\/(\d+)$/);
    if (patchModuleMatch && method === "PATCH") {
      if (!requireAdmin(req, res)) return;
      const [updated] = await getDb().update(modules).set(req.body).where(eq(modules.id, parseInt(patchModuleMatch[1]))).returning();
      if (!updated) return json(res, { message: "Módulo não encontrado" }, 404);
      return json(res, updated);
    }

    const deleteModuleMatch = path.match(/^\/api\/admin\/modules\/(\d+)$/);
    if (deleteModuleMatch && method === "DELETE") {
      if (!requireAdmin(req, res)) return;
      await getDb().delete(lessons).where(eq(lessons.moduleId, parseInt(deleteModuleMatch[1])));
      await getDb().delete(modules).where(eq(modules.id, parseInt(deleteModuleMatch[1])));
      return json(res, { success: true });
    }

    // ── ADMIN: Lessons ──
    if (path === "/api/admin/lessons" && method === "POST") {
      if (!requireAdmin(req, res)) return;
      const [lesson] = await getDb().insert(lessons).values(req.body).returning();
      return json(res, lesson);
    }

    const patchLessonMatch = path.match(/^\/api\/admin\/lessons\/(\d+)$/);
    if (patchLessonMatch && method === "PATCH") {
      if (!requireAdmin(req, res)) return;
      const [updated] = await getDb().update(lessons).set(req.body).where(eq(lessons.id, parseInt(patchLessonMatch[1]))).returning();
      if (!updated) return json(res, { message: "Aula não encontrada" }, 404);
      return json(res, updated);
    }

    const deleteLessonMatch = path.match(/^\/api\/admin\/lessons\/(\d+)$/);
    if (deleteLessonMatch && method === "DELETE") {
      if (!requireAdmin(req, res)) return;
      await getDb().delete(lessons).where(eq(lessons.id, parseInt(deleteLessonMatch[1])));
      return json(res, { success: true });
    }

    // ── SEED ──
    if (path === "/api/admin/seed") {
      const existingPlans = await getDb().select().from(plans);
      if (existingPlans.length > 0) {
        return json(res, { message: "Banco já possui dados" });
      }

      await getDb().insert(plans).values([
        { name: "Online", description: "Mentoria online com acesso às aulas gravadas", durationDays: 90, price: "R$ 7.430" },
        { name: "Presencial", description: "Mentoria presencial + acesso às aulas gravadas", durationDays: 180, price: "R$ 12.390" },
        { name: "Completo", description: "Mentoria completa: online + presencial + acesso total", durationDays: 365, price: "R$ 17.350" },
      ]);

      // IMPORTANTE: troque ADMIN_PASSWORD em produção!
      const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 10);
      const [admin] = await getDb().insert(users).values({
        name: "Dr. Gustavo Martins",
        email: "admin@amplafacial.com",
        password: hashed,
        planId: null,
        role: "admin",
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

    // ── Not found ──
    return json(res, { message: "Rota não encontrada" }, 404);

  } catch (error: any) {
    console.error("API Error:", error);
    return json(res, { message: error.message || "Erro interno do servidor" }, 500);
  }
}
