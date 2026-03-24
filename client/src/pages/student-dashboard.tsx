import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
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
  ChevronRight, Calendar, Layers, Settings, Loader2, AlertTriangle
} from "lucide-react";
import type { Module, Lesson, LessonProgress, Plan } from "@shared/schema";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

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

export default function StudentDashboard() {
  const { user, logout, login } = useAuth();
  const { toast } = useToast();
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "", phone: "", currentPassword: "", newPassword: "", confirmNewPassword: "" });

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
      const body: any = { userId: user?.id, currentPassword: profileForm.currentPassword };
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
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    return url;
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
                    <p className="text-sm">Vídeo será adicionado em breve</p>
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
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-icon.png" alt="Ampla Facial" className="w-7 h-7 object-contain" />
            <span className="text-sm font-medium text-gold tracking-wide">AMPLA FACIAL</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              Olá, {user?.name?.split(" ")[0]}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-gold"
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
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-gold" onClick={logout} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-6">
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
                Entre em contato para renovação.
              </p>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-border/40 bg-card/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Progresso</p>
                <p className="text-lg font-semibold text-foreground">{progressPercent}%</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/40 bg-card/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Plano</p>
                <p className="text-lg font-semibold text-foreground">{userPlan?.name || "—"}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/40 bg-card/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Dias restantes</p>
                <p className="text-lg font-semibold text-foreground">{daysLeft}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overall progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso total</span>
            <span className="font-medium text-gold">{completedCount}/{totalLessons} aulas</span>
          </div>
          <Progress value={progressPercent} className="h-1.5 bg-border/30" />
        </div>

        <div className="w-full h-px bg-border/30" />

        {/* Modules */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gold-muted uppercase tracking-brand">Módulos</h2>
          <div className="grid gap-3">
            {modules.map((mod) => {
              const modLessons = getLessonsForModule(mod.id);
              const modProgress = getModuleProgress(mod.id);
              const isOpen = selectedModule === mod.id;

              return (
                <Card key={mod.id} className="overflow-hidden border-border/40 bg-card/60">
                  <button
                    className="w-full text-left p-4 flex items-center gap-4 hover:bg-muted/20 transition-colors"
                    onClick={() => setSelectedModule(isOpen ? null : mod.id)}
                    data-testid={`button-module-${mod.id}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-medium truncate text-foreground">{mod.title}</h3>
                        <Badge variant="secondary" className="shrink-0 text-xs bg-gold/10 text-gold border-0">
                          {modLessons.filter(l => completedIds.has(l.id)).length}/{modLessons.length}
                        </Badge>
                      </div>
                      {mod.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">{mod.description}</p>
                      )}
                      <Progress value={modProgress} className="h-1 mt-2 bg-border/30" />
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="border-t border-border/30">
                      {modLessons.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground">Nenhuma aula neste módulo ainda.</p>
                      ) : (
                        modLessons.map((lesson, i) => {
                          const done = completedIds.has(lesson.id);
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => setSelectedLesson(lesson)}
                              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors border-b border-border/20 last:border-b-0"
                              data-testid={`button-lesson-item-${lesson.id}`}
                            >
                              <div className="shrink-0">
                                {done ? (
                                  <CheckCircle2 className="w-4 h-4 text-gold" />
                                ) : (
                                  <Play className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{lesson.title}</p>
                                {lesson.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{linkifyText(lesson.description)}</p>
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

      <footer className="border-t border-border/30 mt-8 py-4">
        <div className="max-w-5xl mx-auto px-4">
          <PerplexityAttribution />
        </div>
      </footer>

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
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Senha atual (obrigatória)</Label>
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
    </div>
  );
}
