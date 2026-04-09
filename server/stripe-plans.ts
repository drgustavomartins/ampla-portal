import type { PlanKey } from "@shared/schema";

// ─── Definição completa dos planos Ampla Facial ───────────────────────────────
// Preços em centavos (BRL)

export interface PlanConfig {
  key: PlanKey;
  name: string;
  description: string;
  price: number; // centavos à vista
  installments12x: number | null; // valor de cada parcela em centavos (null = não disponível)
  group: "digital" | "observador" | "vip";
  features: string[];
  highlight?: string; // ex: "Mais popular"
  // Regras de acesso no portal
  accessDays: number;
  includesModules: boolean; // todos os 4 módulos gravados
  clinicalHours: number; // horas de observação clínica (0 = nenhuma)
  practiceHours: number; // horas de prática com pacientes modelo (0 = nenhuma)
  hasDirectChannel: boolean; // canal direto com Dr. Gustavo
  channelMonths: number; // duração do canal direto
  hasMentorship: boolean; // acompanhamento individual
  mentorshipMonths: number;
  hasLiveEvents: boolean; // encontros quinzenais ao vivo
  hasNaturalUp: boolean; // método NaturalUp® completo
  // Upgrade — planos que este plano pode ser destino
  canUpgradeTo: PlanKey[];
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  modulo_avulso: {
    key: "modulo_avulso",
    name: "Módulo Avulso",
    description: "Acesso a 1 módulo gravado à escolha por 1 ano",
    price: 249000,
    installments12x: null,
    group: "digital",
    features: [
      "1 módulo gravado à sua escolha",
      "Acesso ao portal por 1 ano",
      "Certificado de participação",
    ],
    accessDays: 365,
    includesModules: false,
    clinicalHours: 0,
    practiceHours: 0,
    hasDirectChannel: false,
    channelMonths: 0,
    hasMentorship: false,
    mentorshipMonths: 0,
    hasLiveEvents: false,
    hasNaturalUp: false,
    canUpgradeTo: ["pacote_completo", "observador_avancado", "observador_intensivo", "imersao", "vip_online", "vip_presencial", "vip_completo"],
  },

  pacote_completo: {
    key: "pacote_completo",
    name: "Pacote Completo",
    description: "Todos os 4 módulos gravados com acesso por 1 ano",
    price: 597000,
    installments12x: 54700,
    group: "digital",
    highlight: "Melhor custo",
    features: [
      "4 módulos gravados (Toxina, Preenchedores, Bioestimuladores, Regeneradores)",
      "Acesso ao portal por 1 ano",
      "Certificado de participação",
    ],
    accessDays: 365,
    includesModules: true,
    clinicalHours: 0,
    practiceHours: 0,
    hasDirectChannel: false,
    channelMonths: 0,
    hasMentorship: false,
    mentorshipMonths: 0,
    hasLiveEvents: false,
    hasNaturalUp: false,
    canUpgradeTo: ["observador_avancado", "observador_intensivo", "imersao", "vip_online", "vip_presencial", "vip_completo"],
  },

  observador_essencial: {
    key: "observador_essencial",
    name: "Observador Essencial",
    description: "24h de observação clínica presencial + 4 módulos",
    price: 499700,
    installments12x: 46700,
    group: "observador",
    features: [
      "4 módulos gravados",
      "Acesso ao portal por 6 meses",
      "24h de observação clínica presencial (~6 turnos de 4h)",
      "Dimensão comercial e gestão",
      "Certificado de participação",
    ],
    accessDays: 180,
    includesModules: true,
    clinicalHours: 24,
    practiceHours: 0,
    hasDirectChannel: false,
    channelMonths: 0,
    hasMentorship: false,
    mentorshipMonths: 0,
    hasLiveEvents: false,
    hasNaturalUp: false,
    canUpgradeTo: ["observador_avancado", "observador_intensivo", "imersao", "vip_completo"],
  },

  observador_avancado: {
    key: "observador_avancado",
    name: "Observador Avançado",
    description: "48h de observação clínica presencial + 4 módulos",
    price: 699700,
    installments12x: 64700,
    group: "observador",
    features: [
      "4 módulos gravados",
      "Acesso ao portal por 6 meses",
      "48h de observação clínica presencial (~12 turnos de 4h)",
      "Dimensão comercial e gestão",
      "Certificado de participação",
    ],
    accessDays: 180,
    includesModules: true,
    clinicalHours: 48,
    practiceHours: 0,
    hasDirectChannel: false,
    channelMonths: 0,
    hasMentorship: false,
    mentorshipMonths: 0,
    hasLiveEvents: false,
    hasNaturalUp: false,
    canUpgradeTo: ["observador_intensivo", "imersao", "vip_completo"],
  },

  observador_intensivo: {
    key: "observador_intensivo",
    name: "Observador Intensivo",
    description: "96h de observação clínica presencial + 4 módulos",
    price: 999700,
    installments12x: 91700,
    group: "observador",
    features: [
      "4 módulos gravados",
      "Acesso ao portal por 6 meses",
      "96h de observação clínica presencial (~24 turnos de 4h)",
      "Dimensão comercial e gestão",
      "Certificado de participação",
    ],
    accessDays: 180,
    includesModules: true,
    clinicalHours: 96,
    practiceHours: 0,
    hasDirectChannel: false,
    channelMonths: 0,
    hasMentorship: false,
    mentorshipMonths: 0,
    hasLiveEvents: false,
    hasNaturalUp: false,
    canUpgradeTo: ["imersao", "vip_completo"],
  },

  imersao: {
    key: "imersao",
    name: "Imersão",
    description: "Observe E pratique com supervisão — ideal para recém-formados",
    price: 1199700,
    installments12x: null,
    group: "observador",
    highlight: "Mais completo para iniciantes",
    features: [
      "4 módulos gravados",
      "Acesso ao portal por 6 meses",
      "24h de observação clínica presencial",
      "8h de prática assistida com pacientes modelo (garantidos)",
      "Supervisão direta do Dr. Gustavo",
      "Mentoria 1:1 pós-turno",
      "Canal direto por 3 meses",
      "Suporte a dúvidas clínicas por 3 meses",
      "Certificado de participação",
    ],
    accessDays: 180,
    includesModules: true,
    clinicalHours: 24,
    practiceHours: 8,
    hasDirectChannel: true,
    channelMonths: 3,
    hasMentorship: false,
    mentorshipMonths: 0,
    hasLiveEvents: false,
    hasNaturalUp: false,
    canUpgradeTo: ["vip_completo"],
  },

  vip_online: {
    key: "vip_online",
    name: "VIP Online",
    description: "Mentoria remota de 6 meses com o Dr. Gustavo",
    price: 743000,
    installments12x: null,
    group: "vip",
    features: [
      "Acompanhamento individual por 6 meses",
      "Canal exclusivo direto com Dr. Gustavo (6 meses)",
      "Suporte a dúvidas clínicas (6 meses)",
      "Encontros quinzenais ao vivo — quartas 10h (6 meses)",
      "Gravações dos encontros",
      "Networking com a turma",
      "Base teórica: Toxina, Preenchedores, Bioestimuladores",
      "Método NaturalUp® completo",
      "Certificado de participação",
    ],
    accessDays: 180,
    includesModules: true,
    clinicalHours: 0,
    practiceHours: 0,
    hasDirectChannel: true,
    channelMonths: 6,
    hasMentorship: true,
    mentorshipMonths: 6,
    hasLiveEvents: true,
    hasNaturalUp: true,
    canUpgradeTo: ["vip_completo"],
  },

  vip_presencial: {
    key: "vip_presencial",
    name: "VIP Presencial",
    description: "16h de prática supervisionada com pacientes modelo",
    price: 1239000,
    installments12x: null,
    group: "vip",
    features: [
      "16h de atendimento presencial com pacientes modelo (4 encontros de 4h)",
      "Supervisão direta do Dr. Gustavo em todos os atendimentos",
      "Acompanhamento individual por 3 meses",
      "Canal exclusivo direto (3 meses)",
      "Suporte a dúvidas clínicas (3 meses)",
      "Método NaturalUp® completo",
      "Certificado de participação",
    ],
    accessDays: 90,
    includesModules: true,
    clinicalHours: 0,
    practiceHours: 16,
    hasDirectChannel: true,
    channelMonths: 3,
    hasMentorship: true,
    mentorshipMonths: 3,
    hasLiveEvents: false,
    hasNaturalUp: true,
    canUpgradeTo: ["vip_completo"],
  },

  vip_completo: {
    key: "vip_completo",
    name: "VIP Completo",
    description: "A formação mais completa — Online + Presencial",
    price: 1735000,
    installments12x: null,
    group: "vip",
    highlight: "Formação completa",
    features: [
      "Tudo do VIP Online (6 meses)",
      "16h de prática presencial com pacientes modelo",
      "Supervisão direta do Dr. Gustavo",
      "Acompanhamento individual por 6 meses",
      "Canal exclusivo direto (6 meses)",
      "Encontros quinzenais ao vivo",
      "Networking com a turma",
      "Método NaturalUp® completo",
      "Certificado de participação",
    ],
    accessDays: 180,
    includesModules: true,
    clinicalHours: 0,
    practiceHours: 16,
    hasDirectChannel: true,
    channelMonths: 6,
    hasMentorship: true,
    mentorshipMonths: 6,
    hasLiveEvents: true,
    hasNaturalUp: true,
    canUpgradeTo: [],
  },
};

// ─── Cálculo de crédito de upgrade ──────────────────────────────────────────
// Regra: até 60 dias = 100% do que pagou; depois = 70%
export function calculateUpgradeCredit(
  amountPaid: number, // centavos
  daysSincePurchase: number,
): number {
  if (daysSincePurchase <= 60) return amountPaid;
  return Math.floor(amountPaid * 0.7);
}

export function calculateUpgradePrice(
  currentPlanKey: PlanKey,
  targetPlanKey: PlanKey,
  amountPaid: number,
  daysSincePurchase: number,
): { credit: number; toPay: number; valid: boolean } {
  const current = PLANS[currentPlanKey];
  const target = PLANS[targetPlanKey];
  if (!current || !target) return { credit: 0, toPay: 0, valid: false };
  if (!current.canUpgradeTo.includes(targetPlanKey)) return { credit: 0, toPay: 0, valid: false };
  if (target.price <= amountPaid) return { credit: 0, toPay: 0, valid: false }; // doesn't make sense

  const credit = calculateUpgradeCredit(amountPaid, daysSincePurchase);
  const toPay = Math.max(0, target.price - credit);
  return { credit, toPay, valid: true };
}

// ─── Formatar preço em BRL ───────────────────────────────────────────────────
export function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
