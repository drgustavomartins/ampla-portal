import { useEffect, useState } from "react";
import { Sparkles, X, ArrowRight } from "lucide-react";

// Aparece 1 vez por sessão, 30 segundos após o aluno entrar na plataforma
// Só para alunos em trial que ainda não pagaram
export function TrialPlansToast({ isTrial }: { isTrial: boolean }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isTrial) return;

    // Só mostra uma vez por sessão
    const alreadyShown = sessionStorage.getItem("plans_toast_shown");
    if (alreadyShown) return;

    // Aparece após 30 segundos — tempo suficiente para o aluno ver a plataforma
    const timer = setTimeout(() => {
      setVisible(true);
      sessionStorage.setItem("plans_toast_shown", "1");
    }, 30000);

    return () => clearTimeout(timer);
  }, [isTrial]);

  if (!visible || dismissed) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-[#D4A843]/40 bg-[#0D1E35] shadow-2xl shadow-black/40 animate-in slide-in-from-bottom-4 duration-300">
      {/* Header dourado */}
      <div className="flex items-center justify-between rounded-t-2xl bg-[#D4A843]/10 px-4 py-3 border-b border-[#D4A843]/20">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#D4A843]" />
          <span className="text-sm font-semibold text-[#D4A843]">Gostando da plataforma?</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Corpo */}
      <div className="px-4 py-4">
        <p className="text-sm text-gray-300 leading-relaxed">
          Você tem acesso a <strong className="text-white">muito mais conteúdo</strong> nos planos completos — módulos extras, observação clínica presencial e mentoria direta com o Dr. Gustavo.
        </p>

        <a
          href="/#/comecar"
          onClick={() => setDismissed(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4A843] py-2.5 text-sm font-semibold text-[#0A1628] hover:bg-[#e8b84d] transition-all"
        >
          Conhecer os planos <ArrowRight className="h-4 w-4" />
        </a>

        <button
          onClick={() => setDismissed(true)}
          className="mt-2 w-full text-center text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
