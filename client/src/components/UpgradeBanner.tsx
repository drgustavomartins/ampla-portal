import { useQuery } from "@tanstack/react-query";
import { TrendingUp, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

interface MyPlanData {
  hasPlan: boolean;
  isTrialActive: boolean;
  trialDaysLeft: number | null;
  planKey: string | null;
  planName: string | null;
  canUpgrade: boolean;
  daysSincePurchase: number | null;
}

interface UpgradeBannerProps {
  context?: "modulo_bloqueado" | "material_bloqueado" | "padrao";
  lockedContent?: string;
}

export function UpgradeBanner({ context = "padrao", lockedContent }: UpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const { data: myPlan } = useQuery<MyPlanData>({
    queryKey: ["/api/stripe/my-plan"],
  });

  if (dismissed || !myPlan) return null;

  // Trial vitalício: não exibe banner de "expirando" — acesso gratuito é por tempo indeterminado.

  // Banner de conteúdo bloqueado
  if (context === "modulo_bloqueado" || context === "material_bloqueado") {
    return (
      <div className="relative rounded-xl border border-[#D4A843]/30 bg-[#D4A843]/5 p-5 flex items-start gap-4">
        <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-[#D4A843]" />
        <div className="flex-1">
          <div className="font-semibold text-white text-sm">
            {lockedContent ? `"${lockedContent}" está disponível em planos superiores` : "Este conteúdo requer um plano superior"}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            {myPlan.hasPlan && myPlan.planName
              ? `Seu plano atual é ${myPlan.planName}. Faça upgrade e o valor já pago entra como crédito.`
              : "Escolha um plano para acessar todo o conteúdo."}
          </div>
        </div>
        <Link href={myPlan.hasPlan && myPlan.canUpgrade ? "/upgrade" : "/planos"}>
          <button className="shrink-0 rounded-lg border border-[#D4A843] px-4 py-1.5 text-xs font-semibold text-[#D4A843] hover:bg-[#D4A843] hover:text-[#0A1628] transition-all whitespace-nowrap">
            {myPlan.hasPlan && myPlan.canUpgrade ? "Ver upgrade" : "Ver planos"}
          </button>
        </Link>
      </div>
    );
  }

  // Banner de upgrade disponível (após 30 dias no plano)
  if (myPlan.hasPlan && myPlan.canUpgrade && myPlan.daysSincePurchase && myPlan.daysSincePurchase >= 30) {
    return (
      <div className="relative mb-4 rounded-xl border border-[#1e3a5f] bg-[#0D1E35] p-4 flex items-center gap-3">
        <TrendingUp className="h-5 w-5 shrink-0 text-[#D4A843]" />
        <div className="flex-1 text-sm text-gray-300">
          Pronto para o próximo nível?{" "}
          <strong className="text-white">Faça upgrade e use o crédito do seu plano atual.</strong>
        </div>
        <Link href="/upgrade">
          <button className="shrink-0 rounded-lg border border-[#D4A843] px-4 py-1.5 text-xs font-semibold text-[#D4A843] hover:bg-[#D4A843] hover:text-[#0A1628] transition-all whitespace-nowrap">
            Ver opções
          </button>
        </Link>
        <button onClick={() => setDismissed(true)} className="text-gray-600 hover:text-gray-400">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return null;
}
