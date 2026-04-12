import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, ArrowRight, Loader2, Gift, Star, ChevronLeft, Tag, X, Shield } from "lucide-react";

interface PlanData {
  key: string;
  name: string;
  description: string;
  group: "digital" | "observador" | "vip" | "horas";
  highlight?: string;
  price: number;
  priceFormatted: string;
  installments12x: number | null;
  installments12xFormatted: string | null;
  features: string[];
  clinicalHours: number;
  practiceHours: number;
  hasDirectChannel: boolean;
  hasMentorship: boolean;
  hasLiveEvents: boolean;
  hasNaturalUp: boolean;
  valorMercado: number | null;
}

type Tab = "online" | "observacao" | "mentoria";

function formatBRL(c: number) {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Temas visuais dos cards ───────────────────────────────────────────────
const CARD_THEMES: Record<string, { grad: string; accent: string; dark: boolean; pattern: string }> = {
  modulo_avulso: {
    dark: false, accent: "#1A56A4",
    grad: "linear-gradient(145deg,#EBF4FF 0%,#DBEAFE 60%,#BFDBFE 100%)",
    pattern: `<circle cx="210" cy="20" r="90" fill="#93C5FD" fill-opacity="0.2"/><circle cx="20" cy="140" r="55" fill="#BFDBFE" fill-opacity="0.25"/>`,
  },
  pacote_completo: {
    dark: true, accent: "#D4A843",
    grad: "linear-gradient(145deg,#0A1628 0%,#0F2040 55%,#162C52 100%)",
    pattern: `<circle cx="220" cy="10" r="100" fill="#D4A843" fill-opacity="0.07"/><circle cx="10" cy="150" r="65" fill="#D4A843" fill-opacity="0.05"/>`,
  },
  observador_essencial: {
    dark: false, accent: "#0D7A5F",
    grad: "linear-gradient(145deg,#ECFDF5 0%,#D1FAE5 60%,#A7F3D0 100%)",
    pattern: `<circle cx="200" cy="30" r="75" fill="#6EE7B7" fill-opacity="0.22"/><circle cx="30" cy="130" r="50" fill="#A7F3D0" fill-opacity="0.28"/>`,
  },
  observador_avancado: {
    dark: false, accent: "#065F46",
    grad: "linear-gradient(145deg,#F0FDF4 0%,#BBF7D0 55%,#86EFAC 100%)",
    pattern: `<circle cx="215" cy="20" r="85" fill="#4ADE80" fill-opacity="0.18"/><circle cx="20" cy="140" r="55" fill="#86EFAC" fill-opacity="0.22"/>`,
  },
  observador_intensivo: {
    dark: true, accent: "#D4A843",
    grad: "linear-gradient(145deg,#052E16 0%,#064E3B 55%,#065F46 100%)",
    pattern: `<circle cx="215" cy="20" r="90" fill="#D4A843" fill-opacity="0.06"/><circle cx="20" cy="145" r="60" fill="#6EE7B7" fill-opacity="0.04"/>`,
  },
  imersao: {
    dark: true, accent: "#D4A843",
    grad: "linear-gradient(145deg,#0A1628 0%,#14213D 50%,#1C2E4A 100%)",
    pattern: `<circle cx="200" cy="25" r="95" fill="#D4A843" fill-opacity="0.08"/><circle cx="25" cy="135" r="70" fill="#D4A843" fill-opacity="0.05"/>`,
  },
  vip_online: {
    dark: true, accent: "#60A5FA",
    grad: "linear-gradient(145deg,#0A1628 0%,#0F2040 50%,#162C52 100%)",
    pattern: `<circle cx="220" cy="15" r="110" fill="#60A5FA" fill-opacity="0.08"/><circle cx="15" cy="145" r="75" fill="#3B82F6" fill-opacity="0.06"/>`,
  },
  vip_presencial: {
    dark: true, accent: "#60A5FA",
    grad: "linear-gradient(145deg,#0B1A30 0%,#112240 50%,#19305A 100%)",
    pattern: `<circle cx="215" cy="20" r="100" fill="#60A5FA" fill-opacity="0.08"/><path d="M75 20 L130 105 L75 160 L20 105 Z" fill="#3B82F6" fill-opacity="0.04"/>`,
  },
  vip_completo: {
    dark: true, accent: "#93C5FD",
    grad: "linear-gradient(145deg,#060E1E 0%,#0C1A35 45%,#12244A 100%)",
    pattern: `<circle cx="220" cy="10" r="115" fill="#93C5FD" fill-opacity="0.1"/><circle cx="10" cy="150" r="80" fill="#60A5FA" fill-opacity="0.07"/><circle cx="125" cy="80" r="38" fill="#3B82F6" fill-opacity="0.04"/>`,
  },
};

// ─── Card de plano ─────────────────────────────────────────────────────────
function PlanCard({ plan, onAcessar, isLoading }: {
  plan: PlanData; onAcessar: (k: string) => void; isLoading: boolean;
}) {
  const theme = CARD_THEMES[plan.key] ?? CARD_THEMES["pacote_completo"];
  const { dark, accent, grad, pattern } = theme;
  const economia = plan.valorMercado ? Math.round((1 - plan.price / plan.valorMercado) * 100) : null;
  const tp  = dark ? "#fff"                   : "#111827";
  const ts  = dark ? "rgba(255,255,255,0.55)" : "#6B7280";
  const tt  = dark ? "rgba(255,255,255,0.32)" : "#9CA3AF";
  const div = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const chk = dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.05)";
  const bdg = dark ? "rgba(255,255,255,0.1)"  : "rgba(0,0,0,0.06)";
  const bdt = dark ? "rgba(255,255,255,0.7)"  : "#374151";

  return (
    <div
      className="relative flex flex-col rounded-[28px] overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{
        background: grad,
        boxShadow: dark
          ? "0 8px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)"
          : "0 4px 28px rgba(0,0,0,0.09), 0 0 0 1px rgba(0,0,0,0.06)",
      }}
    >
      {/* Badge */}
      {plan.highlight && (
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
          <span className="rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[11px] font-semibold tracking-wide"
            style={{ background: accent, color: dark ? "#0A0500" : "#fff" }}>
            {plan.highlight}
          </span>
        </div>
      )}

      {/* Padrão SVG de fundo */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 260 200"
        preserveAspectRatio="xMaxYMin slice" fill="none" dangerouslySetInnerHTML={{ __html: pattern }} />

      {/* Linha de acento */}
      <div className="h-[3px] w-full flex-shrink-0" style={{ background: accent }} />

      {/* Cabeçalho */}
      <div className="relative px-7 pt-6 pb-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5 pr-20 sm:pr-0" style={{ color: accent }}>
          {plan.group === "digital" ? "Online" : plan.group === "observador" ? "Observação Clínica" : plan.group === "horas" ? "Horas Clínicas" : "Mentoria VIP"}
        </p>
        <h3 className="text-xl font-bold leading-snug" style={{ color: tp }}>{plan.name}</h3>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: ts }}>{plan.description}</p>
      </div>

      {/* Preço */}
      <div className="relative px-7 pt-5 pb-0">
        {plan.valorMercado && (
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm line-through" style={{ color: tt }}>{formatBRL(plan.valorMercado)}</span>
            {economia && (
              <span className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                style={{ background: "rgba(34,197,94,0.14)", color: "#16A34A" }}>
                −{economia}%
              </span>
            )}
          </div>
        )}
        <span className="text-[32px] font-bold tabular-nums leading-none"
          style={{ color: plan.valorMercado ? accent : tp }}>
          {plan.priceFormatted}
        </span>
        <p className="text-xs mt-1" style={{ color: tt }}>
          {plan.installments12xFormatted ? `ou 12× de ${plan.installments12xFormatted}` : "à vista"}
        </p>
      </div>

      {/* Divider */}
      <div className="mx-7 mt-5 h-px" style={{ background: div }} />

      {/* Features */}
      <ul className="relative flex-1 px-7 pt-4 pb-0 space-y-2.5">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-3">
            <div className="mt-[2px] h-[18px] w-[18px] shrink-0 rounded-full flex items-center justify-center"
              style={{ background: chk }}>
              <Check className="h-[10px] w-[10px]" style={{ color: accent }} />
            </div>
            <span className="text-[13px] leading-snug" style={{ color: ts }}>{f}</span>
          </li>
        ))}
      </ul>

      {/* Badges */}
      {(plan.clinicalHours > 0 || plan.practiceHours > 0 || plan.hasMentorship || plan.hasLiveEvents) && (
        <div className="relative px-7 pt-4 pb-0 flex flex-wrap gap-1.5">
          {plan.clinicalHours > 0 && <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: bdg, color: bdt }}>{plan.clinicalHours}h observação</span>}
          {plan.practiceHours > 0 && <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: bdg, color: bdt }}>{plan.practiceHours}h prática</span>}
          {plan.hasMentorship   && <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: bdg, color: bdt }}>Mentoria individual</span>}
          {plan.hasLiveEvents   && <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: bdg, color: bdt }}>Encontros ao vivo</span>}
        </div>
      )}

      {/* CTA */}
      <div className="relative px-7 pt-5 pb-7">
        <button
          onClick={() => onAcessar(plan.key)}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all duration-200 disabled:opacity-50"
          style={{ background: accent, color: dark ? "#0A0500" : "#fff", boxShadow: `0 4px 20px ${accent}45` }}
        >
          {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Aguarde...</>
            : <>Acessar agora <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
    </div>
  );
}

// ─── Card compacto módulo avulso ───────────────────────────────────────────
function ModuloAvulsoCard({ plan, onAcessar, isLoading }: {
  plan: PlanData; onAcessar: (k: string) => void; isLoading: boolean;
}) {
  return (
    <div
      className="relative flex flex-col sm:flex-row items-center gap-6 rounded-[28px] p-7 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
      style={{
        background: "linear-gradient(145deg,#EBF4FF 0%,#DBEAFE 60%,#BFDBFE 100%)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)",
      }}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60" viewBox="0 0 500 120" fill="none" preserveAspectRatio="xMaxYMin slice">
        <circle cx="460" cy="20" r="90" fill="#93C5FD" fillOpacity="0.2"/>
        <circle cx="20" cy="100" r="55" fill="#BFDBFE" fillOpacity="0.25"/>
      </svg>
      <div className="relative shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(26,86,164,0.12)" }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="3" y="6" width="22" height="14" rx="2.5" stroke="#1A56A4" strokeWidth="1.6"/>
          <path d="M9.5 20l1.5-2.5h6l1.5 2.5" stroke="#1A56A4" strokeWidth="1.6" strokeLinecap="round"/>
          <circle cx="14" cy="13" r="3" stroke="#1A56A4" strokeWidth="1.4"/>
        </svg>
      </div>
      <div className="relative flex-1 text-center sm:text-left">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1A56A4] mb-0.5">Módulo Avulso</p>
        <h3 className="text-base font-bold text-gray-900">Escolha 1 módulo</h3>
        <p className="text-sm text-gray-500 mt-0.5 leading-snug">{plan.description}</p>
      </div>
      <div className="relative shrink-0 flex flex-col items-center sm:items-end gap-3">
        <div>
          <div className="text-2xl font-bold text-gray-900 tabular-nums">{plan.priceFormatted}</div>
          <p className="text-xs text-gray-400 text-center sm:text-right">acesso por 1 ano</p>
        </div>
        <button
          onClick={() => onAcessar(plan.key)} disabled={isLoading}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50"
          style={{ background: "#1A56A4", boxShadow: "0 4px 16px rgba(26,86,164,0.28)" }}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Acessar agora <ArrowRight className="h-3.5 w-3.5" /></>}
        </button>
      </div>
    </div>
  );
}

// ─── Rótulo de seção ───────────────────────────────────────────────────────
function SectionLabel({ eyebrow, title, sub, color }: { eyebrow: string; title: string; sub: string; color?: string }) {
  const c = color || "#D4A843";
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-px w-6" style={{ background: c }} />
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: c }}>{eyebrow}</p>
      </div>
      <h2 className="text-2xl sm:text-[28px] font-bold text-gray-900 leading-tight">{title}</h2>
      <p className="mt-1.5 text-sm text-gray-500 max-w-lg leading-relaxed">{sub}</p>
    </div>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────
export default function PlanosPublicos() {
  const [activeTab, setActiveTab] = useState<Tab>("online");
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sectionRefs = {
    online:     useRef<HTMLDivElement>(null),
    observacao: useRef<HTMLDivElement>(null),
    mentoria:   useRef<HTMLDivElement>(null),
  };

  const urlParams = new URLSearchParams(window.location.search);
  const urlRef = urlParams.get("ref") || "";

  // Estado do codigo de convite
  const [couponCode, setCouponCode] = useState(urlRef);
  const [couponInput, setCouponInput] = useState(urlRef);
  const [couponValid, setCouponValid] = useState<boolean | null>(urlRef ? null : null);
  const [couponReferrer, setCouponReferrer] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  // Validar codigo de convite
  const validateCoupon = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      setCouponCode("");
      setCouponValid(null);
      setCouponReferrer("");
      return;
    }
    setCouponLoading(true);
    try {
      const res = await fetch(`/api/referral/validate?code=${encodeURIComponent(trimmed)}`);
      const json = await res.json();
      if (json.valid) {
        setCouponCode(trimmed);
        setCouponValid(true);
        setCouponReferrer(json.referrerName || "");
      } else {
        setCouponCode("");
        setCouponValid(false);
        setCouponReferrer("");
      }
    } catch {
      setCouponValid(false);
      setCouponReferrer("");
    } finally {
      setCouponLoading(false);
    }
  }, []);

  // Validar automaticamente se veio pela URL
  useEffect(() => {
    if (urlRef) validateCoupon(urlRef);
  }, [urlRef, validateCoupon]);

  const { data, isLoading } = useQuery<{ plans: PlanData[] }>({ queryKey: ["/api/stripe/plans"] });

  const checkoutMutation = useMutation({
    mutationFn: async (planKey: string) => {
      const res = await fetch("/api/stripe/public-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey, referralCode: couponCode || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erro");
      return json;
    },
    onSuccess: (res) => { if (res.url) window.location.href = res.url; },
    onError: () => { setLoadingKey(null); alert("Erro ao gerar link. Tente novamente."); },
  });

  const handleAcessar = (k: string) => { setLoadingKey(k); checkoutMutation.mutate(k); };

  // Scroll listener → ativa glass no header
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Click no tab → scroll suave até seção
  const HEADER_H = 72; // altura do header fixo
  const scrollTo = (tab: Tab) => {
    setActiveTab(tab);
    const el = sectionRefs[tab].current;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - HEADER_H - 24;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  // Intersection observer → atualiza tab ativa ao rolar
  useEffect(() => {
    if (!data) return;
    const obs: IntersectionObserver[] = [];
    (["online", "observacao", "mentoria"] as Tab[]).forEach((key) => {
      const el = sectionRefs[key].current;
      if (!el) return;
      const o = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActiveTab(key); },
        { rootMargin: "-25% 0px -65% 0px" }
      );
      o.observe(el);
      obs.push(o);
    });
    return () => obs.forEach((o) => o.disconnect());
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#F8F7F4" }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0A1628] border-t-transparent" />
      </div>
    );
  }

  const plans       = data?.plans || [];
  const digital     = plans.filter((p) => p.group === "digital");
  const observador  = plans.filter((p) => p.group === "observador");
  const vip         = plans.filter((p) => p.group === "vip");
  const avulso      = digital.find((p) => p.key === "modulo_avulso");
  const digResto    = digital.filter((p) => p.key !== "modulo_avulso");

  // ── Definição dos tabs ─────────────────────────────────────────────────
  const TABS: { key: Tab; label: string; desc: string }[] = [
    { key: "online",     label: "Online",                desc: "Aulas gravadas no seu ritmo" },
    { key: "observacao", label: "Com Observação Clínica", desc: "Presencial com o Dr. Gustavo" },
    { key: "mentoria",   label: "Mentoria VIP",           desc: "Acompanhamento individual" },
  ];

  return (
    <div style={{ background: "#F8F7F4", fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',sans-serif" }}>

      {/* ══════════════════════════════════════════════════════
          HEADER FIXO
      ══════════════════════════════════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          height: `${HEADER_H}px`,
          background: scrolled ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.98)",
          backdropFilter: scrolled ? "blur(24px) saturate(1.8)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(24px) saturate(1.8)" : "none",
          borderBottom: `1px solid ${scrolled ? "rgba(0,0,0,0.09)" : "rgba(0,0,0,0.06)"}`,
          boxShadow: scrolled ? "0 1px 24px rgba(0,0,0,0.06)" : "none",
        }}
      >
        <div className="mx-auto max-w-7xl h-full px-5 sm:px-8 flex items-center gap-6">

          {/* Voltar */}
          <a
            href="/#/"
            className="flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-700 transition-colors shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar</span>
          </a>

          {/* Logo */}
          <a href="/#/comecar" className="shrink-0 flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="" className="h-10 w-10 object-contain" />
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8B7A55]">Portal de Aulas</span>
              <span className="text-[15px] font-bold uppercase tracking-[0.06em] text-gray-900 leading-tight">Ampla Facial</span>
              <span className="text-[9px] text-[#8B7A55] tracking-wide">Dr. Gustavo Martins</span>
            </div>
          </a>

          {/* Separador */}
          <div className="hidden md:block h-5 w-px bg-gray-200 shrink-0" />

          {/* Tabs — desktop only */}
          <nav className="hidden md:flex items-center gap-3 flex-1 justify-center">
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              const isVip  = tab.key === "mentoria";
              return (
                <button
                  key={tab.key}
                  onClick={() => scrollTo(tab.key)}
                  className="relative flex flex-col items-start rounded-2xl px-6 py-2 transition-all duration-200 group"
                  style={{
                    background: active
                      ? isVip ? "#0C1A35" : "#0A1628"
                      : "transparent",
                    minWidth: 0,
                  }}
                >
                  {isVip && !active && (
                    <span
                      className="absolute -top-2 -right-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                      style={{ background: "#3B82F6", color: "#fff", lineHeight: 1.6 }}
                    >
                      VIP
                    </span>
                  )}
                  <span
                    className="text-[13px] font-semibold leading-none whitespace-nowrap transition-colors duration-200"
                    style={{ color: active ? "#fff" : "#374151" }}
                  >
                    {tab.label}
                  </span>
                  <span
                    className="text-[11px] leading-none mt-0.5 whitespace-nowrap transition-colors duration-200"
                    style={{ color: active ? (isVip ? "rgba(212,168,67,0.7)" : "rgba(255,255,255,0.55)") : "#9CA3AF" }}
                  >
                    {tab.desc}
                  </span>
                  {active && (
                    <span
                      className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full"
                      style={{ background: isVip ? "#60A5FA" : "transparent" }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Spacer no mobile */}
          <div className="flex-1 md:hidden" />

          {/* Login — desktop */}
          <a
            href="/#/"
            className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-all shrink-0"
          >
            Entrar
          </a>

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 shrink-0"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menu"
          >
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
              <path d="M0 0h18M0 6h18M0 12h18" stroke="#1a1a1a" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile menu overlay — estilo Apple */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-white animate-in fade-in duration-200">
          <div className="flex justify-end p-5">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-10 h-10 flex items-center justify-center"
              aria-label="Fechar menu"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M1 1l16 16M17 1L1 17" stroke="#1a1a1a" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
          <nav className="px-8 pt-4 space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setMobileMenuOpen(false);
                  setTimeout(() => scrollTo(tab.key), 100);
                }}
                className="block w-full text-left py-3 border-b border-gray-100"
              >
                <span className="text-[22px] font-semibold text-gray-900">{tab.label}</span>
              </button>
            ))}
            <a
              href="/#/"
              className="block w-full text-left py-3 border-b border-gray-100"
            >
              <span className="text-[22px] font-semibold text-gray-900">Entrar</span>
            </a>
          </nav>
        </div>
      )}

      {/* Espaço do header fixo */}
      <div style={{ height: `${HEADER_H}px` }} />

      {/* ══════════════════════════════════════════════════════
          HERO — alinhado com o conteúdo, sem logo
      ══════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14 sm:py-20 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-8">

          {/* Texto principal */}
          <div className="max-w-xl">
            {/* Campo de codigo de convite */}
            <div className="mb-5">
              {couponValid === true ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-1.5 text-xs font-semibold text-emerald-700">
                  <Gift className="h-3.5 w-3.5" />
                  10% de desconto ativo{couponReferrer ? ` (indicacao de ${couponReferrer})` : ""}
                  <button
                    onClick={() => { setCouponCode(""); setCouponInput(""); setCouponValid(null); setCouponReferrer(""); }}
                    className="ml-1 hover:text-emerald-900 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        if (couponValid === false) setCouponValid(null);
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") validateCoupon(couponInput); }}
                      placeholder="Codigo de convite"
                      className="pl-9 pr-3 py-2 rounded-xl border text-sm w-52 outline-none transition-all"
                      style={{
                        borderColor: couponValid === false ? "#FCA5A5" : "#E5E7EB",
                        background: couponValid === false ? "#FEF2F2" : "#fff",
                      }}
                    />
                  </div>
                  <button
                    onClick={() => validateCoupon(couponInput)}
                    disabled={!couponInput.trim() || couponLoading}
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                    style={{ background: "#0A1628", color: "#fff" }}
                  >
                    {couponLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : "Aplicar"}
                  </button>
                  {couponValid === false && (
                    <span className="text-xs text-red-500">Codigo invalido</span>
                  )}
                </div>
              )}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-bold tracking-tight text-gray-900 leading-[1.07]">
              <span className="whitespace-nowrap">Aprenda Harmonização Facial</span><br />
              <span style={{ color: "#D4A843" }}>do jeito certo.</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-gray-500 leading-relaxed max-w-lg">
              Cursos clínicos do Dr. Gustavo Martins — da teoria à prática, com acesso imediato após o pagamento.
            </p>
          </div>

          {/* Trust badges — lado direito */}
          <div className="flex flex-col gap-3 shrink-0">
            {[
              { icon: Shield, text: "Pagamento seguro via Stripe" },
              { icon: Star,   text: "Acesso vitalício ao conteúdo" },
              { icon: Check,  text: "Upgrade com crédito garantido" },
            ].map(({ icon: Ic, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-[13px] text-gray-400">
                <div className="h-6 w-6 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                  <Ic className="h-3 w-3 text-gray-400" />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          CONTEÚDO
      ══════════════════════════════════════════════════════ */}
      <main className="mx-auto max-w-7xl px-5 sm:px-8 pb-24">

        {/* ── SEÇÃO ONLINE ───────────────────────────────────── */}
        <div ref={sectionRefs.online} className="pt-16">
          <SectionLabel
            eyebrow="Online"
            title="Estude no seu ritmo"
            sub="Aulas gravadas com protocolo clínico completo, materiais científicos e certificado incluídos."
          />

          {/* Módulo avulso */}
          {avulso && (
            <div className="mb-5">
              <ModuloAvulsoCard plan={avulso} onAcessar={handleAcessar}
                isLoading={checkoutMutation.isPending && loadingKey === avulso.key} />
            </div>
          )}

          {/* Chips dos módulos */}
          <div className="flex flex-wrap gap-2 mb-8">
            {[
              { label: "Toxina Botulínica",           color: "#1A56A4" },
              { label: "Preenchedores Faciais",        color: "#9B1C1C" },
              { label: "Bioestimuladores de Colágeno", color: "#065F46" },
              { label: "Biorregeneradores",            color: "#92400E" },
              { label: "Método NaturalUp®",            color: "#5521B5" },
            ].map(({ label, color }) => (
              <span key={label} className="rounded-full px-3.5 py-1.5 text-xs font-medium border"
                style={{ borderColor: color + "28", color, background: color + "0B" }}>
                {label}
              </span>
            ))}
            <span className="rounded-full px-3.5 py-1.5 text-xs text-gray-400 border border-gray-200 bg-white">
              todos inclusos no Curso Completo →
            </span>
          </div>

          {/* Cards digitais */}
          {digResto.length > 0 && (
            <div className={`grid gap-5 mx-auto ${digResto.length === 1 ? "max-w-sm" : "grid-cols-1 sm:grid-cols-2 max-w-3xl"}`}>
              {digResto.map((p) => (
                <PlanCard key={p.key} plan={p} onAcessar={handleAcessar}
                  isLoading={checkoutMutation.isPending && loadingKey === p.key} />
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="my-16 h-px bg-gray-200" />

        {/* ── SEÇÃO OBSERVAÇÃO CLÍNICA ───────────────────────── */}
        <div ref={sectionRefs.observacao}>
          <SectionLabel
            eyebrow="Presencial"
            title="Com Observação Clínica"
            sub="Acompanhe atendimentos reais do Dr. Gustavo. Teoria e prática no mesmo programa."
          />
          {/* Primeiros cards em grid */}
          {observador.length > 3 ? (
            <>
              <div className="grid gap-5 mx-auto grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl">
                {observador.slice(0, 3).map((p) => (
                  <PlanCard key={p.key} plan={p} onAcessar={handleAcessar}
                    isLoading={checkoutMutation.isPending && loadingKey === p.key} />
                ))}
              </div>
              {/* Último card (Imersão) centralizado */}
              <div className="mt-5 max-w-sm mx-auto">
                {observador.slice(3).map((p) => (
                  <PlanCard key={p.key} plan={p} onAcessar={handleAcessar}
                    isLoading={checkoutMutation.isPending && loadingKey === p.key} />
                ))}
              </div>
            </>
          ) : (
            <div className={`grid gap-5 mx-auto ${
              observador.length <= 2 ? "grid-cols-1 sm:grid-cols-2 max-w-3xl"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
              {observador.map((p) => (
                <PlanCard key={p.key} plan={p} onAcessar={handleAcessar}
                  isLoading={checkoutMutation.isPending && loadingKey === p.key} />
              ))}
            </div>
          )}
        </div>

        {/* Divider especial antes da seção VIP */}
        <div className="my-16 flex items-center gap-5">
          <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-blue-400/30" />
          <div className="flex items-center gap-2 shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1l1.5 3.5L12 5 9.5 7.5 10 11l-3-1.5L4 11l.5-3.5L2 5l3.5-.5z" fill="#60A5FA"/>
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-400">Formação exclusiva</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1l1.5 3.5L12 5 9.5 7.5 10 11l-3-1.5L4 11l.5-3.5L2 5l3.5-.5z" fill="#60A5FA"/>
            </svg>
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-gray-200 to-blue-400/30" />
        </div>

        {/* ── SEÇÃO MENTORIA VIP — com destaque ─────────────── */}
        <div ref={sectionRefs.mentoria}>

          {/* Banner de destaque VIP */}
          <div
            className="relative rounded-[32px] overflow-hidden mb-10 px-8 sm:px-12 py-10"
            style={{
              background: "linear-gradient(130deg, #060E1E 0%, #0C1A35 45%, #12244A 100%)",
              boxShadow: "0 8px 56px rgba(59,130,246,0.15), 0 0 0 1px rgba(96,165,250,0.10)",
            }}
          >
            {/* SVG decorativo fundo */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 900 200" fill="none" preserveAspectRatio="xMaxYMin slice">
              <circle cx="820" cy="20" r="160" fill="#60A5FA" fillOpacity="0.06"/>
              <circle cx="20" cy="180" r="110" fill="#3B82F6" fillOpacity="0.04"/>
              <circle cx="500" cy="100" r="60" fill="#93C5FD" fillOpacity="0.03"/>
            </svg>

            {/* Conteúdo do banner */}
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                {/* Coroa SVG */}
                <div className="flex items-center gap-3 mb-3">
                  <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
                    <path d="M2 16h20V18H2zM2 16L4 8l4 5 4-8 4 8 4-5 2 8z" fill="#60A5FA"/>
                    <circle cx="4" cy="7" r="2" fill="#60A5FA"/>
                    <circle cx="12" cy="4" r="2" fill="#60A5FA"/>
                    <circle cx="20" cy="7" r="2" fill="#60A5FA"/>
                  </svg>
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#93C5FD]">Mentoria VIP</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                  Acompanhamento individual<br />com o Dr. Gustavo
                </h2>
                <p className="mt-2 text-blue-300/60 text-sm max-w-md leading-relaxed">
                  Mentoria exclusiva com o Dr. Gustavo, canal direto, encontros ao vivo e suporte contínuo. Cada plano com sua carga horária. Vagas limitadas por turma.
                </p>
              </div>
              <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                {["Canal direto exclusivo", "Encontros ao vivo quinzenais", "Suporte por 6 meses", "Vagas limitadas por turma"].map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full flex items-center justify-center" style={{ background: "rgba(96,165,250,0.15)" }}>
                      <Check className="h-2.5 w-2.5 text-blue-400" />
                    </div>
                    <span className="text-[12px] text-blue-300/75 whitespace-nowrap">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cards VIP */}
          {vip.length > 3 ? (
            <>
              <div className="grid gap-5 mx-auto grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl">
                {vip.slice(0, 3).map((p) => (
                  <PlanCard key={p.key} plan={p} onAcessar={handleAcessar}
                    isLoading={checkoutMutation.isPending && loadingKey === p.key} />
                ))}
              </div>
              <div className="mt-5 max-w-sm mx-auto">
                {vip.slice(3).map((p) => (
                  <PlanCard key={p.key} plan={p} onAcessar={handleAcessar}
                    isLoading={checkoutMutation.isPending && loadingKey === p.key} />
                ))}
              </div>
            </>
          ) : (
            <div className={`grid gap-5 mx-auto ${
              vip.length === 1 ? "max-w-sm" :
              vip.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-3xl" :
              "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
              {vip.map((p) => (
                <PlanCard key={p.key} plan={p} onAcessar={handleAcessar}
                  isLoading={checkoutMutation.isPending && loadingKey === p.key} />
              ))}
            </div>
          )}
        </div>

        {/* ── HORAS CLINICAS EXTRAS ──────────────────────────── */}
        <div className="my-16 h-px bg-gray-200" />

        <div>
          <SectionLabel
            eyebrow="Add-on"
            title="Horas Clinicas Extras"
            sub="Pacotes de encontros clinicos presenciais para aprofundar a pratica. Exclusivo para alunos com mentoria VIP ativa."
            color="#0D7A5F"
          />

          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 flex items-start gap-3">
            <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-amber-700">Exclusivo para alunos com mentoria VIP ativa. Para adquirir, acesse a area de planos apos o login.</p>
          </div>

          <div className="grid gap-5 grid-cols-1 sm:grid-cols-3 max-w-4xl mx-auto">
            {[
              {
                title: "1 Encontro Clinico",
                hours: "4h",
                price: "R$ 1.000",
                features: ["1 sessao de 4 horas", "Observacao de atendimentos reais", "Suporte tecnico durante o encontro", "Certificado de participacao"],
              },
              {
                title: "2 Encontros Clinicos",
                hours: "8h",
                price: "R$ 1.800",
                highlight: "Mais escolhido",
                features: ["2 sessoes de 4 horas cada", "Observacao de atendimentos reais", "Suporte tecnico durante os encontros", "Certificado de participacao", "10% de economia vs avulso"],
              },
              {
                title: "3 Encontros Clinicos",
                hours: "12h",
                price: "R$ 2.400",
                features: ["3 sessoes de 4 horas cada", "Observacao de atendimentos reais", "Suporte tecnico durante os encontros", "Certificado de participacao", "20% de economia vs avulso"],
              },
            ].map((pkg) => (
              <div
                key={pkg.title}
                className="relative flex flex-col rounded-[28px] overflow-hidden"
                style={{
                  background: "linear-gradient(145deg,#ECFDF5 0%,#D1FAE5 60%,#A7F3D0 100%)",
                  boxShadow: "0 4px 28px rgba(0,0,0,0.09), 0 0 0 1px rgba(0,0,0,0.06)",
                }}
              >
                {pkg.highlight && (
                  <div className="absolute top-3 right-3 z-10">
                    <span className="rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide" style={{ background: "#0D7A5F", color: "#fff" }}>
                      {pkg.highlight}
                    </span>
                  </div>
                )}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 260 200" preserveAspectRatio="xMaxYMin slice" fill="none">
                  <circle cx="200" cy="30" r="75" fill="#6EE7B7" fillOpacity="0.22"/>
                  <circle cx="30" cy="130" r="50" fill="#A7F3D0" fillOpacity="0.28"/>
                </svg>
                <div className="h-[3px] w-full flex-shrink-0" style={{ background: "#0D7A5F" }} />
                <div className="relative px-7 pt-6 pb-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: "#0D7A5F" }}>Horas Clinicas</p>
                  <h3 className="text-xl font-bold leading-snug text-gray-900">{pkg.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{pkg.hours} de observacao clinica presencial</p>
                </div>
                <div className="relative px-7 pt-5 pb-0">
                  <span className="text-[32px] font-bold tabular-nums leading-none" style={{ color: "#0D7A5F" }}>{pkg.price}</span>
                  <p className="text-xs mt-1 text-gray-400">a vista</p>
                </div>
                <div className="mx-7 mt-5 h-px bg-black/[0.07]" />
                <ul className="relative flex-1 px-7 pt-4 pb-7 space-y-2.5">
                  {pkg.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-[2px] h-[18px] w-[18px] shrink-0 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.05)" }}>
                        <Check className="h-[10px] w-[10px]" style={{ color: "#0D7A5F" }} />
                      </div>
                      <span className="text-[13px] leading-snug text-gray-500">{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="relative px-7 pb-7">
                  <div className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white" style={{ background: "#0D7A5F", opacity: 0.7 }}>
                    Disponivel apos login
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RODAPÉ ─────────────────────────────────────────── */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-3xl bg-white p-7 ring-1 ring-gray-100">
            <Star className="h-4 w-4 text-[#D4A843] mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1.5">Upgrade com cashback integral</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Em até 60 dias, 100% do valor pago vira cashback para o próximo plano. Após 60 dias, 70%. Você paga apenas a diferença.
            </p>
          </div>
          <div className="rounded-3xl bg-white p-7 ring-1 ring-gray-100">
            <Gift className="h-4 w-4 text-[#D4A843] mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1.5">Indique e ganhe R$1.000</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Alunos matriculados recebem código único. Quando o indicado fechar qualquer plano, você ganha R$1.000 em crédito.
            </p>
          </div>
        </div>

        {/* Depoimentos */}
        <section className="py-16 px-4 sm:px-6 max-w-5xl mx-auto">
          <h2 className="text-center font-serif text-3xl font-semibold text-[#1a1a1a] mb-2">O que dizem nossos alunos</h2>
          <p className="text-center text-sm text-gray-500 mb-10">Profissionais que transformaram sua pratica clinica</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { name: "Dra. Carolina O.", role: "Dentista - RJ", text: "A mentoria do Dr. Gustavo mudou completamente minha forma de atender. Os protocolos do Metodo NaturalUp sao incriveis, resultados muito mais naturais." },
              { name: "Dr. Felipe P.", role: "Dentista - RJ", text: "O conteudo e extremamente pratico. Ja no primeiro mes consegui aplicar as tecnicas com meus pacientes. O suporte e diferenciado." },
              { name: "Dra. Glaucia A.", role: "Biomedicina Estetica - RJ", text: "Ter acesso as aulas e aos encontros ao vivo faz toda a diferenca. A comunidade de alunos tambem agrega muito na troca de experiencias." },
            ].map((t, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} className="w-4 h-4 text-[#D4A843]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">"{t.text}"</p>
                <div>
                  <p className="text-sm font-semibold text-[#1a1a1a]">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Link de login mobile */}
        <div className="mt-8 text-center sm:hidden">
          <a href="/#/" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            Ja tenho conta - entrar
          </a>
        </div>

      </main>
    </div>
  );
}
