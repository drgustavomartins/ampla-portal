import type { PlanKey } from "@shared/schema";

// ─── Definição completa dos planos Ampla Facial ───────────────────────────────
// Preços em centavos (BRL)

export interface PlanConfig {
  key: PlanKey;
  name: string;
  description: string;
  price: number; // centavos à vista
  installments12x: number | null; // valor de cada parcela em centavos (null = não disponível)
  group: "digital" | "observador" | "vip" | "horas" | "observacao_extra";
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
  hasLiveEvents: boolean; // sessões quinzenais de acompanhamento ao vivo
  hasNaturalUp: boolean; // aprende o método NaturalUp®
  naturalUpLicense: boolean; // licença para USAR a marca NaturalUp® (logo + nome) — só Elite
  // Visibilidade
  hidden?: boolean; // true = não exibir em páginas públicas de planos (ex: workshop invite-only)
  // Upgrade — planos que este plano pode ser destino
  canUpgradeTo: PlanKey[];
  // Valor de mercado equivalente (para mostrar valor percebido)
  valorMercado?: number; // centavos

}

export const PLANS: Record<PlanKey, PlanConfig> = {
  tester: {
    key: "tester",
    name: "Trial",
    description: "Acesso trial de 7 dias ao portal com as 2 primeiras aulas de cada módulo",
    price: 0,
    installments12x: null,
    group: "digital",
    hidden: true,
    features: [
      "2 primeiras aulas de cada módulo",
      "Acesso ao portal por tempo indeterminado",
      "Conheça a metodologia Ampla Facial",
    ],
    accessDays: 0,
    includesModules: false,
    clinicalHours: 0,
    practiceHours: 0,
    hasDirectChannel: false,
    channelMonths: 0,
    hasMentorship: false,
    mentorshipMonths: 0,
    hasLiveEvents: false,
    hasNaturalUp: false,
    naturalUpLicense: false,
    canUpgradeTo: ["acesso_vitalicio", "modulo_avulso", "pacote_completo", "observador_essencial", "observador_avancado", "observador_intensivo", "imersao", "vip_online", "vip_presencial", "vip_completo"],
  },
  acesso_vitalicio: {
    key: "acesso_vitalicio",
    name: "Acesso Vitalício",
    description: "Apenas aulas gravadas e materiais complementares — sem encontros ao vivo, sem mentoria, sem suporte",
    price: 39700,
    installments12x: 3308,
    group: "digital",
    highlight: "Promo até 30/04",
    valorMercado: 593790,
    features: [
      "Todos os 4 módulos completos (60+ aulas gravadas)",
      "Materiais científicos complementares",
      "Acesso vitalício — assista no seu ritmo, sem prazo",
      "Atualizações futuras das aulas incluídas",
      "Sem acompanhamento ao vivo (apenas aulas gravadas)",
      "Sem canal direto, sem suporte a dúvidas",
      "Sem acesso à comunidade do portal",
      "Sem certificado",
      "Apenas assistir as aulas — decisão clínica é responsabilidade do aluno",
    ],
    accessDays: 36500,
    includesModules: true,
    clinicalHours: 0,
    practiceHours: 0,
    hasDirectChannel: false,
    channelMonths: 0,
    hasMentorship: false,
    mentorshipMonths: 0,
    hasLiveEvents: false,
    hasNaturalUp: false,
    naturalUpLicense: false,
    canUpgradeTo: ["observador_essencial", "observador_avancado", "observador_intensivo", "imersao", "vip_online", "vip_presencial", "vip_completo", "imersao_elite"],
  },
  modulo_avulso: {
    key: "modulo_avulso",
    name: "Módulo Avulso",
    description: "Escolha 1 módulo e domine aquela técnica com profundidade",
    price: 249000,
    installments12x: null,
    group: "digital",
    hidden: true,
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
    naturalUpLicense: false,
    canUpgradeTo: ["pacote_completo", "observador_avancado", "observador_intensivo", "imersao", "vip_online", "vip_presencial", "vip_completo"],
  },

  pacote_completo: {
    key: "pacote_completo",
    name: "Curso Online",
    description: "Todos os módulos online — estude no seu ritmo",
    price: 597000,
    installments12x: 54700,
    group: "digital",
    hidden: true,
    highlight: "Melhor custo-benefício",
    valorMercado: 996000,
    features: [
      "Todos os módulos: Toxina, Preenchedores, Bioestimuladores, Biorregeneradores e NaturalUp®",
      "Aulas gravadas com protocolos clínicos completos",
      "Materiais científicos de todos os módulos",
      "Acesso ao portal por 1 ano",
      "Certificado de participação",
      "Acesso exclusivamente online — sem prática presencial",
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
    naturalUpLicense: false,
    canUpgradeTo: ["observador_avancado", "observador_intensivo", "imersao", "vip_online", "vip_presencial", "vip_completo", "imersao_elite"],
  },

  observador_essencial: {
    key: "observador_essencial",
    name: "Observador Essencial",
    description: "24h de observação clínica presencial + 4 módulos",
    price: 499700,
    installments12x: 46700,
    group: "observador",
    hidden: true,
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
    hasLiveEvents: true,
    hasNaturalUp: false,
    naturalUpLicense: false,
    canUpgradeTo: ["observador_avancado", "observador_intensivo", "imersao", "vip_completo", "imersao_elite"],
  },

  observador_avancado: {
    key: "observador_avancado",
    name: "Observador Avançado",
    description: "48h de observação clínica presencial + 4 módulos",
    price: 699700,
    installments12x: 64700,
    group: "observador",
    hidden: true,
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
    hasLiveEvents: true,
    hasNaturalUp: false,
    naturalUpLicense: false,
    canUpgradeTo: ["observador_intensivo", "imersao", "vip_completo", "imersao_elite"],
  },

  observador_intensivo: {
    key: "observador_intensivo",
    name: "Observador Intensivo",
    description: "96h de observação clínica presencial + 4 módulos",
    price: 999700,
    installments12x: 91700,
    group: "observador",
    hidden: true,
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
    hasLiveEvents: true,
    hasNaturalUp: false,
    naturalUpLicense: false,
    canUpgradeTo: ["imersao", "vip_completo", "imersao_elite"],
  },

  imersao: {
    key: "imersao",
    name: "Imersão",
    description: "Observe E pratique com supervisão — ideal para recém-formados",
    price: 1199700,
    installments12x: null,
    group: "observador",
    hidden: true,
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
    hasLiveEvents: true,
    hasNaturalUp: false,
    naturalUpLicense: false,
    canUpgradeTo: ["vip_completo", "imersao_elite"],
  },

  vip_online: {
    key: "vip_online",
    name: "VIP Online",
    description: "Mentoria remota de 3 meses com o Dr. Gustavo",
    price: 743000,
    installments12x: null,
    group: "vip",
    hidden: true,
    valorMercado: 2800000,
    features: [
      "Acompanhamento individual por 3 meses",
      "Canal exclusivo direto com Dr. Gustavo (3 meses)",
      "Suporte a dúvidas clínicas (3 meses)",
      "Acompanhamento quinzenal ao vivo — aulona em grupo + tira-dúvidas (3 meses)",
      "Ganhe créditos na plataforma por participação ativa no acompanhamento",
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
    naturalUpLicense: false,
    canUpgradeTo: ["vip_completo", "imersao_elite"],
  },

  vip_presencial: {
    key: "vip_presencial",
    name: "VIP Presencial",
    description: "16h de prática supervisionada com pacientes modelo",
    price: 1239000,
    installments12x: null,
    group: "vip",
    hidden: true,
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
    hasLiveEvents: true,
    hasNaturalUp: true,
    naturalUpLicense: false,
    canUpgradeTo: ["vip_completo", "imersao_elite"],
  },

  // ATENÇÃO: VIP Completo APRENDE o método NaturalUp® mas NÃO recebe licença
  // para usar a marca/logo. Direitos de uso da marca só no plano Imersão Elite.
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
      "Acompanhamento quinzenal ao vivo — aulona em grupo + tira-dúvidas",
      "Ganhe créditos na plataforma por participação ativa no acompanhamento",
      "Gravações de todos os encontros",
      "Networking com a turma",
      "Aprende o método NaturalUp® completo (5º módulo exclusivo)",
      "Licença de uso da marca NaturalUp® não inclusa — exclusiva da Imersão Elite",
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
    naturalUpLicense: false,
    canUpgradeTo: ["imersao_elite"],
  },

  // ─── IMERSÃO ELITE ─ Top tier, bastidores + 32h prática ──────────────────
  imersao_elite: {
    key: "imersao_elite",
    name: "Imersão Elite",
    description: "Os bastidores da Clínica Gustavo Martins — acompanhamento 360°",
    price: 3500000,
    installments12x: 291667,
    group: "vip",
    highlight: "Experiência definitiva",
    valorMercado: 12000000,
    features: [
      "Tudo da Mentoria VIP Completa, acumulativo",
      "32h de prática hands-on com pacientes modelo (o dobro da VIP)",
      "7 dias clínicos completos de acompanhamento ao lado do Dr. Gustavo",
      "1 ANO de acompanhamento direto — tudo que surgir no caminho, você vive",
      "Aprenda toda a rotina: atendimento, burocracia, administração e bastidores",
      "Observe como filmamos vídeos e criamos conteúdo",
      "Acesso aos processos internos da Clínica Gustavo Martins",
      "Acompanhamento individual por 12 meses",
      "Canal direto prioritário com Dr. Gustavo (12 meses)",
      "Acompanhamento quinzenal ao vivo por 12 meses — aulona em grupo + tira-dúvidas",
      "Ganhe créditos na plataforma por participação ativa no acompanhamento",
      "Acesso VIP à comunidade do portal com créditos",
      "Método NaturalUp® completo + protocolos exclusivos",
      "Licença oficial de uso da marca e logo NaturalUp® em seu consultório",
      "Único plano com direito a usar a marca NaturalUp®",
      "Certificado premium com carga horária total",
    ],
    accessDays: 365,
    includesModules: true,
    clinicalHours: 56, // 7 dias × 8h = 56h de shadow clínico
    practiceHours: 32,
    hasDirectChannel: true,
    channelMonths: 12,
    hasMentorship: true,
    mentorshipMonths: 12,
    hasLiveEvents: true,
    hasNaturalUp: true,
    naturalUpLicense: true,
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
    naturalUpLicense: false,
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
    naturalUpLicense: false,
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
    naturalUpLicense: false,
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
    naturalUpLicense: false,
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
    naturalUpLicense: false,
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
    naturalUpLicense: false,
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
    naturalUpLicense: false,
    canUpgradeTo: [],
  },
  workshop: {
    key: "workshop",
    name: "Workshop",
    description: "Acesso completo via convite de workshop",
    price: 0,
    installments12x: null,
    group: "digital",
    hidden: true,
    features: [
      "Acesso completo a todos os módulos",
      "Todas as aulas disponíveis",
      "Acesso por tempo limitado (convite)",
    ],
    accessDays: 7,
    includesModules: true,
    clinicalHours: 0,
    practiceHours: 0,
    hasDirectChannel: false,
    channelMonths: 0,
    hasMentorship: false,
    mentorshipMonths: 0,
    hasLiveEvents: false,
    hasNaturalUp: false,
    naturalUpLicense: false,
    canUpgradeTo: ["modulo_avulso", "pacote_completo", "observador_essencial", "observador_avancado", "observador_intensivo", "imersao", "vip_online", "vip_presencial", "vip_completo"],
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
  tester: 0,
  acesso_vitalicio: 0.05,
  modulo_avulso: 0.03,
  pacote_completo: 0.05,
  observador_essencial: 0.05,
  observador_avancado: 0.07,
  observador_intensivo: 0.08,
  imersao: 0.10,
  vip_online: 0.08,
  vip_presencial: 0.10,
  vip_completo: 0.10,
  imersao_elite: 0.10,
  extensao_acompanhamento: 0.05,
  horas_clinicas_1: 0.05,
  horas_clinicas_2: 0.05,
  horas_clinicas_3: 0.05,
  observacao_extra_1: 0.05,
  observacao_extra_2: 0.05,
  observacao_extra_3: 0.05,
  workshop: 0,
};

// ─── Formatar preço em BRL ───────────────────────────────────────────────────
export function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Filtros de viabilidade por plano atual do aluno ───────────────────────
// Regra: o aluno só deve ver produtos que somam valor real ao plano atual dele.
// - Não oferecer downgrade.
// - Não oferecer add-ons que já estão inclusos no plano atual.
// - Não oferecer módulos avulsos para quem já tem os módulos.
export function isPlanVisibleForStudent(
  targetKey: PlanKey,
  currentKey: PlanKey | null,
): boolean {
  const target = PLANS[targetKey];
  if (!target) return false;
  if (target.hidden) return false;

  // Aluno sem plano ou em trial: vê tudo.
  if (!currentKey || currentKey === "tester" || currentKey === "workshop") return true;

  const current = PLANS[currentKey];
  if (!current) return true;

  // O próprio plano atual não aparece como "compre de novo".
  if (targetKey === currentKey) return false;

  // ─── HORAS EXTRAS DE PRÁTICA CLÍNICA (hands-on em pacientes modelo) ──────────
  // Regra: só quem tem prática inclusa no plano pode comprar prática extra.
  // Elite já tem 32h de prática — posição de topo, não oferece extras.
  // Vitalício, Curso Completo, Observador: não têm prática no contrato, então não compram extra.
  if (targetKey === "horas_clinicas_1" || targetKey === "horas_clinicas_2" || targetKey === "horas_clinicas_3") {
    if (currentKey === "imersao_elite") return false;
    return current.practiceHours > 0;
  }

  // ─── OBSERVAÇÃO CLÍNICA EXTRA (turnos adicionais de shadow) ────────────────
  // Regra: a partir do plano Observador em diante — qualquer plano com clinicalHours > 0.
  // Elite já tem shadow completo, não oferece extras.
  // Vitalício e Curso Completo: não têm observação no contrato.
  if (targetKey.startsWith("observacao_extra_")) {
    if (currentKey === "imersao_elite") return false;
    return current.clinicalHours > 0;
  }

  // Extensão de acompanhamento: só para quem tem mentoria ativa.
  if (targetKey === "extensao_acompanhamento") {
    return current.hasMentorship;
  }

  // Módulo avulso: só para quem ainda não tem os módulos completos.
  if (targetKey === "modulo_avulso") {
    return !current.includesModules;
  }

  // Planos principais (digital/observador/vip): só aparecem se forem upgrade real.
  // Regra: tem que estar em canUpgradeTo OU ser estritamente mais caro que o atual.
  if (current.canUpgradeTo.includes(targetKey)) return true;
  if (target.price <= current.price) return false;
  return false;
}

export function filterVisiblePlans(
  allKeys: PlanKey[],
  currentKey: PlanKey | null,
): PlanKey[] {
  return allKeys.filter((k) => isPlanVisibleForStudent(k, currentKey));
}
