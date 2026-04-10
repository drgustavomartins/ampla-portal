import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, ArrowRight, Loader2, ChevronLeft, Gift, Star, Shield } from "lucide-react";

interface PlanData {
  key: string;
  name: string;
  description: string;
  group: "digital" | "observador" | "vip";
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

const TABS: { key: Tab; label: string; sub: string }[] = [
  { key: "online",     label: "Online",               sub: "Estude no seu ritmo" },
  { key: "observacao", label: "Com Observação Clínica", sub: "Acompanhe atendimentos reais" },
  { key: "mentoria",   label: "Mentoria VIP",          sub: "Acompanhamento individual" },
];

function formatBRL(c: number) {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Visual assets premium por plano ─────────────────────────────────────────
// Cada card usa um gradiente editorial diferente + padrão geométrico em SVG

const CARD_THEMES: Record<string, { grad: string; accent: string; pattern: string; dark: boolean }> = {
  modulo_avulso: {
    dark: false,
    accent: "#1A56A4",
    grad: "linear-gradient(135deg, #EBF4FF 0%, #DBEAFE 60%, #BFDBFE 100%)",
    pattern: `<svg width="260" height="160" viewBox="0 0 260 160" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="210" cy="30" r="80" fill="#93C5FD" fill-opacity="0.25"/><circle cx="30" cy="130" r="50" fill="#BFDBFE" fill-opacity="0.3"/><line x1="0" y1="80" x2="260" y2="80" stroke="#93C5FD" stroke-opacity="0.2" stroke-width="0.5"/><line x1="130" y1="0" x2="130" y2="160" stroke="#93C5FD" stroke-opacity="0.2" stroke-width="0.5"/></svg>`,
  },
  pacote_completo: {
    dark: true,
    accent: "#D4A843",
    grad: "linear-gradient(135deg, #0A1628 0%, #0F2040 60%, #162C52 100%)",
    pattern: `<svg width="260" height="160" viewBox="0 0 260 160" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="220" cy="20" r="90" fill="#D4A843" fill-opacity="0.08"/><circle cx="20" cy="140" r="60" fill="#D4A843" fill-opacity="0.06"/><path d="M0 0 L260 160" stroke="#D4A843" stroke-opacity="0.07" stroke-width="0.5"/><path d="M260 0 L0 160" stroke="#D4A843" stroke-opacity="0.07" stroke-width="0.5"/></svg>`,
  },
  observador_essencial: {
    dark: false,
    accent: "#0D7A5F",
    grad: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 60%, #A7F3D0 100%)",
    pattern: `<svg width="260" height="160" viewBox="0 0 260 160" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="200" cy="40" r="70" fill="#6EE7B7" fill-opacity="0.25"/><circle cx="40" cy="120" r="45" fill="#A7F3D0" fill-opacity="0.3"/></svg>`,
  },
  observador_avancado: {
    dark: false,
    accent: "#065F46",
    grad: "linear-gradient(135deg, #F0FDF4 0%, #BBF7D0 60%, #86EFAC 100%)",
    pattern: `<svg width="260" height="160" viewBox="0 0 260 160" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="220" cy="25" r="80" fill="#4ADE80" fill-opacity="0.2"/><circle cx="25" cy="135" r="55" fill="#86EFAC" fill-opacity="0.25"/></svg>`,
  },
  observador_intensivo: {
    dark: true,
    accent: "#D4A843",
    grad: "linear-gradient(135deg, #052E16 0%, #064E3B 60%, #065F46 100%)",
    pattern: `<svg width="260" height="160" viewBox="0 0 260 160" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="215" cy="25" r="85" fill="#D4A843" fill-opacity="0.07"/><circle cx="20" cy="140" r="60" fill="#D4A843" fill-opacity="0.05"/><path d="M0 0 L260 160" stroke="#6EE7B7" stroke-opacity="0.08" stroke-width="0.5"/></svg>`,
  },
  imersao: {
    dark: true,
    accent: "#D4A843",
    grad: "linear-gradient(135deg, #0A1628 0%, #14213D 50%, #1C2E4A 100%)",
    pattern: `<svg width="260" height="160" viewBox="0 0 260 160" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="200" cy="30" r="90" fill="#D4A843" fill-opacity="0.09"/><circle cx="30" cy="130" r="65" fill="#D4A843" fill-opacity="0.06"/><circle cx="130" cy="80" r="30" fill="#D4A843" fill-opacity="0.05"/></svg>`,
  },
  vip_online: {
    dark: true,
    accent: "#D4A843",
    grad: "linear-gradient(135deg, #1C0F00 0%, #2D1A00 50%, #3D2400 100%)",
    pattern: `<svg width="260" height="160" viewBox="0 0 260 160" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="220" cy="20" r="100" fill="#D4A843" fill-opacity="0.1"/><circle cx="20" cy="140" r="70" fill="#D4A843" fill-opacity="0.07"/><path d="M110 10 L150 80 L110 150 L70 80 Z" fill="#D4A843" fill-opacity="0.04"/></svg>`,
  },
  vip_presencial: {
    dark: true,
    accent: "#D4A843",
    grad: "linear-gradient(135deg, #0F0A00 0%, #231500 50%, #2D1C00 100%)",
    pattern: `<svg width="260" height="160" viewBox="0 0 260 160" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="220" cy="25" r="95" fill="#D4A843" fill-opacity="0.1"/><path d="M80 20 L130 100 L80 160 L30 100 Z" fill="#D4A843" fill-opacity="0.05"/></svg>`,
  },
  vip_completo: {
    dark: true,
    accent: "#D4A843",
    grad: "linear-gradient(135deg, #0A0500 0%, #1A0E00 50%, #251500 100%)",
    pattern: `<svg width="260" height="160" viewBox="0 0 260 160" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="220" cy="20" r="110" fill="#D4A843" fill-opacity="0.12"/><circle cx="20" cy="140" r="75" fill="#D4A843" fill-opacity="0.08"/><circle cx="130" cy="80" r="40" fill="#D4A843" fill-opacity="0.06"/><path d="M95 15 L145 80 L95 145 L45 80 Z" fill="#D4A843" fill-opacity="0.05"/></svg>`,
  },
};

// ─── Ícone minimalista de categoria ──────────────────────────────────────────
function IconOnline() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="4" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M7 15l1-1.5h4l1 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M6 18h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="10" cy="9.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}
function IconObservacao() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 4C6.134 4 3 7 3 10s3.134 6 7 6 7-3 7-6-3.134-6-7-6z" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M3 10h2M15 10h2M10 3v2M10 15v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
function IconMentoria() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M3 17c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M14 8l1.5 1.5L18 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Card principal ───────────────────────────────────────────────────────────
function PlanCard({
  plan,
  onAcessar,
  isLoading,
}: {
  plan: PlanData;
  onAcessar: (key: string) => void;
  isLoading: boolean;
}) {
  const theme = CARD_THEMES[plan.key] ?? CARD_THEMES["pacote_completo"];
  const { dark, accent, grad, pattern } = theme;

  const economia = plan.valorMercado
    ? Math.round((1 - plan.price / plan.valorMercado) * 100)
    : null;

  const textPrimary   = dark ? "#FFFFFF" : "#111827";
  const textSecondary = dark ? "rgba(255,255,255,0.55)" : "#6B7280";
  const textTertiary  = dark ? "rgba(255,255,255,0.35)" : "#9CA3AF";
  const dividerColor  = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const checkBg       = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const badgeBg       = dark ? "rgba(255,255,255,0.1)"  : "rgba(0,0,0,0.06)";
  const badgeText     = dark ? "rgba(255,255,255,0.75)" : "#374151";

  return (
    <div
      className="relative flex flex-col rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{
        background: grad,
        boxShadow: dark
          ? "0 4px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)"
          : "0 4px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)",
      }}
    >
      {/* Badge */}
      {plan.highlight && (
        <div className="absolute top-4 right-4 z-10">
          <span
            className="rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide"
            style={{ background: accent, color: dark ? "#0A1628" : "#fff" }}
          >
            {plan.highlight}
          </span>
        </div>
      )}

      {/* Padrão geométrico */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: 1 }}
        dangerouslySetInnerHTML={{ __html: `<svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 260 160" preserveAspectRatio="xMaxYMin slice" fill="none" xmlns="http://www.w3.org/2000/svg">${pattern.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</svg>` }}
      />

      {/* Linha de acento topo */}
      <div className="h-0.5 w-full" style={{ background: accent, opacity: 0.7 }} />

      {/* Header da card */}
      <div className="relative px-7 pt-6 pb-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: accent }}>
          {plan.group === "digital" ? "Online" : plan.group === "observador" ? "Observação Clínica" : "Mentoria VIP"}
        </p>
        <h3 className="mt-1 text-xl font-bold leading-snug" style={{ color: textPrimary }}>
          {plan.name}
        </h3>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: textSecondary }}>
          {plan.description}
        </p>
      </div>

      {/* Preço */}
      <div className="relative px-7 pt-5 pb-0">
        {plan.valorMercado && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm line-through" style={{ color: textTertiary }}>
              {formatBRL(plan.valorMercado)}
            </span>
            {economia && (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                style={{ background: "rgba(34,197,94,0.15)", color: "#16A34A" }}
              >
                −{economia}%
              </span>
            )}
          </div>
        )}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums" style={{ color: plan.valorMercado ? accent : textPrimary }}>
            {plan.priceFormatted}
          </span>
        </div>
        {plan.installments12xFormatted ? (
          <p className="text-xs mt-0.5" style={{ color: textTertiary }}>
            ou 12× de {plan.installments12xFormatted} sem juros
          </p>
        ) : (
          <p className="text-xs mt-0.5" style={{ color: textTertiary }}>à vista</p>
        )}
      </div>

      {/* Divider */}
      <div className="mx-7 mt-5 mb-0 h-px" style={{ background: dividerColor }} />

      {/* Features */}
      <ul className="relative flex-1 px-7 pt-5 pb-0 space-y-2.5">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-3">
            <div
              className="mt-0.5 h-4 w-4 shrink-0 rounded-full flex items-center justify-center"
              style={{ background: checkBg }}
            >
              <Check className="h-2.5 w-2.5" style={{ color: accent }} />
            </div>
            <span className="text-sm leading-snug" style={{ color: textSecondary }}>
              {f}
            </span>
          </li>
        ))}
      </ul>

      {/* Badges */}
      <div className="relative px-7 pt-4 pb-0 flex flex-wrap gap-1.5">
        {plan.clinicalHours > 0 && (
          <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: badgeBg, color: badgeText }}>
            {plan.clinicalHours}h observação
          </span>
        )}
        {plan.practiceHours > 0 && (
          <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: badgeBg, color: badgeText }}>
            {plan.practiceHours}h prática
          </span>
        )}
        {plan.hasMentorship && (
          <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: badgeBg, color: badgeText }}>
            Mentoria individual
          </span>
        )}
        {plan.hasLiveEvents && (
          <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: badgeBg, color: badgeText }}>
            Encontros ao vivo
          </span>
        )}
      </div>

      {/* CTA */}
      <div className="relative px-7 pt-5 pb-7">
        <button
          onClick={() => onAcessar(plan.key)}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all duration-200 disabled:opacity-50"
          style={{
            background: accent,
            color: dark ? "#0A1628" : "#fff",
            boxShadow: `0 4px 20px ${accent}40`,
          }}
        >
          {isLoading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Aguarde...</>
          ) : (
            <>Acessar agora <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Card compacto para módulo avulso ────────────────────────────────────────
function ModuloAvulsoCard({
  plan,
  onAcessar,
  isLoading,
}: {
  plan: PlanData;
  onAcessar: (key: string) => void;
  isLoading: boolean;
}) {
  return (
    <div
      className="relative flex flex-col sm:flex-row items-center gap-6 rounded-3xl overflow-hidden p-7 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(135deg, #EBF4FF 0%, #DBEAFE 60%, #BFDBFE 100%)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)",
      }}
    >
      {/* Ícone lateral */}
      <div
        className="shrink-0 h-16 w-16 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(26, 86, 164, 0.1)" }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect x="4" y="7" width="24" height="16" rx="3" stroke="#1A56A4" strokeWidth="1.8"/>
          <path d="M11 23l1.5-2.5h7l1.5 2.5" stroke="#1A56A4" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="16" cy="15" r="3.5" stroke="#1A56A4" strokeWidth="1.5"/>
        </svg>
      </div>

      {/* Texto */}
      <div className="flex-1 text-center sm:text-left">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#1A56A4] mb-0.5">Módulo Avulso</p>
        <h3 className="text-lg font-bold text-gray-900">Escolha 1 módulo</h3>
        <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>
      </div>

      {/* Preço + botão */}
      <div className="shrink-0 flex flex-col items-center sm:items-end gap-3">
        <div>
          <div className="text-2xl font-bold text-gray-900 tabular-nums">{plan.priceFormatted}</div>
          <p className="text-xs text-gray-400 text-right">acesso por 1 ano</p>
        </div>
        <button
          onClick={() => onAcessar(plan.key)}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50"
          style={{ background: "#1A56A4", boxShadow: "0 4px 16px rgba(26,86,164,0.3)" }}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Acessar agora <ArrowRight className="h-3.5 w-3.5" /></>}
        </button>
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function PlanosPublicos() {
  const [activeTab, setActiveTab] = useState<Tab>("online");
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const [navStuck, setNavStuck] = useState(false);

  // Ref para cada seção para scroll suave
  const sectionRefs: Record<Tab, React.RefObject<HTMLDivElement>> = {
    online:     useRef<HTMLDivElement>(null),
    observacao: useRef<HTMLDivElement>(null),
    mentoria:   useRef<HTMLDivElement>(null),
  };

  const urlParams = new URLSearchParams(window.location.search);
  const couponCode = urlParams.get("ref") || "";

  const { data, isLoading } = useQuery<{ plans: PlanData[] }>({
    queryKey: ["/api/stripe/plans"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (planKey: string) => {
      const res = await fetch("/api/stripe/public-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erro");
      return json;
    },
    onSuccess: (res) => { if (res.url) window.location.href = res.url; },
    onError: () => { setLoadingKey(null); alert("Erro ao gerar link. Tente novamente."); },
  });

  const handleAcessar = (planKey: string) => {
    setLoadingKey(planKey);
    checkoutMutation.mutate(planKey);
  };

  // Detectar scroll para sticky nav
  useEffect(() => {
    const onScroll = () => {
      if (!navRef.current) return;
      setNavStuck(window.scrollY > 60);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll suave ao mudar tab
  const handleTab = (tab: Tab) => {
    setActiveTab(tab);
    const ref = sectionRefs[tab];
    if (ref.current) {
      const y = ref.current.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  // Intersection observer para atualizar tab ativa ao rolar
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    (Object.keys(sectionRefs) as Tab[]).forEach((key) => {
      const el = sectionRefs[key].current;
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveTab(key); },
        { rootMargin: "-30% 0px -60% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
      </div>
    );
  }

  const plans = data?.plans || [];
  const digital    = plans.filter((p) => p.group === "digital");
  const observador = plans.filter((p) => p.group === "observador");
  const vip        = plans.filter((p) => p.group === "vip");
  const avulso     = digital.find((p) => p.key === "modulo_avulso");
  const digSemAvulso = digital.filter((p) => p.key !== "modulo_avulso");

  return (
    <div
      className="min-h-screen"
      style={{
        background: "#F8F7F4",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
      }}
    >

      {/* ── NAVBAR STICKY ─────────────────────────────────────── */}
      <div
        ref={navRef}
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background: navStuck ? "rgba(248,247,244,0.92)" : "transparent",
          backdropFilter: navStuck ? "blur(20px) saturate(1.5)" : "none",
          WebkitBackdropFilter: navStuck ? "blur(20px) saturate(1.5)" : "none",
          borderBottom: navStuck ? "1px solid rgba(0,0,0,0.07)" : "1px solid transparent",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-[60px]">

            {/* Voltar */}
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Voltar</span>
            </button>

            {/* Logo */}
            <img
              src="/logo-transparent.png"
              alt="Ampla Facial"
              className="h-7 object-contain shrink-0"
              style={{ opacity: 0.9 }}
            />

            {/* Espaço */}
            <div className="flex-1" />

            {/* Tabs de categoria */}
            <nav className="flex items-center gap-1">
              {TABS.map((tab) => {
                const Icon = tab.key === "online" ? IconOnline : tab.key === "observacao" ? IconObservacao : IconMentoria;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleTab(tab.key)}
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all duration-200"
                    style={{
                      background: isActive ? "#0A1628" : "transparent",
                      color: isActive ? "#fff" : "#6B7280",
                    }}
                  >
                    <Icon />
                    <span className="hidden md:inline whitespace-nowrap">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Login */}
            <a
              href="/#/"
              className="hidden sm:flex items-center text-xs text-gray-400 hover:text-gray-700 transition-colors shrink-0 ml-2"
            >
              Login
            </a>
          </div>
        </div>
      </div>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-2xl">
            {couponCode && (
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-1.5 text-xs font-medium text-amber-700 mb-6">
                <Gift className="h-3.5 w-3.5" />
                Indicação <strong>{couponCode}</strong> ativa
              </div>
            )}
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.08]"
            >
              Aprenda estética<br />
              <span style={{ color: "#D4A843" }}>do jeito certo.</span>
            </h1>
            <p className="mt-5 text-lg text-gray-500 leading-relaxed max-w-xl">
              Cursos clínicos do Dr. Gustavo Martins. Acesso liberado imediatamente após o pagamento.
            </p>

            {/* Trust */}
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
              {[
                { icon: Shield, label: "Pagamento seguro via Stripe" },
                { icon: Star,   label: "Acesso vitalício ao conteúdo" },
                { icon: Check,  label: "Upgrade com crédito a qualquer momento" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Icon className="h-3.5 w-3.5 text-gray-300" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO PRINCIPAL ────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">

        {/* ── SEÇÃO ONLINE ─────────────────────────────────────── */}
        <div ref={sectionRefs.online} className="pt-16">

          {/* Label de seção */}
          <div className="flex items-center gap-4 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-px w-8" style={{ background: "#D4A843" }} />
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">Online</p>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Estude no seu ritmo</h2>
              <p className="mt-1.5 text-gray-500 text-sm max-w-lg">
                Aulas gravadas com protocolo clínico completo, materiais científicos e acesso imediato.
              </p>
            </div>
          </div>

          {/* Módulo avulso */}
          {avulso && (
            <div className="mb-5">
              <ModuloAvulsoCard
                plan={avulso}
                onAcessar={handleAcessar}
                isLoading={checkoutMutation.isPending && loadingKey === avulso.key}
              />
            </div>
          )}

          {/* Módulos individuais — linha de chips informativos */}
          <div className="flex flex-wrap gap-2 mb-8 pl-1">
            {[
              { label: "Toxina Botulínica",           color: "#1A56A4" },
              { label: "Preenchedores Faciais",        color: "#9B1C1C" },
              { label: "Bioestimuladores de Colágeno", color: "#065F46" },
              { label: "Biorregeneradores",            color: "#92400E" },
              { label: "Método NaturalUp®",            color: "#5521B5" },
            ].map(({ label, color }) => (
              <span
                key={label}
                className="rounded-full px-3.5 py-1.5 text-xs font-medium border"
                style={{
                  borderColor: color + "30",
                  color,
                  background: color + "0D",
                }}
              >
                {label}
              </span>
            ))}
            <span className="rounded-full px-3.5 py-1.5 text-xs font-medium text-gray-400 border border-gray-200 bg-white">
              → incluso no Curso Completo
            </span>
          </div>

          {/* Cards digitais (sem avulso) */}
          {digSemAvulso.length > 0 && (
            <div className={`grid gap-5 ${
              digSemAvulso.length === 1 ? "max-w-sm" : "grid-cols-1 sm:grid-cols-2 max-w-3xl"
            }`}>
              {digSemAvulso.map((plan) => (
                <PlanCard
                  key={plan.key}
                  plan={plan}
                  onAcessar={handleAcessar}
                  isLoading={checkoutMutation.isPending && loadingKey === plan.key}
                />
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="my-16 flex items-center gap-6">
          <div className="h-px flex-1 bg-gray-200" />
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* ── SEÇÃO OBSERVAÇÃO CLÍNICA ─────────────────────────── */}
        <div ref={sectionRefs.observacao}>
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-px w-8" style={{ background: "#D4A843" }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">Presencial</p>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Com Observação Clínica</h2>
            <p className="mt-1.5 text-gray-500 text-sm max-w-lg">
              Acompanhe atendimentos reais do Dr. Gustavo. Teoria e prática no mesmo programa.
            </p>
          </div>

          <div className={`grid gap-5 ${
            observador.length <= 2
              ? "grid-cols-1 sm:grid-cols-2 max-w-3xl"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          }`}>
            {observador.map((plan) => (
              <PlanCard
                key={plan.key}
                plan={plan}
                onAcessar={handleAcessar}
                isLoading={checkoutMutation.isPending && loadingKey === plan.key}
              />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="my-16 flex items-center gap-6">
          <div className="h-px flex-1 bg-gray-200" />
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* ── SEÇÃO MENTORIA VIP ───────────────────────────────── */}
        <div ref={sectionRefs.mentoria}>
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-px w-8" style={{ background: "#D4A843" }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">Formação exclusiva</p>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Mentoria VIP</h2>
            <p className="mt-1.5 text-gray-500 text-sm max-w-lg">
              Acompanhamento individual de 3 a 6 meses direto com o Dr. Gustavo. Vagas limitadas por turma.
            </p>
          </div>

          <div className={`grid gap-5 ${
            vip.length === 1 ? "max-w-sm" :
            vip.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-3xl" :
            "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          }`}>
            {vip.map((plan) => (
              <PlanCard
                key={plan.key}
                plan={plan}
                onAcessar={handleAcessar}
                isLoading={checkoutMutation.isPending && loadingKey === plan.key}
              />
            ))}
          </div>
        </div>

        {/* ── RODAPÉ ───────────────────────────────────────────── */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-3xl bg-white p-7 ring-1 ring-gray-100">
            <Star className="h-4 w-4 text-[#D4A843] mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1.5">Upgrade com crédito integral</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Começou num plano menor? Em até 60 dias, 100% do valor pago vira crédito para o próximo. Paga apenas a diferença.
            </p>
          </div>
          <div className="rounded-3xl bg-white p-7 ring-1 ring-gray-100">
            <Gift className="h-4 w-4 text-[#D4A843] mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1.5">Indique e ganhe R$1.000</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Cada aluno recebe um código único. Quando o indicado fechar qualquer plano, você ganha R$1.000 em crédito para upgrade.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
