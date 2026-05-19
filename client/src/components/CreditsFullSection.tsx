import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  DollarSign, Gift, TrendingUp, Copy, Check, Share2,
  ChevronRight, Clock, ArrowUpRight, ArrowDownRight, Sparkles, HelpCircle,
  ShoppingCart, ArrowRight
} from "lucide-react";

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  creditedBy: string | null;
  createdAt: string;
  expiresAt: string | null;
  expired: boolean;
}

interface CreditsData {
  balance: number;
  referralCode: string;
  transactions: Transaction[];
  referralStats: { totalReferrals: number; totalEarned: number };
}

function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function typeConfig(type: string) {
  switch (type) {
    case "cashback": return { label: "Cashback", color: "text-emerald-400", bg: "bg-emerald-400/10", icon: TrendingUp };
    case "referral": return { label: "Indicação", color: "text-blue-400", bg: "bg-blue-400/10", icon: ArrowUpRight };
    case "usage":    return { label: "Uso", color: "text-orange-400", bg: "bg-orange-400/10", icon: ArrowDownRight };
    case "bonus":    return { label: "Bônus", color: "text-amber-400", bg: "bg-amber-400/10", icon: Gift };
    case "adjustment": return { label: "Ajuste", color: "text-purple-400", bg: "bg-purple-400/10", icon: Sparkles };
    default: return { label: type, color: "text-muted-foreground", bg: "bg-muted/10", icon: DollarSign };
  }
}

export function CreditsFullSection() {
  const [data, setData] = useState<CreditsData | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("ampla_token");
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const opts = { credentials: "include" as RequestCredentials, headers };
    Promise.all([
      fetch("/api/credits/balance", opts).then(r => r.ok ? r.json() : null),
      fetch("/api/credits/transactions", opts).then(r => r.ok ? r.json() : null),
      fetch("/api/credits/referral-stats", opts).then(r => r.ok ? r.json() : null),
    ]).then(([bal, tx, stats]) => {
      if (bal) {
        setData({
          balance: bal.balance || 0,
          referralCode: bal.referralCode || "",
          transactions: tx?.transactions || [],
          referralStats: stats || { totalReferrals: 0, totalEarned: 0 },
        });
      }
    }).catch(() => {});
  }, []);

  if (!data) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(data.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const msg = `Estou estudando na Ampla Facial e quero te indicar! Use meu código ${data.referralCode} na hora da inscrição. Conheça: portal.amplafacial.com.br`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const visibleTx = showAll ? data.transactions : data.transactions.slice(0, 8);
  const nextToExpire = data.transactions
    .filter(t => t.expiresAt && !t.expired && t.amount > 0)
    .sort((a, b) => (a.expiresAt! > b.expiresAt! ? 1 : -1))
    .slice(0, 3);

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-semibold text-foreground tracking-tight">Meus Créditos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Cashback, indicações e bonificações em um só lugar</p>
        </div>
        <Link
          href="/creditos/regras"
          className="flex items-center gap-1 text-xs text-gold hover:underline"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Como funciona
        </Link>
      </div>

      {/* Main grid: 3 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Col 1: Saldo + código de indicação */}
        <div className="space-y-4">
          {/* Saldo */}
          <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/5 via-card to-card p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-3 ring-1 ring-gold/20">
              <DollarSign className="w-7 h-7 text-gold" />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Saldo disponível</p>
            <p className="text-4xl font-bold text-gold mt-1">{formatBRL(data.balance)}</p>
            <p className="text-[10px] text-muted-foreground mt-2">Aplicado automaticamente no checkout</p>
            <button
              onClick={() => { window.location.hash = '/planos'; }}
              type="button"
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: '#D4A843', color: '#0A0D14', border: 'none', cursor: 'pointer' }}
            >
              <ShoppingCart className="w-4 h-4" />
              {data.balance > 0 ? "Usar creditos agora" : "Ver planos disponiveis"}
            </button>
          </div>

          {/* Código de indicação */}
          <div className="rounded-2xl border border-border/30 bg-card/60 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-gold" />
              <p className="text-xs font-semibold text-foreground">Seu código de indicação</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gold/10 border border-gold/20 rounded-lg px-3 py-2.5 text-sm font-mono text-gold tracking-widest text-center font-bold">
                {data.referralCode || "..."}
              </code>
              <button
                onClick={copyCode}
                className="p-2 rounded-lg border border-border/30 hover:bg-gold/10 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            <button
              onClick={shareWhatsApp}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-green-500/30 text-green-400 hover:bg-green-500/10 text-xs font-medium transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Compartilhar no WhatsApp
            </button>
            <p className="text-[10px] text-muted-foreground">Ganhe <strong className="text-gold">10%</strong> do valor pago por quem você indicar</p>

            {/* Mini stats */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/20">
              <div className="bg-background/50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-foreground">{data.referralStats.totalReferrals}</p>
                <p className="text-[10px] text-muted-foreground">indicações</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-emerald-400">{formatBRL(data.referralStats.totalEarned)}</p>
                <p className="text-[10px] text-muted-foreground">ganho total</p>
              </div>
            </div>
          </div>

          {/* Regras resumidas */}
          <div className="rounded-2xl border border-border/30 bg-card/60 p-5 space-y-3">
            <p className="text-xs font-semibold text-foreground">Como você ganha créditos</p>
            {[
              { icon: TrendingUp, color: "text-emerald-400", text: "Cashback automático em cada compra (3% a 10%)" },
              { icon: Gift, color: "text-blue-400", text: "10% do valor quando alguém usa seu código" },
              { icon: Sparkles, color: "text-amber-400", text: "Bônus especiais em lives e eventos" },
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <rule.icon className={`w-4 h-4 ${rule.color} mt-0.5 shrink-0`} />
                <p className="text-xs text-muted-foreground leading-relaxed">{rule.text}</p>
              </div>
            ))}
            <div className="flex items-start gap-2.5 pt-2 border-t border-border/20">
              <Clock className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Créditos expiram em <strong className="text-foreground">6 meses</strong> após a data de emissão
              </p>
            </div>
          </div>
        </div>

        {/* Col 2-3: Extrato (ocupa 2 colunas) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Próximos a expirar */}
          {nextToExpire.length > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <p className="text-xs font-semibold text-amber-400">Próximos a expirar</p>
                </div>
                {data.balance > 0 && (
                  <a
                    href="/#/planos"
                    className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Usar antes que expirem
                    <ArrowRight className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="space-y-2">
                {nextToExpire.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-foreground font-medium">{formatBRL(tx.amount)}</span>
                      <span className="text-muted-foreground truncate">{tx.description}</span>
                    </div>
                    <span className="text-amber-400 shrink-0 ml-2">
                      {tx.expiresAt && new Date(tx.expiresAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extrato */}
          <div className="rounded-2xl border border-border/30 bg-card/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gold" />
                <p className="text-xs font-semibold text-foreground">Extrato completo</p>
              </div>
              <span className="text-[10px] text-muted-foreground">{data.transactions.length} movimentações</span>
            </div>

            {data.transactions.length === 0 ? (
              <div className="p-12 text-center">
                <DollarSign className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma movimentação ainda</p>
                <p className="text-xs text-muted-foreground mt-1">Seus créditos de cashback e indicações vão aparecer aqui</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border/15">
                  {visibleTx.map(tx => {
                    const cfg = typeConfig(tx.type);
                    const Icon = cfg.icon;
                    return (
                      <div key={tx.id} className={`px-5 py-3.5 flex items-center gap-3.5 ${tx.expired ? 'opacity-50' : ''}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center rounded-full ${cfg.bg} px-2 py-0.5 text-[9px] font-semibold ${cfg.color} uppercase shrink-0`}>
                              {cfg.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                            </span>
                          </div>
                          <p className={`text-sm mt-0.5 truncate ${tx.expired ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {tx.description}
                          </p>
                          {tx.creditedBy && (
                            <p className="text-[10px] text-amber-400/70">Creditado por {tx.creditedBy}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-sm font-semibold ${
                            tx.expired ? 'text-muted-foreground' :
                            tx.type === 'bonus' ? 'text-amber-400' :
                            tx.amount > 0 ? 'text-emerald-400' : 'text-orange-400'
                          }`}>
                            {tx.amount > 0 ? '+' : ''}{formatBRL(tx.amount)}
                          </span>
                          {tx.expiresAt && tx.amount > 0 && (
                            <p className={`text-[9px] mt-0.5 ${tx.expired ? 'text-red-400' : 'text-muted-foreground'}`}>
                              {tx.expired ? 'Expirado' : `Exp. ${new Date(tx.expiresAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {data.transactions.length > 8 && !showAll && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="w-full py-3 text-xs font-medium text-gold hover:bg-gold/5 transition-colors border-t border-border/20 flex items-center justify-center gap-1"
                  >
                    Ver todas as {data.transactions.length} movimentações
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </>
            )}
          {/* CTA usar créditos */}
          {data.balance > 0 && (
            <a
              href="/#/planos"
              className="flex items-center justify-between rounded-2xl border border-gold/20 bg-gradient-to-r from-gold/10 via-gold/5 to-transparent p-5 hover:border-gold/40 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center ring-1 ring-gold/20">
                  <ShoppingCart className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Tem {formatBRL(data.balance)} em créditos</p>
                  <p className="text-xs text-muted-foreground">Use como desconto na compra de qualquer produto</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gold/50 group-hover:text-gold transition-colors shrink-0" />
            </a>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}
