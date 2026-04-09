import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Check, Clock, Zap, Users, Video, Star, ArrowRight,
  CreditCard, ChevronLeft, Loader2, ChevronDown, ChevronUp,
  Gift, Timer, TrendingUp,
} from "lucide-react";

interface PlanData {
  key: string;
  name: string;
  description: string;
  group: "digital" | "observador" | "vip";
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
  valorMercado: number | null;
}

const NEGOCIACAO_DIRETA: string[] = [];

const WHATSAPP_NEGOCIACAO = (planName: string, coupon?: string) => {
  const base = `Olá! Tenho interesse no ${planName} e gostaria de saber mais.`;
  const msg = coupon ? `${base} Código de indicação: ${coupon}` : base;
  return `https://wa.me/5521995523509?text=${encodeURIComponent(msg)}`;
};
const GROUP_LABELS: Record<string, string> = {
  digital: "Acesso Digital",
  observador: "Observação Clínica Presencial",
};

const GROUP_DESCRIPTIONS: Record<string, string> = {
  digital: "Estude no seu ritmo com aulas gravadas e materiais científicos",
  observador: "Acompanhe a rotina clínica real do Dr. Gustavo presencialmente",
};

function formatBRL(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ── Countdown 24h baseado no timestamp de entrada ──────────────────────────
function useCountdown24h() {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const stored = localStorage.getItem("ampla_visit_ts");
    if (!stored) {
      const now = Date.now();
      localStorage.setItem("ampla_visit_ts", String(now));
      return 24 * 60 * 60;
    }
    const elapsed = Math.floor((Date.now() - parseInt(stored)) / 1000);
    return Math.max(0, 24 * 60 * 60 - elapsed);
  });

  useEffect(() => {
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;
  return { h, m, s, expired: secondsLeft === 0 };
}

// ── Card de plano ──────────────────────────────────────────────────────────
function PlanCard({
  plan,
  onPagar,
  isLoading,
  coupon,
}: {
  plan: PlanData;
  onPagar: (key: string) => void;
  isLoading: boolean;
  coupon: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isNegociacao = NEGOCIACAO_DIRETA.includes(plan.key);
  const isDestaque = plan.key === "vip_completo" || !!plan.highlight;
  const visibleFeatures = expanded ? plan.features : plan.features.slice(0, 5);

  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl border transition-all duration-200 hover:scale-[1.01] ${
        isDestaque
          ? "border-[#D4A843] bg-gradient-to-b from-[#1a2d4d] to-[#0D1E35] shadow-[0_0_30px_rgba(212,168,67,0.18)]"
          : "border-[#1e3a5f] bg-[#0D1E35] hover:border-[#D4A843]/30"
      } p-6`}
    >
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#D4A843] px-4 py-1 text-xs font-bold text-[#0A1628]">
          {plan.highlight}
        </div>
      )}

      <div className="mb-3">
        <h3 className="text-lg font-bold text-white">{plan.name}</h3>
        <p className="mt-1 text-sm text-gray-400">{plan.description}</p>
      </div>

      {/* Badges */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {plan.clinicalHours > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-blue-900/40 px-2.5 py-1 text-xs text-blue-300">
            <Clock className="h-3 w-3" /> {plan.clinicalHours}h observação
          </span>
        )}
        {plan.practiceHours > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-green-900/40 px-2.5 py-1 text-xs text-green-300">
            <Zap className="h-3 w-3" /> {plan.practiceHours}h prática c/ paciente
          </span>
        )}
        {plan.hasLiveEvents && (
          <span className="flex items-center gap-1 rounded-full bg-purple-900/40 px-2.5 py-1 text-xs text-purple-300">
            <Video className="h-3 w-3" /> Encontros ao vivo
          </span>
        )}
        {plan.hasMentorship && (
          <span className="flex items-center gap-1 rounded-full bg-yellow-900/40 px-2.5 py-1 text-xs text-yellow-300">
            <Users className="h-3 w-3" /> Mentoria individual
          </span>
        )}
      </div>

      {/* Valor percebido */}
      {plan.valorMercado && (
        <div className="mb-4 rounded-xl border border-[#D4A843]/20 bg-[#D4A843]/5 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <TrendingUp className="h-3.5 w-3.5 text-[#D4A843]" />
            <span>Se fosse curso a curso, pagaria</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-500 line-through">
              {formatBRL(plan.valorMercado)}
            </span>
            <span className="rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-bold text-green-400">
              -{Math.round((1 - plan.price / plan.valorMercado) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Preço */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-[#D4A843]">{plan.priceFormatted}</div>
        {plan.installments12xFormatted && (
          <div className="text-sm text-gray-400">ou 12x de {plan.installments12xFormatted}</div>
        )}
        {!isNegociacao && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
            <CreditCard className="h-3 w-3" /> Cartão — acesso imediato
          </div>
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
          className="mb-4 flex items-center gap-1 text-xs text-[#D4A843]/70 hover:text-[#D4A843] transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="h-3.5 w-3.5" /> Ver menos</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5" /> Ver mais {plan.features.length - 5} benefícios</>
          )}
        </button>
      )}

      {/* CTA */}
      <div className="mt-auto space-y-2">
        <button
          onClick={() => onPagar(plan.key)}
          disabled={isLoading}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold transition-all disabled:opacity-50 ${
            isDestaque
              ? "bg-[#D4A843] text-[#0A1628] hover:bg-[#e8b84d]"
              : "border border-[#D4A843] text-[#D4A843] hover:bg-[#D4A843] hover:text-[#0A1628]"
          }`}
        >
          {isLoading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Aguarde...</>
          ) : (
            <>Pagar e acessar agora <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
        {(plan.practiceHours > 0 || plan.hasMentorship) && (
          <p className="mt-1 text-center text-xs text-[#D4A843]/60">
            {plan.practiceHours > 0
              ? "Inclui prática com paciente modelo — entrevista agendada após o pagamento."
              : "Mentoria individual — entrevista agendada após o pagamento."}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function PlanosPublicos() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const { h, m, s } = useCountdown24h();

  // Código de indicação via URL: /comecar?ref=CODIGO
  const urlParams = new URLSearchParams(window.location.search);
  const couponCode = urlParams.get("ref") || "";

  const { data, isLoading } = useQuery<{ plans: PlanData[] }>({
    queryKey: ["/api/stripe/plans"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (planKey: string) => {
      const res = await fetch("/api/stripe/public-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erro ao gerar link de pagamento");
      return json;
    },
    onSuccess: (res) => {
      if (res.url) window.location.href = res.url;
    },
    onError: () => {
      setLoadingKey(null);
      alert("Erro ao gerar link. Tente novamente ou fale com o Dr. Gustavo pelo WhatsApp.");
    },
  });

  const handlePagar = (planKey: string) => {
    setLoadingKey(planKey);
    checkoutMutation.mutate(planKey);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A1628]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4A843] border-t-transparent" />
      </div>
    );
  }

  const plans = data?.plans || [];
  const planosDirectos = plans.filter((p) => !NEGOCIACAO_DIRETA.includes(p.key));
  const planosNegociacao = plans.filter((p) => NEGOCIACAO_DIRETA.includes(p.key));

  const grupos: Record<string, PlanData[]> = {};
  for (const p of planosDirectos) {
    if (!grupos[p.group]) grupos[p.group] = [];
    grupos[p.group].push(p);
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="min-h-screen bg-[#0A1628] px-4 py-10">
      {/* Botão voltar */}
      <button
        onClick={() => window.history.back()}
        className="fixed left-4 top-4 z-50 flex items-center gap-1.5 rounded-full border border-[#1e3a5f] bg-[#0D1E35]/80 px-4 py-2 text-sm text-gray-400 backdrop-blur hover:border-[#D4A843]/40 hover:text-[#D4A843] transition-all"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar
      </button>

      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <img src="/logo-transparent.png" alt="Ampla Facial" className="mx-auto mb-5 h-14 object-contain" />
          <h1 className="text-3xl font-bold text-white">Escolha seu plano e comece agora</h1>
          <p className="mt-2 text-gray-400">Acesso liberado imediatamente após o pagamento</p>
          <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-400" /> Acesso imediato</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-400" /> Pagamento seguro via Stripe</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-400" /> Upgrade com crédito a qualquer momento</span>
          </div>
        </div>

        {/* Banner de urgência */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-900/20 to-orange-900/20 p-4">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-3">
              <Timer className="h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-amber-300">
                  Preço especial por tempo limitado
                </p>
                <p className="text-xs text-amber-300/60">
                  Valores podem ser reajustados sem aviso prévio à medida que as vagas são preenchidas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-900/30 px-4 py-2 text-center">
              <div className="text-center">
                <div className="text-xl font-bold tabular-nums text-amber-300">
                  {pad(h)}:{pad(m)}:{pad(s)}
                </div>
                <div className="text-xs text-amber-300/60">sua sessão ativa</div>
              </div>
            </div>
          </div>
        </div>

        {/* Código de indicação ativo */}
        {couponCode && (
          <div className="mb-8 flex items-center gap-3 rounded-2xl border border-green-500/30 bg-green-900/10 px-5 py-4">
            <Gift className="h-5 w-5 shrink-0 text-green-400" />
            <div>
              <p className="text-sm font-semibold text-green-300">Você foi indicado por um aluno</p>
              <p className="text-xs text-green-300/70">
                Código <strong>{couponCode}</strong> aplicado — informe ao falar pelo WhatsApp e garanta seu desconto.
              </p>
            </div>
          </div>
        )}

        {/* Grupos digitais + observador */}
        {["digital", "observador"].map((group) => {
          const groupPlans = grupos[group] || [];
          if (!groupPlans.length) return null;
          return (
            <div key={group} className="mb-14">
              <div className="mb-6 text-center">
                <div className="inline-block rounded-full border border-[#D4A843]/30 bg-[#D4A843]/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-[#D4A843]">
                  {GROUP_LABELS[group]}
                </div>
                <p className="mt-2 text-sm text-gray-500">{GROUP_DESCRIPTIONS[group]}</p>
              </div>
              <div
                className={`grid items-stretch gap-6 ${
                  groupPlans.length <= 2
                    ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                }`}
              >
                {groupPlans.map((plan) => (
                  <PlanCard
                    key={plan.key}
                    plan={plan}
                    onPagar={handlePagar}
                    isLoading={checkoutMutation.isPending && loadingKey === plan.key}
                    coupon={couponCode}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Mentoria VIP */}
        {planosNegociacao.length > 0 && (
          <div className="mb-14">
            <div className="mb-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#1e3a5f]" />
              <div className="text-center">
                <div className="inline-block rounded-full border border-[#D4A843]/30 bg-[#D4A843]/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-[#D4A843]">
                  Mentoria VIP + Imersão
                </div>
                <p className="mt-2 text-sm text-gray-500">Vagas limitadas — requer entrevista prévia com o Dr. Gustavo</p>
              </div>
              <div className="h-px flex-1 bg-[#1e3a5f]" />
            </div>
            <div
              className={`grid items-stretch gap-6 ${
                planosNegociacao.length <= 2
                  ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {planosNegociacao.map((plan) => (
                <PlanCard
                  key={plan.key}
                  plan={plan}
                  onPagar={handlePagar}
                  isLoading={false}
                  coupon={couponCode}
                />
              ))}
            </div>
          </div>
        )}

        {/* Política de upgrade */}
        <div className="rounded-2xl border border-[#1e3a5f] bg-[#0D1E35] p-6 text-center">
          <Star className="mx-auto mb-3 h-5 w-5 text-[#D4A843]" />
          <h3 className="font-semibold text-white">Começou num plano menor? Faça upgrade com crédito</h3>
          <p className="mt-1.5 text-sm text-gray-400">
            Dentro de 60 dias: 100% do que pagou vira crédito no próximo plano. Você paga só a diferença.
          </p>
        </div>

        {/* Sistema de indicação */}
        <div className="mt-6 rounded-2xl border border-[#1e3a5f] bg-[#0D1E35] p-6">
          <div className="flex items-start gap-3">
            <Gift className="mt-0.5 h-5 w-5 shrink-0 text-[#D4A843]" />
            <div>
              <h3 className="font-semibold text-white">Indique um colega e ganhe R$1.000 em crédito</h3>
              <p className="mt-1 text-sm text-gray-400">
                Alunos matriculados recebem um código de indicação único. Quando o indicado fechar qualquer plano,
                você recebe R$1.000 de crédito para usar no seu próximo upgrade. Consulte seu código no painel do aluno.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a href="/#/" className="text-sm text-gray-500 hover:text-[#D4A843] transition-colors">
            <ChevronLeft className="inline h-4 w-4" /> Já tenho conta — fazer login
          </a>
        </div>

      </div>
    </div>
  );
}
