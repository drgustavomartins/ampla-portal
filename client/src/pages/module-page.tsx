import { useState, useRef, useCallback, useEffect } from "react";
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
  ChevronRight, Layers, Lock, Paperclip, ExternalLink, ShoppingCart,
  ArrowRight, X as XIcon, Award, Maximize2
} from "lucide-react";
import type { Module, Lesson, LessonProgress } from "@shared/schema";
import { ModuleHero } from "@/components/netflix/ModuleHero";
import { LessonListItem } from "@/components/netflix/LessonListItem";
import { LessonRow } from "@/components/netflix/LessonRow";
import { LessonCard } from "@/components/netflix/LessonCard";
import { NetflixPlayer } from "@/components/netflix/NetflixPlayer";
import { NextUpOverlay } from "@/components/netflix/NextUpOverlay";
import { TheaterMode } from "@/components/netflix/TheaterMode";

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
  // Look for "Label: URL" on a single line
  for (const line of text.split("\n")) {
    const m = line.match(/^([^:]+):\s*(https?:\/\/\S+)\s*$/);
    if (m) return { label: m[1].trim(), url: m[2].trim() };
  }
  // Plain URL — no label
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

import { getYouTubeThumbnail, getNextFallback } from "@/lib/youtube-thumbnail";

function getLessonThumbnail(lesson: Lesson): string | null {
  return getYouTubeThumbnail(lesson.videoUrl, "mqdefault");
}

// Thumbnail component with progressive fallback
function LessonThumb({ lesson, size = "md", done, theme, index }: {
  lesson: Lesson; size?: "sm" | "md"; done: boolean;
  theme: { accent: string; accentRgb: string }; index: number;
}) {
  const initialThumb = getLessonThumbnail(lesson);
  const [src, setSrc] = useState<string | null>(initialThumb);
  const [failed, setFailed] = useState(false);
  const isMd = size === "md";
  const w = isMd ? "w-16 h-10" : "w-12 h-8";

  const handleError = useCallback(() => {
    if (!src) { setFailed(true); return; }
    const next = getNextFallback(src);
    if (next) { setSrc(next); } else { setFailed(true); }
  }, [src]);

  if (!src || failed) {
    return (
      <div className={`shrink-0 ${isMd ? "w-10 h-10" : "w-8 h-8"} rounded-full flex items-center justify-center ${done ? "" : "bg-card border border-border/40"}`}
        style={done ? { backgroundColor: `rgba(${theme.accentRgb}, 0.15)` } : undefined}>
        {done ? (
          <CheckCircle2 className={`${isMd ? "w-5 h-5" : "w-4 h-4"}`} style={{ color: theme.accent }} />
        ) : (
          <span className={`${isMd ? "text-xs" : "text-[10px]"} text-muted-foreground font-medium`}>{index + 1}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`shrink-0 ${w} rounded-md overflow-hidden ring-1 ring-border/30 relative`}>
      <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" onError={handleError} />
      {done && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `rgba(${theme.accentRgb}, 0.25)` }}>
          <CheckCircle2 className={`${isMd ? "w-5 h-5" : "w-3.5 h-3.5"} drop-shadow-md`} style={{ color: theme.accent }} />
        </div>
      )}
      {!done && isMd && (
        <div className="absolute inset-0 bg-[#0A1628]/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-4 h-4 text-white ml-0.5 drop-shadow-md" />
        </div>
      )}
    </div>
  );
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
  if (title.includes("naturalup") || title.includes("natural up") || title.includes("método") || title.includes("metodo")) return "/images/naturalup-v2.png";
  if (title.includes("boas vindas") || title.includes("boas-vindas")) return "/images/boas-vindas-v2.png";
  return null;
}

// ─── Upsell CTA Banner (shown to online-only students after every few lessons) ─────
function MentoriaCTABanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mt-4 rounded-xl border border-[#D4A843]/20 bg-[#D4A843]/5 p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          Quer aplicar o que aprendeu em pacientes reais?
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Conheça a Mentoria Presencial com o Dr. Gustavo.
        </p>
      </div>
      <a
        href="/#/planos-publicos"
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
        style={{ backgroundColor: "#D4A843", color: "#0A0D14" }}
      >
        Ver planos <ArrowRight className="w-3 h-3" />
      </a>
      <button onClick={onDismiss} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Module Completion Congratulations ─────
function ModuleCompletionCard({ moduleName, onDismiss }: { moduleName: string; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1628]/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}>
      <div className="relative w-full max-w-md rounded-2xl p-8 text-center"
        style={{ background: "linear-gradient(145deg, #12244A 0%, #0F2040 50%, #0A1628 100%)", boxShadow: "0 8px 56px rgba(212,168,67,0.15), 0 0 0 1px rgba(212,168,67,0.12)" }}>
        <button onClick={onDismiss} className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors">
          <XIcon className="w-5 h-5" />
        </button>
        <div className="w-16 h-16 rounded-full bg-[#D4A843]/15 flex items-center justify-center mx-auto mb-4">
          <Award className="w-8 h-8 text-[#D4A843]" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          Parabéns!
        </h3>
        <p className="text-sm text-white/60 leading-relaxed mb-1">
          Você concluiu a teoria de <span className="text-[#D4A843] font-semibold">{moduleName}</span>.
        </p>
        <p className="text-sm text-white/50 leading-relaxed mb-6">
          O próximo passo para aplicar em pacientes reais é a Mentoria Presencial.
        </p>
        <a
          href="/#/planos-publicos"
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all hover:brightness-110"
          style={{ background: "linear-gradient(135deg, #D4A843, #F0D78C)", color: "#0A0D14", boxShadow: "0 4px 20px rgba(212,168,67,0.3)" }}
        >
          Conhecer Mentoria Presencial <ArrowRight className="w-4 h-4" />
        </a>
        <button onClick={onDismiss} className="block mx-auto mt-3 text-xs text-white/30 hover:text-white/50 transition-colors">
          Fechar
        </button>
      </div>
    </div>
  );
}

export default function ModulePage() {
  const { user, isTrial, trialDaysLeft, isAccessExpired } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/module/:id");
  const moduleId = params?.id ? parseInt(params.id) : null;
  const TRIAL_FREE_LESSONS = 2; // trial users can access first N lessons per module

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showNextUp, setShowNextUp] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);

  // Upsell state: show CTA after every N lessons viewed in session
  const [sessionLessonCount, setSessionLessonCount] = useState(0);
  const [showUpsellBanner, setShowUpsellBanner] = useState(false);
  const [upsellDismissed, setUpsellDismissed] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionModalShownFor, setCompletionModalShownFor] = useState<number | null>(null);

  // Determine if user is online-only (should see upsell)
  const isOnlineOnlyStudent = user?.planKey === "acesso_vitalicio" || user?.planKey === "tester" || user?.role === "trial";
  const isVipOrMentoria = user?.planKey?.startsWith("vip_") || user?.planKey === "imersao" || user?.planKey?.startsWith("observador_");

  // Use cached data from student init (seeded by useStudentInit on dashboard)
  // Falls back to individual queries if cache is empty (e.g. direct navigation)
  const { data: modules = [] } = useQuery<Module[]>({
    queryKey: ["/api/modules"],
    staleTime: 5 * 60 * 1000,
  });
  // Fetch only lessons for THIS module instead of all lessons
  const { data: moduleLessonsData = [] } = useQuery<Lesson[]>({
    queryKey: ["/api/modules", moduleId, "lessons"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/modules/${moduleId}/lessons`);
      return res.json();
    },
    enabled: !!moduleId && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
  // Also keep full lessons cache in sync for dashboard navigation
  const { data: allLessons = [] } = useQuery<Lesson[]>({
    queryKey: ["/api/lessons"],
    staleTime: 5 * 60 * 1000,
  });
  // Merge: use module-specific lessons if available, else filter from all
  const lessons = moduleLessonsData.length > 0 ? allLessons : allLessons;
  const { data: progress = [] } = useQuery<LessonProgress[]>({
    queryKey: ["/api/progress", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/progress/${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });
  const { data: myModules } = useQuery<{ accessAll: boolean; moduleIds: number[] }>({
    queryKey: ["/api/my-modules"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/my-modules");
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
  const { data: lessonAccess } = useQuery<{ accessType: string; allowedLessonIds: number[] }>({
    queryKey: ["/api/lessons/access"],
    queryFn: async () => { const res = await apiRequest("GET", "/api/lessons/access"); return res.json(); },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  const accessType = lessonAccess?.accessType || "full";
  const allowedLessonIds = new Set(lessonAccess?.allowedLessonIds || []);
  const isTesterAccess = accessType === "tester";

  const completeMutation = useMutation({
    mutationFn: async ({ lessonId, complete }: { lessonId: number; complete: boolean }) => {
      const endpoint = complete
        ? `/api/progress/${user?.id}/lesson/${lessonId}/complete`
        : `/api/progress/${user?.id}/lesson/${lessonId}/incomplete`;
      await apiRequest("POST", endpoint);
      return { lessonId, complete };
    },
    // Optimistic update: atualiza UI imediatamente
    onMutate: async ({ lessonId, complete }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/progress", user?.id] });
      const previous = queryClient.getQueryData<LessonProgress[]>(["/api/progress", user?.id]) || [];
      if (complete) {
        const optimistic = [
          ...previous.filter((p: LessonProgress) => p.lessonId !== lessonId),
          { id: -1, userId: user?.id || 0, lessonId, completed: true, completedAt: new Date().toISOString() } as LessonProgress,
        ];
        queryClient.setQueryData(["/api/progress", user?.id], optimistic);
      } else {
        queryClient.setQueryData(
          ["/api/progress", user?.id],
          previous.filter((p: LessonProgress) => p.lessonId !== lessonId)
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/progress", user?.id], context.previous);
      }
    },
    onSettled: () => {
      // Refetch real do servidor (garante consistência)
      queryClient.invalidateQueries({ queryKey: ["/api/progress", user?.id], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["/api/student/init"], refetchType: "active" });
    },
  });

  const currentModule = modules.find(m => m.id === moduleId);
  const completedIds = new Set(progress.filter(p => p.completed).map(p => p.lessonId));

  // Sort modules to find intro
  const sortedModules = [...modules].sort((a, b) => a.order - b.order);
  const introModule = sortedModules.find(m => m.order === 1 || m.title.toLowerCase().includes("boas vindas") || m.title.toLowerCase().includes("boas-vindas"));
  const courseModules = sortedModules.filter(m => m !== introModule);

  // Use module-specific lessons if available (from /api/modules/:id/lessons),
  // otherwise fall back to filtering from all lessons cache
  const moduleLessons = currentModule
    ? (moduleLessonsData.length > 0
        ? [...moduleLessonsData].sort((a, b) => a.order - b.order)
        : lessons.filter(l => l.moduleId === currentModule.id).sort((a, b) => a.order - b.order))
    : [];

  const completedInModule = moduleLessons.filter(l => completedIds.has(l.id)).length;
  const moduleProgress = moduleLessons.length > 0 ? Math.round((completedInModule / moduleLessons.length) * 100) : 0;

  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&disablekb=0&fs=1`;
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

  const whatsappRenewUrl = "https://wa.me/5521976263881?text=Ol%C3%A1%20Dr.%20Gustavo%2C%20gostaria%20de%20saber%20mais%20sobre%20os%20planos%20da%20Ampla%20Facial";

  // Check module access
  const isBoasVindas = currentModule.order === 1 || currentModule.title.toLowerCase().includes("boas vindas") || currentModule.title.toLowerCase().includes("boas-vindas");
  const hasAccess = isAccessExpired ? false : (isBoasVindas || !myModules || myModules.accessAll || myModules.moduleIds.includes(currentModule.id));
  const isUnlocked = hasContent && hasAccess;
  const isLocked = hasContent && !hasAccess;

  // Trial/Tester/Expired: check if a lesson is locked
  const isLessonTrialLocked = (lesson: Lesson) => {
    // All lessons locked when access is expired
    if (isAccessExpired) return true;
    // API-based access: check allowedLessonIds
    if (isTesterAccess && allowedLessonIds.size > 0) {
      return !allowedLessonIds.has(lesson.id);
    }
    // Fallback: trial users get first N lessons
    if (!isTrial) return false;
    const idx = moduleLessons.findIndex(l => l.id === lesson.id);
    return idx >= TRIAL_FREE_LESSONS;
  };

  const getWhatsAppUrl = () => {
    const msg = encodeURIComponent(`Olá! Tenho interesse em adquirir o módulo ${currentModule.title} da mentoria Ampla Facial. Meu email de acesso é ${user?.email || ""}.`);
    return `https://wa.me/5521976263881?text=${msg}`;
  };

  // Scroll to top when entering the module page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [moduleId]);

  const videoRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  const handleSelectLesson = useCallback((lesson: Lesson | null) => {
    setShowNextUp(false);
    setTheaterMode(false);
    if (lesson && isLessonTrialLocked(lesson)) {
      // Allow selecting so they can see the lock overlay
      setSelectedLesson(lesson);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSelectedLesson(lesson);
    if (!lesson) window.scrollTo(0, 0);
  }, [moduleLessons, isTrial, isTesterAccess, allowedLessonIds]);

  // Track lesson views for upsell
  useEffect(() => {
    if (!selectedLesson || !isOnlineOnlyStudent || isVipOrMentoria) return;
    setSessionLessonCount(c => {
      const next = c + 1;
      // Show upsell banner after every 4th lesson viewed (3-5 range)
      if (next % 4 === 0 && !upsellDismissed) {
        setShowUpsellBanner(true);
      }
      return next;
    });
  }, [selectedLesson?.id]);

  // Check module completion for congratulations modal
  useEffect(() => {
    if (!currentModule || !isOnlineOnlyStudent || isVipOrMentoria) return;
    if (completionModalShownFor === currentModule.id) return;
    const theoryLessons = moduleLessons.filter(l => !l.title.startsWith("\u2501"));
    if (theoryLessons.length === 0) return;
    const allCompleted = theoryLessons.every(l => completedIds.has(l.id));
    if (allCompleted) {
      setShowCompletionModal(true);
      setCompletionModalShownFor(currentModule.id);
    }
  }, [completedIds.size, currentModule?.id, moduleLessons.length]);

  // Auto-scroll to video when a lesson is selected
  useEffect(() => {
    if (!selectedLesson) return;
    // Always scroll page to top first
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Desktop: also scroll left panel to top
    if (leftPanelRef.current) {
      leftPanelRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    // Mobile: also scroll video into view
    if (videoRef.current) {
      setTimeout(() => {
        videoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [selectedLesson]);

  // Get support URL for a lesson, falling back to any URL found in the module's lessons
  const getLessonSupportUrl = useCallback((lesson: Lesson): { url: string; label: string } | null => {
    return lesson.description ? extractFirstLink(lesson.description) : null;
  }, []);

  // ========== LESSON VIEW ==========
  if (selectedLesson && !isLocked) {
    const lessonLockedForExpiry = isAccessExpired;
    const lessonLockedForTester = isLessonTrialLocked(selectedLesson);
    const isLessonLocked = lessonLockedForExpiry || lessonLockedForTester;
    const isCompleted = completedIds.has(selectedLesson.id);
    const currentIdx = moduleLessons.findIndex(l => l.id === selectedLesson.id);
    const nextLesson = moduleLessons[currentIdx + 1];
    const prevLesson = moduleLessons[currentIdx - 1];

    return (
      <div className="lg:h-screen lg:overflow-hidden min-h-screen bg-background flex flex-col overflow-x-hidden">
        <header className="border-b border-border/50 bg-card/60 backdrop-blur-sm shrink-0 z-10">
          <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center gap-2">
            <button
              onClick={() => handleSelectLesson(null)}
              className="shrink-0 text-sm text-muted-foreground hover:text-gold flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
            <span className="flex-1 text-center text-xs font-medium uppercase tracking-wider truncate px-1" style={{ color: theme.accent }}>{currentModule.title}</span>
            <div className="shrink-0 w-14" />
          </div>
        </header>

        {/* Desktop: side-by-side, fills viewport below header */}
        <div className="flex-1 hidden lg:flex" style={{ height: "calc(100vh - 3.5rem)" }}>
          {/* Left: Video + details centered */}
          <div ref={leftPanelRef} className="flex-[3] overflow-y-auto p-6 flex flex-col justify-center">
            <div className="max-w-4xl mx-auto w-full space-y-4">
              {isLessonLocked ? (
                <div className="aspect-video bg-card rounded-lg flex items-center justify-center ring-1 ring-border/30">
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
              ) : (
                <div className="relative">
                  {theaterMode ? (
                    <TheaterMode onExit={() => setTheaterMode(false)}>
                      <NetflixPlayer
                        videoUrl={selectedLesson.videoUrl}
                        lessonId={selectedLesson.id}
                        lessonTitle={selectedLesson.title}
                        onEnded={() => { if (nextLesson && !isLessonTrialLocked(nextLesson)) setShowNextUp(true); }}
                        theaterMode
                      />
                    </TheaterMode>
                  ) : (
                    <NetflixPlayer
                      videoUrl={selectedLesson.videoUrl}
                      lessonId={selectedLesson.id}
                      lessonTitle={selectedLesson.title}
                      onEnded={() => { if (nextLesson && !isLessonTrialLocked(nextLesson)) setShowNextUp(true); }}
                    />
                  )}
                  {showNextUp && nextLesson && (
                    <NextUpOverlay
                      nextLesson={nextLesson}
                      onPlay={() => { setShowNextUp(false); handleSelectLesson(nextLesson); }}
                      onCancel={() => setShowNextUp(false)}
                    />
                  )}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4 min-w-0">
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

                  {!isLessonLocked && selectedLesson.videoUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border/50 hidden lg:inline-flex"
                      onClick={() => setTheaterMode(true)}
                      title="Modo teatro"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  )}

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

                {/* Upsell CTA banner for online-only students */}
                {showUpsellBanner && isOnlineOnlyStudent && !isVipOrMentoria && (
                  <MentoriaCTABanner onDismiss={() => { setShowUpsellBanner(false); setUpsellDismissed(true); }} />
                )}
              </div>
            </div>
          </div>

          {/* Right: Lesson list sidebar (35-40%) */}
          <div className="flex-[2] border-l border-border/50 overflow-y-auto bg-card/50 shadow-inner">
            <div className="p-4">
              <h3 className="text-xs font-semibold uppercase tracking-brand mb-3" style={{ color: theme.accent }}>
                Aulas do modulo
              </h3>
              <div className="space-y-1">
                {moduleLessons.map((lesson, i) => {
                  const done = completedIds.has(lesson.id);
                  const isActive = lesson.id === selectedLesson.id;
                  const trialLocked = isLessonTrialLocked(lesson);
                  const descLine = lesson.description ? getFirstDescLine(lesson.description) : null;
                  const supportLink = getLessonSupportUrl(lesson);
                  const isDivider = lesson.title.startsWith("\u2501");
                  if (isDivider) return (
                    <div key={lesson.id} className="px-3 pt-5 pb-2">
                      <p className="text-xs font-bold uppercase tracking-widest text-[#D4A843]">{lesson.title.replace(/\u2501/g, "").trim()}</p>
                    </div>
                  );
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => handleSelectLesson(lesson)}
                      className={`w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3 group ${
                        isActive
                          ? theme.activeBg + " border"
                          : done
                            ? "bg-card/30"
                            : "hover:bg-card/80"
                      }`}
                    >
                      <div className="mt-0.5">
                        {trialLocked
                          ? <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border/40"><Lock className="w-3.5 h-3.5 text-white/30" /></div>
                          : <LessonThumb lesson={lesson} size="sm" done={done} theme={theme} index={i} />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${trialLocked ? "text-white/30" : isActive ? theme.accentText : done ? "text-foreground/70" : ""}`}>
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
                            className="inline-flex items-center gap-1 text-[11px] mt-0.5 hover:underline"
                            style={{ color: theme.accent }}
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

        {/* Mobile: stacked layout */}
        <div className="lg:hidden">
          <div className="p-4 space-y-4" ref={videoRef}>
            {lessonLockedForTester ? (
              <div className="aspect-video bg-card rounded-lg flex items-center justify-center ring-1 ring-border/30">
                <div className="text-center space-y-3 px-6">
                  <Lock className="w-10 h-10 text-gold/60 mx-auto" />
                  <p className="text-sm font-semibold text-foreground">Aula bloqueada</p>
                  <p className="text-xs text-muted-foreground max-w-sm">Adquira um plano para assistir esta aula e ter acesso completo a todos os módulos.</p>
                  <a href="/#/planos" style={{ backgroundColor: '#D4A843', color: '#0A0D14', padding: '10px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
                    Ver planos e preços
                  </a>
                </div>
              </div>
            ) : (
              <div className="relative">
                <NetflixPlayer
                  videoUrl={selectedLesson.videoUrl}
                  lessonId={selectedLesson.id}
                  lessonTitle={selectedLesson.title}
                  onEnded={() => { if (nextLesson && !isLessonTrialLocked(nextLesson)) setShowNextUp(true); }}
                />
                {showNextUp && nextLesson && (
                  <NextUpOverlay
                    nextLesson={nextLesson}
                    onPlay={() => { setShowNextUp(false); handleSelectLesson(nextLesson); }}
                    onCancel={() => setShowNextUp(false)}
                  />
                )}
              </div>
            )}


            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4 min-w-0">
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
              {/* Upsell CTA banner for online-only students (mobile) */}
              {showUpsellBanner && isOnlineOnlyStudent && !isVipOrMentoria && (
                <MentoriaCTABanner onDismiss={() => { setShowUpsellBanner(false); setUpsellDismissed(true); }} />
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
                const trialLocked = isLessonTrialLocked(lesson);
                const descLine = lesson.description ? getFirstDescLine(lesson.description) : null;
                const supportLink = getLessonSupportUrl(lesson);
                const isDivider = lesson.title.startsWith("\u2501");
                if (isDivider) return (
                  <div key={lesson.id} className="px-3 pt-5 pb-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4A843]">{lesson.title.replace(/\u2501/g, "").trim()}</p>
                  </div>
                );
                return (
                  <button
                    key={lesson.id}
                    onClick={() => handleSelectLesson(lesson)}
                    className={`w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3 group ${
                      isActive
                        ? theme.activeBg + " border"
                        : done
                          ? "bg-card/30"
                          : "hover:bg-card/80"
                    }`}
                  >
                    <div className="mt-0.5">
                      {trialLocked
                        ? <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border/40"><Lock className="w-3.5 h-3.5 text-white/30" /></div>
                        : <LessonThumb lesson={lesson} size="sm" done={done} theme={theme} index={i} />}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${trialLocked ? "text-white/30" : isActive ? theme.accentText : done ? "text-foreground/70" : ""}`}>
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

        {/* Module completion congratulations modal */}
        {showCompletionModal && isOnlineOnlyStudent && !isVipOrMentoria && currentModule && (
          <ModuleCompletionCard
            moduleName={currentModule.title}
            onDismiss={() => setShowCompletionModal(false)}
          />
        )}
      </div>
    );
  }

  // ========== MODULE PAGE (NETFLIX-STYLE REDESIGN — PHASE 2) ==========
  const whatsappTrialUrl = `https://wa.me/5521976263881?text=${encodeURIComponent(`Olá! Estou no período de teste gratuito da Ampla Facial e gostaria de assinar a plataforma. Meu email é ${user?.email || ""}.`)}`;

  // Compute total duration string from lesson durations (e.g. "25:00" → sum)
  const totalDurationMinutes = moduleLessons.reduce((sum, l) => {
    if (!l.duration) return sum;
    const parts = l.duration.split(":");
    return sum + (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
  }, 0);
  const totalDuration = totalDurationMinutes > 0
    ? totalDurationMinutes >= 60
      ? `${Math.floor(totalDurationMinutes / 60)}h ${totalDurationMinutes % 60}min`
      : `${totalDurationMinutes}min`
    : null;

  // Find the first uncompleted lesson to "Continue" from
  const continueLesson = moduleLessons.find(l => !completedIds.has(l.id)) || moduleLessons[0];

  // Related lessons: pick 4-6 from other modules the student has access to
  const relatedLessons = (() => {
    if (!currentModule) return [];
    const otherModules = courseModules.filter(m => m.id !== currentModule.id);
    const result: { lesson: Lesson; module: Module }[] = [];
    for (const m of otherModules) {
      if (result.length >= 6) break;
      const mLessons = allLessons.filter(l => l.moduleId === m.id).sort((a, b) => a.order - b.order);
      for (const l of mLessons) {
        if (result.length >= 6) break;
        if (!completedIds.has(l.id)) {
          result.push({ lesson: l, module: m });
        }
      }
    }
    return result;
  })();

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col netflix-theme">
      {/* Expired Access Banner */}
      {isAccessExpired && (
        <div className="w-full bg-[#D4AF37]/10 border-b border-[#D4AF37]/20 px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Lock className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span className="text-[#D4AF37] font-semibold">Seu acesso expirou. Renove para continuar aprendendo!</span>
          </div>
          <a href={whatsappRenewUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#D4AF37] text-black">
            Quero Continuar Aprendendo
          </a>
        </div>
      )}
      {/* Trial / Tester Banner */}
      {!isAccessExpired && (isTrial || isTesterAccess) && (
        <div className="w-full bg-[#D4AF37]/10 border-b border-[#D4AF37]/20 px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#D4AF37] font-semibold">
              {isTrial && trialDaysLeft !== null && trialDaysLeft > 0
                ? `Teste gratuito — ${trialDaysLeft} dia${trialDaysLeft === 1 ? "" : "s"} restante${trialDaysLeft === 1 ? "" : "s"}`
                : isTrial ? "Seu período de teste encerrou"
                : "Modo teste"}
            </span>
            <span className="text-white/50 hidden sm:inline">Primeiras 2 aulas de cada módulo liberadas</span>
          </div>
          <a href="/#/planos" className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#D4AF37] text-black">
            Ver planos
          </a>
        </div>
      )}

      {/* Back button floating */}
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={() => setLocation("/")}
          className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors bg-[#0A1628]/40 backdrop-blur-sm px-3 py-1.5 rounded-full"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      {/* Netflix-style Hero */}
      <ModuleHero
        module={currentModule}
        totalLessons={moduleLessons.length}
        completedLessons={completedInModule}
        totalDuration={totalDuration}
        progressPercent={moduleProgress}
        hasProgress={completedInModule > 0}
        onContinue={() => continueLesson && handleSelectLesson(continueLesson)}
      />

      {/* Locked Module Banner */}
      {isLocked && (
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-6">
          <div className="rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/5 p-5 sm:p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7 text-[#D4AF37]" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-white text-lg">
                {isAccessExpired ? "Seu acesso expirou" : "Este módulo não está incluso no seu plano atual"}
              </h3>
              <p className="text-sm text-[#808080] max-w-md mx-auto">
                {isAccessExpired
                  ? "Renove seu plano para continuar aprendendo."
                  : "Adquira um plano que inclui este conteúdo."}
              </p>
            </div>
            <a
              href={isAccessExpired ? whatsappRenewUrl : "/#/planos-publicos"}
              target={isAccessExpired ? "_blank" : undefined}
              rel={isAccessExpired ? "noopener noreferrer" : undefined}
              className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] hover:bg-[#c9a432] text-black font-semibold px-6 py-3 text-sm transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              {isAccessExpired ? "Quero Continuar Aprendendo" : "Adquirir este módulo"}
            </a>
          </div>
        </div>
      )}

      {/* Episode-style Lesson List */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <h2 className="text-lg font-semibold text-white mb-6">
          Aulas do Módulo
        </h2>
        {!hasContent ? (
          <div className="text-center py-16 space-y-4">
            <Lock className="w-12 h-12 text-[#D4AF37]/40 mx-auto" />
            <p className="text-lg font-semibold text-white">Conteúdo em breve</p>
            <p className="text-sm text-[#808080]">Este módulo ainda está sendo preparado.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {moduleLessons.map((lesson, i) => {
              const done = completedIds.has(lesson.id);
              const trialLocked = isLessonTrialLocked(lesson);
              const supportLink = getLessonSupportUrl(lesson);
              const descLine = lesson.description ? getFirstDescLine(lesson.description) : null;
              return (
                <LessonListItem
                  key={lesson.id}
                  lesson={lesson}
                  index={i}
                  isCompleted={done}
                  isActive={false}
                  isLocked={isLocked || trialLocked}
                  supportLink={supportLink}
                  descLine={descLine}
                  onClick={() => !isLocked && handleSelectLesson(lesson)}
                />
              );
            })}

            {/* CTA card for tester/expired users */}
            {(isAccessExpired || isTesterAccess || isTrial) && moduleLessons.some(l => isLessonTrialLocked(l)) && (
              <div className="rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-4 text-center mt-4">
                <Lock className="w-5 h-5 text-[#D4AF37] mx-auto mb-2" />
                <p className="text-sm font-medium text-white">
                  {isAccessExpired ? "Seu acesso expirou" : "Quer assistir todas as aulas?"}
                </p>
                <p className="text-xs text-[#808080] mb-3">
                  {isAccessExpired
                    ? "Renove seu plano para continuar aprendendo."
                    : "Adquira um plano e tenha acesso completo a todos os módulos."}
                </p>
                <a
                  href={isAccessExpired ? whatsappRenewUrl : "/#/planos"}
                  target={isAccessExpired ? "_blank" : undefined}
                  rel={isAccessExpired ? "noopener noreferrer" : undefined}
                  className="inline-block rounded-lg bg-[#D4AF37] text-black px-6 py-2.5 text-sm font-bold"
                >
                  {isAccessExpired ? "Quero Continuar Aprendendo" : "Ver planos e preços"}
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Related lessons row */}
      {relatedLessons.length > 0 && !isLocked && (
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pb-8">
          <LessonRow title="Relacionados">
            {relatedLessons.map(({ lesson, module: mod }) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                module={mod}
                onClick={() => handleSelectLesson(lesson)}
              />
            ))}
          </LessonRow>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 mt-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#808080]">
          <span>&copy; 2026 Ampla Facial &mdash; Todos os direitos reservados</span>
          <span className="text-[#D4AF37]/60 font-semibold tracking-[0.15em] text-[10px]">NATURALUP&reg;</span>
        </div>
      </footer>
    </div>
  );
}
