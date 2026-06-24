import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Gift, Copy, Check, X, Loader2, Eye } from "lucide-react";

interface Coupon {
  id: number;
  code: string;
  discount_percent: number;
  valid_until: string;
  product_type: string;
  created_by: number;
  created_at: string;
  status: string;
  description?: string;
  created_by_name?: string;
  total_uses?: number;
}

export function CouponsTab() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    discountPercent: 10,
    hoursValid: 48,
    productType: "all",
    description: "",
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Listar cupons
  const { data: couponsData, isLoading: loadingCoupons, refetch } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/coupons");
      const data = await res.json();
      return data.coupons as Coupon[];
    },
  });

  // Listar uso de um cupom
  const { data: usageData } = useQuery({
    queryKey: ["coupon-usage", selectedCoupon?.id],
    queryFn: async () => {
      if (!selectedCoupon) return [];
      const res = await apiRequest("GET", `/api/admin/coupons/${selectedCoupon.id}/usage`);
      const data = await res.json();
      return data.usage;
    },
    enabled: !!selectedCoupon,
  });

  // Criar cupom
  const createCouponMutation = useMutation({
    mutationFn: async () => {
      // Buscar token do localStorage
      const token = localStorage.getItem('ampla_token');
      if (!token) {
        throw new Error('Token não encontrado');
      }

      console.log('[CUPOM-SIMPLE] Enviando:', formData);
      
      const response = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      console.log('[CUPOM-SIMPLE] Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CUPOM-SIMPLE] Erro:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('[CUPOM-SIMPLE] Sucesso!', data);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Cupom criado com sucesso!",
        description: `Código: ${data.coupon.code}`,
      });
      setIsOpen(false);
      setFormData({ discountPercent: 10, hoursValid: 48, productType: "all", description: "" });
      refetch();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar cupom",
        variant: "destructive",
      });
    },
  });

  // Atualizar status do cupom
  const updateCouponMutation = useMutation({
    mutationFn: async ({ couponId, status }: { couponId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/coupons/${couponId}`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Cupom atualizado",
        description: "Status alterado com sucesso",
      });
      refetch();
    },
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Código copiado!",
      description: code,
    });
  };

  const handleCopyLink = (code: string) => {
    const link = `https://portal.amplafacial.com.br/checkout?coupon=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Link copiado!",
      description: link,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-700";
      case "expired":
        return "bg-yellow-500/20 text-yellow-700";
      case "revoked":
        return "bg-red-500/20 text-red-700";
      default:
        return "bg-gray-500/20 text-gray-700";
    }
  };

  const getProductTypeLabel = (type: string) => {
    switch (type) {
      case "all":
        return "Todos os planos";
      case "mentorship":
        return "Mentoria";
      case "immersion":
        return "Imersão";
      case "hours_package":
        return "Pacote de Horas";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com botão de criar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Gift className="w-5 h-5 text-gold" />
            Cupons de Desconto
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gere cupons com escassez para negociações (48h, desconto flexível)
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gold hover:bg-gold/90 text-black">
              + Novo Cupom
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar Novo Cupom</DialogTitle>
              <DialogDescription>
                Configure desconto, duração e tipo de plano
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Desconto (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.discountPercent}
                  onChange={(e) =>
                    setFormData({ ...formData, discountPercent: parseInt(e.target.value) })
                  }
                />
              </div>

              <div>
                <Label>Válido por (horas)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.hoursValid}
                  onChange={(e) =>
                    setFormData({ ...formData, hoursValid: parseInt(e.target.value) })
                  }
                />
              </div>

              <div>
                <Label>Tipo de Plano</Label>
                <Select value={formData.productType} onValueChange={(val) =>
                  setFormData({ ...formData, productType: val })
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os planos</SelectItem>
                    <SelectItem value="mentorship">Mentoria VIP</SelectItem>
                    <SelectItem value="immersion">Imersão</SelectItem>
                    <SelectItem value="hours_package">Pacote de Horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Observação (opcional)</Label>
                <Textarea
                  placeholder="Ex: Aluno João Silva - negociação"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="h-20"
                />
              </div>

              <Button
                onClick={() => createCouponMutation.mutate()}
                disabled={createCouponMutation.isPending}
                className="w-full bg-gold hover:bg-gold/90 text-black"
              >
                {createCouponMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  "Gerar Cupom"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de cupons */}
      {loadingCoupons ? (
        <Card className="border-border/30 bg-card/40">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-gold" />
            <p className="text-muted-foreground mt-2">Carregando cupons...</p>
          </CardContent>
        </Card>
      ) : !couponsData || couponsData.length === 0 ? (
        <Card className="border-border/30 bg-card/40">
          <CardContent className="p-8 text-center">
            <Gift className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhum cupom criado ainda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {couponsData.map((coupon) => (
            <Card key={coupon.id} className="border-border/30 bg-card/40 hover:bg-card/60 transition-colors">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="font-mono font-bold text-gold text-sm bg-gold/10 px-2 py-1 rounded">
                          {coupon.code}
                        </code>
                        <Badge variant="outline" className={getStatusColor(coupon.status)}>
                          {coupon.status === "active" ? "🟢 Ativo" : coupon.status === "expired" ? "⏰ Expirado" : "🔴 Revogado"}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm text-foreground">
                        <p>
                          <span className="font-semibold">{coupon.discount_percent}% de desconto</span>
                          {" • "}
                          <span>{getProductTypeLabel(coupon.product_type)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Válido até: {new Date(coupon.valid_until).toLocaleString("pt-BR")}
                        </p>
                        {coupon.description && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Nota: {coupon.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyCode(coupon.code)}
                        className="h-8 w-8 p-0"
                      >
                        {copiedCode === coupon.code ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyLink(coupon.code)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {coupon.status === "active" && (
                        <AlertDialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revogar cupom?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação marcará o cupom como revogado e ele não poderá mais ser usado.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  updateCouponMutation.mutate({
                                    couponId: coupon.id,
                                    status: "revoked",
                                  })
                                }
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Revogar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                  {/* Uso do cupom */}
                  <div className="pt-2 border-t border-border/20">
                    <button
                      onClick={() =>
                        setSelectedCoupon(selectedCoupon?.id === coupon.id ? null : coupon)
                      }
                      className="text-xs text-gold hover:underline"
                    >
                      {selectedCoupon?.id === coupon.id ? "↑ Ocultar" : "↓ Ver"} uso ({coupon.total_uses || 0} vez{coupon.total_uses !== 1 ? "es" : ""})
                    </button>

                    {selectedCoupon?.id === coupon.id && (
                      <div className="mt-3 space-y-2 bg-gold/5 p-3 rounded">
                        {!usageData || usageData.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Ainda não foi usado</p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {usageData.map((usage: any) => (
                              <div key={usage.id} className="text-xs border-l-2 border-gold/30 pl-2 py-1">
                                <p className="font-medium">{usage.user_name || "Anônimo"}</p>
                                <p className="text-muted-foreground">{usage.user_email}</p>
                                <p className="text-muted-foreground">
                                  Plano: {usage.plan_key} • {new Date(usage.used_at).toLocaleString("pt-BR")}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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
