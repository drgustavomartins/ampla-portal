import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Check, TrendingUp, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { BotaoEspecialista } from "@/components/whatsapp-especialista";

interface UpgradeOption {
  key: string;
  name: string;
  description: string;
  group: string;
  highlight?: string;
  fullPrice: number;
  fullPriceFormatted: string;
  credit: number;
  creditFormatted: string;
  toPay: number;
  toPayFormatted: string;
  features: string[];
  creditNote: string;
}

interface UpgradeData {
  currentPlan: {
    key: string;
    name: string;
    amountPaid: number;
    amountPaidFormatted: string;
    daysSincePurchase: number;
    creditNote: string;
  };
  options: UpgradeOption[];
}

function UpgradeCard({ option, userEmail }: { option: UpgradeOption; userEmail?: string }) {
  const [expanded, setExpanded] = useState(false);
  const isDestaque = !!option.highlight;
  const visibleFeatures = expanded ? option.features : option.features.slice(0, 5);

  return (
    <div
      className={`relative rounded-2xl border p-6 transition-all ${
        isDestaque
          ? "border-[#D4A843] bg-gradient-to-b from-[#1a2d4d] to-[#0D1E35] shadow-[0_0_20px_rgba(212,168,67,0.15)]"
          : "border-[#1e3a5f] bg-[#0D1E35] hover:border-[#D4A843]/30"
      }`}
    >
      {option.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#D4A843] px-4 py-1 text-xs font-bold text-[#0A1628]">
          {option.highlight}
        </div>
      )}

      <h3 className="text-xl font-bold text-white">{option.name}</h3>
      <p className="mt-1 text-sm text-gray-400">{option.description}</p>

      {/* Bloco de crédito — sem revelar o preço final, só a economia */}
      <div className="mt-5 rounded-xl bg-[#0A1628] p-4 space-y-1.5">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Valor já pago pelo plano atual</span>
          <span className="text-green-400 font-medium">{option.creditFormatted} de crédito</span>
        </div>
        <p className="text-xs text-gray-500">{option.creditNote}</p>
        <div className="pt-1 border-t border-[#1e3a5f] text-xs text-[#D4A843]/80">
          Nossa especialista calcula o valor exato para você — sem surpresas.
        </div>
      </div>

      {/* Features */}
      <ul className="mt-4 space-y-1.5">
        {visibleFeatures.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A843]" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {option.features.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 mb-4 flex items-center gap-1 text-xs text-[#D4A843]/70 hover:text-[#D4A843] transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="h-3.5 w-3.5" /> Ver menos</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5" /> Ver mais {option.features.length - 5} benefícios</>
          )}
        </button>
      )}

      <div className="mt-4">
        <BotaoEspecialista
          planName={`upgrade para ${option.name}`}
          email={userEmail}
          destaque={isDestaque}
          label="Solicitar upgrade"
        />
      </div>
    </div>
  );
}

export default function UpgradePage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<UpgradeData>({
    queryKey: ["/api/stripe/upgrade-options"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A1628]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4A843] border-t-transparent" />
      </div>
    );
  }

  if (!data || data.options.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A1628] px-4 text-center">
        <TrendingUp className="mb-4 h-12 w-12 text-[#D4A843]" />
        <h2 className="text-2xl font-bold text-white">Você está no plano mais completo</h2>
        <p className="mt-2 text-gray-400">Não há opções de upgrade disponíveis no momento.</p>
        <Link href="/" className="mt-6 text-[#D4A843] hover:underline">
          Voltar para a plataforma
        </Link>
      </div>
    );
  }

  const { currentPlan, options } = data;

  return (
    <div className="min-h-screen bg-[#0A1628] px-4 py-12">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#D4A843]/10 border border-[#D4A843]/30 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-[#D4A843] mb-4">
            <TrendingUp className="h-3.5 w-3.5" /> Upgrade de plano
          </div>
          <h1 className="text-3xl font-bold text-white">Evolua com crédito do que já pagou</h1>
          <p className="mt-2 text-gray-400">
            Você está no <strong className="text-white">{currentPlan.name}</strong> e já pagou{" "}
            <strong className="text-[#D4A843]">{currentPlan.amountPaidFormatted}</strong>.
            Esse valor entra como crédito no próximo plano.
          </p>
        </div>

        {/* Nota de crédito */}
        <div className="mb-8 rounded-xl border border-blue-800/40 bg-blue-900/20 p-4 flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
          <div className="text-sm text-blue-300">
            <strong>{currentPlan.creditNote}</strong> — você pagou{" "}
            <strong>{currentPlan.amountPaidFormatted}</strong> há{" "}
            {currentPlan.daysSincePurchase} dia{currentPlan.daysSincePurchase !== 1 ? "s" : ""}.
            {currentPlan.daysSincePurchase <= 60
              ? " Está dentro de 60 dias: 100% de crédito garantido."
              : " Passou de 60 dias: crédito de 70% do valor pago."}
            {" "}Nossa especialista calcula o valor exato para você.
          </div>
        </div>

        {/* Cards */}
        <div className="grid gap-6 sm:grid-cols-2">
          {options.map((option) => (
            <UpgradeCard key={option.key} option={option} userEmail={user?.email} />
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          Dúvidas?{" "}
          <BotaoEspecialista
            planName="upgrade de plano"
            email={user?.email}
            label="Falar com especialista"
          />
        </div>

      </div>
    </div>
  );
}
