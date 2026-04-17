import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Plans (Online, Presencial, Completo)
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  durationDays: integer("duration_days").notNull(),
  price: text("price"),
  materialTopics: text("material_topics"), // JSON array of allowed material topic titles (e.g. '["Toxina Botulínica","IA na Medicina"]')
  order: integer("order").notNull().default(0),
});

// Stripe plan keys — each maps to a product in Stripe
export const PLAN_KEYS = [
  "tester",
  "modulo_avulso",
  "pacote_completo",
  "observador_essencial",
  "observador_avancado",
  "observador_intensivo",
  "imersao",
  "vip_online",
  "vip_presencial",
  "vip_completo",
  "extensao_acompanhamento",
  "horas_clinicas_1",
  "horas_clinicas_2",
  "horas_clinicas_3",
  "observacao_extra_1",
  "observacao_extra_2",
  "observacao_extra_3",
  "workshop",
] as const;
export type PlanKey = typeof PLAN_KEYS[number];

// Users (students + admins)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  password: text("password").notNull(),
  role: text("role").notNull().default("student"), // 'student', 'admin', 'super_admin'
  planId: integer("plan_id"),
  approved: boolean("approved").notNull().default(false),
  accessExpiresAt: text("access_expires_at"),
  createdAt: text("created_at").notNull(),
  loginAttempts: integer("login_attempts").notNull().default(0),
  lockedUntil: text("locked_until"),
  // Granular access control fields
  communityAccess: boolean("community_access").notNull().default(true),
  supportAccess: boolean("support_access").notNull().default(true),
  supportExpiresAt: text("support_expires_at"), // null = uses accessExpiresAt
  clinicalPracticeAccess: boolean("clinical_practice_access").notNull().default(true),
  clinicalPracticeHours: integer("clinical_practice_hours").notNull().default(0),
  clinicalObservationHours: integer("clinical_observation_hours").notNull().default(0),
  materialsAccess: boolean("materials_access").notNull().default(false),
  // Mentorship date range
  mentorshipStartDate: text("mentorship_start_date"), // ISO date string
  mentorshipEndDate: text("mentorship_end_date"), // ISO date string
  // Stripe payment fields
  stripeCustomerId: text("stripe_customer_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  planKey: text("plan_key"), // e.g. 'vip_online', 'observador_essencial'
  planPaidAt: text("plan_paid_at"), // ISO date of last payment
  planAmountPaid: integer("plan_amount_paid").default(0), // in centavos
  trialStartedAt: text("trial_started_at"), // ISO date trial began
  lgpdAcceptedAt: text("lgpd_accepted_at"), // ISO date user accepted LGPD terms
  avatarUrl: text("avatar_url"),
  username: text("username"),
  instagram: text("instagram"),
  moduleContentExpiresAt: text("module_content_expires_at"),
  // UTM tracking fields
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  leadSource: text("lead_source"), // "Instagram", "Meta Ads", "WhatsApp", "Google", "Indicação", "Direto"
  convertedAt: text("converted_at"), // ISO date when trial → paid
  landingPage: text("landing_page"), // first page visited
  inviteCode: text("invite_code"), // invite code used during registration
});

// Modules
export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  imageUrl: text("image_url"),
});

// Lessons
export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url"),
  duration: text("duration"),
  order: integer("order").notNull().default(0),
});

// Password Resets
export const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull(),
  expiresAt: text("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: text("created_at").notNull(),
});

// Progress
export const lessonProgress = pgTable("lesson_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: text("completed_at"),
});

// Plan-Module associations (many-to-many)
export const planModules = pgTable("plan_modules", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  moduleId: integer("module_id").notNull(),
});

// User-Module permissions (per-student module access with optional date range)
export const userModules = pgTable("user_modules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  moduleId: integer("module_id").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  startDate: text("start_date"), // ISO date string, null = immediate
  endDate: text("end_date"), // ISO date string, null = no expiry
});

// User-Material Category permissions (per-student material category access)
export const userMaterialCategories = pgTable("user_material_categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  categoryTitle: text("category_title").notNull(), // matches THEMES[].title
  enabled: boolean("enabled").notNull().default(true),
});

// Material Themes
export const materialThemes = pgTable("material_themes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  coverUrl: text("cover_url").notNull(),
  order: integer("order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
});

// Material Subcategories
export const materialSubcategories = pgTable("material_subcategories", {
  id: serial("id").primaryKey(),
  themeId: integer("theme_id").notNull(),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
});

// Material Files
export const materialFiles = pgTable("material_files", {
  id: serial("id").primaryKey(),
  subcategoryId: integer("subcategory_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'pdf', 'docx', or 'mp3'
  driveId: text("drive_id").notNull(),
  youtubeId: text("youtube_id"),
  order: integer("order").notNull().default(0),
});

// Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull(),
  adminName: text("admin_name").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type"), // 'student', 'module', 'lesson', 'admin', 'plan'
  targetId: integer("target_id"),
  targetName: text("target_name"),
  details: text("details"), // JSON string
  createdAt: text("created_at").notNull(),
});

// Tracking Events (WhatsApp clicks, etc.)
export const trackingEvents = pgTable("tracking_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // "whatsapp_click"
  sourcePage: text("source_page"), // "lp", "admin", etc.
  utmSource: text("utm_source"),
  metadata: text("metadata"), // JSON string for extra data
  createdAt: text("created_at").notNull(),
});

// Lead Events (CRM activity timeline)
export const leadEvents = pgTable("lead_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"), // nullable for quiz-only leads
  quizLeadId: integer("quiz_lead_id"), // nullable — links to quiz_leads for non-registered leads
  eventType: text("event_type").notNull(), // "cadastro", "quiz_completo", "trial_inicio", "trial_expirado", "convertido", "modulo_acesso", "credito", "whatsapp_lp", "nota_admin"
  eventDescription: text("event_description").notNull(),
  metadata: text("metadata"), // JSON string
  createdAt: text("created_at").notNull(),
});

// Invite Codes (workshop/special access links)
export const inviteCodes = pgTable("invite_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  accessType: text("access_type").notNull().default("full"), // "full" = all modules/lessons
  durationDays: integer("duration_days").notNull().default(7),
  campaign: text("campaign").notNull(), // e.g. "workshop_merz_abril2026"
  maxUses: integer("max_uses").notNull().default(0), // 0 = unlimited
  usedCount: integer("used_count").notNull().default(0),
  usedBy: text("used_by").notNull().default("[]"), // JSON array of { email, usedAt }
  active: boolean("active").notNull().default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: text("created_at").notNull(),
});

// Site Visitors — anonymous visitor tracking
export const siteVisitors = pgTable("site_visitors", {
  id: serial("id").primaryKey(),
  visitorId: text("visitor_id").notNull().unique(), // UUID from localStorage
  userId: integer("user_id"), // linked after registration
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  leadSource: text("lead_source"),
  referrer: text("referrer"),
  firstPage: text("first_page"),
  createdAt: text("created_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
});

// Page Visits — individual page view tracking
export const pageVisits = pgTable("page_visits", {
  id: serial("id").primaryKey(),
  visitorId: text("visitor_id").notNull(), // references site_visitors.visitor_id
  page: text("page").notNull(),
  referrer: text("referrer"),
  createdAt: text("created_at").notNull(),
});

// Insert schemas
export const insertInviteCodeSchema = createInsertSchema(inviteCodes).omit({ id: true, usedCount: true, usedBy: true });

export const insertSiteVisitorSchema = createInsertSchema(siteVisitors).omit({ id: true });
export const insertPageVisitSchema = createInsertSchema(pageVisits).omit({ id: true });
export const insertLeadEventSchema = createInsertSchema(leadEvents).omit({ id: true });
export const insertPlanSchema = createInsertSchema(plans).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, approved: true, role: true, accessExpiresAt: true });
export const insertModuleSchema = createInsertSchema(modules).omit({ id: true });
export const insertLessonSchema = createInsertSchema(lessons).omit({ id: true });
export const insertLessonProgressSchema = createInsertSchema(lessonProgress).omit({ id: true });
export const insertPlanModuleSchema = createInsertSchema(planModules).omit({ id: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true });
export const insertUserModuleSchema = createInsertSchema(userModules).omit({ id: true });
export const insertUserMaterialCategorySchema = createInsertSchema(userMaterialCategories).omit({ id: true });
export const insertMaterialThemeSchema = createInsertSchema(materialThemes).omit({ id: true });
export const insertMaterialSubcategorySchema = createInsertSchema(materialSubcategories).omit({ id: true });
export const insertMaterialFileSchema = createInsertSchema(materialFiles).omit({ id: true });

// UTM data schema (shared between register and register-trial)
const utmSchema = z.object({
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
  lead_source: z.string().optional(),
  landing_page: z.string().optional(),
  visitor_id: z.string().optional(), // links anonymous visitor to new account
}).partial();

export const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(8, "Telefone inválido").max(15, "Telefone inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  instagram: z.string().optional().default(""),
  invite_code: z.string().optional(),
}).merge(utmSchema);

// Trial registration — phone is now required
export const trialRegisterSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(8, "Telefone é obrigatório").max(15, "Telefone inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  instagram: z.string().optional().default(""),
  lgpdAccepted: z.boolean().refine((v) => v === true, "Você precisa aceitar os termos para continuar"),
  invite_code: z.string().optional(),
}).merge(utmSchema);

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// Types
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Module = typeof modules.$inferSelect;
export type InsertModule = z.infer<typeof insertModuleSchema>;
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type InsertLessonProgress = z.infer<typeof insertLessonProgressSchema>;
export type PasswordReset = typeof passwordResets.$inferSelect;
export type PlanModule = typeof planModules.$inferSelect;
export type InsertPlanModule = z.infer<typeof insertPlanModuleSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type UserModule = typeof userModules.$inferSelect;
export type InsertUserModule = z.infer<typeof insertUserModuleSchema>;
export type UserMaterialCategory = typeof userMaterialCategories.$inferSelect;
export type InsertUserMaterialCategory = z.infer<typeof insertUserMaterialCategorySchema>;
export type MaterialTheme = typeof materialThemes.$inferSelect;
export type InsertMaterialTheme = z.infer<typeof insertMaterialThemeSchema>;
export type MaterialSubcategory = typeof materialSubcategories.$inferSelect;
export type InsertMaterialSubcategory = z.infer<typeof insertMaterialSubcategorySchema>;
export type MaterialFile = typeof materialFiles.$inferSelect;
export type InsertMaterialFile = z.infer<typeof insertMaterialFileSchema>;
export type LeadEvent = typeof leadEvents.$inferSelect;
export type InsertLeadEvent = z.infer<typeof insertLeadEventSchema>;
export type InviteCode = typeof inviteCodes.$inferSelect;
export type InsertInviteCode = z.infer<typeof insertInviteCodeSchema>;

export type SiteVisitor = typeof siteVisitors.$inferSelect;
export type InsertSiteVisitor = z.infer<typeof insertSiteVisitorSchema>;
export type PageVisit = typeof pageVisits.$inferSelect;
export type InsertPageVisit = z.infer<typeof insertPageVisitSchema>;
