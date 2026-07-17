/**
 * Regras centralizadas de acesso — fonte única usada no frontend e backend.
 *
 * MODELO UNIFICADO (decisão de produto — maio/2026):
 * Existem APENAS três tipos de acesso liberáveis para alunos:
 *
 *   • "full"    — Completo Vitalício
 *                 Acesso a tudo: todos os módulos, materiais complementares,
 *                 Encontros Quinzenais (aulas ao vivo gravadas), comunidade.
 *                 Ex.: planos vip_*, imersao*, acesso_vitalicio, pacote_completo,
 *                       observador_*, extensao_acompanhamento, workshop.
 *
 *   • "trial"   — Trial Vitalício
 *                 Login/navegação/vitrine permanentes. Pode assistir só as 2
 *                 primeiras aulas de cada módulo comum. Sem materiais
 *                 complementares. Sem Encontros Quinzenais.
 *                 Ex.: planKey null/""/"tester".
 *
 *   • "module"  — Acesso por Módulo
 *                 Acesso vitalício apenas ao(s) módulo(s) comprado(s)
 *                 (e ao módulo "Boas Vindas"). Os módulos permitidos vêm de
 *                 `user_modules` (lista explícita) ou, para o plano legado
 *                 `modulo_pratica`, do mapa THEME_TO_MODULE_IDS via
 *                 `selected_theme`. Materiais/Encontros não são liberados
 *                 automaticamente por este tipo.
 *
 * Admins/super_admins fazem bypass total ("admin").
 *
 * Cada predicado abaixo deve ser a fonte de verdade chamada pelos endpoints
 * e páginas. Mantemos compatibilidade com os helpers legados (isLifetimePlan,
 * hasActiveAccess, isTrialLimited, canAccessMaterials, hasMentoriaAtiva).
 */

export type AccessType = "admin" | "full" | "trial" | "module";

/** Argumento "user" mínimo aceito pelos helpers. */
export interface AccessUser {
  role?: string | null;
  planKey?: string | null;
  accessExpiresAt?: string | Date | null;
  selectedTheme?: string | null;
  /** Lista de IDs de módulos liberados via user_modules (se já carregados). */
  moduleIds?: number[] | null;
}

// ─── Conjuntos de planos ────────────────────────────────────────────────────

/** Planos que dão "Completo Vitalício" (acesso a tudo). */
export const FULL_ACCESS_PLAN_KEYS = new Set<string>([
  "acesso_vitalicio",
  "pacote_completo",
  "vip_online",
  "vip_presencial",
  "vip_completo",
  "imersao",
  "imersao_elite",
  "observador_essencial",
  "observador_avancado",
  "observador_intensivo",
  "observacional_economico",
  "observacional_moderado",
  "extensao_acompanhamento",
  "workshop",
]);

/** Planos legados que liberam apenas um módulo específico. */
export const MODULE_ACCESS_PLAN_KEYS = new Set<string>([
  "modulo_avulso",
  "modulo_pratica",
]);

/**
 * Planos que dão direito a Encontros Quinzenais / mentoria ao vivo gravada.
 * Subconjunto de FULL_ACCESS_PLAN_KEYS — alguns planos completos não incluem
 * mentoria (ex.: pacote_completo, acesso_vitalicio históricos sem mentoria).
 */
export const MENTORIA_ATIVA_PLAN_KEYS = new Set<string>([
  "observador_essencial",
  "observador_avancado",
  "observador_intensivo",
  "imersao",
  "vip_online",
  "vip_presencial",
  "vip_completo",
  "imersao_elite",
  "extensao_acompanhamento",
  "workshop",
]);

/** Mapa: tema → IDs dos módulos liberados pelo plano `modulo_pratica`. */
export const THEME_TO_MODULE_IDS: Record<string, number[]> = {
  toxina: [6, 2],
  preenchedores: [6, 3],
  bioestimuladores: [6, 5],
  biorregeneradores: [6, 7],
};

/** Quantas aulas (em ordem) de cada módulo um trial pode assistir. */
export const TRIAL_FREE_LESSONS_PER_MODULE = 2;

// ─── Função principal: getAccessType ────────────────────────────────────────

/**
 * Retorna o tipo de acesso unificado do usuário.
 * Esta é a fonte única — todos os outros predicados derivam daqui.
 *
 * Regras:
 *  1. admin/super_admin → "admin" (bypass total).
 *  2. planKey em FULL_ACCESS_PLAN_KEYS → "full".
 *  3. planKey em MODULE_ACCESS_PLAN_KEYS → "module".
 *  4. role === "student" com user_modules definidos (moduleIds.length > 0)
 *     mas sem planKey reconhecido → "module" (caso de alunos antigos
 *     com acesso por user_modules em vez de planKey).
 *  5. Caso contrário → "trial" (planKey null/""/"tester", role "trial",
 *     ou planKey desconhecido).
 */
export function getAccessType(user: AccessUser | null | undefined): AccessType {
  if (!user) return "trial";
  if (user.role === "admin" || user.role === "super_admin") return "admin";
  const pk = user.planKey;
  if (pk && FULL_ACCESS_PLAN_KEYS.has(pk)) return "full";
  if (pk && MODULE_ACCESS_PLAN_KEYS.has(pk)) return "module";
  // student rebaixado com user_modules → trata como module
  if (user.role === "student" && Array.isArray(user.moduleIds) && user.moduleIds.length > 0) {
    return "module";
  }
  return "trial";
}

// ─── Predicados de alto nível ───────────────────────────────────────────────

/** True se o usuário tem acesso completo (admin ou Completo Vitalício). */
export function hasFullAccess(user: AccessUser | null | undefined): boolean {
  const t = getAccessType(user);
  return t === "admin" || t === "full";
}

/** True se é Trial Vitalício (login/nav permanente, conteúdo limitado). */
export function isTrialLifetime(user: AccessUser | null | undefined): boolean {
  return getAccessType(user) === "trial";
}

/** True se é Acesso por Módulo (planos modulo_* ou user_modules sem plano). */
export function isModuleAccess(user: AccessUser | null | undefined): boolean {
  return getAccessType(user) === "module";
}

/**
 * Lista de IDs de módulos liberados para um aluno de Acesso por Módulo.
 * - admin/full: retorna null (acesso a todos).
 * - module:
 *     • Se moduleIds estiver definido (carregado de user_modules), usa-o.
 *     • Senão, para modulo_pratica + selectedTheme, usa THEME_TO_MODULE_IDS.
 *     • Senão (modulo_avulso sem dados), retorna apenas Boas Vindas ([6]).
 * - trial: retorna [] (nenhum módulo liberado para assistir completo).
 */
export function allowedModuleIds(user: AccessUser | null | undefined): number[] | null {
  const t = getAccessType(user);
  if (t === "admin" || t === "full") return null; // todos
  if (t === "trial") return [];
  // module:
  if (user?.moduleIds && user.moduleIds.length > 0) return [...user.moduleIds];
  if (user?.planKey === "modulo_pratica" && user.selectedTheme && THEME_TO_MODULE_IDS[user.selectedTheme]) {
    return [...THEME_TO_MODULE_IDS[user.selectedTheme]];
  }
  return [6]; // fallback: só Boas Vindas
}

/** True se o aluno pode acessar o módulo dado (assistir todas as aulas dele). */
export function hasModuleAccess(user: AccessUser | null | undefined, moduleId: number): boolean {
  const t = getAccessType(user);
  if (t === "admin" || t === "full") return true;
  if (t === "trial") return false; // trial vê módulo mas só 2 aulas
  const ids = allowedModuleIds(user);
  return Array.isArray(ids) && ids.includes(moduleId);
}

/**
 * True se o aluno pode assistir a aula específica.
 *
 * @param lessonOrderInModule — ordem 0-based da aula dentro do módulo.
 */
export function canWatchLesson(
  user: AccessUser | null | undefined,
  moduleId: number,
  lessonOrderInModule: number,
): boolean {
  const t = getAccessType(user);
  if (t === "admin" || t === "full") return true;
  if (t === "trial") return lessonOrderInModule < TRIAL_FREE_LESSONS_PER_MODULE;
  // module:
  if (hasModuleAccess(user, moduleId)) return true;
  // Em módulos não comprados, trata como trial (preview das 2 primeiras aulas).
  return lessonOrderInModule < TRIAL_FREE_LESSONS_PER_MODULE;
}

/** True se o aluno pode acessar materiais complementares. */
export function canAccessMaterials(user: AccessUser | null | undefined): boolean {
  const t = getAccessType(user);
  return t === "admin" || t === "full";
}

/**
 * True se o aluno tem mentoria ativa (Encontros Quinzenais / aulas ao vivo).
 * - admin: sempre true (preview).
 * - planos em MENTORIA_ATIVA_PLAN_KEYS: true.
 * - demais (inclusive full sem mentoria, module, trial): false.
 */
export function hasMentoriaAtiva(user: AccessUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "super_admin") return true;
  if (!user.planKey) return false;
  return MENTORIA_ATIVA_PLAN_KEYS.has(user.planKey);
}

/**
 * True se o aluno pode acessar gravações ao vivo (alias semântico de
 * hasMentoriaAtiva, exposto para clareza nos call sites).
 */
export function canAccessLiveRecordings(user: AccessUser | null | undefined): boolean {
  return hasMentoriaAtiva(user);
}

// ─── Helpers legados (compatibilidade) ──────────────────────────────────────

/**
 * Retorna true se o planKey representa um plano pago (acesso vitalício).
 * Mantido para compatibilidade com call sites antigos — equivale a
 * `hasFullAccess` ou `isModuleAccess`.
 */
export function isLifetimePlan(planKey: string | null | undefined): boolean {
  if (!planKey || planKey === "tester") return false;
  return FULL_ACCESS_PLAN_KEYS.has(planKey) || MODULE_ACCESS_PLAN_KEYS.has(planKey)
    // planos com sufixo numérico (horas_clinicas_*, observacao_extra_*) — pagos avulsos
    || /^(horas_clinicas|observacao_extra)_/.test(planKey);
}

/**
 * Retorna true se o usuário tem acesso ATIVO para login/navegação.
 * - admin/super_admin: sempre true.
 * - plano pago (isLifetimePlan): sempre true.
 * - trial vitalício: true (acessExpiresAt nulo OU futuro).
 * - acessExpiresAt no passado: false.
 */
export function hasActiveAccess(user: AccessUser): boolean {
  if (user.role === "admin" || user.role === "super_admin") return true;
  if (isLifetimePlan(user.planKey)) return true;
  if (!user.accessExpiresAt) {
    // trial vitalício: planKey null/tester sem expiração → nav permanente.
    return user.planKey == null || user.planKey === "" || user.planKey === "tester";
  }
  return new Date(user.accessExpiresAt) > new Date();
}

/**
 * Retorna true se o usuário é "trial limitado". Mantido como alias de
 * isTrialLifetime para compatibilidade.
 */
export function isTrialLimited(user: AccessUser): boolean {
  return isTrialLifetime(user);
}
