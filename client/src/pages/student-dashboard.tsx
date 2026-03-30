import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, Play, CheckCircle2, Circle, Clock, LogOut,
  ChevronRight, ChevronLeft, Calendar, Layers, Settings, Loader2, AlertTriangle,
  Users, MessageCircle, Activity, Lock
} from "lucide-react";
import type { Module, Lesson, LessonProgress, Plan } from "@shared/schema";

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


export default function StudentDashboard() {
  const { user, logout, login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "", phone: "", currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const carouselRef = useRef<HTMLDivElement>(null);

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
  const { data: plans = [] } = useQuery<Plan[]>({ queryKey: ["/api/plans"] });

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

  const profileMutation = useMutation({
    mutationFn: async () => {
      const body: any = { currentPassword: profileForm.currentPassword };
      if (profileForm.name && profileForm.name !== user?.name) body.name = profileForm.name;
      if (profileForm.phone !== (user as any)?.phone) body.phone = profileForm.phone;
      if (profileForm.email && profileForm.email !== user?.email) body.email = profileForm.email;
      if (profileForm.newPassword) body.newPassword = profileForm.newPassword;
      const res = await apiRequest("PATCH", "/api/auth/profile", body);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.user) login(data.user);
      toast({ title: "Perfil atualizado", description: data.message });
      setProfileOpen(false);
      setProfileForm({ name: "", email: "", phone: "", currentPassword: "", newPassword: "", confirmNewPassword: "" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const completedIds = new Set(progress.filter(p => p.completed).map(p => p.lessonId));
  const totalLessons = lessons.length;
  const completedCount = completedIds.size;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const userPlan = plans.find(p => p.id === user?.planId);
  const rawDaysLeft = user?.accessExpiresAt
    ? Math.ceil((new Date(user.accessExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const daysLeft = rawDaysLeft !== null ? Math.max(0, rawDaysLeft) : 0;
  const isExpired = rawDaysLeft !== null && rawDaysLeft <= 0 && user?.approved;
  const isExpiringSoon = rawDaysLeft !== null && rawDaysLeft > 0 && rawDaysLeft <= 3;

  // Granular access control
  const communityEnabled = (user as any)?.communityAccess !== false;
  const supportEnabled = (user as any)?.supportAccess !== false;
  const supportExpiry = (user as any)?.supportExpiresAt || user?.accessExpiresAt;
  const rawSupportDaysLeft = supportExpiry
    ? Math.ceil((new Date(supportExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const supportDaysLeft = rawSupportDaysLeft !== null ? Math.max(0, rawSupportDaysLeft) : 0;
  const isSupportExpired = !supportEnabled || (rawSupportDaysLeft !== null && rawSupportDaysLeft <= 0);
  const clinicalEnabled = (user as any)?.clinicalPracticeAccess !== false;
  const clinicalHours = (user as any)?.clinicalPracticeHours || 0;

  const getLessonsForModule = (moduleId: number) =>
    lessons.filter(l => l.moduleId === moduleId).sort((a, b) => a.order - b.order);

  // Video embed logic
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

  // Map modules to course card data
  const getCourseImage = (mod: Module): string | null => {
    const title = mod.title.toLowerCase();
    if (title.includes("toxina")) return "/images/course-toxina.png";
    if (title.includes("preenchedores") || title.includes("ácido") || title.includes("acido")) return "/images/course-preenchedores.png";
    if (title.includes("bioestimulador")) return "/images/bioestimuladores-colageno.png";
    if (title.includes("regeneração") || title.includes("regeneracao") || title.includes("modulador") || title.includes("matriz")) return "/images/moduladores-matriz.png";
    if (title.includes("naturalup") || title.includes("natural up") || title.includes("método") || title.includes("metodo")) return "/images/metodo-naturalup.png";
    return null;
  };

  // ========== LESSON VIEW ==========
  if (selectedLesson) {
    const embedUrl = getEmbedUrl(selectedLesson.videoUrl || "");
    const isCompleted = completedIds.has(selectedLesson.id);
    const currentModule = modules.find(m => m.id === selectedLesson.moduleId);
    const moduleLessons = getLessonsForModule(selectedLesson.moduleId);
    const currentIdx = moduleLessons.findIndex(l => l.id === selectedLesson.id);
    const nextLesson = moduleLessons[currentIdx + 1];
    const prevLesson = moduleLessons[currentIdx - 1];

    return (
      <div className="min-h-screen bg-background">
        {/* Top bar */}
        <header className="border-b border-border/50 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <button
              onClick={() => setSelectedLesson(null)}
              className="text-sm text-muted-foreground hover:text-gold flex items-center gap-1 transition-colors"
              data-testid="button-back-to-modules"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Voltar
            </button>
            <span className="text-xs font-medium text-gold-muted uppercase tracking-wider">{currentModule?.title}</span>
          </div>
        </header>

        <div className="max-w-6xl mx-auto p-4 lg:p-6">
          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            {/* Video Area */}
            <div className="space-y-4">
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
                    className={isCompleted ? "" : "bg-gold text-background hover:bg-gold/90"}
                    onClick={() => completeMutation.mutate({ lessonId: selectedLesson.id, complete: !isCompleted })}
                    data-testid="button-toggle-complete"
                  >
                    {isCompleted ? (
                      <><CheckCircle2 className="w-4 h-4 mr-1.5" />Concluida</>
                    ) : (
                      <><Circle className="w-4 h-4 mr-1.5" />Marcar como concluida</>
                    )}
                  </Button>

                  <div className="flex-1" />

                  {prevLesson && (
                    <Button variant="outline" size="sm" className="border-border/50" onClick={() => setSelectedLesson(prevLesson)}>
                      Anterior
                    </Button>
                  )}
                  {nextLesson && (
                    <Button size="sm" className="bg-gold text-background hover:bg-gold/90" onClick={() => setSelectedLesson(nextLesson)}>
                      Proxima
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Lesson list sidebar */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gold-muted uppercase tracking-brand mb-3">
                Aulas do modulo
              </h3>
              {moduleLessons.map((lesson, i) => {
                const done = completedIds.has(lesson.id);
                const isActive = lesson.id === selectedLesson.id;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson)}
                    className={`w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3 ${
                      isActive
                        ? "bg-primary/10 border border-gold/20"
                        : "hover:bg-card/80"
                    }`}
                    data-testid={`button-lesson-${lesson.id}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 text-gold" />
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

  // ========== MAIN DASHBOARD ==========

  const firstName = user?.name?.split(" ")[0] || "";
  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  // Filter: skip "Boas vindas" / intro module (order 1), show the rest as course cards
  const sortedModules = [...modules].sort((a, b) => a.order - b.order);
  const introModule = sortedModules.find(m => m.order === 1 || m.title.toLowerCase().includes("boas vindas") || m.title.toLowerCase().includes("boas-vindas"));
  const courseModules = sortedModules.filter(m => m !== introModule);

  // Intro lessons get merged into the first course module for display
  const introLessons = introModule ? getLessonsForModule(introModule.id) : [];

  // Plan progress (days)
  const planDurationDays = userPlan?.durationDays || 365;
  const daysUsed = Math.max(0, planDurationDays - daysLeft);
  const dayProgressPercent = Math.min(100, Math.round((daysUsed / planDurationDays) * 100));

  // Carousel scroll handlers
  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = 300;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ===== HEADER ===== */}
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <img src="/logo-icon.png" alt="Ampla Facial" className="w-7 h-7 object-contain" />
            <span className="text-sm font-medium text-gold tracking-wide">AMPLA FACIAL</span>
          </div>

          {/* Right: User info */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-sm font-medium text-foreground leading-none">{firstName}</span>
              {userPlan && <span className="text-[10px] text-gold-muted mt-0.5">{userPlan.name}</span>}
            </div>
            <div className="w-9 h-9 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center">
              <span className="text-xs font-semibold text-gold">{initials}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-gold h-9 w-9 p-0"
              onClick={() => {
                setProfileForm({
                  name: user?.name || "",
                  email: user?.email || "",
                  phone: (user as any)?.phone || "",
                  currentPassword: "",
                  newPassword: "",
                  confirmNewPassword: "",
                });
                setProfileOpen(true);
              }}
              data-testid="button-settings"
              title="Configuracoes"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-gold h-9 w-9 p-0" onClick={logout} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:py-10 space-y-10">

          {/* Access expiry banners */}
          {isExpired && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">Seu acesso expirou</p>
                <p className="text-sm text-destructive/80 mt-1">
                  Entre em contato com o administrador para renovar seu plano.
                </p>
              </div>
            </div>
          )}
          {isExpiringSoon && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-500">
                  Seu acesso expira em {rawDaysLeft} {rawDaysLeft === 1 ? "dia" : "dias"}
                </p>
                <p className="text-sm text-amber-500/80 mt-1">
                  Entre em contato para renovacao.
                </p>
              </div>
            </div>
          )}

          {/* ===== HERO WELCOME ===== */}
          <section className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
            <div className="space-y-3">
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-foreground leading-tight">
                Bem-vindo a sua mentoria, <span className="text-gold">{firstName}</span>
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base max-w-lg leading-relaxed">
                Explore os cursos do Metodo NaturalUp&reg; e evolua sua pratica clinica em harmonizacao facial com excelencia e naturalidade.
              </p>
            </div>
            {/* Plan card */}
            <div className="rounded-2xl border border-border/40 bg-card/80 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gold-muted uppercase tracking-brand">Seu Plano</span>
                <Badge variant="secondary" className="text-xs bg-gold/10 text-gold border-0">{userPlan?.name || "\u2014"}</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso do plano</span>
                  <span className="font-medium text-gold">{daysUsed}/{planDurationDays} dias</span>
                </div>
                <Progress value={dayProgressPercent} className="h-1.5 bg-border/30" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Dias restantes</span>
                <span className="font-semibold text-foreground">{daysLeft}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Aulas concluidas</span>
                <span className="font-medium text-gold">{completedCount}/{totalLessons}</span>
              </div>
            </div>
          </section>

          {/* ===== BOAS VINDAS (Featured/Hero Section) ===== */}
          {introModule && introLessons.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-semibold text-foreground">Boas-Vindas</h2>
              <div
                className="relative rounded-2xl overflow-hidden border border-gold/20 bg-gradient-to-r from-card via-card/90 to-card/70 cursor-pointer transition-all duration-300 hover:border-gold/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
                onClick={() => setLocation(`/module/${introModule.id}`)}
              >
                <div className="flex items-center gap-6 p-5 sm:p-6">
                  <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 text-gold" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <h3 className="font-semibold text-foreground text-base sm:text-lg">{introModule.title}</h3>
                    {introModule.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{introModule.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        {introLessons.length} {introLessons.length === 1 ? "aula" : "aulas"}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gold" />
                        {introLessons.filter(l => completedIds.has(l.id)).length}/{introLessons.length}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gold/60 shrink-0 hidden sm:block" />
                </div>
              </div>
            </section>
          )}

          {/* ===== SEUS CURSOS — BOOK COVER CAROUSEL ===== */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-semibold text-foreground">Seus Cursos</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{courseModules.length} cursos</span>
                <div className="hidden sm:flex items-center gap-1.5">
                  <button
                    onClick={() => scrollCarousel("left")}
                    className="w-7 h-7 rounded-full border border-border/40 bg-card/60 flex items-center justify-center text-muted-foreground hover:text-gold hover:border-gold/30 transition-colors"
                    aria-label="Rolar para esquerda"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => scrollCarousel("right")}
                    className="w-7 h-7 rounded-full border border-border/40 bg-card/60 flex items-center justify-center text-muted-foreground hover:text-gold hover:border-gold/30 transition-colors"
                    aria-label="Rolar para direita"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Book cover carousel */}
            <div
              ref={carouselRef}
              className="carousel-shelf flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6"
            >
              {courseModules.map((mod, idx) => {
                const modLessons = getLessonsForModule(mod.id);
                const allLessons = idx === 0 ? [...introLessons, ...modLessons] : modLessons;
                const isUnlocked = allLessons.length > 0;
                const courseImage = getCourseImage(mod);
                const courseNumber = String(idx + 1).padStart(2, "0");

                return (
                  <div key={mod.id} className="carousel-card shrink-0 flex flex-col">
                    {/* Book cover card */}
                    <div
                      className="relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)] group"
                      style={{ aspectRatio: "3/4" }}
                      onClick={() => {
                        if (isUnlocked) {
                          setLocation(`/module/${mod.id}`);
                        }
                      }}
                      data-testid={`button-module-${mod.id}`}
                    >
                      {/* Cover image */}
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={courseImage
                          ? { backgroundImage: `url(${courseImage})` }
                          : { background: "linear-gradient(135deg, hsl(200 45% 12%), hsl(200 55% 8%))" }
                        }
                      />

                      {/* Dark gradient at bottom for title */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      {/* Module number badge top-left */}
                      <span className="absolute top-2 left-2 w-6 h-6 rounded-md bg-black/50 backdrop-blur-sm flex items-center justify-center text-[9px] font-bold text-white/70 tracking-wider">
                        {courseNumber}
                      </span>

                      {/* Status badge top-right */}
                      <div className="absolute top-2 right-2">
                        {isUnlocked ? (
                          <span className="inline-flex items-center rounded-md bg-emerald-500/25 backdrop-blur-sm border border-emerald-500/30 px-1.5 py-0.5 text-[8px] font-bold text-emerald-300 uppercase tracking-wider">
                            Liberado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-black/40 backdrop-blur-sm border border-white/10 px-1.5 py-0.5 text-[8px] font-bold text-white/60 uppercase tracking-wider">
                            <Lock className="w-2.5 h-2.5" />
                            Em breve
                          </span>
                        )}
                      </div>

                      {/* Locked overlay */}
                      {!isUnlocked && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
                          <Lock className="w-7 h-7 text-white/30" />
                        </div>
                      )}

                      {/* Title overlaid on gradient */}
                      <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3">
                        <h3 className="text-white font-bold text-[11px] sm:text-[13px] leading-tight line-clamp-2 drop-shadow-md">
                          {mod.title}
                        </h3>
                      </div>
                    </div>

                    {/* Lesson count below card */}
                    <div className="mt-1.5 px-0.5">
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                        {allLessons.length} {allLessons.length === 1 ? "aula" : "aulas"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ===== RECURSOS EXCLUSIVOS ===== */}
          <section className="space-y-5">
            <h2 className="font-serif text-2xl font-semibold text-foreground">Recursos Exclusivos</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {/* Comunidade — Lifetime access (respects communityAccess toggle) */}
              {communityEnabled ? (
                <a
                  href="https://chat.whatsapp.com/C8pP9ctYkso5kH89l1CHHl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl border border-border/40 bg-card/60 p-5 space-y-3 transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
                >
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">Comunidade NaturalUp&reg;</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Conecte-se com outros profissionais, troque experiencias e evolua junto com a comunidade.</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                      Acesso Vitalicio
                    </span>
                  </div>
                  <span className="inline-flex items-center text-xs font-medium text-gold group-hover:underline">
                    Acessar comunidade <ChevronRight className="w-3 h-3 ml-1" />
                  </span>
                </a>
              ) : (
                <div className="rounded-2xl border border-destructive/30 bg-card/60 p-5 space-y-3 opacity-60 cursor-not-allowed">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">Comunidade NaturalUp&reg;</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Conecte-se com outros profissionais, troque experiencias e evolua junto com a comunidade.</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-destructive/15 border border-destructive/30 px-2 py-0.5 text-[10px] font-semibold text-destructive uppercase tracking-wider">
                      Acesso Desabilitado
                    </span>
                  </div>
                  <span className="inline-flex items-center text-xs font-medium text-muted-foreground">
                    Acessar comunidade <ChevronRight className="w-3 h-3 ml-1" />
                  </span>
                </div>
              )}
              {/* Tire Duvidas — respects supportAccess toggle and supportExpiresAt */}
              {isSupportExpired ? (
                <div className="rounded-2xl border border-destructive/30 bg-card/60 p-5 space-y-3 opacity-60 cursor-not-allowed">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">Tire Duvidas com Dr. Gustavo</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Envie suas perguntas diretamente e receba orientacoes personalizadas do mentor.</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-destructive/15 border border-destructive/30 px-2 py-0.5 text-[10px] font-semibold text-destructive uppercase tracking-wider">
                      {!supportEnabled ? "Acesso Desabilitado" : "Acesso Expirado"}
                    </span>
                  </div>
                  <span className="inline-flex items-center text-xs font-medium text-muted-foreground">
                    Enviar duvida <ChevronRight className="w-3 h-3 ml-1" />
                  </span>
                </div>
              ) : (
                <a
                  href="https://wa.me/5521976310365"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl border border-border/40 bg-card/60 p-5 space-y-3 transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
                >
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">Tire Duvidas com Dr. Gustavo</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Envie suas perguntas diretamente e receba orientacoes personalizadas do mentor.</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-gold/15 border border-gold/30 px-2 py-0.5 text-[10px] font-semibold text-gold uppercase tracking-wider">
                      {supportDaysLeft === 1 ? "Resta 1 dia" : `Restam ${supportDaysLeft} dias`}
                    </span>
                  </div>
                  <span className="inline-flex items-center text-xs font-medium text-gold group-hover:underline">
                    Enviar duvida <ChevronRight className="w-3 h-3 ml-1" />
                  </span>
                </a>
              )}
              {/* Praticas Clinicas — respects clinicalPracticeAccess toggle and shows hours */}
              {clinicalEnabled ? (
                <div className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">Praticas Clinicas NaturalUp&reg;</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Voce possui um pacote de horas praticas definido no seu acordo individual. Entre em contato para agendar.</p>
                  <div className="flex items-center gap-2">
                    {clinicalHours > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-gold/15 border border-gold/30 px-2 py-0.5 text-[10px] font-semibold text-gold uppercase tracking-wider">
                        {clinicalHours} {clinicalHours === 1 ? "hora" : "horas"} disponiveis
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gold/15 border border-gold/30 px-2 py-0.5 text-[10px] font-semibold text-gold uppercase tracking-wider">
                        Pacote de Horas
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center text-xs font-medium text-muted-foreground">
                    Conforme seu acordo individual
                  </span>
                </div>
              ) : (
                <div className="rounded-2xl border border-destructive/30 bg-card/60 p-5 space-y-3 opacity-60 cursor-not-allowed">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">Praticas Clinicas NaturalUp&reg;</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Voce possui um pacote de horas praticas definido no seu acordo individual. Entre em contato para agendar.</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-destructive/15 border border-destructive/30 px-2 py-0.5 text-[10px] font-semibold text-destructive uppercase tracking-wider">
                      Acesso Desabilitado
                    </span>
                  </div>
                  <span className="inline-flex items-center text-xs font-medium text-muted-foreground">
                    Conforme seu acordo individual
                  </span>
                </div>
              )}
            </div>
          </section>

        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-border/30 py-6 mt-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>&copy; 2026 Ampla Facial &mdash; Todos os direitos reservados</span>
          <span className="text-gold-muted font-semibold tracking-brand text-[10px]">NATURALUP&reg;</span>
        </div>
      </footer>

      {/* Profile Edit Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="bg-card border-border/40 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Editar Perfil</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Altere suas informacoes pessoais
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!profileForm.currentPassword) {
                toast({ title: "Erro", description: "Informe sua senha atual para salvar", variant: "destructive" });
                return;
              }
              if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmNewPassword) {
                toast({ title: "Erro", description: "As novas senhas nao coincidem", variant: "destructive" });
                return;
              }
              if (profileForm.newPassword && profileForm.newPassword.length < 6) {
                toast({ title: "Erro", description: "Nova senha deve ter pelo menos 6 caracteres", variant: "destructive" });
                return;
              }
              profileMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label>
              <Input
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-background/50 border-border/40"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                className="bg-background/50 border-border/40"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Telefone</Label>
              <Input
                type="tel"
                placeholder="+55 (11) 99999-9999"
                value={profileForm.phone}
                onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                className="bg-background/50 border-border/40"
              />
            </div>
            <div className="w-full h-px bg-border/30" />
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Senha atual (obrigatoria)</Label>
              <Input
                type="password"
                placeholder="••••••"
                value={profileForm.currentPassword}
                onChange={(e) => setProfileForm((f) => ({ ...f, currentPassword: e.target.value }))}
                className="bg-background/50 border-border/40"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nova senha (opcional)</Label>
              <Input
                type="password"
                placeholder="Deixe em branco para manter"
                value={profileForm.newPassword}
                onChange={(e) => setProfileForm((f) => ({ ...f, newPassword: e.target.value }))}
                className="bg-background/50 border-border/40"
              />
            </div>
            {profileForm.newPassword && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Confirmar nova senha</Label>
                <Input
                  type="password"
                  placeholder="Repita a nova senha"
                  value={profileForm.confirmNewPassword}
                  onChange={(e) => setProfileForm((f) => ({ ...f, confirmNewPassword: e.target.value }))}
                  className="bg-background/50 border-border/40"
                />
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-gold text-background hover:bg-gold/90 font-medium"
              disabled={profileMutation.isPending}
            >
              {profileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar alteracoes
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
