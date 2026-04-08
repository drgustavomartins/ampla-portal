import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Check, ArrowRight, TrendingUp, Info } from "lucide-react";
import { Link } from "wouter";

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

export default function UpgradePage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<UpgradeData>({
    queryKey: ["/api/stripe/upgrade-options"],
    enabled: !!user,
  });

  const upgradeMutation = useMutation({
    mutationFn: async (planKey: string) => {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planKey, isUpgrade: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
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
        <Link href="/" className="mt-6 text-[#D4A843] hover:underline">Voltar para a plataforma</Link>
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
              ? " Como está dentro de 60 dias, aproveita 100% de crédito."
              : " Como passou de 60 dias, o crédito é de 70% do valor pago."}
          </div>
        </div>

        {/* Cards de upgrade */}
        <div className="grid gap-6 sm:grid-cols-2">
          {options.map((option) => {
            const savings = option.fullPrice - option.toPay;
            const isPending = upgradeMutation.isPending && upgradeMutation.variables === option.key;

            return (
              <div
                key={option.key}
                className={`relative rounded-2xl border p-6 transition-all hover:scale-[1.01] ${
                  option.highlight
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

                {/* Preço com crédito */}
                <div className="mt-5 rounded-xl bg-[#0A1628] p-4">
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>Valor cheio</span>
                    <span className="line-through">{option.fullPriceFormatted}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-green-400">
                    <span>Seu crédito</span>
                    <span>- {option.creditFormatted}</span>
                  </div>
                  <div className="mt-2 border-t border-[#1e3a5f] pt-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Você paga</span>
                    <span className="text-2xl font-bold text-[#D4A843]">{option.toPayFormatted}</span>
                  </div>
                  <div className="mt-1 text-right text-xs text-green-400">
                    Economia de {(savings / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>

                {/* Features */}
                <ul className="mt-4 space-y-1.5">
                  {option.features.slice(0, 5).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A843]" />
                      <span>{f}</span>
                    </li>
                  ))}
                  {option.features.length > 5 && (
                    <li className="text-sm text-gray-500">+ {option.features.length - 5} benefícios</li>
                  )}
                </ul>

                <button
                  onClick={() => upgradeMutation.mutate(option.key)}
                  disabled={isPending}
                  className={`mt-6 w-full rounded-xl py-3 font-semibold transition-all ${
                    option.highlight
                      ? "bg-[#D4A843] text-[#0A1628] hover:bg-[#e8b84d]"
                      : "border border-[#D4A843] text-[#D4A843] hover:bg-[#D4A843] hover:text-[#0A1628]"
                  } disabled:opacity-50`}
                >
                  {isPending ? "Aguarde..." : (
                    <>Fazer upgrade <ArrowRight className="ml-1 inline h-4 w-4" /></>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          Dúvidas?{" "}
          <a
            href="https://wa.me/5521995523509"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D4A843] hover:underline"
          >
            Fale com o Dr. Gustavo
          </a>
        </div>
      </div>
    </div>
  );
}
