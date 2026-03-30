import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, Play, CheckCircle2, Circle, Clock, ChevronLeft,
  ChevronRight, Layers, Lock, Paperclip, ExternalLink, ShoppingCart
} from "lucide-react";
import type { Module, Lesson, LessonProgress } from "@shared/schema";

function linkifyText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gold underline hover:text-gold/80"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

function getFirstDescLine(desc: string): string | null {
  if (!desc) return null;
  const firstLine = desc.split('\n')[0].trim();
  if (firstLine.startsWith('http') || firstLine.startsWith('Drive com') || firstLine.startsWith('Links')) return null;
  return firstLine;
}

// Module theme colors
const MODULE_THEMES: Record<string, { accent: string; accentRgb: string; gradient: string; progressBg: string; activeBg: string; accentText: string }> = {
  toxina: {
    accent: "#D4A843",
    accentRgb: "212, 168, 67",
    gradient: "from-amber-900/80 via-amber-950/60 to-background",
    progressBg: "bg-amber-500",
    activeBg: "bg-amber-500/10 border-amber-500/20",
    accentText: "text-amber-400",
  },
  preenchedores: {
    accent: "#E8829B",
    accentRgb: "232, 130, 155",
    gradient: "from-rose-900/80 via-rose-950/60 to-background",
    progressBg: "bg-rose-400",
    activeBg: "bg-rose-500/10 border-rose-500/20",
    accentText: "text-rose-400",
  },
  bioestimulador: {
    accent: "#34D399",
    accentRgb: "52, 211, 153",
    gradient: "from-emerald-900/80 via-emerald-950/60 to-background",
    progressBg: "bg-emerald-400",
    activeBg: "bg-emerald-500/10 border-emerald-500/20",
    accentText: "text-emerald-400",
  },
  modulador: {
    accent: "#DC2626",
    accentRgb: "220, 38, 38",
    gradient: "from-red-900/80 via-red-950/60 to-background",
    progressBg: "bg-red-500",
    activeBg: "bg-red-500/10 border-red-500/20",
    accentText: "text-red-400",
  },
  naturalup: {
    accent: "#22D3EE",
    accentRgb: "34, 211, 238",
    gradient: "from-cyan-900/80 via-cyan-950/60 to-background",
    progressBg: "bg-cyan-400",
    activeBg: "bg-cyan-500/10 border-cyan-500/20",
    accentText: "text-cyan-400",
  },
};

function getModuleTheme(title: string) {
  const t = title.toLowerCase();
  if (t.includes("toxina")) return MODULE_THEMES.toxina;
  if (t.includes("preenchedores") || t.includes("ácido") || t.includes("acido")) return MODULE_THEMES.preenchedores;
  if (t.includes("bioestimulador")) return MODULE_THEMES.bioestimulador;
  if (t.includes("regeneração") || t.includes("regeneracao") || t.includes("modulador") || t.includes("matriz")) return MODULE_THEMES.modulador;
  if (t.includes("naturalup") || t.includes("natural up") || t.includes("método") || t.includes("metodo")) return MODULE_THEMES.naturalup;
  return MODULE_THEMES.toxina; // default gold
}

function getCourseImage(mod: Module): string | null {
  const title = mod.title.toLowerCase();
  if (title.includes("toxina")) return "/images/course-toxina.png";
  if (title.includes("preenchedores") || title.includes("ácido") || title.includes("acido")) return "/images/course-preenchedores.png";
  if (title.includes("bioestimulador")) return "/images/bioestimuladores-colageno.png";
  if (title.includes("regeneração") || title.includes("regeneracao") || title.includes("modulador") || title.includes("matriz")) return "/images/moduladores-matriz.png";
  if (title.includes("naturalup") || title.includes("natural up") || title.includes("método") || title.includes("metodo")) return "/images/metodo-naturalup.png";
  return null;
}

export default function ModulePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/module/:id");
  const moduleId = params?.id ? parseInt(params.id) : null;

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const { data: modules = [] } = useQuery<Module[]>({ queryKey: ["/api/modules"] });
  const { data: lessons = [] } = useQuery<Lesson[]>({ queryKey: ["/api/lessons"] });
  const { data: progress = [] } = useQuery<LessonProgress[]>({
    queryKey: ["/api/progress", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/progress/${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });
  const { data: myModules } = useQuery<{ accessAll: boolean; moduleIds: number[] }>({
    queryKey: ["/api/my-modules"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/my-modules");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const completeMutation = useMutation({
    mutationFn: async ({ lessonId, complete }: { lessonId: number; complete: boolean }) => {
      const endpoint = complete
        ? `/api/progress/${user?.id}/lesson/${lessonId}/complete`
        : `/api/progress/${user?.id}/lesson/${lessonId}/incomplete`;
      await apiRequest("POST", endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress", user?.id] });
    },
  });

  const currentModule = modules.find(m => m.id === moduleId);
  const completedIds = new Set(progress.filter(p => p.completed).map(p => p.lessonId));

  // Sort modules to find intro
  const sortedModules = [...modules].sort((a, b) => a.order - b.order);
  const introModule = sortedModules.find(m => m.order === 1 || m.title.toLowerCase().includes("boas vindas") || m.title.toLowerCase().includes("boas-vindas"));
  const courseModules = sortedModules.filter(m => m !== introModule);

  // Get lessons for this module, merge intro lessons into first course module
  const introLessons = introModule ? lessons.filter(l => l.moduleId === introModule.id).sort((a, b) => a.order - b.order) : [];
  const isFirstCourse = courseModules.length > 0 && currentModule?.id === courseModules[0].id;
  const moduleLessons = currentModule
    ? [
        ...(isFirstCourse ? introLessons : []),
        ...lessons.filter(l => l.moduleId === currentModule.id).sort((a, b) => a.order - b.order),
      ]
    : [];

  const completedInModule = moduleLessons.filter(l => completedIds.has(l.id)).length;
  const moduleProgress = moduleLessons.length > 0 ? Math.round((completedInModule / moduleLessons.length) * 100) : 0;

  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    return url;
  };

  if (!currentModule) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Módulo não encontrado</p>
          <Button variant="outline" onClick={() => setLocation("/")}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Voltar ao dashboard
          </Button>
        </div>
      </div>
    );
  }

  const theme = getModuleTheme(currentModule.title);
  const courseImage = getCourseImage(currentModule);
  const hasContent = moduleLessons.length > 0;

  // Check module access
  const isBoasVindas = currentModule.order === 1 || currentModule.title.toLowerCase().includes("boas vindas") || currentModule.title.toLowerCase().includes("boas-vindas");
  const hasAccess = isBoasVindas || !myModules || myModules.accessAll || myModules.moduleIds.includes(currentModule.id);
  const isUnlocked = hasContent && hasAccess;
  const isLocked = hasContent && !hasAccess;

  const getWhatsAppUrl = () => {
    const msg = encodeURIComponent(`Olá! Tenho interesse em adquirir o módulo ${currentModule.title} da mentoria Ampla Facial. Meu email de acesso é ${user?.email || ""}.`);
    return `https://wa.me/5521976310365?text=${msg}`;
  };

  const videoRef = useRef<HTMLDivElement>(null);

  const handleSelectLesson = useCallback((lesson: Lesson) => {
    setSelectedLesson(lesson);
    // On mobile, scroll to the video when selecting a lesson
    if (window.innerWidth < 1024 && videoRef.current) {
      videoRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // ========== LESSON VIEW ==========
  if (selectedLesson && !isLocked) {
    const embedUrl = getEmbedUrl(selectedLesson.videoUrl || "");
    const isCompleted = completedIds.has(selectedLesson.id);
    const currentIdx = moduleLessons.findIndex(l => l.id === selectedLesson.id);
    const nextLesson = moduleLessons[currentIdx + 1];
    const prevLesson = moduleLessons[currentIdx - 1];

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/50 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between">
            <button
              onClick={() => setSelectedLesson(null)}
              className="text-sm text-muted-foreground hover:text-gold flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: theme.accent }}>{currentModule.title}</span>
          </div>
        </header>

        {/* Desktop: side-by-side, fills viewport below header */}
        <div className="flex-1 hidden lg:flex" style={{ height: "calc(100vh - 3.5rem)" }}>
          {/* Left: Video + details (60-65%) */}
          <div className="flex-[3] overflow-y-auto p-6">
            <div className="max-w-4xl space-y-4">
              {embedUrl ? (
                <div className="aspect-video bg-black rounded-lg overflow-hidden ring-1 ring-border/30">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={selectedLesson.title}
                  />
                </div>
              ) : (
                <div className="aspect-video bg-card rounded-lg flex items-center justify-center ring-1 ring-border/30">
                  <div className="text-center space-y-2 text-muted-foreground">
                    <Play className="w-12 h-12 mx-auto opacity-30" />
                    <p className="text-sm">Video sera adicionado em breve</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{selectedLesson.title}</h2>
                    {selectedLesson.description && (
                      <p className="text-sm text-muted-foreground mt-1">{linkifyText(selectedLesson.description)}</p>
                    )}
                  </div>
                  {selectedLesson.duration && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {selectedLesson.duration}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={isCompleted ? "secondary" : "default"}
                    size="sm"
                    style={!isCompleted ? { backgroundColor: theme.accent, color: "#0C1A21" } : undefined}
                    className={isCompleted ? "" : "hover:opacity-90"}
                    onClick={() => completeMutation.mutate({ lessonId: selectedLesson.id, complete: !isCompleted })}
                  >
                    {isCompleted ? (
                      <><CheckCircle2 className="w-4 h-4 mr-1.5" />Concluida</>
                    ) : (
                      <><Circle className="w-4 h-4 mr-1.5" />Marcar como concluida</>
                    )}
                  </Button>

                  <div className="flex-1" />

                  {prevLesson && (
                    <Button variant="outline" size="sm" className="border-border/50" onClick={() => handleSelectLesson(prevLesson)}>
                      Anterior
                    </Button>
                  )}
                  {nextLesson && (
                    <Button
                      size="sm"
                      style={{ backgroundColor: theme.accent, color: "#0C1A21" }}
                      className="hover:opacity-90"
                      onClick={() => handleSelectLesson(nextLesson)}
                    >
                      Proxima
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Lesson list sidebar (35-40%) */}
          <div className="flex-[2] border-l border-border/50 overflow-y-auto bg-card/30">
            <div className="p-4">
              <h3 className="text-xs font-semibold uppercase tracking-brand mb-3" style={{ color: theme.accent }}>
                Aulas do modulo
              </h3>
              <div className="space-y-1">
                {moduleLessons.map((lesson, i) => {
                  const done = completedIds.has(lesson.id);
                  const isActive = lesson.id === selectedLesson.id;
                  const descLine = lesson.description ? getFirstDescLine(lesson.description) : null;
                  const supportUrl = lesson.description ? extractFirstUrl(lesson.description) : null;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => handleSelectLesson(lesson)}
                      className={`w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3 ${
                        isActive
                          ? theme.activeBg + " border"
                          : "hover:bg-card/80"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {done ? (
                          <CheckCircle2 className="w-4 h-4" style={{ color: theme.accent }} />
                        ) : (
                          <span className="w-4 h-4 flex items-center justify-center text-xs text-muted-foreground font-medium">
                            {i + 1}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? theme.accentText : ""}`}>
                          {lesson.title}
                        </p>
                        {descLine && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
                            {descLine}
                          </p>
                        )}
                        {supportUrl && (
                          <a
                            href={supportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] mt-0.5 hover:underline"
                            style={{ color: theme.accent }}
                          >
                            <Paperclip className="w-3 h-3" />
                            Material de apoio
                          </a>
                        )}
                        {lesson.duration && (
                          <p className="text-xs text-muted-foreground mt-0.5">{lesson.duration}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: stacked layout */}
        <div className="lg:hidden">
          <div className="p-4 space-y-4" ref={videoRef}>
            {embedUrl ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden ring-1 ring-border/30">
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={selectedLesson.title}
                />
              </div>
            ) : (
              <div className="aspect-video bg-card rounded-lg flex items-center justify-center ring-1 ring-border/30">
                <div className="text-center space-y-2 text-muted-foreground">
                  <Play className="w-12 h-12 mx-auto opacity-30" />
                  <p className="text-sm">Video sera adicionado em breve</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{selectedLesson.title}</h2>
                  {selectedLesson.description && (
                    <p className="text-sm text-muted-foreground mt-1">{linkifyText(selectedLesson.description)}</p>
                  )}
                </div>
                {selectedLesson.duration && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {selectedLesson.duration}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={isCompleted ? "secondary" : "default"}
                  size="sm"
                  style={!isCompleted ? { backgroundColor: theme.accent, color: "#0C1A21" } : undefined}
                  className={isCompleted ? "" : "hover:opacity-90"}
                  onClick={() => completeMutation.mutate({ lessonId: selectedLesson.id, complete: !isCompleted })}
                >
                  {isCompleted ? (
                    <><CheckCircle2 className="w-4 h-4 mr-1.5" />Concluida</>
                  ) : (
                    <><Circle className="w-4 h-4 mr-1.5" />Marcar como concluida</>
                  )}
                </Button>

                <div className="flex-1" />

                {prevLesson && (
                  <Button variant="outline" size="sm" className="border-border/50" onClick={() => handleSelectLesson(prevLesson)}>
                    Anterior
                  </Button>
                )}
                {nextLesson && (
                  <Button
                    size="sm"
                    style={{ backgroundColor: theme.accent, color: "#0C1A21" }}
                    className="hover:opacity-90"
                    onClick={() => handleSelectLesson(nextLesson)}
                  >
                    Proxima
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile lesson list */}
          <div className="border-t border-border/50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-brand mb-3" style={{ color: theme.accent }}>
              Aulas do modulo
            </h3>
            <div className="space-y-1">
              {moduleLessons.map((lesson, i) => {
                const done = completedIds.has(lesson.id);
                const isActive = lesson.id === selectedLesson.id;
                const descLine = lesson.description ? getFirstDescLine(lesson.description) : null;
                const supportUrl = lesson.description ? extractFirstUrl(lesson.description) : null;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => handleSelectLesson(lesson)}
                    className={`w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3 ${
                      isActive
                        ? theme.activeBg + " border"
                        : "hover:bg-card/80"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {done ? (
                        <CheckCircle2 className="w-4 h-4" style={{ color: theme.accent }} />
                      ) : (
                        <span className="w-4 h-4 flex items-center justify-center text-xs text-muted-foreground font-medium">
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? theme.accentText : ""}`}>
                        {lesson.title}
                      </p>
                      {descLine && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
                          {descLine}
                        </p>
                      )}
                      {supportUrl && (
                        <a
                          href={supportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] mt-0.5 hover:underline text-gold"
                        >
                          <Paperclip className="w-3 h-3" />
                          Material de apoio
                        </a>
                      )}
                      {lesson.duration && (
                        <p className="text-xs text-muted-foreground mt-0.5">{lesson.duration}</p>
                      )}
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

  // ========== MODULE PAGE (HERO + LESSON LIST) ==========
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="relative">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={courseImage
            ? { backgroundImage: `url(${courseImage})` }
            : { background: "linear-gradient(135deg, hsl(200 45% 12%), hsl(200 55% 8%))" }
          }
        />
        {/* Dark gradient overlay with module accent tint */}
        <div className={`absolute inset-0 bg-gradient-to-b ${theme.gradient}`} />
        <div className="absolute inset-0 bg-background/40" />

        {/* Hero content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-10 sm:pb-14">
          {/* Back button */}
          <button
            onClick={() => setLocation("/")}
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white mb-8 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </button>

          <div className="space-y-4">
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight">
              {currentModule.title}
            </h1>
            {currentModule.description && (
              <p className="text-white/70 text-sm sm:text-base max-w-2xl leading-relaxed">
                {currentModule.description}
              </p>
            )}

            <div className="flex items-center gap-4 pt-2">
              <span className="flex items-center gap-1.5 text-sm text-white/60">
                <BookOpen className="w-4 h-4" />
                {moduleLessons.length} {moduleLessons.length === 1 ? "aula" : "aulas"}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-white/60">
                <CheckCircle2 className="w-4 h-4" />
                {completedInModule} concluida{completedInModule !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Progress bar */}
            {isUnlocked && !isLocked && (
              <div className="max-w-md pt-1">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-white/50">Progresso</span>
                  <span className="font-medium" style={{ color: theme.accent }}>{moduleProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${moduleProgress}%`, backgroundColor: theme.accent }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Locked Module Banner */}
      {isLocked && (
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-6">
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-5 sm:p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7 text-gold" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground text-lg">Este módulo não está incluso no seu plano atual</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Entre em contato pelo WhatsApp para adquirir acesso a este módulo individualmente.
              </p>
            </div>
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#22c55e] text-white font-semibold px-6 py-3 text-sm transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Adquirir este módulo
            </a>
          </div>
        </div>
      )}

      {/* Lesson List */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        {!hasContent ? (
          <div className="text-center py-16 space-y-4">
            <Lock className="w-12 h-12 text-gold/40 mx-auto" />
            <p className="text-lg font-semibold text-foreground">Conteudo em breve</p>
            <p className="text-sm text-muted-foreground">
              Este modulo ainda esta sendo preparado. Fique atento para novidades!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {moduleLessons.map((lesson, i) => {
              const done = completedIds.has(lesson.id);
              const supportUrl = lesson.description ? extractFirstUrl(lesson.description) : null;
              const descLine = lesson.description ? getFirstDescLine(lesson.description) : null;

              return (
                <div
                  key={lesson.id}
                  onClick={() => !isLocked && setSelectedLesson(lesson)}
                  className={`w-full text-left group ${isLocked ? "cursor-default opacity-60" : "cursor-pointer"}`}
                >
                  <div className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 border border-transparent ${!isLocked ? "hover:bg-card/60 hover:border-border/30" : ""}`}>
                    {/* Lesson number */}
                    <span className="w-8 text-center text-sm font-medium text-muted-foreground shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    {/* Play icon */}
                    <div className="shrink-0">
                      {isLocked ? (
                        <div className="w-10 h-10 rounded-full bg-card border border-border/40 flex items-center justify-center">
                          <Lock className="w-4 h-4 text-muted-foreground/50" />
                        </div>
                      ) : done ? (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `rgba(${theme.accentRgb}, 0.15)` }}>
                          <CheckCircle2 className="w-5 h-5" style={{ color: theme.accent }} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-card border border-border/40 flex items-center justify-center group-hover:border-border/60 transition-colors">
                          <Play className="w-4 h-4 text-muted-foreground ml-0.5" />
                        </div>
                      )}
                    </div>

                    {/* Title, description and support link */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${done ? "text-foreground/70" : "text-foreground"}`}>
                        {lesson.title}
                      </p>
                      {!isLocked && descLine && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
                          {descLine}
                        </p>
                      )}
                      {!isLocked && supportUrl && (
                        <a
                          href={supportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] mt-0.5 hover:underline"
                          style={{ color: theme.accent }}
                        >
                          <Paperclip className="w-3 h-3" />
                          Material de apoio
                        </a>
                      )}
                    </div>

                    {/* Duration */}
                    {lesson.duration && (
                      <span className="text-xs text-muted-foreground shrink-0">{lesson.duration}</span>
                    )}

                    {/* Chevron */}
                    {!isLocked && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border/30 py-6 mt-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>&copy; 2026 Ampla Facial &mdash; Todos os direitos reservados</span>
          <span className="text-gold-muted font-semibold tracking-brand text-[10px]">NATURALUP&reg;</span>
        </div>
      </footer>
    </div>
  );
}
