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

      {/* Preço */}
      <div className="mb-5">
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
      <ul className="mb-4 flex-1 space-y-2.5">
        {mainFeatures.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4A843]" />
            <span className="leading-snug">{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isNegociacao ? (
        <div className="mt-auto space-y-2">
          <p className="text-center text-xs text-[#D4A843]/70">
            {plan.practiceHours > 0
              ? "Inclui prática com paciente modelo — requer entrevista prévia."
              : "Requer entrevista com o Dr. Gustavo antes da matrícula."}
          </p>
          <a
            href={WHATSAPP_NEGOCIACAO(plan.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-semibold whitespace-nowrap text-white transition-all hover:bg-[#1ebe5d]"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Solicitar vaga
          </a>
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
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
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

  const plans = data?.plans || [];

  const planosDirectos = plans.filter((p) => !NEGOCIACAO_DIRETA.includes(p.key));
  const planosNegociacao = plans.filter((p) => NEGOCIACAO_DIRETA.includes(p.key));

  const grupos: Record<string, PlanData[]> = {};
  for (const p of planosDirectos) {
    if (!grupos[p.group]) grupos[p.group] = [];
    grupos[p.group].push(p);
  }

  const GROUP_LABELS: Record<string, string> = {
    digital: "Acesso Digital",
    observador: "Observação Clínica Presencial",
  };
  const GROUP_DESCRIPTIONS: Record<string, string> = {
    digital: "Estude no seu ritmo com aulas gravadas e materiais científicos",
    observador: "Acompanhe a rotina clínica real do Dr. Gustavo presencialmente",
  };

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

        <div className="mb-10 text-center">
          <img src="/logo-transparent.png" alt="Ampla Facial" className="mx-auto mb-5 h-14 object-contain" />
          <h1 className="text-3xl font-bold text-white">Escolha seu plano e comece agora</h1>
          <p className="mt-2 text-gray-400">Acesso liberado imediatamente após o pagamento — cartão</p>

          <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-400" /> Acesso imediato</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-400" /> Pagamento seguro via Stripe</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-400" /> Upgrade com crédito a qualquer momento</span>
          </div>
        </div>

        {["digital", "observador"].map((group) => {
          const groupPlans = grupos[group] || [];
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
            <div className={`grid items-stretch gap-6 ${
              planosNegociacao.length <= 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto" :
              "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            }`}>
              {planosNegociacao.map((plan) => (
                <PlanCard
                  key={plan.key}
                  plan={plan}
                  onPagar={handlePagar}
                  isLoading={false}
                />
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-[#1e3a5f] bg-[#0D1E35] p-6 text-center">
          <Star className="mx-auto mb-3 h-5 w-5 text-[#D4A843]" />
          <h3 className="text-base font-semibold text-white">Começou pequeno? Seu investimento não vai embora.</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-400 leading-relaxed">
            Dentro de 60 dias você aproveita <span className="text-white font-medium">100% do valor pago</span> como crédito no próximo plano.
            Após isso, 70%. Você sempre paga apenas a diferença.
          </p>
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
