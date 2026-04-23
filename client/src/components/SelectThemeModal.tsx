import { useState } from "react";
import { Syringe, Sparkles, Layers, FlaskConical, Check, Loader2, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface Theme {
  key: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  recommended?: string;
}

const THEMES: Theme[] = [
  {
    key: "toxina",
    name: "Toxina Botulínica",
    description: "Fundamento para todos os outros temas. Ideal para quem está começando.",
    icon: <Syringe className="w-6 h-6" />,
    color: "#FB923C",
    recommended: "Recomendado para iniciantes",
  },
  {
    key: "preenchedores",
    name: "Preenchedores Faciais",
    description: "Ácido hialurônico e volumetria. Ideal para quem já domina toxina.",
    icon: <Sparkles className="w-6 h-6" />,
    color: "#A855F7",
  },
  {
    key: "bioestimuladores",
    name: "Bioestimuladores de Colágeno",
    description: "PLLA, CaHA, PCL. Para quem já tem base em toxina e preenchedores.",
    icon: <Layers className="w-6 h-6" />,
    color: "#10B981",
  },
  {
    key: "biorregeneradores",
    name: "Biorregeneradores",
    description: "iPRF, PDRN, exossomos. Tema mais avançado da regeneração tecidual.",
    icon: <FlaskConical className="w-6 h-6" />,
    color: "#3B82F6",
  },
];

interface Props {
  onClose?: () => void;
  canDismiss?: boolean;
}

export function SelectThemeModal({ onClose, canDismiss = false }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectMutation = useMutation({
    mutationFn: async (theme: string) => {
      const res = await apiRequest("POST", "/api/select-theme", { theme });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      if (onClose) onClose();
      else window.location.reload();
    },
    onError: (e: any) => {
      setError(e?.message || "Erro ao salvar. Tente novamente.");
    },
  });

  const handleConfirm = () => {
    if (!selected) return;
    setError(null);
    selectMutation.mutate(selected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 rounded-2xl border border-[#D4A843]/20 bg-gradient-to-br from-[#0A0D14] via-[#12192A] to-[#0A0D14] p-6 sm:p-8 shadow-2xl">
        {canDismiss && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-1 text-white/40 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FB923C]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-orange-400 mb-3">
            <Sparkles className="w-3 h-3" />
            Módulo Avulso com Prática
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={{ fontFamily: "'EB Garamond', serif" }}>
            Escolha o seu tema
          </h2>
          <p className="text-sm text-white/60 max-w-lg mx-auto leading-relaxed">
            Você vai mergulhar a fundo em 1 dos 4 temas. Todo o conteúdo, a prática de 8h e a observação serão focados 100% no tema escolhido.
          </p>
          <p className="text-xs text-amber-400/80 mt-2">
            ⚠️ A escolha é definitiva. Fale com o Dr. Gustavo se precisar trocar depois.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {THEMES.map((t) => {
            const isSelected = selected === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setSelected(t.key)}
                className={`relative text-left rounded-xl p-4 border-2 transition-all hover:brightness-110 ${
                  isSelected
                    ? "border-white/40 bg-white/[0.06]"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"
                }`}
              >
                {isSelected && (
                  <div
                    className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: t.color }}
                  >
                    <Check className="w-4 h-4 text-[#0A0D14]" strokeWidth={3} />
                  </div>
                )}
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: `${t.color}20`, color: t.color }}
                >
                  {t.icon}
                </div>
                <h3 className="text-[15px] font-bold text-white mb-1">{t.name}</h3>
                <p className="text-[12px] text-white/50 leading-snug">{t.description}</p>
                {t.recommended && (
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.color }}>
                    {t.recommended}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={!selected || selectMutation.isPending}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
          style={{
            background: selected
              ? "linear-gradient(135deg, #D4A843 0%, #E8C86A 100%)"
              : "rgba(255,255,255,0.08)",
            color: selected ? "#0A0D14" : "rgba(255,255,255,0.3)",
            boxShadow: selected ? "0 2px 12px rgba(212,168,67,0.25)" : "none",
          }}
        >
          {selectMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
          ) : selected ? (
            <>Confirmar e desbloquear conteúdo</>
          ) : (
            <>Selecione um tema acima</>
          )}
        </button>

        <p className="text-center text-[11px] text-white/40 mt-4">
          Qualquer dúvida antes de escolher, fale com o Dr. Gustavo no WhatsApp.
        </p>
      </div>
    </div>
  );
}
