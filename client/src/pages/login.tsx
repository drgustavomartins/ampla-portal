import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, registerSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { z } from "zod";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirmEmailError, setConfirmEmailError] = useState("");
  const { login } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: z.infer<typeof loginSchema>) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: (data) => {
      login(data.user, data.token);
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof registerSchema>) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Cadastro realizado", description: data.message });
      setMode("login");
      registerForm.reset();
      setConfirmEmail("");
      setConfirmEmailError("");
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "radial-gradient(ellipse at 30% 20%, hsl(200 55% 12%) 0%, hsl(200 55% 7%) 70%)",
      }}
    >
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="text-center space-y-4">
          <img
            src="/logo-icon.png"
            alt="Ampla Facial"
            className="mx-auto h-16 w-16 object-contain"
          />
          <div>
            <h1 className="text-2xl font-semibold tracking-brand text-gold uppercase">
              Ampla Facial
            </h1>
            <div className="w-12 h-px bg-gold mx-auto mt-3 mb-2 opacity-60" />
            <p className="text-xs tracking-brand uppercase text-muted-foreground" data-v="2">
              Portal de Aulas — Dr. Gustavo Martins
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-medium text-foreground">
              {mode === "login" ? "Entrar" : "Criar Conta"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Acesse suas aulas da mentoria"
                : "Cadastre-se para solicitar acesso"}
            </p>
          </div>

          {mode === "login" ? (
            <form
              onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="seu@email.com"
                  className="bg-background/50 border-border/50 focus:border-primary"
                  data-testid="input-login-email"
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-xs uppercase tracking-wider text-muted-foreground">Senha</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••"
                  className="bg-background/50 border-border/50 focus:border-primary"
                  data-testid="input-login-password"
                  {...loginForm.register("password")}
                />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-gold text-background hover:bg-gold/90 font-medium tracking-wide"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>
          ) : (
            <form
              onSubmit={registerForm.handleSubmit((data) => {
                if (data.email !== confirmEmail) {
                  setConfirmEmailError("Os emails não coincidem");
                  return;
                }
                setConfirmEmailError("");
                registerMutation.mutate(data);
              })}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="reg-name" className="text-xs uppercase tracking-wider text-muted-foreground">Nome completo</Label>
                <Input
                  id="reg-name"
                  placeholder="Dr. João Silva"
                  className="bg-background/50 border-border/50 focus:border-primary"
                  data-testid="input-register-name"
                  {...registerForm.register("name")}
                />
                {registerForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="seu@email.com"
                  className="bg-background/50 border-border/50 focus:border-primary"
                  data-testid="input-register-email"
                  {...registerForm.register("email")}
                />
                {registerForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-confirm-email" className="text-xs uppercase tracking-wider text-muted-foreground">Confirmar email</Label>
                <Input
                  id="reg-confirm-email"
                  type="email"
                  placeholder="Repita seu email"
                  className="bg-background/50 border-border/50 focus:border-primary"
                  data-testid="input-register-confirm-email"
                  value={confirmEmail}
                  onChange={(e) => {
                    setConfirmEmail(e.target.value);
                    if (confirmEmailError) setConfirmEmailError("");
                  }}
                  onPaste={(e) => e.preventDefault()}
                />
                {confirmEmailError && (
                  <p className="text-sm text-destructive">{confirmEmailError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-phone" className="text-xs uppercase tracking-wider text-muted-foreground">Telefone</Label>
                <Input
                  id="reg-phone"
                  type="tel"
                  placeholder="+55 (11) 99999-9999"
                  className="bg-background/50 border-border/50 focus:border-primary"
                  data-testid="input-register-phone"
                  {...registerForm.register("phone")}
                />
                {registerForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password" className="text-xs uppercase tracking-wider text-muted-foreground">Senha</Label>
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  className="bg-background/50 border-border/50 focus:border-primary"
                  data-testid="input-register-password"
                  {...registerForm.register("password")}
                />
                {registerForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-gold text-background hover:bg-gold/90 font-medium tracking-wide"
                disabled={registerMutation.isPending}
                data-testid="button-register"
              >
                {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar
              </Button>
            </form>
          )}

          <div className="text-center pt-1">
            <button
              type="button"
              className="text-sm text-gold-muted hover:text-gold transition-colors"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              data-testid="button-toggle-mode"
            >
              {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre aqui"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
