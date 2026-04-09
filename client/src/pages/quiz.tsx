import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Check, Loader2, Star, Trophy } from "lucide-react";
import { trackEvent } from "@/lib/funnel";

// ─── Perguntas ────────────────────────────────────────────────────────────────
const PERGUNTAS = [
  {
    id: 1,
    pergunta: "Qual é a sua formação atual?",
    emoji: "🎓",
    opcoes: [
      { id: "a", texto: "Ainda estou na graduação", peso: { observador: 1, digital: 2, vip: 0 } },
      { id: "b", texto: "Recém-formado (menos de 2 anos)", peso: { observador: 2, digital: 1, vip: 1 } },
      { id: "c", texto: "Formado há mais de 2 anos", peso: { observador: 1, digital: 1, vip: 2 } },
      { id: "d", texto: "Já atuo com HOF regularmente", peso: { observador: 0, digital: 1, vip: 3 } },
    ],
  },
  {
    id: 2,
    pergunta: "Quantos procedimentos de HOF você realiza por mês?",
    emoji: "💉",
    opcoes: [
      { id: "a", texto: "Nenhum ainda", peso: { observador: 2, digital: 2, vip: 0 } },
      { id: "b", texto: "1 a 5 procedimentos", peso: { observador: 2, digital: 1, vip: 1 } },
      { id: "c", texto: "6 a 15 procedimentos", peso: { observador: 1, digital: 1, vip: 2 } },
      { id: "d", texto: "Mais de 15 procedimentos", peso: { observador: 0, digital: 0, vip: 3 } },
    ],
  },
  {
    id: 3,
    pergunta: "O que você mais precisa para evoluir agora?",
    emoji: "🎯",
    opcoes: [
      { id: "a", texto: "Base teórica sólida com evidências científicas", peso: { observador: 0, digital: 3, vip: 1 } },
      { id: "b", texto: "Ver como funciona na prática clínica real", peso: { observador: 3, digital: 0, vip: 1 } },
      { id: "c", texto: "Praticar com supervisão em pacientes reais", peso: { observador: 1, digital: 0, vip: 3 } },
      { id: "d", texto: "Mentoria individual e acompanhamento contínuo", peso: { observador: 0, digital: 0, vip: 3 } },
    ],
  },
  {
    id: 4,
    pergunta: "Qual é o seu maior obstáculo hoje?",
    emoji: "🔑",
    opcoes: [
      { id: "a", texto: "Insegurança técnica nos protocolos", peso: { observador: 2, digital: 2, vip: 1 } },
      { id: "b", texto: "Falta de prática supervisionada", peso: { observador: 2, digital: 0, vip: 2 } },
      { id: "c", texto: "Dificuldade em captar e fidelizar pacientes", peso: { observador: 0, digital: 1, vip: 3 } },
      { id: "d", texto: "Quero um protocolo próprio e diferenciado", peso: { observador: 0, digital: 1, vip: 3 } },
    ],
  },
  {
    id: 5,
    pergunta: "Como você aprende melhor?",
    emoji: "🧠",
    opcoes: [
      { id: "a", texto: "Assistindo aulas gravadas no meu ritmo", peso: { observador: 0, digital: 3, vip: 0 } },
      { id: "b", texto: "Observando casos reais ao vivo", peso: { observador: 3, digital: 0, vip: 1 } },
      { id: "c", texto: "Praticando com feedback imediato", peso: { observador: 1, digital: 0, vip: 3 } },
      { id: "d", texto: "Com acompanhamento personalizado contínuo", peso: { observador: 0, digital: 0, vip: 3 } },
    ],
  },
];

// ─── Resultados por plano ─────────────────────────────────────────────────────
const RESULTADOS = {
  digital: {
    plano: "Acesso Digital",
    tag: "Perfeito para iniciantes",
    cor: "#3b82f6",
    emoji: "📚",
    descricao: "Você está no momento certo para construir uma base científica sólida. O acesso digital vai te dar todo o conteúdo teórico com os protocolos mais atuais em HOF, no seu ritmo, com materiais que você pode consultar sempre que precisar.",
    beneficios: [
      "4 módulos completos com evidências científicas",
      "Materiais complementares em PDF e áudio",
      "Acesso por 1 ano — estude no seu ritmo",
      "Certificado de participação",
    ],
    cta: "Conhecer o Acesso Digital",
    whatsapp: "Olá Dr. Gustavo! Fiz o quiz da Ampla Facial e meu perfil indicou o Acesso Digital. Gostaria de saber mais!",
  },
  observador: {
    plano: "Plano Observador",
    tag: "Ideal para o seu perfil",
    cor: "#D4A843",
    emoji: "👁️",
    descricao: "Você precisa ver para aprender — e isso é exatamente o que o Plano Observador oferece. Você vai acompanhar a rotina clínica real do Dr. Gustavo presencialmente, entendendo como os protocolos funcionam na prática com pacientes reais.",
    beneficios: [
      "Observação clínica presencial na clínica do Dr. Gustavo",
      "4 módulos gravados inclusos",
      "Dimensão comercial e gestão de pacientes",
      "Certificado de participação",
    ],
    cta: "Conhecer o Plano Observador",
    whatsapp: "Olá Dr. Gustavo! Fiz o quiz da Ampla Facial e meu perfil indicou o Plano Observador. Gostaria de saber mais!",
  },
  vip: {
    plano: "Mentoria VIP",
    tag: "Você está pronto para o próximo nível",
    cor: "#D4A843",
    emoji: "⭐",
    descricao: "Seu perfil mostra que você está pronto para uma transformação real. A Mentoria VIP oferece acompanhamento individual, prática supervisionada com pacientes modelo e acesso direto ao Dr. Gustavo — tudo para você construir seu próprio protocolo diferenciado.",
    beneficios: [
      "Acompanhamento individual por 6 meses",
      "Canal direto com o Dr. Gustavo",
      "Prática com pacientes modelo (planos presenciais)",
      "Método NaturalUp® completo",
      "Encontros ao vivo quinzenais",
    ],
    cta: "Agendar entrevista com o Dr. Gustavo",
    whatsapp: "Olá Dr. Gustavo! Fiz o quiz da Ampla Facial e meu perfil indicou a Mentoria VIP. Gostaria de agendar uma conversa!",
  },
};

type PlanoKey = keyof typeof RESULTADOS;
// Múltipla seleção por pergunta
type Respostas = Record<number, string[]>;

function calcularResultado(respostas: Respostas): PlanoKey {
  const pontos = { digital: 0, observador: 0, vip: 0 };

  PERGUNTAS.forEach((q) => {
    const selecionadas = respostas[q.id] || [];
    selecionadas.forEach((opcId) => {
      const opc = q.opcoes.find((o) => o.id === opcId);
      if (opc) {
        pontos.digital += opc.peso.digital;
        pontos.observador += opc.peso.observador;
        pontos.vip += opc.peso.vip;
      }
    });
  });

  const max = Math.max(pontos.digital, pontos.observador, pontos.vip);
  if (pontos.vip === max) return "vip";
  if (pontos.observador === max) return "observador";
  return "digital";
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function QuizPage() {
  const [etapa, setEtapa] = useState<"intro" | "quiz" | "lead" | "resultado">("intro");
  const [perguntaAtual, setPerguntaAtual] = useState(0);
  const [respostas, setRespostas] = useState<Respostas>({});
  const [resultado, setResultado] = useState<PlanoKey | null>(null);
  const [lead, setLead] = useState({ nome: "", email: "", whatsapp: "" });
  const [leadErro, setLeadErro] = useState("");

  // Trackear início do quiz quando entra na etapa quiz
  useEffect(() => {
    if (etapa === "quiz" && perguntaAtual === 0) {
      trackEvent("quiz_start");
    }
  }, [etapa]);

  // Alterna seleção de opção (múltipla)
  const toggleOpcao = (opcaoId: string) => {
    const atuais = respostas[PERGUNTAS[perguntaAtual].id] || [];
    const novas = atuais.includes(opcaoId)
      ? atuais.filter((id) => id !== opcaoId)
      : [...atuais, opcaoId];
    setRespostas({ ...respostas, [PERGUNTAS[perguntaAtual].id]: novas });
  };

  const avançar = () => {
    const selecionadas = respostas[PERGUNTAS[perguntaAtual].id] || [];
    if (selecionadas.length === 0) return; // precisa selecionar ao menos 1
    if (perguntaAtual < PERGUNTAS.length - 1) {
      setPerguntaAtual(perguntaAtual + 1);
    } else {
      const res = calcularResultado(respostas);
      setResultado(res);
      trackEvent("quiz_complete", { resultado: res });
      setEtapa("lead");
    }
  };

  const salvarLeadMutation = useMutation({
    mutationFn: async (data: {
      nome: string; email: string; whatsapp: string;
      resultado: string; respostas: Respostas;
    }) => {
      const res = await fetch("/api/quiz/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      return res.json();
    },
    onSuccess: () => setEtapa("resultado"),
    onError: () => setEtapa("resultado"), // mostra resultado mesmo se falhar
  });

  const enviarLead = () => {
    if (!lead.nome.trim() || !lead.email.trim() || !lead.whatsapp.trim()) {
      setLeadErro("Preencha todos os campos para ver seu resultado.");
      return;
    }
    setLeadErro("");
    trackEvent("lead_capture", { resultado: resultado! }, lead.email);
    salvarLeadMutation.mutate({
      nome: lead.nome,
      email: lead.email,
      whatsapp: lead.whatsapp,
      resultado: resultado!,
      respostas,
    });
  };

  const progresso = ((perguntaAtual) / PERGUNTAS.length) * 100;
  const resultadoData = resultado ? RESULTADOS[resultado] : null;

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (etapa === "intro") {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center px-4 py-10">
        <img src="/logo-transparent.png" alt="Ampla Facial" className="h-16 mb-8 object-contain" />

        <div className="max-w-lg w-full text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#D4A843]/10 border border-[#D4A843]/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#D4A843]">
            <Trophy className="h-3.5 w-3.5" /> Quiz de Perfil HOF
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            Qual mentoria é ideal<br />para o seu momento?
          </h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Responda 5 perguntas rápidas e descubra qual caminho de formação em Harmonização Orofacial faz mais sentido para o seu perfil profissional agora.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { emoji: "⚡", label: "5 perguntas", sub: "menos de 2 min" },
              { emoji: "🎯", label: "Resultado", sub: "100% personalizado" },
              { emoji: "🏆", label: "Concorra", sub: "1 mês VIP grátis" },
            ].map(({ emoji, label, sub }) => (
              <div key={label} className="rounded-xl border border-[#1e3a5f] bg-[#0D1E35] p-3 text-center">
                <div className="text-2xl mb-1">{emoji}</div>
                <p className="text-xs font-semibold text-white">{label}</p>
                <p className="text-[10px] text-gray-500">{sub}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setEtapa("quiz")}
            className="w-full rounded-xl bg-[#D4A843] py-4 font-bold text-[#0A1628] text-lg hover:bg-[#e8b84d] transition-all flex items-center justify-center gap-2"
          >
            Descobrir meu perfil <ArrowRight className="h-5 w-5" />
          </button>

          <p className="mt-4 text-xs text-gray-600">Gratuito · Sem compromisso · Resultado imediato</p>
        </div>
      </div>
    );
  }

  // ── QUIZ ───────────────────────────────────────────────────────────────────
  if (etapa === "quiz") {
    const q = PERGUNTAS[perguntaAtual];
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center px-4 py-10">
        <div className="max-w-lg w-full">

          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Pergunta {perguntaAtual + 1} de {PERGUNTAS.length}</span>
              <span className="text-xs text-[#D4A843]">{Math.round(((perguntaAtual) / PERGUNTAS.length) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#1e3a5f]">
              <div
                className="h-1.5 rounded-full bg-[#D4A843] transition-all duration-500"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>

          {/* Pergunta */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">{q.emoji}</div>
            <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">{q.pergunta}</h2>
          </div>

          {/* Instrução */}
          <p className="text-center text-xs text-gray-500 mb-4">Selecione todas as opções que se aplicam a você</p>

          {/* Opções — múltipla seleção */}
          <div className="space-y-3">
            {q.opcoes.map((opcao) => {
              const selecionadas = respostas[q.id] || [];
              const selecionada = selecionadas.includes(opcao.id);
              return (
                <button
                  key={opcao.id}
                  onClick={() => toggleOpcao(opcao.id)}
                  className={`w-full text-left rounded-xl border px-5 py-4 text-sm text-white transition-all duration-200 flex items-center gap-3 ${
                    selecionada
                      ? "border-[#D4A843] bg-[#D4A843]/10"
                      : "border-[#1e3a5f] bg-[#0D1E35] hover:border-[#D4A843]/40 hover:bg-[#D4A843]/5"
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                    selecionada
                      ? "border-[#D4A843] bg-[#D4A843] text-[#0A1628]"
                      : "border-[#1e3a5f] text-gray-400"
                  }`}>
                    {selecionada ? <Check className="h-4 w-4" /> : <span className="text-xs font-bold">{opcao.id.toUpperCase()}</span>}
                  </span>
                  {opcao.texto}
                </button>
              );
            })}
          </div>

          {/* Botão avançar */}
          <button
            onClick={avançar}
            disabled={(respostas[q.id] || []).length === 0}
            className="mt-6 w-full rounded-xl bg-[#D4A843] py-3.5 font-bold text-[#0A1628] hover:bg-[#e8b84d] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {perguntaAtual < PERGUNTAS.length - 1 ? "Próxima" : "Ver meu resultado"}
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* Voltar */}
          {perguntaAtual > 0 && (
            <button
              onClick={() => setPerguntaAtual(perguntaAtual - 1)}
              className="mt-3 w-full text-center text-sm text-gray-600 hover:text-gray-400 transition-colors"
            >
              ← Voltar
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── LEAD ───────────────────────────────────────────────────────────────────
  if (etapa === "lead") {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center px-4 py-10">
        <div className="max-w-md w-full">

          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">Seu resultado está pronto!</h2>
            <p className="text-gray-400 text-sm">
              Deixe seus dados para ver qual mentoria foi recomendada para o seu perfil — e concorrer a <strong className="text-[#D4A843]">1 mês de Mentoria VIP grátis</strong>.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Nome completo</label>
              <input
                type="text"
                placeholder="Dr. Seu Nome"
                value={lead.nome}
                onChange={(e) => setLead({ ...lead, nome: e.target.value })}
                className="w-full rounded-xl border border-[#1e3a5f] bg-[#0D1E35] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#D4A843] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={lead.email}
                onChange={(e) => setLead({ ...lead, email: e.target.value })}
                className="w-full rounded-xl border border-[#1e3a5f] bg-[#0D1E35] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#D4A843] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">WhatsApp</label>
              <input
                type="tel"
                placeholder="(21) 99999-9999"
                value={lead.whatsapp}
                onChange={(e) => setLead({ ...lead, whatsapp: e.target.value })}
                className="w-full rounded-xl border border-[#1e3a5f] bg-[#0D1E35] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#D4A843] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {leadErro && (
            <p className="mb-4 text-sm text-red-400 text-center">{leadErro}</p>
          )}

          <button
            onClick={enviarLead}
            disabled={salvarLeadMutation.isPending}
            className="w-full rounded-xl bg-[#D4A843] py-4 font-bold text-[#0A1628] text-base hover:bg-[#e8b84d] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {salvarLeadMutation.isPending ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Calculando...</>
            ) : (
              <>Ver meu resultado <ArrowRight className="h-5 w-5" /></>
            )}
          </button>

          <p className="mt-3 text-center text-[10px] text-gray-600">
            Seus dados são usados apenas para envio do resultado e sorteio. Não compartilhamos com terceiros.
          </p>
        </div>
      </div>
    );
  }

  // ── RESULTADO ──────────────────────────────────────────────────────────────
  if (etapa === "resultado" && resultadoData) {
    const whatsappUrl = `https://wa.me/5521995523509?text=${encodeURIComponent(resultadoData.whatsapp)}`;

    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center px-4 py-10">
        <div className="max-w-lg w-full">

          {/* Header resultado */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">{resultadoData.emoji}</div>
            <div className="inline-block rounded-full bg-[#D4A843]/10 border border-[#D4A843]/30 px-4 py-1 text-xs font-semibold text-[#D4A843] mb-3">
              {resultadoData.tag}
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">
              Seu plano ideal é o
            </h2>
            <h3 className="text-3xl font-extrabold text-[#D4A843]">
              {resultadoData.plano}
            </h3>
          </div>

          {/* Card resultado */}
          <div className="rounded-2xl border border-[#D4A843]/30 bg-[#0D1E35] p-6 mb-6">
            <p className="text-sm text-gray-300 leading-relaxed mb-5">
              {resultadoData.descricao}
            </p>
            <ul className="space-y-2">
              {resultadoData.beneficios.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle2 className="h-4 w-4 text-[#D4A843] shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Banner sorteio */}
          <div className="rounded-xl border border-[#D4A843]/20 bg-[#D4A843]/5 p-4 flex items-start gap-3 mb-6">
            <Trophy className="h-5 w-5 text-[#D4A843] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Você está no sorteio!</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Ao fim da palestra, o Dr. Gustavo sorteará <strong className="text-[#D4A843]">1 mês de Mentoria VIP grátis</strong> entre os participantes que responderam o quiz.
              </p>
            </div>
          </div>

          {/* CTA */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("plan_click", { plano: resultado, cta: "whatsapp" }, lead.email)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-4 font-bold text-white text-base hover:bg-[#1ebe5d] transition-all mb-3"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {resultadoData.cta}
          </a>

          <a
            href="/#/comecar"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#D4A843] py-3 font-semibold text-[#D4A843] text-sm hover:bg-[#D4A843] hover:text-[#0A1628] transition-all"
          >
            Ver todos os planos
          </a>

          <div className="mt-6 flex justify-center">
            <img src="/logo-transparent.png" alt="Ampla Facial" className="h-8 object-contain opacity-40" />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
