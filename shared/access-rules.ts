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
