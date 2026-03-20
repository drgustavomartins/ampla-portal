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
import { useToast } from "@/hooks/use-toast";
import {
  Users, BookOpen, Layers, LogOut, Plus, Trash2, Check, X,
  Clock, Video, Shield
} from "lucide-react";
import type { Module, Lesson, Plan, User } from "@shared/schema";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

type SafeUser = Omit<User, "password">;

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const { data: students = [] } = useQuery<SafeUser[]>({ queryKey: ["/api/admin/students"] });
  const { data: pendingStudents = [] } = useQuery<SafeUser[]>({ queryKey: ["/api/admin/students/pending"] });
  const { data: modules = [] } = useQuery<Module[]>({ queryKey: ["/api/modules"] });
  const { data: lessons = [] } = useQuery<Lesson[]>({ queryKey: ["/api/lessons"] });
  const { data: plans = [] } = useQuery<Plan[]>({ queryKey: ["/api/plans"] });

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

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-icon.png" alt="Ampla Facial" className="w-7 h-7 object-contain" />
            <span className="text-sm font-medium text-gold tracking-wide">AMPLA FACIAL</span>
            <Badge variant="secondary" className="text-[10px] bg-gold/10 text-gold border-0 ml-1">
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.name}
            </span>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-gold" onClick={logout} data-testid="button-admin-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-border/40 bg-card/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Pendentes</p>
                <p className="text-lg font-semibold text-foreground">{pendingStudents.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/40 bg-card/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Ativos</p>
                <p className="text-lg font-semibold text-foreground">{approvedStudents.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/40 bg-card/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center">
                <Layers className="w-4 h-4 text-gold" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Módulos</p>
                <p className="text-lg font-semibold text-foreground">{modules.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/40 bg-card/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center">
                <Video className="w-4 h-4 text-gold" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Aulas</p>
                <p className="text-lg font-semibold text-foreground">{lessons.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="students">
          <TabsList className="w-full grid grid-cols-3 bg-card/60 border border-border/40">
            <TabsTrigger value="students" data-testid="tab-students" className="data-[state=active]:text-gold">
              <Users className="w-4 h-4 mr-1.5" />
              Alunos
            </TabsTrigger>
            <TabsTrigger value="modules" data-testid="tab-modules" className="data-[state=active]:text-gold">
              <Layers className="w-4 h-4 mr-1.5" />
              Módulos
            </TabsTrigger>
            <TabsTrigger value="lessons" data-testid="tab-lessons" className="data-[state=active]:text-gold">
              <Video className="w-4 h-4 mr-1.5" />
              Aulas
            </TabsTrigger>
          </TabsList>

          {/* ========== STUDENTS TAB ========== */}
          <TabsContent value="students" className="space-y-4 mt-4">
            {pendingStudents.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-brand flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Aguardando aprovação ({pendingStudents.length})
                </h3>
                {pendingStudents.map((s) => {
                  const plan = plans.find(p => p.id === s.planId);
                  return (
                    <Card key={s.id} className="border-amber-500/20 bg-card/60">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate text-foreground">{s.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{s.email}</p>
                          {plan && <Badge variant="secondary" className="mt-1 text-xs bg-gold/10 text-gold border-0">{plan.name}</Badge>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="bg-gold text-background hover:bg-gold/90"
                            onClick={() => approveMutation.mutate(s.id)}
                            disabled={approveMutation.isPending}
                            data-testid={`button-approve-${s.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-border/50"
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
            )}

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">
                Todos os alunos ({students.length})
              </h3>
              {students.length === 0 ? (
                <Card className="border-border/40 bg-card/60">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum aluno cadastrado ainda</p>
                  </CardContent>
                </Card>
              ) : (
                students.map((s) => {
                  const plan = plans.find(p => p.id === s.planId);
                  const daysLeft = s.accessExpiresAt
                    ? Math.max(0, Math.ceil((new Date(s.accessExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                    : 0;
                  return (
                    <Card key={s.id} className="border-border/40 bg-card/60">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate text-foreground">{s.name}</p>
                            {s.approved ? (
                              <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-400 border-0">
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-400 border-0">
                                Pendente
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{s.email}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {plan && <span>Plano: {plan.name}</span>}
                            {s.approved && <span>• {daysLeft} dias restantes</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {s.approved ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-border/50"
                              onClick={() => revokeMutation.mutate(s.id)}
                              data-testid={`button-revoke-${s.id}`}
                            >
                              Revogar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-gold text-background hover:bg-gold/90"
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
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-student-${s.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* ========== MODULES TAB ========== */}
          <TabsContent value="modules" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">
                Módulos ({modules.length})
              </h3>
              <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gold text-background hover:bg-gold/90" data-testid="button-add-module">
                    <Plus className="w-4 h-4 mr-1" />
                    Novo módulo
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border/50">
                  <DialogHeader>
                    <DialogTitle>Novo módulo</DialogTitle>
                    <DialogDescription>Adicione um novo módulo de aulas</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Título</Label>
                      <Input
                        value={moduleForm.title}
                        onChange={e => setModuleForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Ex: Skinboosters"
                        className="bg-background/50 border-border/50"
                        data-testid="input-module-title"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label>
                      <Textarea
                        value={moduleForm.description}
                        onChange={e => setModuleForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Descrição do módulo..."
                        className="bg-background/50 border-border/50"
                        data-testid="input-module-description"
                      />
                    </div>
                    <Button
                      className="w-full bg-gold text-background hover:bg-gold/90"
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

            {modules.map((mod) => {
              const modLessons = lessons.filter(l => l.moduleId === mod.id);
              return (
                <Card key={mod.id} className="border-border/40 bg-card/60">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-gold shrink-0" />
                        <p className="font-medium truncate text-foreground">{mod.title}</p>
                      </div>
                      {mod.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 ml-6 truncate">{mod.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 ml-6">{modLessons.length} aulas</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteModuleMutation.mutate(mod.id)}
                      className="text-destructive hover:text-destructive shrink-0"
                      data-testid={`button-delete-module-${mod.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ========== LESSONS TAB ========== */}
          <TabsContent value="lessons" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">
                Aulas ({lessons.length})
              </h3>
              <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gold text-background hover:bg-gold/90" data-testid="button-add-lesson">
                    <Plus className="w-4 h-4 mr-1" />
                    Nova aula
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border/50">
                  <DialogHeader>
                    <DialogTitle>Nova aula</DialogTitle>
                    <DialogDescription>Adicione uma nova aula a um módulo</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Módulo</Label>
                      <Select
                        onValueChange={(v) => setLessonForm(f => ({ ...f, moduleId: parseInt(v) }))}
                      >
                        <SelectTrigger className="bg-background/50 border-border/50" data-testid="select-lesson-module">
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
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Título da aula</Label>
                      <Input
                        value={lessonForm.title}
                        onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Ex: Técnicas de aplicação"
                        className="bg-background/50 border-border/50"
                        data-testid="input-lesson-title"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label>
                      <Textarea
                        value={lessonForm.description}
                        onChange={e => setLessonForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Descrição da aula..."
                        className="bg-background/50 border-border/50"
                        data-testid="input-lesson-description"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">URL do vídeo</Label>
                      <Input
                        value={lessonForm.videoUrl}
                        onChange={e => setLessonForm(f => ({ ...f, videoUrl: e.target.value }))}
                        placeholder="https://youtube.com/watch?v=..."
                        className="bg-background/50 border-border/50"
                        data-testid="input-lesson-video"
                      />
                      <p className="text-xs text-muted-foreground">YouTube, Vimeo ou Google Drive</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Duração</Label>
                      <Input
                        value={lessonForm.duration}
                        onChange={e => setLessonForm(f => ({ ...f, duration: e.target.value }))}
                        placeholder="Ex: 25:00"
                        className="bg-background/50 border-border/50"
                        data-testid="input-lesson-duration"
                      />
                    </div>
                    <Button
                      className="w-full bg-gold text-background hover:bg-gold/90"
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

            {modules.map((mod) => {
              const modLessons = lessons.filter(l => l.moduleId === mod.id).sort((a, b) => a.order - b.order);
              if (modLessons.length === 0) return null;
              return (
                <div key={mod.id} className="space-y-2">
                  <h4 className="text-xs font-medium text-gold-muted uppercase tracking-brand flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    {mod.title}
                  </h4>
                  {modLessons.map((lesson) => (
                    <Card key={lesson.id} className="border-border/40 bg-card/60">
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Video className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <p className="text-sm font-medium truncate text-foreground">{lesson.title}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-5.5 mt-0.5">
                            {lesson.duration && (
                              <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                            )}
                            {lesson.videoUrl ? (
                              <Badge variant="secondary" className="text-xs bg-gold/10 text-gold border-0">Com vídeo</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs border-border/40">Sem vídeo</Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteLessonMutation.mutate(lesson.id)}
                          className="text-destructive hover:text-destructive shrink-0"
                          data-testid={`button-delete-lesson-${lesson.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>

      <footer className="border-t border-border/30 mt-8 py-4">
        <div className="max-w-6xl mx-auto px-4">
          <PerplexityAttribution />
        </div>
      </footer>
    </div>
  );
}
