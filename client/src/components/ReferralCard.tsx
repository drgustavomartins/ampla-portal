import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gift, Copy, Check } from "lucide-react";

export function ReferralCard({ planKey }: { planKey: string }) {
  const [copied, setCopied] = useState(false);

  const { data } = useQuery<{ code: string; link: string }>({
    queryKey: ["/api/referral/code"],
  });

  const handleCopy = () => {
    if (data?.link) {
      navigator.clipboard.writeText(data.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!data) return null;

  return (
    <div
      onClick={handleCopy}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[#D4A843]/30 bg-gradient-to-br from-[#1a2d4d] to-[#0D1E35] p-4 transition-all hover:border-[#D4A843]/60 hover:shadow-[0_0_20px_rgba(212,168,67,0.1)]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D4A843]/10">
          <Gift className="h-4.5 w-4.5 text-[#D4A843]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">Indique e ganhe R$1.000</h3>
          <p className="mt-0.5 text-xs text-gray-400 leading-relaxed">
            Compartilhe seu link. Quando o indicado fechar qualquer plano, você recebe R$1.000 em crédito para o próximo upgrade.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 truncate rounded-lg border border-[#1e3a5f] bg-[#0A1628] px-3 py-1.5 font-mono text-xs text-[#D4A843]">
              {data.link}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(); }}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#D4A843]/10 px-3 py-1.5 text-xs font-medium text-[#D4A843] transition-all hover:bg-[#D4A843]/20"
            >
              {copied ? (
                <><Check className="h-3.5 w-3.5" /> Copiado!</>
              ) : (
                <><Copy className="h-3.5 w-3.5" /> Copiar</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
