import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Users, BookOpen, Layers, LogOut, Plus, Trash2, Check, X,
  Clock, Video, Shield, GraduationCap, ChevronUp, ChevronDown, Eye
} from "lucide-react";
import type { Module, Lesson, Plan, User } from "@shared/schema";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

type SafeUser = Omit<User, "password">;
type LessonProgress = { id: number; userId: number; lessonId: number; completed: boolean; completedAt: string | null };

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const { data: students = [] } = useQuery<SafeUser[]>({ queryKey: ["/api/admin/students"] });
  const { data: pendingStudents = [] } = useQuery<SafeUser[]>({ queryKey: ["/api/admin/students/pending"] });
  const { data: modules = [] } = useQuery<Module[]>({ queryKey: ["/api/modules"] });
  const { data: lessons = [] } = useQuery<Lesson[]>({ queryKey: ["/api/lessons"] });
  const { data: plans = [] } = useQuery<Plan[]>({ queryKey: ["/api/plans"] });
  const { data: allProgress = [] } = useQuery<LessonProgress[]>({ queryKey: ["/api/admin/students/progress"] });

  // Student detail view
  const [selectedStudent, setSelectedStudent] = useState<SafeUser | null>(null);

  // Approve / Revoke
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/students/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students/pending"] });
      toast({ title: "Aluno aprovado" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/students/${id}/revoke`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students/pending"] });
      toast({ title: "Acesso revogado" });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/students/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students/pending"] });
      toast({ title: "Aluno removido" });
    },
  });

  // Module CRUD
  const [moduleForm, setModuleForm] = useState({ title: "", description: "", order: 0 });
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);

  const createModuleMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/modules", {
        ...moduleForm,
        order: modules.length + 1,
        imageUrl: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
      setModuleForm({ title: "", description: "", order: 0 });
      setModuleDialogOpen(false);
      toast({ title: "Módulo criado" });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/modules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      toast({ title: "Módulo removido" });
    },
  });

  // Reorder modules
  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      await apiRequest("POST", "/api/admin/modules/reorder", { orderedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
      toast({ title: "Ordem atualizada" });
    },
  });

  const moveModule = (moduleId: number, direction: "up" | "down") => {
    const sorted = [...modules].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(m => m.id === moduleId);
    if (direction === "up" && idx > 0) {
      [sorted[idx], sorted[idx - 1]] = [sorted[idx - 1], sorted[idx]];
    } else if (direction === "down" && idx < sorted.length - 1) {
      [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
    }
    reorderMutation.mutate(sorted.map(m => m.id));
  };

  // Lesson CRUD
  const [lessonForm, setLessonForm] = useState({
    moduleId: 0, title: "", description: "", videoUrl: "", duration: "",
  });
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);

  const createLessonMutation = useMutation({
    mutationFn: async () => {
      const moduleLessons = lessons.filter(l => l.moduleId === lessonForm.moduleId);
      await apiRequest("POST", "/api/admin/lessons", {
        ...lessonForm,
        order: moduleLessons.length + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      setLessonForm({ moduleId: 0, title: "", description: "", videoUrl: "", duration: "" });
      setLessonDialogOpen(false);
      toast({ title: "Aula criada" });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/lessons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      toast({ title: "Aula removida" });
    },
  });

  const approvedStudents = students.filter(s => s.approved);

  // Progress helpers
  const getStudentProgress = (studentId: number) => {
    const completed = allProgress.filter(p => p.userId === studentId && p.completed);
    const total = lessons.length;
    return { completed: completed.length, total, percent: total > 0 ? Math.round((completed.length / total) * 100) : 0 };
  };

  const getStudentLessonCompleted = (studentId: number, lessonId: number) => {
    return allProgress.some(p => p.userId === studentId && p.lessonId === lessonId && p.completed);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Top bar ─── */}
      <header className="border-b border-border/40 bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-icon.png"
              alt="Ampla Facial"
              className="h-8 w-8 object-contain flex-shrink-0"
            />
            <span className="text-sm font-semibold text-gold tracking-brand leading-none">
              AMPLA FACIAL
            </span>
            <Badge
              variant="secondary"
              className="text-[10px] bg-gold/15 text-gold border-0 px-2 py-0.5 font-medium ml-1"
            >
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-gold"
              onClick={logout}
              data-testid="button-admin-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* ─── Stats Grid ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Pendentes",
              value: pendingStudents.length,
              icon: Clock,
              color: "text-amber-400",
              bg: "bg-amber-500/10",
              border: pendingStudents.length > 0 ? "border-amber-500/30" : "border-border/30",
            },
            {
              label: "Ativos",
              value: approvedStudents.length,
              icon: GraduationCap,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10",
              border: "border-border/30",
            },
            {
              label: "Módulos",
              value: modules.length,
              icon: Layers,
              color: "text-gold",
              bg: "bg-gold/10",
              border: "border-border/30",
            },
            {
              label: "Aulas",
              value: lessons.length,
              icon: Video,
              color: "text-gold",
              bg: "bg-gold/10",
              border: "border-border/30",
            },
          ].map((stat) => (
            <Card
              key={stat.label}
              className={`${stat.border} bg-card/50 hover:bg-card/70 transition-colors`}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  {stat.label === "Pendentes" && pendingStudents.length > 0 && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
                    </span>
                  )}
                </div>
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-brand mt-1">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ─── Main Content Tabs ─── */}
        <Tabs defaultValue="lessons" className="space-y-6">
          <TabsList className="w-full grid grid-cols-3 bg-card/60 border border-border/30 p-1 h-12">
            <TabsTrigger
              value="students"
              data-testid="tab-students"
              className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold data-[state=active]:shadow-none rounded-md text-sm font-medium transition-all"
            >
              <Users className="w-4 h-4 mr-2" />
              Alunos
            </TabsTrigger>
            <TabsTrigger
              value="modules"
              data-testid="tab-modules"
              className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold data-[state=active]:shadow-none rounded-md text-sm font-medium transition-all"
            >
              <Layers className="w-4 h-4 mr-2" />
              Módulos
            </TabsTrigger>
            <TabsTrigger
              value="lessons"
              data-testid="tab-lessons"
              className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold data-[state=active]:shadow-none rounded-md text-sm font-medium transition-all"
            >
              <Video className="w-4 h-4 mr-2" />
              Aulas
            </TabsTrigger>
          </TabsList>

          {/* ========== STUDENTS TAB ========== */}
          <TabsContent value="students" className="space-y-6 mt-0">
            {pendingStudents.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-brand">
                    Aguardando aprovação ({pendingStudents.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {pendingStudents.map((s) => {
                    const plan = plans.find(p => p.id === s.planId);
                    return (
                      <Card key={s.id} className="border-amber-500/20 bg-card/50">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">{s.name}</p>
                            <p className="text-sm text-muted-foreground truncate mt-0.5">{s.email}</p>
                            {plan && (
                              <Badge variant="secondary" className="mt-2 text-xs bg-gold/10 text-gold border-0">
                                {plan.name}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              className="bg-gold text-background hover:bg-gold/90 font-medium"
                              onClick={() => approveMutation.mutate(s.id)}
                              disabled={approveMutation.isPending}
                              data-testid={`button-approve-${s.id}`}
                            >
                              <Check className="w-4 h-4 mr-1.5" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-border/40 hover:border-destructive/50 hover:text-destructive"
                              onClick={() => deleteStudentMutation.mutate(s.id)}
                              data-testid={`button-reject-${s.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">
                Todos os alunos ({students.length})
              </h3>
              {students.length === 0 ? (
                <Card className="border-border/30 bg-card/40">
                  <CardContent className="p-12 text-center">
                    <div className="w-14 h-14 rounded-xl bg-card/80 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-7 h-7 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground">Nenhum aluno cadastrado ainda</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {students.map((s) => {
                    const plan = plans.find(p => p.id === s.planId);
                    const daysLeft = s.accessExpiresAt
                      ? Math.max(0, Math.ceil((new Date(s.accessExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                      : 0;
                    const progress = getStudentProgress(s.id);
                    return (
                      <Card key={s.id} className="border-border/30 bg-card/50 hover:bg-card/70 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2.5">
                              <p className="font-medium truncate text-foreground">{s.name}</p>
                              {s.approved ? (
                                <Badge variant="secondary" className="text-[11px] bg-emerald-500/10 text-emerald-400 border-0 shrink-0">
                                  Ativo
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[11px] bg-amber-500/10 text-amber-400 border-0 shrink-0">
                                  Pendente
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-0.5">{s.email}</p>
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                              {plan && <span>{plan.name}</span>}
                              {s.approved && daysLeft > 0 && (
                                <>
                                  <span className="text-border">·</span>
                                  <span>{daysLeft} dias restantes</span>
                                </>
                              )}
                              {s.approved && (
                                <>
                                  <span className="text-border">·</span>
                                  <span className={progress.percent === 100 ? "text-emerald-400" : ""}>
                                    {progress.completed}/{progress.total} aulas
                                  </span>
                                </>
                              )}
                            </div>
                            {/* Progress bar */}
                            {s.approved && lessons.length > 0 && (
                              <div className="mt-2.5 flex items-center gap-3">
                                <Progress value={progress.percent} className="h-1.5 flex-1" />
                                <span className="text-xs text-muted-foreground w-8 text-right">{progress.percent}%</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {s.approved && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground hover:text-gold"
                                onClick={() => setSelectedStudent(s)}
                                title="Ver progresso"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {s.approved ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-border/40 text-xs"
                                onClick={() => revokeMutation.mutate(s.id)}
                                data-testid={`button-revoke-${s.id}`}
                              >
                                Revogar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="bg-gold text-background hover:bg-gold/90 text-xs"
                                onClick={() => approveMutation.mutate(s.id)}
                                data-testid={`button-approve-list-${s.id}`}
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Aprovar
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteStudentMutation.mutate(s.id)}
                              className="text-muted-foreground hover:text-destructive"
                              data-testid={`button-delete-student-${s.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Student Progress Detail Dialog */}
            <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
              <DialogContent className="bg-card border-border/40 max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-lg">Progresso do Aluno</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {selectedStudent?.name} — {selectedStudent?.email}
                  </DialogDescription>
                </DialogHeader>
                {selectedStudent && (
                  <div className="space-y-4 pt-2">
                    {/* Overall progress */}
                    {(() => {
                      const prog = getStudentProgress(selectedStudent.id);
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progresso geral</span>
                            <span className="font-medium text-foreground">{prog.completed}/{prog.total} aulas ({prog.percent}%)</span>
                          </div>
                          <Progress value={prog.percent} className="h-2" />
                        </div>
                      );
                    })()}

                    {/* Per-module breakdown */}
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {modules.sort((a, b) => a.order - b.order).map((mod) => {
                        const modLessons = lessons.filter(l => l.moduleId === mod.id).sort((a, b) => a.order - b.order);
                        if (modLessons.length === 0) return null;
                        const completedCount = modLessons.filter(l => getStudentLessonCompleted(selectedStudent.id, l.id)).length;
                        return (
                          <div key={mod.id} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-semibold text-gold uppercase tracking-brand">{mod.title}</h4>
                              <span className="text-xs text-muted-foreground">{completedCount}/{modLessons.length}</span>
                            </div>
                            {modLessons.map((lesson) => {
                              const done = getStudentLessonCompleted(selectedStudent.id, lesson.id);
                              return (
                                <div key={lesson.id} className="flex items-center gap-2.5 pl-2">
                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                    done ? "bg-emerald-500/20" : "bg-card/80 border border-border/40"
                                  }`}>
                                    {done && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                                  </div>
                                  <span className={`text-sm truncate ${done ? "text-foreground" : "text-muted-foreground"}`}>
                                    {lesson.title}
                                  </span>
                                  {lesson.duration && (
                                    <span className="text-xs text-muted-foreground shrink-0 ml-auto">{lesson.duration}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ========== MODULES TAB ========== */}
          <TabsContent value="modules" className="space-y-6 mt-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">
                Módulos ({modules.length})
              </h3>
              <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-medium" data-testid="button-add-module">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Novo módulo
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border/40">
                  <DialogHeader>
                    <DialogTitle className="text-lg">Novo módulo</DialogTitle>
                    <DialogDescription className="text-muted-foreground">Adicione um novo módulo de aulas</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Título</Label>
                      <Input
                        value={moduleForm.title}
                        onChange={e => setModuleForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Ex: Skinboosters"
                        className="bg-background/50 border-border/40"
                        data-testid="input-module-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label>
                      <Textarea
                        value={moduleForm.description}
                        onChange={e => setModuleForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Descrição do módulo..."
                        className="bg-background/50 border-border/40"
                        data-testid="input-module-description"
                      />
                    </div>
                    <Button
                      className="w-full bg-gold text-background hover:bg-gold/90 font-medium"
                      onClick={() => createModuleMutation.mutate()}
                      disabled={!moduleForm.title || createModuleMutation.isPending}
                      data-testid="button-save-module"
                    >
                      Criar módulo
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {modules.length === 0 ? (
              <Card className="border-border/30 bg-card/40">
                <CardContent className="p-12 text-center">
                  <div className="w-14 h-14 rounded-xl bg-card/80 flex items-center justify-center mx-auto mb-4">
                    <Layers className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">Nenhum módulo criado ainda</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {[...modules].sort((a, b) => a.order - b.order).map((mod, idx) => {
                  const modLessons = lessons.filter(l => l.moduleId === mod.id);
                  const sortedModules = [...modules].sort((a, b) => a.order - b.order);
                  const isFirst = idx === 0;
                  const isLast = idx === sortedModules.length - 1;
                  return (
                    <Card key={mod.id} className="border-border/30 bg-card/50 hover:bg-card/70 transition-colors">
                      <CardContent className="p-5 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          {/* Reorder arrows */}
                          <div className="flex flex-col gap-0.5 shrink-0 mt-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-6 w-6 p-0 ${isFirst ? "text-muted-foreground/20 cursor-default" : "text-muted-foreground hover:text-gold"}`}
                              onClick={() => !isFirst && moveModule(mod.id, "up")}
                              disabled={isFirst || reorderMutation.isPending}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-6 w-6 p-0 ${isLast ? "text-muted-foreground/20 cursor-default" : "text-muted-foreground hover:text-gold"}`}
                              onClick={() => !isLast && moveModule(mod.id, "down")}
                              disabled={isLast || reorderMutation.isPending}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                            <BookOpen className="w-5 h-5 text-gold" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-mono">{String(idx + 1).padStart(2, "0")}</span>
                              <p className="font-medium text-foreground text-[15px]">{mod.title}</p>
                            </div>
                            {mod.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{mod.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {modLessons.length} {modLessons.length === 1 ? "aula" : "aulas"}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteModuleMutation.mutate(mod.id)}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          data-testid={`button-delete-module-${mod.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ========== LESSONS TAB ========== */}
          <TabsContent value="lessons" className="space-y-6 mt-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">
                Aulas ({lessons.length})
              </h3>
              <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-medium" data-testid="button-add-lesson">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Nova aula
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border/40">
                  <DialogHeader>
                    <DialogTitle className="text-lg">Nova aula</DialogTitle>
                    <DialogDescription className="text-muted-foreground">Adicione uma nova aula a um módulo</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Módulo</Label>
                      <Select
                        onValueChange={(v) => setLessonForm(f => ({ ...f, moduleId: parseInt(v) }))}
                      >
                        <SelectTrigger className="bg-background/50 border-border/40" data-testid="select-lesson-module">
                          <SelectValue placeholder="Selecione o módulo" />
                        </SelectTrigger>
                        <SelectContent>
                          {modules.map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {m.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Título da aula</Label>
                      <Input
                        value={lessonForm.title}
                        onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Ex: Técnicas de aplicação"
                        className="bg-background/50 border-border/40"
                        data-testid="input-lesson-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label>
                      <Textarea
                        value={lessonForm.description}
                        onChange={e => setLessonForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Descrição da aula..."
                        className="bg-background/50 border-border/40"
                        data-testid="input-lesson-description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">URL do vídeo</Label>
                      <Input
                        value={lessonForm.videoUrl}
                        onChange={e => setLessonForm(f => ({ ...f, videoUrl: e.target.value }))}
                        placeholder="https://youtube.com/watch?v=..."
                        className="bg-background/50 border-border/40"
                        data-testid="input-lesson-video"
                      />
                      <p className="text-xs text-muted-foreground">YouTube, Vimeo ou Google Drive</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Duração</Label>
                      <Input
                        value={lessonForm.duration}
                        onChange={e => setLessonForm(f => ({ ...f, duration: e.target.value }))}
                        placeholder="Ex: 25:00"
                        className="bg-background/50 border-border/40"
                        data-testid="input-lesson-duration"
                      />
                    </div>
                    <Button
                      className="w-full bg-gold text-background hover:bg-gold/90 font-medium"
                      onClick={() => createLessonMutation.mutate()}
                      disabled={!lessonForm.title || !lessonForm.moduleId || createLessonMutation.isPending}
                      data-testid="button-save-lesson"
                    >
                      Criar aula
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {lessons.length === 0 ? (
              <Card className="border-border/30 bg-card/40">
                <CardContent className="p-12 text-center">
                  <div className="w-14 h-14 rounded-xl bg-card/80 flex items-center justify-center mx-auto mb-4">
                    <Video className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">Nenhuma aula criada ainda</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {[...modules].sort((a, b) => a.order - b.order).map((mod) => {
                  const modLessons = lessons.filter(l => l.moduleId === mod.id).sort((a, b) => a.order - b.order);
                  if (modLessons.length === 0) return null;
                  return (
                    <div key={mod.id} className="space-y-3">
                      {/* Module header */}
                      <div className="flex items-center gap-3 pb-1">
                        <div className="w-7 h-7 rounded-md bg-gold/10 flex items-center justify-center shrink-0">
                          <BookOpen className="w-3.5 h-3.5 text-gold" />
                        </div>
                        <h4 className="text-xs font-semibold text-gold uppercase tracking-brand">
                          {mod.title}
                        </h4>
                        <div className="flex-1 h-px bg-border/30" />
                        <span className="text-xs text-muted-foreground">
                          {modLessons.length} {modLessons.length === 1 ? "aula" : "aulas"}
                        </span>
                      </div>

                      {/* Lessons list */}
                      <div className="space-y-2 pl-2">
                        {modLessons.map((lesson, idx) => (
                          <Card key={lesson.id} className="border-border/25 bg-card/40 hover:bg-card/60 transition-colors">
                            <CardContent className="p-4 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div className="w-8 h-8 rounded-md bg-background/60 flex items-center justify-center shrink-0 text-sm font-medium text-muted-foreground">
                                  {idx + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {lesson.title}
                                  </p>
                                  <div className="flex items-center gap-2.5 mt-1">
                                    {lesson.duration && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {lesson.duration}
                                      </span>
                                    )}
                                    {lesson.videoUrl ? (
                                      <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-0 px-1.5">
                                        Com vídeo
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px] border-border/30 text-muted-foreground px-1.5">
                                        Sem vídeo
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteLessonMutation.mutate(lesson.id)}
                                className="text-muted-foreground hover:text-destructive shrink-0"
                                data-testid={`button-delete-lesson-${lesson.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <footer className="border-t border-border/20 mt-8 py-5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <PerplexityAttribution />
        </div>
      </footer>
    </div>
  );
}
