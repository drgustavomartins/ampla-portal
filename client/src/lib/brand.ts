/**
 * Ampla IA — Configuração central de marca e taxonomia.
 *
 * Este arquivo concentra os textos, módulos e categorias do produto
 * "Ampla IA" (IA aplicada à rotina clínica, administrativa, comercial,
 * educacional e de atendimento para profissionais de saúde).
 *
 * A área de membros antiga (Ampla Facial / harmonização) foi preservada
 * estruturalmente: rotas, login, dashboard, módulos, progresso, plano,
 * comunidade e integrações continuam funcionando como antes. O que mudou
 * são os textos, a taxonomia de categorias e a identidade superficial.
 *
 * Dados clínicos/operacionais reais (módulos e aulas no banco) continuam
 * sendo administrados via painel admin — esta config é apenas a camada
 * de marca/UX. Mantemos compatibilidade com módulos antigos no banco para
 * que nada deixe de funcionar antes do conteúdo ser migrado.
 */

export const BRAND = {
  name: "Ampla IA",
  shortName: "AMPLA IA",
  tagline: "IA aplicada à rotina do profissional de saúde",
  founder: "Dr. Gustavo Martins",
  founderTitle: "Cirurgião-dentista — IA na Saúde",
  domain: "portal.amplafacial.com.br", // mantido inalterado por orientação
  copyrightLine: "© 2026 Ampla IA — Todos os direitos reservados",
  legacyName: "Ampla Facial", // referência histórica; não usar em copy nova
} as const;

/**
 * Eixos (categorias) do Ampla IA — substituem as antigas categorias de HOF
 * (Toxina, Preenchedores, Bioestimuladores, Moduladores, NaturalUp).
 *
 * O `keywords` é usado para auto-classificar módulos vindos do banco
 * por título, de modo que módulos cadastrados pelo admin sejam
 * automaticamente agrupados em uma das categorias do novo produto.
 *
 * Caso um módulo antigo de HOF ainda exista no banco, ele continuará
 * sendo exibido — mas ficará fora das fileiras categorizadas até ser
 * renomeado/migrado pelo admin.
 */
export interface BrandCategory {
  /** Slug interno usado em CSS / lookup */
  key: string;
  /** Título exibido nas fileiras do dashboard */
  title: string;
  /** Emoji curto para o cabeçalho da fileira */
  emoji: string;
  /** Termos no título do módulo que indicam pertencer a esta categoria */
  keywords: string[];
  /** Descrição curta usada como fallback no card do módulo */
  description: string;
}

export const BRAND_CATEGORIES: BrandCategory[] = [
  {
    key: "clinica",
    title: "IA na Rotina Clínica",
    emoji: "🩺",
    keywords: [
      "clinic",
      "anamnese",
      "diagnost",
      "prontuario",
      "prontuário",
      "evolucao",
      "evolução",
      "exame",
    ],
    description:
      "Uso de IA no apoio à anamnese, organização de prontuário e raciocínio clínico — sempre com supervisão profissional.",
  },
  {
    key: "atendimento",
    title: "IA no Atendimento ao Paciente",
    emoji: "💬",
    keywords: [
      "atendimento",
      "paciente",
      "comunicac",
      "comunicação",
      "whatsapp",
      "chatbot",
      "recepcao",
      "recepção",
      "agendamento",
    ],
    description:
      "Como usar IA para padronizar comunicação, responder dúvidas comuns e melhorar a experiência do paciente.",
  },
  {
    key: "administrativo",
    title: "IA na Gestão e Administrativo",
    emoji: "📊",
    keywords: [
      "gestao",
      "gestão",
      "administr",
      "financeir",
      "agenda",
      "processo",
      "operacao",
      "operação",
      "fluxo",
    ],
    description:
      "Automação de tarefas administrativas, análise de dados de clínica, agenda e fluxos operacionais com IA.",
  },
  {
    key: "comercial",
    title: "IA Comercial e Marketing",
    emoji: "📈",
    keywords: [
      "marketing",
      "vendas",
      "comercial",
      "captacao",
      "captação",
      "lead",
      "anuncio",
      "anúncio",
      "trafego",
      "tráfego",
      "instagram",
      "midia",
      "mídia",
    ],
    description:
      "IA aplicada a marketing, conteúdo, captação ética de pacientes e análise de funil comercial.",
  },
  {
    key: "educacao",
    title: "IA para Estudo e Educação",
    emoji: "📚",
    keywords: [
      "estudo",
      "educa",
      "aprend",
      "artigo",
      "pesquisa",
      "evidenc",
      "evidência",
      "literatura",
      "resumo",
      "leitura",
    ],
    description:
      "Como usar IA para acelerar leitura de artigos, criar resumos, estudar com mais qualidade e gerar material educativo.",
  },
  {
    key: "etica",
    title: "Ética, LGPD e Limites da IA",
    emoji: "🛡️",
    keywords: [
      "etic",
      "ética",
      "lgpd",
      "privacid",
      "regula",
      "limit",
      "responsab",
      "seguranc",
      "segurança",
    ],
    description:
      "Princípios éticos, LGPD, limites do uso da IA na saúde e responsabilidade profissional.",
  },
];

/**
 * Módulos exibidos como vitrine no login (coluna direita).
 * Lista estática — não depende do banco. Reflete a arquitetura do novo
 * produto e serve como prévia do que o aluno encontrará por dentro.
 */
export const BRAND_SHOWCASE_MODULES: { title: string }[] = [
  { title: "Boas-vindas — IA para a sua prática" },
  { title: "IA na Rotina Clínica" },
  { title: "IA no Atendimento ao Paciente" },
  { title: "IA na Gestão e Administrativo" },
  { title: "IA Comercial e Marketing" },
  { title: "IA para Estudo e Educação" },
  { title: "Ética, LGPD e Limites da IA" },
];

/**
 * Fallback de descrição usado nos cards de módulo quando o admin não
 * preencheu `description`. Roteia por palavra-chave para uma das
 * categorias do Ampla IA. Mantém um fallback final genérico.
 */
export function getBrandModuleDescription(title: string): string {
  const t = (title || "").toLowerCase();
  for (const cat of BRAND_CATEGORIES) {
    if (cat.keywords.some((kw) => t.includes(kw))) return cat.description;
  }
  if (t.includes("ia ") || t.includes(" ia") || t.includes("inteligência") || t.includes("inteligencia")) {
    return "Conteúdo aplicado de IA para profissionais de saúde.";
  }
  if (t.includes("boas vindas") || t.includes("boas-vindas") || t.includes("introdu")) {
    return "Boas-vindas e visão geral do percurso Ampla IA.";
  }
  return `Conteúdo exclusivo do ${BRAND.name}.`;
}

/**
 * Devolve a categoria associada a um módulo, ou null se nenhum match.
 * Usado pelo dashboard para construir fileiras categorizadas.
 */
export function classifyModuleToCategory(title: string): BrandCategory | null {
  const t = (title || "").toLowerCase();
  for (const cat of BRAND_CATEGORIES) {
    if (cat.keywords.some((kw) => t.includes(kw))) return cat;
  }
  return null;
}

/**
 * Disclaimer padrão a ser exibido em superfícies onde se discutem aplicações
 * de IA em decisões de saúde. Importante por orientação do produto: nada de
 * promessas clínicas automáticas.
 */
export const BRAND_AI_DISCLAIMER =
  "A IA é uma ferramenta de apoio. Nenhum conteúdo aqui substitui o julgamento clínico do profissional, exames complementares ou diretrizes oficiais. Use com responsabilidade e respeite a LGPD.";
