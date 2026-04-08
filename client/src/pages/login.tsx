import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, registerSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";
import type { z } from "zod";

type Mode = "login" | "register" | "trial";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirmEmailError, setConfirmEmailError] = useState("");
  const [trialConfirmEmail, setTrialConfirmEmail] = useState("");
  const [trialConfirmEmailError, setTrialConfirmEmailError] = useState("");
  const { login } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "" },
  });

  const trialForm = useForm<z.infer<typeof registerSchema>>({
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

  const trialMutation = useMutation({
    mutationFn: async (data: z.infer<typeof registerSchema>) => {
      const res = await apiRequest("POST", "/api/auth/register-trial", data);
      return res.json();
    },
    onSuccess: (data) => {
      // Automatically log in after trial registration
      loginMutation.mutate({
        email: trialForm.getValues("email"),
        password: trialForm.getValues("password"),
      });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const modeLabels: Record<Mode, { title: string; subtitle: string }> = {
    login: { title: "Entrar", subtitle: "Acesse suas aulas da mentoria" },
    register: { title: "Criar Conta", subtitle: "Cadastre-se para solicitar acesso" },
    trial: { title: "Teste Gratuito", subtitle: "7 dias de acesso sem cartão de crédito" },
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start p-4 pt-12 sm:pt-16 md:justify-center md:pt-4"
      style={{
        background: "radial-gradient(ellipse at 30% 20%, hsl(216 60% 14%) 0%, hsl(216 60% 7%) 70%)",
      }}
    >
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="text-center space-y-4">
          <img
            src="/logo-icon.png"
            alt="Ampla Facial"
            className="mx-auto h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 object-contain drop-shadow-lg"
          />
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-brand text-gold uppercase">
              Ampla Facial
            </h1>
            <div className="w-12 h-px bg-gold mx-auto mt-3 mb-2 opacity-60" />
            <p className="text-xs tracking-brand uppercase text-muted-foreground" data-v="2">
              Portal de Aulas — Dr. Gustavo Martins
            </p>
          </div>
        </div>

        {/* Trial CTA banner — only shown on login/register modes */}
        {mode !== "trial" && (
          <button
            type="button"
            onClick={() => navigate("/comecar")}
            className="w-full flex items-center justify-between gap-3 rounded-xl border border-gold/30 bg-gold/5 hover:bg-gold/10 px-4 py-3 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-gold shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gold leading-tight">Teste grátis por 7 dias</p>
                <p className="text-xs text-muted-foreground mt-0.5">Sem cartão de crédito</p>
              </div>
            </div>
            <span className="text-xs text-gold/70 shrink-0">Começar &rarr;</span>
          </button>
        )}

        {/* Form Card */}
        <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-medium text-foreground">{modeLabels[mode].title}</h2>
            <p className="text-sm text-muted-foreground">{modeLabels[mode].subtitle}</p>
          </div>

          {/* ===== LOGIN FORM ===== */}
          {mode === "login" && (
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
          )}

          {/* ===== REGISTER FORM ===== */}
          {mode === "register" && (
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

          {/* ===== TRIAL FORM ===== */}
          {mode === "trial" && (
            <form
              onSubmit={trialForm.handleSubmit((data) => {
                if (data.email !== trialConfirmEmail) {
                  setTrialConfirmEmailError("Os emails não coincidem");
                  return;
                }
                setTrialConfirmEmailError("");
                trialMutation.mutate(data);
              })}
              className="space-y-4"
            >
              <div className="rounded-lg border border-gold/20 bg-gold/5 px-3 py-2.5 text-xs text-gold/80 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Acesso imediato. Primeiras 2 aulas de cada módulo liberadas por 7 dias.</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trial-name" className="text-xs uppercase tracking-wider text-muted-foreground">Nome completo</Label>
                <Input
                  id="trial-name"
                  placeholder="Dr. João Silva"
                  className="bg-background/50 border-border/50 focus:border-primary"
                  {...trialForm.register("name")}
                />
                {trialForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{trialForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="trial-email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input
                  id="trial-email"
                  type="email"
                  placeholder="seu@email.com"
                  className="bg-background/50 border-border/50 focus:border-primary"
                  {...trialForm.register("email")}
                />
                {trialForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{trialForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="trial-confirm-email" className="text-xs uppercase tracking-wider text-muted-foreground">Confirmar email</Label>
                <Input
                  id="trial-confirm-email"
                  type="email"
                  placeholder="Repita seu email"
                  className="bg-background/50 border-border/50 focus:border-primary"
                  value={trialConfirmEmail}
                  onChange={(e) => {
                    setTrialConfirmEmail(e.target.value);
                    if (trialConfirmEmailError) setTrialConfirmEmailError("");
                  }}
                  onPaste={(e) => e.preventDefault()}
                />
                {trialConfirmEmailError && (
                  <p className="text-sm text-destructive">{trialConfirmEmailError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="trial-phone" className="text-xs uppercase tracking-wider text-muted-foreground">Telefone</Label>
                <Input
                  id="trial-phone"
                  type="tel"
                  placeholder="+55 (11) 99999-9999"
                  className="bg-background/50 border-border/50 focus:border-primary"
                  {...trialForm.register("phone")}
                />
                {trialForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">{trialForm.formState.errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="trial-password" className="text-xs uppercase tracking-wider text-muted-foreground">Crie uma senha</Label>
                <Input
                  id="trial-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  className="bg-background/50 border-border/50 focus:border-primary"
                  {...trialForm.register("password")}
                />
                {trialForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{trialForm.formState.errors.password.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-gold text-background hover:bg-gold/90 font-medium tracking-wide"
                disabled={trialMutation.isPending || loginMutation.isPending}
              >
                {(trialMutation.isPending || loginMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ativar teste gratuito
              </Button>
            </form>
          )}

          <div className="text-center pt-1 space-y-2">
            {mode === "trial" ? (
              <button
                type="button"
                className="text-sm text-gold-muted hover:text-gold transition-colors"
                onClick={() => setMode("login")}
              >
                Já tem conta? Entre aqui
              </button>
            ) : (
              <button
                type="button"
                className="text-sm text-gold-muted hover:text-gold transition-colors"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                data-testid="button-toggle-mode"
              >
                {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre aqui"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
