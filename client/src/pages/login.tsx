import { useState, useRef, useEffect } from "react";
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
import { Loader2, Sparkles, Eye, EyeOff, CheckCircle2, Star, Users, Clock, Play, ArrowRight, Camera, Instagram, Phone } from "lucide-react";
import { PhoneInput } from "@/components/PhoneInput";
import { trackEvent } from "@/lib/funnel";
import { captureUtmParams, getUtmData, getInviteCode, clearInviteCode } from "@/lib/utm";
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
  { title: "Toxina Botulínica" },
  { title: "Preenchedores Faciais" },
  { title: "Bioestimuladores de Colágeno" },
  { title: "Moduladores de Matriz Extracelular" },
  { title: "Método NaturalUp®" },
];

type Mode = "login" | "trial" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [formError, setFormError] = useState<string>("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const avatarFileStore = useRef<File | null>(null);
  const { login } = useAuth();
  const { toast } = useToast();

  // Invite code state
  const [inviteInfo, setInviteInfo] = useState<{ code: string; durationDays: number; campaign: string } | null>(null);

  // Capture UTM params on login/register page load
  useEffect(() => { captureUtmParams(); }, []);

  // Check for invite code and auto-switch to registration
  useEffect(() => {
    const code = getInviteCode();
    if (code) {
      fetch(`/api/invite/${encodeURIComponent(code)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setInviteInfo(data);
            setMode("trial"); // auto-switch to registration form
          }
        })
        .catch(() => {});
    }
  }, []);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const trialForm = useForm<z.infer<typeof trialRegisterSchema>>({
    resolver: zodResolver(trialRegisterSchema),
    defaultValues: { name: "", email: "", phone: "55", password: "", instagram: "", lgpdAccepted: false },
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
      const utm = getUtmData();
      const payload: any = { ...data, ...utm };
      // Include invite code if present
      const inviteCode = getInviteCode();
      if (inviteCode) payload.invite_code = inviteCode;
      const res = await apiRequest("POST", "/api/auth/register-trial", payload);
      return res.json();
    },
    onSuccess: async (data) => {
      // Upload avatar if one was selected (fire-and-forget, don't block login)
      if (avatarFileStore.current && data.token) {
        try {
          const fd = new FormData();
          fd.append("avatar", avatarFileStore.current);
          await fetch("/api/upload/avatar", {
            method: "POST",
            headers: { Authorization: `Bearer ${data.token}` },
            body: fd,
          });
        } catch { /* silently ignore — avatar is optional */ }
      }
      // Clear invite code after successful registration
      clearInviteCode();
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
      className="min-h-screen flex flex-col"
      style={{ background: "radial-gradient(ellipse at 50% 10%, hsl(216 60% 14%) 0%, hsl(216 60% 7%) 70%)" }}
    >
      {/* ===== DUAS COLUNAS ===== */}
      <div className="flex flex-col lg:flex-row flex-1">

      {/* ===== COLUNA ESQUERDA — Formulário ===== */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 pt-8 lg:pt-4 lg:border-r lg:border-white/5">
        <div className="w-full max-w-sm space-y-5">

          {/* Logo — fiel à montagem */}
          <div className="flex items-center gap-2 justify-start pl-1">
            <img src="/logo-icon.png" alt="" className="h-20 w-20 object-contain shrink-0 -mt-3" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#D4A843]/70 font-light mb-0.5">Portal de Aulas</p>
              <h1 className="text-[2rem] font-extrabold tracking-wide text-white leading-none">AMPLA FACIAL</h1>
              <p className="text-sm text-[#D4A843] mt-1 font-light tracking-wide">Dr. Gustavo Martins</p>
            </div>
          </div>

          {/* Logo mobile (mantida para compatibilidade) */}
          <div className="hidden text-center space-y-3">
            <img src="/logo-icon.png" alt="Ampla Facial" className="mx-auto h-28 w-28 object-contain drop-shadow-lg" />
            <div>
              <h1 className="text-2xl font-semibold tracking-widest text-gold uppercase">Ampla Facial</h1>
              <div className="w-10 h-px bg-gold mx-auto mt-3 mb-2 opacity-50" />
              <p className="text-xs tracking-widest uppercase text-white/40">Portal de Aulas — Dr. Gustavo Martins</p>
            </div>
          </div>

          {/* Invite code badge — shown when user arrived via invite link */}
          {inviteInfo && (
            <div className="w-full flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-300 leading-tight">Convite Especial — Acesso Completo</p>
                  <p className="text-xs text-white/50 mt-0.5">Todas as aulas e módulos por {inviteInfo.durationDays} dias</p>
                </div>
              </div>
            </div>
          )}

          {/* Trial banner — #36 removido o modo "register" separado */}
          {mode === "login" && !inviteInfo && (
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
                  {inviteInfo ? <Star className="w-4 h-4 text-emerald-400" /> : <Sparkles className="w-4 h-4 text-gold" />}
                  <h2 className="text-lg font-medium text-white">{inviteInfo ? "Criar sua conta" : "Começar teste gratuito"}</h2>
                </div>
              )}
              {mode === "forgot" && <h2 className="text-lg font-medium text-white">Recuperar senha</h2>}
              <p className="text-sm text-white/40">
                {mode === "login" && "Acesse suas aulas da mentoria"}
                {mode === "trial" && (inviteInfo ? `Acesso completo por ${inviteInfo.durationDays} dias` : "7 dias sem cartão de crédito")}
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
                  const instagram = (data.instagram || "").replace(/^@/, "").trim();
                  trialMutation.mutate({ ...data, instagram, lgpdAccepted: true });
                })}
                className="space-y-4"
              >
                <div className={`rounded-lg border px-3 py-2.5 text-xs flex items-start gap-2 ${inviteInfo ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400/80" : "border-gold/15 bg-gold/5 text-gold/70"}`}>
                  {inviteInfo ? <Star className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gold" />}
                  <span>{inviteInfo ? `Acesso imediato. Todas as aulas e módulos liberados por ${inviteInfo.durationDays} dias.` : "Acesso imediato. Primeiras 2 aulas de cada módulo liberadas por 7 dias."}</span>
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

                {/* Telefone — obrigatório, com seletor de país */}
                <div className="space-y-1.5">
                  <Label htmlFor="trial-phone" className="text-xs text-white/50">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3" />
                      Telefone
                    </span>
                  </Label>
                  <PhoneInput
                    value={trialForm.watch("phone")}
                    onChange={(raw) => {
                      trialForm.setValue("phone", raw, { shouldValidate: true });
                      clearError();
                    }}
                    variant="dark"
                  />
                  {trialForm.formState.errors.phone && (
                    <p className="text-xs text-red-400">{trialForm.formState.errors.phone.message}</p>
                  )}
                </div>

                {/* Avatar opcional */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/50">
                    Foto de perfil <span className="text-white/25">(opcional)</span>
                  </Label>
                  <div className="flex items-center gap-3">
                    {avatarPreview ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-gold/30 shrink-0">
                        <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <Camera className="w-4 h-4 text-white/30" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => avatarFileRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-dashed border-gold/30 bg-gold/5 px-3 py-2 text-xs font-medium transition-colors hover:bg-gold/10"
                      style={{ color: '#D4A843' }}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      {avatarPreview ? "Trocar foto" : "Escolher foto"}
                    </button>
                    <input
                      ref={avatarFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          avatarFileStore.current = file;
                          const reader = new FileReader();
                          reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>

                {/* Instagram — opcional, incentivado */}
                <div className="space-y-1.5">
                  <Label htmlFor="trial-instagram" className="text-xs text-white/50">
                    <span className="flex items-center gap-1.5">
                      <Instagram className="w-3 h-3" />
                      Seu Instagram <span className="text-white/25">(opcional)</span>
                    </span>
                  </Label>
                  <Input
                    id="trial-instagram"
                    placeholder="@seuusuario"
                    className="bg-white/5 border-white/10 focus:border-gold/50 text-white placeholder:text-white/20"
                    {...trialForm.register("instagram")}
                  />
                  <p className="text-[10px] text-white/25">Nos ajuda a te encontrar e compartilhar seu progresso</p>
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
                      const next = !lgpdAccepted;
                      setLgpdAccepted(next);
                      trialForm.setValue("lgpdAccepted", next);
                      if (formError?.includes("termos") || formError?.includes("Termos")) setFormError("");
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

          {/* Link planos publicos */}
          <div className="mt-6 text-center">
            <a href="/#/planos-publicos" className="text-sm text-gold hover:text-gold/80 font-medium underline-offset-4 hover:underline transition-colors">
              Ver todos os planos e preços
            </a>
          </div>

          {/* LGPD footer */}
          <p className="text-center text-xs text-white/50 leading-relaxed px-2">
            Seus dados são protegidos conforme a{" "}
            <a href="/#/privacidade" target="_blank" className="underline hover:text-white/70">
              Lei Geral de Proteção de Dados (LGPD)
            </a>
            .
          </p>
        </div>
      </div>

      {/* ===== COLUNA DIREITA — Painel rico (desktop only) ===== */}
      <div className="hidden lg:flex lg:w-[52%] flex-col items-center justify-center px-12 py-4 gap-4">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 w-full">
          {[
            { value: "150+", label: "Alunos" },
            { value: "50+", label: "Horas" },
            { value: "5★", label: "Avaliação" },
          ].map(({ value, label }) => (
            <div key={label} className="rounded-lg border border-white/6 bg-white/[0.03] py-2.5 text-center">
              <p className="text-base font-bold text-[#D4A843] leading-none">{value}</p>
              <p className="text-[9px] text-white/30 uppercase tracking-wide mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Preview módulos */}
        <div className="w-full">
          <p className="text-[9px] uppercase tracking-widest text-[#D4A843]/40 mb-1.5">Conteúdo disponível</p>
          <div className="space-y-1">
            {MODULES.map((m, i) => (
              <div key={m.title} className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5">
                <Play className="h-2 w-2 text-[#D4A843] fill-[#D4A843] shrink-0" />
                <span className="text-xs text-white/65">{m.title}</span>
                <span className="ml-auto text-[9px] text-white/20 font-mono shrink-0">0{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Depoimento */}
        <div className="w-full rounded-xl border border-[#D4A843]/20 bg-[#D4A843]/5 px-4 py-3">
          <div className="flex gap-0.5 mb-1.5">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-2.5 w-2.5 text-[#D4A843] fill-[#D4A843]" />)}
          </div>
          <p className="text-[11px] text-white/55 leading-relaxed italic">
            &ldquo;Amei cada aula. Foi uma das melhores experiências de aprendizado que já tive. Consigo assistir quantas vezes quiser ao meu professor favorito.&rdquo;
          </p>
          <p className="mt-1.5 text-[9px] text-[#D4A843]/60">Dra. Ana — Rio de Janeiro</p>
        </div>

        {/* Banner trial */}
        <div className="w-full rounded-xl border border-[#D4A843]/30 bg-[#D4A843]/5 px-4 py-3 flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-[#D4A843] shrink-0" />
          <div>
            <p className="text-xs font-semibold text-white">7 dias grátis — sem cartão</p>
            <p className="text-[9px] text-white/40">Acesse as primeiras aulas agora mesmo</p>
          </div>
        </div>

        {/* Banner Quiz */}
        <a
          href="/#/quiz"
          onClick={() => { fetch("/api/quiz/click", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: "login_banner" }) }).catch(() => {}); trackEvent("banner_click", { source: "login_banner" }); }}
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-center gap-3 hover:border-[#D4A843]/30 hover:bg-[#D4A843]/5 transition-all group"
        >
          <span className="text-xl shrink-0">🏆</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white">Qual mentoria é ideal para você?</p>
            <p className="text-[9px] text-white/40">Faça o quiz e concorra a 1 mês VIP grátis</p>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-[#D4A843]/50 group-hover:text-[#D4A843] shrink-0 transition-colors" />
        </a>

      </div>

      </div>{/* fim das duas colunas */}
    </div>
  );
}
