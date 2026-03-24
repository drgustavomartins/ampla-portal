import type { Express, Request, Response } from "express";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { registerSchema, loginSchema, insertModuleSchema, insertLessonSchema } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "ampla-facial-dev-secret-2026";

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

function requireAdmin(req: Request, res: Response): boolean {
  const auth = authenticateRequest(req);
  if (!auth || auth.role !== "admin") {
    res.status(401).json({ message: "Não autorizado" });
    return false;
  }
  return true;
}

export function registerRoutes(server: Server, app: Express) {
  // ==================== AUTH ====================

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({
        name: data.name,
        email: data.email,
        phone: data.phone,
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
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }
      const validPassword = await bcrypt.compare(data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }
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
      const { password, ...safeUser } = user;
      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
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
    const { password, ...safeUser } = user;
    res.json({ user: safeUser });
  });

  // ==================== PLANS ====================
  app.get("/api/plans", async (_req, res) => {
    const p = await storage.getPlans();
    res.json(p);
  });

  // ==================== ADMIN: Plans CRUD ====================
  app.post("/api/admin/plans", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { name, description, durationDays, price } = req.body;
      if (!name || !durationDays) {
        return res.status(400).json({ message: "Nome e duração são obrigatórios" });
      }
      const plan = await storage.createPlan({ name, description: description || null, durationDays, price: price || null });
      res.json(plan);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/plans/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const updated = await storage.updatePlan(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Plano não encontrado" });
    res.json(updated);
  });

  app.delete("/api/admin/plans/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const ok = await storage.deletePlan(parseInt(req.params.id));
    res.json({ success: ok });
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
    const progress = await storage.getProgress(parseInt(req.params.userId));
    res.json(progress);
  });

  app.post("/api/progress/:userId/lesson/:lessonId/complete", async (req, res) => {
    const p = await storage.markLessonComplete(parseInt(req.params.userId), parseInt(req.params.lessonId));
    res.json(p);
  });

  app.post("/api/progress/:userId/lesson/:lessonId/incomplete", async (req, res) => {
    await storage.markLessonIncomplete(parseInt(req.params.userId), parseInt(req.params.lessonId));
    res.json({ success: true });
  });

  // ==================== ADMIN ====================
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

  app.post("/api/admin/students/:id/approve", async (req, res) => {
    if (!requireAdmin(req, res)) return;
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
    res.json(safe);
  });

  app.post("/api/admin/students/:id/revoke", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const updated = await storage.updateUser(parseInt(req.params.id), { approved: false, accessExpiresAt: null });
    if (!updated) return res.status(404).json({ message: "Aluno não encontrado" });
    const { password, ...safe } = updated;
    res.json(safe);
  });

  app.delete("/api/admin/students/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const ok = await storage.deleteUser(parseInt(req.params.id));
    res.json({ success: ok });
  });

  // Reorder modules
  app.post("/api/admin/modules/reorder", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { orderedIds } = req.body;
    if (!orderedIds || !Array.isArray(orderedIds)) {
      return res.status(400).json({ message: "orderedIds array obrigatório" });
    }
    for (let i = 0; i < orderedIds.length; i++) {
      await storage.updateModule(orderedIds[i], { order: i + 1 });
    }
    const updated = await storage.getModules();
    res.json(updated);
  });

  // Reorder lessons
  app.post("/api/admin/lessons/reorder", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { orderedIds } = req.body;
    if (!orderedIds || !Array.isArray(orderedIds)) {
      return res.status(400).json({ message: "orderedIds array obrigatório" });
    }
    for (let i = 0; i < orderedIds.length; i++) {
      await storage.updateLesson(orderedIds[i], { order: i + 1 });
    }
    const updated = await storage.getLessons();
    res.json(updated);
  });

  app.post("/api/admin/modules", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const data = insertModuleSchema.parse(req.body);
      const mod = await storage.createModule(data);
      res.json(mod);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/modules/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const updated = await storage.updateModule(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Módulo não encontrado" });
    res.json(updated);
  });

  app.delete("/api/admin/modules/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const ok = await storage.deleteModule(parseInt(req.params.id));
    res.json({ success: ok });
  });

  app.post("/api/admin/lessons", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const data = insertLessonSchema.parse(req.body);
      const lesson = await storage.createLesson(data);
      res.json(lesson);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/lessons/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const updated = await storage.updateLesson(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Aula não encontrada" });
    res.json(updated);
  });

  app.delete("/api/admin/lessons/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const ok = await storage.deleteLesson(parseInt(req.params.id));
    res.json({ success: ok });
  });

  app.patch("/api/admin/students/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const updated = await storage.updateUser(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Aluno não encontrado" });
    const { password, ...safe } = updated;
    res.json(safe);
  });

  // ==================== ADMIN: Password Reset ====================
  app.post("/api/admin/students/:id/reset-password", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) return res.status(404).json({ message: "Aluno não encontrado" });
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await storage.createPasswordReset(user.id, token, expiresAt);
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
      const { userId, currentPassword, name, email, phone, newPassword } = req.body;
      if (!userId || !currentPassword) {
        return res.status(400).json({ message: "userId e senha atual são obrigatórios" });
      }
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(401).json({ message: "Senha atual incorreta" });

      const updateData: any = {};
      if (name && name !== user.name) updateData.name = name;
      if (phone !== undefined && phone !== user.phone) updateData.phone = phone;
      if (email && email !== user.email) {
        const existing = await storage.getUserByEmail(email);
        if (existing && existing.id !== user.id) {
          return res.status(400).json({ message: "Este email já está em uso" });
        }
        updateData.email = email;
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
      const { password: _, ...safe } = updated;
      res.json({ message: "Perfil atualizado com sucesso", user: safe });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Erro ao atualizar perfil" });
    }
  });

  // ==================== SEED (only if empty) ====================
  app.all("/api/admin/seed", async (_req, res) => {
    const existingPlans = await storage.getPlans();
    if (existingPlans.length > 0) {
      return res.json({ message: "Banco já possui dados" });
    }

    // Create plans
    await storage.createPlan({ name: "Online", description: "Mentoria online com acesso às aulas gravadas", durationDays: 90, price: "R$ 7.430" });
    await storage.createPlan({ name: "Presencial", description: "Mentoria presencial + acesso às aulas gravadas", durationDays: 180, price: "R$ 12.390" });
    await storage.createPlan({ name: "Completo", description: "Mentoria completa: online + presencial + acesso total", durationDays: 365, price: "R$ 17.350" });

    // Create admin user — IMPORTANTE: troque ADMIN_PASSWORD em produção!
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 10);
    const admin = await storage.createUser({
      name: "Dr. Gustavo Martins",
      email: "admin@amplafacial.com",
      password: hashedPassword,
      planId: null,
      createdAt: new Date().toISOString(),
    });
    await storage.updateUser(admin.id, { role: "admin", approved: true });

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
}
