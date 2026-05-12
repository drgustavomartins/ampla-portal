import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar, Clock, Play, Lock, ChevronLeft, Sparkles, PlayCircle, BookOpen,
} from "lucide-react";
import { hasMentoriaAtiva } from "@shared/access-rules";

// ─── Dados do módulo "Encontros Quinzenais" ────────────────────────────────
// Lista hardcoded — gravações das aulas online quinzenais da mentoria.
// Ordem: mais recentes primeiro (padrão do portal).
type EncontroLesson = {
  id: string;
  title: string;
  youtubeId: string;
  duration: string;
  eventDate: string; // ISO YYYY-MM-DD
  description: string;
  tags: string[];
};

const ENCONTROS: EncontroLesson[] = [
  {
    id: "encontro-2026-05-11-preenchedores",
    title: "Introdução a Preenchedores",
    youtubeId: "wTF5z_SyOxA",
    duration: "1:12:55",
    eventDate: "2026-05-11",
    description:
      "Encontro dedicado ao uso racional dos preenchedores faciais, com foco em ácido hialurônico como biomaterial implantável. A aula discute dosagem, limites por sessão e por região, exceções clínicas, integração tecidual, comportamento de diferentes produtos, agentes reticuladores e o cuidado de não confundir preenchimento estético com tratamento tecidual. Também aborda skinboosters, hidratação, permanência do material e raciocínio para evitar excesso de volume e distorções ao longo do tempo.",
    tags: ["Preenchedores", "Ácido hialurônico", "Biomateriais", "Reologia", "Dosagem", "Segurança"],
  },
  {
    id: "encontro-2026-04-29-glp1",
    title: "Emagrecimento com GLP-1 e Impacto na Bioestimulação Facial",
    youtubeId: "goiWQhlKpKw",
    duration: "1:04:30",
    eventDate: "2026-04-29",
    description:
      "Encontro sobre o impacto das canetas emagrecedoras e agonistas de GLP-1 na estética facial e na resposta a bioestimuladores. A aula discute o cenário atual de emagrecimento acelerado com semaglutida, tirzepatida e medicamentos semelhantes, os efeitos da perda rápida de gordura na face, a relação com flacidez, envelhecimento aparente e planejamento de preenchedores e bioestimuladores. O foco é conduzir o paciente antes, durante e depois do emagrecimento, com raciocínio clínico para preservar naturalidade, suporte e qualidade tecidual.",
    tags: ["GLP-1", "Emagrecimento", "Bioestimulação", "Flacidez", "Preenchedores", "Planejamento facial"],
  },
  {
    id: "encontro-2026-04-15-neocolagenese",
    title: "Neocolagênese e IA para Estudar",
    youtubeId: "RbKS4I_KCqk",
    duration: "1:26:17",
    eventDate: "2026-04-15",
    description:
      "Aula sobre fundamentos da neocolagênese, bioestimuladores e uso de inteligência artificial como ferramenta de estudo na harmonização facial. O encontro revisa fibroblastos, colágeno tipos I e III, elastina, proteoglicanos, mecanotransdução, estímulos bioquímicos e diferenças entre hidroxiapatita de cálcio, PLLA e PDO. Também conecta o raciocínio ao protocolo NaturalUp, ao papel do PDRN e cofatores como vitamina C e zinco, além de mostrar formas práticas de usar IA para estudar artigos, criar resumos e melhorar a prática clínica.",
    tags: ["Neocolagênese", "Bioestimuladores", "Radiesse", "PLLA", "PDO", "PDRN", "NaturalUp", "Inteligência Artificial"],
  },
];

const WHATSAPP_RENEW_URL =
  "https://wa.me/5521976263881?text=" +
  encodeURIComponent(
    "Olá Dr. Gustavo, gostaria de renovar meu plano para participar dos encontros quinzenais e ter acesso às gravações.",
  );

const CTA_LOCKED = "Renove seu plano para participar dos próximos encontros e assistir às gravações";

function formatEventDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function ytEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&disablekb=0&fs=1`;
}

function ytThumbUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}

export default function EncontrosQuinzenaisPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<EncontroLesson | null>(null);

  const hasAccess = hasMentoriaAtiva({
    planKey: user?.planKey ?? null,
    role: user?.role ?? null,
  });

  // ───── Lesson view ─────────────────────────────────────────────────────
  if (selected) {
    const idx = ENCONTROS.findIndex((e) => e.id === selected.id);
    const prev = idx > 0 ? ENCONTROS[idx - 1] : null;
    const next = idx < ENCONTROS.length - 1 ? ENCONTROS[idx + 1] : null;

    return (
      <div className="min-h-screen bg-background overflow-x-hidden netflix-theme">
        <header className="border-b border-border/50 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
            <button
              onClick={() => setSelected(null)}
              className="shrink-0 text-sm text-muted-foreground hover:text-gold flex items-center gap-1 transition-colors"
              data-testid="button-back-to-encontros"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
            <span className="flex-1 text-center text-xs font-medium text-gold-muted uppercase tracking-wider truncate px-1">
              Encontros Quinzenais
            </span>
            <div className="shrink-0 w-14" />
          </div>
        </header>

        <div className="max-w-6xl mx-auto p-4 lg:p-6">
          <div className="block lg:grid lg:grid-cols-[1fr_320px] lg:items-start gap-6 space-y-6 lg:space-y-0">
            <div className="space-y-4 min-w-0 lg:sticky lg:top-4 lg:self-start">
              {hasAccess ? (
                <div className="space-y-1">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden ring-1 ring-border/30">
                    <iframe
                      src={ytEmbedUrl(selected.youtubeId)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; remote-playback"
                      allowFullScreen
                      title={selected.title}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 text-right">
                    Assistir na TV? Use o Chromecast/AirPlay pelo botão do player YouTube
                  </p>
                </div>
              ) : (
                <div
                  className="aspect-video bg-card rounded-lg flex items-center justify-center ring-1 ring-border/30 relative"
                  data-testid="encontros-lesson-locked"
                >
                  <div className="text-center space-y-3 px-6 max-w-md">
                    <Lock className="w-10 h-10 text-gold/60 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">
                      Aula bloqueada
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {CTA_LOCKED}.
                    </p>
                    <a
                      href={WHATSAPP_RENEW_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        backgroundColor: "#D4A843",
                        color: "#0A0D14",
                        padding: "10px 24px",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 700,
                        textDecoration: "none",
                        display: "inline-block",
                      }}
                    >
                      Renovar meu plano
                    </a>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-foreground">{selected.title}</h2>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {formatEventDate(selected.eventDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {selected.duration}
                      </span>
                    </p>
                  </div>
                </div>

                {hasAccess && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selected.description}
                  </p>
                )}

                {selected.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags.map((t) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className="border-gold/20 bg-gold/5 text-gold text-[10px]"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <div className="flex-1" />
                  {prev && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border/50"
                      onClick={() => setSelected(prev)}
                    >
                      Anterior
                    </Button>
                  )}
                  {next && (
                    <Button
                      size="sm"
                      className="bg-gold text-background hover:bg-gold/90"
                      onClick={() => setSelected(next)}
                    >
                      Próxima
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:rounded-lg lg:border lg:border-border/30 lg:bg-card/30 lg:p-3 space-y-2">
              <h3 className="text-xs font-semibold text-gold-muted uppercase tracking-brand mb-3 lg:sticky lg:top-0 lg:bg-card/80 lg:backdrop-blur lg:py-2 lg:-mx-3 lg:px-3 lg:z-10">
                Aulas do módulo
              </h3>
              {ENCONTROS.map((lesson, i) => {
                const isActive = lesson.id === selected.id;
                const locked = !hasAccess;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => setSelected(lesson)}
                    className={`w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3 ${
                      isActive
                        ? "bg-primary/10 border border-gold/20"
                        : locked
                          ? "opacity-70 hover:bg-card/60"
                          : "hover:bg-card/80"
                    }`}
                    data-testid={`button-encontro-${lesson.id}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {locked ? (
                        <Lock className="w-4 h-4 text-muted-foreground/60" />
                      ) : (
                        <span className="w-4 h-4 flex items-center justify-center text-xs text-muted-foreground font-medium">
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? "text-gold" : ""}`}>
                        {lesson.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatEventDate(lesson.eventDate)} · {lesson.duration}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───── Module index view ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background overflow-x-hidden netflix-theme">
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => setLocation("/")}
            className="shrink-0 text-sm text-muted-foreground hover:text-gold flex items-center gap-1 transition-colors"
            data-testid="button-back-to-dashboard"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="flex items-center gap-2 text-gold">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Encontros Quinzenais
            </span>
          </div>
          <div className="shrink-0 w-14" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:py-10 space-y-8">
        {/* Hero */}
        <section className="rounded-2xl border border-gold/20 bg-gradient-to-br from-[#14213D] via-[#0A1628] to-[#0A0D14] p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
            backgroundImage: "radial-gradient(circle at 20% 20%, #D4A843 0%, transparent 50%)",
          }} />
          <div className="relative space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
              <span className="text-[11px] font-semibold text-gold uppercase tracking-wider">
                Mentoria ao vivo
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-white leading-tight">
              Encontros Quinzenais
            </h1>
            <p className="text-sm text-white/70 max-w-2xl leading-relaxed">
              Gravações das aulas online da mentoria — encontros quinzenais com o Dr. Gustavo
              Martins. Discussões aprofundadas, casos clínicos e protocolos avançados.
            </p>
            <div className="flex items-center gap-4 text-xs text-white/50 pt-1">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-gold/70" />
                {ENCONTROS.length} {ENCONTROS.length === 1 ? "aula" : "aulas"}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gold/70" />
                Toda quinzena
              </span>
            </div>
          </div>
        </section>

        {/* Gate banner */}
        {!hasAccess && (
          <Card
            className="border-gold/30 bg-gradient-to-r from-gold/10 via-gold/5 to-transparent"
            data-testid="encontros-gate-banner"
          >
            <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Lock className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Módulo exclusivo da mentoria
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {CTA_LOCKED}.
                  </p>
                </div>
              </div>
              <a
                href={WHATSAPP_RENEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-xl bg-gold/90 hover:bg-gold px-5 py-2.5 text-sm font-semibold text-[#0A0D14] transition-colors text-center"
                data-testid="encontros-cta-renew"
              >
                Renovar meu plano
              </a>
            </CardContent>
          </Card>
        )}

        {/* Lessons list */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl font-semibold text-foreground">
            Gravações disponíveis
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ENCONTROS.map((lesson) => {
              const locked = !hasAccess;
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => setSelected(lesson)}
                  className={`group text-left rounded-2xl overflow-hidden border bg-card/60 transition-all duration-300 ${
                    locked
                      ? "border-border/30 hover:border-gold/30"
                      : "border-border/40 hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
                  }`}
                  data-testid={`encontros-card-${lesson.id}`}
                >
                  {/* Thumb */}
                  <div className="relative aspect-video bg-black overflow-hidden">
                    <img
                      src={ytThumbUrl(lesson.youtubeId)}
                      alt=""
                      className={`w-full h-full object-cover transition-all ${
                        locked ? "blur-[3px] scale-[1.02] opacity-50" : "group-hover:scale-105"
                      }`}
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {locked ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0A1628]/40 backdrop-blur-[2px]">
                        <Lock className="w-7 h-7 text-gold/80" />
                        <span className="text-[10px] font-semibold text-gold/90 uppercase tracking-wider bg-[#0A1628]/60 px-2.5 py-1 rounded-full">
                          Renove seu plano
                        </span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-gold/90 flex items-center justify-center">
                          <Play className="w-5 h-5 text-[#0A0D14] ml-0.5 fill-[#0A0D14]" />
                        </div>
                      </div>
                    )}

                    {/* Duration badge */}
                    <div className="absolute bottom-2 right-2 rounded-md bg-black/70 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-white">
                      <Clock className="w-2.5 h-2.5 inline mr-1 -mt-0.5" />
                      {lesson.duration}
                    </div>
                  </div>

                  {/* Text */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-sm text-foreground leading-snug line-clamp-2 min-h-[2.5rem]">
                      {lesson.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {formatEventDate(lesson.eventDate)}
                    </p>
                    {locked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gold/80 mt-1">
                        <Lock className="w-3 h-3" />
                        Plano sem acesso
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gold mt-1">
                        <PlayCircle className="w-3 h-3" />
                        Assistir gravação
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Footer note */}
        <div className="text-center text-[11px] text-muted-foreground/60 pt-4">
          Os encontros são quinzenais e exclusivos da mentoria ao vivo. As gravações ficam
          disponíveis para alunos com mentoria ativa.
        </div>
      </main>
    </div>
  );
}
