import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, ArrowRight, Loader2, ChevronLeft, Gift, Star } from "lucide-react";

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

function formatBRL(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ── SVG ilustrações por plano ──────────────────────────────────────────────
function IllustrationToxina() {
  return (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="tox-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E8F4FD" />
          <stop offset="100%" stopColor="#C5E3F7" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="70" rx="80" ry="55" fill="url(#tox-bg)" opacity="0.5" />
      {/* Seringa estilizada */}
      <rect x="75" y="55" width="50" height="16" rx="8" fill="#2B6CB0" />
      <rect x="115" y="59" width="18" height="8" rx="4" fill="#3182CE" />
      <rect x="133" y="62" width="12" height="2" rx="1" fill="#63B3ED" />
      <rect x="78" y="59" width="34" height="8" rx="3" fill="#EBF8FF" opacity="0.6" />
      <circle cx="83" cy="63" r="3" fill="#BEE3F8" />
      {/* Partículas */}
      <circle cx="60" cy="45" r="4" fill="#90CDF4" opacity="0.7" />
      <circle cx="148" cy="85" r="3" fill="#63B3ED" opacity="0.5" />
      <circle cx="55" cy="90" r="2.5" fill="#BEE3F8" opacity="0.8" />
      <circle cx="150" cy="50" r="5" fill="#90CDF4" opacity="0.4" />
      {/* Ondas */}
      <path d="M40 100 Q70 88 100 100 Q130 112 160 100" stroke="#2B6CB0" strokeWidth="1.5" fill="none" opacity="0.2" />
      <path d="M40 108 Q70 96 100 108 Q130 120 160 108" stroke="#2B6CB0" strokeWidth="1" fill="none" opacity="0.15" />
    </svg>
  );
}

function IllustrationPreenchedor() {
  return (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="pre-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF5F5" />
          <stop offset="100%" stopColor="#FED7D7" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="70" rx="80" ry="55" fill="url(#pre-bg)" opacity="0.5" />
      {/* Rosto estilizado */}
      <ellipse cx="100" cy="68" rx="32" ry="38" fill="#FEB2B2" opacity="0.3" />
      <ellipse cx="100" cy="65" rx="28" ry="34" fill="#FC8181" opacity="0.2" />
      {/* Lábios */}
      <path d="M85 78 Q100 85 115 78" stroke="#C53030" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M85 78 Q100 72 115 78" stroke="#E53E3E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Olhos */}
      <ellipse cx="88" cy="62" rx="5" ry="3" fill="#C53030" opacity="0.5" />
      <ellipse cx="112" cy="62" rx="5" ry="3" fill="#C53030" opacity="0.5" />
      {/* Pontos de aplicação */}
      <circle cx="78" cy="74" r="3" fill="#E53E3E" opacity="0.6" />
      <circle cx="122" cy="74" r="3" fill="#E53E3E" opacity="0.6" />
      <circle cx="82" cy="85" r="2.5" fill="#FC8181" opacity="0.7" />
      <circle cx="118" cy="85" r="2.5" fill="#FC8181" opacity="0.7" />
      {/* Brilhos */}
      <circle cx="55" cy="40" r="4" fill="#FEB2B2" opacity="0.6" />
      <circle cx="148" cy="45" r="3" fill="#FC8181" opacity="0.5" />
      <circle cx="52" cy="95" r="3" fill="#FED7D7" opacity="0.8" />
      <circle cx="150" cy="92" r="4" fill="#FEB2B2" opacity="0.5" />
    </svg>
  );
}

function IllustrationBioestimulador() {
  return (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="bio-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F0FFF4" />
          <stop offset="100%" stopColor="#C6F6D5" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="70" rx="80" ry="55" fill="url(#bio-bg)" opacity="0.5" />
      {/* Fibras de colágeno */}
      <path d="M50 90 Q75 60 100 90 Q125 120 150 90" stroke="#276749" strokeWidth="2" fill="none" opacity="0.4" />
      <path d="M50 80 Q75 50 100 80 Q125 110 150 80" stroke="#38A169" strokeWidth="2" fill="none" opacity="0.5" />
      <path d="M50 70 Q75 40 100 70 Q125 100 150 70" stroke="#48BB78" strokeWidth="2.5" fill="none" opacity="0.6" />
      <path d="M50 60 Q75 30 100 60 Q125 90 150 60" stroke="#68D391" strokeWidth="2" fill="none" opacity="0.4" />
      {/* Células */}
      <circle cx="100" cy="68" r="12" fill="#9AE6B4" opacity="0.4" />
      <circle cx="100" cy="68" r="7" fill="#68D391" opacity="0.6" />
      <circle cx="100" cy="68" r="3" fill="#276749" opacity="0.8" />
      {/* Partículas */}
      <circle cx="65" cy="50" r="4" fill="#9AE6B4" opacity="0.7" />
      <circle cx="140" cy="55" r="3" fill="#68D391" opacity="0.6" />
      <circle cx="60" cy="95" r="3" fill="#C6F6D5" opacity="0.8" />
      <circle cx="145" cy="92" r="4" fill="#9AE6B4" opacity="0.5" />
      <circle cx="75" cy="105" r="2.5" fill="#68D391" opacity="0.6" />
      <circle cx="130" cy="102" r="2.5" fill="#9AE6B4" opacity="0.6" />
    </svg>
  );
}

function IllustrationBiorregenerador() {
  return (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="bio2-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFAF0" />
          <stop offset="100%" stopColor="#FEEBC8" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="70" rx="80" ry="55" fill="url(#bio2-bg)" opacity="0.5" />
      {/* DNA helix */}
      <path d="M80 35 Q100 55 80 75 Q60 95 80 115" stroke="#C05621" strokeWidth="2.5" fill="none" opacity="0.5" />
      <path d="M120 35 Q100 55 120 75 Q140 95 120 115" stroke="#DD6B20" strokeWidth="2.5" fill="none" opacity="0.5" />
      {/* Links */}
      <line x1="80" y1="48" x2="120" y2="48" stroke="#F6AD55" strokeWidth="1.5" opacity="0.7" />
      <line x1="78" y1="60" x2="122" y2="60" stroke="#F6AD55" strokeWidth="1.5" opacity="0.7" />
      <line x1="80" y1="72" x2="120" y2="72" stroke="#F6AD55" strokeWidth="1.5" opacity="0.7" />
      <line x1="82" y1="84" x2="118" y2="84" stroke="#F6AD55" strokeWidth="1.5" opacity="0.7" />
      <line x1="84" y1="96" x2="116" y2="96" stroke="#F6AD55" strokeWidth="1.5" opacity="0.7" />
      <line x1="86" y1="108" x2="114" y2="108" stroke="#F6AD55" strokeWidth="1.5" opacity="0.7" />
      {/* Nós */}
      {[48, 60, 72, 84, 96, 108].map((y, i) => (
        <g key={i}>
          <circle cx={i % 2 === 0 ? 80 : 82} cy={y} r="3.5" fill="#ED8936" opacity="0.8" />
          <circle cx={i % 2 === 0 ? 120 : 118} cy={y} r="3.5" fill="#ED8936" opacity="0.8" />
        </g>
      ))}
      {/* Brilhos */}
      <circle cx="55" cy="50" r="3" fill="#FBD38D" opacity="0.7" />
      <circle cx="150" cy="85" r="4" fill="#F6AD55" opacity="0.5" />
    </svg>
  );
}

function IllustrationNaturalUp() {
  return (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="nat-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FAF5FF" />
          <stop offset="100%" stopColor="#E9D8FD" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="70" rx="80" ry="55" fill="url(#nat-bg)" opacity="0.5" />
      {/* Rosto com lifting */}
      <ellipse cx="100" cy="72" rx="30" ry="36" fill="#D6BCFA" opacity="0.25" />
      {/* Setas de lifting */}
      <path d="M75 90 Q72 70 78 55" stroke="#6B46C1" strokeWidth="2" fill="none" markerEnd="url(#arrow-purple)" opacity="0.7" />
      <path d="M125 90 Q128 70 122 55" stroke="#6B46C1" strokeWidth="2" fill="none" opacity="0.7" />
      {/* Pontas das setas */}
      <polygon points="76,52 78,60 82,55" fill="#6B46C1" opacity="0.7" />
      <polygon points="124,52 122,60 118,55" fill="#6B46C1" opacity="0.7" />
      {/* Rosto simplificado */}
      <ellipse cx="91" cy="65" rx="4" ry="2.5" fill="#805AD5" opacity="0.4" />
      <ellipse cx="109" cy="65" rx="4" ry="2.5" fill="#805AD5" opacity="0.4" />
      <path d="M88 80 Q100 87 112 80" stroke="#6B46C1" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Estrelas / brilho */}
      <path d="M55 45 L57 51 L63 53 L57 55 L55 61 L53 55 L47 53 L53 51 Z" fill="#B794F4" opacity="0.7" />
      <path d="M148 88 L150 93 L155 94 L150 96 L148 101 L146 96 L141 94 L146 93 Z" fill="#9F7AEA" opacity="0.5" />
      <circle cx="52" cy="95" r="3" fill="#E9D8FD" opacity="0.8" />
      <circle cx="152" cy="45" r="4" fill="#D6BCFA" opacity="0.6" />
    </svg>
  );
}

function IllustrationCompleto() {
  return (
    <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="comp-bg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#EBF8FF" />
          <stop offset="100%" stopColor="#BEE3F8" />
        </radialGradient>
      </defs>
      <ellipse cx="140" cy="80" rx="120" ry="65" fill="url(#comp-bg)" opacity="0.35" />
      {/* 5 ícones representando cada módulo */}
      {/* Toxina - azul */}
      <circle cx="55" cy="75" r="22" fill="#EBF8FF" stroke="#63B3ED" strokeWidth="1.5" opacity="0.9" />
      <rect x="44" y="68" width="22" height="7" rx="3.5" fill="#2B6CB0" opacity="0.7" />
      <rect x="59" y="70" width="9" height="3" rx="1.5" fill="#63B3ED" opacity="0.8" />
      {/* Preenchedor - rosa */}
      <circle cx="107" cy="60" r="22" fill="#FFF5F5" stroke="#FC8181" strokeWidth="1.5" opacity="0.9" />
      <ellipse cx="107" cy="57" rx="11" ry="13" fill="#FEB2B2" opacity="0.3" />
      <path d="M99 65 Q107 70 115 65" stroke="#C53030" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Bioestimulador - verde */}
      <circle cx="140" cy="90" r="24" fill="#F0FFF4" stroke="#68D391" strokeWidth="1.5" opacity="0.9" />
      <path d="M128 90 Q135 75 140 90 Q145 105 152 90" stroke="#38A169" strokeWidth="2" fill="none" />
      <circle cx="140" cy="90" r="5" fill="#9AE6B4" opacity="0.8" />
      {/* Biorregenerador - laranja */}
      <circle cx="173" cy="60" r="22" fill="#FFFAF0" stroke="#F6AD55" strokeWidth="1.5" opacity="0.9" />
      <path d="M165 50 Q173 65 165 80" stroke="#C05621" strokeWidth="2" fill="none" opacity="0.6" />
      <path d="M181 50 Q173 65 181 80" stroke="#DD6B20" strokeWidth="2" fill="none" opacity="0.6" />
      <line x1="165" y1="60" x2="181" y2="60" stroke="#F6AD55" strokeWidth="1.5" opacity="0.8" />
      <line x1="165" y1="70" x2="181" y2="70" stroke="#F6AD55" strokeWidth="1.5" opacity="0.8" />
      {/* NaturalUp - roxo */}
      <circle cx="225" cy="75" r="22" fill="#FAF5FF" stroke="#B794F4" strokeWidth="1.5" opacity="0.9" />
      <path d="M216 85 Q213 72 218 63" stroke="#6B46C1" strokeWidth="2" fill="none" opacity="0.8" />
      <path d="M234 85 Q237 72 232 63" stroke="#6B46C1" strokeWidth="2" fill="none" opacity="0.8" />
      <polygon points="217,61 219,67 223,63" fill="#6B46C1" opacity="0.8" />
      <polygon points="233,61 231,67 227,63" fill="#6B46C1" opacity="0.8" />
      {/* Conectores */}
      <line x1="77" y1="75" x2="85" y2="65" stroke="#A0AEC0" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
      <line x1="129" y1="62" x2="116" y2="66" stroke="#A0AEC0" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
      <line x1="164" y1="65" x2="151" y2="72" stroke="#A0AEC0" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
      <line x1="201" y1="65" x2="195" y2="70" stroke="#A0AEC0" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
    </svg>
  );
}

function IllustrationVIP() {
  return (
    <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="vip-bg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#FFFFF0" />
          <stop offset="100%" stopColor="#FEFCBF" />
        </radialGradient>
      </defs>
      <ellipse cx="140" cy="80" rx="120" ry="65" fill="url(#vip-bg)" opacity="0.4" />
      {/* Coroa */}
      <path d="M100 105 L100 75 L120 90 L140 65 L160 90 L180 75 L180 105 Z" fill="#D4A843" opacity="0.15" stroke="#D4A843" strokeWidth="1.5" />
      <polygon points="140,62 145,76 160,76 148,85 153,99 140,90 127,99 132,85 120,76 135,76" fill="#D4A843" opacity="0.7" />
      {/* Brilhos */}
      <path d="M60 50 L62 57 L69 59 L62 61 L60 68 L58 61 L51 59 L58 57 Z" fill="#D4A843" opacity="0.6" />
      <path d="M215 95 L217 100 L222 102 L217 104 L215 109 L213 104 L208 102 L213 100 Z" fill="#D4A843" opacity="0.4" />
      <circle cx="75" cy="95" r="4" fill="#F6E05E" opacity="0.6" />
      <circle cx="205" cy="55" r="5" fill="#ECC94B" opacity="0.5" />
      <circle cx="55" cy="110" r="3" fill="#F6E05E" opacity="0.7" />
      <circle cx="220" cy="40" r="3.5" fill="#D4A843" opacity="0.5" />
      {/* Faixas */}
      <line x1="80" y1="120" x2="200" y2="120" stroke="#D4A843" strokeWidth="1.5" opacity="0.3" />
      <line x1="90" y1="126" x2="190" y2="126" stroke="#D4A843" strokeWidth="1" opacity="0.2" />
    </svg>
  );
}

// Mapa de ilustrações por plan key
const PLAN_ILLUSTRATIONS: Record<string, () => JSX.Element> = {
  modulo_avulso: IllustrationToxina,
  pacote_completo: IllustrationCompleto,
  observador_essencial: IllustrationBioestimulador,
  observador_avancado: IllustrationBiorregenerador,
  observador_intensivo: IllustrationPreenchedor,
  imersao: IllustrationNaturalUp,
  vip_online: IllustrationVIP,
  vip_presencial: IllustrationVIP,
  vip_completo: IllustrationVIP,
};

// Ícone de módulo individual
const MODULE_ICONS: Record<string, () => JSX.Element> = {
  toxina: IllustrationToxina,
  preenchedor: IllustrationPreenchedor,
  bioestimulador: IllustrationBioestimulador,
  biorregenerador: IllustrationBiorregenerador,
  naturalup: IllustrationNaturalUp,
};

// ── Card de Módulo Individual ──────────────────────────────────────────────
function ModuleCard({
  icon: Icon,
  title,
  subtitle,
  color,
}: {
  icon: () => JSX.Element;
  title: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className={`rounded-2xl p-5 flex flex-col gap-3 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="h-20 w-full">
        <Icon />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color }}>Módulo</p>
        <h3 className="text-sm font-bold text-gray-900 mt-0.5">{title}</h3>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}

// ── Card de plano principal ────────────────────────────────────────────────
function PlanCard({
  plan,
  onAcessar,
  isLoading,
}: {
  plan: PlanData;
  onAcessar: (key: string) => void;
  isLoading: boolean;
}) {
  const Illustration = PLAN_ILLUSTRATIONS[plan.key] || IllustrationCompleto;
  const isDestaque = plan.key === "vip_completo" || plan.key === "pacote_completo";
  const isVip = plan.group === "vip";

  const economia = plan.valorMercado
    ? Math.round((1 - plan.price / plan.valorMercado) * 100)
    : null;

  return (
    <div
      className={`relative flex flex-col rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
        isDestaque
          ? "bg-gradient-to-b from-[#0A1628] to-[#0D1E35] shadow-xl ring-1 ring-[#D4A843]/30"
          : isVip
          ? "bg-gradient-to-b from-[#1a1400] to-[#0D0900] shadow-xl ring-1 ring-[#D4A843]/20"
          : "bg-white shadow-lg ring-1 ring-gray-100"
      }`}
    >
      {/* Badge destaque */}
      {plan.highlight && (
        <div className="absolute top-4 right-4 z-10">
          <span className="rounded-full bg-[#D4A843] px-3 py-1 text-[11px] font-bold text-[#0A1628] shadow">
            {plan.highlight}
          </span>
        </div>
      )}

      {/* Ilustração */}
      <div className={`px-8 pt-8 pb-0 h-36 ${isDestaque || isVip ? "opacity-80" : ""}`}>
        <Illustration />
      </div>

      {/* Conteúdo */}
      <div className="flex flex-col flex-1 p-7 pt-4">
        {/* Nome e descrição */}
        <div className="mb-5">
          <h3 className={`text-xl font-bold leading-tight ${isDestaque || isVip ? "text-white" : "text-gray-900"}`}>
            {plan.name}
          </h3>
          <p className={`mt-1.5 text-sm leading-relaxed ${isDestaque || isVip ? "text-gray-400" : "text-gray-500"}`}>
            {plan.description}
          </p>
        </div>

        {/* Preço */}
        <div className="mb-5">
          {plan.valorMercado && (
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm line-through ${isDestaque || isVip ? "text-gray-500" : "text-gray-400"}`}>
                {formatBRL(plan.valorMercado)}
              </span>
              {economia && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                  -{economia}%
                </span>
              )}
            </div>
          )}
          <div className={`text-3xl font-bold tabular-nums ${isDestaque || isVip ? "text-[#D4A843]" : "text-gray-900"}`}>
            {plan.priceFormatted}
          </div>
          {plan.installments12xFormatted && (
            <p className={`text-sm mt-0.5 ${isDestaque || isVip ? "text-gray-500" : "text-gray-400"}`}>
              ou 12× de {plan.installments12xFormatted}
            </p>
          )}
        </div>

        {/* Divisor */}
        <div className={`h-px mb-5 ${isDestaque || isVip ? "bg-white/10" : "bg-gray-100"}`} />

        {/* Features */}
        <ul className="flex-1 space-y-3 mb-6">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <div className={`mt-0.5 h-4 w-4 shrink-0 rounded-full flex items-center justify-center ${
                isDestaque || isVip ? "bg-[#D4A843]/20" : "bg-gray-100"
              }`}>
                <Check className={`h-2.5 w-2.5 ${isDestaque || isVip ? "text-[#D4A843]" : "text-gray-600"}`} />
              </div>
              <span className={`text-sm leading-snug ${isDestaque || isVip ? "text-gray-300" : "text-gray-600"}`}>
                {f}
              </span>
            </li>
          ))}
        </ul>

        {/* Badges extras */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {plan.clinicalHours > 0 && (
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
              isDestaque || isVip ? "bg-blue-900/40 text-blue-300" : "bg-blue-50 text-blue-700"
            }`}>
              {plan.clinicalHours}h observação clínica
            </span>
          )}
          {plan.practiceHours > 0 && (
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
              isDestaque || isVip ? "bg-green-900/40 text-green-300" : "bg-green-50 text-green-700"
            }`}>
              {plan.practiceHours}h prática com paciente
            </span>
          )}
          {plan.hasMentorship && (
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
              isDestaque || isVip ? "bg-amber-900/40 text-amber-300" : "bg-amber-50 text-amber-700"
            }`}>
              Mentoria individual
            </span>
          )}
          {plan.hasLiveEvents && (
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
              isDestaque || isVip ? "bg-purple-900/40 text-purple-300" : "bg-purple-50 text-purple-700"
            }`}>
              Encontros ao vivo
            </span>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={() => onAcessar(plan.key)}
          disabled={isLoading}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all duration-200 disabled:opacity-50 ${
            isDestaque || isVip
              ? "bg-[#D4A843] text-[#0A1628] hover:bg-[#e8b84d] hover:shadow-lg hover:shadow-[#D4A843]/20"
              : "bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg"
          }`}
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

// ── Página principal ───────────────────────────────────────────────────────
export default function PlanosPublicos() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

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
      if (!res.ok) throw new Error(json.message || "Erro ao gerar link de pagamento");
      return json;
    },
    onSuccess: (res) => {
      if (res.url) window.location.href = res.url;
    },
    onError: () => {
      setLoadingKey(null);
      alert("Erro ao gerar link. Tente novamente.");
    },
  });

  const handleAcessar = (planKey: string) => {
    setLoadingKey(planKey);
    checkoutMutation.mutate(planKey);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
      </div>
    );
  }

  const plans = data?.plans || [];

  // Separar grupos
  const digital = plans.filter((p) => p.group === "digital");
  const observador = plans.filter((p) => p.group === "observador");
  const vip = plans.filter((p) => p.group === "vip");

  // Módulo avulso separado para seção de módulos individuais
  const moduloAvulso = plans.find((p) => p.key === "modulo_avulso");
  const digitalSemAvulso = digital.filter((p) => p.key !== "modulo_avulso");

  return (
    <div className="min-h-screen bg-[#f5f5f7]" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif" }}>

      {/* Botão voltar */}
      <button
        onClick={() => window.history.back()}
        className="fixed left-4 top-4 z-50 flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur border border-gray-200 px-4 py-2 text-sm text-gray-600 shadow-sm hover:bg-white transition-all"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar
      </button>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <div ref={heroRef} className="bg-white pt-16 pb-12 text-center px-4 border-b border-gray-100">
        <img
          src="/logo-transparent.png"
          alt="Ampla Facial"
          className="mx-auto mb-6 h-16 object-contain"
        />
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-tight max-w-3xl mx-auto">
          Escolha como quer<br />
          <span className="text-[#D4A843]">evoluir na estética</span>
        </h1>
        <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
          Acesso liberado imediatamente após o pagamento. Sem contratos, sem mensalidades.
        </p>
        {/* Trust badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
          {[
            { icon: "🔒", label: "Pagamento seguro via Stripe" },
            { icon: "⚡", label: "Acesso imediato" },
            { icon: "🔄", label: "Upgrade com crédito a qualquer momento" },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-sm text-gray-500">
              <span>{b.icon}</span>
              <span>{b.label}</span>
            </div>
          ))}
        </div>

        {/* Código de indicação */}
        {couponCode && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-5 py-2.5 text-sm text-green-700">
            <Gift className="h-4 w-4" />
            <span>Indicação <strong>{couponCode}</strong> ativa — informe ao falar com a equipe.</span>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ── SEÇÃO: MÓDULOS INDIVIDUAIS ─────────────────────────── */}
        <section className="pt-16 pb-8">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#D4A843] mb-2">Comece por onde quiser</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Módulos individuais</h2>
            <p className="mt-3 text-gray-500 max-w-lg mx-auto">
              Foque na técnica que você mais precisa. Cada módulo inclui aulas gravadas e materiais científicos completos.
            </p>
          </div>

          {/* Grid de módulos individuais */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <ModuleCard
              icon={IllustrationToxina}
              title="Toxina Botulínica"
              subtitle="Protocolos, doses, anatomia e complicações"
              color="#2B6CB0"
            />
            <ModuleCard
              icon={IllustrationPreenchedor}
              title="Preenchedores Faciais"
              subtitle="Ácido hialurônico, técnicas e segurança vascular"
              color="#C53030"
            />
            <ModuleCard
              icon={IllustrationBioestimulador}
              title="Bioestimuladores de Colágeno"
              subtitle="Radiesse, Sculptra, Ellansé — indicações e técnicas"
              color="#276749"
            />
            <ModuleCard
              icon={IllustrationBiorregenerador}
              title="Biorregeneradores"
              subtitle="Matriz extracelular e moduladores modernos"
              color="#C05621"
            />
            <ModuleCard
              icon={IllustrationNaturalUp}
              title="Método NaturalUp®"
              subtitle="Abordagem full face exclusiva do Dr. Gustavo"
              color="#6B46C1"
            />
          </div>

          {/* Card de módulo avulso */}
          {moduloAvulso && (
            <div className="max-w-md mx-auto bg-white rounded-3xl shadow-lg ring-1 ring-gray-100 overflow-hidden">
              <div className="h-32 px-8 pt-6">
                <IllustrationCompleto />
              </div>
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Módulo Avulso</p>
                <h3 className="text-lg font-bold text-gray-900">Escolha 1 módulo</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">{moduloAvulso.description}</p>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{moduloAvulso.priceFormatted}</div>
                    <p className="text-xs text-gray-400 mt-0.5">à vista · acesso por 1 ano</p>
                  </div>
                  <button
                    onClick={() => handleAcessar(moduloAvulso.key)}
                    disabled={checkoutMutation.isPending && loadingKey === moduloAvulso.key}
                    className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {checkoutMutation.isPending && loadingKey === moduloAvulso.key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>Acessar agora <ArrowRight className="h-3.5 w-3.5" /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Divisor */}
        <div className="flex items-center gap-6 py-8">
          <div className="h-px flex-1 bg-gray-200" />
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Ou veja nossos planos completos</p>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* ── SEÇÃO: PLANOS DIGITAIS ─────────────────────────────── */}
        {digitalSemAvulso.length > 0 && (
          <section className="pb-16">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#D4A843] mb-2">Acesso Digital</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Curso completo</h2>
              <p className="mt-3 text-gray-500 max-w-lg mx-auto">
                Domine todas as técnicas no seu ritmo, com aulas gravadas e materiais científicos de todos os módulos.
              </p>
            </div>
            <div className={`grid gap-6 items-stretch ${
              digitalSemAvulso.length === 1 ? "max-w-sm mx-auto" : "grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto"
            }`}>
              {digitalSemAvulso.map((plan) => (
                <PlanCard
                  key={plan.key}
                  plan={plan}
                  onAcessar={handleAcessar}
                  isLoading={checkoutMutation.isPending && loadingKey === plan.key}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── SEÇÃO: OBSERVAÇÃO CLÍNICA ──────────────────────────── */}
        {observador.length > 0 && (
          <section className="pb-16">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#D4A843] mb-2">Presencial</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Observação Clínica</h2>
              <p className="mt-3 text-gray-500 max-w-lg mx-auto">
                Acompanhe atendimentos reais do Dr. Gustavo. Aprenda vendo a teoria virar prática na pele do paciente.
              </p>
            </div>
            <div className={`grid gap-6 items-stretch ${
              observador.length <= 2
                ? "grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto"
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
          </section>
        )}

        {/* ── SEÇÃO: VIP ─────────────────────────────────────────── */}
        {vip.length > 0 && (
          <section className="pb-16">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#D4A843] mb-2">Mentoria exclusiva</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Formação VIP</h2>
              <p className="mt-3 text-gray-500 max-w-lg mx-auto">
                Acompanhamento individual de 3 a 6 meses direto com o Dr. Gustavo. Vagas limitadas por turma.
              </p>
            </div>
            <div className={`grid gap-6 items-stretch ${
              vip.length === 1
                ? "max-w-sm mx-auto"
                : vip.length === 2
                ? "grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
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
          </section>
        )}

        {/* ── RODAPÉ DE CONFIANÇA ─────────────────────────────────── */}
        <div className="pb-16 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Upgrade com crédito */}
          <div className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-gray-100">
            <Star className="h-5 w-5 text-[#D4A843] mb-3" />
            <h3 className="font-bold text-gray-900">Upgrade com crédito total</h3>
            <p className="mt-1.5 text-sm text-gray-500">
              Começou num plano menor? Dentro de 60 dias, 100% do que pagou vira crédito. Você paga apenas a diferença.
            </p>
          </div>

          {/* Sistema de indicação */}
          <div className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-gray-100">
            <Gift className="h-5 w-5 text-[#D4A843] mb-3" />
            <h3 className="font-bold text-gray-900">Indique e ganhe R$1.000</h3>
            <p className="mt-1.5 text-sm text-gray-500">
              Alunos matriculados recebem um código único. Quando o indicado fechar qualquer plano, você recebe R$1.000 em crédito para upgrade.
            </p>
          </div>
        </div>

        {/* Link de login */}
        <div className="pb-12 text-center">
          <a href="/#/" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronLeft className="inline h-3.5 w-3.5" /> Já tenho conta — fazer login
          </a>
        </div>

      </div>
    </div>
  );
}
