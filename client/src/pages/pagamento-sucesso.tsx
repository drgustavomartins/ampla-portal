import { useEffect } from "react";
import { CheckCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export default function PagamentoSucesso() {
  const [location] = useLocation();
  const queryClient = useQueryClient();

  const params = new URLSearchParams(location.split("?")[1] || "");
  const planKey = params.get("plan") || "";

  const PLAN_NAMES: Record<string, string> = {
    modulo_avulso: "Módulo Avulso",
    pacote_completo: "Pacote Completo",
    observador_essencial: "Observador Essencial",
    observador_avancado: "Observador Avançado",
    observador_intensivo: "Observador Intensivo",
    imersao: "Imersão",
    vip_online: "VIP Online",
    vip_presencial: "VIP Presencial",
    vip_completo: "VIP Completo",
  };

  useEffect(() => {
    // Revalidar dados do usuário após pagamento
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stripe/my-plan"] });
    queryClient.invalidateQueries({ queryKey: ["/api/my-modules"] });
  }, [queryClient]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A1628] px-4 text-center">
      <div className="rounded-2xl border border-[#D4A843]/30 bg-[#0D1E35] p-12 max-w-md w-full">
        <CheckCircle className="mx-auto mb-6 h-16 w-16 text-[#D4A843]" />

        <h1 className="text-2xl font-bold text-white">Pagamento confirmado!</h1>

        {planKey && PLAN_NAMES[planKey] && (
          <p className="mt-2 text-gray-400">
            Bem-vindo ao <strong className="text-[#D4A843]">{PLAN_NAMES[planKey]}</strong>.
          </p>
        )}

        <p className="mt-4 text-sm text-gray-500">
          Seu acesso já foi liberado. Em caso de dúvidas, o Dr. Gustavo está disponível pelo canal direto.
        </p>

        <Link href="/">
          <button className="mt-8 w-full rounded-xl bg-[#D4A843] py-3 font-semibold text-[#0A1628] hover:bg-[#e8b84d] transition-all">
            Acessar a plataforma
          </button>
        </Link>
      </div>
    </div>
  );
}
