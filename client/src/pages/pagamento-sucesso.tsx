import { useEffect } from "react";
import { CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export default function PagamentoSucesso() {
  const queryClient = useQueryClient();

  // Read query params from hash fragment (e.g. #/pagamento/sucesso?plan=xxx&session_id=yyy)
  const hashPart = typeof window !== "undefined" ? window.location.hash : "";
  const queryString = hashPart.includes("?") ? hashPart.split("?")[1] : "";
  const params = new URLSearchParams(queryString);
  const planKey = params.get("plan") || "";

  const PLAN_NAMES: Record<string, string> = {
    acesso_vitalicio: "Plataforma Online",
    modulo_pratica: "Módulo Avulso com Prática",
    observador_essencial: "Acompanhamento Observacional",
    vip_completo: "Acompanhamento VIP",
    imersao_elite: "Acompanhamento Elite",
    modulo_avulso: "Módulo Avulso",
    pacote_completo: "Pacote Completo",
    observador_avancado: "Observador Avançado",
    observador_intensivo: "Observador Intensivo",
    imersao: "Imersão",
    vip_online: "VIP Econômico",
    vip_presencial: "VIP Moderado",
    extensao_acompanhamento: "Extensão de Acompanhamento",
    horas_clinicas_1: "Horas Clínicas (1 encontro)",
    horas_clinicas_2: "Horas Clínicas (2 encontros)",
    horas_clinicas_3: "Horas Clínicas (3 encontros)",
    observacao_extra_1: "Observação Extra (1 turno)",
    observacao_extra_2: "Observação Extra (2 turnos)",
    observacao_extra_3: "Observação Extra (3 turnos)",
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
