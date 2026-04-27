import { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { useStudentInit } from "@/hooks/use-student-init";
import { UpgradeBanner } from "@/components/UpgradeBanner";
import { ReferralCard } from "@/components/ReferralCard";
import { Check as CheckIcon, FileCheck, PenLine } from "lucide-react";
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
  Users, MessageCircle, Lock, ShoppingCart, ExternalLink, Paperclip, DollarSign,
  Search, Bell, Camera, Instagram, Phone, Sparkles
} from "lucide-react";
import { stripPhone } from "@/lib/phone";
import { SelectThemeModal } from "@/components/SelectThemeModal";
import { PhoneInput } from "@/components/PhoneInput";
import type { Module, Lesson, LessonProgress, Plan } from "@shared/schema";
import { isLifetimePlan } from "@shared/access-rules";
import { CreditsDashboardCard } from "@/components/CreditsDashboardCard";
import { CreditsFullSection } from "@/components/CreditsFullSection";
import { HeroContinue, type HeroMode } from "@/components/netflix/HeroContinue";
import { LessonRow } from "@/components/netflix/LessonRow";
import { LessonCard } from "@/components/netflix/LessonCard";
import { PodcastCard } from "@/components/netflix/PodcastCard";
import { CertificateCard } from "@/components/netflix/CertificateCard";
import { RowSkeleton } from "@/components/netflix/RowSkeleton";
import { getAllVideoProgress, getVideoProgress } from "@/hooks/use-video-progress";

// Lazy-load heavy components that are below the fold
const MateriaisComplementares = lazy(() => import("./materiais-complementares"));

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
  const { user, logout, login, isTrial, isTrialExpired, trialDaysLeft, isAccessExpired } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedPodcast, setSelectedPodcast] = useState<{ title: string; videoUrl: string; description?: string | null } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "", phone: "", currentPassword: "", newPassword: "", confirmNewPassword: "", avatarUrl: "", username: "", instagram: "" });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const materiaisRef = useRef<HTMLDivElement>(null);
  const shelfRef = useRef<HTMLDivElement>(null);

  // Netflix theme: update meta theme-color to navy
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const original = meta?.getAttribute("content") || "#0A1628";
    meta?.setAttribute("content", "#0A1628");
    return () => { meta?.setAttribute("content", original); };
  }, []);

  const scrollShelf = (direction: "left" | "right") => {
    if (!shelfRef.current) return;
    const cardWidth = shelfRef.current.querySelector(".shelf-card")?.clientWidth || 280;
    shelfRef.current.scrollBy({
      left: direction === "left" ? -(cardWidth + 20) : (cardWidth + 20),
      behavior: "smooth",
    });
  };

  // Single combined request replaces 6 separate API calls
  const { data: initData, isLoading: initLoading } = useStudentInit();
  const needsThemeSelection = initData?.myModules?.needsThemeSelection === true;
  const modules = initData?.modules ?? [];
  const lessons = initData?.lessons ?? [];
  const progress = initData?.progress ?? [];
  const plans = initData?.plans ?? [];
  const myModules = initData?.myModules;
  const lessonAccess = initData?.lessonAccess;
  const podcasts = initData?.podcasts ?? [];
  const certificates = initData?.certificates ?? [];

  const [purchaseModule, setPurchaseModule] = useState<Module | null>(null);
  const [signingSessionId, setSigningSessionId] = useState<number | null>(null);
  const [lessonSearch, setLessonSearch] = useState("");
  const accessType = lessonAccess?.accessType || "full";
  const allowedLessonIds = new Set(lessonAccess?.allowedLessonIds || []);
  const isTesterAccess = accessType === "tester";

  const { data: myClinicalData, refetch: refetchClinical } = useQuery<{ sessions: any[] }>({
    queryKey: ["/api/student/clinical-sessions"],
    queryFn: async () => { const res = await apiRequest("GET", "/api/student/clinical-sessions"); return res.json(); },
    enabled: !!user,
  });
  const myClinicalSessions = myClinicalData?.sessions || [];
  const pendingSignCount = myClinicalSessions.filter((s: any) => s.adminSignedAt && !s.studentSignedAt).length;

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
      if (profileForm.phone !== stripPhone((user as any)?.phone || "")) body.phone = profileForm.phone;
      if (profileForm.email && profileForm.email !== user?.email) body.email = profileForm.email;
      if (profileForm.newPassword) body.newPassword = profileForm.newPassword;
      if (profileForm.avatarUrl !== ((user as any)?.avatarUrl || "")) body.avatarUrl = profileForm.avatarUrl;
      if (profileForm.username !== ((user as any)?.username || "")) body.username = profileForm.username;
      const normalizedInstagram = (profileForm.instagram || "").replace(/^@/, "").trim();
      if (normalizedInstagram !== ((user as any)?.instagram || "")) body.instagram = normalizedInstagram;
      const res = await apiRequest("PATCH", "/api/auth/profile", body);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.user) login(data.user);
      toast({ title: "Perfil atualizado", description: data.message });
      setProfileOpen(false);
      setProfileForm({ name: "", email: "", phone: "", currentPassword: "", newPassword: "", confirmNewPassword: "", avatarUrl: "", username: "", instagram: "" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true);
    try {
      const token = localStorage.getItem("ampla_token");
      const fd = new FormData();
      fd.append("avatar", file);
      const resp = await fetch("/api/upload/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!resp.ok) throw new Error("Erro ao enviar imagem");
      const data = await resp.json();
      setProfileForm((f) => ({ ...f, avatarUrl: data.avatarUrl }));
      toast({ title: "Foto enviada!" });
    } catch {
      toast({ title: "Erro ao enviar foto", variant: "destructive" });
    } finally {
      setAvatarUploading(false);
    }
  };

  const completedIds = useMemo(() => new Set(progress.filter(p => p.completed).map(p => p.lessonId)), [progress]);

  // Helper: a lesson is "published" (has video) and not a separator (━━ TÍTULO ━━)
  const isPublishedLesson = useCallback((l: Lesson) => {
    if (l.title.includes('\u2501')) return false;
    return !!(l.videoUrl && l.videoUrl.trim().length > 0);
  }, []);

  // All useMemo hooks MUST be before any early returns to avoid React error #310
  const sortedModules = useMemo(() => [...modules].sort((a, b) => a.order - b.order), [modules]);
  const introModule = useMemo(() => sortedModules.find(m => m.order === 1 || m.title.toLowerCase().includes("boas vindas") || m.title.toLowerCase().includes("boas-vindas")), [sortedModules]);
  const courseModules = useMemo(() => sortedModules.filter(m => m !== introModule), [sortedModules, introModule]);

  const videoProgressStore = getAllVideoProgress();

  // Continue Watching: lessons with 0 < progress < 95%, sorted by lastWatchedAt desc, max 10
  const continueWatchingLessons = useMemo(() => lessons
    .map((lesson) => {
      const vp = videoProgressStore[String(lesson.id)];
      if (!vp || vp.percentage <= 0 || vp.percentage >= 95) return null;
      if (completedIds.has(lesson.id)) return null;
      return { lesson, progress: vp };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b!.progress.lastWatchedAt).getTime() - new Date(a!.progress.lastWatchedAt).getTime())
    .slice(0, 10) as { lesson: Lesson; progress: import("@/hooks/use-video-progress").VideoProgressEntry }[],
  [lessons, videoProgressStore, completedIds]);

  // Next in Journey: next 5 lessons after the last completed one, in admin order
  const nextInJourneyLessons = useMemo(() => {
    const allOrdered: { lesson: Lesson; module: Module }[] = [];
    for (const mod of sortedModules) {
      const modLessons = lessons
        .filter((l) => l.moduleId === mod.id)
        .sort((a, b) => a.order - b.order);
      for (const l of modLessons) {
        allOrdered.push({ lesson: l, module: mod });
      }
    }

    let lastCompletedIdx = -1;
    const completedWithDates = progress
      .filter((p) => p.completed && p.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
    if (completedWithDates.length > 0) {
      const lastCompletedId = completedWithDates[0].lessonId;
      lastCompletedIdx = allOrdered.findIndex((o) => o.lesson.id === lastCompletedId);
    }

    const startIdx = lastCompletedIdx + 1;
    const result: { lesson: Lesson; module: Module }[] = [];
    for (let i = startIdx; i < allOrdered.length && result.length < 5; i++) {
      if (!completedIds.has(allOrdered[i].lesson.id) && isPublishedLesson(allOrdered[i].lesson)) {
        result.push(allOrdered[i]);
      }
    }
    return result;
  }, [sortedModules, lessons, progress, completedIds, isPublishedLesson]);

  const totalLessons = lessons.length;
  const completedCount = completedIds.size;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const userPlan = plans.find(p => p.id === user?.planId);
  const isLifetime = isLifetimePlan(user?.planKey);
  const rawDaysLeft = !isLifetime && user?.accessExpiresAt
    ? Math.ceil((new Date(user.accessExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const daysLeft = rawDaysLeft !== null ? Math.max(0, rawDaysLeft) : 0;
  const isExpired = !isLifetime && rawDaysLeft !== null && rawDaysLeft <= 0 && user?.approved;
  const isExpiringSoon = !isLifetime && rawDaysLeft !== null && rawDaysLeft > 0 && rawDaysLeft <= 3;
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

  // Check if a lesson is locked for tester users
  const isLessonLockedForTester = (lessonId: number) => {
    return isTesterAccess && allowedLessonIds.size > 0 && !allowedLessonIds.has(lessonId);
  };

  const whatsappRenewUrl = "https://wa.me/5521976263881?text=Ol%C3%A1%20Dr.%20Gustavo%2C%20gostaria%20de%20saber%20mais%20sobre%20os%20planos%20da%20Ampla%20Facial";

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

  // Map modules to course card data — prefer imageUrl from DB, fallback to hardcoded
  const getCourseImage = (mod: Module): string | null => {
    if (mod.imageUrl) return mod.imageUrl;
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
    const lessonLockedForExpiry = isAccessExpired;
    const lessonLockedForTester = !lessonLockedForExpiry && isLessonLockedForTester(selectedLesson.id);
    const isLessonLocked = lessonLockedForExpiry || lessonLockedForTester;
    const embedUrl = isLessonLocked ? null : getEmbedUrl(selectedLesson.videoUrl || "");
    const isCompleted = completedIds.has(selectedLesson.id);
    const currentModule = modules.find(m => m.id === selectedLesson.moduleId);
    const moduleLessons = getLessonsForModule(selectedLesson.moduleId);
    const currentIdx = moduleLessons.findIndex(l => l.id === selectedLesson.id);
    const nextLesson = moduleLessons[currentIdx + 1];
    const prevLesson = moduleLessons[currentIdx - 1];

    return (
      <div className="min-h-screen bg-background overflow-x-hidden netflix-theme">
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
              {isLessonLocked ? (
                <div className="aspect-video bg-card rounded-lg flex items-center justify-center ring-1 ring-border/30 relative">
                  <div className="text-center space-y-3 px-6">
                    <Lock className="w-10 h-10 text-gold/60 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">
                      {lessonLockedForExpiry ? "Seu acesso expirou" : "Aula bloqueada"}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      {lessonLockedForExpiry
                        ? "Renove seu plano para continuar assistindo as aulas e ter acesso completo a todos os módulos."
                        : "Adquira um plano para assistir esta aula e ter acesso completo a todos os módulos."}
                    </p>
                    <a
                      href={lessonLockedForExpiry ? whatsappRenewUrl : "/#/planos"}
                      target={lessonLockedForExpiry ? "_blank" : undefined}
                      rel={lessonLockedForExpiry ? "noopener noreferrer" : undefined}
                      style={{ backgroundColor: '#D4A843', color: '#0A0D14', padding: '10px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}
                    >
                      {lessonLockedForExpiry ? "Quero Continuar Aprendendo" : "Ver planos e preços"}
                    </a>
                  </div>
                </div>
              ) : embedUrl ? (
                <div className="space-y-1">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden ring-1 ring-border/30">
                    <iframe
                      src={embedUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; remote-playback"
                      allowFullScreen
                      title={selectedLesson.title}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 text-right">
                    Assistir na TV? Use o Chromecast/AirPlay pelo botao do player YouTube
                  </p>
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
                const testerLocked = isAccessExpired || isLessonLockedForTester(lesson.id);
                const descLine = lesson.description ? getFirstDescLine(lesson.description) : null;
                const supportLink = lesson.description ? extractFirstLink(lesson.description) : null;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson)}
                    className={`w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3 ${
                      isActive
                        ? "bg-primary/10 border border-gold/20"
                        : testerLocked ? "opacity-60" : "hover:bg-card/80"
                    }`}
                    data-testid={`button-lesson-${lesson.id}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {testerLocked ? (
                        <Lock className="w-4 h-4 text-muted-foreground/50" />
                      ) : done ? (
                        <CheckCircle2 className="w-4 h-4 text-gold" />
                      ) : (
                        <span className="w-4 h-4 flex items-center justify-center text-xs text-muted-foreground font-medium">
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${testerLocked ? "text-muted-foreground" : isActive ? "text-gold" : ""}`}>
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

  // ========== PODCAST VIEW ==========
  if (selectedPodcast) {
    const podcastEmbedUrl = getEmbedUrl(selectedPodcast.videoUrl);
    return (
      <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
        <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-4">
          <button
            onClick={() => setSelectedPodcast(null)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar ao dashboard
          </button>
          {podcastEmbedUrl && (
            <div className="aspect-video bg-black rounded-lg overflow-hidden ring-1 ring-border/30">
              <iframe
                src={podcastEmbedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; remote-playback"
                allowFullScreen
                title={selectedPodcast.title}
              />
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-foreground">{selectedPodcast.title}</h2>
            {selectedPodcast.description && (
              <p className="text-sm text-muted-foreground mt-1">{selectedPodcast.description}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ========== MAIN DASHBOARD ==========

  // Show loading skeleton while init data is being fetched
  if (initLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
        <header className="border-b border-border/50 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-2 w-16 bg-muted animate-pulse rounded" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-20 bg-muted animate-pulse rounded-full" />
              <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
            </div>
          </div>
        </header>
        <main className="flex-1">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:py-10 space-y-10">
            {/* Hero skeleton */}
            <div className="rounded-2xl bg-card/60 p-6 sm:p-8 lg:p-10 space-y-4">
              <div className="h-8 w-64 bg-muted animate-pulse rounded" />
              <div className="h-4 w-96 max-w-full bg-muted animate-pulse rounded" />
              <div className="h-12 w-full max-w-md bg-muted animate-pulse rounded-xl mt-4" />
            </div>
            {/* Course cards skeleton */}
            <div className="space-y-4">
              <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              <div className="flex gap-6 overflow-hidden">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="shrink-0 w-[220px] space-y-3">
                    <div className="rounded-[20px] bg-muted animate-pulse" style={{ aspectRatio: "4/5" }} />
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const firstName = (() => {
    const parts = user?.name?.split(" ") || [];
    if (parts.length === 0) return "";
    if (/^(dr\.?|dra\.?)$/i.test(parts[0]) && parts.length > 1) return `${parts[0]} ${parts[1]}`;
    return parts[0];
  })();
  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

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
        // Tenta encontrar a próxima aula publicada do mesmo módulo
        const modLessons = getLessonsForModule(lastLesson.moduleId);
        const idx = modLessons.findIndex(l => l.id === lastLesson.id);
        const next = modLessons.slice(idx + 1).find(isPublishedLesson);
        return next || (isPublishedLesson(lastLesson) ? lastLesson : null);
      }
    }
    // Nenhum progresso: começa pela primeira aula publicada do primeiro módulo de curso (não Boas-Vindas)
    const firstMod = sortedModules.find(m => m !== introModule) || sortedModules[0];
    if (firstMod) {
      const modLessons = getLessonsForModule(firstMod.id);
      return modLessons.find(isPublishedLesson) || null;
    }
    return null;
  })();
  const lastLessonModule = lastLesson ? modules.find(m => m.id === lastLesson.moduleId) : null;
  const isLastLessonDone = lastLesson ? completedIds.has(lastLesson.id) : false;
  const continueLabel = progress.filter(p => p.completed).length === 0
    ? "Comece por aqui"
    : isLastLessonDone ? "Continue assistindo" : "Continue assistindo";

  // Plan progress (days) — calcula duração real a partir das datas do usuário
  const planStartDate = (user as any)?.planPaidAt || (user as any)?.trialStartedAt || user?.createdAt;
  const planEndDate = user?.accessExpiresAt;
  const planDurationDays = (planStartDate && planEndDate)
    ? Math.max(1, Math.ceil((new Date(planEndDate).getTime() - new Date(planStartDate).getTime()) / (1000 * 60 * 60 * 24)))
    : (userPlan?.durationDays || 365);
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

  // ===== NETFLIX PHASE 1: Hero + Rows =====

  // Hero lesson: 3-tier logic
  // 1. Has in-progress video (0 < progress < 95%) → "Continue de onde parou"
  // 2. Has completed lessons but no in-progress video → "Continue sua jornada" + next recommended lesson
  // 3. No progress at all → "Boas-vindas" + first lesson
  const heroData = (() => {
    // Tier 1: in-progress video from continueWatching
    if (continueWatchingLessons.length > 0) {
      const first = continueWatchingLessons[0];
      return {
        lesson: first.lesson,
        module: modules.find((m) => m.id === first.lesson.moduleId),
        progress: first.progress,
        isCompleted: false,
        heroMode: "continue-watching" as HeroMode,
      };
    }
    // Tier 2: has completed lessons → show next recommended
    if (completedIds.size > 0) {
      // Find the next uncompleted lesson after the most recently completed one
      const sortedMods = [...modules].sort((a, b) => a.order - b.order);
      const allOrdered: { lesson: Lesson; module: Module }[] = [];
      for (const mod of sortedMods) {
        const modLessons = lessons
          .filter((l) => l.moduleId === mod.id)
          .sort((a, b) => a.order - b.order);
        for (const l of modLessons) {
          allOrdered.push({ lesson: l, module: mod });
        }
      }
      const completedWithDates = progress
        .filter((p) => p.completed && p.completedAt)
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
      let nextLesson: { lesson: Lesson; module: Module } | null = null;
      if (completedWithDates.length > 0) {
        const lastCompletedId = completedWithDates[0].lessonId;
        const lastIdx = allOrdered.findIndex((o) => o.lesson.id === lastCompletedId);
        for (let i = lastIdx + 1; i < allOrdered.length; i++) {
          if (!completedIds.has(allOrdered[i].lesson.id) && isPublishedLesson(allOrdered[i].lesson)) {
            nextLesson = allOrdered[i];
            break;
          }
        }
      }
      // If we couldn't find a next lesson after the last completed, find the first uncompleted
      if (!nextLesson) {
        nextLesson = allOrdered.find((o) => !completedIds.has(o.lesson.id) && isPublishedLesson(o.lesson)) ?? null;
      }
      if (nextLesson) {
        return {
          lesson: nextLesson.lesson,
          module: nextLesson.module,
          progress: getVideoProgress(nextLesson.lesson.id),
          isCompleted: false,
          heroMode: "continue-journey" as HeroMode,
        };
      }
    }
    // Tier 3: no progress → welcome with first lesson
    if (lastLesson) {
      return {
        lesson: lastLesson,
        module: modules.find((m) => m.id === lastLesson.moduleId),
        progress: getVideoProgress(lastLesson.id),
        isCompleted: completedIds.has(lastLesson.id),
        heroMode: "welcome" as HeroMode,
      };
    }
    return null;
  })();

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden netflix-theme">
      {/* ===== THEME SELECTION MODAL (Módulo Avulso com Prática) ===== */}
      {needsThemeSelection && <SelectThemeModal />}

      {/* ===== TRIAL BANNER ===== */}
      {isTrial && (() => {
        const days = trialDaysLeft ?? 0;
        const urgent = days <= 2;
        const expired = days <= 0;
        const bgClass = expired
          ? "bg-red-500/20 border-red-500/40"
          : urgent
            ? "bg-red-500/10 border-red-500/30"
            : "bg-gold/10 border-gold/20";
        const textClass = expired || urgent ? "text-red-400" : "text-gold";
        const btnClass = expired || urgent
          ? "bg-red-500 hover:bg-red-600 text-white"
          : "bg-gold hover:bg-gold/90 text-background";
        return (
          <div className={`w-full border-b px-4 py-3 ${bgClass}`}>
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Timer circle */}
                <div className={`shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-lg ${expired ? "border-red-500 text-red-400" : urgent ? "border-red-400 text-red-400 animate-pulse" : "border-gold text-gold"}`}>
                  {expired ? "!" : days}
                </div>
                <div className="min-w-0">
                  <p className={`font-semibold text-sm ${textClass}`}>
                    {expired
                      ? "Seu teste gratuito encerrou"
                      : `${days} dia${days === 1 ? "" : "s"} restante${days === 1 ? "" : "s"} no teste gratuito`}
                  </p>
                  <p className="text-white/40 text-xs truncate">
                    {expired
                      ? "Assine para continuar acessando todas as aulas"
                      : urgent
                        ? "Corra! Seu acesso está acabando"
                        : "Acesso às 2 primeiras aulas de cada módulo"}
                  </p>
                </div>
              </div>
              <Link href="/lp">
                <button className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-full transition-colors ${btnClass}`}>
                  {expired ? "Assinar agora" : "Conheça a formação completa"}
                </button>
              </Link>
            </div>
          </div>
        );
      })()}

      {/* ===== HEADER ===== */}
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="Ampla Facial" className="w-10 h-10 object-contain shrink-0 -mt-1" loading="eager" decoding="async" />
            <div className="leading-none">
              <p className="text-sm font-extrabold tracking-wide text-white">AMPLA FACIAL</p>
              <p className="text-[9px] text-gold/70 tracking-wide font-light">Dr. Gustavo Martins</p>
            </div>
          </div>

          {/* Right: Desktop nav */}
          <div className="hidden md:flex items-center gap-3">
            {pendingSignCount > 0 && (
              <button
                onClick={() => {
                  const el = document.querySelector('[data-section="praticas"]');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="relative flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 transition-colors"
                title="Sessoes pendentes de assinatura"
              >
                <Bell className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-semibold text-red-400">Assinar prática</span>
                <span className="w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                  {pendingSignCount}
                </span>
              </button>
            )}
            <Link
              href="/creditos"
              className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-colors"
            >
              <DollarSign className="w-3 h-3" />
              Créditos
            </Link>
            <Link
              href="/comunidade"
              className="flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-400/5 hover:bg-blue-400/15 px-3 py-1.5 text-xs font-semibold text-blue-400 transition-colors"
            >
              <Users className="w-3 h-3" />
              Comunidade
            </Link>
            <Link
              href="/acompanhamento"
              className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/5 hover:bg-emerald-400/15 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              Acompanhamento
            </Link>
            <Link
              href="/planos"
              className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/5 hover:bg-gold/15 px-3 py-1.5 text-xs font-semibold text-gold transition-colors"
            >
              <Star className="w-3 h-3" />
              Planos
            </Link>
            <div className="flex flex-col items-end mr-1">
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
                  phone: stripPhone((user as any)?.phone || ""),
                  currentPassword: "",
                  newPassword: "",
                  confirmNewPassword: "",
                  avatarUrl: (user as any)?.avatarUrl || "",
                  username: (user as any)?.username || "",
                  instagram: (user as any)?.instagram || "",
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

          {/* Right: Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 shrink-0 relative"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menu"
          >
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
              <path d="M0 1h20M0 7h20M0 13h20" stroke="#D4A843" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {pendingSignCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {pendingSignCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ===== MOBILE MENU OVERLAY (estilo Apple) ===== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A0D14] animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2.5">
              <img src="/logo-icon.png" alt="Ampla Facial" className="w-8 h-8 object-contain" loading="eager" decoding="async" />
              <span className="text-sm font-extrabold tracking-wide text-white">AMPLA FACIAL</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-10 h-10 flex items-center justify-center"
              aria-label="Fechar menu"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M1 1l16 16M17 1L1 17" stroke="#D4A843" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <nav className="px-6 pt-6 space-y-1">
            {/* Nome do aluno */}
            <div className="pb-4 mb-2 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center">
                  <span className="text-sm font-semibold text-gold">{initials}</span>
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{firstName}</p>
                  {userPlan && <p className="text-xs text-gold/70">{userPlan.name}</p>}
                </div>
              </div>
            </div>

            <button
              onClick={() => { setMobileMenuOpen(false); setLocation("/"); }}
              className="flex items-center gap-4 w-full text-left py-3.5 border-b border-white/5"
            >
              <BookOpen className="w-5 h-5 text-gold/60" />
              <span className="text-[20px] font-semibold text-white">Minhas Aulas</span>
            </button>

            {pendingSignCount > 0 && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setTimeout(() => {
                    const el = document.querySelector('[data-section="praticas"]');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, 300);
                }}
                className="flex items-center gap-4 w-full text-left py-3.5 border-b border-white/5 pl-9"
              >
                <span className="w-5 h-5 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                  {pendingSignCount}
                </span>
                <span className="text-sm text-red-400 font-medium">Sessão pendente de assinatura</span>
              </button>
            )}

            <button
              onClick={() => { setMobileMenuOpen(false); setLocation("/creditos"); }}
              className="flex items-center gap-4 w-full text-left py-3.5 border-b border-white/5"
            >
              <DollarSign className="w-5 h-5 text-emerald-400/70" />
              <span className="text-[20px] font-semibold text-white">Créditos</span>
            </button>

            <button
              onClick={() => { setMobileMenuOpen(false); setLocation("/comunidade"); }}
              className="flex items-center gap-4 w-full text-left py-3.5 border-b border-white/5"
            >
              <Users className="w-5 h-5 text-blue-400/70" />
              <span className="text-[20px] font-semibold text-white">Comunidade</span>
            </button>

            <button
              onClick={() => { setMobileMenuOpen(false); setLocation("/acompanhamento"); }}
              className="flex items-center gap-4 w-full text-left py-3.5 border-b border-white/5"
            >
              <Sparkles className="w-5 h-5 text-emerald-400/70" />
              <span className="text-[20px] font-semibold text-white">Acompanhamento</span>
            </button>

            <button
              onClick={() => { setMobileMenuOpen(false); setLocation("/planos"); }}
              className="flex items-center gap-4 w-full text-left py-3.5 border-b border-white/5"
            >
              <Star className="w-5 h-5 text-gold/60" />
              <span className="text-[20px] font-semibold text-white">Planos</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setProfileForm({
                  name: user?.name || "",
                  email: user?.email || "",
                  phone: stripPhone((user as any)?.phone || ""),
                  currentPassword: "",
                  newPassword: "",
                  confirmNewPassword: "",
                  avatarUrl: (user as any)?.avatarUrl || "",
                  username: (user as any)?.username || "",
                  instagram: (user as any)?.instagram || "",
                });
                setProfileOpen(true);
              }}
              className="flex items-center gap-4 w-full text-left py-3.5 border-b border-white/5"
            >
              <Settings className="w-5 h-5 text-white/40" />
              <span className="text-[20px] font-semibold text-white">Configurações</span>
            </button>

            <button
              onClick={() => { setMobileMenuOpen(false); logout(); }}
              className="flex items-center gap-4 w-full text-left py-3.5"
            >
              <LogOut className="w-5 h-5 text-white/40" />
              <span className="text-[20px] font-semibold text-white/60">Sair</span>
            </button>
          </nav>
        </div>
      )}

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:py-10 space-y-10">

          {/* Access expiry banner — unified for ALL plan types */}
          {isAccessExpired && (
            <div className="rounded-2xl border border-gold/30 bg-gradient-to-r from-gold/10 via-gold/5 to-transparent p-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Seu acesso expirou. Renove para continuar aprendendo!</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Seus créditos continuam salvos. Entre em contato para renovar seu plano e desbloquear todo o conteúdo.
                  </p>
                </div>
              </div>
              <a
                href={whatsappRenewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-xl bg-gold/90 hover:bg-gold px-5 py-2.5 text-sm font-semibold text-[#0A0D14] transition-colors"
              >
                Quero Continuar Aprendendo
              </a>
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
          {/* ===== TESTER BANNER ===== */}
          {isTesterAccess && (
            <div className="rounded-xl bg-gradient-to-r from-gold/10 to-gold/5 border border-gold/20 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gold">Você está no modo teste</p>
                <p className="text-xs text-muted-foreground">Assista as 2 primeiras aulas de cada módulo gratuitamente. Adquira um plano para acesso completo.</p>
              </div>
              <a href="/#/planos" style={{ backgroundColor: '#D4A843', color: '#0A0D14', padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Ver planos
              </a>
            </div>
          )}

          {/* ===== NETFLIX HERO: "Continue de onde parou" ===== */}
          {heroData && heroData.lesson && !isAccessExpired && (
            <HeroContinue
              lesson={heroData.lesson}
              module={heroData.module}
              progress={heroData.progress}
              isCompleted={heroData.isCompleted}
              firstName={firstName}
              heroMode={heroData.heroMode}
              onContinue={() => setSelectedLesson(heroData.lesson)}
              onDetails={() => {
                if (heroData.module) setLocation(`/module/${heroData.module.id}`);
              }}
            />
          )}

          {/* Fallback hero for expired access */}
          {isAccessExpired && (
            <section className="relative rounded-2xl overflow-hidden bg-[#0A1628] p-6 sm:p-8 lg:p-10">
              <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                Olá, <span className="text-[#D4AF37]">{firstName}</span>
              </h1>
              <p className="text-[#b3b3b3] text-sm sm:text-base max-w-lg leading-relaxed mt-2">
                Seu acesso expirou, mas seus créditos continuam aqui. Entre em contato para renovar e desbloquear todo o conteúdo.
              </p>
              <a
                href={whatsappRenewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#D4AF37] hover:bg-[#c9a432] text-black font-bold text-sm transition-colors"
              >
                <Star className="w-4 h-4" />
                Quero Continuar Aprendendo
              </a>
            </section>
          )}

          {/* Plan summary card (compact) */}
          {!isAccessExpired && (
            <div className="rounded-xl border border-white/10 bg-[#14213D] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <span className="text-[10px] font-semibold text-[#D4AF37] uppercase tracking-wider">Seu Plano</span>
                  <p className="text-sm font-semibold text-white">{userPlan?.name || "—"}</p>
                </div>
                <div className="h-8 w-px bg-white/10 hidden sm:block" />
                <div className="flex items-center gap-6 text-xs text-[#b3b3b3]">
                  <span>{completedCount}/{totalLessons} aulas</span>
                  <span>{isLifetime ? "Acesso vitalício" : `${daysLeft} dias restantes`}</span>
                  <span className="font-semibold text-[#D4AF37]">{progressPercent}%</span>
                </div>
              </div>
              <div className="flex-1 max-w-xs w-full sm:w-auto">
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(progressPercent, 2)}%`, background: "linear-gradient(90deg, #B8860B, #D4A843, #E5C158)" }} />
                </div>
              </div>
              <Link
                href="/planos"
                className="shrink-0 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/5 hover:bg-[#D4AF37]/15 px-4 py-2 text-xs font-semibold text-[#D4AF37] transition-colors"
              >
                {isTrial ? `Trial — ${trialDaysLeft}d` : "Ver planos"}
              </Link>
            </div>
          )}

          {/* ===== NETFLIX ROW: "Continue Assistindo" ===== */}
          {continueWatchingLessons.length > 0 && (
            <Suspense fallback={<RowSkeleton />}>
              <LessonRow title="Continue Assistindo">
                {continueWatchingLessons.map(({ lesson, progress: vp }) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    module={modules.find((m) => m.id === lesson.moduleId)}
                    progress={vp}
                    onClick={() => setSelectedLesson(lesson)}
                  />
                ))}
              </LessonRow>
            </Suspense>
          )}

          {/* ===== NETFLIX ROW: "Próxima na Sua Jornada" ===== */}
          {nextInJourneyLessons.length > 0 && !isAccessExpired && (
            <Suspense fallback={<RowSkeleton />}>
              <LessonRow title="Próxima na Sua Jornada">
                {nextInJourneyLessons.map(({ lesson, module: mod }, i) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    module={mod}
                    isNext={i === 0}
                    onClick={() => setSelectedLesson(lesson)}
                  />
                ))}
              </LessonRow>
            </Suspense>
          )}

          {/* ===== NETFLIX ROWS: Category-based rows (Phase 2) ===== */}
          {!isAccessExpired && (() => {
            // Helper: aulas "separadoras" (━━ X ━━) não aparecem nas linhas curadas
            const isSeparatorLesson = (l: any) => typeof l?.title === "string" && /^[─━—–-]{2,}/.test(l.title.trim());
            // "Assista os Procedimentos" — practical lessons across all modules
            const practicalLessons = lessons.filter((l: any) => l.contentType === "practical" && isPublishedLesson(l) && !isSeparatorLesson(l));
            // "Casos Clínicos" — case_study lessons across all modules
            const caseStudyLessons = lessons.filter((l: any) => l.contentType === "case_study" && isPublishedLesson(l) && !isSeparatorLesson(l));

            // Category rows based on module titles
            const categoryConfig: { title: string; emoji: string; keywords: string[] }[] = [
              { title: "Toxina Botulínica", emoji: "💉", keywords: ["toxina"] },
              { title: "Preenchedores Faciais", emoji: "💧", keywords: ["preenchedores", "ácido", "acido", "preenchedor"] },
              { title: "Bioestimuladores de Colágeno", emoji: "✨", keywords: ["bioestimulador"] },
              { title: "Moduladores de Matriz Extracelular", emoji: "🔬", keywords: ["modulador", "regeneração", "regeneracao", "matriz", "biorregenerador"] },
              { title: "Método NaturalUp", emoji: "📐", keywords: ["naturalup", "natural up", "método", "metodo", "protocolo"] },
            ];

            const categoryRows = categoryConfig
              .map((cat) => {
                const matchingModules = courseModules.filter((m) =>
                  cat.keywords.some((kw) => m.title.toLowerCase().includes(kw)),
                );
                const catLessons = matchingModules.flatMap((m) =>
                  getLessonsForModule(m.id).filter(isPublishedLesson).map((l) => ({ lesson: l, module: m })),
                );
                if (catLessons.length === 0) return null;
                return { ...cat, lessons: catLessons };
              })
              .filter(Boolean) as { title: string; emoji: string; keywords: string[]; lessons: { lesson: Lesson; module: Module }[] }[];

            return (
              <>
                {/* Practical procedures row */}
                {practicalLessons.length > 0 && (
                  <Suspense fallback={<RowSkeleton />}>
                    <LessonRow title="🎬 Assista os Procedimentos">
                      {practicalLessons.map((lesson) => (
                        <LessonCard
                          key={lesson.id}
                          lesson={lesson}
                          module={modules.find((m) => m.id === lesson.moduleId)}
                          progress={videoProgressStore[String(lesson.id)] || undefined}
                          isCompleted={completedIds.has(lesson.id)}
                          onClick={() => setSelectedLesson(lesson)}
                        />
                      ))}
                    </LessonRow>
                  </Suspense>
                )}

                {/* Category-based module rows */}
                {categoryRows.map((cat) => (
                  <Suspense key={cat.title} fallback={<RowSkeleton />}>
                    <LessonRow title={`${cat.emoji} ${cat.title}`}>
                      {cat.lessons.map(({ lesson, module: mod }) => (
                        <LessonCard
                          key={lesson.id}
                          lesson={lesson}
                          module={mod}
                          progress={videoProgressStore[String(lesson.id)] || undefined}
                          isCompleted={completedIds.has(lesson.id)}
                          onClick={() => setSelectedLesson(lesson)}
                        />
                      ))}
                    </LessonRow>
                  </Suspense>
                ))}

                {/* Case studies row */}
                {caseStudyLessons.length > 0 && (
                  <Suspense fallback={<RowSkeleton />}>
                    <LessonRow title="📊 Casos Clínicos">
                      {caseStudyLessons.map((lesson) => (
                        <LessonCard
                          key={lesson.id}
                          lesson={lesson}
                          module={modules.find((m) => m.id === lesson.moduleId)}
                          progress={videoProgressStore[String(lesson.id)] || undefined}
                          isCompleted={completedIds.has(lesson.id)}
                          onClick={() => setSelectedLesson(lesson)}
                        />
                      ))}
                    </LessonRow>
                  </Suspense>
                )}
              </>
            );
          })()}

          {/* ===== NETFLIX ROW: Podcasts e Áudios ===== */}
          {podcasts.length > 0 && (
            <Suspense fallback={<RowSkeleton />}>
              <LessonRow title="Podcasts e Conteúdos Extras">
                {podcasts.map((item) => (
                  <PodcastCard
                    key={item.id}
                    item={item}
                    onClick={() => {
                      if (item.video_url) {
                        setSelectedPodcast({ title: item.title, videoUrl: item.video_url, description: item.description });
                      }
                    }}
                  />
                ))}
              </LessonRow>
            </Suspense>
          )}

          {/* ===== NETFLIX ROW: Meus Certificados ===== */}
          {certificates.length > 0 && (
            <Suspense fallback={<RowSkeleton />}>
              <LessonRow title="Meus Certificados">
                {certificates.map((cert) => (
                  <CertificateCard key={cert.id} certificate={cert} />
                ))}
              </LessonRow>
            </Suspense>
          )}

          {/* ===== BOAS VINDAS (Featured/Hero Section) ===== */}
          {introModule && introLessons.length > 0 && !isAccessExpired && (
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-semibold text-foreground">Boas-Vindas</h2>
              <div
                className="relative rounded-2xl overflow-hidden border border-gold/20 cursor-pointer transition-all duration-300 hover:border-gold/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] group"
                onClick={() => setLocation(`/module/${introModule.id}`)}
              >
                {/* Background image */}
                <div className="absolute inset-0">
                  <img src="/images/boas-vindas-v2.png" alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-foreground">Seus Cursos</h2>
                <p className="text-xs text-muted-foreground">{courseModules.length} modulos disponiveis</p>
              </div>
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar aula..."
                  value={lessonSearch}
                  onChange={(e) => setLessonSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-background/50 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/50"
                />
              </div>
            </div>

            <div className="relative group/shelf">
              {/* Left arrow */}
              <button
                onClick={() => scrollShelf("left")}
                className="hidden sm:flex absolute left-0 top-[35%] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-[#0A1628]/60 backdrop-blur-sm border border-white/10 items-center justify-center text-white/70 hover:text-white hover:bg-[#0A1628]/80 transition-all duration-300 opacity-0 group-hover/shelf:opacity-100 -translate-x-1/2"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Right arrow */}
              <button
                onClick={() => scrollShelf("right")}
                className="hidden sm:flex absolute right-0 top-[35%] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-[#0A1628]/60 backdrop-blur-sm border border-white/10 items-center justify-center text-white/70 hover:text-white hover:bg-[#0A1628]/80 transition-all duration-300 opacity-0 group-hover/shelf:opacity-100 translate-x-1/2"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div
                ref={shelfRef}
                className="shelf-scroll flex gap-6 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6"
              >
              {(lessonSearch ? courseModules.filter(mod => {
                const modLessons = getLessonsForModule(mod.id);
                return mod.title.toLowerCase().includes(lessonSearch.toLowerCase()) ||
                  modLessons.some(l => l.title.toLowerCase().includes(lessonSearch.toLowerCase()));
              }) : courseModules).map((mod, idx) => {
                const modLessons = getLessonsForModule(mod.id);
                const allLessons = idx === 0 ? [...introLessons, ...modLessons] : modLessons;
                const hasContent = allLessons.length > 0;
                const accessible = isAccessExpired ? false : hasModuleAccess(mod);
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
                      isUnlocked || isPurchasable || isAccessExpired ? "cursor-pointer" : "cursor-default"
                    }`}
                    onClick={() => {
                      if (isAccessExpired) {
                        window.open(whatsappRenewUrl, "_blank");
                        return;
                      } else if (isPurchasable) {
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
                      {isAccessExpired && (
                        <div className="absolute inset-0 bg-[#0A1628]/50 backdrop-blur-[3px] flex flex-col items-center justify-center gap-2">
                          <Lock className="w-5 h-5 text-gold/60" />
                          <span className="text-xs font-semibold text-gold/80 bg-[#0A1628]/40 px-3 py-1 rounded-full">Renovar acesso</span>
                        </div>
                      )}
                      {!isAccessExpired && (isPurchasable || isLocked) && (
                        <div className="absolute inset-0 bg-[#0A1628]/40 backdrop-blur-[3px] flex items-center justify-center">
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
                      <h3
                        className="font-semibold text-[15px] text-foreground/90 leading-snug line-clamp-2 tracking-[-0.01em] min-h-[2.6em]"
                        title={mod.title}
                      >
                        {mod.title}
                      </h3>

                      {/* Subtitle */}
                      <p className="text-[12px] text-muted-foreground/60 leading-relaxed line-clamp-1">
                        {allLessons.length} {allLessons.length === 1 ? "aula" : "aulas"}{isUnlocked && allLessons.length > 0 ? ` · ${moduleProgressPercent}% concluído` : ""}
                      </p>

                      {/* Minimal progress bar */}
                      {isUnlocked && allLessons.length > 0 && (
                        <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden mt-1.5">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.max(moduleProgressPercent, 2)}%`, background: "#D4A843" }}
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
                <Link
                  href="/comunidade"
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
                </Link>
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
              {/* Praticas Clinicas + Observacao — mostra horas separadas */}
              {(() => {
                const practiceHours = (user as any)?.clinicalPracticeHours || 0;
                const observationHours = (user as any)?.clinicalObservationHours || 0;
                const totalHours = practiceHours + observationHours;
                if (totalHours > 0) {
                  return (
                    <a
                      href={`https://wa.me/5521995523509?text=${encodeURIComponent("Ola, Dr. Gustavo! Gostaria de agendar minha sessao presencial.")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-2xl border border-border/40 bg-card/60 p-5 space-y-3 transition-all duration-300 hover:-translate-y-1 hover:border-green-500/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-400">{totalHours}h</p>
                          <p className="text-[10px] text-muted-foreground">total disponiveis</p>
                        </div>
                      </div>
                      <h3 className="font-semibold text-sm text-foreground">Horas Clinicas</h3>
                      <div className="space-y-1.5">
                        {practiceHours > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Pratica clinica</span>
                            <span className="inline-flex items-center rounded-full bg-green-500/15 border border-green-500/30 px-2 py-0.5 text-[10px] font-semibold text-green-500">
                              {practiceHours}h
                            </span>
                          </div>
                        )}
                        {observationHours > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Observacao clinica</span>
                            <span className="inline-flex items-center rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
                              {observationHours}h
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="inline-flex items-center min-h-[44px] py-2 text-xs font-medium text-green-500 group-hover:underline">
                        Agendar pelo WhatsApp <ChevronRight className="w-3 h-3 ml-1" />
                      </span>
                    </a>
                  );
                } else {
                  return (
                    <a
                      href="/#/planos?grupo=horas"
                      className="group rounded-2xl border border-border/40 bg-card/60 p-5 space-y-3 block transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-gold" />
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-muted-foreground">0h</p>
                          <p className="text-[10px] text-muted-foreground">disponíveis</p>
                        </div>
                      </div>
                      <h3 className="font-semibold text-sm text-foreground">Horas Clínicas</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">Sem horas presenciais no momento. Adquira um pacote de 4h com supervisão direta do Dr. Gustavo.</p>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-gold/15 border border-gold/30 px-2 py-0.5 text-[10px] font-semibold text-gold uppercase tracking-wider">
                          Adquira horas
                        </span>
                      </div>
                      <span className="inline-flex items-center min-h-[44px] py-2 text-xs font-medium text-gold group-hover:underline">
                        Ver pacotes de horas <ChevronRight className="w-3 h-3 ml-1" />
                      </span>
                    </a>
                  );
                }
              })()}



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

          {/* ===== MINHAS PRATICAS CLINICAS ===== */}
          {myClinicalSessions.length > 0 && (
            <section data-section="praticas" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-foreground">Minhas Praticas Clinicas</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Sessoes presenciais realizadas com o Dr. Gustavo</p>
                </div>
              </div>
              <div className="space-y-3">
                {myClinicalSessions.map((session: any) => {
                  const isPendingSign = !session.studentSignedAt;
                  const isFullySigned = session.studentSignedAt && session.adminSignedAt;
                  const statusLabel = isFullySigned ? "Concluida" : isPendingSign ? "Aguardando sua assinatura" : "Aguardando orientador";
                  const statusColor = isFullySigned ? "text-emerald-400" : isPendingSign ? "text-amber-400" : "text-blue-400";
                  const statusBg = isFullySigned ? "bg-emerald-500/10 border-emerald-500/20" : isPendingSign ? "bg-amber-500/10 border-amber-500/20" : "bg-blue-500/10 border-blue-500/20";

                  return (
                    <div key={session.id} className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {new Date(session.sessionDate + 'T12:00:00').toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                            </span>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusBg} ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {session.startTime} - {session.endTime} ({session.durationHours}h) - Orientador: {session.adminName || "Dr. Gustavo Martins"}
                          </p>
                        </div>
                      </div>

                      {/* Details grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-lg bg-background/50 p-3 text-center">
                          <p className="text-lg font-bold text-gold">{session.durationHours}h</p>
                          <p className="text-[10px] text-muted-foreground">Carga horaria</p>
                        </div>
                        <div className="rounded-lg bg-background/50 p-3 text-center">
                          <p className="text-lg font-bold text-gold">{session.patientsCount || 0}</p>
                          <p className="text-[10px] text-muted-foreground">Pacientes</p>
                        </div>
                        <div className="rounded-lg bg-background/50 p-3 text-center col-span-2">
                          <p className="text-xs font-medium text-foreground">{(session.procedures || []).join(", ") || "Nenhum"}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Procedimentos</p>
                        </div>
                      </div>

                      {/* Patient details if available */}
                      {session.patientsDetails && session.patientsDetails.length > 0 && (
                        <div className="rounded-lg bg-background/30 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Pacientes atendidos</p>
                          <div className="space-y-1">
                            {session.patientsDetails.map((p: string, i: number) => (
                              <p key={i} className="text-xs text-foreground">{i + 1}. {p}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {session.notes && (
                        <p className="text-xs text-muted-foreground italic">Obs: {session.notes}</p>
                      )}

                      {/* Signatures status */}
                      <div className="flex items-center gap-4 pt-2 border-t border-border/30">
                        <div className="flex items-center gap-1.5">
                          {session.adminSignedAt ? (
                            <><CheckIcon className="w-3.5 h-3.5 text-emerald-400" /><span className="text-[11px] text-emerald-400">Orientador assinou</span></>
                          ) : (
                            <><Clock className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-[11px] text-muted-foreground">Orientador pendente</span></>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {session.studentSignedAt ? (
                            <><CheckIcon className="w-3.5 h-3.5 text-emerald-400" /><span className="text-[11px] text-emerald-400">Você assinou em {new Date(session.studentSignedAt).toLocaleDateString("pt-BR")}</span></>
                          ) : (
                            <><Clock className="w-3.5 h-3.5 text-amber-400" /><span className="text-[11px] text-amber-400">Aguardando sua assinatura</span></>
                          )}
                        </div>
                      </div>

                      {/* Sign button */}
                      {isPendingSign && (
                        <button
                          onClick={async () => {
                            setSigningSessionId(session.id);
                            try {
                              const res = await apiRequest("POST", `/api/student/clinical-sessions/${session.id}/sign`);
                              if (res.ok) {
                                toast({ title: "Sessão assinada", description: "Sua assinatura foi registrada com sucesso." });
                                refetchClinical();
                              } else {
                                const data = await res.json().catch(() => ({}));
                                toast({ title: "Erro", description: data.message || "Erro ao assinar", variant: "destructive" });
                              }
                            } catch {
                              toast({ title: "Erro", description: "Erro ao assinar sessao", variant: "destructive" });
                            } finally {
                              setSigningSessionId(null);
                            }
                          }}
                          disabled={signingSessionId === session.id}
                          className="btn-gold-forced w-full justify-center py-3 disabled:opacity-50"
                        >
                          {signingSessionId === session.id ? (
                            "Assinando..."
                          ) : (
                            <><PenLine className="w-4 h-4" /> Confirmo que realizei esta prática clínica</>
                          )}
                        </button>
                      )}

                      {/* Completed badge */}
                      {isFullySigned && (
                        <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                          <FileCheck className="w-4 h-4" />
                          Pratica concluida e assinada por ambas as partes
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ===== MATERIAIS COMPLEMENTARES (lazy-loaded, below the fold) ===== */}
          <section ref={materiaisRef} className="space-y-4 scroll-mt-20">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-gold" />
              </div>
            }>
              <MateriaisComplementares />
            </Suspense>
          </section>

          {/* ===== CRÉDITOS FULL SECTION ===== */}
          <CreditsFullSection />

        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-border/30 py-6 mt-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>&copy; 2026 Ampla Facial &mdash; Todos os direitos reservados</span>
          <span className="text-gold-muted font-semibold tracking-brand text-[10px]">NATURALUP&reg;</span>
        </div>
      </footer>

      {/* Purchase Module Dialog / Expired Access Dialog */}
      <Dialog open={!!purchaseModule} onOpenChange={(open) => !open && setPurchaseModule(null)}>
        <DialogContent className="bg-card border-border/40 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{purchaseModule?.title}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isAccessExpired
                ? "Seu acesso expirou — renove para desbloquear este conteúdo"
                : "Este módulo não está incluso no seu plano atual"}
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
                {isAccessExpired
                  ? "Renove seu acesso para continuar aprendendo"
                  : "Adquira um plano que inclui este módulo"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isAccessExpired
                  ? "Fale com Dr. Gustavo para renovar seu plano e desbloquear todo o conteúdo."
                  : "Seus créditos serão aplicados automaticamente como desconto."}
              </p>
              <a
                href={isAccessExpired ? whatsappRenewUrl : "/#/planos-publicos"}
                target={isAccessExpired ? "_blank" : undefined}
                rel={isAccessExpired ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-2 rounded-xl bg-gold/90 hover:bg-gold text-[#0A0D14] font-semibold px-6 py-3 text-sm transition-colors"
              >
                {isAccessExpired ? (
                  <><ExternalLink className="w-4 h-4" /> Quero Continuar Aprendendo</>
                ) : (
                  <><ShoppingCart className="w-4 h-4" /> Ver planos disponíveis</>
                )}
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
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Phone className="w-3 h-3" />
                Telefone
              </Label>
              <PhoneInput
                value={profileForm.phone}
                onChange={(raw) => setProfileForm((f) => ({ ...f, phone: raw }))}
              />
            </div>
            <div className="w-full h-px bg-border/30" />
            <p className="text-[11px] font-semibold text-gold uppercase tracking-wider">Perfil da Comunidade</p>
            <div className="flex items-center gap-4">
              <div
                className="relative w-14 h-14 rounded-full shrink-0 overflow-hidden border-2 border-gold/30 flex items-center justify-center bg-gradient-to-br from-gold/80 to-gold cursor-pointer group"
                onClick={() => avatarFileRef.current?.click()}
              >
                {profileForm.avatarUrl ? (
                  <img src={profileForm.avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <span className="text-lg font-semibold text-[#0A1628]">{(profileForm.name || user?.name)?.[0]?.toUpperCase() || "?"}</span>
                )}
                <div className="absolute inset-0 bg-[#0A1628]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {avatarUploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                </div>
              </div>
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                  e.target.value = "";
                }}
              />
              <div className="flex-1 space-y-2">
                <button
                  type="button"
                  onClick={() => avatarFileRef.current?.click()}
                  disabled={avatarUploading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-gold/30 bg-gold/5 px-3 py-2 text-xs font-medium transition-colors hover:bg-gold/10 disabled:opacity-50"
                  style={{ color: '#D4A843' }}
                >
                  {avatarUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  {avatarUploading ? "Enviando..." : "Enviar foto"}
                </button>
                <Input
                  value={profileForm.username}
                  onChange={(e) => setProfileForm((f) => ({ ...f, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30) }))}
                  placeholder="@seu_usuario"
                  className="bg-background/50 border-border/40 text-sm h-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Instagram className="w-3 h-3" />
                Instagram
              </Label>
              <Input
                value={profileForm.instagram}
                onChange={(e) => setProfileForm((f) => ({ ...f, instagram: e.target.value.replace(/[^a-zA-Z0-9_.]/g, "").slice(0, 30) }))}
                placeholder="@seuinstagram"
                className="bg-background/50 border-border/40 text-sm h-8"
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
