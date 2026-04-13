import type { PlanKey } from "@shared/schema";

// ─── Definição completa dos planos Ampla Facial ───────────────────────────────
// Preços em centavos (BRL)

export interface PlanConfig {
  key: PlanKey;
  name: string;
  description: string;
  price: number; // centavos à vista
  installments12x: number | null; // valor de cada parcela em centavos (null = não disponível)
  group: "digital" | "observador" | "vip" | "horas";
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
  // Valor de mercado equivalente (para mostrar valor percebido)
  valorMercado?: number; // centavos

}

export const PLANS: Record<PlanKey, PlanConfig> = {
  modulo_avulso: {
    key: "modulo_avulso",
    name: "Módulo Avulso",
    description: "Escolha 1 módulo e domine aquela técnica com profundidade",
    price: 249000,
    installments12x: null,
    group: "digital",
    features: [
      "1 módulo completo à sua escolha (Toxina, Preenchedores, Bioestimuladores ou Biorregeneradores)",
      "Aulas gravadas com protocolos clínicos detalhados",
      "Materiais científicos complementares do módulo",
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
    name: "Curso Completo",
    description: "Domínio full face — todas as técnicas e procedimentos combinados",
    price: 597000,
    installments12x: 54700,
    group: "digital",
    highlight: "Melhor custo-benefício",
    valorMercado: 996000,
    features: [
      "Curso completo de Toxina, Preenchedores, Bioestimuladores, Biorregeneradores e Método NaturalUp® (Full Face)",
      "Combinação de todas as técnicas e procedimentos para resultado natural",
      "Aulas gravadas com protocolos clínicos completos",
      "Materiais científicos de todos os módulos",
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
    valorMercado: 4000000,
    features: [
      "4 módulos gravados: Toxina, Preenchedores, Bioestimuladores, Regeneradores",
      "Acesso ao portal por 6 meses",
      "24h de observação clínica presencial (~6 turnos de 4h)",
      "8h de prática assistida com pacientes modelo (garantidos)",
      "Supervisão direta do Dr. Gustavo em cada turno",
      "Mentoria individual 1:1 pós-turno",
      "Canal direto exclusivo por 3 meses",
      "Suporte a dúvidas clínicas por 3 meses",
      "Certificado de participação com carga horária",
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
    description: "Mentoria remota de 3 meses com o Dr. Gustavo",
    price: 743000,
    installments12x: null,
    group: "vip",
    valorMercado: 2800000,
    features: [
      "Acompanhamento individual por 3 meses",
      "Canal exclusivo direto com Dr. Gustavo (3 meses)",
      "Suporte a dúvidas clínicas (3 meses)",
      "Encontros quinzenais ao vivo — quartas 10h (3 meses)",
      "Gravações dos encontros",
      "Networking com a turma",
      "4 módulos gravados: Toxina, Preenchedores, Bioestimuladores, Regeneradores",
      "Acesso ao portal por 12 meses",
      "Método NaturalUp® completo (5º módulo exclusivo)",
      "Análise de casos clínicos em grupo",
      "Certificado de conclusão com carga horária",
    ],
    accessDays: 365,
    includesModules: true,
    clinicalHours: 0,
    practiceHours: 0,
    hasDirectChannel: true,
    channelMonths: 3,
    hasMentorship: true,
    mentorshipMonths: 3,
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
    valorMercado: 3500000,
    features: [
      "16h de atendimento presencial com pacientes modelo (4 encontros de 4h)",
      "Supervisão direta do Dr. Gustavo em todos os atendimentos",
      "4 módulos gravados: Toxina, Preenchedores, Bioestimuladores, Regeneradores",
      "Acesso ao portal por 12 meses",
      "Acompanhamento individual por 3 meses",
      "Canal exclusivo direto com Dr. Gustavo (3 meses)",
      "Suporte a dúvidas clínicas por 3 meses",
      "Método NaturalUp® completo (5º módulo exclusivo)",
      "Certificado de conclusão com carga horária",
    ],
    accessDays: 365,
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
    valorMercado: 6000000,
    features: [
      "Tudo do VIP Online (6 meses)",
      "16h de prática presencial com pacientes modelo (4 encontros de 4h)",
      "Supervisão direta do Dr. Gustavo em todos os atendimentos",
      "4 módulos gravados: Toxina, Preenchedores, Bioestimuladores, Regeneradores",
      "Acesso ao portal por 12 meses",
      "Acompanhamento individual por 6 meses",
      "Canal exclusivo direto com Dr. Gustavo (6 meses)",
      "Encontros quinzenais ao vivo — quartas 10h",
      "Gravações de todos os encontros",
      "Networking com a turma",
      "Método NaturalUp® completo (5º módulo exclusivo)",
      "Análise de casos clínicos em grupo",
      "Certificado de conclusão com carga horária",
    ],
    accessDays: 365,
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

  extensao_acompanhamento: {
    key: "extensao_acompanhamento",
    name: "Extensão de Acompanhamento",
    description: "Mais 3 meses de mentoria, canal direto e suporte com o Dr. Gustavo",
    price: 200000,
    installments12x: null,
    group: "vip",
    features: [
      "+3 meses de acompanhamento individual",
      "Canal exclusivo direto com Dr. Gustavo",
      "Suporte a duvidas clinicas",
      "Encontros ao vivo (se disponível na turma)",
      "Acumulável com cashback",
    ],
    accessDays: 0, // Não altera o acesso ao portal
    includesModules: false,
    clinicalHours: 0,
    practiceHours: 0,
    hasDirectChannel: true,
    channelMonths: 3,
    hasMentorship: true,
    mentorshipMonths: 3,
    hasLiveEvents: false,
    hasNaturalUp: false,
    canUpgradeTo: [],
  },

  horas_clinicas_1: {
    key: "horas_clinicas_1",
    name: "1 Encontro Clínico",
    description: "4 horas de atendimento a pacientes modelo com supervisão do Dr. Gustavo",
    price: 100000,
    installments12x: null,
    group: "horas",
    features: [
      "1 encontro de 4 horas",
      "Prática com pacientes modelo",
      "Supervisão direta do Dr. Gustavo",
      "Certificado de carga horária",
    ],
    accessDays: 90,
    includesModules: false,
    clinicalHours: 0,
    practiceHours: 4,
    hasDirectChannel: false,
    channelMonths: 0,
    hasMentorship: false,
    mentorshipMonths: 0,
    hasLiveEvents: false,
    hasNaturalUp: false,
    canUpgradeTo: [],
  },
  horas_clinicas_2: {
    key: "horas_clinicas_2",
    name: "2 Encontros Clínicos",
    description: "8 horas de atendimento a pacientes modelo com supervisão do Dr. Gustavo",
    price: 180000,
    installments12x: null,
    group: "horas",
    features: [
      "2 encontros de 4 horas (8h total)",
      "Economia de R$ 200 vs avulso",
      "Prática com pacientes modelo",
      "Supervisão direta do Dr. Gustavo",
      "Certificado de carga horária",
    ],
    accessDays: 120,
    includesModules: false,
    clinicalHours: 0,
    practiceHours: 8,
    hasDirectChannel: false,
    channelMonths: 0,
    hasMentorship: false,
    mentorshipMonths: 0,
    hasLiveEvents: false,
    hasNaturalUp: false,
    canUpgradeTo: [],
  },
  horas_clinicas_3: {
    key: "horas_clinicas_3",
    name: "3 Encontros Clínicos",
    description: "12 horas de atendimento a pacientes modelo com supervisão do Dr. Gustavo",
    price: 240000,
    installments12x: null,
    group: "horas",
    features: [
      "3 encontros de 4 horas (12h total)",
      "Economia de R$ 600 vs avulso",
      "Prática com pacientes modelo",
      "Supervisão direta do Dr. Gustavo",
      "Certificado de carga horária",
    ],
    accessDays: 180,
    includesModules: false,
    clinicalHours: 0,
    practiceHours: 12,
    hasDirectChannel: false,
    channelMonths: 0,
    hasMentorship: false,
    mentorshipMonths: 0,
    hasLiveEvents: false,
    hasNaturalUp: false,
    canUpgradeTo: [],
  },

  // ─── EXTENSÃO DE OBSERVAÇÃO CLÍNICA ──────────────────────────────────────────
  observacao_extra_1: {
    key: "observacao_extra_1",
    name: "1 Turno de Observação",
    description: "4 horas de observação clínica presencial com o Dr. Gustavo",
    price: 80000,
    installments12x: null,
    group: "observacao_extra",
    features: [
      "1 turno de 4 horas",
      "Observação de procedimentos ao vivo",
      "Discussão de casos em tempo real",
      "Certificado de carga horária",
    ],
    accessDays: 90,
    includesModules: false,
    clinicalHours: 4,
    practiceHours: 0,
    hasDirectChannel: false,
    channelMonths: 0,
    hasMentorship: false,
    mentorshipMonths: 0,
    hasLiveEvents: false,
    hasNaturalUp: false,
    canUpgradeTo: [],
  },
  observacao_extra_2: {
    key: "observacao_extra_2",
    name: "2 Turnos de Observação",
    description: "8 horas de observação clínica presencial com o Dr. Gustavo",
    price: 150000,
    installments12x: null,
    group: "observacao_extra",
    features: [
      "2 turnos de 4 horas (8h total)",
      "Economia de R$ 100 vs avulso",
      "Observação de procedimentos ao vivo",
      "Discussão de casos em tempo real",
      "Certificado de carga horária",
    ],
    accessDays: 120,
    includesModules: false,
    clinicalHours: 8,
    practiceHours: 0,
    hasDirectChannel: false,
    channelMonths: 0,
    hasMentorship: false,
    mentorshipMonths: 0,
    hasLiveEvents: false,
    hasNaturalUp: false,
    canUpgradeTo: [],
  },
  observacao_extra_3: {
    key: "observacao_extra_3",
    name: "4 Turnos de Observação",
    description: "16 horas de observação clínica presencial com o Dr. Gustavo",
    price: 280000,
    installments12x: null,
    group: "observacao_extra",
    features: [
      "4 turnos de 4 horas (16h total)",
      "Economia de R$ 400 vs avulso",
      "Observação de procedimentos ao vivo",
      "Discussão de casos em tempo real",
      "Acompanhamento de diferentes técnicas",
      "Certificado de carga horária",
    ],
    accessDays: 180,
    includesModules: false,
    clinicalHours: 16,
    practiceHours: 0,
    hasDirectChannel: false,
    channelMonths: 0,
    hasMentorship: false,
    mentorshipMonths: 0,
    hasLiveEvents: false,
    hasNaturalUp: false,
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

// ─── Cashback rates por plano ────────────────────────────────────────────────
export const CASHBACK_RATES: Record<PlanKey, number> = {
  modulo_avulso: 0.03,
  pacote_completo: 0.05,
  observador_essencial: 0.05,
  observador_avancado: 0.07,
  observador_intensivo: 0.08,
  imersao: 0.10,
  vip_online: 0.08,
  vip_presencial: 0.10,
  vip_completo: 0.10,
  extensao_acompanhamento: 0.05,
  horas_clinicas_1: 0.05,
  horas_clinicas_2: 0.05,
  horas_clinicas_3: 0.05,
  observacao_extra_1: 0.05,
  observacao_extra_2: 0.05,
  observacao_extra_3: 0.05,
};

// ─── Formatar preço em BRL ───────────────────────────────────────────────────
export function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
