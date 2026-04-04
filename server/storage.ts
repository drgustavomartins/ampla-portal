import { db } from "./db";
import { eq, and, asc, desc } from "drizzle-orm";
import {
  plans, users, modules, lessons, lessonProgress, passwordResets, auditLogs, planModules,
  userModules, userMaterialCategories,
  type Plan, type InsertPlan,
  type User, type InsertUser,
  type Module, type InsertModule,
  type Lesson, type InsertLesson,
  type LessonProgress,
  type PasswordReset,
  type PlanModule,
  type AuditLog, type InsertAuditLog,
  type UserModule, type UserMaterialCategory,
} from "@shared/schema";

export const storage = {
  // ===== PLANS =====
  async getPlans(): Promise<Plan[]> {
    return db.select().from(plans).orderBy(plans.order);
  },
  async getPlan(id: number): Promise<Plan | undefined> {
    const [p] = await db.select().from(plans).where(eq(plans.id, id));
    return p;
  },
  async createPlan(plan: InsertPlan): Promise<Plan> {
    const [p] = await db.insert(plans).values(plan).returning();
    return p;
  },
  async updatePlan(id: number, data: Partial<InsertPlan>): Promise<Plan | undefined> {
    const [p] = await db.update(plans).set(data).where(eq(plans.id, id)).returning();
    return p;
  },
  async deletePlan(id: number): Promise<boolean> {
    const result = await db.delete(plans).where(eq(plans.id, id));
    return true;
  },

  // ===== USERS =====
  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  },
  async getUser(id: number): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return u;
  },
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.email, email));
    return u;
  },
  async createUser(user: InsertUser & { createdAt: string; role?: string; approved?: boolean }): Promise<User> {
    const [u] = await db.insert(users).values({
      name: user.name,
      email: user.email,
      password: user.password,
      phone: user.phone ?? null,
      planId: user.planId ?? null,
      role: user.role ?? "student",
      approved: user.approved ?? false,
      createdAt: user.createdAt,
    }).returning();
    return u;
  },
  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const { id: _, ...updateData } = data as any;
    const [u] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return u;
  },
  async deleteUser(id: number): Promise<boolean> {
    await db.delete(users).where(eq(users.id, id));
    return true;
  },
  async getStudents(): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, "student")).orderBy(asc(users.name));
  },
  async getPendingStudents(): Promise<User[]> {
    return db.select().from(users).where(and(eq(users.role, "student"), eq(users.approved, false))).orderBy(asc(users.name));
  },
  async getAdmins(): Promise<User[]> {
    return db.select().from(users).where(
      eq(users.role, "admin")
    );
  },
  async getAllAdmins(): Promise<User[]> {
    // Returns both admin and super_admin
    const all = await db.select().from(users);
    return all.filter(u => u.role === "admin" || u.role === "super_admin");
  },

  // ===== PLAN MODULES =====
  async getPlanModules(planId: number): Promise<PlanModule[]> {
    return db.select().from(planModules).where(eq(planModules.planId, planId));
  },
  async getAllPlanModules(): Promise<PlanModule[]> {
    return db.select().from(planModules);
  },
  async setPlanModules(planId: number, moduleIds: number[]): Promise<void> {
    await db.delete(planModules).where(eq(planModules.planId, planId));
    if (moduleIds.length > 0) {
      await db.insert(planModules).values(moduleIds.map(moduleId => ({ planId, moduleId })));
    }
  },

  // ===== MODULES =====
  async getModules(): Promise<Module[]> {
    return db.select().from(modules).orderBy(modules.order);
  },
  async getModule(id: number): Promise<Module | undefined> {
    const [m] = await db.select().from(modules).where(eq(modules.id, id));
    return m;
  },
  async createModule(mod: InsertModule): Promise<Module> {
    const [m] = await db.insert(modules).values(mod).returning();
    return m;
  },
  async updateModule(id: number, data: Partial<InsertModule>): Promise<Module | undefined> {
    const [m] = await db.update(modules).set(data).where(eq(modules.id, id)).returning();
    return m;
  },
  async deleteModule(id: number): Promise<boolean> {
    await db.delete(lessons).where(eq(lessons.moduleId, id));
    await db.delete(modules).where(eq(modules.id, id));
    return true;
  },

  // ===== LESSONS =====
  async getLessons(): Promise<Lesson[]> {
    return db.select().from(lessons).orderBy(lessons.order);
  },
  async getLessonsByModule(moduleId: number): Promise<Lesson[]> {
    return db.select().from(lessons).where(eq(lessons.moduleId, moduleId)).orderBy(lessons.order);
  },
  async getLesson(id: number): Promise<Lesson | undefined> {
    const [l] = await db.select().from(lessons).where(eq(lessons.id, id));
    return l;
  },
  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const [l] = await db.insert(lessons).values(lesson).returning();
    return l;
  },
  async updateLesson(id: number, data: Partial<InsertLesson>): Promise<Lesson | undefined> {
    const [l] = await db.update(lessons).set(data).where(eq(lessons.id, id)).returning();
    return l;
  },
  async deleteLesson(id: number): Promise<boolean> {
    await db.delete(lessons).where(eq(lessons.id, id));
    return true;
  },

  // ===== PROGRESS =====
  async getProgress(userId: number): Promise<LessonProgress[]> {
    return db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId));
  },
  async markLessonComplete(userId: number, lessonId: number): Promise<LessonProgress> {
    // Check if already exists
    const [existing] = await db.select().from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)));
    if (existing) {
      const [updated] = await db.update(lessonProgress)
        .set({ completed: true, completedAt: new Date().toISOString() })
        .where(eq(lessonProgress.id, existing.id))
        .returning();
      return updated;
    }
    const [p] = await db.insert(lessonProgress).values({
      userId, lessonId, completed: true, completedAt: new Date().toISOString(),
    }).returning();
    return p;
  },
  async markLessonIncomplete(userId: number, lessonId: number): Promise<boolean> {
    await db.delete(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)));
    return true;
  },

  // ===== PASSWORD RESETS =====
  async createPasswordReset(userId: number, token: string, expiresAt: string): Promise<PasswordReset> {
    const [pr] = await db.insert(passwordResets).values({
      userId, token, expiresAt, createdAt: new Date().toISOString(),
    }).returning();
    return pr;
  },
  async getPasswordResetByToken(token: string): Promise<PasswordReset | undefined> {
    const [pr] = await db.select().from(passwordResets).where(eq(passwordResets.token, token));
    return pr;
  },
  async markPasswordResetUsed(id: number): Promise<void> {
    await db.update(passwordResets).set({ used: true }).where(eq(passwordResets.id, id));
  },

  // ===== AUDIT LOGS =====
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [al] = await db.insert(auditLogs).values(log).returning();
    return al;
  },
  async getAuditLogs(filters?: { adminId?: number; action?: string; limit?: number; offset?: number }): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs);
    if (filters?.adminId) {
      query = query.where(eq(auditLogs.adminId, filters.adminId)) as any;
    }
    if (filters?.action) {
      query = query.where(eq(auditLogs.action, filters.action)) as any;
    }
    return (query as any).orderBy(desc(auditLogs.createdAt)).limit(filters?.limit || 200).offset(filters?.offset || 0);
  },
  async getAuditLogsByAdmin(adminId: number): Promise<AuditLog[]> {
    return db.select().from(auditLogs)
      .where(eq(auditLogs.adminId, adminId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(200);
  },

  // ===== USER MODULES =====
  async getUserModules(userId: number): Promise<UserModule[]> {
    return db.select().from(userModules).where(eq(userModules.userId, userId));
  },
  async setUserModules(userId: number, entries: { moduleId: number; enabled: boolean; startDate: string | null; endDate: string | null }[]): Promise<void> {
    await db.delete(userModules).where(eq(userModules.userId, userId));
    if (entries.length > 0) {
      await db.insert(userModules).values(entries.map(e => ({
        userId,
        moduleId: e.moduleId,
        enabled: e.enabled,
        startDate: e.startDate,
        endDate: e.endDate,
      })));
    }
  },

  // ===== USER MATERIAL CATEGORIES =====
  async getUserMaterialCategories(userId: number): Promise<UserMaterialCategory[]> {
    return db.select().from(userMaterialCategories).where(eq(userMaterialCategories.userId, userId));
  },
  async setUserMaterialCategories(userId: number, entries: { categoryTitle: string; enabled: boolean }[]): Promise<void> {
    await db.delete(userMaterialCategories).where(eq(userMaterialCategories.userId, userId));
    if (entries.length > 0) {
      await db.insert(userMaterialCategories).values(entries.map(e => ({
        userId,
        categoryTitle: e.categoryTitle,
        enabled: e.enabled,
      })));
    }
  },
};
