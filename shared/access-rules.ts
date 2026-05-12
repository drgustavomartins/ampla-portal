/**
 * Regras centralizadas de acesso — usadas no frontend e backend.
 *
 * Decisão de produto: todo aluno com plano pago tem acesso vitalício.
 * Apenas tester/trial mantém expiração (7 dias).
 */

/** Retorna true se o planKey representa um plano pago (acesso vitalício). */
export function isLifetimePlan(planKey: string | null | undefined): boolean {
  return planKey != null && planKey !== "" && planKey !== "tester";
}

/**
 * Retorna true se o usuário tem acesso ativo à plataforma.
 * - Plano pago (≠ tester): sempre true (vitalício).
 * - Tester/trial: true apenas se accessExpiresAt > agora.
 * - Sem plano: false.
 */
export function hasActiveAccess(user: {
  planKey?: string | null;
  accessExpiresAt?: string | Date | null;
}): boolean {
  if (isLifetimePlan(user.planKey)) return true;
  if (!user.accessExpiresAt) return false;
  return new Date(user.accessExpiresAt) > new Date();
}

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
