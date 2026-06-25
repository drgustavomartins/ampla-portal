import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Trash2, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export function CouponsTab() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [discountPercent, setDiscountPercent] = useState("10");
  const [durationDays, setDurationDays] = useState("7");
  const [description, setDescription] = useState("");

  // Listar cupons (type='discount')
  const { data: coupons = [], isLoading, refetch } = useQuery({
    queryKey: ["discount-codes"],
    queryFn: async () => {
      const token = localStorage.getItem('ampla_token');
      const res = await fetch('/api/invite-codes?type=discount', {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Falha ao carregar cupons');
      const data = await res.json();
      return data.codes || [];
    },
  });

  // Criar cupom
  const createMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('ampla_token');
      
      // Gerar código: CUPOM-XXXXXX
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = 'CUPOM-';
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }

      const res = await fetch('/api/invite-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          code,
          type: 'discount',
          discountPercent: parseInt(discountPercent),
          durationDays: parseInt(durationDays),
          campaign: 'discount-' + Date.now(),
          description,
        })
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Cupom criado!",
        description: "Pronto para compartilhar"
      });
      setIsOpen(false);
      setDiscountPercent("10");
      setDurationDays("7");
      setDescription("");
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Revogar cupom
  const revokeMutation = useMutation({
    mutationFn: async (codeId: number) => {
      const token = localStorage.getItem('ampla_token');
      const res = await fetch(`/api/invite-codes/${codeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ active: false })
      });
      if (!res.ok) throw new Error('Falha ao revogar');
      return res.json();
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Cupom revogado" });
    }
  });

  const copyLink = (code: string) => {
    const link = `https://portal.amplafacial.com.br/?coupon=${code}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copiado!" });
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Código copiado!" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Gift className="w-5 h-5" />
          Cupons de Desconto
        </h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <Button onClick={() => setIsOpen(true)} className="bg-gold hover:bg-gold/90 text-black">
            + Novo Cupom
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Cupom</DialogTitle>
              <DialogDescription>Configure um novo cupom para compartilhar</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Desconto (%)</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="100"
                  value={discountPercent} 
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="10"
                />
              </div>
              <div>
                <Label>Válido por (dias)</Label>
                <Input 
                  type="number" 
                  min="1"
                  value={durationDays} 
                  onChange={(e) => setDurationDays(e.target.value)}
                  placeholder="7"
                />
              </div>
              <div>
                <Label>Observação (opcional)</Label>
                <Textarea 
                  placeholder="Ex: Aluno João Silva"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-20"
                />
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="w-full bg-gold hover:bg-gold/90 text-black"
              >
                {createMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</>
                ) : (
                  "Criar Cupom"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card className="border-border/30 bg-card/40">
          <CardContent className="p-8 text-center text-muted-foreground">
            Carregando cupons...
          </CardContent>
        </Card>
      ) : coupons.length === 0 ? (
        <Card className="border-border/30 bg-card/40">
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhum cupom criado ainda
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon: any) => (
            <Card key={coupon.id} className="border-border/30 bg-card/40">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="font-mono font-bold text-gold">{coupon.code}</code>
                      <Badge variant={coupon.active ? "default" : "secondary"}>
                        {coupon.active ? "Ativo" : "Revogado"}
                      </Badge>
                      <Badge variant="outline">{coupon.discount_percent}% OFF</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {coupon.description || "Sem descrição"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Criado: {new Date(coupon.created_at).toLocaleDateString()}
                      {coupon.used_count > 0 && ` • Usado ${coupon.used_count}x`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyCouponCode(coupon.code)}
                      title="Copiar código"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyLink(coupon.code)}
                      title="Copiar link"
                    >
                      🔗
                    </Button>
                    {coupon.active && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => revokeMutation.mutate(coupon.id)}
                        disabled={revokeMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
