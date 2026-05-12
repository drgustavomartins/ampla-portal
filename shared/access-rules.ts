/**
 * Regras centralizadas de acesso — usadas no frontend e backend.
 *
 * Decisão de produto:
 *   • Todo aluno com plano pago (qualquer planKey ≠ "tester") tem acesso vitalício.
 *   • Trial é vitalício para login/navegação (acessExpiresAt pode ser null OU futuro);
 *     em produção desabilitamos a expiração — trial pode entrar, ver vitrine/listagens,
 *     mas só consegue assistir as 2 primeiras aulas de cada módulo comum.
 *   • Trial NÃO tem acesso a materiais complementares.
 *   • Trial NÃO tem acesso a Encontros Quinzenais / gravações da mentoria.
 */

/** Retorna true se o planKey representa um plano pago (acesso vitalício de conteúdo). */
export function isLifetimePlan(planKey: string | null | undefined): boolean {
  return planKey != null && planKey !== "" && planKey !== "tester";
}

/**
 * Retorna true se o usuário tem acesso ATIVO para login/navegação.
 * - Plano pago (≠ tester): sempre true (vitalício).
 * - Tester/trial: vitalício para navegação — true se sem expiração OU se expiração futura.
 *   (Antigamente expirava em 7 dias; agora a expiração é ignorada para nav.)
 * - Sem plano e sem expiração: false (registro incompleto).
 *
 * IMPORTANTE: ter "acesso ativo" não significa acesso a todas as aulas.
 * Use isTrialLimited / canAccessLesson para gating de conteúdo.
 */
export function hasActiveAccess(user: {
  planKey?: string | null;
  accessExpiresAt?: string | Date | null;
}): boolean {
  if (isLifetimePlan(user.planKey)) return true;
  // Trial vitalício: planKey nulo/tester sem expiração → acesso de navegação permanente.
  if (!user.accessExpiresAt) {
    // Nav permitida para trial vitalício (planKey null/tester).
    return user.planKey == null || user.planKey === "" || user.planKey === "tester";
  }
  return new Date(user.accessExpiresAt) > new Date();
}

/**
 * Retorna true se o usuário é "trial limitado" — pode navegar mas só vê
 * as 2 primeiras aulas de cada módulo, sem materiais, sem encontros quinzenais.
 *
 * Roles admin/super_admin e planos pagos (isLifetimePlan) NÃO são trial.
 */
export function isTrialLimited(user: {
  planKey?: string | null;
  role?: string | null;
}): boolean {
  if (user.role === "admin" || user.role === "super_admin") return false;
  if (isLifetimePlan(user.planKey)) return false;
  // role 'trial' OU planKey vazio/null/'tester' → trial limitado
  return true;
}

/**
 * Quantas aulas (em ordem) de cada módulo um trial pode assistir.
 * Demais aulas ficam bloqueadas com CTA de upgrade.
 */
export const TRIAL_FREE_LESSONS_PER_MODULE = 2;

/**
 * Planos que dão direito ao módulo "Encontros Quinzenais" (mentoria ao vivo).
 * Mesma lógica já utilizada em server/live-events-routes.ts para o Acompanhamento.
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

/**
 * Retorna true se o usuário tem mentoria ativa — ou seja, acesso ao módulo
 * "Encontros Quinzenais" e às gravações das aulas online quinzenais.
 * - admin/super_admin: sempre true (preview/teste).
 * - Plano em MENTORIA_ATIVA_PLAN_KEYS: true (ex: VIP, Observador, Imersão).
 * - Demais planos (modulo_avulso, pacote_completo, tester, etc.): false.
 *
 * O acesso vitalício a aulas comuns NÃO concede mentoria ativa — esta é
 * uma camada específica para os encontros quinzenais.
 */
export function hasMentoriaAtiva(user: {
  planKey?: string | null;
  role?: string | null;
}): boolean {
  if (user.role === "admin" || user.role === "super_admin") return true;
  if (!user.planKey) return false;
  return MENTORIA_ATIVA_PLAN_KEYS.has(user.planKey);
}

/**
 * Retorna true se o usuário tem acesso aos materiais complementares.
 * - admin/super_admin: sempre true.
 * - Trial limitado: NUNCA.
 * - Plano pago: depende do plano (controlado a nível de UI/API por categorias).
 */
export function canAccessMaterials(user: {
  planKey?: string | null;
  role?: string | null;
}): boolean {
  if (user.role === "admin" || user.role === "super_admin") return true;
  if (isTrialLimited(user)) return false;
  return isLifetimePlan(user.planKey);
}
