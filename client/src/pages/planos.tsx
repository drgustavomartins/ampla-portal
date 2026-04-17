import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Check, Star, Clock, Zap, Users, Video,
  ChevronDown, ChevronUp, ArrowRight, Loader2,
  TrendingUp, MessageCircle, FileSignature, ChevronLeft, Info, MapPin,} from "lucide-react";

function formatBRL(c: number) {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const NEGOCIACAO_DIRETA: string[] = []; // Todos os planos vao pelo Stripe

const WHATSAPP_NEGOCIACAO = (planName: string) =>
  `https://wa.me/5521976263881?text=${encodeURIComponent(
    `Olá! Vim pela página de planos da Ampla Facial e tenho interesse no ${planName}. Pode me ajudar com as próximas etapas?`
  )}`;

interface PlanData {
  key: string;
  name: string;
  description: string;
  group: "digital" | "observador" | "vip" | "horas" | "observacao_extra";
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
  observacao_extra: "Turnos de Observação",
  cursos: "Cursos Individuais",
};

const GROUP_DESCRIPTIONS: Record<string, string> = {
  digital: "Aprenda no seu ritmo com aulas gravadas e materiais científicos",
  observador: "Observe a rotina clínica real do Dr. Gustavo presencialmente",
  vip: "Mentoria individual e formação completa em HOF",
  horas: "Exclusivo para alunos com mentoria VIP ativa ou concluida",
  observacao_extra: "Turnos adicionais de observação clínica para alunos com mentoria ativa",
  cursos: "Teoria online + encontro ao vivo + prática presencial",
};

const GROUP_ORDER = ["digital", "observador", "vip", "horas", "observacao_extra"];

// Planos de mentoria que permitem comprar horas extras e turnos de observação
const MENTORIA_PLANS = ["vip_online", "vip_presencial", "vip_completo", "observador_essencial", "observador_avancado", "observador_intensivo"];

function PlanCard({ plan, onPagar, isLoading }: { plan: PlanData; onPagar: (key: string) => void; isLoading: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const isNegociacao = NEGOCIACAO_DIRETA.includes(plan.key);
  const isDestaque = !!plan.highlight || plan.group === "vip";
  const visibleFeatures = expanded ? plan.features : plan.features.slice(0, 5);

  return (
    <div
      className={`relative flex flex-col rounded-2xl border transition-all duration-200 ${
        isDestaque
          ? "border-[#B8860B]/40 bg-[#FDFBF5] shadow-sm"
          : "border-gray-200 bg-white hover:border-gray-300"
      } p-6`}
    >
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#B8860B] px-4 py-1 text-xs font-bold text-white">
          {plan.highlight}
        </div>
      )}

      {/* Header */}
      <div className="mb-3">
        <h3 className={`text-lg font-bold ${isDestaque ? "text-[#1a1a1a]" : "text-[#1a1a1a]"}`}>{plan.name}</h3>
        <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
      </div>

      {/* Badges */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {plan.clinicalHours > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700">
            <Clock className="h-3 w-3" /> {plan.clinicalHours}h observação
          </span>
        )}
        {plan.practiceHours > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs text-green-700">
            <Zap className="h-3 w-3" /> {plan.practiceHours}h prática
          </span>
        )}
        {plan.hasLiveEvents && (
          <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs text-purple-700">
            <Video className="h-3 w-3" /> Ao vivo
          </span>
        )}
        {plan.hasMentorship && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700">
            <Users className="h-3 w-3" /> Mentoria individual
          </span>
        )}
      </div>

      {/* Features */}
      <ul className="mb-2 flex-1 space-y-2">
        {visibleFeatures.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {plan.features.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mb-5 flex items-center gap-1 text-xs text-[#B8860B]/70 hover:text-[#B8860B] transition-colors"
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
        <div className={`mb-3 rounded-xl border px-3 py-2 ${
          isDestaque ? "bg-[#B8860B]/10 border-[#B8860B]/20" : "bg-gray-50 border-gray-200"
        }`}>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <TrendingUp className="h-3.5 w-3.5 text-[#B8860B]" />
            <span>Se fosse curso a curso, pagaria</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-500 line-through">
              {(plan.valorMercado / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-600">
              -{Math.round((1 - plan.price / plan.valorMercado) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Preço */}
      {plan.priceFormatted && (
        <div className="mb-4">
          <div className={`text-2xl font-bold ${isDestaque ? "text-[#B8860B]" : "text-[#1a1a1a]"}`}>{plan.priceFormatted}</div>
          {plan.installments12xFormatted && (
            <div className="text-xs text-gray-500">ou 12x de {plan.installments12xFormatted}</div>
          )}
        </div>
      )}

      {/* CTA */}
      {isNegociacao ? (
        <div className="space-y-2">
          <p className="text-center text-xs text-[#B8860B]/70">
            {plan.practiceHours > 0
              ? "Inclui prática com paciente modelo — requer entrevista prévia."
              : "Requer entrevista com o Dr. Gustavo antes da matrícula."}
          </p>
          <a
            href={WHATSAPP_NEGOCIACAO(plan.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-semibold text-[#1a1a1a] hover:bg-[#1ebe5d] transition-all"
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
              ? "bg-[#B8860B] text-white hover:bg-[#9a7209]"
              : "border border-gray-300 text-[#1a1a1a] hover:bg-gray-50"
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
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
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erro ao gerar link");
      return json;
    },
    onSuccess: (data) => {
      if (data.paidWithCredits) {
        queryClient.invalidateQueries();
        alert("Compra realizada com sucesso usando seus creditos!");
        window.location.hash = "/";
        return;
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
    // Bloquear horas clínicas e observação extra se não tem mentoria ativa
    if ((planKey.startsWith("horas_clinicas") || planKey.startsWith("observacao_extra")) && !MENTORIA_PLANS.includes(user?.planKey || "")) {
      alert("Para adquirir este pacote, você precisa ter um plano de Mentoria VIP ou Observação Clínica ativo.");
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
      <div className="flex min-h-screen items-center justify-center bg-[#F7F6F2]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4A843] border-t-transparent" />
      </div>
    );
  }

  const plans = (data?.plans || []).filter((p) => p.key !== "workshop");
  const groupedPlans: Record<string, PlanData[]> = {};
  for (const p of plans) {
    if (!groupedPlans[p.group]) groupedPlans[p.group] = [];
    groupedPlans[p.group].push(p);
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-20">
            {/* Back button */}
            <button onClick={() => window.history.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
            
            {/* Logo */}
            <img src="/logo-transparent.png" alt="Ampla Facial" className="h-16 object-contain" />
            
            {/* Desktop: category tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {["Todos", ...Object.keys(groupedPlans), "cursos"].map(g => (
                <button
                  key={g}
                  onClick={() => setSelectedGroup(g === "Todos" ? null : g)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    (g === "Todos" && !selectedGroup) || selectedGroup === g
                      ? "bg-[#1a1a1a] text-white"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  }`}
                >
                  {g === "Todos" ? "Todos" : GROUP_LABELS[g] || g}
                </button>
              ))}
            </nav>
            
            {/* Mobile: hamburger */}
            <button
              className="md:hidden flex items-center justify-center w-10 h-10"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Menu"
            >
              <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
                <path d="M0 1h20M0 7h20M0 13h20" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <img src="/logo-transparent.png" alt="Ampla Facial" className="h-10 object-contain" />
            <button onClick={() => setMobileMenuOpen(false)} className="w-10 h-10 flex items-center justify-center" aria-label="Fechar">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M1 1l16 16M17 1L1 17" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <nav className="px-6 pt-6 space-y-1">
            {["Todos", ...Object.keys(groupedPlans), "cursos"].map(g => (
              <button
                key={g}
                onClick={() => { setSelectedGroup(g === "Todos" ? null : g); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 w-full text-left py-3.5 border-b border-gray-100 text-lg font-semibold ${
                  (g === "Todos" && !selectedGroup) || selectedGroup === g ? "text-[#B8860B]" : "text-[#1a1a1a]"
                }`}
              >
                {g === "Todos" ? "Todos" : GROUP_LABELS[g] || g}
              </button>
            ))}
          </nav>
        </div>
      )}

      <div className="px-4 py-8 mx-auto max-w-7xl">
        {/* Title, referral, como funciona - only when showing all */}
        <div className={`mb-8 text-center ${selectedGroup ? 'hidden' : ''}`}>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1a1a1a]">Escolha seu caminho</h1>
          <p className="mt-2 text-gray-500">Do iniciante ao avancado, cada plano e uma etapa da sua evolucao em HOF</p>
          {myPlan?.isTrialActive && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm text-amber-600">
              <Clock className="h-4 w-4 shrink-0" />
              Seu periodo gratuito encerra em <strong>{myPlan.trialDaysLeft} dia{myPlan.trialDaysLeft !== 1 ? "s" : ""}</strong>. Escolha um plano para continuar.
            </div>
          )}
        </div>

          {/* Info banner - codigo de indicacao so vale no cadastro */}
          <div className="mb-6 rounded-xl bg-blue-50 border border-blue-200 px-5 py-3 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700">
              O codigo de indicacao da direito a 10% de desconto e e valido apenas na primeira compra. Se voce recebeu um codigo, use-o na <a href="/#/planos-publicos" className="underline font-semibold">pagina de cadastro</a>.
            </p>
          </div>

          {/* Credit balance banner — desconto aplicado automaticamente */}
          {creditBalance > 0 && (
            <div className="mb-8 rounded-2xl border border-[#D4A843]/40 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#D4A843]/15 flex items-center justify-center shrink-0">
                  <Star className="h-5 w-5 text-[#B8860B]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1a1a1a]">Desconto de <span className="text-[#B8860B]">{formatBRL(creditBalance)}</span> aplicado automaticamente</p>
                  <p className="text-xs text-gray-500 mt-0.5">Seu saldo de creditos sera usado como desconto no checkout. Se cobrir 100% do valor, o acesso e liberado na hora.</p>
                </div>
              </div>
            </div>
          )}

          {/* Como funciona o processo */}
          <div className="mb-10 rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="h-4 w-4 text-[#B8860B]" />
              <p className="text-sm font-semibold text-[#1a1a1a]">Como funciona</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-500">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4A843]/15 text-xs font-bold text-[#B8860B]">1</span>
                <span>Escolha o plano que faz sentido para o seu momento profissional</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4A843]/15 text-xs font-bold text-[#B8860B]">2</span>
                <span>Clique em "Pagar e acessar agora" — você é redirecionado para o checkout seguro</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4A843]/15 text-xs font-bold text-[#B8860B]">3</span>
                <span>Acesso liberado imediatamente após o pagamento confirmado</span>
              </div>
            </div>
          </div>

          {/* Grupos */}
          {GROUP_ORDER.filter((g) => !selectedGroup || selectedGroup === g).map((group) => {
            const groupPlans = groupedPlans[group] || [];
            if (!groupPlans.length) return null;
            return (
              <div key={group} className="mb-14">
                <div className="mb-6 text-center">
                  <div className="inline-block rounded-full border border-[#D4A843]/40 bg-[#D4A843]/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-[#B8860B]">
                    {GROUP_LABELS[group]}
                  </div>
                  <p className="mt-2 text-sm text-gray-500">{GROUP_DESCRIPTIONS[group]}</p>
                </div>
                <div className={`grid gap-6 mx-auto ${
                  groupPlans.length === 1 ? "max-w-md" :
                  groupPlans.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-3xl" :
                  groupPlans.length === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl" :
                  "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl"
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

          {/* ── CURSOS INDIVIDUAIS (static, WhatsApp CTA) ───── */}
          {(!selectedGroup || selectedGroup === "cursos") && (
            <div className="mb-14">
              <div className="mb-6 text-center">
                <div className="inline-block rounded-full border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-[#C9A84C]">
                  Cursos Individuais
                </div>
                <p className="mt-2 text-sm text-gray-500">Teoria online + encontro ao vivo + prática presencial</p>
              </div>
              <div className="grid gap-6 mx-auto grid-cols-1 sm:grid-cols-2 max-w-4xl">
                {[
                  {
                    title: "Curso de Toxina Botulínica",
                    desc: "Domine toxina botulínica da teoria à prática clínica",
                    features: ["30 aulas teóricas online", "Casos clínicos gravados", "Materiais complementares (PDFs, áudios)", "Encontro ao vivo pré-prática com Dr. Gustavo", "Prática presencial com pacientes-modelo", "Certificado de conclusão"],
                    badge: "Conteúdo completo",
                    url: "https://wa.me/5521976263881?text=Ol%C3%A1%20Dr.%20Gustavo%2C%20tenho%20interesse%20no%20Curso%20de%20Toxina%20Botul%C3%ADnica",
                  },
                  {
                    title: "Curso de Preenchedores Faciais",
                    desc: "Preenchimento com segurança em todas as regiões da face",
                    features: ["17 aulas teóricas online", "Anatomia vascular e zonas de perigo", "Materiais complementares", "Encontro ao vivo pré-prática com Dr. Gustavo", "Prática presencial com pacientes-modelo", "Certificado de conclusão"],
                    url: "https://wa.me/5521976263881?text=Ol%C3%A1%20Dr.%20Gustavo%2C%20tenho%20interesse%20no%20Curso%20de%20Preenchedores%20Faciais",
                  },
                  {
                    title: "Curso de Bioestimuladores de Colágeno",
                    desc: "CaHA, PLLA e PCL — protocolos baseados em evidência científica",
                    features: ["Aulas teóricas online (conteúdo em expansão)", "Demonstrações práticas gravadas", "Revisões científicas e artigos", "Encontro ao vivo pré-prática com Dr. Gustavo", "Prática presencial com pacientes-modelo", "Certificado de conclusão"],
                    url: "https://wa.me/5521976263881?text=Ol%C3%A1%20Dr.%20Gustavo%2C%20tenho%20interesse%20no%20Curso%20de%20Bioestimuladores%20de%20Col%C3%A1geno",
                  },
                  {
                    title: "Curso de Biorregeneradores",
                    desc: "iPRF, PDRN, exossomos e intradermoterapia avançada",
                    features: ["Aulas teóricas online (conteúdo em expansão)", "Protocolos de aplicação detalhados", "Evidências científicas atualizadas", "Encontro ao vivo pré-prática com Dr. Gustavo", "Prática presencial com pacientes-modelo", "Certificado de conclusão"],
                    url: "https://wa.me/5521976263881?text=Ol%C3%A1%20Dr.%20Gustavo%2C%20tenho%20interesse%20no%20Curso%20de%20Biorregeneradores",
                  },
                ].map((curso) => (
                  <div
                    key={curso.title}
                    className="relative flex flex-col rounded-2xl border border-[#C9A84C]/20 bg-[#FDFBF5] p-6"
                  >
                    {/* Tags */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="rounded-full bg-[#C9A84C]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#C9A84C]">
                        Teoria + Prática
                      </span>
                      {curso.badge && (
                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-600">
                          {curso.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-[#1a1a1a]">{curso.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{curso.desc}</p>

                    {/* Price */}
                    <div className="mt-4 mb-4">
                      <div className="text-2xl font-bold text-[#C9A84C]">R$ 4.997,00</div>
                      <div className="text-xs text-gray-500">ou 12x de R$ 467</div>
                    </div>

                    {/* Features */}
                    <ul className="flex-1 space-y-2 mb-4">
                      {curso.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A84C]" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Location */}
                    <div className="flex items-start gap-1.5 text-xs text-gray-400 mb-5">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>Prática na Clínica Gustavo Martins — Rio de Janeiro</span>
                    </div>

                    {/* CTA */}
                    <a
                      href={curso.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all hover:brightness-110"
                      style={{ background: "#C9A84C", color: "#0A0500" }}
                    >
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Quero este curso
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Política de upgrade */}
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 text-center">
            <Star className="mx-auto mb-3 h-6 w-6 text-[#B8860B]" />
            <h3 className="text-lg font-semibold text-[#1a1a1a]">Upgrade com crédito do que já pagou</h3>
            <p className="mt-2 text-sm text-gray-500">
              Dentro de 60 dias: 100% do valor pago vira crédito no próximo plano. Após 60 dias: 70%.
              Voce paga apenas a diferenca.
            </p>
          </div>

          {/* Aviso de mentoria necessária para horas/observação extra (aparece se grupo visível e aluno não tem mentoria) */}
          {(!selectedGroup || selectedGroup === "horas" || selectedGroup === "observacao_extra") && user && !MENTORIA_PLANS.includes(user.planKey || "") && ((groupedPlans["horas"] || []).length > 0 || (groupedPlans["observacao_extra"] || []).length > 0) && (
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-500/5 p-6 text-center">
              <Clock className="mx-auto mb-3 h-6 w-6 text-amber-400" />
              <h3 className="text-lg font-semibold text-[#1a1a1a]">Mentoria ativa necessária</h3>
              <p className="mt-2 text-sm text-gray-500">
                Para adquirir pacotes de horas clínicas ou turnos de observação extras, você precisa ter um plano de Mentoria VIP ou Observação Clínica ativo.
              </p>
            </div>
          )}

      </div>

      {/* Contract Acceptance Modal */}
      {contractDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setContractDialogOpen(false)}>
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
              <FileSignature className="h-5 w-5 text-[#B8860B]" />
              <h2 className="text-lg font-bold text-[#1a1a1a]">Termos de Contratação</h2>
              <button onClick={() => setContractDialogOpen(false)} className="ml-auto text-gray-500 hover:text-[#1a1a1a] text-xl leading-none">&times;</button>
            </div>

            {/* Contract HTML */}
            <div ref={contractScrollRef} className="flex-1 overflow-y-auto p-1">
              <div
                className="rounded-xl bg-white p-6 text-sm"
                dangerouslySetInnerHTML={{ __html: contractHtml }}
              />
            </div>

            {/* Accept */}
            <div className="border-t border-gray-200 px-6 py-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contractAccepted}
                  onChange={e => setContractAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-600 text-[#B8860B] focus:ring-[#D4A843] accent-[#D4A843]"
                />
                <span className="text-sm text-gray-600">
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

// deploy Sun Apr 12 01:31:59 UTC 2026
