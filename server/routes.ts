import type { Express } from "express";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { registerSchema, loginSchema, insertModuleSchema, insertLessonSchema } from "@shared/schema";

export function registerRoutes(server: Server, app: Express) {
  // ==================== AUTH ====================

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }
      const plan = await storage.getPlan(data.planId);
      if (!plan) {
        return res.status(400).json({ message: "Plano inválido" });
      }
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({
        name: data.name,
        email: data.email,
        password: hashedPassword,
        planId: data.planId,
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
      return res.json({ user: safeUser });
    } catch (e: any) {
      return res.status(400).json({ message: e.message || "Erro no login" });
    }
  });

  // ==================== PLANS ====================
  app.get("/api/plans", async (_req, res) => {
    const p = await storage.getPlans();
    res.json(p);
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
  app.get("/api/admin/students", async (_req, res) => {
    const students = await storage.getStudents();
    const safe = students.map(({ password, ...s }) => s);
    res.json(safe);
  });

  app.get("/api/admin/students/pending", async (_req, res) => {
    const pending = await storage.getPendingStudents();
    const safe = pending.map(({ password, ...s }) => s);
    res.json(safe);
  });

  app.post("/api/admin/students/:id/approve", async (req, res) => {
    const user = await storage.getUser(parseInt(req.params.id));
    if (!user) return res.status(404).json({ message: "Aluno não encontrado" });
    const plan = user.planId ? await storage.getPlan(user.planId) : null;
    const durationDays = plan ? plan.durationDays : 90;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);
    const updated = await storage.updateUser(user.id, {
      approved: true,
      accessExpiresAt: expiresAt.toISOString(),
    });
    if (!updated) return res.status(500).json({ message: "Erro ao aprovar" });
    const { password, ...safe } = updated;
    res.json(safe);
  });

  app.post("/api/admin/students/:id/revoke", async (req, res) => {
    const updated = await storage.updateUser(parseInt(req.params.id), { approved: false, accessExpiresAt: null });
    if (!updated) return res.status(404).json({ message: "Aluno não encontrado" });
    const { password, ...safe } = updated;
    res.json(safe);
  });

  app.delete("/api/admin/students/:id", async (req, res) => {
    const ok = await storage.deleteUser(parseInt(req.params.id));
    res.json({ success: ok });
  });

  app.post("/api/admin/modules", async (req, res) => {
    try {
      const data = insertModuleSchema.parse(req.body);
      const mod = await storage.createModule(data);
      res.json(mod);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/modules/:id", async (req, res) => {
    const updated = await storage.updateModule(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Módulo não encontrado" });
    res.json(updated);
  });

  app.delete("/api/admin/modules/:id", async (req, res) => {
    const ok = await storage.deleteModule(parseInt(req.params.id));
    res.json({ success: ok });
  });

  app.post("/api/admin/lessons", async (req, res) => {
    try {
      const data = insertLessonSchema.parse(req.body);
      const lesson = await storage.createLesson(data);
      res.json(lesson);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/lessons/:id", async (req, res) => {
    const updated = await storage.updateLesson(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Aula não encontrada" });
    res.json(updated);
  });

  app.delete("/api/admin/lessons/:id", async (req, res) => {
    const ok = await storage.deleteLesson(parseInt(req.params.id));
    res.json({ success: ok });
  });

  app.patch("/api/admin/students/:id", async (req, res) => {
    const updated = await storage.updateUser(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Aluno não encontrado" });
    const { password, ...safe } = updated;
    res.json(safe);
  });

  // ==================== SEED (only if empty) ====================
  app.post("/api/admin/seed", async (_req, res) => {
    const existingPlans = await storage.getPlans();
    if (existingPlans.length > 0) {
      return res.json({ message: "Banco já possui dados" });
    }

    // Create plans
    await storage.createPlan({ name: "Online", description: "Mentoria online com acesso às aulas gravadas", durationDays: 90, price: "R$ 7.430" });
    await storage.createPlan({ name: "Presencial", description: "Mentoria presencial + acesso às aulas gravadas", durationDays: 180, price: "R$ 12.390" });
    await storage.createPlan({ name: "Completo", description: "Mentoria completa: online + presencial + acesso total", durationDays: 365, price: "R$ 17.350" });

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
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
    await storage.createModule({ title: "Ácido Hialurônico", description: "Preenchimentos e volumização", order: 3, imageUrl: null });
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
