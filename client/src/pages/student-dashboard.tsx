import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { UpgradeBanner } from "@/components/UpgradeBanner";
import { TrialPlansToast } from "@/components/TrialPlansToast";
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
  ChevronLeft, ChevronRight, Calendar, Layers, Settings, Loader2, AlertTriangle, Star,
  Users, MessageCircle, Lock, ShoppingCart, ExternalLink, Paperclip
} from "lucide-react";
import MateriaisComplementares from "./materiais-complementares";
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
        className="text-gold underline hover:text-gold/80 break-all"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function extractFirstLink(text: string): { url: string; label: string } | null {
  for (const line of text.split("\n")) {
    const m = line.match(/^([^:]+):\s*(https?:\/\/\S+)\s*$/);
    if (m) return { label: m[1].trim(), url: m[2].trim() };
  }
  const plain = text.match(/https?:\/\/\S+/);
  if (plain) return { url: plain[0], label: "Link" };
  return null;
}

function getFirstDescLine(desc: string): string | null {
  if (!desc) return null;
  const firstLine = desc.split('\n')[0].trim();
  if (firstLine.startsWith('http') || firstLine.startsWith('Drive com') || firstLine.startsWith('Links')) return null;
  return firstLine;
}

export default function StudentDashboard() {
  const { user, logout, login, isTrial, trialDaysLeft } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "", phone: "", currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const materiaisRef = useRef<HTMLDivElement>(null);
  const shelfRef = useRef<HTMLDivElement>(null);

  const scrollShelf = (direction: "left" | "right") => {
    if (!shelfRef.current) return;
    const cardWidth = shelfRef.current.querySelector(".shelf-card")?.clientWidth || 280;
    shelfRef.current.scrollBy({
      left: direction === "left" ? -(cardWidth + 20) : (cardWidth + 20),
      behavior: "smooth",
    });
  };

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
  const { data: myModules } = useQuery<{ accessAll: boolean; moduleIds: number[] }>({
    queryKey: ["/api/my-modules"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/my-modules");
      return res.json();
    },
    enabled: !!user?.id,
  });
  const [purchaseModule, setPurchaseModule] = useState<Module | null>(null);

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

  const getLessonsForModule = (moduleId: number) =>
    lessons.filter(l => l.moduleId === moduleId).sort((a, b) => a.order - b.order);

  // Check if student has access to a module
  const hasModuleAccess = (mod: Module) => {
    // "Boas Vindas" is always accessible
    if (mod.order === 1 || mod.title.toLowerCase().includes("boas vindas") || mod.title.toLowerCase().includes("boas-vindas")) return true;
    // If no access data yet or accessAll, grant access
    if (!myModules || myModules.accessAll) return true;
    // Check if module is in the plan's module list
    return myModules.moduleIds.includes(mod.id);
  };

  const getWhatsAppUrl = (mod: Module) => {
    const msg = encodeURIComponent(`Olá! Tenho interesse em adquirir o módulo ${mod.title} da mentoria Ampla Facial. Meu email de acesso é ${user?.email || ""}.`);
    return `https://wa.me/5521976263881?text=${msg}`;
  };

  // Video embed logic
  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&disablekb=0&fs=1`;
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
    if (title.includes("naturalup") || title.includes("natural up") || title.includes("método") || title.includes("metodo")) return "/images/naturalup-v2.png";
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
      <div className="min-h-screen bg-background overflow-x-hidden">
        {/* Top bar */}
        <header className="border-b border-border/50 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
            <button
              onClick={() => setSelectedLesson(null)}
              className="shrink-0 text-sm text-muted-foreground hover:text-gold flex items-center gap-1 transition-colors"
              data-testid="button-back-to-modules"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Voltar
            </button>
            <span className="flex-1 text-center text-xs font-medium text-gold-muted uppercase tracking-wider truncate px-1">{currentModule?.title}</span>
            <div className="shrink-0 w-14" />
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
                    <p className="text-sm">Vídeo será adicionado em breve</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-foreground">{selectedLesson.title}</h2>
                    {selectedLesson.description && (
                      <p className="text-sm text-muted-foreground mt-1 break-words overflow-hidden">{linkifyText(selectedLesson.description)}</p>
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
                      <><CheckCircle2 className="w-4 h-4 mr-1.5" />Concluída</>
                    ) : (
                      <><Circle className="w-4 h-4 mr-1.5" />Marcar como concluída</>
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
                      Próxima
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Lesson list sidebar */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gold-muted uppercase tracking-brand mb-3">
                Aulas do módulo
              </h3>
              {moduleLessons.map((lesson, i) => {
                const done = completedIds.has(lesson.id);
                const isActive = lesson.id === selectedLesson.id;
                const descLine = lesson.description ? getFirstDescLine(lesson.description) : null;
                const supportLink = lesson.description ? extractFirstLink(lesson.description) : null;
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
                      {descLine && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
                          {descLine}
                        </p>
                      )}
                      {supportLink && (
                        <a
                          href={supportLink.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] mt-0.5 hover:underline text-gold"
                        >
                          <Paperclip className="w-3 h-3" />
                          {supportLink.label}
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

  // #41 — "Continue de onde parou": encontra a última aula com progresso, ou a próxima não concluída
  const lastLesson = (() => {
    // Pega a aula concluída mais recentemente
    const completed = progress
      .filter(p => p.completed && p.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
    if (completed.length > 0) {
      const lastDone = completed[0];
      const lastLesson = lessons.find(l => l.id === lastDone.lessonId);
      if (lastLesson) {
        // Tenta encontrar a próxima aula do mesmo módulo
        const modLessons = getLessonsForModule(lastLesson.moduleId);
        const idx = modLessons.findIndex(l => l.id === lastLesson.id);
        const next = modLessons[idx + 1];
        return next || lastLesson; // se não tem próxima, repete a última
      }
    }
    // Nenhum progresso: começa pela primeira aula do primeiro módulo de curso (não Boas-Vindas)
    const firstMod = sortedModules.find(m => m !== introModule) || sortedModules[0];
    if (firstMod) {
      const modLessons = getLessonsForModule(firstMod.id);
      return modLessons[0] || null;
    }
    return null;
  })();
  const lastLessonModule = lastLesson ? modules.find(m => m.id === lastLesson.moduleId) : null;
  const lastLessonThumb = (() => {
    if (!lastLesson?.videoUrl || lastLesson.videoUrl.trim() === "") return null;
    const ytMatch = lastLesson.videoUrl.match(/(?:(?:www\.)?youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
    return null;
  })();
  const isLastLessonDone = lastLesson ? completedIds.has(lastLesson.id) : false;
  const continueLabel = progress.filter(p => p.completed).length === 0
    ? "Comece por aqui"
    : isLastLessonDone ? "Continue assistindo" : "Continue assistindo";

  // Plan progress (days)
  const planDurationDays = userPlan?.durationDays || 365;
  const daysUsed = Math.max(0, planDurationDays - daysLeft);
  const dayProgressPercent = Math.min(100, Math.round((daysUsed / planDurationDays) * 100));

  // Course card description fallback
  const getCourseDescription = (mod: Module): string => {
    if (mod.description) return mod.description;
    const title = mod.title.toLowerCase();
    if (title.includes("toxina")) return "Técnicas e protocolos de aplicação de toxina botulínica";
    if (title.includes("preenchedores") || title.includes("ácido")) return "Preenchimentos e volumização com ácido hialurônico";
    if (title.includes("bioestimulador")) return "Bioestimuladores de colágeno e neocolagênese";
    if (title.includes("modulador") || title.includes("matriz")) return "Moduladores de matriz extracelular";
    if (title.includes("naturalup") || title.includes("método")) return "Protocolo integrado completo NaturalUp®";
    return "Conteúdo exclusivo da mentoria Ampla Facial";
  };

  const whatsappTrialUrl = `https://wa.me/5521976263881?text=${encodeURIComponent(`Olá! Estou no período de teste gratuito da Ampla Facial e gostaria de assinar a plataforma. Meu email é ${user?.email || ""}.`)}`;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* ===== TRIAL BANNER ===== */}
      {isTrial && (
        <div className="w-full bg-gold/10 border-b border-gold/20 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gold font-semibold text-sm shrink-0">
              {trialDaysLeft !== null && trialDaysLeft > 0
                ? `Teste gratuito — ${trialDaysLeft} dia${trialDaysLeft === 1 ? "" : "s"} restante${trialDaysLeft === 1 ? "" : "s"}`
                : "Teste gratuito encerrado"}
            </span>
            <span className="text-white/40 text-xs hidden sm:inline truncate">Acesso às 2 primeiras aulas de cada módulo</span>
          </div>
          <Link href="/planos">
            <button className="shrink-0 text-xs font-semibold bg-gold text-background px-3 py-1.5 rounded-full hover:bg-gold/90 transition-colors">
              Ver planos
            </button>
          </Link>
        </div>
      )}

      {/* ===== HEADER ===== */}
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="Ampla Facial" className="w-10 h-10 object-contain shrink-0 -mt-1" />
            <div className="leading-none">
              <p className="text-[8px] uppercase tracking-[0.3em] text-gold/50 font-light mb-0.5">Portal de Aulas</p>
              <p className="text-sm font-extrabold tracking-wide text-white">AMPLA FACIAL</p>
              <p className="text-[9px] text-gold/70 tracking-wide font-light">Dr. Gustavo Martins</p>
            </div>
          </div>

          {/* Right: User info */}
          <div className="flex items-center gap-3">
            {/* Link de planos sempre visível */}
            <Link
              href="/planos"
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/5 hover:bg-gold/15 px-3 py-1.5 text-xs font-semibold text-gold transition-colors"
            >
              <Star className="w-3 h-3" />
              Planos
            </Link>
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
              title="Configurações"
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
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Seu acesso expirou</p>
                  <p className="text-sm text-destructive/80 mt-0.5">
                    Escolha um plano para continuar acessando as aulas.
                  </p>
                </div>
              </div>
              <Link
                href="/planos"
                className="shrink-0 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90 transition-colors"
              >
                Ver planos
              </Link>
            </div>
          )}
          {isExpiringSoon && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-500">
                    Seu acesso expira em {rawDaysLeft} {rawDaysLeft === 1 ? "dia" : "dias"}
                  </p>
                  <p className="text-sm text-amber-500/80 mt-0.5">
                    Renove agora e não perca o acesso ao conteúdo.
                  </p>
                </div>
              </div>
              <Link
                href="/planos"
                className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-[#0A1628] hover:bg-amber-400 transition-colors"
              >
                Renovar plano
              </Link>
            </div>
          )}

          {/* ===== HERO WELCOME ===== */}
          <section className="relative rounded-2xl overflow-hidden">
            {/* Background image */}
            <div className="absolute inset-0">
              <img src="/images/hero-dashboard.png" alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/50 sm:from-background/85 sm:via-background/60 sm:to-background/30" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent sm:from-background/50" />
            </div>
            <div className="relative grid lg:grid-cols-[1fr_340px] gap-6 items-start p-6 sm:p-8 lg:p-10">
            <div className="space-y-3">
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-foreground leading-tight">
                Boas-vindas à sua mentoria, <span className="text-gold">{firstName}</span>
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base max-w-lg leading-relaxed">
                Explore os cursos do Método NaturalUp&reg; e evolua sua prática clínica em harmonização facial com excelência e naturalidade.
              </p>
            </div>
            {/* Plan card */}
            <div className="mt-4 lg:mt-0 rounded-2xl border border-border/40 bg-card/90 backdrop-blur-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gold-muted uppercase tracking-brand">Seu Plano</span>
                <Badge variant="secondary" className="text-xs bg-gold/10 text-gold border-0">{userPlan?.name || "\u2014"}</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso do plano</span>
                  <span className="font-medium text-gold">{daysUsed}/{planDurationDays} dias</span>
                </div>
                <Progress value={dayProgressPercent} className="h-2 bg-border/30" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Dias restantes</span>
                <span className="font-semibold text-foreground">{daysLeft}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Aulas concluídas</span>
                <span className="font-medium text-gold">{completedCount}/{totalLessons}</span>
              </div>
              {/* CTA de planos no card */}
              <Link
                href="/planos"
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gold/30 bg-gold/5 hover:bg-gold/15 px-3 py-2 text-xs font-semibold text-gold transition-colors"
              >
                <Star className="w-3 h-3" />
                {isTrial ? `Trial — ${trialDaysLeft} dia${trialDaysLeft !== 1 ? "s" : ""} restante${trialDaysLeft !== 1 ? "s" : ""}` : "Ver planos e upgrade"}
              </Link>
            </div>
            </div>
          </section>

          {/* ===== BOAS VINDAS (Featured/Hero Section) ===== */}
          {introModule && introLessons.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-semibold text-foreground">Boas-Vindas</h2>
              <div
                className="relative rounded-2xl overflow-hidden border border-gold/20 cursor-pointer transition-all duration-300 hover:border-gold/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] group"
                onClick={() => setLocation(`/module/${introModule.id}`)}
              >
                {/* Background image */}
                <div className="absolute inset-0">
                  <img src="/images/boas-vindas-v2.png" alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/30" />
                </div>
                <div className="relative flex items-center gap-6 p-6 sm:p-8">
                  <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gold/20 backdrop-blur-sm border-2 border-gold/40 flex items-center justify-center">
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 text-gold fill-gold/30" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <h3 className="font-serif font-semibold text-foreground text-lg sm:text-xl">{introModule.title}</h3>
                    {introModule.description && (
                      <p className="text-sm text-muted-foreground/90 line-clamp-2">{introModule.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1.5 text-gold/80">
                        <BookOpen className="w-3.5 h-3.5" />
                        {introLessons.length} {introLessons.length === 1 ? "aula" : "aulas"}
                      </span>
                      <span className="flex items-center gap-1.5 text-gold/80">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {introLessons.filter(l => completedIds.has(l.id)).length}/{introLessons.length} concluída{introLessons.filter(l => completedIds.has(l.id)).length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gold/60 shrink-0 hidden sm:block transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </section>
          )}

          {/* ===== SEUS CURSOS — APPLE-STYLE SHELF ===== */}
          <section className="space-y-6">
            <div>
              <h2 className="text-[22px] font-semibold text-foreground tracking-tight">Seus Cursos</h2>
              <p className="text-[13px] text-muted-foreground/50 mt-0.5">{courseModules.length} módulos disponíveis</p>
            </div>

            <div className="relative group/shelf">
              {/* Left arrow */}
              <button
                onClick={() => scrollShelf("left")}
                className="hidden sm:flex absolute left-0 top-[35%] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all duration-300 opacity-0 group-hover/shelf:opacity-100 -translate-x-1/2"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Right arrow */}
              <button
                onClick={() => scrollShelf("right")}
                className="hidden sm:flex absolute right-0 top-[35%] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all duration-300 opacity-0 group-hover/shelf:opacity-100 translate-x-1/2"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div
                ref={shelfRef}
                className="shelf-scroll flex gap-6 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6"
              >
              {courseModules.map((mod, idx) => {
                const modLessons = getLessonsForModule(mod.id);
                const allLessons = idx === 0 ? [...introLessons, ...modLessons] : modLessons;
                const hasContent = allLessons.length > 0;
                const accessible = hasModuleAccess(mod);
                const isUnlocked = hasContent && accessible;
                const isPurchasable = hasContent && !accessible;
                const isLocked = !hasContent;
                const courseImage = getCourseImage(mod);
                const courseNumber = String(idx + 1).padStart(2, "0");
                const completedInModule = allLessons.filter(l => completedIds.has(l.id)).length;
                const moduleProgressPercent = allLessons.length > 0 ? Math.round((completedInModule / allLessons.length) * 100) : 0;

                return (
                  <div
                    key={mod.id}
                    className={`shelf-card shrink-0 group transition-all duration-500 ${
                      isUnlocked || isPurchasable ? "cursor-pointer" : "cursor-default"
                    }`}
                    onClick={() => {
                      if (isPurchasable) {
                        setPurchaseModule(mod);
                      } else if (isUnlocked) {
                        setLocation(`/module/${mod.id}`);
                      }
                    }}
                    data-testid={`button-module-${mod.id}`}
                  >
                    {/* Image — rounded, floating, Apple-style */}
                    <div className="relative rounded-[20px] overflow-hidden transition-all duration-500 group-hover:-translate-y-1.5 group-hover:shadow-[0_20px_60px_-12px_rgba(0,0,0,0.5)]" style={{ aspectRatio: "4/5" }}>
                      {/* Background image */}
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.03]"
                        style={courseImage
                          ? { backgroundImage: `url(${courseImage})` }
                          : { background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }
                        }
                      />

                      {/* Soft white vignette at bottom */}
                      <div className="absolute inset-0 bg-gradient-to-t from-white/[0.06] via-transparent to-transparent" />

                      {/* Course number — ultra-thin, Apple SF style */}
                      <span className="absolute bottom-4 left-5 text-[4rem] font-extralight leading-none text-white/[0.07] select-none tracking-tight" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
                        {courseNumber}
                      </span>

                      {/* Frosted lock overlay */}
                      {(isPurchasable || isLocked) && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px] flex items-center justify-center">
                          <Lock className={`w-5 h-5 ${isPurchasable ? "text-white/40" : "text-white/20"}`} />
                        </div>
                      )}
                    </div>

                    {/* Text below image — clean, minimal */}
                    <div className="pt-4 pb-1 space-y-1.5 min-h-[90px]">
                      {/* Status line */}
                      <div className="flex items-center gap-2">
                        {isUnlocked ? (
                          <span className="text-[10px] font-medium text-emerald-400/90 uppercase tracking-[0.12em]">
                            Disponível
                          </span>
                        ) : isPurchasable ? (
                          <span className="text-[10px] font-medium text-gold/70 uppercase tracking-[0.12em]">
                            Adquirir acesso
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-white/30 uppercase tracking-[0.12em]">
                            Em breve
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-[15px] text-foreground/90 leading-snug line-clamp-2 tracking-[-0.01em] min-h-[2.6em]">
                        {mod.title}
                      </h3>

                      {/* Subtitle */}
                      <p className="text-[12px] text-muted-foreground/60 leading-relaxed line-clamp-1">
                        {allLessons.length} {allLessons.length === 1 ? "aula" : "aulas"}{isUnlocked && allLessons.length > 0 ? ` · ${moduleProgressPercent}% concluído` : ""}
                      </p>

                      {/* Minimal progress bar */}
                      {isUnlocked && allLessons.length > 0 && (
                        <div className="h-[2px] w-full rounded-full bg-white/[0.06] overflow-hidden mt-1">
                          <div
                            className="h-full rounded-full bg-gold/60 transition-all duration-700"
                            style={{ width: `${Math.max(moduleProgressPercent, 2)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </section>

          {/* ===== RECURSOS EXCLUSIVOS ===== */}
          <section className="space-y-5">
            <h2 className="font-serif text-2xl font-semibold text-foreground">Recursos Exclusivos</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <p className="text-xs text-muted-foreground leading-relaxed">Conecte-se com outros profissionais, troque experiências e evolua junto com a comunidade.</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                      Acesso Vitalício
                    </span>
                  </div>
                  <span className="inline-flex items-center min-h-[44px] py-2 text-xs font-medium text-gold group-hover:underline">
                    Acessar comunidade <ChevronRight className="w-3 h-3 ml-1" />
                  </span>
                </a>
              ) : (
                <div className="rounded-2xl border border-destructive/30 bg-card/60 p-5 space-y-3 opacity-60 cursor-not-allowed">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">Comunidade NaturalUp&reg;</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Conecte-se com outros profissionais, troque experiências e evolua junto com a comunidade.</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-destructive/15 border border-destructive/30 px-2 py-0.5 text-[10px] font-semibold text-destructive uppercase tracking-wider">
                      Acesso Desabilitado
                    </span>
                  </div>
                  <span className="inline-flex items-center min-h-[44px] py-2 text-xs font-medium text-muted-foreground">
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
                  <h3 className="font-semibold text-sm text-foreground">Tire Dúvidas com Dr. Gustavo</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Envie suas perguntas diretamente e receba orientações personalizadas do mentor.</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-destructive/15 border border-destructive/30 px-2 py-0.5 text-[10px] font-semibold text-destructive uppercase tracking-wider">
                      {!supportEnabled ? "Acesso Desabilitado" : "Acesso Expirado"}
                    </span>
                  </div>
                  <span className="inline-flex items-center min-h-[44px] py-2 text-xs font-medium text-muted-foreground">
                    Enviar dúvida <ChevronRight className="w-3 h-3 ml-1" />
                  </span>
                </div>
              ) : (
                <a
                  href="https://wa.me/5521976263881"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl border border-border/40 bg-card/60 p-5 space-y-3 transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
                >
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">Tire Dúvidas com Dr. Gustavo</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Envie suas perguntas diretamente e receba orientações personalizadas do mentor.</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-gold/15 border border-gold/30 px-2 py-0.5 text-[10px] font-semibold text-gold uppercase tracking-wider">
                      {supportDaysLeft === 1 ? "Resta 1 dia" : `Restam ${supportDaysLeft} dias`}
                    </span>
                  </div>
                  <span className="inline-flex items-center min-h-[44px] py-2 text-xs font-medium text-gold group-hover:underline">
                    Enviar dúvida <ChevronRight className="w-3 h-3 ml-1" />
                  </span>
                </a>
              )}
              {/* Praticas Clinicas — WhatsApp scheduling button */}
              {clinicalEnabled && (
                <a
                  href="https://wa.me/5521976263881?text=Ol%C3%A1%2C%20gostaria%20de%20consultar%20minhas%20horas%20presenciais%20dispon%C3%ADveis"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl border border-border/40 bg-card/60 p-5 space-y-3 transition-all duration-300 hover:-translate-y-1 hover:border-green-500/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">Agendar Sessão Presencial</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Consulte suas horas presenciais disponíveis e agende sua sessão pelo WhatsApp.</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-green-500/15 border border-green-500/30 px-2 py-0.5 text-[10px] font-semibold text-green-500 uppercase tracking-wider">
                      WhatsApp
                    </span>
                  </div>
                  <span className="inline-flex items-center min-h-[44px] py-2 text-xs font-medium text-green-500 group-hover:underline">
                    Consultar horas presenciais <ChevronRight className="w-3 h-3 ml-1" />
                  </span>
                </a>
              )}
              {/* Materiais Complementares shortcut card */}
              <button
                onClick={() => materiaisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="group rounded-2xl border border-border/40 bg-card/60 p-5 space-y-3 text-left transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
              >
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-gold" />
                </div>
                <h3 className="font-semibold text-sm text-foreground">Materiais Complementares</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">Artigos, compilados e materiais de apoio organizados por tema.</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-gold/15 border border-gold/30 px-2 py-0.5 text-[10px] font-semibold text-gold uppercase tracking-wider">
                    Biblioteca
                  </span>
                </div>
                <span className="inline-flex items-center min-h-[44px] py-2 text-xs font-medium text-gold group-hover:underline">
                  Ver materiais <ChevronRight className="w-3 h-3 ml-1" />
                </span>
              </button>
            </div>
          </section>

          {/* ===== MATERIAIS COMPLEMENTARES (inline) ===== */}
          <section ref={materiaisRef} className="space-y-4 scroll-mt-20">
            <MateriaisComplementares />
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

      {/* Purchase Module Dialog */}
      <Dialog open={!!purchaseModule} onOpenChange={(open) => !open && setPurchaseModule(null)}>
        <DialogContent className="bg-card border-border/40 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{purchaseModule?.title}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Este módulo não está incluso no seu plano atual
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {purchaseModule?.description && (
              <p className="text-sm text-muted-foreground">{purchaseModule.description}</p>
            )}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-gold" />
                {purchaseModule ? getLessonsForModule(purchaseModule.id).length : 0} aulas
              </span>
            </div>
            <div className="rounded-lg border border-gold/20 bg-gold/5 p-4 text-center space-y-3">
              <p className="text-sm text-foreground font-medium">
                Deseja adquirir este módulo?
              </p>
              <p className="text-xs text-muted-foreground">
                Entre em contato pelo WhatsApp para adquirir acesso a este módulo individualmente.
              </p>
              <a
                href={purchaseModule ? getWhatsAppUrl(purchaseModule) : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#22c55e] text-white font-semibold px-6 py-3 text-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Adquirir este módulo
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Edit Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="bg-card border-border/40 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Editar Perfil</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Altere suas informações pessoais
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
                toast({ title: "Erro", description: "As novas senhas não coincidem", variant: "destructive" });
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
              Salvar alterações
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toast de planos para alunos em trial */}
      <TrialPlansToast isTrial={isTrial} />
    </div>
  );
}
