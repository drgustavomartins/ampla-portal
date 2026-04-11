import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import {
  Check, Star, Clock, Zap, Users, Video,
  ChevronDown, ChevronUp, ArrowRight, Loader2,
  TrendingUp, Timer, MessageCircle, FileSignature,} from "lucide-react";

function formatBRL(c: number) {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const NEGOCIACAO_DIRETA = ["vip_online", "vip_presencial", "vip_completo"];

const WHATSAPP_NEGOCIACAO = (planName: string) =>
  `https://wa.me/5521976263881?text=${encodeURIComponent(
    `Olá! Vim pela página de planos da Ampla Facial e tenho interesse no ${planName}. Pode me ajudar com as próximas etapas?`
  )}`;

interface PlanData {
  key: string;
  name: string;
  description: string;
  group: "digital" | "observador" | "vip" | "horas";
  highlight?: string;
  price: number;
  priceFormatted: string;
  installments12x: number | null;
  installments12xFormatted: string | null;
  features: string[];
  clinicalHours: number;
  practiceHours: number;
  hasDirectChannel: boolean;
  hasMentorship: boolean;
  hasLiveEvents: boolean;
  hasNaturalUp: boolean;
  canUpgradeTo: string[];
  valorMercado: number | null;
}

const GROUP_LABELS: Record<string, string> = {
  digital: "Acesso Digital",
  observador: "Observação Clínica",
  vip: "Mentoria VIP",
  horas: "Horas Clínicas Extras",
};

const GROUP_DESCRIPTIONS: Record<string, string> = {
  digital: "Aprenda no seu ritmo com aulas gravadas e materiais científicos",
  observador: "Observe a rotina clínica real do Dr. Gustavo presencialmente",
  vip: "Mentoria individual e formação completa em HOF",
  horas: "Pacotes de prática presencial com pacientes modelo sob supervisão do Dr. Gustavo",
};

const GROUP_ORDER = ["digital", "observador", "vip", "horas"];

// Planos de mentoria que permitem comprar horas extras
const MENTORIA_PLANS = ["vip_online", "vip_presencial", "vip_completo"];

function PlanCard({ plan, onPagar, isLoading }: { plan: PlanData; onPagar: (key: string) => void; isLoading: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const isNegociacao = NEGOCIACAO_DIRETA.includes(plan.key);
  const isDestaque = !!plan.highlight || plan.group === "vip";
  const visibleFeatures = expanded ? plan.features : plan.features.slice(0, 5);

  return (
    <div
      className={`relative flex flex-col rounded-2xl border transition-all duration-200 ${
        isDestaque
          ? "border-[#D4A843] bg-gradient-to-b from-[#1a2d4d] to-[#0D1E35] shadow-[0_0_30px_rgba(212,168,67,0.15)]"
          : "border-[#1e3a5f] bg-[#0D1E35] hover:border-[#D4A843]/30"
      } p-6`}
    >
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#D4A843] px-4 py-1 text-xs font-bold text-[#0A1628]">
          {plan.highlight}
        </div>
      )}

      {/* Header */}
      <div className="mb-3">
        <h3 className="text-lg font-bold text-white">{plan.name}</h3>
        <p className="mt-1 text-sm text-gray-400">{plan.description}</p>
      </div>

      {/* Badges */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {plan.clinicalHours > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-blue-900/40 px-2.5 py-1 text-xs text-blue-300">
            <Clock className="h-3 w-3" /> {plan.clinicalHours}h observação
          </span>
        )}
        {plan.practiceHours > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-green-900/40 px-2.5 py-1 text-xs text-green-300">
            <Zap className="h-3 w-3" /> {plan.practiceHours}h prática
          </span>
        )}
        {plan.hasLiveEvents && (
          <span className="flex items-center gap-1 rounded-full bg-purple-900/40 px-2.5 py-1 text-xs text-purple-300">
            <Video className="h-3 w-3" /> Ao vivo
          </span>
        )}
        {plan.hasMentorship && (
          <span className="flex items-center gap-1 rounded-full bg-yellow-900/40 px-2.5 py-1 text-xs text-yellow-300">
            <Users className="h-3 w-3" /> Mentoria individual
          </span>
        )}
      </div>

      {/* Features */}
      <ul className="mb-2 flex-1 space-y-2">
        {visibleFeatures.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A843]" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {plan.features.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mb-5 flex items-center gap-1 text-xs text-[#D4A843]/70 hover:text-[#D4A843] transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="h-3.5 w-3.5" /> Ver menos</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5" /> Ver mais {plan.features.length - 5} benefícios</>
          )}
        </button>
      )}

      {/* Valor percebido */}
      {plan.valorMercado && (
        <div className="mb-3 rounded-xl border border-[#D4A843]/20 bg-[#D4A843]/5 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <TrendingUp className="h-3.5 w-3.5 text-[#D4A843]" />
            <span>Se fosse curso a curso, pagaria</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-500 line-through">
              {(plan.valorMercado / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            <span className="rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-bold text-green-400">
              -{Math.round((1 - plan.price / plan.valorMercado) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Preço */}
      {plan.priceFormatted && (
        <div className="mb-4">
          <div className="text-2xl font-bold text-[#D4A843]">{plan.priceFormatted}</div>
          {plan.installments12xFormatted && (
            <div className="text-xs text-gray-400">ou 12x de {plan.installments12xFormatted}</div>
          )}
        </div>
      )}

      {/* CTA */}
      {isNegociacao ? (
        <div className="space-y-2">
          <p className="text-center text-xs text-[#D4A843]/70">
            {plan.practiceHours > 0
              ? "Inclui prática com paciente modelo — requer entrevista prévia."
              : "Requer entrevista com o Dr. Gustavo antes da matrícula."}
          </p>
          <a
            href={WHATSAPP_NEGOCIACAO(plan.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-semibold text-white hover:bg-[#1ebe5d] transition-all"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Solicitar vaga
          </a>
        </div>
      ) : (
        <button
          onClick={() => onPagar(plan.key)}
          disabled={isLoading}
          className={`mt-auto flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold transition-all disabled:opacity-50 ${
            isDestaque
              ? "bg-[#D4A843] text-[#0A1628] hover:bg-[#e8b84d]"
              : "border border-[#D4A843] text-[#D4A843] hover:bg-[#D4A843] hover:text-[#0A1628]"
          }`}
        >
          {isLoading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Aguarde...</>
            : <>Pagar e acessar agora <ArrowRight className="h-4 w-4" /></>}
        </button>
      )}
    </div>
  );
}

export default function PlanosPage() {
  const { user } = useAuth();
  // Ler parâmetros da URL (ex: ?grupo=horas&ref=GUSTAVO-AF7K)
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(urlParams.get('grupo'));
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string>(urlParams.get('ref') || '');
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referralName, setReferralName] = useState<string>('');
  const { data, isLoading } = useQuery<{ plans: PlanData[] }>({
    queryKey: ["/api/stripe/plans"],
  });

  const { data: creditsData } = useQuery<{ balance: number; referralCode: string }>({
    queryKey: ["/api/credits/balance"],
    enabled: !!user,
  });

  const creditBalance = creditsData?.balance || 0;
  // Créditos aplicados automaticamente: usa o saldo total disponível
  const creditsToUse = creditBalance;

  const checkoutMutation = useMutation({
    mutationFn: async (planKey: string) => {
      const token = localStorage.getItem("ampla_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          planKey,
          creditsToUse: creditsToUse > 0 ? creditsToUse : undefined,
          referralCode: referralValid ? referralCode.trim().toUpperCase() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erro ao gerar link");
      return json;
    },
    onSuccess: (data) => {
      if (data.paidWithCredits) {
        window.location.href = "/#/pagamento/sucesso?credits=true";
      } else if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      setLoadingKey(null);
      alert("Erro ao gerar link. Tente novamente.");
    },
  });

  // Contract acceptance state
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [contractHtml, setContractHtml] = useState("");
  const [contractAccepted, setContractAccepted] = useState(false);
  const [contractPlanKey, setContractPlanKey] = useState("");
  const [contractLoading, setContractLoading] = useState(false);
  const contractScrollRef = useRef<HTMLDivElement>(null);

  const proceedToCheckout = (planKey: string) => {
    setLoadingKey(planKey);
    checkoutMutation.mutate(planKey);
  };

  const handlePagar = async (planKey: string) => {
    // Bloquear horas clínicas se não tem mentoria ativa
    if (planKey.startsWith("horas_clinicas") && !MENTORIA_PLANS.includes(user?.planKey || "")) {
      alert("Para adquirir horas clínicas extras, você precisa ter um plano de Mentoria VIP ativo.");
      return;
    }
    if (!user) {
      setLoadingKey(planKey);
      checkoutMutation.mutate(planKey);
      return;
    }
    // Check if contract already accepted
    setContractLoading(true);
    try {
      const checkRes = await apiRequest("GET", `/api/contracts/check/${planKey}`);
      const checkData = await checkRes.json();
      if (checkData.accepted) {
        proceedToCheckout(planKey);
        return;
      }
      // Fetch contract terms
      const termsRes = await apiRequest("GET", `/api/contracts/terms/${planKey}`);
      const termsData = await termsRes.json();
      setContractHtml(termsData.html);
      setContractPlanKey(planKey);
      setContractAccepted(false);
      setContractDialogOpen(true);
    } catch {
      // If contract check fails, proceed to checkout anyway
      proceedToCheckout(planKey);
    } finally {
      setContractLoading(false);
    }
  };

  const handleAcceptContract = async () => {
    setContractLoading(true);
    try {
      await apiRequest("POST", "/api/contracts/accept", { planKey: contractPlanKey });
      setContractDialogOpen(false);
      proceedToCheckout(contractPlanKey);
    } catch {
      alert("Erro ao aceitar contrato. Tente novamente.");
    } finally {
      setContractLoading(false);
    }
  };

  const { data: myPlan } = useQuery<{
    isTrialActive: boolean;
    trialDaysLeft: number | null;
    hasPlan: boolean;
    planName: string | null;
  }>({
    queryKey: ["/api/stripe/my-plan"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A1628]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4A843] border-t-transparent" />
      </div>
    );
  }

  const plans = data?.plans || [];
  const groupedPlans: Record<string, PlanData[]> = {};
  for (const p of plans) {
    if (!groupedPlans[p.group]) groupedPlans[p.group] = [];
    groupedPlans[p.group].push(p);
  }

  return (
    <div className="min-h-screen bg-[#0A1628] px-4 py-12">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-10 text-center">
          <img src="/logo-transparent.png" alt="Ampla Facial" className="mx-auto mb-5 h-24 object-contain" />
          <h1 className="text-4xl font-bold text-white">Escolha seu caminho</h1>
          <p className="mt-2 text-gray-400">
            Do iniciante ao avançado — cada plano é uma etapa da sua evolução em HOF
          </p>

          {myPlan?.isTrialActive && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-900/30 px-5 py-2.5 text-sm text-amber-300">
              <Clock className="h-4 w-4 shrink-0" />
              Seu período gratuito encerra em{" "}
              <strong>{myPlan.trialDaysLeft} dia{myPlan.trialDaysLeft !== 1 ? "s" : ""}</strong>.
              Escolha um plano para continuar com acesso completo.
            </div>
          )}
        </div>

        {/* Campo de código de indicação */}
        <div className="mb-6 rounded-2xl border border-[#1e3a5f] bg-[#0D1E35] p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 w-full">
              <label className="text-xs font-medium text-gray-400 mb-1 block">Codigo de indicacao (opcional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: GUSTAVO-AF7K"
                  value={referralCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setReferralCode(val);
                    setReferralValid(null);
                    setReferralName('');
                  }}
                  onBlur={async () => {
                    if (!referralCode.trim()) { setReferralValid(null); return; }
                    try {
                      const res = await fetch(`/api/credits/validate-referral?code=${encodeURIComponent(referralCode.trim())}`);
                      const data = await res.json();
                      setReferralValid(data.valid);
                      setReferralName(data.name || '');
                    } catch { setReferralValid(false); }
                  }}
                  className="flex-1 rounded-lg border border-[#1e3a5f] bg-[#0A1628] px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-[#D4A843] focus:outline-none font-mono tracking-wider"
                />
              </div>
              {referralValid === true && (
                <p className="text-xs text-emerald-400 mt-1.5">Indicado por <strong>{referralName}</strong>. Voce ganha <strong>10% de desconto</strong> e quem indicou ganha 10% em creditos!</p>
              )}
              {referralValid === false && referralCode.trim() && (
                <p className="text-xs text-red-400 mt-1.5">Codigo nao encontrado. Verifique e tente novamente.</p>
              )}
            </div>
          </div>
        </div>

        {/* Credit balance banner — desconto aplicado automaticamente */}
        {creditBalance > 0 && (
          <div className="mb-8 rounded-2xl border border-[#D4A843]/30 bg-[#0D1E35] p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#D4A843]/15 flex items-center justify-center shrink-0">
                <Star className="h-5 w-5 text-[#D4A843]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Desconto de <span className="text-[#D4A843]">{formatBRL(creditBalance)}</span> aplicado automaticamente</p>
                <p className="text-xs text-gray-400 mt-0.5">Seu saldo de creditos sera usado como desconto no checkout. Se cobrir 100% do valor, o acesso e liberado na hora.</p>
              </div>
            </div>
          </div>
        )}

        {/* Como funciona o processo */}
        <div className="mb-10 rounded-2xl border border-[#1e3a5f] bg-[#0D1E35] p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="h-4 w-4 text-[#D4A843]" />
            <p className="text-sm font-semibold text-white">Como funciona</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-400">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4A843]/15 text-xs font-bold text-[#D4A843]">1</span>
              <span>Escolha o plano que faz sentido para o seu momento profissional</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4A843]/15 text-xs font-bold text-[#D4A843]">2</span>
              <span>Clique em "Pagar e acessar agora" — você é redirecionado para o checkout seguro</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4A843]/15 text-xs font-bold text-[#D4A843]">3</span>
              <span>Acesso liberado imediatamente após o pagamento confirmado</span>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-8 flex justify-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedGroup(null)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
              !selectedGroup ? "bg-[#D4A843] text-[#0A1628]" : "border border-[#1e3a5f] text-gray-400 hover:border-[#D4A843]/40"
            }`}
          >
            Todos
          </button>
          {GROUP_ORDER.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGroup(g === selectedGroup ? null : g)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                selectedGroup === g ? "bg-[#D4A843] text-[#0A1628]" : "border border-[#1e3a5f] text-gray-400 hover:border-[#D4A843]/40"
              }`}
            >
              {GROUP_LABELS[g]}
            </button>
          ))}
        </div>

        {/* Grupos */}
        {GROUP_ORDER.filter((g) => !selectedGroup || selectedGroup === g).map((group) => {
          const groupPlans = groupedPlans[group] || [];
          if (!groupPlans.length) return null;
          return (
            <div key={group} className="mb-14">
              <div className="mb-6 text-center">
                <div className="inline-block rounded-full border border-[#D4A843]/30 bg-[#D4A843]/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-[#D4A843]">
                  {GROUP_LABELS[group]}
                </div>
                <p className="mt-2 text-sm text-gray-500">{GROUP_DESCRIPTIONS[group]}</p>
              </div>
              <div className={`grid gap-6 ${
                groupPlans.length === 1 ? "max-w-sm mx-auto" :
                groupPlans.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto" :
                "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              }`}>
                {groupPlans.map((plan) => (
                  <PlanCard
                    key={plan.key}
                    plan={plan}
                    onPagar={handlePagar}
                    isLoading={checkoutMutation.isPending && loadingKey === plan.key}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Política de upgrade */}
        <div className="mt-4 rounded-2xl border border-[#1e3a5f] bg-[#0D1E35] p-6 text-center">
          <Star className="mx-auto mb-3 h-6 w-6 text-[#D4A843]" />
          <h3 className="text-lg font-semibold text-white">Upgrade com crédito do que já pagou</h3>
          <p className="mt-2 text-sm text-gray-400">
            Dentro de 60 dias: 100% do valor pago vira crédito no próximo plano. Após 60 dias: 70%.
            Você sempre paga apenas a diferença.
          </p>
        </div>

        {/* Aviso de mentoria necessária para horas (aparece só se grupo horas está visível e aluno não tem mentoria) */}
        {(!selectedGroup || selectedGroup === "horas") && user && !MENTORIA_PLANS.includes(user.planKey || "") && (groupedPlans["horas"] || []).length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
            <Clock className="mx-auto mb-3 h-6 w-6 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">Mentoria ativa necessária</h3>
            <p className="mt-2 text-sm text-gray-400">
              Para adquirir pacotes de horas clínicas extras, você precisa ter um plano de Mentoria VIP ativo (Online, Presencial ou Completo).
            </p>
          </div>
        )}

      </div>

      {/* Contract Acceptance Modal */}
      {contractDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setContractDialogOpen(false)}>
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-[#1e3a5f] bg-[#0D1E35] shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-[#1e3a5f] px-6 py-4">
              <FileSignature className="h-5 w-5 text-[#D4A843]" />
              <h2 className="text-lg font-bold text-white">Termos de Contratação</h2>
              <button onClick={() => setContractDialogOpen(false)} className="ml-auto text-gray-400 hover:text-white text-xl leading-none">&times;</button>
            </div>

            {/* Contract HTML */}
            <div ref={contractScrollRef} className="flex-1 overflow-y-auto p-1">
              <div
                className="rounded-xl bg-white p-6 text-sm"
                dangerouslySetInnerHTML={{ __html: contractHtml }}
              />
            </div>

            {/* Accept */}
            <div className="border-t border-[#1e3a5f] px-6 py-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contractAccepted}
                  onChange={e => setContractAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-600 text-[#D4A843] focus:ring-[#D4A843] accent-[#D4A843]"
                />
                <span className="text-sm text-gray-300">
                  Li e aceito integralmente os termos de contratação acima
                </span>
              </label>
              <button
                disabled={!contractAccepted || contractLoading}
                onClick={handleAcceptContract}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4A843] py-3 font-semibold text-[#0A1628] transition-all hover:bg-[#e8b84d] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {contractLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</>
                ) : (
                  <><Check className="h-4 w-4" /> Aceitar e continuar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
