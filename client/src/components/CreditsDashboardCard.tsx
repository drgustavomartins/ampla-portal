import { useState, useEffect } from "react";
import { Link } from "wouter";
import { DollarSign, Gift, TrendingUp, ChevronRight, Copy, Check, Share2 } from "lucide-react";

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

interface CreditsData {
  balance: number;
  referralCode: string;
  transactions: Transaction[];
}

function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function typeLabel(type: string) {
  switch (type) {
    case "cashback": return { label: "Cashback", color: "text-emerald-400", bg: "bg-emerald-400/10" };
    case "referral": return { label: "Indicação", color: "text-blue-400", bg: "bg-blue-400/10" };
    case "usage": return { label: "Uso", color: "text-orange-400", bg: "bg-orange-400/10" };
    case "adjustment": return { label: "Ajuste", color: "text-purple-400", bg: "bg-purple-400/10" };
    default: return { label: type, color: "text-muted-foreground", bg: "bg-muted/10" };
  }
}

export function CreditsDashboardCard() {
  const [data, setData] = useState<CreditsData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/credits/balance", { credentials: "include" }).then(r => r.json()),
      fetch("/api/credits/transactions", { credentials: "include" }).then(r => r.json()),
    ]).then(([balanceData, txData]) => {
      setData({
        balance: balanceData.balance || 0,
        referralCode: balanceData.referralCode || "",
        transactions: Array.isArray(txData) ? txData.slice(0, 5) : [],
      });
    }).catch(() => {});
  }, []);

  if (!data) return null;

  const hasBalance = data.balance > 0;
  const hasTx = data.transactions.length > 0;

  const copyCode = () => {
    navigator.clipboard.writeText(data.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const msg = `Estou estudando na Ampla Facial e quero te indicar! Use meu código ${data.referralCode} na hora da inscrição e garanta seu acesso. Conheça: portal.amplafacial.com.br`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Gatilhos motivacionais
  const tips = [
    { icon: Gift, text: "Indique um colega e ganhe 10% do valor pago em créditos", cta: "Compartilhar código" },
    { icon: TrendingUp, text: "Seus créditos valem desconto em qualquer produto ou renovação", cta: "Ver planos" },
  ];

  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden transition-all duration-300 hover:border-gold/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      {/* Header com saldo */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center ring-1 ring-gold/20">
              <DollarSign className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Meus Créditos</p>
              <p className={`text-2xl font-bold ${hasBalance ? "text-gold" : "text-muted-foreground"}`}>
                {formatBRL(data.balance)}
              </p>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
        </div>

        {/* Mini indicador de origem */}
        {hasBalance && !expanded && (
          <div className="mt-3 flex gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
              Cashback
            </span>
            <span className="inline-flex items-center rounded-full bg-blue-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-400">
              Indicações
            </span>
            <span className="text-[10px] text-muted-foreground self-center">
              Use como desconto
            </span>
          </div>
        )}
      </button>

      {/* Área expandida */}
      {expanded && (
        <div className="border-t border-border/30">
          {/* Código de indicação */}
          {data.referralCode && (
            <div className="px-5 py-4 border-b border-border/20">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Seu código de indicação</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gold/10 border border-gold/20 rounded-lg px-3 py-2 text-sm font-mono text-gold tracking-wider text-center">
                  {data.referralCode}
                </code>
                <button
                  onClick={(e) => { e.stopPropagation(); copyCode(); }}
                  className="p-2 rounded-lg border border-border/30 hover:bg-gold/10 transition-colors"
                  title="Copiar"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); shareWhatsApp(); }}
                  className="p-2 rounded-lg border border-border/30 hover:bg-green-500/10 transition-colors"
                  title="Compartilhar no WhatsApp"
                >
                  <Share2 className="w-4 h-4 text-green-400" />
                </button>
              </div>
            </div>
          )}

          {/* Mini extrato */}
          {hasTx && (
            <div className="px-5 py-4 border-b border-border/20">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">Últimas movimentações</p>
              <div className="space-y-2.5">
                {data.transactions.map((tx) => {
                  const t = typeLabel(tx.type);
                  return (
                    <div key={tx.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`inline-flex items-center rounded-full ${t.bg} px-2 py-0.5 text-[9px] font-semibold ${t.color} uppercase shrink-0`}>
                          {t.label}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">{tx.description}</span>
                      </div>
                      <span className={`text-xs font-semibold shrink-0 ml-2 ${tx.amount >= 0 ? "text-emerald-400" : "text-orange-400"}`}>
                        {tx.amount >= 0 ? "+" : ""}{formatBRL(tx.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gatilhos motivacionais */}
          <div className="px-5 py-4 space-y-3">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gold/5 border border-gold/10">
                <tip.icon className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-foreground leading-relaxed">{tip.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Links */}
          <div className="px-5 pb-4 flex gap-2">
            <Link
              href="/creditos"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gold/10 border border-gold/20 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
            >
              Ver extrato completo
            </Link>
            <Link
              href="/creditos/regras"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-card border border-border/30 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Como funciona
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
