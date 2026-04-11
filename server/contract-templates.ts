// ─── Per-plan contract templates for Ampla Facial portal ─────────────────────
import { PLANS } from "./stripe-plans";

const COMPANY = {
  name: "Instituto Medeiros Martins LTDA",
  cnpj: "50.421.964/0001-81",
  address: "Avenida das Americas 1155, sala 1610, Rio de Janeiro/RJ",
  responsible: "Dr. Gustavo Martins",
};

export interface ContractData {
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  startDate: string;
}

// ─── Security helpers ───────────────────────────────────────────────────────
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Backwards-compat helpers ────────────────────────────────────────────────
export function getContractGroup(planKey: string): string {
  if (["modulo_avulso", "pacote_completo"].includes(planKey)) return "digital";
  if (["observador_essencial", "observador_avancado", "observador_intensivo", "imersao"].includes(planKey)) return "observacao";
  if (["vip_online", "vip_presencial", "vip_completo", "extensao_acompanhamento"].includes(planKey)) return "vip";
  if (planKey.startsWith("horas_clinicas")) return "horas";
  return "digital";
}

export const CONTRACT_GROUP_LABELS: Record<string, string> = {
  digital: "Digital",
  observacao: "Observação",
  vip: "VIP",
  horas: "Horas Clínicas",
};

// ─── Formatting helpers ──────────────────────────────────────────────────────
function fmtBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function accessLabel(days: number): string {
  if (days >= 365) return "12 (doze) meses";
  if (days >= 180) return "6 (seis) meses";
  if (days >= 120) return "4 (quatro) meses";
  if (days >= 90) return "3 (três) meses";
  return `${days} dias corridos`;
}

function monthsLabel(m: number): string {
  if (m === 1) return "1 (um) mês";
  if (m === 2) return "2 (dois) meses";
  if (m === 3) return "3 (três) meses";
  if (m === 6) return "6 (seis) meses";
  if (m === 12) return "12 (doze) meses";
  return `${m} meses`;
}

// ─── Main export ─────────────────────────────────────────────────────────────
export function getContractHTML(planKey: string, data: ContractData): string {
  const plan = PLANS[planKey as keyof typeof PLANS];
  if (!plan) return "<p>Plano não encontrado</p>";

  const hasPresential = plan.clinicalHours > 0 || plan.practiceHours > 0;
  const isHorasGroup = plan.group === "horas";
  let clauseNum = 0;
  const nextClause = () => ++clauseNum;

  // ─── Build body ────────────────────────────────────────────────────────────

  let body = "";

  // Header
  body += `
<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS</h1>
<p style="text-align:center;color:#666;margin-bottom:8px;">${plan.name}</p>
<p style="text-align:center;color:#999;margin-bottom:24px;font-size:12px;">Ampla Facial — Harmonização Orofacial</p>
`;

  // Parties
  body += `
<h2>DAS PARTES</h2>
<p><strong>CONTRATANTE:</strong> ${COMPANY.name}, inscrita no CNPJ sob nº ${COMPANY.cnpj}, com sede em ${COMPANY.address}, doravante denominada <strong>AMPLA FACIAL</strong>, representada pelo ${COMPANY.responsible}.</p>
<p><strong>CONTRATADO(A):</strong> ${escapeHtml(data.studentName)}, e-mail ${escapeHtml(data.studentEmail)}${data.studentPhone ? `, telefone ${escapeHtml(data.studentPhone)}` : ""}, doravante denominado(a) <strong>ALUNO(A)</strong>.</p>
`;

  // ─── Cláusula 1 — Objeto ────────────────────────────────────────────────────
  const c1 = nextClause();
  body += `<h2>Cláusula ${c1} — Do Objeto</h2>`;

  if (isHorasGroup) {
    body += `<p>O presente contrato tem por objeto a prestação de serviços de treinamento clínico presencial sob supervisão do ${COMPANY.responsible}, consistindo no plano <strong>${plan.name}</strong>, com os seguintes entregáveis:</p>`;
  } else {
    body += `<p>O presente contrato tem por objeto a prestação de serviços educacionais na área de Harmonização Orofacial, consistindo no plano <strong>${plan.name}</strong> da plataforma Ampla Facial, com os seguintes entregáveis:</p>`;
  }

  // Features from plan
  body += `<ul>${plan.features.map(f => `<li>${f}</li>`).join("")}</ul>`;

  // Derived deliverables from plan config (only those not already obvious from features)
  const extras: string[] = [];
  if (plan.includesModules) {
    extras.push(`Acesso a módulos gravados por ${accessLabel(plan.accessDays)}`);
  }
  if (plan.hasMentorship && plan.mentorshipMonths > 0) {
    extras.push(`Acompanhamento individual (mentoria) por ${monthsLabel(plan.mentorshipMonths)}`);
  }
  if (plan.hasLiveEvents) {
    const dur = plan.mentorshipMonths || plan.channelMonths || 3;
    extras.push(`Encontros quinzenais ao vivo às quartas-feiras, das 10h às 11h30, por ${monthsLabel(dur)}`);
  }
  if (plan.practiceHours > 0) {
    extras.push(`${plan.practiceHours} horas de prática presencial com pacientes modelo sob supervisão direta do ${COMPANY.responsible}`);
  }
  if (plan.clinicalHours > 0) {
    extras.push(`${plan.clinicalHours} horas de observação clínica presencial`);
  }
  if (plan.hasDirectChannel && plan.channelMonths > 0) {
    extras.push(`Canal direto exclusivo com ${COMPANY.responsible} por ${monthsLabel(plan.channelMonths)}`);
  }
  if (plan.hasNaturalUp) {
    extras.push("Acesso ao Método NaturalUp® completo (módulo exclusivo)");
  }
  if (extras.length > 0) {
    body += `<p>Em particular, o plano contratado garante:</p>`;
    body += `<ul>${extras.map(e => `<li>${e}</li>`).join("")}</ul>`;
  }

  // ─── Cláusula 2 — Prazo de Acesso ──────────────────────────────────────────
  const c2 = nextClause();
  body += `<h2>Cláusula ${c2} — Do Prazo de Acesso</h2>`;

  if (plan.accessDays > 0) {
    body += `<p>O acesso ao portal será de <strong>${accessLabel(plan.accessDays)}</strong> a partir da data de ativação (${escapeHtml(data.startDate)}), podendo ser renovado mediante nova contratação.</p>`;
  }
  if (plan.hasMentorship && plan.mentorshipMonths > 0) {
    body += `<p>O acompanhamento individual (mentoria) terá duração de <strong>${monthsLabel(plan.mentorshipMonths)}</strong> a partir da data de ativação.</p>`;
  }
  if (plan.hasDirectChannel && plan.channelMonths > 0) {
    body += `<p>O canal direto exclusivo terá duração de <strong>${monthsLabel(plan.channelMonths)}</strong> a partir da data de ativação.</p>`;
  }
  if (isHorasGroup) {
    body += `<p>As horas de prática adquiridas devem ser utilizadas dentro do prazo de <strong>${accessLabel(plan.accessDays)}</strong> a partir da data de ativação. Horas não utilizadas dentro deste prazo serão perdidas, sem direito a reembolso.</p>`;
    body += `<p>As sessões devem ser agendadas com antecedência mínima de 7 (sete) dias úteis, de acordo com a disponibilidade da clínica e do supervisor.</p>`;
  }

  // ─── Cláusula 3 — Valor e Pagamento ────────────────────────────────────────
  const c3 = nextClause();
  body += `<h2>Cláusula ${c3} — Do Valor e Pagamento</h2>`;
  body += `<p>O(A) ALUNO(A) pagará à AMPLA FACIAL o valor de <strong>${fmtBRL(plan.price)}</strong> (${plan.name}), mediante pagamento via plataforma digital (cartão de crédito, PIX ou boleto bancário) processado pelo sistema Stripe.</p>`;
  if (plan.installments12x) {
    body += `<p>Opção de parcelamento: até 12x de ${fmtBRL(plan.installments12x)}.</p>`;
  }
  body += `<p>O pagamento integral é condição para a liberação do acesso ao conteúdo e serviços contratados.</p>`;

  // ─── Cláusula 4 — Obrigações do Contratante ───────────────────────────────
  const c4 = nextClause();
  body += `<h2>Cláusula ${c4} — Das Obrigações da AMPLA FACIAL</h2>`;
  body += `<p>a) Disponibilizar o conteúdo e serviços contratados conforme descrito na Cláusula ${c1}, de forma organizada e com qualidade técnica adequada.</p>`;
  if (plan.accessDays > 0) {
    body += `<p>b) Manter o portal acessível durante o período contratado, ressalvadas manutenções programadas e eventos de força maior.</p>`;
  }
  if (plan.hasMentorship) {
    body += `<p>c) Disponibilizar o acompanhamento individual pelo ${COMPANY.responsible} pelo período estipulado, com respostas em até 48 horas em dias úteis.</p>`;
  }
  if (plan.hasLiveEvents) {
    body += `<p>d) Realizar os encontros quinzenais ao vivo conforme calendário divulgado, disponibilizando as gravações no portal.</p>`;
  }
  if (hasPresential) {
    body += `<p>e) Garantir supervisão presencial qualificada pelo ${COMPANY.responsible} durante todas as sessões clínicas.</p>`;
  }
  body += `<p>f) Fornecer certificado de participação ou conclusão ao término do programa, quando aplicável.</p>`;
  body += `<p>g) Proteger os dados pessoais do(a) ALUNO(A) nos termos da LGPD.</p>`;

  // ─── Cláusula 5 — Obrigações do Contratado ────────────────────────────────
  const c5 = nextClause();
  body += `<h2>Cláusula ${c5} — Das Obrigações do(a) ALUNO(A)</h2>`;
  body += `<p>a) Efetuar o pagamento integral na forma estipulada.</p>`;
  body += `<p>b) Utilizar o conteúdo exclusivamente para fins pessoais e de aprendizado profissional.</p>`;
  body += `<p>c) Não compartilhar credenciais de acesso com terceiros, sob pena de cancelamento imediato sem reembolso.</p>`;
  body += `<p>d) Não reproduzir, copiar, distribuir ou comercializar o conteúdo do curso, total ou parcialmente, em qualquer meio ou formato.</p>`;
  body += `<p>e) Manter seus dados cadastrais atualizados na plataforma.</p>`;

  if (hasPresential) {
    body += `<p>f) <strong>Confidencialidade dos pacientes:</strong> Manter sigilo absoluto sobre todas as informações dos pacientes observados ou atendidos, incluindo identidade, procedimentos realizados, prontuário, imagens e dados clínicos, nos termos do Código de Ética profissional aplicável e da LGPD.</p>`;
    body += `<p>g) <strong>Conduta profissional:</strong> Manter postura ética e profissional durante toda a permanência na clínica, respeitando a equipe, os pacientes e os protocolos internos.</p>`;
    body += `<p>h) <strong>Vestimenta:</strong> Comparecer às sessões presenciais com traje adequado ao ambiente clínico (jaleco branco limpo, calçado fechado, sem adornos nas mãos e antebraços).</p>`;
    body += `<p>i) <strong>Pontualidade:</strong> Respeitar os horários agendados. Atrasos superiores a 15 minutos poderão resultar no cancelamento da sessão${isHorasGroup ? ", com perda das horas correspondentes" : ""}.</p>`;
    body += `<p>j) <strong>Proibição de registro:</strong> É estritamente proibido fotografar, filmar ou gravar áudio de pacientes ou procedimentos durante as sessões clínicas sem autorização prévia por escrito.</p>`;
  }

  if (plan.practiceHours > 0) {
    body += `<p>${hasPresential ? "k" : "f"}) <strong>Habilitação profissional:</strong> O(A) ALUNO(A) declara possuir habilitação profissional válida (CRO/CRM ativo) para a realização dos procedimentos estéticos e assume responsabilidade técnica solidária pelos atendimentos realizados sob supervisão.</p>`;
    body += `<p>${hasPresential ? "l" : "g"}) <strong>Consentimento dos pacientes:</strong> O(A) ALUNO(A) está ciente de que os pacientes modelo assinaram Termo de Consentimento Livre e Esclarecido (TCLE) específico, e compromete-se a respeitá-lo integralmente.</p>`;
  }

  if (plan.hasLiveEvents) {
    body += `<p>${plan.practiceHours > 0 ? "m" : hasPresential ? "k" : "f"}) <strong>Encontros ao vivo:</strong> Comparecer aos encontros quinzenais agendados. Faltas não geram direito a reposição individual; as gravações estarão disponíveis no portal.</p>`;
  }

  if (plan.hasMentorship || plan.hasDirectChannel) {
    body += `<p><strong>Canal direto e mentoria:</strong> O canal direto é destinado exclusivamente a dúvidas clínicas, discussão de casos e orientação profissional. É proibido gravar, capturar tela ou reproduzir o conteúdo das sessões privadas sem autorização prévia por escrito.</p>`;
  }

  // ─── Cláusula 6 — Propriedade Intelectual ──────────────────────────────────
  const c6 = nextClause();
  body += `<h2>Cláusula ${c6} — Da Propriedade Intelectual</h2>`;
  body += `<p>Todo o conteúdo disponibilizado pela AMPLA FACIAL — incluindo vídeos, materiais didáticos, protocolos clínicos, metodologias, o Método NaturalUp®, marcas, logotipos e quaisquer outros materiais — é de propriedade exclusiva da AMPLA FACIAL e está protegido pela legislação brasileira de direitos autorais e propriedade intelectual (Lei nº 9.610/1998).</p>`;
  body += `<p>A contratação confere exclusivamente o direito de uso pessoal durante o período de acesso, não implicando cessão ou licenciamento de direitos de qualquer natureza. A violação dos direitos de propriedade intelectual sujeitará o(a) infrator(a) às sanções civis e penais cabíveis.</p>`;

  // ─── Cláusula 7 — Cancelamento ─────────────────────────────────────────────
  const c7 = nextClause();
  body += `<h2>Cláusula ${c7} — Do Cancelamento e Reembolso</h2>`;
  body += `<p>a) O(A) ALUNO(A) poderá solicitar o cancelamento e reembolso integral no prazo de <strong>7 (sete) dias corridos</strong> após a ativação do acesso, nos termos do art. 49 do Código de Defesa do Consumidor.</p>`;
  if (isHorasGroup) {
    body += `<p>b) Após a realização de qualquer sessão de prática, o reembolso será proporcional às horas não utilizadas, descontada taxa administrativa de 20%.</p>`;
  } else {
    body += `<p>b) Após o prazo de 7 (sete) dias, não haverá reembolso, podendo o(a) ALUNO(A) utilizar o acesso até o término do período contratado.</p>`;
  }
  body += `<p>c) A AMPLA FACIAL reserva-se o direito de cancelar o acesso em caso de violação das obrigações contratuais pelo(a) ALUNO(A), sem direito a reembolso.</p>`;
  if (isHorasGroup) {
    body += `<p>d) O cancelamento de sessões agendadas deve ser comunicado com no mínimo 48 horas de antecedência. Cancelamentos com menos de 48 horas resultarão na perda das horas correspondentes, salvo motivo de força maior devidamente comprovado.</p>`;
  }

  // ─── Cláusula 8 — LGPD ─────────────────────────────────────────────────────
  const c8 = nextClause();
  body += `<h2>Cláusula ${c8} — Da Proteção de Dados (LGPD)</h2>`;
  body += `<p>A AMPLA FACIAL se compromete a tratar os dados pessoais do(a) ALUNO(A) em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), utilizando-os exclusivamente para as finalidades previstas neste contrato e na prestação dos serviços educacionais.</p>`;
  body += `<p>Os dados coletados incluem: nome, e-mail, telefone e dados de pagamento, sendo armazenados com medidas técnicas e organizacionais de segurança adequadas. O(A) ALUNO(A) pode solicitar acesso, correção ou exclusão de seus dados a qualquer momento pelo e-mail contato@amplafacial.com.br.</p>`;
  body += `<p>O(A) ALUNO(A) consente com o tratamento de seus dados pessoais para fins de execução deste contrato, comunicação sobre o curso e emissão de certificados.</p>`;

  // ─── Cláusula 9 — Disposições Gerais ───────────────────────────────────────
  const c9 = nextClause();
  body += `<h2>Cláusula ${c9} — Das Disposições Gerais</h2>`;
  body += `<p>a) Este contrato não cria qualquer vínculo empregatício entre as partes.</p>`;
  body += `<p>b) Este contrato é regido pelas leis da República Federativa do Brasil.</p>`;
  body += `<p>c) Fica eleito o foro da comarca do Rio de Janeiro/RJ para dirimir quaisquer dúvidas ou litígios decorrentes deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>`;
  body += `<p>d) A tolerância de qualquer das partes quanto ao descumprimento de cláusula contratual não implicará renúncia ao direito de exigir o seu cumprimento.</p>`;
  body += `<p>e) Eventuais alterações neste contrato somente terão validade se realizadas por escrito e com anuência de ambas as partes.</p>`;

  // ─── Horas-specific: supervisão e certificado ──────────────────────────────
  if (isHorasGroup) {
    const c10 = nextClause();
    body += `<h2>Cláusula ${c10} — Da Supervisão e Certificado</h2>`;
    body += `<p>a) Todas as sessões de prática clínica serão realizadas sob supervisão direta do ${COMPANY.responsible}, que poderá intervir em qualquer procedimento a qualquer momento para garantir a segurança do paciente.</p>`;
    body += `<p>b) Os pacientes modelo são selecionados e triados pela equipe da AMPLA FACIAL. O(A) ALUNO(A) não poderá trazer pacientes próprios para as sessões supervisionadas.</p>`;
    body += `<p>c) Recomenda-se que o(a) ALUNO(A) possua seguro de responsabilidade civil profissional vigente.</p>`;
    body += `<p>d) O certificado de carga horária será emitido apenas após a conclusão integral das horas contratadas, com aproveitamento satisfatório a critério do supervisor. O certificado indicará a carga horária cumprida e os procedimentos praticados.</p>`;
  }

  // ─── Footer / signature ────────────────────────────────────────────────────
  body += `
<div style="margin-top:48px;border-top:1px solid #ccc;padding-top:24px;">
<p>Rio de Janeiro, ${escapeHtml(data.startDate)}</p>
<p style="font-size:12px;color:#666;margin-top:8px;">Este contrato é firmado eletronicamente. A aceitação digital tem validade jurídica nos termos da Medida Provisória nº 2.200-2/2001 e do art. 10 da Lei nº 12.965/2014 (Marco Civil da Internet). O registro de aceite inclui IP, data/hora e identificação do usuário.</p>
<div style="display:flex;justify-content:space-between;margin-top:32px;">
<div style="text-align:center;">
<div style="border-bottom:1px solid #333;width:260px;margin-bottom:4px;">&nbsp;</div>
<small><strong>${COMPANY.responsible}</strong><br/>Ampla Facial — ${COMPANY.name}<br/>CNPJ: ${COMPANY.cnpj}</small>
</div>
<div style="text-align:center;">
<div style="border-bottom:1px solid #333;width:260px;margin-bottom:4px;">&nbsp;</div>
<small><strong>${escapeHtml(data.studentName)}</strong><br/>${escapeHtml(data.studentEmail)}</small>
</div>
</div>
</div>
`;

  // ─── Wrap in full HTML document ────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Contrato — ${plan.name}</title>
<style>
body{font-family:Georgia,serif;max-width:720px;margin:0 auto;padding:24px;color:#222;line-height:1.7;font-size:14px}
h1{text-align:center;font-size:18px;margin-bottom:4px;color:#0A1628}
h2{font-size:15px;color:#0A1628;margin-top:28px;border-bottom:1px solid #ddd;padding-bottom:6px}
p{margin:8px 0;text-align:justify}
ul{padding-left:24px;margin:8px 0}
li{margin:4px 0}
strong{color:#0A1628}
small{color:#666}
</style>
</head><body>
${body}
</body></html>`;
}
