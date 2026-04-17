import { useEffect, useRef, useCallback, useState } from "react";
import { captureUtmParams, trackWhatsAppClick } from "@/lib/utm";
import {
  ShieldAlert,
  Puzzle,
  AlertTriangle,
  DollarSign,
  BookOpen,
  Users,
  MessageCircle,
  Check,
  Star,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Syringe,
  Sparkles,
  Layers,
  FlaskConical,
  Gem,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
   SCROLL ANIMATION HOOK
   ────────────────────────────────────────────────────────────────────────── */
function useScrollFade() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("lp-visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

function FadeIn({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useScrollFade();
  return (
    <div ref={ref} className={`lp-fade ${className}`}>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   FAQ ITEM
   ────────────────────────────────────────────────────────────────────────── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="font-medium text-[15px] pr-4">{q}</span>
        {open ? (
          <ChevronUp className="w-5 h-5 text-[#D4A843] shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#D4A843] shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-gray-400 leading-relaxed">{a}</div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   WHATSAPP ICON
   ────────────────────────────────────────────────────────────────────────── */
function WhatsAppIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   MAIN LP COMPONENT
   ────────────────────────────────────────────────────────────────────────── */
const WA_FREE_LESSON =
  "https://wa.me/5521976263881?text=Oi%20Dr.%20Gustavo%2C%20vim%20pela%20p%C3%A1gina%20e%20quero%20participar%20do%20pr%C3%B3ximo%20encontro%20quinzenal%20gratuito";
const WA_LINK =
  "https://wa.me/5521976263881?text=Oi%20Dr.%20Gustavo%2C%20vim%20pela%20p%C3%A1gina%20e%20quero%20saber%20mais%20sobre%20a%20forma%C3%A7%C3%A3o";

export default function LandingPage() {
  const plansRef = useRef<HTMLDivElement>(null);
  const freeLessonRef = useRef<HTMLDivElement>(null);
  const [scrollIndicatorVisible, setScrollIndicatorVisible] = useState(true);

  const scrollToPlans = useCallback(() => {
    plansRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const scrollToFreeLesson = useCallback(() => {
    freeLessonRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  /* hide scroll indicator once user scrolls */
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 80) {
        setScrollIndicatorVisible(false);
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* capture UTM params on LP load */
  useEffect(() => {
    captureUtmParams();
  }, []);

  /* set page title */
  useEffect(() => {
    document.title = "Formação em Harmonização Orofacial | Ampla Facial";
    return () => {
      document.title = "Ampla Facial | Mentoria HOF com Dr. Gustavo Martins";
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white antialiased">
      {/* ── inline animation styles ─────────────────────────────────────── */}
      <style>{`
        .lp-fade{opacity:0;transform:translateY(28px);transition:opacity .7s ease,transform .7s ease}
        .lp-visible{opacity:1!important;transform:translateY(0)!important}
        .lp-serif{font-family:'Playfair Display',Georgia,serif}
        .lp-gold-gradient{background:linear-gradient(135deg,#D4A843 0%,#F5E6B8 50%,#D4A843 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .lp-plan-highlight{box-shadow:0 0 0 2px #D4A843,0 8px 40px rgba(212,168,67,.18)}
        .lp-module-card:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,.3)}
        .lp-module-card{transition:transform .25s ease,box-shadow .25s ease}
        @keyframes lp-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(8px)}}
        .lp-scroll-indicator{animation:lp-bounce 2s ease-in-out infinite;transition:opacity .5s ease}
      `}</style>

      {/* ════════════════════════════════════════════════════════════════════
          1 · HERO
         ════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(212,168,67,0.06) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-5xl mx-auto px-5 pt-6 pb-8 md:pt-10 md:pb-20 text-center">
          {/* logo */}
          <img
            src="/logo-transparent.png"
            alt="Ampla Facial"
            className="h-28 md:h-32 mx-auto mb-4 opacity-90"
          />

          {/* headline */}
          <h1 className="lp-serif text-[1.65rem] sm:text-4xl md:text-[2.75rem] leading-snug sm:leading-relaxed font-bold max-w-3xl mx-auto mb-6">
            Pare de Competir por Preço de Seringa.<br />
            <span className="text-[#D4A843]">Domine o Full Face.</span>
          </h1>

          <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto mb-6 leading-relaxed">
            Formação completa em Toxina, Preenchedores, Bioestimuladores e Biorregeneradores com o
            Dr. Gustavo Martins
          </p>

          {/* VSL Video */}
          <div
            id="vsl-container"
            className="relative max-w-3xl mx-auto aspect-video rounded-2xl overflow-hidden border border-white/10 bg-[#0F1A2E]"
          >
            <iframe
              src="https://www.youtube.com/embed/XtMfQaahauQ?rel=0&modestbranding=1&disablekb=1"
              title="Apresentação Ampla Facial"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>

          <p className="mt-5 text-xs md:text-sm text-gray-500">
            Mais de 60 aulas gravadas com protocolos clínicos reais
          </p>

          {/* CTA below VSL */}
          <button
            onClick={scrollToPlans}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#D4A843] px-8 py-3.5 text-base font-semibold text-[#0A1628] hover:bg-[#e8b84d] transition-all shadow-lg shadow-[#D4A843]/20"
          >
            Ver Planos e Investimento
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* Free lesson CTA */}
          <div ref={freeLessonRef} className="mt-8 bg-[#0F1A2E] border border-[#D4A843]/30 rounded-2xl p-6 md:p-8 max-w-2xl mx-auto">
            <p className="lp-serif text-lg md:text-xl font-bold text-white mb-2">
              Participe de um encontro quinzenal de forma gratuita.
            </p>
            <p className="text-sm text-gray-400 mb-5">
              Assista uma aula ao vivo de mentoria avaliada em mais de R$ 1.000, sem pagar nada.
              Conheça o método, tire suas dúvidas e decida com calma.
            </p>
            <a
              href={WA_FREE_LESSON}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick("lp")}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-semibold text-sm"
              style={{ backgroundColor: '#25D366' }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.319 0-4.47-.742-6.227-2.003l-.435-.326-2.847.954.954-2.847-.326-.435A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              Quero participar da próxima aula gratuita
            </a>
          </div>
        </div>

      </section>

      {/* ════════════════════════════════════════════════════════════════════
          2 · PAIN POINTS
         ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#F5F0E8] py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-5">
          <FadeIn>
            <h2 className="lp-serif text-2xl md:text-3xl font-bold text-[#0A0D14] text-center mb-12">
              Você se identifica com isso?
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {(
              [
                {
                  icon: ShieldAlert,
                  text: "Terminou a pós mas ainda não se sente seguro para atender full face",
                },
                {
                  icon: Puzzle,
                  text: "Fez cursos isolados de toxina ou preenchedor mas não sabe combinar as técnicas",
                },
                {
                  icon: AlertTriangle,
                  text: "Tem medo de intercorrências e não tem ninguém para tirar dúvidas",
                },
                {
                  icon: DollarSign,
                  text: "Cobra barato porque não tem confiança nos seus resultados",
                },
              ] as const
            ).map(({ icon: Icon, text }, i) => (
              <FadeIn key={i}>
                <div className="flex items-start gap-4 bg-white rounded-xl p-5 border border-[#0A0D14]/[.06] shadow-sm">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-[#D4A843]/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#D4A843]" />
                  </div>
                  <p className="text-[#0A0D14] text-sm md:text-[15px] leading-relaxed font-medium">
                    {text}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* WhatsApp CTA strip */}
      <section className="bg-[#0A0D14] py-8 border-y border-white/5">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <p className="text-sm text-gray-400 mb-3">Quer ver como funciona na prática? Participe de um encontro ao vivo, gratuito.</p>
          <a
            href={WA_FREE_LESSON}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium text-sm"
            style={{ backgroundColor: '#25D366' }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.319 0-4.47-.742-6.227-2.003l-.435-.326-2.847.954.954-2.847-.326-.435A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            Garantir minha vaga na próxima aula
          </a>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          3 · THE METHOD
         ════════════════════════════════════════════════════════════════════ */}
      <section className="py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <FadeIn>
            <h2 className="lp-serif text-2xl md:text-3xl font-bold mb-3">O Método Ampla Facial</h2>
            <p className="text-gray-400 max-w-xl mx-auto mb-14">
              Harmonização não é sobre dominar uma técnica. É sobre dominar a face.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(
              [
                {
                  icon: BookOpen,
                  title: "Conhecimento Técnico Profundo",
                  desc: "Mais de 60 aulas com protocolos clínicos detalhados, do básico ao avançado",
                },
                {
                  icon: Users,
                  title: "Prática Real Supervisionada",
                  desc: "Atenda pacientes modelo na clínica do Dr. Gustavo com supervisão direta",
                },
                {
                  icon: MessageCircle,
                  title: "Acompanhamento Individual",
                  desc: "Canal direto, encontros ao vivo e análise de casos com quem já está onde você quer chegar",
                },
              ] as const
            ).map(({ icon: Icon, title, desc }, i) => (
              <FadeIn key={i}>
                <div className="bg-[#0F1A2E] border border-white/5 rounded-2xl p-7 text-center h-full flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-[#D4A843]/10 flex items-center justify-center mx-auto mb-5">
                    <Icon className="w-6 h-6 text-[#D4A843]" />
                  </div>
                  <h3 className="font-semibold text-base mb-2">{title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed flex-1">{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          4 · MODULES
         ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#F5F0E8] py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-5">
          <FadeIn>
            <h2 className="lp-serif text-2xl md:text-3xl font-bold text-[#0A0D14] text-center mb-12">
              O que você vai aprender
            </h2>
          </FadeIn>

          {/* horizontal scroll on mobile, grid on desktop */}
          <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible md:pb-0 -mx-5 px-5 md:mx-0 md:px-0">
            {(
              [
                {
                  icon: Syringe,
                  color: "#3B82F6",
                  title: "Toxina Botulínica",
                  desc: "Protocolos completos para terço superior, médio e inferior",
                  lessons: 12,
                  exclusive: false,
                },
                {
                  icon: Sparkles,
                  color: "#EC4899",
                  title: "Preenchedores Full Face",
                  desc: "Técnicas avançadas para harmonização completa",
                  lessons: 17,
                  exclusive: false,
                },
                {
                  icon: FlaskConical,
                  color: "#10B981",
                  title: "Bioestimuladores de Colágeno",
                  desc: "Indução de colágeno para rejuvenescimento natural",
                  lessons: 10,
                  exclusive: false,
                },
                {
                  icon: Layers,
                  color: "#8B5CF6",
                  title: "Biorregeneradores e Moduladores",
                  desc: "Modulação da matriz extracelular",
                  lessons: 8,
                  exclusive: false,
                },
                {
                  icon: Gem,
                  color: "#D4A843",
                  title: "Método NaturalUp®",
                  desc: "Protocolo exclusivo das mentorias VIP",
                  lessons: 14,
                  exclusive: true,
                },
              ] as const
            ).map(({ icon: Icon, color, title, desc, lessons, exclusive }, i) => (
              <FadeIn key={i} className="min-w-[220px] snap-start md:min-w-0">
                <div className="lp-module-card bg-white rounded-xl p-5 border border-[#0A0D14]/[.06] h-full flex flex-col">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <h3 className="font-semibold text-[#0A0D14] text-sm mb-1 leading-snug">
                    {title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3 flex-1">{desc}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-[#0A0D14]">{lessons} aulas</span>
                    {exclusive && (
                      <span className="bg-[#D4A843]/10 text-[#D4A843] px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide">
                        Exclusivo VIP
                      </span>
                    )}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA WhatsApp (after modules) ──────────────────────── */}
      <section className="py-10">
        <div className="max-w-md mx-auto px-5 text-center">
          <FadeIn>
            <p className="text-gray-400 text-sm mb-4">Tem dúvidas sobre qual plano escolher?</p>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick("lp")}
              className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold text-sm px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity w-full"
            >
              <WhatsAppIcon className="w-5 h-5" />
              Tire suas dúvidas no WhatsApp
            </a>
          </FadeIn>
        </div>
      </section>

      {/* Free lesson highlight */}
      <section className="bg-[#F5F0E8] py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <FadeIn>
            <p className="text-[#D4A843] font-semibold text-sm uppercase tracking-wider mb-3">Antes de decidir</p>
            <h2 className="lp-serif text-2xl md:text-3xl font-bold text-[#0A0D14] mb-4">
              Assista uma aula de mentoria ao vivo. Por nossa conta.
            </h2>
            <p className="text-[#0A0D14]/70 text-base leading-relaxed mb-8 max-w-xl mx-auto">
              A cada 15 dias o Dr. Gustavo faz um encontro ao vivo com seus mentorandos.
              Você pode participar do próximo de forma totalmente gratuita,
              conhecer o método, tirar dúvidas e sentir se faz sentido pra você.
            </p>
            <a
              href={WA_FREE_LESSON}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick("lp")}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-semibold text-base"
              style={{ backgroundColor: '#25D366' }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.319 0-4.47-.742-6.227-2.003l-.435-.326-2.847.954.954-2.847-.326-.435A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              Quero participar da próxima aula gratuita
            </a>
          </FadeIn>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          5 · PLANS
         ════════════════════════════════════════════════════════════════════ */}
      <section ref={plansRef} id="planos" className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-5">
          <FadeIn>
            <h2 className="lp-serif text-2xl md:text-3xl font-bold text-center mb-3">
              Escolha o seu caminho
            </h2>
            <p className="text-gray-400 text-center max-w-lg mx-auto mb-14">
              Três formas de aprender, do seu ritmo até imersão total
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* ── Card 1: Curso Online ────────────────────────────────── */}
            <FadeIn className="h-full">
              <div className="bg-[#0F1A2E] border border-white/10 rounded-2xl p-7 flex flex-col h-full">
                <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-[#D4A843] bg-[#D4A843]/10 px-3 py-1 rounded-full self-start mb-5">
                  Online
                </span>
                <h3 className="lp-serif text-xl font-bold mb-1">Curso Online</h3>
                <p className="text-sm text-gray-400 mb-4">Estude online, no seu ritmo</p>

                <div className="mb-6">
                  <p className="text-2xl font-bold text-white">12x <span className="text-[#D4A843]">R$ 547</span></p>
                  <p className="text-xs text-gray-500 mt-0.5">ou R$ 5.970 à vista</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    "Todos os 4 módulos completos (60+ aulas)",
                    "Toxina, Preenchedores, Bioestimuladores e Biorregeneradores",
                    "Encontros quinzenais ao vivo por 6 meses",
                    "Materiais científicos de todos os módulos",
                    "Cashback de 5% em créditos na plataforma",
                    "Acesso ao portal por 12 meses",
                    "Certificado de participação",
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-[#D4A843] mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <p className="text-xs text-gray-500 mb-5">
                  Ideal para quem quer dominar a teoria completa antes de ir para a clínica
                </p>

                <div className="mt-auto pt-4 border-t border-white/10">
                  <a
                    href="https://wa.me/5521976263881?text=Oi%20Dr.%20Gustavo%2C%20vim%20pela%20p%C3%A1gina%20e%20tenho%20interesse%20no%20Curso%20Online.%20Podemos%20conversar%3F"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ backgroundColor: "#D4A843", color: "#0A0D14" }}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-center text-sm hover:brightness-110 transition"
                  >
                    Quero o Curso Online
                  </a>
                </div>
              </div>
            </FadeIn>

            {/* ── Card 2: Imersão ────────────────────────── */}
            <FadeIn className="h-full">
              <div className="bg-[#0F1A2E] border border-white/10 rounded-2xl p-7 flex flex-col relative h-full">
                <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-[#D4A843] bg-[#D4A843]/10 px-3 py-1 rounded-full self-start mb-5">
                  Observação Clínica
                </span>
                <h3 className="lp-serif text-xl font-bold mb-1">Imersão</h3>
                <p className="text-sm text-gray-400 mb-4">Veja como eu faço na clínica</p>

                <div className="mb-6">
                  <p className="text-2xl font-bold text-white">A partir de <span className="text-[#D4A843]">R$ 11.997</span></p>
                  <p className="text-xs text-gray-500 mt-0.5">Consulte condições de parcelamento</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    "Tudo do Curso Online",
                    "24h de observação clínica presencial (6 turnos)",
                    "Acompanhe procedimentos reais ao vivo",
                    "Encontros quinzenais ao vivo por 6 meses",
                    "Mentoria online com canal direto por 3 meses",
                    "Cashback de 10% em créditos na plataforma",
                    "Certificado com carga horária presencial",
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-[#D4A843] mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <p className="text-xs text-gray-500 mb-5">
                  Ideal para quem quer ver de perto antes de atender
                </p>

                <div className="mt-auto pt-4 border-t border-white/10">
                  <a
                    href="https://wa.me/5521976263881?text=Oi%20Dr.%20Gustavo%2C%20vim%20pela%20p%C3%A1gina%20e%20tenho%20interesse%20na%20Imers%C3%A3o%20(observa%C3%A7%C3%A3o%20cl%C3%ADnica).%20Podemos%20conversar%3F"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ backgroundColor: "#D4A843", color: "#0A0D14" }}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-center text-sm hover:brightness-110 transition"
                  >
                    Quero a Imersão
                  </a>
                </div>
              </div>
            </FadeIn>

            {/* ── Card 3: Mentoria VIP Completa (MAIS INDICADO) ─────── */}
            <FadeIn className="h-full">
              <div className="lp-plan-highlight bg-[#0F1A2E] rounded-2xl p-7 flex flex-col relative overflow-hidden h-full lg:-mt-3 lg:pb-9">
                {/* subtle premium glow */}
                <div
                  className="absolute -top-20 -right-20 w-40 h-40 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(212,168,67,0.12) 0%, transparent 70%)",
                  }}
                />

                <div className="relative flex items-center gap-2 mb-5">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#0A0D14] bg-[#D4A843] px-3 py-1 rounded-full">
                    <Star className="w-3 h-3" />
                    Mais Indicado
                  </span>
                </div>
                <h3 className="lp-serif text-xl font-bold mb-1 relative">Mentoria VIP Completa</h3>
                <p className="text-sm text-gray-400 mb-4 relative">
                  Bote a mão na massa e atenda pacientes
                </p>

                <div className="mb-6 relative">
                  <p className="text-2xl font-bold text-white">A partir de <span className="text-[#D4A843]">R$ 17.350</span></p>
                  <p className="text-xs text-gray-500 mt-0.5">Consulte condições de parcelamento</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1 relative">
                  {[
                    "Tudo da Imersão",
                    "16h de prática hands-on com pacientes modelo",
                    "Supervisão direta do Dr. Gustavo nos atendimentos",
                    "Acompanhamento individual por 6 meses",
                    "Encontros quinzenais ao vivo por 6 meses",
                    "Canal exclusivo direto por 6 meses",
                    "Método NaturalUp® completo (módulo exclusivo)",
                    "Cashback de 10% em créditos na plataforma",
                    "Análise de casos clínicos em grupo",
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-[#D4A843] mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <p className="text-xs text-gray-500 mb-5 relative">
                  Ideal para quem quer sair atendendo full face com confiança
                </p>

                <div className="relative mt-auto pt-4 border-t border-white/10">
                  <a
                    href="https://wa.me/5521976263881?text=Oi%20Dr.%20Gustavo%2C%20vim%20pela%20p%C3%A1gina%20e%20tenho%20interesse%20na%20Mentoria%20VIP%20Completa%20(hands-on%20com%20pacientes).%20Podemos%20conversar%3F"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ backgroundColor: "#D4A843", color: "#0A0D14" }}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-center text-sm hover:brightness-110 transition"
                  >
                    Quero a Mentoria VIP
                  </a>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Individual courses mention ─────────────────────── */}
      <section className="py-8 border-t border-white/5">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <p className="text-gray-500 text-sm mb-1">Prefere dominar um tema de cada vez?</p>
          <p className="text-gray-600 text-xs mb-4">Conheça nossos cursos individuais com teoria online e prática presencial</p>
          <a
            href="/#/planos-publicos?plan=cursos"
            className="inline-flex items-center gap-1.5 text-[#D4A843] text-sm font-medium hover:text-[#e8b84d] transition-colors"
          >
            Ver cursos
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Upgrade + Cashback */}
      <section className="bg-[#0F1A2E] py-12 md:py-16 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-5">
          <FadeIn>
            <h2 className="lp-serif text-xl md:text-2xl font-bold text-center mb-10">
              Comece por onde faz sentido.<br />
              <span className="text-[#D4A843]">Evolua quando estiver pronto.</span>
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#0A0D14] rounded-xl p-6 border border-white/10">
                <h3 className="text-[#D4A843] font-semibold text-sm uppercase tracking-wider mb-3">Upgrade com crédito integral</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Fez o Curso Online e quer partir para a Imersão ou Mentoria VIP?
                  Nos primeiros 60 dias, 100% do que você pagou vira crédito no upgrade.
                  Após 60 dias, você ainda aproveita 70% como crédito.
                  Você nunca perde o que investiu.
                </p>
              </div>
              <div className="bg-[#0A0D14] rounded-xl p-6 border border-white/10">
                <h3 className="text-[#D4A843] font-semibold text-sm uppercase tracking-wider mb-3">Cashback em créditos</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Cada plano gera cashback automático na plataforma: 5% no Curso Online
                  e 10% na Imersão e Mentoria VIP. Use seus créditos para adquirir
                  horas extras de prática, módulos avulsos ou upgrades de plano.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          6 · ABOUT
         ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#F5F0E8] py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-5">
          <FadeIn>
            <div className="flex flex-col items-center gap-8 md:gap-10 text-center">
              {/* photo */}
              <img
                src="/dr-gustavo-perfil.jpg"
                alt="Dr. Gustavo Martins"
                className="shrink-0 w-48 h-48 md:w-56 md:h-56 rounded-full object-cover object-top border-4 border-[#D4A843]/30 mx-auto"
              />

              <div className="flex flex-col items-center">
                <h2 className="lp-serif text-2xl md:text-3xl font-bold text-[#0A0D14] mb-2">
                  Dr. Gustavo Martins
                </h2>
                <p className="text-gray-600 mb-5 text-sm md:text-base">
                  Cirurgião-dentista, Biomédico, Mestre e Especialista em Harmonização Orofacial
                </p>

                <ul className="space-y-2.5 text-left inline-block">
                  {[
                    "Speaker Merz Aesthetics",
                    "Membro da Academia Brasileira de HOF",
                    "3 clínicas no Rio de Janeiro (Barra, Copacabana, Santa Cruz)",
                    "Criador do Protocolo NaturalUp®",
                    "Já formou dezenas de profissionais que hoje atendem full face com confiança",
                  ].map((c, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-[#0A0D14]/80"
                    >
                      <ChevronRight className="w-4 h-4 text-[#D4A843] mt-0.5 shrink-0" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          7 · TESTIMONIAL VIDEO
         ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#0A1628] py-14 md:py-20">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <FadeIn>
            <h2 className="lp-serif text-2xl md:text-3xl font-bold mb-3">
              O Que Nossos Alunos Dizem
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto mb-10">
              Veja a experiência real de quem está na mentoria Ampla Facial
            </p>

            <div className="flex justify-center">
              <div
                className="relative w-full overflow-hidden bg-[#0F1A2E]"
                style={{
                  maxWidth: 360,
                  aspectRatio: "9 / 16",
                  borderRadius: 24,
                  boxShadow:
                    "0 32px 80px rgba(11,29,58,0.22), 0 8px 24px rgba(11,29,58,0.12), 0 0 0 1px rgba(212,168,67,0.18)",
                }}
              >
                <iframe
                  src="https://www.youtube.com/embed/LEQKPpbfnFU?rel=0&modestbranding=1"
                  title="Depoimento de uma aluna em mentoria Ampla Facial"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>

            <p className="mt-6 text-sm text-gray-500 italic">
              Depoimento real de aluna em mentoria com o Dr. Gustavo Martins
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          8 · FAQ
         ════════════════════════════════════════════════════════════════════ */}
      <section className="py-12 md:py-16">
        <div className="max-w-2xl mx-auto px-5">
          <FadeIn>
            <h2 className="lp-serif text-2xl md:text-3xl font-bold text-center mb-10">
              Perguntas Frequentes
            </h2>
          </FadeIn>

          <FadeIn>
            <div className="space-y-3">
              <FAQItem
                q="Preciso ter experiência em harmonização?"
                a="Não. O curso foi pensado para iniciantes e profissionais experientes. As aulas vão do básico ao avançado."
              />
              <FAQItem
                q="Como funciona a prática presencial?"
                a="Você agenda turnos de 4 horas na clínica do Dr. Gustavo no Rio de Janeiro. Os pacientes modelo são garantidos."
              />
              <FAQItem
                q="Posso começar pelo curso e depois fazer a imersão?"
                a="Sim. Oferecemos upgrade com crédito integral. O que você pagou no curso é abatido do valor da imersão ou da mentoria."
              />
              <FAQItem
                q="As aulas são ao vivo ou gravadas?"
                a="As aulas dos módulos são gravadas, então você assiste no seu ritmo. Os encontros quinzenais da mentoria VIP são ao vivo."
              />
              <FAQItem
                q="Qual a forma de pagamento?"
                a="Pix, cartão de crédito ou boleto. Parcelamos em até 12x no cartão."
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA WhatsApp (after FAQ) ──────────────────────────── */}
      <section className="bg-[#0F1A2E] py-10">
        <div className="max-w-md mx-auto px-5 text-center">
          <FadeIn>
            <p className="text-gray-400 text-sm mb-4">Ainda tem dúvidas? Fale diretamente comigo</p>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick("lp")}
              className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold text-sm px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity w-full"
            >
              <WhatsAppIcon className="w-5 h-5" />
              Falar com o Dr. Gustavo
            </a>
          </FadeIn>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          9 · FINAL CTA
         ════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-16 md:py-24">
        {/* gold gradient top border */}
        <div
          className="absolute top-0 inset-x-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, #D4A843 30%, #F5E6B8 50%, #D4A843 70%, transparent)",
          }}
        />

        <div className="max-w-2xl mx-auto px-5 text-center">
          <FadeIn>
            <h2 className="lp-serif text-2xl md:text-3xl font-bold mb-3">
              Ainda tem dúvidas? Comece pela aula gratuita.
            </h2>
            <p className="text-gray-400 mb-10">Participe de um encontro quinzenal ao vivo, conheça o método e decida com calma. Sem compromisso.</p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={WA_FREE_LESSON}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 text-white font-semibold text-sm px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity w-full sm:w-auto"
                style={{ backgroundColor: '#25D366' }}
              >
                <WhatsAppIcon className="w-5 h-5" />
                Participar da próxima aula gratuita
              </a>

              <button
                onClick={scrollToPlans}
                className="font-semibold text-sm px-8 py-3.5 rounded-xl border border-[#D4A843]/40 text-[#D4A843] hover:bg-[#D4A843]/10 transition-colors w-full sm:w-auto"
              >
                Ver os planos
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          10 · FOOTER
         ════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-5xl mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <img src="/logo-transparent.png" alt="Ampla Facial" className="h-6 opacity-50" />
            <span>&copy; 2026 Ampla Facial. Todos os direitos reservados.</span>
          </div>

          <div className="flex items-center gap-5">
            <a
              href="https://instagram.com/dr.gustavomartins"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-300 transition-colors"
            >
              @dr.gustavomartins
            </a>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick("lp")}
              className="hover:text-gray-300 transition-colors flex items-center gap-1"
            >
              <WhatsAppIcon className="w-3.5 h-3.5" />
              WhatsApp
            </a>
          </div>
        </div>
      </footer>

      {/* ════════════════════════════════════════════════════════════════════
          SCROLL INDICATOR
         ════════════════════════════════════════════════════════════════════ */}
      <button
        onClick={scrollToFreeLesson}
        className="lp-scroll-indicator fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 cursor-pointer bg-transparent border-none outline-none"
        style={{ opacity: scrollIndicatorVisible ? 1 : 0, pointerEvents: scrollIndicatorVisible ? "auto" : "none", color: "rgba(212,168,67,0.85)" }}
        aria-label="Deslize para ver a aula gratuita"
      >
        <span className="text-[11px] md:text-xs tracking-wide whitespace-nowrap" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
          Deslize para assistir a aula gratuita
        </span>
        <ChevronDown className="w-5 h-5" />
      </button>

      {/* ════════════════════════════════════════════════════════════════════
          FLOATING WHATSAPP BUTTON
         ════════════════════════════════════════════════════════════════════ */}
      <a
        href={WA_LINK}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackWhatsAppClick("lp")}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        aria-label="WhatsApp"
      >
        <WhatsAppIcon className="w-7 h-7 text-white" />
      </a>
    </div>
  );
}
