import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, X, ArrowRight, Loader2, Gift, Star, Tag, Shield, Crown, Sparkles, Clock } from "lucide-react";
import { useCountdown } from "@/hooks/use-countdown";
import { useQuery } from "@tanstack/react-query";

function formatBRL(c: number) {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const WHATSAPP_URL = "https://wa.me/5521976263881";
const WHATSAPP_PRATICA = `${WHATSAPP_URL}?text=${encodeURIComponent("Olá Dr. Gustavo, tenho interesse no Acompanhamento Observacional da Ampla Facial.")}`;
const WHATSAPP_MENTORIA = `${WHATSAPP_URL}?text=${encodeURIComponent("Olá Dr. Gustavo, tenho interesse no Acompanhamento VIP da Ampla Facial.")}`;

function CountdownDigit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="text-xl sm:text-2xl font-bold tabular-nums leading-none px-2.5 py-1.5 rounded-lg"
        style={{ color: "#D4A843", background: "rgba(212,168,67,0.08)", minWidth: 44, textAlign: "center" }}
      >
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] uppercase tracking-wider text-white/35 mt-1">{label}</span>
    </div>
  );
}

function CountdownSeparator() {
  return <span className="text-lg font-bold text-[#D4A843]/50 self-start mt-1.5">:</span>;
}

export default function PlanosPublicos() {
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const countdown = useCountdown();
  const { data: slots } = useQuery<{ sold: number; remaining: number; limit: number; soldOut: boolean }>({
    queryKey: ["/api/vitalicio-slots"],
    refetchInterval: 30000, // atualiza a cada 30s
  });
  const cardRef = useRef<HTMLDivElement>(null);

  // Referral code state
  const hashQuery = window.location.hash.includes("?") ? window.location.hash.split("?")[1] : "";
  const urlParams = new URLSearchParams(hashQuery || window.location.search);
  const urlRef = urlParams.get("ref") || "";

  const [couponCode, setCouponCode] = useState(urlRef);
  const [couponInput, setCouponInput] = useState(urlRef);
  const [couponValid, setCouponValid] = useState<boolean | null>(null);
  const [couponReferrer, setCouponReferrer] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const validateCoupon = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      setCouponCode(""); setCouponValid(null); setCouponReferrer("");
      return;
    }
    setCouponLoading(true);
    try {
      const res = await fetch(`/api/referral/validate?code=${encodeURIComponent(trimmed)}`);
      const json = await res.json();
      if (json.valid) {
        setCouponCode(trimmed); setCouponValid(true); setCouponReferrer(json.referrerName || "");
      } else {
        setCouponCode(""); setCouponValid(false); setCouponReferrer("");
      }
    } catch {
      setCouponValid(false); setCouponReferrer("");
    } finally {
      setCouponLoading(false);
    }
  }, []);

  useEffect(() => { if (urlRef) validateCoupon(urlRef); }, [urlRef, validateCoupon]);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stripe/public-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey: "acesso_vitalicio", referralCode: couponCode || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erro");
      return json;
    },
    onSuccess: (res) => { if (res.url) window.location.href = res.url; },
    onError: () => { setLoadingCheckout(false); alert("Erro ao gerar link de pagamento. Tente novamente."); },
  });

  const handleCheckout = () => { setLoadingCheckout(true); checkoutMutation.mutate(); };

  const scrollToCard = useCallback(() => {
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const HEADER_H = 72;

  return (
    <div className="min-h-screen" style={{ background: "#0A1628", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif" }}>

      {/* ═══ HEADER ═══ */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          height: `${HEADER_H}px`,
          background: scrolled ? "rgba(10,22,40,0.92)" : "rgba(10,22,40,0.98)",
          backdropFilter: scrolled ? "blur(24px) saturate(1.8)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(24px) saturate(1.8)" : "none",
          borderBottom: `1px solid ${scrolled ? "rgba(212,168,67,0.12)" : "rgba(255,255,255,0.05)"}`,
        }}
      >
        <div className="mx-auto max-w-6xl h-full px-5 sm:px-8 flex items-center justify-between">
          <a href="/#/comecar" className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="" className="h-10 w-10 object-contain" />
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#D4A843]/70">Portal de Aulas</span>
              <span className="text-[15px] font-bold uppercase tracking-[0.06em] text-white leading-tight">Ampla Facial</span>
            </div>
          </a>
          <div className="flex items-center gap-3">
            <a
              href="/#/"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[13px] font-medium text-white/70 hover:text-white hover:border-white/20 transition-all"
            >
              Entrar
            </a>
            <button
              className="sm:hidden flex items-center justify-center w-10 h-10"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Menu"
            >
              <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                <path d="M0 0h18M0 6h18M0 12h18" stroke="#fff" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] animate-in fade-in duration-200" style={{ background: "#0A1628" }}>
          <div className="flex justify-end p-5">
            <button onClick={() => setMobileMenuOpen(false)} className="w-10 h-10 flex items-center justify-center" aria-label="Fechar">
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
          <nav className="px-8 pt-4 space-y-1">
            <a href="/#/" className="block w-full text-left py-3 border-b border-white/10">
              <span className="text-[22px] font-semibold text-white">Entrar</span>
            </a>
          </nav>
        </div>
      )}

      <div style={{ height: `${HEADER_H}px` }} />

      {/* ═══ STICKY URGENCY BAR ═══ */}
      {!countdown.expired && (
        <div
          className="fixed left-0 right-0 z-40 flex items-center justify-center gap-3 sm:gap-4 px-4 py-2.5"
          style={{
            top: `${HEADER_H}px`,
            background: "linear-gradient(90deg, #0A0D14 0%, #12192A 50%, #0A0D14 100%)",
            borderBottom: "1px solid rgba(212,168,67,0.15)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-[13px] text-white/80 flex-wrap justify-center">
            <Clock className="w-3.5 h-3.5 text-[#D4A843] shrink-0 hidden sm:block" />
            <span>
              <span className="hidden sm:inline">Oferta de lançamento R$ 397 — Plataforma Online vitalícia encerra em </span>
              <span className="sm:hidden">R$ 397 encerra em </span>
              <span className="font-bold text-[#D4A843]">
                {countdown.days}d {String(countdown.hours).padStart(2,"0")}h {String(countdown.minutes).padStart(2,"0")}m {String(countdown.seconds).padStart(2,"0")}s
              </span>
            </span>
            {slots && !slots.soldOut && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#D4A843]/15 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-[#D4A843]">
                <span className="w-1.5 h-1.5 bg-[#D4A843] rounded-full animate-pulse" />
                Vagas limitadas
              </span>
            )}
            {slots?.soldOut && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-red-400">
                Vagas esgotadas
              </span>
            )}
          </div>
          <button
            onClick={scrollToCard}
            className="shrink-0 rounded-lg px-3 py-1.5 text-[11px] sm:text-xs font-bold transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #D4A843, #F0D78C)", color: "#0A0D14" }}
          >
            Garantir Acesso <span className="hidden sm:inline">&rarr;</span>
          </button>
        </div>
      )}

      {/* ═══ HERO ═══ */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-[0.04]"
            style={{ background: "radial-gradient(ellipse, #D4A843 0%, transparent 70%)" }} />
        </div>

        <div className={`relative mx-auto max-w-6xl px-5 sm:px-8 pb-6 sm:pb-10 text-center ${countdown.expired ? "pt-12 sm:pt-20" : "pt-20 sm:pt-28"}`}>
          {/* Coupon badge */}
          {couponValid === true && (
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-xs font-semibold text-emerald-400">
              <Gift className="h-3.5 w-3.5" />
              10% de desconto ativo{couponReferrer ? ` (indicação de ${couponReferrer})` : ""}
              <button onClick={() => { setCouponCode(""); setCouponInput(""); setCouponValid(null); setCouponReferrer(""); }} className="ml-1 hover:text-emerald-300 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <h1 className="text-3xl sm:text-5xl lg:text-[56px] font-bold tracking-tight text-white leading-[1.07]">
            Domine a Harmonização Facial
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/50 leading-relaxed max-w-2xl mx-auto">
            Escolha o nível certo para você — do conteúdo online à mentoria completa com o Dr. Gustavo Martins.
          </p>

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            {[
              { icon: Shield, text: "Pagamento seguro via Stripe" },
              { icon: Star,   text: "Acesso vitalício ao conteúdo" },
              { icon: Check,  text: "Satisfação garantida" },
            ].map(({ icon: Ic, text }) => (
              <div key={text} className="flex items-center gap-2 text-[13px] text-white/35">
                <Ic className="h-3.5 w-3.5 text-[#D4A843]/60" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ CARDS ═══ */}
      <main className="mx-auto max-w-7xl px-5 sm:px-6 xl:px-4 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 xl:gap-3 items-stretch">

          {/* ── Card 1: Acesso Vitalicio ── */}
          <div ref={cardRef} className="relative rounded-[28px] overflow-hidden flex flex-col"
            style={{
              background: "linear-gradient(145deg, #12244A 0%, #0F2040 50%, #0A1628 100%)",
              boxShadow: countdown.expired
                ? "0 8px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)"
                : "0 8px 56px rgba(212,168,67,0.15), 0 0 0 1px rgba(212,168,67,0.15)",
              opacity: countdown.expired ? 0.75 : 1,
            }}
          >
            {/* Top badge */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide bg-[#D4A843] text-[#0A0D14]">
                Promoção
              </span>
            </div>

            {/* SVG background */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 600" fill="none" preserveAspectRatio="xMaxYMin slice">
              <circle cx="350" cy="50" r="150" fill="#D4A843" fillOpacity="0.06"/>
              <circle cx="30" cy="500" r="100" fill="#D4A843" fillOpacity="0.04"/>
            </svg>

            {/* Gold accent line */}
            <div className="h-[3px] w-full" style={{ background: countdown.expired ? "rgba(255,255,255,0.1)" : "linear-gradient(90deg, #D4A843, #F0D78C, #D4A843)" }} />

            <div className="relative p-7 sm:p-8 xl:p-5 flex flex-col flex-1">
              {/* Header */}
              <div className="pt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4A843] mb-2">Acesso Vitalício</p>
                <h3 className="text-2xl sm:text-[28px] xl:text-xl font-bold text-white leading-tight">Plataforma Online</h3>
                <p className="mt-2 text-sm text-white/50 leading-relaxed">Todas as aulas gravadas, materiais e vídeos de casos clínicos — para sempre.</p>
              </div>

              {/* Price */}
              <div className="mt-6">
                {countdown.expired ? (
                  <>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl sm:text-[42px] font-bold tabular-nums text-white/30 line-through">R$ 5.937,90</span>
                    </div>
                    <p className="text-sm font-semibold text-red-400 mt-2">Oferta encerrada</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-[34px] sm:text-[38px] font-bold tabular-nums text-[#D4A843] whitespace-nowrap">R$ 397</span>
                      <span className="text-base sm:text-lg text-white/30 line-through tabular-nums whitespace-nowrap">R$ 5.937,90</span>
                    </div>
                    <p className="text-xs text-white/40 mt-1">
                      <span className="text-[#D4A843] font-semibold">93% OFF</span> · Pagamento único · Sem mensalidade
                    </p>
                  </>
                )}
              </div>

              {/* Countdown compacto (uma linha) */}
              {!countdown.expired && (
                <div className="mt-4 flex items-center gap-2 text-[11px] text-[#D4A843]/80">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="tabular-nums">
                    Termina em {countdown.days}d {String(countdown.hours).padStart(2,'0')}h {String(countdown.minutes).padStart(2,'0')}m
                  </span>
                </div>
              )}

              {/* Aviso de vagas limitadas */}
              {!countdown.expired && slots && !slots.soldOut && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#D4A843] rounded-full animate-pulse shrink-0" />
                  <span className="text-[11px] font-semibold text-[#D4A843]">Vagas limitadas</span>
                </div>
              )}
              {slots?.soldOut && !countdown.expired && (
                <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-center">
                  <p className="text-[11px] font-semibold text-red-400">Vagas esgotadas</p>
                  <p className="text-[10px] text-red-400/70">Oferta encerrada antes do prazo</p>
                </div>
              )}

              {/* Divider */}
              <div className="my-6 h-px bg-white/[0.07]" />

              {/* Features */}
              <ul className="space-y-3">
                {[
                  "Todas as aulas gravadas",
                  "Vídeos de casos clínicos reais",
                  "Materiais e artigos científicos",
                  "Acesso vitalício",
                  "Atualizações futuras incluídas",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <div className="mt-[2px] h-[18px] w-[18px] shrink-0 rounded-full flex items-center justify-center bg-[#D4A843]/15">
                      <Check className="h-[10px] w-[10px] text-[#D4A843]" />
                    </div>
                    <span className="text-[13px] text-white/70 leading-snug">{f}</span>
                  </li>
                ))}
              </ul>

              {/* Not included */}
              {/* CTA */}
              <div className="mt-auto pt-6">
                <button
                  onClick={handleCheckout}
                  disabled={loadingCheckout || countdown.expired || slots?.soldOut}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-semibold tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105"
                  style={{
                    background: countdown.expired || slots?.soldOut
                      ? "rgba(255,255,255,0.08)"
                      : "linear-gradient(135deg, #D4A843 0%, #E8C86A 100%)",
                    color: countdown.expired || slots?.soldOut ? "rgba(255,255,255,0.3)" : "#0A0D14",
                    boxShadow: countdown.expired || slots?.soldOut
                      ? "none"
                      : "0 2px 12px rgba(212,168,67,0.25), inset 0 1px 0 rgba(255,255,255,0.3)",
                  }}
                >
                  {countdown.expired ? (
                    "Oferta encerrada"
                  ) : slots?.soldOut ? (
                    "Vagas esgotadas"
                  ) : loadingCheckout ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Aguarde...</>
                  ) : (
                    <>Garantir meu acesso <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ── Card 2: Módulo Avulso com Prática (tema único) ── */}
          <div className="relative rounded-[28px] overflow-hidden flex flex-col"
            style={{
              background: "linear-gradient(145deg, #2A1A0A 0%, #1F1308 50%, #14090A 100%)",
              boxShadow: "0 8px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(251,146,60,0.12)",
            }}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 600" fill="none" preserveAspectRatio="xMaxYMin slice">
              <circle cx="350" cy="50" r="130" fill="#FB923C" fillOpacity="0.05"/>
              <circle cx="30" cy="500" r="90" fill="#FB923C" fillOpacity="0.03"/>
            </svg>

            <div className="h-[3px] w-full" style={{ background: "#FB923C" }} />

            <div className="relative p-7 sm:p-8 xl:p-5 flex flex-col flex-1">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400 mb-2">Tema Único</p>
                <h3 className="text-2xl xl:text-xl font-bold text-white leading-tight">Módulo Avulso com Prática</h3>
                <p className="mt-2 text-sm text-white/50 leading-relaxed">
                  Escolha 1 tema: Toxina, Preenchedores, Bioestimuladores ou Biorregeneradores — prática hands-on focada.
                </p>
              </div>

              <div className="mt-6">
                <span className="text-[34px] sm:text-[38px] font-bold tabular-nums text-orange-400 whitespace-nowrap">R$ 5.997</span>
                <p className="text-xs text-white/30 mt-1">ou 12x de R$ 560,00</p>
              </div>

              <div className="my-6 h-px bg-white/[0.07]" />

              <ul className="space-y-3 flex-1">
                {[
                  "1 tema à escolha (4 opções)",
                  "8h de prática hands-on (2 períodos de 4h)",
                  "Atendimento de 4 a 6 pacientes",
                  "8h de observação clínica",
                  "Aulas e materiais do tema",
                  "Acompanhamento quinzenal ao vivo",
                  "Certificado do tema",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <div className="mt-[2px] h-[18px] w-[18px] shrink-0 rounded-full flex items-center justify-center bg-orange-500/15">
                      <Check className="h-[10px] w-[10px] text-orange-400" />
                    </div>
                    <span className="text-[13px] text-white/70 leading-snug">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-6">
                <a
                  href={`${WHATSAPP_URL}?text=${encodeURIComponent("Olá Dr. Gustavo, tenho interesse no Módulo Avulso com Prática. Quero saber mais sobre qual tema escolher.")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-semibold tracking-wide transition-all hover:brightness-105"
                  style={{
                    background: "linear-gradient(135deg, #FB923C 0%, #FDBA74 100%)",
                    color: "#14090A",
                    boxShadow: "0 2px 12px rgba(251,146,60,0.25), inset 0 1px 0 rgba(255,255,255,0.3)",
                  }}
                >
                  Escolher meu tema <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* ── Card 3: Acompanhamento Observacional ── */}
          <div className="relative rounded-[28px] overflow-hidden flex flex-col"
            style={{
              background: "linear-gradient(145deg, #0D2818 0%, #0A2015 50%, #071A10 100%)",
              boxShadow: "0 8px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(52,211,153,0.1)",
            }}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 600" fill="none" preserveAspectRatio="xMaxYMin slice">
              <circle cx="350" cy="50" r="130" fill="#34D399" fillOpacity="0.05"/>
              <circle cx="30" cy="500" r="90" fill="#34D399" fillOpacity="0.03"/>
            </svg>

            <div className="h-[3px] w-full" style={{ background: "#34D399" }} />

            <div className="relative p-7 sm:p-8 xl:p-5 flex flex-col flex-1">
              {/* Header */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400 mb-2">Observacional</p>
                <h3 className="text-2xl xl:text-xl font-bold text-white leading-tight">Acompanhamento Observacional</h3>
                <p className="mt-2 text-sm text-white/50 leading-relaxed">Aulas + 24h observando o Dr. Gustavo em atendimento + acompanhamento ao vivo.</p>
              </div>

              {/* Price */}
              <div className="mt-6">
                <span className="text-[34px] sm:text-[38px] font-bold tabular-nums text-emerald-400 whitespace-nowrap">R$ 4.997</span>
                <p className="text-xs text-white/30 mt-1">Parcelamento disponível</p>
              </div>

              <div className="my-6 h-px bg-white/[0.07]" />

              {/* Features */}
              <ul className="space-y-3 flex-1">
                {[
                  "Tudo da Plataforma Online",
                  "24h de observação clínica presencial",
                  "Acompanhamento quinzenal ao vivo",
                  "Comunidade do portal + créditos",
                  "Certificado de participação",
                  "Acesso ao portal por 12 meses",
                ].map((f, i) => (
                  <li key={f} className="flex items-start gap-3">
                    <div className="mt-[2px] h-[18px] w-[18px] shrink-0 rounded-full flex items-center justify-center bg-emerald-500/15">
                      <Check className="h-[10px] w-[10px] text-emerald-400" />
                    </div>
                    <span className={`text-[13px] leading-snug ${i === 0 ? "text-emerald-400/80 font-medium" : "text-white/70"}`}>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={WHATSAPP_PRATICA}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto pt-8 flex w-full items-center justify-center gap-2 rounded-xl sm:rounded-2xl py-2.5 sm:py-4 text-[13px] sm:text-[15px] font-bold transition-all duration-200 hover:brightness-110"
                style={{ background: "#34D399", color: "#071A10", boxShadow: "0 4px 24px rgba(52,211,153,0.25)" }}
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Quero Acompanhar <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* ── Card 3: Acompanhamento VIP (premium) ── */}
          <div className="relative rounded-[28px] overflow-hidden flex flex-col"
            style={{
              background: "linear-gradient(145deg, #1A103A 0%, #12082E 50%, #0D0622 100%)",
              boxShadow: "0 8px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(147,130,220,0.12)",
            }}
          >
            {/* Premium badge */}
            <div className="absolute top-4 right-4 z-10">
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Crown className="h-3 w-3" /> Premium
              </span>
            </div>

            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 600" fill="none" preserveAspectRatio="xMaxYMin slice">
              <circle cx="350" cy="50" r="130" fill="#8B5CF6" fillOpacity="0.06"/>
              <circle cx="30" cy="500" r="90" fill="#8B5CF6" fillOpacity="0.03"/>
            </svg>

            <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #8B5CF6, #C084FC, #8B5CF6)" }} />

            <div className="relative p-7 sm:p-8 xl:p-5 flex flex-col flex-1">
              {/* Header */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-purple-400 mb-2">Formação Completa</p>
                <h3 className="text-2xl xl:text-xl font-bold text-white leading-tight">Acompanhamento VIP</h3>
                <p className="mt-2 text-sm text-white/50 leading-relaxed">Prática hands-on + mentoria individual + método NaturalUp®.</p>
              </div>

              {/* Price */}
              <div className="mt-6">
                <span className="text-[34px] sm:text-[38px] font-bold tabular-nums text-purple-400 whitespace-nowrap">R$ 17.350</span>
                <p className="text-xs text-white/30 mt-1">Parcelamento disponível</p>
              </div>

              <div className="my-6 h-px bg-white/[0.07]" />

              {/* Features */}
              <ul className="space-y-3 flex-1">
                {[
                  "Tudo do Acompanhamento Observacional",
                  "16h de prática hands-on em pacientes modelo",
                  "Mentoria individual por 6 meses",
                  "Canal direto com Dr. Gustavo",
                  "Acompanhamento quinzenal ao vivo",
                  "Método NaturalUp® (5º módulo)",
                  "Licença da marca NaturalUp® só no Elite",
                  "Certificado com carga horária",
                ].map((f, i) => (
                  <li key={f} className="flex items-start gap-3">
                    <div className="mt-[2px] h-[18px] w-[18px] shrink-0 rounded-full flex items-center justify-center bg-purple-500/15">
                      {i === 0
                        ? <Sparkles className="h-[10px] w-[10px] text-purple-400" />
                        : <Check className="h-[10px] w-[10px] text-purple-400" />
                      }
                    </div>
                    <span className={`text-[13px] leading-snug ${i === 0 ? "text-purple-400/80 font-medium" : "text-white/70"}`}>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={WHATSAPP_MENTORIA}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto pt-8 flex w-full items-center justify-center gap-2 rounded-xl sm:rounded-2xl py-2.5 sm:py-4 text-[13px] sm:text-[15px] font-bold transition-all duration-200 hover:brightness-110"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #C084FC)", color: "#fff", boxShadow: "0 4px 24px rgba(139,92,246,0.3)" }}
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Falar com Dr. Gustavo <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* ── Card 4: Acompanhamento Elite ── */}
          <div className="relative rounded-[28px] overflow-hidden flex flex-col"
            style={{
              background: "linear-gradient(145deg, #050810 0%, #0B1022 50%, #141B33 100%)",
              boxShadow: "0 8px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(232,200,106,0.25)",
            }}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 600" fill="none" preserveAspectRatio="xMaxYMin slice">
              <circle cx="350" cy="50" r="150" fill="#E8C86A" fillOpacity="0.1"/>
              <circle cx="30" cy="500" r="100" fill="#D4A843" fillOpacity="0.06"/>
            </svg>

            <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #E8C86A, #FFD87A, #E8C86A)" }} />

            <div className="relative p-7 sm:p-8 xl:p-5 flex flex-col flex-1">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.15em] bg-[#E8C86A] text-[#0A0D14] px-2.5 py-1 rounded-full self-start mb-4">
                <Crown className="h-2.5 w-2.5" />
                Experiência definitiva
              </span>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E8C86A] mb-2">O Mais Alto Nível</p>
                <h3 className="text-2xl sm:text-[28px] xl:text-xl font-bold text-white leading-tight">Acompanhamento Elite</h3>
                <p className="mt-2 text-sm text-white/50 leading-relaxed">Os bastidores da Clínica + licença exclusiva da marca NaturalUp® — acompanhamento 360° por 12 meses.</p>
              </div>

              <div className="mt-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-[34px] sm:text-[38px] font-bold tabular-nums text-[#E8C86A] whitespace-nowrap">R$ 35.000</span>
                </div>
                <p className="text-xs text-white/40 mt-1">12x de R$ 2.916,67 · Vagas limitadas</p>
              </div>

              <div className="my-6 h-px bg-white/[0.07]" />

              <ul className="space-y-3 flex-1">
                {[
                  "Tudo do Acompanhamento VIP",
                  "32h de prática com pacientes modelo",
                  "7 dias clínicos completos ao lado do Dr.",
                  "Bastidores: gestão e operação da clínica",
                  "Mentoria individual por 12 meses",
                  "Licença oficial da marca NaturalUp®",
                  "Único plano com direito à logo NaturalUp®",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <div className="mt-[2px] h-[18px] w-[18px] shrink-0 rounded-full flex items-center justify-center" style={{ background: "rgba(232,200,106,0.15)" }}>
                      <Check className="h-[11px] w-[11px] text-[#E8C86A]" strokeWidth={3} />
                    </div>
                    <span className="text-[13px] text-white/80 leading-snug">{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href={`${WHATSAPP_URL}?text=${encodeURIComponent("Olá Dr. Gustavo, tenho interesse no Acompanhamento Elite (bastidores + 32h prática + 7 dias clínicos + licença NaturalUp). Podemos conversar?")}`}
                target="_blank" rel="noopener noreferrer"
                className="mt-auto pt-8 flex w-full items-center justify-center gap-2 rounded-xl sm:rounded-2xl py-2.5 sm:py-4 text-[13px] sm:text-[15px] font-bold transition-all duration-200 hover:brightness-110"
                style={{ background: "linear-gradient(135deg, #E8C86A, #FFD87A)", color: "#0A0D14", boxShadow: "0 4px 24px rgba(232,200,106,0.35)" }}
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Quero o Acompanhamento Elite <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

        </div>

        {/* ═══ Trial CTA ═══ */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 rounded-2xl px-6 py-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-sm text-white/50">Ainda em dúvida?</span>
            <a
              href="/#/comecar"
              className="text-sm font-semibold text-[#D4A843] hover:text-[#F0D78C] transition-colors"
            >
              Comece com o Trial gratuito — 7 dias de acesso &rarr;
            </a>
          </div>
        </div>

        {/* ═══ Referral code ═══ */}
        {couponValid !== true && (
          <div className="mt-12 max-w-md mx-auto">
            <p className="text-center text-sm font-medium text-white/40 mb-3">Tem um código de convite?</p>
            <div className="flex items-center justify-center gap-2">
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); if (couponValid === false) setCouponValid(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") validateCoupon(couponInput); }}
                  placeholder="Código de convite"
                  className="pl-9 pr-3 py-2 rounded-xl border text-sm w-52 outline-none transition-all bg-white/5 text-white placeholder-white/30"
                  style={{ borderColor: couponValid === false ? "#F87171" : "rgba(255,255,255,0.1)" }}
                />
              </div>
              <button
                onClick={() => validateCoupon(couponInput)}
                disabled={!couponInput.trim() || couponLoading}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40 bg-white/10 text-white hover:bg-white/15"
              >
                {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
              </button>
            </div>
            {couponValid === false && (
              <p className="text-center text-xs text-red-400 mt-2">Código inválido</p>
            )}
            <p className="text-center text-xs text-white/25 mt-2">Ganhe 10% de desconto na primeira compra</p>
          </div>
        )}

        {/* ═══ Testimonials ═══ */}
        <section className="mt-20 max-w-5xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-white mb-2">O que dizem nossos alunos</h2>
          <p className="text-center text-sm text-white/40 mb-10">Profissionais que transformaram sua prática clínica</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { name: "Dra. Carolina O.", role: "Dentista - RJ", text: "A mentoria do Dr. Gustavo mudou completamente minha forma de atender. Os protocolos do Método NaturalUp são incríveis, resultados muito mais naturais." },
              { name: "Dr. Felipe P.", role: "Dentista - RJ", text: "O conteúdo é extremamente prático. Já no primeiro mês consegui aplicar as técnicas com meus pacientes. O suporte é diferenciado." },
              { name: "Dra. Glaucia A.", role: "Biomedicina Estética - RJ", text: "Ter acesso às aulas e aos encontros ao vivo faz toda a diferença. A comunidade de alunos também agrega muito na troca de experiências." },
            ].map((t, i) => (
              <div key={i} className="rounded-2xl p-6 space-y-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} className="w-4 h-4 text-[#D4A843]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  ))}
                </div>
                <p className="text-sm text-white/60 leading-relaxed">"{t.text}"</p>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-white/35">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ Footer ═══ */}
        <div className="mt-20 text-center text-xs text-white/20 space-y-2">
          <p>&copy; 2026 Ampla Facial &mdash; Todos os direitos reservados</p>
          <div className="flex items-center justify-center gap-4">
            <a href="/#/termos" className="hover:text-white/40 transition-colors">Termos de Uso</a>
            <a href="/#/privacidade" className="hover:text-white/40 transition-colors">Privacidade</a>
            <a href="/#/" className="hover:text-white/40 transition-colors">Entrar</a>
          </div>
        </div>
      </main>
    </div>
  );
}
