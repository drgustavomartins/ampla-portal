import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  Check, Star, Clock, Zap, Users, Video,
  ChevronDown, ChevronUp, MessageCircle,
} from "lucide-react";
import { BotaoEspecialista } from "@/components/whatsapp-especialista";

interface PlanData {
  key: string;
  name: string;
  description: string;
  group: "digital" | "observador" | "vip";
  highlight?: string;
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
  digital: "Aprenda no seu ritmo com aulas gravadas e materiais científicos",
  observador: "Observe a rotina clínica real do Dr. Gustavo presencialmente",
  vip: "Mentoria individual e formação completa em HOF",
};

const GROUP_ORDER = ["digital", "observador", "vip"];

function PlanCard({ plan, userEmail }: { plan: PlanData; userEmail?: string }) {
  const [expanded, setExpanded] = useState(false);
  const isVip = plan.group === "vip";
  const isDestaque = !!plan.highlight || isVip;
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

      {/* CTA */}
      <BotaoEspecialista
        planName={plan.name}
        email={userEmail}
        destaque={isDestaque}
      />
    </div>
  );
}

export default function PlanosPage() {
  const { user } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ plans: PlanData[] }>({
    queryKey: ["/api/stripe/plans"],
  });

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
          <img src="/logo-transparent.png" alt="Ampla Facial" className="mx-auto mb-5 h-12 object-contain" />
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

        {/* Como funciona o processo */}
        <div className="mb-10 rounded-2xl border border-[#1e3a5f] bg-[#0D1E35] p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="h-4 w-4 text-[#25D366]" />
            <p className="text-sm font-semibold text-white">Como funciona</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-400">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4A843]/15 text-xs font-bold text-[#D4A843]">1</span>
              <span>Escolha o plano que faz sentido para o seu momento profissional</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4A843]/15 text-xs font-bold text-[#D4A843]">2</span>
              <span>Clique em "Falar com especialista" — ela te atende pelo WhatsApp</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4A843]/15 text-xs font-bold text-[#D4A843]">3</span>
              <span>Acesso liberado após confirmação — geralmente no mesmo dia</span>
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
                  <PlanCard key={plan.key} plan={plan} userEmail={user?.email} />
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

      </div>
    </div>
  );
}
