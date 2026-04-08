import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Check, Star, ArrowRight, Zap, Users, Video, Clock } from "lucide-react";

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
  canUpgradeTo: string[];
}

const GROUP_LABELS: Record<string, string> = {
  digital: "Acesso Digital",
  observador: "Observação Clínica",
  vip: "Mentoria VIP",
};

const GROUP_DESCRIPTIONS: Record<string, string> = {
  digital: "Aprenda no seu ritmo com aulas gravadas",
  observador: "Observe a rotina clínica real presencialmente",
  vip: "Mentoria individual com o Dr. Gustavo",
};

const GROUP_ORDER = ["digital", "observador", "vip"];

function PlanCard({ plan, onSelect, isLoading }: { plan: PlanData; onSelect: (key: string) => void; isLoading: boolean }) {
  const isVipCompleto = plan.key === "vip_completo";

  return (
    <div className={`relative flex flex-col rounded-2xl border transition-all duration-200 hover:scale-[1.02] ${
      isVipCompleto
        ? "border-[#D4A843] bg-gradient-to-b from-[#1a2d4d] to-[#0D1E35] shadow-[0_0_30px_rgba(212,168,67,0.2)]"
        : "border-[#1e3a5f] bg-[#0D1E35] hover:border-[#D4A843]/40"
    } p-6`}>

      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#D4A843] px-4 py-1 text-xs font-bold text-[#0A1628]">
          {plan.highlight}
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-bold text-white">{plan.name}</h3>
        <p className="mt-1 text-sm text-gray-400">{plan.description}</p>
      </div>

      {/* Badges de destaque */}
      <div className="mb-4 flex flex-wrap gap-2">
        {plan.clinicalHours > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-blue-900/40 px-3 py-1 text-xs text-blue-300">
            <Clock className="h-3 w-3" /> {plan.clinicalHours}h presencial
          </span>
        )}
        {plan.practiceHours > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-green-900/40 px-3 py-1 text-xs text-green-300">
            <Zap className="h-3 w-3" /> {plan.practiceHours}h prática
          </span>
        )}
        {plan.hasLiveEvents && (
          <span className="flex items-center gap-1 rounded-full bg-purple-900/40 px-3 py-1 text-xs text-purple-300">
            <Video className="h-3 w-3" /> Ao vivo
          </span>
        )}
        {plan.hasMentorship && (
          <span className="flex items-center gap-1 rounded-full bg-yellow-900/40 px-3 py-1 text-xs text-yellow-300">
            <Users className="h-3 w-3" /> Mentoria individual
          </span>
        )}
      </div>

      {/* Preço */}
      <div className="mb-5">
        <div className="text-3xl font-bold text-[#D4A843]">{plan.priceFormatted}</div>
        {plan.installments12xFormatted && (
          <div className="text-sm text-gray-400">ou 12x de {plan.installments12xFormatted}</div>
        )}
        <div className="text-xs text-gray-500 mt-1">à vista</div>
      </div>

      {/* Features */}
      <ul className="mb-6 flex-1 space-y-2">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A843]" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan.key)}
        disabled={isLoading}
        className={`w-full rounded-xl py-3 font-semibold transition-all ${
          isVipCompleto
            ? "bg-[#D4A843] text-[#0A1628] hover:bg-[#e8b84d]"
            : "border border-[#D4A843] text-[#D4A843] hover:bg-[#D4A843] hover:text-[#0A1628]"
        } disabled:opacity-50`}
      >
        {isLoading ? "Aguarde..." : "Escolher este plano"}
        {!isLoading && <ArrowRight className="ml-2 inline h-4 w-4" />}
      </button>
    </div>
  );
}

export default function PlanosPage() {
  const { user } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const { data, isLoading: loadingPlans } = useQuery<{ plans: PlanData[] }>({
    queryKey: ["/api/stripe/plans"],
  });

  const { data: myPlan } = useQuery<{ isTrialActive: boolean; trialDaysLeft: number | null; hasPlan: boolean; planName: string | null }>({
    queryKey: ["/api/stripe/my-plan"],
    enabled: !!user,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (planKey: string) => {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      return data;
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });

  const plans = data?.plans || [];
  const groupedPlans: Record<string, PlanData[]> = {};
  for (const p of plans) {
    if (!groupedPlans[p.group]) groupedPlans[p.group] = [];
    groupedPlans[p.group].push(p);
  }

  if (loadingPlans) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A1628]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4A843] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1628] px-4 py-12">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-12 text-center">
          <img src="/logo-transparent.png" alt="Ampla Facial" className="mx-auto mb-6 h-12" />
          <h1 className="text-4xl font-bold text-white">Escolha seu caminho</h1>
          <p className="mt-3 text-lg text-gray-400">
            Do iniciante ao avançado — cada plano é uma etapa da sua evolução em HOF
          </p>

          {myPlan?.isTrialActive && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-900/30 border border-amber-500/30 px-6 py-3 text-amber-300">
              <Clock className="h-5 w-5" />
              <span>Seu período gratuito encerra em <strong>{myPlan.trialDaysLeft} dia{myPlan.trialDaysLeft !== 1 ? "s" : ""}</strong>. Escolha um plano para continuar.</span>
            </div>
          )}
        </div>

        {/* Filtro de grupos */}
        <div className="mb-10 flex justify-center gap-3 flex-wrap">
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

        {/* Grupos de planos */}
        {GROUP_ORDER.filter((g) => !selectedGroup || selectedGroup === g).map((group) => {
          const groupPlans = groupedPlans[group] || [];
          if (!groupPlans.length) return null;
          return (
            <div key={group} className="mb-16">
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
                    onSelect={(key) => checkoutMutation.mutate(key)}
                    isLoading={checkoutMutation.isPending && checkoutMutation.variables === plan.key}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Nota de upgrade */}
        <div className="mt-8 rounded-2xl border border-[#1e3a5f] bg-[#0D1E35] p-6 text-center">
          <Star className="mx-auto mb-3 h-6 w-6 text-[#D4A843]" />
          <h3 className="text-lg font-semibold text-white">Começou pequeno? Pode crescer com crédito</h3>
          <p className="mt-2 text-sm text-gray-400">
            Tudo que você já pagou entra como crédito no upgrade. Dentro de 60 dias: 100% de crédito. Depois: 70%.
            Você sempre paga apenas a diferença.
          </p>
        </div>

        {/* Dúvidas via WhatsApp */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Dúvidas sobre qual plano escolher?{" "}
            <a
              href="https://wa.me/5521995523509?text=Olá%2C%20quero%20saber%20mais%20sobre%20os%20planos%20da%20Ampla%20Facial"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D4A843] hover:underline"
            >
              Fale com o Dr. Gustavo no WhatsApp
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
