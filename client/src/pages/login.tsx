import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, trialRegisterSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Eye, EyeOff, BookOpen, FileText, Headphones, CheckCircle2, Lock } from "lucide-react";
import type { z } from "zod";

// #33 — Humaniza erros de API em mensagens amigáveis
function humanizeError(error: any): string {
  const msg: string = error?.message || "";
  if (msg.includes("não foi aprovada") || msg.includes("Aguarde o administrador")) {
    return "Seu acesso está sendo ativado. Entre em contato via WhatsApp: (21) 97631-0365";
  }
  if (msg.includes("expirou") || msg.includes("encerrou")) {
    return msg; // já são mensagens amigáveis do backend
  }
  if (msg.includes("Email ou senha") || msg.includes("401")) {
    return "E-mail ou senha incorretos. Verifique seus dados e tente novamente.";
  }
  if (msg.includes("Muitas tentativas") || msg.includes("bloqueada")) {
    return msg;
  }
  if (msg.includes("já cadastrado")) {
    return "Este e-mail já possui uma conta. Tente fazer login ou recupere sua senha.";
  }
  if (msg.includes("precisa aceitar os termos")) {
    return "Você precisa aceitar os Termos de Uso para continuar.";
  }
  return msg || "Ocorreu um erro. Tente novamente ou fale conosco pelo WhatsApp.";
}

// Módulos para exibir na proposta de valor
const MODULES = [
  { icon: "💉", title: "Toxina Botulínica", lessons: "+26 aulas" },
  { icon: "✨", title: "Preenchedores Faciais", lessons: "+8 aulas" },
  { icon: "🧬", title: "Bioestimuladores", lessons: "Colágeno e neocolagênese" },
  { icon: "🔬", title: "Moduladores de Matriz", lessons: "Extracelular" },
  { icon: "⭐", title: "Método NaturalUp®", lessons: "Protocolo registrado" },
];

type Mode = "login" | "trial" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [formError, setFormError] = useState<string>("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const trialForm = useForm<z.infer<typeof trialRegisterSchema>>({
    resolver: zodResolver(trialRegisterSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", lgpdAccepted: false },
  });

  // Limpa o erro inline ao usuário começar a digitar
  const clearError = () => { if (formError) setFormError(""); };

  // #33 + #42 — Login com erro inline
  const loginMutation = useMutation({
    mutationFn: async (data: z.infer<typeof loginSchema>) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: (data) => {
      login(data.user, data.token);
    },
    onError: (error: any) => {
      setFormError(humanizeError(error));
    },
  });

  // #32 + #36 — Trial unificado: cadastro + login automático
  const trialMutation = useMutation({
    mutationFn: async (data: z.infer<typeof trialRegisterSchema>) => {
      const res = await apiRequest("POST", "/api/auth/register-trial", data);
      return res.json();
    },
    onSuccess: (data) => {
      // Backend já retorna o token — login imediato, sem segunda requisição
      login(data.user, data.token);
    },
    onError: (error: any) => {
      setFormError(humanizeError(error));
    },
  });

  // #34 — Forgot password
  const forgotMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email: forgotEmail.trim().toLowerCase() });
      return res.json();
    },
    onSuccess: () => {
      setForgotSent(true);
      setFormError("");
    },
    onError: (error: any) => {
      setFormError(humanizeError(error));
    },
  });

  const switchMode = (next: Mode) => {
    setMode(next);
    setFormError("");
    setForgotSent(false);
    setShowPassword(false);
    loginForm.reset();
    trialForm.reset();
  };

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row"
      style={{ background: "radial-gradient(ellipse at 30% 20%, hsl(216 60% 14%) 0%, hsl(216 60% 7%) 70%)" }}
    >
      {/* ===== COLUNA ESQUERDA — Proposta de valor (desktop only) ===== */}
      {/* #37 — Layout 2 colunas com proposta de valor */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-center px-16 py-12 border-r border-white/5">
        <div className="max-w-md">
          <img
            src="/logo-icon.png"
            alt="Ampla Facial"
            className="h-20 w-20 object-contain mb-8 drop-shadow-lg"
          />
          <p className="text-xs uppercase tracking-widest text-gold/60 mb-2">Portal de Aulas</p>
          <h1 className="text-4xl font-semibold text-white leading-tight mb-1">
            Ampla Facial
          </h1>
          <p className="text-gold text-lg mb-6">Dr. Gustavo Martins</p>
          <div className="w-10 h-px bg-gold/40 mb-8" />

          {/* Stats rápidas */}
          <div className="flex items-center gap-6 mb-10">
            <div className="text-center">
              <p className="text-2xl font-bold text-gold">+50</p>
              <p className="text-xs text-white/40 mt-0.5">aulas gravadas</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <p className="text-2xl font-bold text-gold">5</p>
              <p className="text-xs text-white/40 mt-0.5">módulos</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <p className="text-2xl font-bold text-gold">6</p>
              <p className="text-xs text-white/40 mt-0.5">anos em HOF</p>
            </div>
          </div>

          {/* Lista de módulos */}
          <p className="text-xs uppercase tracking-widest text-gold/50 mb-4">O que você vai aprender</p>
          <div className="space-y-3">
            {MODULES.map((m) => (
              <div key={m.title} className="flex items-center gap-3">
                <span className="text-xl w-7 shrink-0">{m.icon}</span>
                <div>
                  <p className="text-sm font-medium text-white/90">{m.title}</p>
                  <p className="text-xs text-white/40">{m.lessons}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Materiais */}
          <div className="mt-8 rounded-xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs text-gold/60 uppercase tracking-widest mb-3">Materiais complementares</p>
            <div className="flex gap-4 text-xs text-white/50">
              <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-red-400" />PDFs científicos</span>
              <span className="flex items-center gap-1.5"><Headphones className="w-3.5 h-3.5 text-emerald-400" />Resumos em MP3</span>
              <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-blue-400" />Artigos Open Access</span>
            </div>
          </div>

          {/* Credenciais */}
          <div className="mt-6 flex flex-wrap gap-2">
            {["Protocolo NaturalUp® registrado", "Técnica exclusiva — acesso restrito a alunos selecionados", "Mestre em HOF"].map((c) => (
              <span key={c} className="text-[11px] border border-gold/20 text-gold/60 rounded-full px-2.5 py-1">{c}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ===== COLUNA DIREITA — Formulário ===== */}
      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center p-4 pt-12 sm:pt-16 lg:pt-4">
        <div className="w-full max-w-sm space-y-6">

          {/* Logo mobile */}
          <div className="lg:hidden text-center space-y-3">
            <img src="/logo-icon.png" alt="Ampla Facial" className="mx-auto h-28 w-28 object-contain drop-shadow-lg" />
            <div>
              <h1 className="text-2xl font-semibold tracking-widest text-gold uppercase">Ampla Facial</h1>
              <div className="w-10 h-px bg-gold mx-auto mt-3 mb-2 opacity-50" />
              <p className="text-xs tracking-widest uppercase text-white/40">Portal de Aulas — Dr. Gustavo Martins</p>
            </div>
          </div>

          {/* Trial banner — #36 removido o modo "register" separado */}
          {mode === "login" && (
            <button
              type="button"
              onClick={() => switchMode("trial")}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-gold/30 bg-gold/5 hover:bg-gold/10 px-4 py-3 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-gold shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gold leading-tight">Teste grátis por 7 dias</p>
                  <p className="text-xs text-white/40 mt-0.5">Sem cartão de crédito — acesso imediato</p>
                </div>
              </div>
              <span className="text-xs text-gold/70 shrink-0">Começar &rarr;</span>
            </button>
          )}

          {/* Form Card */}
          <div className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6 space-y-5">

            {/* Header do card */}
            <div className="space-y-1">
              {mode === "login" && <h2 className="text-lg font-medium text-white">Entrar</h2>}
              {mode === "trial" && (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gold" />
                  <h2 className="text-lg font-medium text-white">Começar teste gratuito</h2>
                </div>
              )}
              {mode === "forgot" && <h2 className="text-lg font-medium text-white">Recuperar senha</h2>}
              <p className="text-sm text-white/40">
                {mode === "login" && "Acesse suas aulas da mentoria"}
                {mode === "trial" && "7 dias sem cartão de crédito"}
                {mode === "forgot" && "Enviaremos um link para seu e-mail"}
              </p>
            </div>

            {/* ===== LOGIN FORM ===== */}
            {mode === "login" && (
              <form
                onSubmit={loginForm.handleSubmit((data) => {
                  setFormError("");
                  loginMutation.mutate(data);
                })}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-xs text-white/50">E-mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    className="bg-white/5 border-white/10 focus:border-gold/50 text-white placeholder:text-white/20"
                    data-testid="input-login-email"
                    {...loginForm.register("email", { onChange: clearError })}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-red-400">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-xs text-white/50">Senha</Label>
                    {/* #34 — Link "Esqueci minha senha" */}
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-xs text-gold/60 hover:text-gold transition-colors"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••"
                      className="bg-white/5 border-white/10 focus:border-gold/50 text-white placeholder:text-white/20 pr-10"
                      data-testid="input-login-password"
                      {...loginForm.register("password", { onChange: clearError })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-red-400">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                {/* #42 — Erro inline em vez de toast */}
                {formError && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-300">
                    {formError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gold text-[#0A1628] hover:bg-gold/90 font-semibold"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Entrar
                </Button>
              </form>
            )}

            {/* ===== TRIAL FORM (unificado) ===== */}
            {/* #32 + #35 + #36 + #38 */}
            {mode === "trial" && (
              <form
                onSubmit={trialForm.handleSubmit((data) => {
                  if (!lgpdAccepted) {
                    setFormError("Você precisa aceitar os Termos de Uso para continuar.");
                    return;
                  }
                  setFormError("");
                  trialMutation.mutate({ ...data, lgpdAccepted: true });
                })}
                className="space-y-4"
              >
                <div className="rounded-lg border border-gold/15 bg-gold/5 px-3 py-2.5 text-xs text-gold/70 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gold" />
                  <span>Acesso imediato. Primeiras 2 aulas de cada módulo liberadas por 7 dias.</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="trial-name" className="text-xs text-white/50">Nome completo</Label>
                  <Input
                    id="trial-name"
                    placeholder="João Silva"
                    className="bg-white/5 border-white/10 focus:border-gold/50 text-white placeholder:text-white/20"
                    {...trialForm.register("name", { onChange: clearError })}
                  />
                  {trialForm.formState.errors.name && (
                    <p className="text-xs text-red-400">{trialForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="trial-email" className="text-xs text-white/50">E-mail</Label>
                  <Input
                    id="trial-email"
                    type="email"
                    placeholder="seu@email.com"
                    className="bg-white/5 border-white/10 focus:border-gold/50 text-white placeholder:text-white/20"
                    {...trialForm.register("email", { onChange: clearError })}
                  />
                  {trialForm.formState.errors.email && (
                    <p className="text-xs text-red-400">{trialForm.formState.errors.email.message}</p>
                  )}
                </div>

                {/* #38 — Telefone opcional */}
                <div className="space-y-1.5">
                  <Label htmlFor="trial-phone" className="text-xs text-white/50">
                    Telefone <span className="text-white/25">(opcional)</span>
                  </Label>
                  <Input
                    id="trial-phone"
                    type="tel"
                    placeholder="(21) 99999-9999"
                    className="bg-white/5 border-white/10 focus:border-gold/50 text-white placeholder:text-white/20"
                    {...trialForm.register("phone")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="trial-password" className="text-xs text-white/50">Crie uma senha</Label>
                  <div className="relative">
                    <Input
                      id="trial-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      className="bg-white/5 border-white/10 focus:border-gold/50 text-white placeholder:text-white/20 pr-10"
                      {...trialForm.register("password", { onChange: clearError })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {trialForm.formState.errors.password && (
                    <p className="text-xs text-red-400">{trialForm.formState.errors.password.message}</p>
                  )}
                </div>

                {/* #35 — LGPD consent */}
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setLgpdAccepted(!lgpdAccepted);
                      if (formError?.includes("termos")) setFormError("");
                    }}
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      lgpdAccepted
                        ? "bg-gold border-gold"
                        : "border-white/20 bg-white/5 hover:border-gold/40"
                    }`}
                    aria-label="Aceitar termos"
                  >
                    {lgpdAccepted && <CheckCircle2 className="w-3 h-3 text-[#0A1628]" />}
                  </button>
                  <p className="text-xs text-white/40 leading-relaxed">
                    Li e aceito os{" "}
                    <a href="/#/termos" target="_blank" className="text-gold/70 underline hover:text-gold">
                      Termos de Uso
                    </a>
                    {" "}e a{" "}
                    <a href="/#/privacidade" target="_blank" className="text-gold/70 underline hover:text-gold">
                      Política de Privacidade
                    </a>
                    . Autorizo o tratamento dos meus dados para acesso à plataforma.
                  </p>
                </div>

                {/* #42 — Erro inline */}
                {formError && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-300">
                    {formError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gold text-[#0A1628] hover:bg-gold/90 font-semibold"
                  disabled={trialMutation.isPending}
                >
                  {trialMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Ativar acesso gratuito
                </Button>
              </form>
            )}

            {/* ===== FORGOT PASSWORD FORM ===== */}
            {/* #34 */}
            {mode === "forgot" && !forgotSent && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setFormError("");
                  if (!forgotEmail.trim()) {
                    setFormError("Digite seu e-mail.");
                    return;
                  }
                  forgotMutation.mutate();
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email" className="text-xs text-white/50">Seu e-mail de cadastro</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="seu@email.com"
                    className="bg-white/5 border-white/10 focus:border-gold/50 text-white placeholder:text-white/20"
                    value={forgotEmail}
                    onChange={(e) => { setForgotEmail(e.target.value); clearError(); }}
                    autoFocus
                  />
                </div>

                {formError && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-300">
                    {formError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gold text-[#0A1628] hover:bg-gold/90 font-semibold"
                  disabled={forgotMutation.isPending}
                >
                  {forgotMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar link de recuperação
                </Button>
              </form>
            )}

            {/* Forgot — estado de sucesso */}
            {mode === "forgot" && forgotSent && (
              <div className="text-center space-y-3 py-2">
                <CheckCircle2 className="w-10 h-10 text-gold mx-auto" />
                <p className="text-sm text-white/70 leading-relaxed">
                  Se este e-mail estiver cadastrado, você receberá o link em instantes. Verifique também a caixa de spam.
                </p>
              </div>
            )}

            {/* Links de navegação entre modos */}
            <div className="text-center pt-1 space-y-2">
              {mode === "login" && (
                <p className="text-xs text-white/30">
                  Sem conta?{" "}
                  <button
                    type="button"
                    className="text-gold/70 hover:text-gold transition-colors"
                    onClick={() => switchMode("trial")}
                  >
                    Iniciar teste gratuito
                  </button>
                </p>
              )}
              {(mode === "trial" || mode === "forgot") && (
                <button
                  type="button"
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                  onClick={() => switchMode("login")}
                >
                  Já tenho conta — entrar
                </button>
              )}
            </div>
          </div>

          {/* LGPD footer */}
          <p className="text-center text-[10px] text-white/15 leading-relaxed px-2">
            Seus dados são protegidos conforme a{" "}
            <a href="/#/privacidade" target="_blank" className="underline hover:text-white/30">
              Lei Geral de Proteção de Dados (LGPD)
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
