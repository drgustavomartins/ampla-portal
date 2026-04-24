import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const [, params] = useRoute("/reset-password/:token");
  const token = params?.token || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/auth/reset-password/${token}`)
      .then((r) => {
        setTokenValid(r.ok);
      })
      .catch(() => setTokenValid(false));
  }, [token]);

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/auth/reset-password/${token}`, { password });
      return res.json();
    },
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (err: any) => {
      setError(err.message || "Erro ao resetar senha");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    resetMutation.mutate();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "radial-gradient(ellipse at 30% 20%, hsl(216 60% 14%) 0%, hsl(216 60% 7%) 70%)",
      }}
    >
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-4">
          <img src="/logo-icon.png" alt="Ampla Facial" className="mx-auto h-16 w-16 object-contain" loading="lazy" decoding="async" />
          <div>
            <h1 className="text-2xl font-semibold tracking-brand text-gold uppercase">Ampla Facial</h1>
            <div className="w-12 h-px bg-gold mx-auto mt-3 mb-2 opacity-60" />
            <p className="text-xs tracking-brand uppercase text-muted-foreground">Redefinir Senha</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 space-y-5">
          {tokenValid === null && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gold" />
            </div>
          )}

          {tokenValid === false && (
            <div className="text-center space-y-3 py-4">
              <XCircle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="text-lg font-medium text-foreground">Link inválido ou expirado</h2>
              <p className="text-sm text-muted-foreground">
                Este link de redefinição de senha não é válido ou já foi utilizado. Solicite um novo link ao administrador.
              </p>
              <Button
                className="bg-gold text-background hover:bg-gold/90 font-medium"
                onClick={() => { window.location.hash = "/"; }}
              >
                Ir para login
              </Button>
            </div>
          )}

          {tokenValid === true && !success && (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-medium text-foreground">Nova senha</h2>
                <p className="text-sm text-muted-foreground">Digite sua nova senha abaixo</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Nova senha
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    className="bg-background/50 border-border/50 focus:border-primary"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Confirmar nova senha
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Repita a senha"
                    className="bg-background/50 border-border/50 focus:border-primary"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  type="submit"
                  className="w-full bg-gold text-background hover:bg-gold/90 font-medium tracking-wide"
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Alterar senha
                </Button>
              </form>
            </>
          )}

          {success && (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="w-12 h-12 text-gold mx-auto" />
              <h2 className="text-lg font-medium text-foreground">Senha alterada!</h2>
              <p className="text-sm text-muted-foreground">
                Sua senha foi redefinida com sucesso. Faça login com a nova senha.
              </p>
              <Button
                className="bg-gold text-background hover:bg-gold/90 font-medium"
                onClick={() => { window.location.hash = "/"; }}
              >
                Ir para login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
