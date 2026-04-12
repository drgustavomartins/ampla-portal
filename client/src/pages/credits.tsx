import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Coins, Copy, Check, ChevronLeft, Share2, ArrowUpRight, ArrowDownRight,
  Gift, HelpCircle, ExternalLink
} from "lucide-react";

function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CreditsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: balanceData } = useQuery<{ balance: number; referralCode: string }>({
    queryKey: ["/api/credits/balance"],
    enabled: !!user,
  });

  const { data: txData } = useQuery<{ transactions: Array<{ id: number; type: string; amount: number; description: string; creditedBy: string | null; createdAt: string; expiresAt: string | null; expired: boolean }> }>({
    queryKey: ["/api/credits/transactions"],
    enabled: !!user,
  });

  const { data: referralStats } = useQuery<{ totalReferrals: number; totalEarned: number }>({
    queryKey: ["/api/credits/referral-stats"],
    enabled: !!user,
  });

  const balance = balanceData?.balance || 0;
  const referralCode = balanceData?.referralCode || "";
  const transactions = txData?.transactions || [];
  const referralLink = referralCode ? `https://portal.amplafacial.com.br/#/comecar?ref=${referralCode}` : "";

  function copyCode() {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast({ title: "Copiado!", description: "Seu codigo de indicacao foi copiado." });
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `Quer se especializar em harmonizacao facial com o Dr. Gustavo Martins? Use meu codigo ${referralCode} e voce e eu ganhamos creditos!\n\n${referralLink}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  const typeLabels: Record<string, string> = {
    cashback: "Cashback",
    referral: "Indicacao",
    usage: "Uso",
    adjustment: "Ajuste",
    bonus: "Bonus",
  };

  const typeColors: Record<string, string> = {
    cashback: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    referral: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    usage: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    adjustment: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    bonus: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };

  const typeIcons: Record<string, typeof ArrowUpRight> = {
    bonus: Gift,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/30 bg-card/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </Link>
          <div className="flex-1" />
          <Coins className="w-5 h-5 text-gold" />
          <span className="font-semibold text-sm text-foreground">Meus Creditos</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Balance Card */}
        <Card className="border-gold/30 bg-gradient-to-br from-card via-card to-gold/5 overflow-hidden">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gold/15 flex items-center justify-center mx-auto">
              <Coins className="w-8 h-8 text-gold" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Saldo disponivel</p>
              <p className="text-4xl sm:text-5xl font-bold text-gold mt-2">{formatBRL(balance)}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Use seus creditos como desconto na compra de qualquer plano.
            </p>
            <a
              href="/#/planos"
              className="inline-flex items-center gap-2 mt-3 px-8 py-3 rounded-xl text-sm font-bold transition-colors shadow-md"
              style={{ background: '#D4A843', color: '#0A0D14' }}
            >
              {balance > 0 ? "Usar creditos agora" : "Ver planos disponiveis"}
            </a>
          </CardContent>
        </Card>

        {/* Referral + Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Referral Code */}
          <Card className="border-border/30 bg-card/60">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-gold" />
                <h3 className="font-semibold text-sm text-foreground">Seu codigo de indicacao</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-background/50 border border-border/40 rounded-lg px-4 py-3 font-mono text-lg text-gold font-bold text-center">
                  {referralCode || "..."}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-gold/30 hover:bg-gold/10 shrink-0"
                  onClick={copyCode}
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-gold" />}
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10"
                onClick={shareWhatsApp}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar no WhatsApp
              </Button>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Quando alguem usar seu codigo, voce recebe <strong className="text-gold">10%</strong> do valor pago em creditos!
              </p>
            </CardContent>
          </Card>

          {/* Referral Stats */}
          <Card className="border-border/30 bg-card/60">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-sm text-foreground">Suas indicacoes</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{referralStats?.totalReferrals || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Indicacoes</p>
                </div>
                <div className="bg-background/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{formatBRL(referralStats?.totalEarned || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total ganho</p>
                </div>
              </div>
              <Link
                href="/creditos/regras"
                className="flex items-center gap-1.5 text-xs text-gold hover:underline"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Como funciona o programa de creditos?
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Historico de transacoes</h2>
          {transactions.length === 0 ? (
            <Card className="border-border/30 bg-card/40">
              <CardContent className="p-12 text-center">
                <Coins className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma transacao ainda.</p>
                <p className="text-xs text-muted-foreground mt-1">Seus creditos de cashback e indicacoes aparecerao aqui.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <Card key={tx.id} className={`border-border/25 ${tx.type === 'bonus' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-card/40'}`}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      tx.type === 'bonus' ? 'bg-amber-500/15' : tx.amount > 0 ? 'bg-emerald-500/10' : 'bg-orange-500/10'
                    }`}>
                      {tx.type === 'bonus' ? (
                        <Gift className="w-4 h-4 text-amber-400" />
                      ) : tx.amount > 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-orange-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] px-1.5 ${typeColors[tx.type] || 'border-border/30 text-muted-foreground'}`}>
                          {typeLabels[tx.type] || tx.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 truncate ${tx.expired ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{tx.description}</p>
                      {tx.creditedBy && (
                        <p className="text-xs text-amber-400/70 mt-0.5">Creditado por {tx.creditedBy}</p>
                      )}
                      {tx.expiresAt && tx.amount > 0 && (
                        <p className={`text-[10px] mt-0.5 ${tx.expired ? 'text-red-400' : 'text-muted-foreground'}`}>
                          {tx.expired ? 'Expirado em ' : 'Expira em '}
                          {new Date(tx.expiresAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                        </p>
                      )}
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${
                      tx.type === 'bonus' ? 'text-amber-400' : tx.amount > 0 ? 'text-emerald-400' : 'text-orange-400'
                    }`}>
                      {tx.amount > 0 ? '+' : ''}{formatBRL(tx.amount)}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* CTA final */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="rounded-2xl border border-gold/20 bg-gradient-to-r from-gold/10 via-card to-card p-6 sm:p-8 text-center space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Evolua sua pratica clinica</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Acumule creditos indicando colegas, participando das aulas ao vivo e use como desconto em qualquer produto.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/#/planos"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-colors shadow-md"
              style={{ background: '#D4A843', color: '#0A0D14' }}
            >
              Ver planos disponiveis
            </a>
            <a
              href="/#/creditos/regras"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border/40 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors"
            >
              Como funciona o programa
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/30 py-6 mt-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>&copy; 2026 Ampla Facial &mdash; Todos os direitos reservados</span>
          <span className="text-gold-muted font-semibold tracking-brand text-[10px]">NATURALUP&reg;</span>
        </div>
      </footer>
    </div>
  );
}
