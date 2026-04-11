// ─── Contract HTML templates for Ampla Facial portal ─────────────────────────

const COMPANY = {
  name: "Instituto Medeiros Martins LTDA",
  cnpj: "50.421.964/0001-81",
  address: "Avenida das Americas 1155, sala 1610, Rio de Janeiro/RJ",
  responsible: "Dr. Gustavo Martins",
};

interface ContractData {
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  planName: string;
  planPrice: string;
  planFeatures: string[];
  accessDays: number;
  mentorshipMonths: number;
  startDate: string;
}

// ─── Plan key → group mapping ────────────────────────────────────────────────
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

// ─── Shared clauses ──────────────────────────────────────────────────────────

function headerHTML(data: ContractData): string {
  return `
<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS</h1>
<p style="text-align:center;color:#666;margin-bottom:24px;">Ampla Facial — Harmonização Orofacial</p>

<h2>1. DAS PARTES</h2>
<p><strong>CONTRATANTE:</strong> ${COMPANY.name}, inscrita no CNPJ sob nº ${COMPANY.cnpj}, com sede em ${COMPANY.address}, doravante denominada <strong>AMPLA FACIAL</strong>, representada pelo ${COMPANY.responsible}.</p>
<p><strong>CONTRATADO(A):</strong> ${data.studentName}, e-mail ${data.studentEmail}${data.studentPhone ? `, telefone ${data.studentPhone}` : ""}, doravante denominado(a) <strong>ALUNO(A)</strong>.</p>
`;
}

function objectDigitalHTML(data: ContractData): string {
  return `
<h2>2. DO OBJETO</h2>
<p>O presente contrato tem por objeto a prestação de serviços educacionais na modalidade digital, consistindo no acesso ao plano <strong>${data.planName}</strong> da plataforma Ampla Facial, que inclui:</p>
<ul>${data.planFeatures.map(f => `<li>${f}</li>`).join("")}</ul>
`;
}

function durationHTML(data: ContractData): string {
  return `
<h2>3. DA DURAÇÃO E ACESSO</h2>
<p>O acesso ao conteúdo digital será disponibilizado por <strong>${data.accessDays} dias corridos</strong> a partir da data de ativação (${data.startDate}), podendo ser renovado mediante nova contratação.</p>
`;
}

function paymentHTML(data: ContractData): string {
  return `
<h2>4. DO PAGAMENTO</h2>
<p>O(A) ALUNO(A) pagará à AMPLA FACIAL o valor de <strong>${data.planPrice}</strong> pelo plano contratado, mediante pagamento via plataforma digital (cartão de crédito, PIX ou boleto bancário) processado pelo sistema Stripe.</p>
<p>O pagamento integral é condição para a liberação do acesso ao conteúdo.</p>
`;
}

function obligationsHTML(): string {
  return `
<h2>5. DAS OBRIGAÇÕES DA AMPLA FACIAL</h2>
<p>a) Disponibilizar o conteúdo contratado no portal, de forma organizada e com qualidade técnica adequada.</p>
<p>b) Manter o portal acessível durante o período contratado, ressalvadas manutenções programadas.</p>
<p>c) Fornecer certificado de participação ao término do curso, quando aplicável.</p>
<p>d) Proteger os dados pessoais do(a) ALUNO(A) nos termos da LGPD.</p>

<h2>6. DAS OBRIGAÇÕES DO(A) ALUNO(A)</h2>
<p>a) Efetuar o pagamento integral na forma estipulada.</p>
<p>b) Utilizar o conteúdo exclusivamente para fins pessoais e de aprendizado profissional.</p>
<p>c) Não compartilhar credenciais de acesso com terceiros.</p>
<p>d) Não reproduzir, copiar, distribuir ou comercializar o conteúdo do curso, total ou parcialmente.</p>
<p>e) Manter seus dados cadastrais atualizados.</p>
`;
}

function intellectualPropertyHTML(): string {
  return `
<h2>7. DA PROPRIEDADE INTELECTUAL</h2>
<p>Todo o conteúdo disponibilizado (vídeos, materiais, protocolos, metodologias, marcas e logotipos) é de propriedade exclusiva da AMPLA FACIAL e está protegido pela legislação de direitos autorais e propriedade intelectual. A contratação confere apenas o direito de uso pessoal durante o período de acesso, não implicando cessão de direitos de qualquer natureza.</p>
<p>A violação dos direitos de propriedade intelectual sujeitará o(a) infrator(a) às sanções civis e penais cabíveis.</p>
`;
}

function cancellationHTML(): string {
  return `
<h2>8. DO CANCELAMENTO E REEMBOLSO</h2>
<p>a) O(A) ALUNO(A) poderá solicitar o cancelamento e reembolso integral no prazo de <strong>7 (sete) dias corridos</strong> após a ativação do acesso, nos termos do art. 49 do Código de Defesa do Consumidor.</p>
<p>b) Após o prazo de 7 dias, não haverá reembolso, podendo o(a) ALUNO(A) utilizar o acesso até o término do período contratado.</p>
<p>c) A AMPLA FACIAL reserva-se o direito de cancelar o acesso em caso de violação das obrigações contratuais, sem direito a reembolso.</p>
`;
}

function lgpdHTML(): string {
  return `
<h2>9. DA PROTEÇÃO DE DADOS (LGPD)</h2>
<p>A AMPLA FACIAL se compromete a tratar os dados pessoais do(a) ALUNO(A) em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), utilizando-os exclusivamente para as finalidades previstas neste contrato e na prestação dos serviços educacionais.</p>
<p>Os dados coletados incluem: nome, e-mail, telefone e dados de pagamento, sendo armazenados com medidas de segurança adequadas. O(A) ALUNO(A) pode solicitar acesso, correção ou exclusão de seus dados a qualquer momento pelo e-mail contato@amplafacial.com.br.</p>
`;
}

function generalProvisionsHTML(): string {
  return `
<h2>10. DAS DISPOSIÇÕES GERAIS</h2>
<p>a) Este contrato é regido pelas leis da República Federativa do Brasil.</p>
<p>b) Fica eleito o foro da comarca do Rio de Janeiro/RJ para dirimir quaisquer dúvidas ou litígios decorrentes deste contrato.</p>
<p>c) A tolerância de qualquer das partes quanto ao descumprimento de cláusula contratual não implicará renúncia ao direito de exigir o seu cumprimento.</p>
<p>d) Eventuais alterações neste contrato somente terão validade se realizadas por escrito e com anuência de ambas as partes.</p>
`;
}

function signatureHTML(data: ContractData): string {
  return `
<div style="margin-top:48px;border-top:1px solid #ccc;padding-top:24px;">
<p>Rio de Janeiro, ${data.startDate}</p>
<div style="display:flex;justify-content:space-between;margin-top:32px;">
<div style="text-align:center;">
<div style="border-bottom:1px solid #333;width:260px;margin-bottom:4px;">&nbsp;</div>
<small><strong>${COMPANY.responsible}</strong><br/>Ampla Facial — ${COMPANY.name}<br/>CNPJ: ${COMPANY.cnpj}</small>
</div>
<div style="text-align:center;">
<div style="border-bottom:1px solid #333;width:260px;margin-bottom:4px;">&nbsp;</div>
<small><strong>${data.studentName}</strong><br/>${data.studentEmail}</small>
</div>
</div>
</div>
`;
}

// ─── Template: DIGITAL ───────────────────────────────────────────────────────
function templateDigital(data: ContractData): string {
  return `
${headerHTML(data)}
${objectDigitalHTML(data)}
${durationHTML(data)}
${paymentHTML(data)}
${obligationsHTML()}
${intellectualPropertyHTML()}
${cancellationHTML()}
${lgpdHTML()}
${generalProvisionsHTML()}
${signatureHTML(data)}
`;
}

// ─── Template: OBSERVAÇÃO ────────────────────────────────────────────────────
function templateObservacao(data: ContractData): string {
  return `
${headerHTML(data)}
${objectDigitalHTML(data)}

<h2>2.1. DA OBSERVAÇÃO CLÍNICA PRESENCIAL</h2>
<p>Além do conteúdo digital, o plano contratado inclui observação clínica presencial nas dependências da clínica da AMPLA FACIAL, sob supervisão do ${COMPANY.responsible}. Durante as sessões de observação, o(a) ALUNO(A) deverá:</p>
<p>a) <strong>Confidencialidade do paciente:</strong> Manter sigilo absoluto sobre todas as informações dos pacientes observados, incluindo identidade, procedimentos realizados e dados clínicos, nos termos do Código de Ética Médica e da LGPD.</p>
<p>b) <strong>Conduta profissional:</strong> Manter postura ética e profissional durante toda a permanência na clínica, respeitando a equipe, os pacientes e os protocolos internos.</p>
<p>c) <strong>Vestimenta:</strong> Comparecer às sessões com traje adequado ao ambiente clínico (jaleco branco limpo, calçado fechado, sem adornos nas mãos e antebraços).</p>
<p>d) <strong>Pontualidade:</strong> Respeitar os horários agendados. Faltas não justificadas com 24h de antecedência não serão repostas.</p>
<p>e) <strong>Responsabilidade civil:</strong> A AMPLA FACIAL não se responsabiliza por quaisquer danos causados pelo(a) ALUNO(A) durante as sessões de observação. O(A) ALUNO(A) declara estar ciente de que atua como observador(a) e não participante ativo(a) dos procedimentos, salvo expressa autorização.</p>
<p>f) <strong>Proibição de registro:</strong> É estritamente proibido fotografar, filmar ou gravar áudio durante as sessões de observação sem autorização prévia por escrito.</p>

${durationHTML(data)}
${paymentHTML(data)}
${obligationsHTML()}
${intellectualPropertyHTML()}
${cancellationHTML()}
${lgpdHTML()}
${generalProvisionsHTML()}
${signatureHTML(data)}
`;
}

// ─── Template: VIP ───────────────────────────────────────────────────────────
function templateVIP(data: ContractData): string {
  const mentorshipText = data.mentorshipMonths > 0
    ? `O acompanhamento individual (mentoria) terá duração de <strong>${data.mentorshipMonths} meses</strong> a partir da data de ativação.`
    : "O período de acompanhamento será definido conforme as condições do plano contratado.";

  return `
${headerHTML(data)}
${objectDigitalHTML(data)}

<h2>2.1. DA MENTORIA E ACOMPANHAMENTO</h2>
<p>${mentorshipText}</p>
<p>O canal direto exclusivo com o ${COMPANY.responsible} está sujeito às seguintes regras:</p>
<p>a) <strong>Uso do canal:</strong> O canal direto é destinado exclusivamente a dúvidas clínicas, discussão de casos e orientação profissional relacionada ao conteúdo do curso. Mensagens de cunho pessoal ou comercial não relacionadas ao curso não serão respondidas.</p>
<p>b) <strong>Tempo de resposta:</strong> As respostas serão dadas em dias úteis, no prazo de até 48 horas.</p>
<p>c) <strong>Encontros ao vivo:</strong> Os encontros quinzenais ocorrem em datas pré-agendadas. As gravações ficam disponíveis no portal. Faltas do(a) ALUNO(A) não geram direito a reposição individual.</p>
<p>d) <strong>Proibição de gravação:</strong> É estritamente proibido gravar, capturar tela ou reproduzir o conteúdo das sessões privadas de mentoria e do canal direto sem autorização prévia por escrito.</p>

${data.mentorshipMonths > 0 ? `
<h2>2.2. DA PRÁTICA CLÍNICA PRESENCIAL</h2>
<p>Caso o plano contratado inclua horas de prática presencial com pacientes modelo:</p>
<p>a) <strong>Supervisão:</strong> Todos os atendimentos serão realizados sob supervisão direta do ${COMPANY.responsible}, que poderá intervir a qualquer momento.</p>
<p>b) <strong>Responsabilidade profissional:</strong> O(A) ALUNO(A) declara possuir habilitação profissional válida para a realização dos procedimentos e assume responsabilidade técnica solidária pelos atendimentos realizados.</p>
<p>c) <strong>Consentimento dos pacientes:</strong> O(A) ALUNO(A) está ciente de que os pacientes modelo assinaram Termo de Consentimento Livre e Esclarecido (TCLE) específico, e compromete-se a respeitá-lo integralmente.</p>
<p>d) <strong>Conduta e vestimenta:</strong> Aplicam-se as mesmas regras de conduta profissional, vestimenta e pontualidade descritas para sessões de observação.</p>
` : ""}

${durationHTML(data)}
${paymentHTML(data)}
${obligationsHTML()}
${intellectualPropertyHTML()}
${cancellationHTML()}
${lgpdHTML()}
${generalProvisionsHTML()}
${signatureHTML(data)}
`;
}

// ─── Template: HORAS CLÍNICAS ────────────────────────────────────────────────
function templateHoras(data: ContractData): string {
  return `
${headerHTML(data)}

<h2>2. DO OBJETO</h2>
<p>O presente contrato tem por objeto a prestação de serviços de treinamento clínico presencial, consistindo no plano <strong>${data.planName}</strong>, que inclui:</p>
<ul>${data.planFeatures.map(f => `<li>${f}</li>`).join("")}</ul>

<h2>3. DA PRÁTICA CLÍNICA</h2>
<p>a) <strong>Supervisão:</strong> Todas as sessões de prática clínica serão realizadas sob supervisão direta do ${COMPANY.responsible}, que poderá intervir em qualquer procedimento a qualquer momento para garantir a segurança do paciente.</p>
<p>b) <strong>Pacientes modelo:</strong> Os pacientes modelo são selecionados e triados pela equipe da AMPLA FACIAL. O(A) ALUNO(A) não poderá trazer pacientes próprios para as sessões supervisionadas.</p>
<p>c) <strong>Consentimento:</strong> Todos os pacientes modelo terão assinado Termo de Consentimento Livre e Esclarecido (TCLE) específico. O(A) ALUNO(A) compromete-se a respeitá-lo integralmente e a informar o paciente sobre sua condição de profissional em treinamento.</p>
<p>d) <strong>Responsabilidade profissional:</strong> O(A) ALUNO(A) declara possuir habilitação profissional válida (CRO/CRM ativo) para a realização dos procedimentos estéticos e assume responsabilidade técnica solidária pelos atendimentos realizados.</p>
<p>e) <strong>Seguro profissional:</strong> Recomenda-se que o(a) ALUNO(A) possua seguro de responsabilidade civil profissional vigente.</p>

<h2>4. DO BANCO DE HORAS</h2>
<p>a) <strong>Validade:</strong> As horas adquiridas devem ser utilizadas dentro do prazo de <strong>${data.accessDays} dias corridos</strong> a partir da data de ativação (${data.startDate}). Horas não utilizadas dentro deste prazo serão perdidas, sem direito a reembolso.</p>
<p>b) <strong>Agendamento:</strong> As sessões devem ser agendadas com antecedência mínima de 7 (sete) dias úteis, de acordo com a disponibilidade da clínica e do supervisor.</p>
<p>c) <strong>Cancelamento:</strong> O cancelamento de sessões agendadas deve ser comunicado com no mínimo 48 horas de antecedência. Cancelamentos com menos de 48 horas resultarão na perda das horas correspondentes, salvo motivo de força maior devidamente comprovado.</p>
<p>d) <strong>Reagendamento:</strong> Sessões canceladas dentro do prazo poderão ser reagendadas uma única vez, sujeitas à disponibilidade.</p>

<h2>5. DA CONDUTA E VESTIMENTA</h2>
<p>a) Comparecer às sessões com traje adequado ao ambiente clínico (jaleco branco limpo, calçado fechado, sem adornos nas mãos e antebraços).</p>
<p>b) Manter postura ética e profissional durante toda a permanência na clínica.</p>
<p>c) Respeitar os horários agendados. Atrasos superiores a 15 minutos poderão resultar no cancelamento da sessão, com perda das horas.</p>

<h2>6. DO CERTIFICADO</h2>
<p>O certificado de carga horária será emitido apenas após a conclusão integral das horas contratadas, com aproveitamento satisfatório a critério do supervisor. O certificado indicará a carga horária cumprida e os procedimentos praticados.</p>

<h2>7. DA CONFIDENCIALIDADE</h2>
<p>O(A) ALUNO(A) compromete-se a manter sigilo absoluto sobre todas as informações dos pacientes atendidos, incluindo identidade, prontuário, imagens e dados clínicos, nos termos do Código de Ética profissional aplicável e da LGPD. É proibido fotografar, filmar ou registrar pacientes sem autorização prévia por escrito.</p>

${paymentHTML(data)}
${intellectualPropertyHTML()}

<h2>9. DO CANCELAMENTO E REEMBOLSO</h2>
<p>a) O(A) ALUNO(A) poderá solicitar o cancelamento e reembolso integral no prazo de <strong>7 (sete) dias corridos</strong> após a contratação, desde que nenhuma sessão tenha sido realizada.</p>
<p>b) Após a realização de qualquer sessão, o reembolso será proporcional às horas não utilizadas, descontada taxa administrativa de 20%.</p>
<p>c) A AMPLA FACIAL reserva-se o direito de cancelar o acesso em caso de violação das obrigações contratuais, sem direito a reembolso.</p>

${lgpdHTML()}
${generalProvisionsHTML()}
${signatureHTML(data)}
`;
}

// ─── Main export ─────────────────────────────────────────────────────────────
export function getContractHTML(group: string, data: ContractData): string {
  let body: string;
  switch (group) {
    case "observacao": body = templateObservacao(data); break;
    case "vip": body = templateVIP(data); break;
    case "horas": body = templateHoras(data); break;
    default: body = templateDigital(data); break;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Contrato — ${data.planName}</title>
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
