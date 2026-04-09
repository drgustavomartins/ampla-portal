import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadsTab } from "@/components/LeadsTab";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Users, BookOpen, Layers, LogOut, Plus, Trash2, Check, X,
  Clock, Video, Shield, GraduationCap, Eye, Pencil, Calendar, Settings,
  CreditCard, RefreshCw, KeyRound, Copy, Loader2, History, UserCog, Library,
  GripVertical, CalendarDays, FolderOpen, Search, FileText, FileIcon, Headphones, ChevronDown, ChevronUp,
  Sparkles, MessageCircle, Phone
} from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, DragOverlay, type DragEndEvent, type DragStartEvent
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Module, Lesson, Plan, User, AuditLog, UserModule, UserMaterialCategory, MaterialTheme, MaterialSubcategory, MaterialFile } from "@shared/schema";

type SafeUser = Omit<User, "password">;
type LessonProgress = { id: number; userId: number; lessonId: number; completed: boolean; completedAt: string | null };
type PlanModuleEntry = { id: number; planId: number; moduleId: number };

function SortableModuleCard({
  mod, idx, modLessons, isSuperAdmin, reorderPending, onEdit, onDelete
}: {
  mod: Module; idx: number; modLessons: Lesson[]; isSuperAdmin: boolean;
  reorderPending: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef,
    transform, transition, isDragging
  } = useSortable({ id: mod.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`border-border/30 bg-card/50 transition-all ${isDragging ? "shadow-lg shadow-gold/10 opacity-90 scale-[1.02] border-gold/30" : "hover:bg-card/70"}`}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <button
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              className={`shrink-0 mt-1.5 cursor-grab active:cursor-grabbing touch-none rounded p-1 -ml-1 transition-colors ${isDragging ? "text-gold" : "text-muted-foreground/50 hover:text-gold/80"}`}
              aria-label="Arrastar para reordenar"
              disabled={reorderPending}
            >
              <GripVertical className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0 mt-0.5 hidden sm:flex"><BookOpen className="w-5 h-5 text-gold" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground font-mono">{String(idx + 1).padStart(2, "0")}</span><p className="font-medium text-foreground text-sm sm:text-[15px] truncate">{mod.title}</p></div>
                  {mod.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{mod.description}</p>}
                  <p className="text-xs text-muted-foreground mt-2">{modLessons.length} {modLessons.length === 1 ? "aula" : "aulas"}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-gold h-8 w-8 p-0" onClick={onEdit} data-testid={`button-edit-module-${mod.id}`}><Pencil className="w-4 h-4" /></Button>
                  {isSuperAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive h-8 w-8 p-0" data-testid={`button-delete-module-${mod.id}`}><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border/40">
                        <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir o módulo "{mod.title}"? Todas as aulas serão removidas.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel className="border-border/40">Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onDelete}>Excluir</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SortablePlanCard({
  plan, planStudents, planMods, matTopics, modules, isSuperAdmin,
  reorderPending, onEdit, onDelete
}: {
  plan: Plan; planStudents: SafeUser[]; planMods: PlanModuleEntry[]; matTopics: string[];
  modules: Module[]; isSuperAdmin: boolean; reorderPending: boolean;
  onEdit: () => void; onDelete: () => void;
}) {
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef,
    transform, transition, isDragging
  } = useSortable({ id: plan.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`border-border/30 bg-card/50 transition-all ${isDragging ? "shadow-lg shadow-gold/10 opacity-90 scale-[1.02] border-gold/30" : "hover:bg-card/70"}`}>
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                className={`shrink-0 cursor-grab active:cursor-grabbing touch-none rounded p-1 -ml-1 transition-colors ${isDragging ? "text-gold" : "text-muted-foreground/50 hover:text-gold/80"}`}
                aria-label="Arrastar para reordenar"
                disabled={reorderPending}
              >
                <GripVertical className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0"><CreditCard className="w-5 h-5 text-gold" /></div>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{plan.name}</p>
                {plan.price && <p className="text-sm text-gold font-medium">R$ {plan.price.replace(/^R\$\s?/, '')}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-gold" onClick={onEdit}>
                <Pencil className="w-4 h-4" />
              </Button>
              {isSuperAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border/40">
                  <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir o plano "{plan.name}"?</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel className="border-border/40">Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onDelete}>Excluir</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              )}
            </div>
          </div>
          {plan.description && <p className="text-sm text-muted-foreground line-clamp-2">{plan.description}</p>}
          <p className="text-xs text-gold/70">
            {planMods.length === 0
              ? "Todos os módulos"
              : planMods.map(pm => modules.find(m => m.id === pm.moduleId)?.title || "?").join(", ")}
          </p>
          {matTopics.length > 0 && (
            <p className="text-xs text-emerald-400/70">
              Materiais: {matTopics.join(", ")}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{plan.durationDays} dias</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{planStudents.length} {planStudents.length === 1 ? "aluno" : "alunos"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SortableLessonCard({
  lesson, idx, mod, isSuperAdmin, reorderPending, onEdit, onDelete
}: {
  lesson: Lesson; idx: number; mod: Module; isSuperAdmin: boolean;
  reorderPending: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef,
    transform, transition, isDragging
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`border-border/25 bg-card/40 transition-all ${isDragging ? "shadow-lg shadow-gold/10 opacity-90 scale-[1.02] border-gold/30" : "hover:bg-card/60"}`}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-4">
            <button
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              className={`shrink-0 mt-1 cursor-grab active:cursor-grabbing touch-none rounded p-1 -ml-1 transition-colors ${isDragging ? "text-gold" : "text-muted-foreground/50 hover:text-gold/80"}`}
              aria-label="Arrastar para reordenar"
              disabled={reorderPending}
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-background/60 flex items-center justify-center shrink-0 text-xs sm:text-sm font-medium text-muted-foreground">{idx + 1}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {lesson.duration && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{lesson.duration}</span>}
                    {lesson.videoUrl ? <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-0 px-1.5">Com vídeo</Badge> : <Badge variant="outline" className="text-[10px] border-border/30 text-muted-foreground px-1.5">Sem vídeo</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-gold h-8 w-8 p-0" onClick={onEdit} data-testid={`button-edit-lesson-${lesson.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                  {isSuperAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive h-8 w-8 p-0" data-testid={`button-delete-lesson-${lesson.id}`}><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border/40">
                        <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir a aula "{lesson.title}"?</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel className="border-border/40">Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onDelete}>Excluir</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  const { data: students = [] } = useQuery<SafeUser[]>({ queryKey: ["/api/admin/students"] });
  const { data: pendingStudents = [] } = useQuery<SafeUser[]>({ queryKey: ["/api/admin/students/pending"] });
  const { data: modules = [] } = useQuery<Module[]>({ queryKey: ["/api/modules"] });
  const { data: lessons = [] } = useQuery<Lesson[]>({ queryKey: ["/api/lessons"] });
  const { data: plans = [] } = useQuery<Plan[]>({ queryKey: ["/api/plans"] });
  const { data: allProgress = [] } = useQuery<LessonProgress[]>({ queryKey: ["/api/admin/students/progress"] });
  const { data: auditLogs = [] } = useQuery<AuditLog[]>({ queryKey: ["/api/admin/audit-logs"] });
  const { data: allPlanModules = [] } = useQuery<PlanModuleEntry[]>({ queryKey: ["/api/admin/plan-modules"] });
  const { data: admins = [] } = useQuery<SafeUser[]>({
    queryKey: ["/api/admin/admins"],
    enabled: isSuperAdmin,
  });

  // Materials CRUD
  type MaterialThemeWithNested = MaterialTheme & { subcategories: (MaterialSubcategory & { files: MaterialFile[] })[]; fileCount: number };
  const { data: trialStudents = [] } = useQuery<SafeUser[]>({ queryKey: ["/api/admin/students/trial"] });
  const { data: materialThemes = [] } = useQuery<MaterialThemeWithNested[]>({
    queryKey: ["/api/materials"],
    queryFn: async () => { const res = await apiRequest("GET", "/api/materials"); return res.json(); },
  });
  const [expandedThemeId, setExpandedThemeId] = useState<number | null>(null);
  const [expandedSubcatId, setExpandedSubcatId] = useState<number | null>(null);
  // Theme dialogs
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [themeForm, setThemeForm] = useState({ title: "", coverUrl: "", order: 0 });
  const [editingTheme, setEditingTheme] = useState<MaterialTheme | null>(null);
  const [editThemeForm, setEditThemeForm] = useState({ title: "", coverUrl: "", order: 0 });
  // Subcategory dialogs
  const [subcatDialogOpen, setSubcatDialogOpen] = useState(false);
  const [subcatForm, setSubcatForm] = useState({ name: "", order: 0 });
  const [editingSubcat, setEditingSubcat] = useState<MaterialSubcategory | null>(null);
  const [editSubcatForm, setEditSubcatForm] = useState({ name: "", order: 0 });
  // File dialogs
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [fileForm, setFileForm] = useState({ name: "", type: "pdf" as string, driveId: "", order: 0 });
  const [editingFile, setEditingFile] = useState<MaterialFile | null>(null);
  const [editFileForm, setEditFileForm] = useState({ name: "", type: "pdf" as string, driveId: "", order: 0 });

  // Theme mutations
  const createThemeMutation = useMutation({
    mutationFn: async () => { await apiRequest("POST", "/api/admin/materials/themes", themeForm); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/materials"] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] }); setThemeForm({ title: "", coverUrl: "", order: 0 }); setThemeDialogOpen(false); toast({ title: "Tema criado" }); },
    onError: (error: any) => { toast({ title: "Erro ao criar tema", description: error.message, variant: "destructive" }); },
  });
  const updateThemeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { await apiRequest("PUT", `/api/admin/materials/themes/${id}`, data); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/materials"] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] }); setEditingTheme(null); toast({ title: "Tema atualizado" }); },
    onError: (error: any) => { toast({ title: "Erro ao atualizar tema", description: error.message, variant: "destructive" }); },
  });
  const deleteThemeMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/admin/materials/themes/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/materials"] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] }); toast({ title: "Tema excluído" }); },
    onError: (error: any) => { toast({ title: "Erro ao excluir tema", description: error.message, variant: "destructive" }); },
  });

  // Subcategory mutations
  const createSubcatMutation = useMutation({
    mutationFn: async (themeId: number) => { await apiRequest("POST", "/api/admin/materials/subcategories", { ...subcatForm, themeId }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/materials"] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] }); setSubcatForm({ name: "", order: 0 }); setSubcatDialogOpen(false); toast({ title: "Subcategoria criada" }); },
    onError: (error: any) => { toast({ title: "Erro ao criar subcategoria", description: error.message, variant: "destructive" }); },
  });
  const updateSubcatMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { await apiRequest("PUT", `/api/admin/materials/subcategories/${id}`, data); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/materials"] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] }); setEditingSubcat(null); toast({ title: "Subcategoria atualizada" }); },
    onError: (error: any) => { toast({ title: "Erro ao atualizar subcategoria", description: error.message, variant: "destructive" }); },
  });
  const deleteSubcatMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/admin/materials/subcategories/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/materials"] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] }); toast({ title: "Subcategoria excluída" }); },
    onError: (error: any) => { toast({ title: "Erro ao excluir subcategoria", description: error.message, variant: "destructive" }); },
  });

  // File mutations
  const createFileMutation = useMutation({
    mutationFn: async (subcategoryId: number) => { await apiRequest("POST", "/api/admin/materials/files", { ...fileForm, subcategoryId }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/materials"] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] }); setFileForm({ name: "", type: "pdf", driveId: "", order: 0 }); setFileDialogOpen(false); toast({ title: "Arquivo criado" }); },
    onError: (error: any) => { toast({ title: "Erro ao criar arquivo", description: error.message, variant: "destructive" }); },
  });
  const updateFileMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { await apiRequest("PUT", `/api/admin/materials/files/${id}`, data); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/materials"] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] }); setEditingFile(null); toast({ title: "Arquivo atualizado" }); },
    onError: (error: any) => { toast({ title: "Erro ao atualizar arquivo", description: error.message, variant: "destructive" }); },
  });
  const deleteFileMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/admin/materials/files/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/materials"] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] }); toast({ title: "Arquivo excluído" }); },
    onError: (error: any) => { toast({ title: "Erro ao excluir arquivo", description: error.message, variant: "destructive" }); },
  });

  // Student search
  const [studentSearch, setStudentSearch] = useState("");

  // Student detail view
  const [selectedStudent, setSelectedStudent] = useState<SafeUser | null>(null);

  // Approve dialog state
  const [approvingStudent, setApprovingStudent] = useState<SafeUser | null>(null);
  const [approvePlanId, setApprovePlanId] = useState<string>("");

  // Approve / Revoke
  const approveMutation = useMutation({
    mutationFn: async ({ id, planId }: { id: number; planId?: number }) => {
      await apiRequest("POST", `/api/admin/students/${id}/approve`, planId ? { planId } : {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students/trial"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      setApprovingStudent(null);
      setApprovePlanId("");
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students/trial"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      setModuleForm({ title: "", description: "", order: 0 });
      setModuleDialogOpen(false);
      toast({ title: "Módulo criado" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar módulo", description: error.message, variant: "destructive" });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/modules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      toast({ title: "Módulo removido" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message?.includes("403") ? "Apenas o super admin pode excluir módulos" : error.message, variant: "destructive" });
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
    onError: (error: any) => {
      toast({ title: "Erro ao reordenar", description: error.message, variant: "destructive" });
    },
  });

  const sortedModules = useMemo(
    () => [...modules].sort((a, b) => a.order - b.order),
    [modules]
  );

  const moduleIds = useMemo(
    () => sortedModules.map(m => m.id),
    [sortedModules]
  );

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Track active drag item for DragOverlay
  const [activeDragId, setActiveDragId] = useState<number | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(Number(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedModules.findIndex(m => m.id === active.id);
    const newIndex = sortedModules.findIndex(m => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(sortedModules, oldIndex, newIndex);
    reorderMutation.mutate(reordered.map(m => m.id));
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  // Reorder plans
  const reorderPlansMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      await apiRequest("POST", "/api/admin/plans/reorder", { orderedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      toast({ title: "Ordem dos planos atualizada" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao reordenar planos", description: error.message, variant: "destructive" });
    },
  });

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [plans]
  );

  const planIds = useMemo(
    () => sortedPlans.map(p => p.id),
    [sortedPlans]
  );

  const handlePlanDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedPlans.findIndex(p => p.id === active.id);
    const newIndex = sortedPlans.findIndex(p => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(sortedPlans, oldIndex, newIndex);
    reorderPlansMutation.mutate(reordered.map(p => p.id));
  };

  // Lesson drag and drop handler (per-module)
  const handleLessonDragEnd = (moduleId: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const moduleLessons = lessons.filter(l => l.moduleId === moduleId).sort((a, b) => a.order - b.order);
    const oldIndex = moduleLessons.findIndex(l => l.id === active.id);
    const newIndex = moduleLessons.findIndex(l => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(moduleLessons, oldIndex, newIndex);
    reorderLessonsMutation.mutate(reordered.map(l => l.id));
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      setLessonForm({ moduleId: 0, title: "", description: "", videoUrl: "", duration: "" });
      setLessonDialogOpen(false);
      toast({ title: "Aula criada" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar aula", description: error.message, variant: "destructive" });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/lessons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      toast({ title: "Aula removida" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message?.includes("403") ? "Apenas o super admin pode excluir aulas" : error.message, variant: "destructive" });
    },
  });

  // Reorder lessons
  const reorderLessonsMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      await apiRequest("POST", "/api/admin/lessons/reorder", { orderedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      toast({ title: "Ordem das aulas atualizada" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao reordenar aulas", description: error.message, variant: "destructive" });
    },
  });

  // ── Plan CRUD ──
  const MATERIAL_TOPIC_OPTIONS = [
    "Toxina Botulínica",
    "Preenchedores Faciais",
    "Bioestimuladores de Colágeno",
    "Moduladores de Matriz Extracelular",
    "Método NaturalUp®",
    "IA na Medicina",
  ];
  const [planForm, setPlanForm] = useState({ name: "", description: "", durationDays: 0, price: "", moduleIds: [] as number[], materialTopics: [] as string[] });
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editPlanForm, setEditPlanForm] = useState({ name: "", description: "", durationDays: 0, price: "", moduleIds: [] as number[], materialTopics: [] as string[] });

  const createPlanMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/plans", planForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plan-modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      setPlanForm({ name: "", description: "", durationDays: 0, price: "", moduleIds: [], materialTopics: [] });
      setPlanDialogOpen(false);
      toast({ title: "Plano criado" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar plano", description: error.message, variant: "destructive" });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof editPlanForm }) => {
      await apiRequest("PATCH", `/api/admin/plans/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plan-modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      setEditingPlan(null);
      toast({ title: "Plano atualizado" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar plano", description: error.message, variant: "destructive" });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      toast({ title: "Plano removido" });
    },
  });

  // ── Student Edit ──
  const [editingStudent, setEditingStudent] = useState<SafeUser | null>(null);
  const [editStudentForm, setEditStudentForm] = useState({
    name: "", phone: "", planId: 0, accessExpiresAt: "", approved: false,
    communityAccess: true, supportAccess: true, supportExpiresAt: "",
    clinicalPracticeAccess: true,
    materialsAccess: false,
    mentorshipStartDate: "", mentorshipEndDate: "",
  });
  // Per-user module permissions state: { [moduleId]: { enabled, startDate, endDate } }
  const [editUserModules, setEditUserModules] = useState<Record<number, { enabled: boolean; startDate: string; endDate: string }>>({});
  // Per-user material category permissions state: { [title]: enabled }
  const [editUserMaterialCats, setEditUserMaterialCats] = useState<Record<string, boolean>>({});

  const MATERIAL_CATEGORY_TITLES = [
    "Toxina Botulínica", "Preenchedores Faciais", "Bioestimuladores de Colágeno",
    "Moduladores de Matriz Extracelular", "Método NaturalUp®", "IA na Medicina",
  ];

  const updateStudentMutation = useMutation({
    mutationFn: async ({ id, data, userModulesData, userMaterialCatsData }: { id: number; data: any; userModulesData?: any; userMaterialCatsData?: any }) => {
      await apiRequest("PATCH", `/api/admin/students/${id}`, data);
      if (userModulesData) {
        await apiRequest("PUT", `/api/admin/students/${id}/modules`, { modules: userModulesData });
      }
      if (userMaterialCatsData) {
        await apiRequest("PUT", `/api/admin/students/${id}/material-categories`, { categories: userMaterialCatsData });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students/trial"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      setEditingStudent(null);
      toast({ title: "Aluno atualizado" });
    },
  });

  // ── Renew Access ──
  const [renewingStudent, setRenewingStudent] = useState<SafeUser | null>(null);
  const [renewDays, setRenewDays] = useState(30);

  const renewAccessMutation = useMutation({
    mutationFn: async ({ id, days }: { id: number; days: number }) => {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + days);
      await apiRequest("PATCH", `/api/admin/students/${id}`, { accessExpiresAt: newExpiry.toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      setRenewingStudent(null);
      setRenewDays(30);
      toast({ title: "Acesso renovado" });
    },
  });

  // ── Password Reset ──
  const [resetLinkDialog, setResetLinkDialog] = useState<{ student: SafeUser; link: string } | null>(null);

  const resetPasswordMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/students/${id}/reset-password`);
      return res.json();
    },
    onSuccess: (data, id) => {
      const student = students.find(s => s.id === id);
      const link = `${window.location.origin}${window.location.pathname}#/reset-password/${data.token}`;
      setResetLinkDialog({ student: student!, link });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Edit module
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editModuleForm, setEditModuleForm] = useState({ title: "", description: "" });

  const updateModuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { title: string; description: string } }) => {
      await apiRequest("PATCH", `/api/admin/modules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      setEditingModule(null);
      toast({ title: "Módulo atualizado" });
    },
  });

  // Edit lesson
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editLessonForm, setEditLessonForm] = useState({ title: "", description: "", videoUrl: "", duration: "", moduleId: 0 });

  const updateLessonMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { title: string; description: string; videoUrl: string; duration: string; moduleId: number } }) => {
      await apiRequest("PATCH", `/api/admin/lessons/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      setEditingLesson(null);
      toast({ title: "Aula atualizada" });
    },
  });

  // ── Admin CRUD (super_admin only) ──
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: "", email: "", password: "", phone: "" });

  const createAdminMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/admins", adminForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      setAdminForm({ name: "", email: "", password: "", phone: "" });
      setAdminDialogOpen(false);
      toast({ title: "Admin criado com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteAdminMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/admins/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      toast({ title: "Admin removido" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Audit log filter state
  const [logFilterAdmin, setLogFilterAdmin] = useState<string>("all");
  const [logFilterAction, setLogFilterAction] = useState<string>("all");

  const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name));
  const sortedPendingStudents = [...pendingStudents].sort((a, b) => a.name.localeCompare(b.name));
  const approvedStudents = sortedStudents.filter(s => s.approved);

  // Progress helpers
  const getStudentProgress = (studentId: number) => {
    const completed = allProgress.filter(p => p.userId === studentId && p.completed);
    const total = lessons.length;
    return { completed: completed.length, total, percent: total > 0 ? Math.round((completed.length / total) * 100) : 0 };
  };

  const getStudentLessonCompleted = (studentId: number, lessonId: number) => {
    return allProgress.some(p => p.userId === studentId && p.lessonId === lessonId && p.completed);
  };

  // Audit log helpers
  const actionLabels: Record<string, string> = {
    admin_login: "Login",
    student_approved: "Aluno aprovado",
    student_revoked: "Acesso revogado",
    student_deleted: "Aluno excluído",
    student_updated: "Aluno atualizado",
    plan_created: "Plano criado",
    plan_updated: "Plano atualizado",
    plan_deleted: "Plano excluído",
    module_created: "Módulo criado",
    module_updated: "Módulo atualizado",
    module_deleted: "Módulo excluído",
    lesson_created: "Aula criada",
    lesson_updated: "Aula atualizada",
    lesson_deleted: "Aula excluída",
    password_reset: "Reset de senha",
    admin_created: "Admin criado",
    admin_deleted: "Admin excluído",
    access_toggled: "Acesso alterado",
  };

  const filteredLogs = auditLogs.filter(log => {
    if (logFilterAdmin !== "all" && String(log.adminId) !== logFilterAdmin) return false;
    if (logFilterAction !== "all" && log.action !== logFilterAction) return false;
    return true;
  });

  const uniqueActions = [...new Set(auditLogs.map(l => l.action))];
  const uniqueAdmins = [...new Map(auditLogs.map(l => [l.adminId, l.adminName])).entries()];

  // Tab count: how many tabs to show
  const tabCount = isSuperAdmin ? 8 : 6;

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
              {isSuperAdmin ? "Super Admin" : "Admin"}
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
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                  </div>
                  {stat.label === "Pendentes" && pendingStudents.length > 0 && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
                    </span>
                  )}
                </div>
                <p className="text-xl sm:text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-brand mt-1">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ─── Main Content Tabs ─── */}
        <Tabs defaultValue="lessons" className="space-y-6">
          <TabsList className={`w-full grid bg-card/60 border border-border/30 p-1 h-11 sm:h-12 ${isSuperAdmin ? "grid-cols-8" : "grid-cols-6"}`}>
            <TabsTrigger
              value="students"
              data-testid="tab-students"
              className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold data-[state=active]:shadow-none rounded-md text-xs sm:text-sm font-medium transition-all px-1 sm:px-3"
            >
              <Users className="w-4 h-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Alunos</span>
            </TabsTrigger>
            <TabsTrigger
              value="leads"
              data-testid="tab-leads"
              className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold data-[state=active]:shadow-none rounded-md text-xs sm:text-sm font-medium transition-all px-1 sm:px-3 relative"
            >
              <Users className="w-4 h-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Leads</span>
              {trialStudents.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold text-[#0A1628] text-[10px] font-bold rounded-full flex items-center justify-center">
                  {trialStudents.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="plans"
              data-testid="tab-plans"
              className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold data-[state=active]:shadow-none rounded-md text-xs sm:text-sm font-medium transition-all px-1 sm:px-3"
            >
              <CreditCard className="w-4 h-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Planos</span>
            </TabsTrigger>
            <TabsTrigger
              value="modules"
              data-testid="tab-modules"
              className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold data-[state=active]:shadow-none rounded-md text-xs sm:text-sm font-medium transition-all px-1 sm:px-3"
            >
              <Layers className="w-4 h-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Módulos</span>
            </TabsTrigger>
            <TabsTrigger
              value="lessons"
              data-testid="tab-lessons"
              className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold data-[state=active]:shadow-none rounded-md text-xs sm:text-sm font-medium transition-all px-1 sm:px-3"
            >
              <Video className="w-4 h-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Aulas</span>
            </TabsTrigger>
            <TabsTrigger
              value="materiais"
              data-testid="tab-materiais"
              className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold data-[state=active]:shadow-none rounded-md text-xs sm:text-sm font-medium transition-all px-1 sm:px-3"
            >
              <Library className="w-4 h-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Materiais</span>
            </TabsTrigger>
            {isSuperAdmin && (
              <>
                <TabsTrigger
                  value="admins"
                  data-testid="tab-admins"
                  className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold data-[state=active]:shadow-none rounded-md text-xs sm:text-sm font-medium transition-all px-1 sm:px-3"
                >
                  <UserCog className="w-4 h-4 sm:mr-2 shrink-0" />
                  <span className="hidden sm:inline">Admins</span>
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  data-testid="tab-history"
                  className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold data-[state=active]:shadow-none rounded-md text-xs sm:text-sm font-medium transition-all px-1 sm:px-3"
                >
                  <History className="w-4 h-4 sm:mr-2 shrink-0" />
                  <span className="hidden sm:inline">Histórico</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* ========== STUDENTS TAB ========== */}
          <TabsContent value="students" className="space-y-6 mt-0">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Buscar aluno por nome..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-9 bg-card/50 border-border/40 placeholder:text-muted-foreground/60"
              />
            </div>

            {(() => {
              const searchQuery = studentSearch.trim().toLowerCase();
              const filteredPending = searchQuery
                ? sortedPendingStudents.filter((s) => s.name.toLowerCase().includes(searchQuery))
                : sortedPendingStudents;
              const filteredStudents = searchQuery
                ? sortedStudents.filter((s) => s.name.toLowerCase().includes(searchQuery) && s.role !== "trial")
                : sortedStudents.filter(s => s.role !== "trial");
              const filteredTrial = searchQuery
                ? trialStudents.filter((s) => s.name.toLowerCase().includes(searchQuery))
                : trialStudents;
              const noResults = searchQuery && filteredPending.length === 0 && filteredStudents.length === 0 && filteredTrial.length === 0;

              return (
                <>
                  {noResults && (
                    <Card className="border-border/30 bg-card/40">
                      <CardContent className="p-12 text-center">
                        <div className="w-14 h-14 rounded-xl bg-card/80 flex items-center justify-center mx-auto mb-4">
                          <Search className="w-7 h-7 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm text-muted-foreground">Nenhum aluno encontrado</p>
                      </CardContent>
                    </Card>
                  )}

            {filteredPending.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-brand">
                    Aguardando aprovação ({filteredPending.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {filteredPending.map((s) => (
                    <Card key={s.id} className="border-amber-500/20 bg-card/50">
                      <CardContent className="p-4 space-y-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{s.name}</p>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">{s.email}</p>
                          {s.phone && <p className="text-xs text-muted-foreground truncate mt-0.5">{s.phone}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="bg-gold text-background hover:bg-gold/90 font-medium flex-1 sm:flex-none"
                            onClick={() => { setApprovingStudent(s); setApprovePlanId(""); }}
                            data-testid={`button-approve-${s.id}`}
                          >
                            <Check className="w-4 h-4 mr-1.5" />
                            Aprovar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-border/40 hover:border-destructive/50 hover:text-destructive"
                                data-testid={`button-reject-${s.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border/40">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja rejeitar e excluir {s.name}? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-border/40">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteStudentMutation.mutate(s.id)}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">
                Todos os alunos ({filteredStudents.length})
              </h3>
              {filteredStudents.length === 0 ? (
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
                  {filteredStudents.map((s) => {
                    const plan = plans.find(p => p.id === s.planId);
                    const daysLeft = s.accessExpiresAt
                      ? Math.max(0, Math.ceil((new Date(s.accessExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                      : 0;
                    const progress = getStudentProgress(s.id);
                    return (
                      <Card key={s.id} className="border-border/30 bg-card/50 hover:bg-card/70 transition-colors">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
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
                              {s.phone && <p className="text-xs text-muted-foreground truncate mt-0.5">{s.phone}</p>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {s.approved && (
                                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-gold h-8 w-8 p-0" onClick={() => setSelectedStudent(s)} title="Ver progresso">
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button
                                size="sm" variant="ghost" className="text-muted-foreground hover:text-gold h-8 w-8 p-0"
                                onClick={async () => {
                                  setEditingStudent(s);
                                  setEditStudentForm({
                                    name: s.name,
                                    phone: s.phone || "",
                                    planId: s.planId || 0,
                                    accessExpiresAt: s.accessExpiresAt ? s.accessExpiresAt.slice(0, 16) : "",
                                    approved: s.approved,
                                    communityAccess: s.communityAccess ?? true,
                                    supportAccess: s.supportAccess ?? true,
                                    supportExpiresAt: s.supportExpiresAt ? s.supportExpiresAt.slice(0, 16) : "",
                                    clinicalPracticeAccess: s.clinicalPracticeAccess ?? true,
                                    materialsAccess: s.materialsAccess ?? false,
                                    mentorshipStartDate: (s as any).mentorshipStartDate ? (s as any).mentorshipStartDate.slice(0, 10) : "",
                                    mentorshipEndDate: (s as any).mentorshipEndDate ? (s as any).mentorshipEndDate.slice(0, 10) : "",
                                  });
                                  // Load user module permissions
                                  try {
                                    const res = await apiRequest("GET", `/api/admin/students/${s.id}/modules`);
                                    const userMods: any[] = await res.json();
                                    const modsMap: Record<number, { enabled: boolean; startDate: string; endDate: string }> = {};
                                    userMods.forEach((um: any) => {
                                      modsMap[um.moduleId] = {
                                        enabled: um.enabled,
                                        startDate: um.startDate ? um.startDate.slice(0, 10) : "",
                                        endDate: um.endDate ? um.endDate.slice(0, 10) : "",
                                      };
                                    });
                                    setEditUserModules(modsMap);
                                  } catch { setEditUserModules({}); }
                                  // Load user material category permissions
                                  try {
                                    const res = await apiRequest("GET", `/api/admin/students/${s.id}/material-categories`);
                                    const userCats: any[] = await res.json();
                                    const catsMap: Record<string, boolean> = {};
                                    userCats.forEach((uc: any) => { catsMap[uc.categoryTitle] = uc.enabled; });
                                    setEditUserMaterialCats(catsMap);
                                  } catch { setEditUserMaterialCats({}); }
                                }}
                                title="Editar aluno"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-gold h-8 w-8 p-0" onClick={() => resetPasswordMutation.mutate(s.id)} title="Resetar senha" disabled={resetPasswordMutation.isPending}>
                                <KeyRound className="w-3.5 h-3.5" />
                              </Button>
                              {s.phone && (
                                <a href={`https://wa.me/55${s.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-green-400 h-8 w-8 p-0" title="WhatsApp">
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </Button>
                                </a>
                              )}
                              {isSuperAdmin && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive h-8 w-8 p-0" data-testid={`button-delete-student-${s.id}`}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-card border-border/40">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>Tem certeza que deseja excluir {s.name}? Esta ação não pode ser desfeita.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="border-border/40">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteStudentMutation.mutate(s.id)}>Excluir</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              )}
                            </div>
                          </div>

                          {s.approved && (
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              {plan && (
                                <div className="bg-background/30 rounded-md px-2.5 py-1.5">
                                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Plano</span>
                                  <span className="text-foreground font-medium">{plan.name}</span>
                                </div>
                              )}
                              {daysLeft > 0 && (
                                <div className="bg-background/30 rounded-md px-2.5 py-1.5">
                                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Restante</span>
                                  <span className="text-foreground font-medium">{daysLeft} dias</span>
                                </div>
                              )}
                              <div className="bg-background/30 rounded-md px-2.5 py-1.5">
                                <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Aulas</span>
                                <span className={`font-medium ${progress.percent === 100 ? "text-emerald-400" : "text-foreground"}`}>
                                  {progress.completed}/{progress.total}
                                </span>
                              </div>
                            </div>
                          )}
                          {!s.approved && plan && (
                            <div className="text-xs text-muted-foreground">Plano: {plan.name}</div>
                          )}

                          {s.approved && lessons.length > 0 && (
                            <div className="flex items-center gap-3">
                              <Progress value={progress.percent} className="h-1.5 flex-1" />
                              <span className="text-xs text-muted-foreground w-8 text-right">{progress.percent}%</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            {s.approved ? (
                              <>
                                <Button size="sm" variant="outline" className="border-gold/30 text-gold hover:bg-gold/10 text-xs flex-1 sm:flex-none" onClick={() => { setRenewingStudent(s); setRenewDays(30); }} title="Renovar acesso">
                                  <RefreshCw className="w-3 h-3 mr-1.5" />
                                  Renovar
                                </Button>
                                {isSuperAdmin && (
                                <Button size="sm" variant="outline" className="border-border/40 text-xs flex-1 sm:flex-none" onClick={() => revokeMutation.mutate(s.id)} data-testid={`button-revoke-${s.id}`}>
                                  Revogar
                                </Button>
                                )}
                              </>
                            ) : (
                              <Button size="sm" className="bg-gold text-background hover:bg-gold/90 text-xs flex-1 sm:flex-none" onClick={() => { setApprovingStudent(s); setApprovePlanId(""); }} data-testid={`button-approve-list-${s.id}`}>
                                <Check className="w-3 h-3 mr-1" />
                                Aprovar
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Trial Students Section */}
            {filteredTrial.length > 0 && (
              <div className="space-y-3 mt-6">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  Alunos em Trial ({filteredTrial.length})
                </h3>
                <div className="space-y-2">
                  {filteredTrial.map((s) => {
                    const daysLeft = s.accessExpiresAt
                      ? Math.ceil((new Date(s.accessExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : 0;
                    const isExpired = daysLeft <= 0;
                    return (
                      <Card key={s.id} className="border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate text-foreground">{s.name}</p>
                                {isExpired ? (
                                  <Badge variant="secondary" className="text-[11px] bg-red-500/10 text-red-400 border-0 shrink-0">
                                    Expirado
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[11px] bg-yellow-500/15 text-yellow-400 border-0 shrink-0">
                                    <Sparkles className="w-2.5 h-2.5 mr-1" />
                                    {daysLeft}d restantes
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate mt-0.5">{s.email}</p>
                              {s.phone && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  <Phone className="w-3 h-3 inline mr-1" />
                                  {s.phone}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                className="bg-gold text-background hover:bg-gold/90 text-xs h-8 gap-1.5"
                                onClick={() => { setApprovingStudent(s); setApprovePlanId(""); }}
                                title="Converter para pacote pago"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Converter
                              </Button>
                              <Button
                                size="sm" variant="ghost" className="text-muted-foreground hover:text-gold h-8 w-8 p-0"
                                title="Editar aluno trial"
                                onClick={() => {
                                  setEditingStudent(s);
                                  setEditStudentForm({
                                    name: s.name,
                                    phone: s.phone || "",
                                    planId: s.planId || 0,
                                    accessExpiresAt: s.accessExpiresAt ? s.accessExpiresAt.slice(0, 16) : "",
                                    approved: s.approved,
                                    communityAccess: s.communityAccess ?? true,
                                    supportAccess: s.supportAccess ?? true,
                                    supportExpiresAt: s.supportExpiresAt ? s.supportExpiresAt.slice(0, 16) : "",
                                    clinicalPracticeAccess: s.clinicalPracticeAccess ?? true,
                                    materialsAccess: s.materialsAccess ?? false,
                                    mentorshipStartDate: (s as any).mentorshipStartDate ? (s as any).mentorshipStartDate.slice(0, 10) : "",
                                    mentorshipEndDate: (s as any).mentorshipEndDate ? (s as any).mentorshipEndDate.slice(0, 10) : "",
                                  });
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive h-8 w-8 p-0">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-card border-border/40">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>Tem certeza que deseja excluir {s.name}? Esta ação não pode ser desfeita.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="border-border/40">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteStudentMutation.mutate(s.id)}>Excluir</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              {s.phone && (
                                <a
                                  href={`https://wa.me/55${s.phone.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10 text-xs h-8 w-8 p-0">
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </Button>
                                </a>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
                </>
              );
            })()}

            {/* Student Progress Detail Dialog */}
            <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
              <DialogContent className="bg-card border-border/40 max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-lg">Progresso do Aluno</DialogTitle>
                  <DialogDescription className="text-muted-foreground">{selectedStudent?.name} — {selectedStudent?.email}</DialogDescription>
                </DialogHeader>
                {selectedStudent && (
                  <div className="space-y-4 pt-2">
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
                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-emerald-500/20" : "bg-card/80 border border-border/40"}`}>
                                    {done && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                                  </div>
                                  <span className={`text-sm truncate ${done ? "text-foreground" : "text-muted-foreground"}`}>{lesson.title}</span>
                                  {lesson.duration && <span className="text-xs text-muted-foreground shrink-0 ml-auto">{lesson.duration}</span>}
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

            {/* Student Edit Dialog — redesigned with complete controls */}
            <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
              <DialogContent className="bg-card border-border/40 max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-gold" />
                    Editar Aluno
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">{editingStudent?.name} — {editingStudent?.email}</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 pt-2">

                  {/* ── Section: Dados do Aluno ── */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-gold uppercase tracking-brand flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" /> Dados do Aluno
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label>
                        <Input value={editStudentForm.name} onChange={e => setEditStudentForm(f => ({ ...f, name: e.target.value }))} className="bg-background/50 border-border/40" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Telefone</Label>
                        <Input type="tel" placeholder="+55 (11) 99999-9999" value={editStudentForm.phone} onChange={e => setEditStudentForm(f => ({ ...f, phone: e.target.value }))} className="bg-background/50 border-border/40" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
                      <Button
                        size="sm"
                        variant={editStudentForm.approved ? "default" : "outline"}
                        className={editStudentForm.approved ? "bg-emerald-600 hover:bg-emerald-700 text-white text-xs" : "border-border/40 text-xs"}
                        onClick={() => setEditStudentForm(f => ({ ...f, approved: !f.approved }))}
                      >
                        {editStudentForm.approved ? "Aprovado" : "Pendente"}
                      </Button>
                    </div>
                  </div>

                  <div className="w-full h-px bg-border/30" />

                  {/* ── Section: Plano e Vigencia ── */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-gold uppercase tracking-brand flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" /> Plano e Vigencia
                    </h4>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Plano</Label>
                      <Select value={editStudentForm.planId ? String(editStudentForm.planId) : ""} onValueChange={(v) => setEditStudentForm(f => ({ ...f, planId: parseInt(v) }))}>
                        <SelectTrigger className="bg-background/50 border-border/40"><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
                        <SelectContent>
                          {plans.map((p) => (<SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.durationDays} dias)</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Data de Inicio da Mentoria</Label>
                        <Input type="date" value={editStudentForm.mentorshipStartDate} onChange={e => setEditStudentForm(f => ({ ...f, mentorshipStartDate: e.target.value }))} className="bg-background/50 border-border/40" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Data de Fim da Mentoria</Label>
                        <Input type="date" value={editStudentForm.mentorshipEndDate} onChange={e => setEditStudentForm(f => ({ ...f, mentorshipEndDate: e.target.value }))} className="bg-background/50 border-border/40" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Data de Expiracao do Acesso</Label>
                      <Input type="datetime-local" value={editStudentForm.accessExpiresAt} onChange={e => setEditStudentForm(f => ({ ...f, accessExpiresAt: e.target.value }))} className="bg-background/50 border-border/40" />
                      <p className="text-xs text-muted-foreground">Controla quando o login do aluno expira</p>
                    </div>
                  </div>

                  <div className="w-full h-px bg-border/30" />

                  {/* ── Section: Modulos ── */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-gold uppercase tracking-brand flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" /> Modulos
                    </h4>
                    <p className="text-xs text-muted-foreground">Configure quais modulos o aluno pode acessar. Deixe todos desativados para usar o acesso do plano.</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {modules.sort((a, b) => a.order - b.order).map((mod) => {
                        const entry = editUserModules[mod.id];
                        const isEnabled = entry?.enabled ?? false;
                        return (
                          <div key={mod.id} className="rounded-lg border border-border/20 bg-background/30 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <Checkbox
                                  checked={isEnabled}
                                  onCheckedChange={(checked) => {
                                    setEditUserModules(prev => ({
                                      ...prev,
                                      [mod.id]: { enabled: !!checked, startDate: prev[mod.id]?.startDate || "", endDate: prev[mod.id]?.endDate || "" },
                                    }));
                                  }}
                                />
                                <span className="text-sm font-medium truncate">{mod.title}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0">#{mod.order}</span>
                            </div>
                            {isEnabled && (
                              <div className="grid grid-cols-2 gap-2 pl-6">
                                <div className="space-y-1">
                                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Inicio</Label>
                                  <Input type="date" value={entry?.startDate || ""} onChange={e => setEditUserModules(prev => ({ ...prev, [mod.id]: { ...prev[mod.id], startDate: e.target.value } }))} className="bg-background/50 border-border/40 h-8 text-xs" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fim</Label>
                                  <Input type="date" value={entry?.endDate || ""} onChange={e => setEditUserModules(prev => ({ ...prev, [mod.id]: { ...prev[mod.id], endDate: e.target.value } }))} className="bg-background/50 border-border/40 h-8 text-xs" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="w-full h-px bg-border/30" />

                  {/* ── Section: Materiais Complementares ── */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-gold uppercase tracking-brand flex items-center gap-2">
                      <Library className="w-3.5 h-3.5" /> Materiais Complementares
                    </h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Acesso a Materiais</Label>
                        <p className="text-xs text-muted-foreground">Habilita a secao de materiais para o aluno</p>
                      </div>
                      <Switch
                        checked={editStudentForm.materialsAccess}
                        onCheckedChange={(checked) => setEditStudentForm(f => ({ ...f, materialsAccess: checked }))}
                      />
                    </div>
                    {editStudentForm.materialsAccess && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Selecione as categorias de materiais. Deixe todas desativadas para usar o acesso do plano.</p>
                        {MATERIAL_CATEGORY_TITLES.map((title) => (
                          <div key={title} className="flex items-center justify-between rounded-lg border border-border/20 bg-background/30 px-3 py-2">
                            <span className="text-sm">{title}</span>
                            <Switch
                              checked={editUserMaterialCats[title] ?? false}
                              onCheckedChange={(checked) => setEditUserMaterialCats(prev => ({ ...prev, [title]: checked }))}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="w-full h-px bg-border/30" />

                  {/* ── Section: Features ── */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-gold uppercase tracking-brand flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5" /> Features
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Comunidade WhatsApp</Label>
                          <p className="text-xs text-muted-foreground">Acesso ao grupo da comunidade</p>
                        </div>
                        <Switch
                          checked={editStudentForm.communityAccess}
                          onCheckedChange={(checked) => setEditStudentForm(f => ({ ...f, communityAccess: checked }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Tire Duvidas (WhatsApp)</Label>
                          <p className="text-xs text-muted-foreground">Acesso ao suporte direto</p>
                        </div>
                        <Switch
                          checked={editStudentForm.supportAccess}
                          onCheckedChange={(checked) => setEditStudentForm(f => ({ ...f, supportAccess: checked }))}
                        />
                      </div>
                      {editStudentForm.supportAccess && (
                        <div className="space-y-2 pl-4 border-l-2 border-gold/20">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Prazo do suporte (opcional)</Label>
                          <Input type="datetime-local" value={editStudentForm.supportExpiresAt} onChange={e => setEditStudentForm(f => ({ ...f, supportExpiresAt: e.target.value }))} className="bg-background/50 border-border/40" />
                          <p className="text-xs text-muted-foreground">Deixe vazio para usar a expiracao do plano</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Praticas Clinicas</Label>
                          <p className="text-xs text-muted-foreground">Habilitar botao de agendamento via WhatsApp</p>
                        </div>
                        <Switch
                          checked={editStudentForm.clinicalPracticeAccess}
                          onCheckedChange={(checked) => setEditStudentForm(f => ({ ...f, clinicalPracticeAccess: checked }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Save Button ── */}
                  <Button
                    className="w-full bg-gold text-background hover:bg-gold/90 font-medium sticky bottom-0"
                    onClick={() => {
                      if (!editingStudent) return;
                      const data: any = {};
                      if (editStudentForm.name && editStudentForm.name !== editingStudent.name) data.name = editStudentForm.name;
                      if (editStudentForm.phone !== (editingStudent.phone || "")) data.phone = editStudentForm.phone;
                      if (editStudentForm.planId) data.planId = editStudentForm.planId;
                      if (editStudentForm.accessExpiresAt) data.accessExpiresAt = new Date(editStudentForm.accessExpiresAt).toISOString();
                      data.approved = editStudentForm.approved;
                      // Mentorship dates
                      data.mentorshipStartDate = editStudentForm.mentorshipStartDate || null;
                      data.mentorshipEndDate = editStudentForm.mentorshipEndDate || null;
                      // Access control fields
                      data.communityAccess = editStudentForm.communityAccess;
                      data.supportAccess = editStudentForm.supportAccess;
                      data.supportExpiresAt = editStudentForm.supportExpiresAt ? new Date(editStudentForm.supportExpiresAt).toISOString() : null;
                      data.clinicalPracticeAccess = editStudentForm.clinicalPracticeAccess;
                      data.materialsAccess = editStudentForm.materialsAccess;

                      // Build user modules data (only entries that were explicitly set)
                      const userModulesData = Object.entries(editUserModules)
                        .filter(([_, v]) => v.enabled || v.startDate || v.endDate)
                        .map(([moduleId, v]) => ({
                          moduleId: Number(moduleId),
                          enabled: v.enabled,
                          startDate: v.startDate || null,
                          endDate: v.endDate || null,
                        }));

                      // Build user material categories data (only entries that were explicitly set)
                      const userMaterialCatsData = Object.entries(editUserMaterialCats)
                        .filter(([_, enabled]) => enabled)
                        .map(([categoryTitle, enabled]) => ({
                          categoryTitle,
                          enabled,
                        }));

                      updateStudentMutation.mutate({
                        id: editingStudent.id,
                        data,
                        userModulesData: userModulesData.length > 0 ? userModulesData : undefined,
                        userMaterialCatsData: userMaterialCatsData.length > 0 || Object.keys(editUserMaterialCats).length > 0 ? Object.entries(editUserMaterialCats).map(([categoryTitle, enabled]) => ({ categoryTitle, enabled })) : undefined,
                      });
                    }}
                    disabled={updateStudentMutation.isPending}
                  >
                    {updateStudentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar alteracoes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Renew Access Dialog */}
            <Dialog open={!!renewingStudent} onOpenChange={(open) => !open && setRenewingStudent(null)}>
              <DialogContent className="bg-card border-border/40 max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-lg">Renovar Acesso</DialogTitle>
                  <DialogDescription className="text-muted-foreground">{renewingStudent?.name}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Dias a adicionar (a partir de agora)</Label>
                    <Input type="number" min={1} value={renewDays} onChange={e => setRenewDays(parseInt(e.target.value) || 0)} className="bg-background/50 border-border/40" />
                    <p className="text-xs text-muted-foreground">
                      Nova expiração: {renewDays > 0 ? new Date(Date.now() + renewDays * 86400000).toLocaleDateString("pt-BR") : "—"}
                    </p>
                  </div>
                  <Button className="w-full bg-gold text-background hover:bg-gold/90 font-medium" onClick={() => renewingStudent && renewAccessMutation.mutate({ id: renewingStudent.id, days: renewDays })} disabled={renewDays <= 0 || renewAccessMutation.isPending}>
                    {renewAccessMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Renovar acesso
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Password Reset Link Dialog */}
            <Dialog open={!!resetLinkDialog} onOpenChange={(open) => !open && setResetLinkDialog(null)}>
              <DialogContent className="bg-card border-border/40 max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-lg">Link de Reset de Senha</DialogTitle>
                  <DialogDescription className="text-muted-foreground">{resetLinkDialog?.student.name}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">Envie este link para o aluno. Ele poderá criar uma nova senha. O link expira em 24 horas.</p>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={resetLinkDialog?.link || ""} className="bg-background/50 border-border/40 text-xs" />
                    <Button size="sm" variant="outline" className="border-gold/30 text-gold hover:bg-gold/10 shrink-0" onClick={() => { if (resetLinkDialog?.link) { navigator.clipboard.writeText(resetLinkDialog.link); toast({ title: "Link copiado!" }); } }}>
                      <Copy className="w-4 h-4 mr-1" /> Copiar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ========== PLANS TAB ========== */}
          <TabsContent value="plans" className="space-y-6 mt-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">Planos ({plans.length})</h3>
              <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-medium" data-testid="button-add-plan">
                    <Plus className="w-4 h-4 mr-1.5" /> Novo plano
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border/40 max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg">Novo plano</DialogTitle>
                    <DialogDescription className="text-muted-foreground">Crie um novo plano de acesso</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label><Input value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Experiência 48h" className="bg-background/50 border-border/40" /></div>
                    <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label><Textarea value={planForm.description} onChange={e => setPlanForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição do plano..." className="bg-background/50 border-border/40" /></div>
                    <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Duração (dias)</Label><Input type="number" min={1} value={planForm.durationDays || ""} onChange={e => setPlanForm(f => ({ ...f, durationDays: parseInt(e.target.value) || 0 }))} placeholder="Ex: 2 (para 48 horas)" className="bg-background/50 border-border/40" /></div>
                    <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Preço</Label><Input value={planForm.price} onChange={e => setPlanForm(f => ({ ...f, price: e.target.value }))} placeholder="Ex: R$ 497" className="bg-background/50 border-border/40" /></div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Módulos inclusos</Label>
                      <p className="text-xs text-muted-foreground">Sem seleção = acesso a todos os módulos</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto border border-border/30 rounded-lg p-3">
                        {[...modules].sort((a, b) => a.order - b.order).map(mod => (
                          <label key={mod.id} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={planForm.moduleIds.includes(mod.id)}
                              onCheckedChange={(checked) => {
                                setPlanForm(f => ({
                                  ...f,
                                  moduleIds: checked
                                    ? [...f.moduleIds, mod.id]
                                    : f.moduleIds.filter(id => id !== mod.id),
                                }));
                              }}
                            />
                            <span className="text-sm text-foreground">{mod.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Materiais complementares inclusos</Label>
                      <p className="text-xs text-muted-foreground">Sem seleção = sem acesso a materiais complementares</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto border border-border/30 rounded-lg p-3">
                        {MATERIAL_TOPIC_OPTIONS.map(topic => (
                          <label key={topic} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={planForm.materialTopics.includes(topic)}
                              onCheckedChange={(checked) => {
                                setPlanForm(f => ({
                                  ...f,
                                  materialTopics: checked
                                    ? [...f.materialTopics, topic]
                                    : f.materialTopics.filter(t => t !== topic),
                                }));
                              }}
                            />
                            <span className="text-sm text-foreground">{topic}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full bg-gold text-background hover:bg-gold/90 font-medium" onClick={() => createPlanMutation.mutate()} disabled={!planForm.name || !planForm.durationDays || createPlanMutation.isPending}>{createPlanMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar plano</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {plans.length === 0 ? (
              <Card className="border-border/30 bg-card/40"><CardContent className="p-12 text-center"><div className="w-14 h-14 rounded-xl bg-card/80 flex items-center justify-center mx-auto mb-4"><CreditCard className="w-7 h-7 text-muted-foreground/40" /></div><p className="text-sm text-muted-foreground">Nenhum plano criado ainda</p></CardContent></Card>
            ) : (
              <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handlePlanDragEnd}>
                <SortableContext items={planIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {sortedPlans.map((plan) => {
                      const planStudents = students.filter(s => s.planId === plan.id);
                      const planMods = allPlanModules.filter(pm => pm.planId === plan.id);
                      const matTopics: string[] = plan.materialTopics ? (() => { try { return JSON.parse(plan.materialTopics); } catch { return []; } })() : [];
                      return (
                        <SortablePlanCard
                          key={plan.id}
                          plan={plan}
                          planStudents={planStudents}
                          planMods={planMods}
                          matTopics={matTopics}
                          modules={modules}
                          isSuperAdmin={isSuperAdmin}
                          reorderPending={reorderPlansMutation.isPending}
                          onEdit={() => { setEditingPlan(plan); setEditPlanForm({ name: plan.name, description: plan.description || "", durationDays: plan.durationDays, price: plan.price || "", moduleIds: allPlanModules.filter(pm => pm.planId === plan.id).map(pm => pm.moduleId), materialTopics: plan.materialTopics ? (() => { try { return JSON.parse(plan.materialTopics); } catch { return []; } })() : [] }); }}
                          onDelete={() => deletePlanMutation.mutate(plan.id)}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Edit Plan Dialog */}
            <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
              <DialogContent className="bg-card border-border/40 max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="text-lg">Editar plano</DialogTitle><DialogDescription className="text-muted-foreground">Altere os dados do plano</DialogDescription></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label><Input value={editPlanForm.name} onChange={e => setEditPlanForm(f => ({ ...f, name: e.target.value }))} className="bg-background/50 border-border/40" /></div>
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label><Textarea value={editPlanForm.description} onChange={e => setEditPlanForm(f => ({ ...f, description: e.target.value }))} className="bg-background/50 border-border/40" /></div>
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Duração (dias)</Label><Input type="number" min={1} value={editPlanForm.durationDays || ""} onChange={e => setEditPlanForm(f => ({ ...f, durationDays: parseInt(e.target.value) || 0 }))} className="bg-background/50 border-border/40" /></div>
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Preço</Label><Input value={editPlanForm.price} onChange={e => setEditPlanForm(f => ({ ...f, price: e.target.value }))} className="bg-background/50 border-border/40" /></div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Módulos inclusos</Label>
                    <p className="text-xs text-muted-foreground">Sem seleção = acesso a todos os módulos</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-border/30 rounded-lg p-3">
                      {[...modules].sort((a, b) => a.order - b.order).map(mod => (
                        <label key={mod.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={editPlanForm.moduleIds.includes(mod.id)}
                            onCheckedChange={(checked) => {
                              setEditPlanForm(f => ({
                                ...f,
                                moduleIds: checked
                                  ? [...f.moduleIds, mod.id]
                                  : f.moduleIds.filter(id => id !== mod.id),
                              }));
                            }}
                          />
                          <span className="text-sm text-foreground">{mod.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Materiais complementares inclusos</Label>
                    <p className="text-xs text-muted-foreground">Sem seleção = sem acesso a materiais complementares</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-border/30 rounded-lg p-3">
                      {MATERIAL_TOPIC_OPTIONS.map(topic => (
                        <label key={topic} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={editPlanForm.materialTopics.includes(topic)}
                            onCheckedChange={(checked) => {
                              setEditPlanForm(f => ({
                                ...f,
                                materialTopics: checked
                                  ? [...f.materialTopics, topic]
                                  : f.materialTopics.filter(t => t !== topic),
                              }));
                            }}
                          />
                          <span className="text-sm text-foreground">{topic}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full bg-gold text-background hover:bg-gold/90 font-medium" onClick={() => editingPlan && updatePlanMutation.mutate({ id: editingPlan.id, data: editPlanForm })} disabled={!editPlanForm.name || !editPlanForm.durationDays || updatePlanMutation.isPending}>{updatePlanMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar alterações</Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ========== MODULES TAB ========== */}
          <TabsContent value="modules" className="space-y-6 mt-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">Módulos ({modules.length})</h3>
              <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
                <DialogTrigger asChild><Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-medium" data-testid="button-add-module"><Plus className="w-4 h-4 mr-1.5" />Novo módulo</Button></DialogTrigger>
                <DialogContent className="bg-card border-border/40">
                  <DialogHeader><DialogTitle className="text-lg">Novo módulo</DialogTitle><DialogDescription className="text-muted-foreground">Adicione um novo módulo de aulas</DialogDescription></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Título</Label><Input value={moduleForm.title} onChange={e => setModuleForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Skinboosters" className="bg-background/50 border-border/40" data-testid="input-module-title" /></div>
                    <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label><Textarea value={moduleForm.description} onChange={e => setModuleForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição do módulo..." className="bg-background/50 border-border/40" data-testid="input-module-description" /></div>
                    <Button className="w-full bg-gold text-background hover:bg-gold/90 font-medium" onClick={() => createModuleMutation.mutate()} disabled={!moduleForm.title || createModuleMutation.isPending} data-testid="button-save-module">{createModuleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar módulo</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {modules.length === 0 ? (
              <Card className="border-border/30 bg-card/40"><CardContent className="p-12 text-center"><div className="w-14 h-14 rounded-xl bg-card/80 flex items-center justify-center mx-auto mb-4"><Layers className="w-7 h-7 text-muted-foreground/40" /></div><p className="text-sm text-muted-foreground">Nenhum módulo criado ainda</p></CardContent></Card>
            ) : (
              <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
                <SortableContext items={moduleIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {sortedModules.map((mod, idx) => {
                      const modLessons = lessons.filter(l => l.moduleId === mod.id);
                      return (
                        <SortableModuleCard
                          key={mod.id}
                          mod={mod}
                          idx={idx}
                          modLessons={modLessons}
                          isSuperAdmin={isSuperAdmin}
                          reorderPending={reorderMutation.isPending}
                          onEdit={() => { setEditingModule(mod); setEditModuleForm({ title: mod.title, description: mod.description || "" }); }}
                          onDelete={() => deleteModuleMutation.mutate(mod.id)}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
                <DragOverlay>
                  {activeDragId ? (() => {
                    const mod = sortedModules.find(m => m.id === activeDragId);
                    if (!mod) return null;
                    return (
                      <Card className="border-gold/40 bg-card shadow-xl shadow-gold/10 scale-[1.03]">
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-5 h-5 text-gold" />
                            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0"><BookOpen className="w-5 h-5 text-gold" /></div>
                            <p className="font-medium text-foreground text-sm sm:text-[15px]">{mod.title}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })() : null}
                </DragOverlay>
              </DndContext>
            )}

            {/* Edit Module Dialog */}
            <Dialog open={!!editingModule} onOpenChange={(open) => !open && setEditingModule(null)}>
              <DialogContent className="bg-card border-border/40">
                <DialogHeader><DialogTitle className="text-lg">Editar módulo</DialogTitle><DialogDescription className="text-muted-foreground">Altere os dados do módulo</DialogDescription></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Título</Label><Input value={editModuleForm.title} onChange={e => setEditModuleForm(f => ({ ...f, title: e.target.value }))} className="bg-background/50 border-border/40" /></div>
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label><Textarea value={editModuleForm.description} onChange={e => setEditModuleForm(f => ({ ...f, description: e.target.value }))} className="bg-background/50 border-border/40" /></div>
                  <Button className="w-full bg-gold text-background hover:bg-gold/90 font-medium" onClick={() => editingModule && updateModuleMutation.mutate({ id: editingModule.id, data: editModuleForm })} disabled={!editModuleForm.title || updateModuleMutation.isPending}>{updateModuleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar alterações</Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ========== LESSONS TAB ========== */}
          <TabsContent value="lessons" className="space-y-6 mt-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">Aulas ({lessons.length})</h3>
              <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
                <DialogTrigger asChild><Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-medium" data-testid="button-add-lesson"><Plus className="w-4 h-4 mr-1.5" />Nova aula</Button></DialogTrigger>
                <DialogContent className="bg-card border-border/40">
                  <DialogHeader><DialogTitle className="text-lg">Nova aula</DialogTitle><DialogDescription className="text-muted-foreground">Adicione uma nova aula a um módulo</DialogDescription></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Módulo</Label><Select onValueChange={(v) => setLessonForm(f => ({ ...f, moduleId: parseInt(v) }))}><SelectTrigger className="bg-background/50 border-border/40" data-testid="select-lesson-module"><SelectValue placeholder="Selecione o módulo" /></SelectTrigger><SelectContent>{modules.map((m) => (<SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>))}</SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Título da aula</Label><Input value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Técnicas de aplicação" className="bg-background/50 border-border/40" data-testid="input-lesson-title" /></div>
                    <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label><Textarea value={lessonForm.description} onChange={e => setLessonForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição da aula..." className="bg-background/50 border-border/40" data-testid="input-lesson-description" /></div>
                    <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">URL do vídeo</Label><Input value={lessonForm.videoUrl} onChange={e => setLessonForm(f => ({ ...f, videoUrl: e.target.value }))} placeholder="https://youtube.com/watch?v=..." className="bg-background/50 border-border/40" data-testid="input-lesson-video" /><p className="text-xs text-muted-foreground">YouTube, Vimeo ou Google Drive</p></div>
                    <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Duração</Label><Input value={lessonForm.duration} onChange={e => setLessonForm(f => ({ ...f, duration: e.target.value }))} placeholder="Ex: 25:00" className="bg-background/50 border-border/40" data-testid="input-lesson-duration" /></div>
                    <Button className="w-full bg-gold text-background hover:bg-gold/90 font-medium" onClick={() => createLessonMutation.mutate()} disabled={!lessonForm.title || !lessonForm.moduleId || createLessonMutation.isPending} data-testid="button-save-lesson">{createLessonMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar aula</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {lessons.length === 0 ? (
              <Card className="border-border/30 bg-card/40"><CardContent className="p-12 text-center"><div className="w-14 h-14 rounded-xl bg-card/80 flex items-center justify-center mx-auto mb-4"><Video className="w-7 h-7 text-muted-foreground/40" /></div><p className="text-sm text-muted-foreground">Nenhuma aula criada ainda</p></CardContent></Card>
            ) : (
              <div className="space-y-6">
                {[...modules].sort((a, b) => a.order - b.order).map((mod) => {
                  const modLessons = lessons.filter(l => l.moduleId === mod.id).sort((a, b) => a.order - b.order);
                  if (modLessons.length === 0) return null;
                  const lessonIds = modLessons.map(l => l.id);
                  return (
                    <div key={mod.id} className="space-y-3">
                      <div className="flex items-center gap-3 pb-1">
                        <div className="w-7 h-7 rounded-md bg-gold/10 flex items-center justify-center shrink-0"><BookOpen className="w-3.5 h-3.5 text-gold" /></div>
                        <h4 className="text-xs font-semibold text-gold uppercase tracking-brand">{mod.title}</h4>
                        <div className="flex-1 h-px bg-border/30" />
                        <span className="text-xs text-muted-foreground">{modLessons.length} {modLessons.length === 1 ? "aula" : "aulas"}</span>
                      </div>
                      <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd(mod.id)}>
                        <SortableContext items={lessonIds} strategy={verticalListSortingStrategy}>
                          <div className="space-y-2 pl-0 sm:pl-2">
                            {modLessons.map((lesson, idx) => (
                              <SortableLessonCard
                                key={lesson.id}
                                lesson={lesson}
                                idx={idx}
                                mod={mod}
                                isSuperAdmin={isSuperAdmin}
                                reorderPending={reorderLessonsMutation.isPending}
                                onEdit={() => { setEditingLesson(lesson); setEditLessonForm({ title: lesson.title, description: lesson.description || "", videoUrl: lesson.videoUrl || "", duration: lesson.duration || "", moduleId: lesson.moduleId }); }}
                                onDelete={() => deleteLessonMutation.mutate(lesson.id)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Edit Lesson Dialog */}
            <Dialog open={!!editingLesson} onOpenChange={(open) => !open && setEditingLesson(null)}>
              <DialogContent className="bg-card border-border/40">
                <DialogHeader><DialogTitle className="text-lg">Editar aula</DialogTitle><DialogDescription className="text-muted-foreground">Altere os dados da aula</DialogDescription></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Título</Label><Input value={editLessonForm.title} onChange={e => setEditLessonForm(f => ({ ...f, title: e.target.value }))} className="bg-background/50 border-border/40" /></div>
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label><Textarea value={editLessonForm.description} onChange={e => setEditLessonForm(f => ({ ...f, description: e.target.value }))} className="bg-background/50 border-border/40" /></div>
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">URL do vídeo</Label><Input value={editLessonForm.videoUrl} onChange={e => setEditLessonForm(f => ({ ...f, videoUrl: e.target.value }))} placeholder="https://youtube.com/watch?v=..." className="bg-background/50 border-border/40" /></div>
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Duração</Label><Input value={editLessonForm.duration} onChange={e => setEditLessonForm(f => ({ ...f, duration: e.target.value }))} placeholder="Ex: 25:00" className="bg-background/50 border-border/40" /></div>
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Módulo</Label><Select value={String(editLessonForm.moduleId)} onValueChange={(v) => setEditLessonForm(f => ({ ...f, moduleId: parseInt(v) }))}><SelectTrigger className="bg-background/50 border-border/40"><SelectValue placeholder="Selecione o módulo" /></SelectTrigger><SelectContent>{modules.map((m) => (<SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>))}</SelectContent></Select></div>
                  <Button className="w-full bg-gold text-background hover:bg-gold/90 font-medium" onClick={() => editingLesson && updateLessonMutation.mutate({ id: editingLesson.id, data: editLessonForm })} disabled={!editLessonForm.title || !editLessonForm.moduleId || updateLessonMutation.isPending}>{updateLessonMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar alterações</Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ========== MATERIAIS TAB ========== */}
          <TabsContent value="materiais" className="space-y-6 mt-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">Materiais Complementares ({materialThemes.length} temas)</h3>
              <Dialog open={themeDialogOpen} onOpenChange={setThemeDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-medium">
                    <Plus className="w-4 h-4 mr-1.5" /> Novo tema
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border/40">
                  <DialogHeader>
                    <DialogTitle className="text-lg">Novo tema</DialogTitle>
                    <DialogDescription className="text-muted-foreground">Adicione um novo tema de materiais complementares</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Título</Label><Input value={themeForm.title} onChange={e => setThemeForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Toxina Botulínica" className="bg-background/50 border-border/40" /></div>
                    <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">URL da Capa</Label><Input value={themeForm.coverUrl} onChange={e => setThemeForm(f => ({ ...f, coverUrl: e.target.value }))} placeholder="/images/covers/cover_nome.png" className="bg-background/50 border-border/40" /></div>
                    <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Ordem</Label><Input type="number" value={themeForm.order} onChange={e => setThemeForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} className="bg-background/50 border-border/40" /></div>
                    <Button className="w-full bg-gold text-background hover:bg-gold/90 font-medium" onClick={() => createThemeMutation.mutate()} disabled={!themeForm.title || !themeForm.coverUrl || createThemeMutation.isPending}>{createThemeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar tema</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Edit Theme Dialog */}
            <Dialog open={!!editingTheme} onOpenChange={(open) => { if (!open) setEditingTheme(null); }}>
              <DialogContent className="bg-card border-border/40">
                <DialogHeader>
                  <DialogTitle className="text-lg">Editar tema</DialogTitle>
                  <DialogDescription className="text-muted-foreground">Altere os dados do tema</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Título</Label><Input value={editThemeForm.title} onChange={e => setEditThemeForm(f => ({ ...f, title: e.target.value }))} className="bg-background/50 border-border/40" /></div>
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">URL da Capa</Label><Input value={editThemeForm.coverUrl} onChange={e => setEditThemeForm(f => ({ ...f, coverUrl: e.target.value }))} className="bg-background/50 border-border/40" /></div>
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Ordem</Label><Input type="number" value={editThemeForm.order} onChange={e => setEditThemeForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} className="bg-background/50 border-border/40" /></div>
                  <Button className="w-full bg-gold text-background hover:bg-gold/90 font-medium" onClick={() => editingTheme && updateThemeMutation.mutate({ id: editingTheme.id, data: editThemeForm })} disabled={!editThemeForm.title || !editThemeForm.coverUrl || updateThemeMutation.isPending}>{updateThemeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar alterações</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Subcategory Dialog */}
            <Dialog open={!!editingSubcat} onOpenChange={(open) => { if (!open) setEditingSubcat(null); }}>
              <DialogContent className="bg-card border-border/40">
                <DialogHeader>
                  <DialogTitle className="text-lg">Editar subcategoria</DialogTitle>
                  <DialogDescription className="text-muted-foreground">Altere os dados da subcategoria</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label><Input value={editSubcatForm.name} onChange={e => setEditSubcatForm(f => ({ ...f, name: e.target.value }))} className="bg-background/50 border-border/40" /></div>
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Ordem</Label><Input type="number" value={editSubcatForm.order} onChange={e => setEditSubcatForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} className="bg-background/50 border-border/40" /></div>
                  <Button className="w-full bg-gold text-background hover:bg-gold/90 font-medium" onClick={() => editingSubcat && updateSubcatMutation.mutate({ id: editingSubcat.id, data: editSubcatForm })} disabled={!editSubcatForm.name || updateSubcatMutation.isPending}>{updateSubcatMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar alterações</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit File Dialog */}
            <Dialog open={!!editingFile} onOpenChange={(open) => { if (!open) setEditingFile(null); }}>
              <DialogContent className="bg-card border-border/40">
                <DialogHeader>
                  <DialogTitle className="text-lg">Editar arquivo</DialogTitle>
                  <DialogDescription className="text-muted-foreground">Altere os dados do arquivo</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label><Input value={editFileForm.name} onChange={e => setEditFileForm(f => ({ ...f, name: e.target.value }))} className="bg-background/50 border-border/40" /></div>
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo</Label><Select value={editFileForm.type} onValueChange={(v) => setEditFileForm(f => ({ ...f, type: v }))}><SelectTrigger className="bg-background/50 border-border/40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pdf">PDF</SelectItem><SelectItem value="mp3">MP3</SelectItem><SelectItem value="docx">DOCX</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Google Drive ID</Label><Input value={editFileForm.driveId} onChange={e => setEditFileForm(f => ({ ...f, driveId: e.target.value }))} className="bg-background/50 border-border/40" /></div>
                  <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Ordem</Label><Input type="number" value={editFileForm.order} onChange={e => setEditFileForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} className="bg-background/50 border-border/40" /></div>
                  <Button className="w-full bg-gold text-background hover:bg-gold/90 font-medium" onClick={() => editingFile && updateFileMutation.mutate({ id: editingFile.id, data: editFileForm })} disabled={!editFileForm.name || !editFileForm.driveId || updateFileMutation.isPending}>{updateFileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar alterações</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Themes list */}
            <div className="space-y-3">
              {materialThemes.map((theme) => (
                <Card key={theme.id} className="border-border/30 bg-card/50 overflow-hidden">
                  <CardContent className="p-0">
                    {/* Theme header */}
                    <div className="flex items-center gap-3 p-4">
                      <img src={theme.coverUrl} alt={theme.title} className="w-12 h-16 object-cover rounded-lg shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{theme.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{theme.fileCount} {theme.fileCount === 1 ? "arquivo" : "arquivos"} &middot; {theme.subcategories.length} {theme.subcategories.length === 1 ? "subcategoria" : "subcategorias"} &middot; Ordem: {theme.order}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-gold h-8 w-8 p-0" onClick={() => { setExpandedThemeId(expandedThemeId === theme.id ? null : theme.id); setExpandedSubcatId(null); }}>
                          {expandedThemeId === theme.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-gold h-8 w-8 p-0" onClick={() => { setEditingTheme(theme); setEditThemeForm({ title: theme.title, coverUrl: theme.coverUrl, order: theme.order }); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border/40">
                            <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Excluir o tema "{theme.title}" e todos os seus arquivos? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel className="border-border/40">Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteThemeMutation.mutate(theme.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {/* Expanded: subcategories */}
                    {expandedThemeId === theme.id && (
                      <div className="border-t border-border/20 bg-background/30 px-4 py-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subcategorias</span>
                          <Dialog open={subcatDialogOpen} onOpenChange={setSubcatDialogOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="h-7 text-xs border-gold/30 text-gold hover:bg-gold/10"><Plus className="w-3 h-3 mr-1" />Nova subcategoria</Button>
                            </DialogTrigger>
                            <DialogContent className="bg-card border-border/40">
                              <DialogHeader>
                                <DialogTitle className="text-lg">Nova subcategoria</DialogTitle>
                                <DialogDescription className="text-muted-foreground">Adicione uma subcategoria a "{theme.title}"</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 pt-2">
                                <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label><Input value={subcatForm.name} onChange={e => setSubcatForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Artigos Científicos" className="bg-background/50 border-border/40" /></div>
                                <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Ordem</Label><Input type="number" value={subcatForm.order} onChange={e => setSubcatForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} className="bg-background/50 border-border/40" /></div>
                                <Button className="w-full bg-gold text-background hover:bg-gold/90 font-medium" onClick={() => createSubcatMutation.mutate(theme.id)} disabled={!subcatForm.name || createSubcatMutation.isPending}>{createSubcatMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar subcategoria</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>

                        {theme.subcategories.length === 0 && (
                          <p className="text-xs text-muted-foreground italic py-2">Nenhuma subcategoria</p>
                        )}

                        {theme.subcategories.map((sub) => (
                          <div key={sub.id} className="rounded-lg border border-border/20 bg-card/40 overflow-hidden">
                            {/* Subcategory header */}
                            <div className="flex items-center gap-2 px-3 py-2">
                              <FolderOpen className="w-4 h-4 text-gold shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{sub.name}</p>
                                <p className="text-[11px] text-muted-foreground">{sub.files.length} {sub.files.length === 1 ? "arquivo" : "arquivos"} &middot; Ordem: {sub.order}</p>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-gold h-7 w-7 p-0" onClick={() => setExpandedSubcatId(expandedSubcatId === sub.id ? null : sub.id)}>
                                  {expandedSubcatId === sub.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </Button>
                                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-gold h-7 w-7 p-0" onClick={() => { setEditingSubcat(sub); setEditSubcatForm({ name: sub.name, order: sub.order }); }}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"><Trash2 className="w-3 h-3" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-card border-border/40">
                                    <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Excluir a subcategoria "{sub.name}" e todos os seus arquivos?</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel className="border-border/40">Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteSubcatMutation.mutate(sub.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>

                            {/* Expanded: files */}
                            {expandedSubcatId === sub.id && (
                              <div className="border-t border-border/10 bg-background/20 px-3 py-2 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Arquivos</span>
                                  <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="outline" className="h-6 text-[11px] border-gold/30 text-gold hover:bg-gold/10"><Plus className="w-3 h-3 mr-1" />Novo arquivo</Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-card border-border/40">
                                      <DialogHeader>
                                        <DialogTitle className="text-lg">Novo arquivo</DialogTitle>
                                        <DialogDescription className="text-muted-foreground">Adicione um arquivo a "{sub.name}"</DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4 pt-2">
                                        <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label><Input value={fileForm.name} onChange={e => setFileForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do arquivo" className="bg-background/50 border-border/40" /></div>
                                        <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo</Label><Select value={fileForm.type} onValueChange={(v) => setFileForm(f => ({ ...f, type: v }))}><SelectTrigger className="bg-background/50 border-border/40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pdf">PDF</SelectItem><SelectItem value="mp3">MP3</SelectItem><SelectItem value="docx">DOCX</SelectItem></SelectContent></Select></div>
                                        <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Google Drive ID</Label><Input value={fileForm.driveId} onChange={e => setFileForm(f => ({ ...f, driveId: e.target.value }))} placeholder="ID do arquivo no Google Drive" className="bg-background/50 border-border/40" /></div>
                                        <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Ordem</Label><Input type="number" value={fileForm.order} onChange={e => setFileForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} className="bg-background/50 border-border/40" /></div>
                                        <Button className="w-full bg-gold text-background hover:bg-gold/90 font-medium" onClick={() => createFileMutation.mutate(sub.id)} disabled={!fileForm.name || !fileForm.driveId || createFileMutation.isPending}>{createFileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar arquivo</Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>

                                {sub.files.length === 0 && (
                                  <p className="text-[11px] text-muted-foreground italic py-1">Nenhum arquivo</p>
                                )}

                                {sub.files.map((file) => (
                                  <div key={file.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/[0.03] group">
                                    {file.type === "pdf" ? <FileText className="w-3.5 h-3.5 text-red-400 shrink-0" /> : file.type === "mp3" ? <Headphones className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <FileIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                                    <span className="text-xs text-foreground/80 flex-1 min-w-0 truncate">{file.name}</span>
                                    <Badge variant="outline" className={`text-[9px] px-1 py-0 shrink-0 ${file.type === "pdf" ? "bg-red-500/15 text-red-400 border-red-500/20" : file.type === "mp3" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-blue-500/15 text-blue-400 border-blue-500/20"}`}>{file.type.toUpperCase()}</Badge>
                                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-gold h-6 w-6 p-0" onClick={() => { setEditingFile(file); setEditFileForm({ name: file.name, type: file.type, driveId: file.driveId, order: file.order }); }}>
                                        <Pencil className="w-2.5 h-2.5" />
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive h-6 w-6 p-0"><Trash2 className="w-2.5 h-2.5" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-card border-border/40">
                                          <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Excluir o arquivo "{file.name}"?</AlertDialogDescription></AlertDialogHeader>
                                          <AlertDialogFooter><AlertDialogCancel className="border-border/40">Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteFileMutation.mutate(file.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ========== LEADS TRIAL TAB ========== */}
          <TabsContent value="leads" className="space-y-6 mt-0">
            <LeadsTab
              trialStudents={trialStudents}
              onConvert={(id) => approveMutation.mutate(id)}
            />
          </TabsContent>

          <TabsContent value="trial-legacy" className="space-y-6 mt-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">Leads Trial ({trialStudents.length})</h3>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">Alunos no período de teste gratuito de 7 dias</p>
              </div>
            </div>
            {trialStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Sparkles className="w-8 h-8 text-yellow-500/40 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum aluno em período de teste ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trialStudents.map((student) => {
                  const expires = student.accessExpiresAt ? new Date(student.accessExpiresAt) : null;
                  const daysLeft = expires ? Math.max(0, Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
                  const expired = daysLeft !== null && daysLeft === 0;
                  const phone = student.phone ? student.phone.replace(/\D/g, "") : null;
                  const waLink = phone ? `https://wa.me/55${phone.startsWith("55") ? phone.slice(2) : phone}` : null;
                  return (
                    <Card key={student.id} className={`border bg-card/50 ${expired ? "border-red-500/30" : "border-yellow-500/20"}  hover:bg-card/70 transition-colors`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm text-foreground">{student.name}</span>
                              {expired ? (
                                <Badge variant="outline" className="text-[10px] border-red-500/40 text-red-400 bg-red-500/10">Trial expirado</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-400 bg-yellow-500/10">
                                  <Sparkles className="w-2.5 h-2.5 mr-1" />
                                  {daysLeft !== null ? `${daysLeft} dia${daysLeft !== 1 ? "s" : ""} restante${daysLeft !== 1 ? "s" : ""}` : "Trial ativo"}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MessageCircle className="w-3 h-3 shrink-0" />
                              <span className="truncate">{student.email}</span>
                            </div>
                            {student.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Phone className="w-3 h-3 shrink-0" />
                                <span>{student.phone}</span>
                              </div>
                            )}
                            {expires && (
                              <div className="text-[11px] text-muted-foreground/60">
                                Expira em: {expires.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              className="bg-gold text-background hover:bg-gold/90 text-xs h-8 gap-1.5"
                              onClick={() => { setApprovingStudent(student); setApprovePlanId(""); }}
                              title="Converter para pacote pago"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Converter
                            </Button>
                            <Button
                              size="sm" variant="ghost" className="text-muted-foreground hover:text-gold h-8 w-8 p-0"
                              title="Editar aluno trial"
                              onClick={() => {
                                setEditingStudent(student);
                                setEditStudentForm({
                                  name: student.name,
                                  phone: student.phone || "",
                                  planId: student.planId || 0,
                                  accessExpiresAt: student.accessExpiresAt ? student.accessExpiresAt.slice(0, 16) : "",
                                  approved: student.approved,
                                  communityAccess: student.communityAccess ?? true,
                                  supportAccess: student.supportAccess ?? true,
                                  supportExpiresAt: student.supportExpiresAt ? student.supportExpiresAt.slice(0, 16) : "",
                                  clinicalPracticeAccess: student.clinicalPracticeAccess ?? true,
                                  materialsAccess: student.materialsAccess ?? false,
                                  mentorshipStartDate: (student as any).mentorshipStartDate ? (student as any).mentorshipStartDate.slice(0, 10) : "",
                                  mentorshipEndDate: (student as any).mentorshipEndDate ? (student as any).mentorshipEndDate.slice(0, 10) : "",
                                });
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive h-8 w-8 p-0">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-card border-border/40">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>Tem certeza que deseja excluir {student.name}? Esta ação não pode ser desfeita.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-border/40">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteStudentMutation.mutate(student.id)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Abrir WhatsApp"
                                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ========== ADMINS TAB (super_admin only) ========== */}
          {isSuperAdmin && (
            <TabsContent value="admins" className="space-y-6 mt-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">Administradores ({admins.length})</h3>
                <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-medium">
                      <Plus className="w-4 h-4 mr-1.5" /> Novo admin
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border/40">
                    <DialogHeader>
                      <DialogTitle className="text-lg">Novo administrador</DialogTitle>
                      <DialogDescription className="text-muted-foreground">Crie uma conta de admin secundário</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label><Input value={adminForm.name} onChange={e => setAdminForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Amanda Silva" className="bg-background/50 border-border/40" /></div>
                      <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label><Input type="email" value={adminForm.email} onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@exemplo.com" className="bg-background/50 border-border/40" /></div>
                      <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Senha</Label><Input type="password" value={adminForm.password} onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" className="bg-background/50 border-border/40" /></div>
                      <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">Telefone (opcional)</Label><Input value={adminForm.phone} onChange={e => setAdminForm(f => ({ ...f, phone: e.target.value }))} placeholder="+55 (11) 99999-9999" className="bg-background/50 border-border/40" /></div>
                      <div className="rounded-md bg-gold/5 border border-gold/20 p-3 text-xs text-muted-foreground space-y-1">
                        <p className="font-medium text-gold">Permissões do admin secundário:</p>
                        <p>- Gerenciar alunos (aprovar, editar, renovar)</p>
                        <p>- Alterar acessos dos entregáveis</p>
                        <p>- Criar/editar módulos e aulas</p>
                        <p className="text-destructive/70">- NÃO pode excluir módulos/aulas, criar admins ou ver histórico completo</p>
                      </div>
                      <Button className="w-full bg-gold text-background hover:bg-gold/90 font-medium" onClick={() => createAdminMutation.mutate()} disabled={!adminForm.name || !adminForm.email || !adminForm.password || adminForm.password.length < 6 || createAdminMutation.isPending}>
                        {createAdminMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Criar admin
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-2">
                {admins.map((admin) => (
                  <Card key={admin.id} className="border-border/30 bg-card/50 hover:bg-card/70 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground truncate">{admin.name}</p>
                            <Badge variant="secondary" className={`text-[11px] border-0 shrink-0 ${admin.role === "super_admin" ? "bg-gold/15 text-gold" : "bg-blue-500/10 text-blue-400"}`}>
                              {admin.role === "super_admin" ? "Super Admin" : "Admin"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">{admin.email}</p>
                          {admin.phone && <p className="text-xs text-muted-foreground mt-0.5">{admin.phone}</p>}
                        </div>
                        {admin.role === "admin" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive h-8 w-8 p-0 shrink-0">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border/40">
                              <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir o admin {admin.name}? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel className="border-border/40">Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteAdminMutation.mutate(admin.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}



          {/* ========== HISTORY TAB (super_admin: all logs, admin: own logs inline) ========== */}
          {isSuperAdmin && (
            <TabsContent value="history" className="space-y-6 mt-0">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">Histórico de ações ({filteredLogs.length})</h3>
                <div className="flex items-center gap-2">
                  <Select value={logFilterAdmin} onValueChange={setLogFilterAdmin}>
                    <SelectTrigger className="bg-background/50 border-border/40 w-40 h-8 text-xs"><SelectValue placeholder="Filtrar por admin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os admins</SelectItem>
                      {uniqueAdmins.map(([id, name]) => <SelectItem key={id} value={String(id)}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={logFilterAction} onValueChange={setLogFilterAction}>
                    <SelectTrigger className="bg-background/50 border-border/40 w-40 h-8 text-xs"><SelectValue placeholder="Filtrar por ação" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as ações</SelectItem>
                      {uniqueActions.map(a => <SelectItem key={a} value={a}>{actionLabels[a] || a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredLogs.length === 0 ? (
                <Card className="border-border/30 bg-card/40"><CardContent className="p-12 text-center"><div className="w-14 h-14 rounded-xl bg-card/80 flex items-center justify-center mx-auto mb-4"><History className="w-7 h-7 text-muted-foreground/40" /></div><p className="text-sm text-muted-foreground">Nenhuma ação registrada</p></CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map((log) => (
                    <Card key={log.id} className="border-border/25 bg-card/40">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                            <History className="w-4 h-4 text-gold" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  {actionLabels[log.action] || log.action}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  por <span className="text-foreground font-medium">{log.adminName}</span>
                                  {log.targetName && <> em <span className="text-foreground">{log.targetName}</span></>}
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {new Date(log.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            {log.details && (() => {
                              try {
                                const details = JSON.parse(log.details);
                                const entries = Object.entries(details).slice(0, 4);
                                if (entries.length === 0) return null;
                                return (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {entries.map(([k, v]) => (
                                      <Badge key={k} variant="outline" className="text-[10px] border-border/30 text-muted-foreground px-1.5">
                                        {k}: {String(v).slice(0, 30)}
                                      </Badge>
                                    ))}
                                  </div>
                                );
                              } catch { return null; }
                            })()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Secondary admin: small audit log widget at the bottom */}
        {!isSuperAdmin && auditLogs.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">Suas ações recentes</h3>
            <div className="space-y-2">
              {auditLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-card/30 border border-border/20">
                  <History className="w-3.5 h-3.5 text-gold shrink-0" />
                  <span className="text-foreground font-medium">{actionLabels[log.action] || log.action}</span>
                  {log.targetName && <span className="text-muted-foreground">— {log.targetName}</span>}
                  <span className="text-muted-foreground ml-auto shrink-0">
                    {new Date(log.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Approve student dialog — select plan */}
      <Dialog open={!!approvingStudent} onOpenChange={(open) => { if (!open) { setApprovingStudent(null); setApprovePlanId(""); } }}>
        <DialogContent className="bg-card border-border/40 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{approvingStudent?.role === "trial" ? "Converter para pacote pago" : "Aprovar aluno"}</DialogTitle>
            <DialogDescription>
              {approvingStudent?.role === "trial"
                ? <>Selecione o pacote para converter o trial de <span className="font-medium text-foreground">{approvingStudent?.name}</span> em aluno ativo.</>  
                : <>Selecione o plano de mentoria para <span className="font-medium text-foreground">{approvingStudent?.name}</span></>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Plano de mentoria</Label>
              <Select value={approvePlanId} onValueChange={setApprovePlanId}>
                <SelectTrigger className="bg-background/50 border-border/50"><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                <SelectContent>{plans.map((p) => (<SelectItem key={p.id} value={String(p.id)}>{p.name}{p.price ? ` — R$ ${p.price.replace(/^R\$\s?/, '')}` : ""} ({p.durationDays} dias)</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="border-border/40" onClick={() => { setApprovingStudent(null); setApprovePlanId(""); }}>Cancelar</Button>
              <Button className="bg-gold text-background hover:bg-gold/90 font-medium" disabled={!approvePlanId || approveMutation.isPending} onClick={() => { if (approvingStudent && approvePlanId) { approveMutation.mutate({ id: approvingStudent.id, planId: parseInt(approvePlanId) }); } }} data-testid="button-confirm-approve">
                {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {approvingStudent?.role === "trial" ? "Converter" : "Aprovar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <footer className="border-t border-border/20 mt-8 py-5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-xs text-muted-foreground">
          Ampla Facial — Portal de Aulas
        </div>
      </footer>
    </div>
  );
}
