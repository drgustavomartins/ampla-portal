import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, Coins, Gift, TrendingUp, ShoppingCart, HelpCircle
} from "lucide-react";

const cashbackTable = [
  { plan: "Módulo Avulso", rate: "3%" },
  { plan: "Curso Online", rate: "5%" },
  { plan: "Observador Essencial", rate: "5%" },
  { plan: "Observador Avançado", rate: "7%" },
  { plan: "Observador Intensivo", rate: "8%" },
  { plan: "Imersão", rate: "10%" },
  { plan: "VIP Online", rate: "8%" },
  { plan: "VIP Presencial", rate: "10%" },
  { plan: "VIP Completo", rate: "10%" },
  { plan: "Horas Clínicas", rate: "5%" },
];

export default function CreditsRulesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/30 bg-card/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/creditos" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </Link>
          <div className="flex-1" />
          <Coins className="w-5 h-5 text-gold" />
          <span className="font-semibold text-sm text-foreground">Como funciona</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gold/15 flex items-center justify-center mx-auto">
            <Coins className="w-8 h-8 text-gold" />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Programa de Créditos</h1>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
            Ganhe créditos ao comprar planos e indicar amigos. Use seus créditos como desconto em qualquer compra futura.
          </p>
        </div>

        {/* Section 1: Referral */}
        <Card className="border-border/30 bg-card/60">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Indicação</h2>
                <p className="text-xs text-muted-foreground">Ganhe créditos indicando amigos</p>
              </div>
            </div>
            <div className="bg-background/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Badge className="bg-gold/15 text-gold border-gold/30 shrink-0">1</Badge>
                <p className="text-sm text-foreground">Compartilhe seu código de indicação único com colegas e amigos.</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="bg-gold/15 text-gold border-gold/30 shrink-0">2</Badge>
                <p className="text-sm text-foreground">Quando a pessoa se inscrever usando seu código, você ganha <strong className="text-gold">10% do valor pago</strong> em créditos.</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="bg-gold/15 text-gold border-gold/30 shrink-0">3</Badge>
                <p className="text-sm text-foreground">Os créditos aparecem na sua carteira automaticamente após a confirmação do pagamento.</p>
              </div>
            </div>
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs text-blue-400">
                <strong>Exemplo:</strong> Se seu amigo comprar o plano VIP Completo (R$17.350), você recebe R$1.735 em créditos!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Cashback */}
        <Card className="border-border/30 bg-card/60">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Cashback automático</h2>
                <p className="text-xs text-muted-foreground">Receba de volta em cada compra</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Toda compra de plano gera cashback automático. Os créditos são adicionados imediatamente após a confirmação do pagamento.
            </p>
            <div className="overflow-x-auto rounded-lg border border-border/30">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-background/30">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Plano</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Cashback</th>
                  </tr>
                </thead>
                <tbody>
                  {cashbackTable.map((row, i) => (
                    <tr key={row.plan} className={`border-b border-border/20 ${i % 2 === 0 ? 'bg-card/30' : ''}`}>
                      <td className="px-4 py-2.5 text-foreground">{row.plan}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">{row.rate}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: How to use */}
        <Card className="border-border/30 bg-card/60">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Como usar seus créditos</h2>
                <p className="text-xs text-muted-foreground">Aplique como desconto no checkout</p>
              </div>
            </div>
            <div className="bg-background/50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-foreground">
                Na página de planos, escolha quanto crédito quer usar. O desconto é aplicado automaticamente no valor final.
              </p>
              <p className="text-sm text-foreground">
                Se seus créditos cobrirem 100% do valor, a compra é ativada instantaneamente sem precisar passar pelo Stripe.
              </p>
              <p className="text-sm text-foreground">
                Você pode combinar créditos de <strong className="text-gold">cashback + indicação</strong> no mesmo pagamento.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="border-border/30 bg-card/60">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="font-semibold text-foreground">Perguntas frequentes</h2>
            </div>
            <div className="space-y-4">
              <div className="bg-background/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-foreground">Os créditos expiram?</h3>
                <p className="text-sm text-muted-foreground mt-1">Sim. Cada crédito tem validade de <strong className="text-gold">6 meses</strong> a partir da data em que foi gerado. Créditos expirados não podem ser utilizados. Acompanhe as datas no seu extrato.</p>
              </div>
              <div className="bg-background/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-foreground">Posso combinar cashback e indicação?</h3>
                <p className="text-sm text-muted-foreground mt-1">Sim! Todos os seus créditos são somados em um único saldo. Você pode usar qualquer quantidade disponível.</p>
              </div>
              <div className="bg-background/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-foreground">Quando recebo meus créditos?</h3>
                <p className="text-sm text-muted-foreground mt-1">Os créditos de cashback e indicação são adicionados automaticamente assim que o pagamento é confirmado pelo Stripe.</p>
              </div>
              <div className="bg-background/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-foreground">Posso transferir créditos para outra pessoa?</h3>
                <p className="text-sm text-muted-foreground mt-1">Não, os créditos são pessoais e intransferíveis. Mas você pode indicar amigos e ganhar mais créditos!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-6 mt-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>&copy; 2026 Ampla Facial &mdash; Todos os direitos reservados</span>
          <span className="text-gold-muted font-semibold tracking-brand text-[10px]">NATURALUP&reg;</span>
        </div>
      </footer>
    </div>
  );
}
