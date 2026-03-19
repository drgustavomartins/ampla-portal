import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen, Play, CheckCircle2, Circle, Clock, LogOut,
  ChevronRight, GraduationCap, Calendar, Layers
} from "lucide-react";
import type { Module, Lesson, LessonProgress, Plan } from "@shared/schema";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
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

  const completedIds = new Set(progress.filter(p => p.completed).map(p => p.lessonId));
  const totalLessons = lessons.length;
  const completedCount = completedIds.size;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const userPlan = plans.find(p => p.id === user?.planId);
  const daysLeft = user?.accessExpiresAt
    ? Math.max(0, Math.ceil((new Date(user.accessExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const getLessonsForModule = (moduleId: number) =>
    lessons.filter(l => l.moduleId === moduleId).sort((a, b) => a.order - b.order);

  const getModuleProgress = (moduleId: number) => {
    const moduleLessons = getLessonsForModule(moduleId);
    if (moduleLessons.length === 0) return 0;
    const completed = moduleLessons.filter(l => completedIds.has(l.id)).length;
    return Math.round((completed / moduleLessons.length) * 100);
  };

  // Video embed logic
  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    // Google Drive
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    return url;
  };

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
        <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <button
              onClick={() => setSelectedLesson(null)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              data-testid="button-back-to-modules"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Voltar
            </button>
            <span className="text-sm font-medium text-muted-foreground">{currentModule?.title}</span>
          </div>
        </header>

        <div className="max-w-6xl mx-auto p-4 lg:p-6">
          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            {/* Video Area */}
            <div className="space-y-4">
              {embedUrl ? (
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={selectedLesson.title}
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-2 text-muted-foreground">
                    <Play className="w-12 h-12 mx-auto opacity-40" />
                    <p className="text-sm">Vídeo será adicionado em breve</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedLesson.title}</h2>
                    {selectedLesson.description && (
                      <p className="text-sm text-muted-foreground mt-1">{selectedLesson.description}</p>
                    )}
                  </div>
                  {selectedLesson.duration && (
                    <Badge variant="secondary" className="shrink-0">
                      <Clock className="w-3 h-3 mr-1" />
                      {selectedLesson.duration}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={isCompleted ? "secondary" : "default"}
                    size="sm"
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
                    <Button variant="outline" size="sm" onClick={() => setSelectedLesson(prevLesson)}>
                      Anterior
                    </Button>
                  )}
                  {nextLesson && (
                    <Button size="sm" onClick={() => setSelectedLesson(nextLesson)}>
                      Próxima
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Lesson list sidebar */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Aulas do módulo
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
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                    data-testid={`button-lesson-${lesson.id}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <span className="w-4 h-4 flex items-center justify-center text-xs text-muted-foreground font-medium">
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : ""}`}>
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

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm">Ampla Facial</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              Olá, {user?.name?.split(" ")[0]}
            </span>
            <Button variant="ghost" size="sm" onClick={logout} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Progresso geral</p>
                <p className="text-lg font-semibold">{progressPercent}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Plano</p>
                <p className="text-lg font-semibold">{userPlan?.name || "—"}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dias restantes</p>
                <p className="text-lg font-semibold">{daysLeft}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overall progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso total</span>
            <span className="font-medium">{completedCount}/{totalLessons} aulas</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <Separator />

        {/* Modules */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Módulos</h2>
          <div className="grid gap-3">
            {modules.map((mod) => {
              const modLessons = getLessonsForModule(mod.id);
              const modProgress = getModuleProgress(mod.id);
              const isOpen = selectedModule === mod.id;

              return (
                <Card key={mod.id} className="overflow-hidden">
                  <button
                    className="w-full text-left p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                    onClick={() => setSelectedModule(isOpen ? null : mod.id)}
                    data-testid={`button-module-${mod.id}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-medium truncate">{mod.title}</h3>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {modLessons.filter(l => completedIds.has(l.id)).length}/{modLessons.length}
                        </Badge>
                      </div>
                      {mod.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">{mod.description}</p>
                      )}
                      <Progress value={modProgress} className="h-1.5 mt-2" />
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="border-t">
                      {modLessons.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground">Nenhuma aula neste módulo ainda.</p>
                      ) : (
                        modLessons.map((lesson, i) => {
                          const done = completedIds.has(lesson.id);
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => setSelectedLesson(lesson)}
                              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors border-b last:border-b-0"
                              data-testid={`button-lesson-item-${lesson.id}`}
                            >
                              <div className="shrink-0">
                                {done ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Play className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{lesson.title}</p>
                                {lesson.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{lesson.description}</p>
                                )}
                              </div>
                              {lesson.duration && (
                                <span className="text-xs text-muted-foreground shrink-0">{lesson.duration}</span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <footer className="border-t mt-8 py-4">
        <div className="max-w-5xl mx-auto px-4">
          <PerplexityAttribution />
        </div>
      </footer>
    </div>
  );
}
