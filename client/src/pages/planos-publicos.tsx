import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check, Clock, Zap, Users, Video, Award, Star, MessageCircle, ArrowRight, Shield,
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
}

const GROUP_ORDER = ["digital", "observador", "vip"];

const GROUP_LABELS: Record<string, string> = {
  digital: "Acesso Digital",
  observador: "Observação Clínica",
  vip: "Mentoria VIP",
};

const GROUP_DESCRIPTIONS: Record<string, string> = {
  digital: "Estude no seu ritmo com aulas gravadas e materiais científicos exclusivos",
  observador: "Acompanhe a rotina clínica real do Dr. Gustavo presencialmente",
  vip: "Formação completa com mentoria individual em harmonização orofacial",
};

function PlanCard({ plan }: { plan: PlanData }) {
  const isDestaque = !!plan.highlight || plan.group === "vip";
  const mainFeatures = plan.features.filter(f => !f.toLowerCase().includes("certificado"));
  const hasCertificate = plan.features.some(f => f.toLowerCase().includes("certificado"));

  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl border transition-all duration-200 hover:scale-[1.015] hover:shadow-xl ${
        isDestaque
          ? "border-[#D4A843] bg-gradient-to-b from-[#1a2d4d] to-[#0D1E35] shadow-[0_0_32px_rgba(212,168,67,0.15)]"
          : "border-[#1e3a5f] bg-[#0D1E35] hover:border-[#D4A843]/30"
      } p-6`}
    >
      {plan.highlight && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#D4A843] px-4 py-1 text-xs font-bold text-[#0A1628] shadow-lg">
          {plan.highlight}
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white">{plan.name}</h3>
        <p className="mt-1 text-sm text-gray-400 leading-snug">{plan.description}</p>
      </div>

      {/* Badges de destaque */}
      {(plan.clinicalHours > 0 || plan.practiceHours > 0 || plan.hasLiveEvents || plan.hasMentorship) && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {plan.clinicalHours > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-900/20 px-2.5 py-1 text-xs text-blue-300">
              <Clock className="h-3 w-3" /> {plan.clinicalHours}h observação
            </span>
          )}
          {plan.practiceHours > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-green-500/20 bg-green-900/20 px-2.5 py-1 text-xs text-green-300">
              <Zap className="h-3 w-3" /> {plan.practiceHours}h prática c/ paciente
            </span>
          )}
          {plan.hasLiveEvents && (
            <span className="flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-900/20 px-2.5 py-1 text-xs text-purple-300">
              <Video className="h-3 w-3" /> Encontros ao vivo
            </span>
          )}
          {plan.hasMentorship && (
            <span className="flex items-center gap-1 rounded-full border border-yellow-500/20 bg-yellow-900/20 px-2.5 py-1 text-xs text-yellow-300">
              <Users className="h-3 w-3" /> Mentoria individual
            </span>
          )}
        </div>
      )}

      {/* Divisor sutil */}
      <div className="mb-4 h-px bg-white/5" />

      {/* Features */}
      <ul className="mb-4 flex-1 space-y-2.5">
        {mainFeatures.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4A843]" />
            <span className="leading-snug">{f}</span>
          </li>
        ))}
      </ul>

      {/* Certificado — sempre visível, destacado */}
      {hasCertificate && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-[#D4A843]/25 bg-[#D4A843]/8 px-3 py-2.5">
          <Award className="h-4 w-4 shrink-0 text-[#D4A843]" />
          <span className="text-xs font-medium text-[#D4A843]/90">Certificado de participação</span>
        </div>
      )}

      {/* CTA */}
      <div className="mt-auto">
        <BotaoEspecialista planName={plan.name} destaque={isDestaque} />
      </div>
    </div>
  );
}

export default function PlanosPublicos() {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ plans: PlanData[] }>({
    queryKey: ["/api/stripe/plans"],
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A1628]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4A843] border-t-transparent" />
      </div>
    );
  }

  const plans = data?.plans || [];
  const grouped: Record<string, PlanData[]> = {};
  for (const p of plans) {
    if (!grouped[p.group]) grouped[p.group] = [];
    grouped[p.group].push(p);
  }

  return (
    <div className="min-h-screen bg-[#0A1628] px-4 pb-16 pt-10">
      <div className="mx-auto max-w-6xl">

        {/* ── Hero ── */}
        <div className="mb-12 text-center">
          <img
            src="/logo-transparent.png"
            alt="Ampla Facial"
            className="mx-auto mb-7 h-20 object-contain"
          />

          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#D4A843]">
            Formação em Harmonização Orofacial
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
            Escolha seu caminho
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base text-gray-400 leading-relaxed">
            Do digital ao presencial — cada plano é uma etapa concreta da sua evolução clínica em HOF.
          </p>

          {/* Trust signals */}
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-[#D4A843]" />
              Acesso liberado no mesmo dia
            </span>
            <span className="flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5 text-[#D4A843]" />
              Upgrade com 100% de crédito em 60 dias
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[#D4A843]" />
              Atendimento personalizado pelo WhatsApp
            </span>
          </div>
        </div>

        {/* ── Como funciona ── */}
        <div className="mb-10 rounded-2xl border border-[#1e3a5f] bg-[#0D1E35] px-6 py-5">
          <div className="mb-4 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-[#25D366]" />
            <p className="text-sm font-semibold text-white">Como funciona a contratação</p>
          </div>
          <div className="grid grid-cols-1 gap-4 text-sm text-gray-400 sm:grid-cols-3">
            {[
              "Explore os planos e veja o que cada um inclui",
              "Clique em \"Falar com especialista\" — te atendemos pelo WhatsApp",
              "Acesso liberado após confirmação, geralmente no mesmo dia",
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4A843]/15 text-xs font-bold text-[#D4A843]">
                  {i + 1}
                </span>
                <span className="leading-snug">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Filtros ── */}
        <div className="mb-10 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setSelectedGroup(null)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
              !selectedGroup
                ? "bg-[#D4A843] text-[#0A1628] shadow"
                : "border border-[#1e3a5f] text-gray-400 hover:border-[#D4A843]/40"
            }`}
          >
            Todos
          </button>
          {GROUP_ORDER.filter((g) => grouped[g]?.length).map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGroup(g === selectedGroup ? null : g)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                selectedGroup === g
                  ? "bg-[#D4A843] text-[#0A1628] shadow"
                  : "border border-[#1e3a5f] text-gray-400 hover:border-[#D4A843]/40"
              }`}
            >
              {GROUP_LABELS[g]}
            </button>
          ))}
        </div>

        {/* ── Grupos de planos ── */}
        {GROUP_ORDER.filter((g) => !selectedGroup || selectedGroup === g).map((group) => {
          const groupPlans = grouped[group] || [];
          if (!groupPlans.length) return null;
          return (
            <div key={group} className="mb-14">
              <div className="mb-7 text-center">
                <div className="inline-block rounded-full border border-[#D4A843]/30 bg-[#D4A843]/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-[#D4A843]">
                  {GROUP_LABELS[group]}
                </div>
                <p className="mt-2 text-sm text-gray-500">{GROUP_DESCRIPTIONS[group]}</p>
              </div>
              <div
                className={`grid items-stretch gap-6 ${
                  groupPlans.length === 1
                    ? "max-w-lg mx-auto"
                    : groupPlans.length === 2
                    ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                }`}
              >
                {groupPlans.map((plan) => (
                  <PlanCard key={plan.key} plan={plan} />
                ))}
              </div>
            </div>
          );
        })}

        {/* ── Upgrade ── */}
        <div className="mt-4 rounded-2xl border border-[#1e3a5f] bg-[#0D1E35] p-6 text-center">
          <Star className="mx-auto mb-3 h-5 w-5 text-[#D4A843]" />
          <h3 className="text-base font-semibold text-white">Começou pequeno? Seu investimento não vai embora.</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-400 leading-relaxed">
            Dentro de 60 dias você aproveita <span className="text-white font-medium">100% do valor pago</span> como crédito no próximo plano.
            Após isso, 70%. Você sempre paga apenas a diferença.
          </p>
        </div>

        {/* ── Trial ── */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Quer conhecer antes de decidir?{" "}
            <a href="/#/" className="text-[#D4A843] hover:underline">
              Teste grátis por 7 dias
            </a>
            {" "}— sem compromisso.
          </p>
        </div>

      </div>
    </div>
  );
}
