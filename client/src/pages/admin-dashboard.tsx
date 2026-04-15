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
  Sparkles, MessageCircle, Phone, Coins, Gift, Stethoscope, FileSignature, AlertTriangle, PenLine,
  TrendingUp, BarChart3, Zap, Menu, ChevronRight, Instagram
} from "lucide-react";
import { handlePhoneInput, formatPhoneDisplay, stripPhone } from "@/lib/phone";
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

// ─── Community Admin Tab ─────────────────────────────────────────────────────

const ACTION_TYPE_LABELS: Record<string, string> = {
  post_created: "Criou post",
  comment_on_video: "Comentou em video",
  comment_on_post: "Comentou em post",
};

const POST_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  case_study: { label: "Caso Clínico", className: "bg-gold/15 text-gold border-gold/30" },
  before_after: { label: "Antes/Depois", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

function formatCreditBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function communityTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function CommunityAdminTab() {
  const { toast } = useToast();
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);

  // ─── Queries ───
  const { data: statsData } = useQuery<{ totalPosts: number; totalComments: number; pendingCreditRequests: number }>({
    queryKey: ["/api/admin/community-stats"],
  });

  const { data: creditData, isLoading: creditLoading } = useQuery<{ requests: Array<{ id: number; userId: number; userName: string; actionType: string; referenceType: string; referenceId: number; amount: number; status: string; createdAt: string }> }>({
    queryKey: ["/api/admin/credit-requests"],
  });

  const { data: postsData, isLoading: postsLoading } = useQuery<{ posts: Array<{ id: number; userId: number; content: string; imageUrls: string[]; postType: string; likesCount: number; commentsCount: number; createdAt: string; authorName: string; authorInitial: string; authorAvatar?: string | null; authorUsername?: string | null; liked: boolean }> }>({
    queryKey: ["/api/community/posts", "?limit=20&offset=0"],
  });

  // ─── Mutations ───
  const approveCreditMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/credit-requests/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/community-stats"] });
      toast({ title: "Crédito aprovado" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const rejectCreditMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/credit-requests/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/community-stats"] });
      toast({ title: "Crédito rejeitado" });
    },
  });

  const approveAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/credit-requests/approve-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/community-stats"] });
      toast({ title: "Todos os créditos aprovados" });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/community/posts/${id}`);
    },
    onSuccess: () => {
      setDeletingPostId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/community-stats"] });
      toast({ title: "Post removido" });
    },
  });

  const stats = statsData || { totalPosts: 0, totalComments: 0, pendingCreditRequests: 0 };
  const creditRequests = creditData?.requests || [];
  const posts = postsData?.posts || [];

  return (
    <div className="space-y-6">
      {/* Section A: Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/30 bg-card/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">{stats.totalPosts}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Posts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/30 bg-card/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">{stats.totalComments}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Comentarios</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-border/30 bg-card/40 ${stats.pendingCreditRequests > 0 ? "border-amber-500/40" : ""}`}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stats.pendingCreditRequests > 0 ? "bg-amber-500/10" : "bg-card/80"}`}>
              <Coins className={`w-5 h-5 ${stats.pendingCreditRequests > 0 ? "text-amber-400" : "text-muted-foreground/40"}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold leading-none ${stats.pendingCreditRequests > 0 ? "text-amber-400" : "text-foreground"}`}>{stats.pendingCreditRequests}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Creditos Pendentes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section B: Creditos Pendentes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">Créditos Pendentes ({creditRequests.length})</h3>
          {creditRequests.length > 0 && (
            <Button
              size="sm"
              disabled={approveAllMutation.isPending}
              onClick={() => approveAllMutation.mutate()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium h-7 px-3"
            >
              {approveAllMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
              Aprovar Todos
            </Button>
          )}
        </div>

        {creditLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : creditRequests.length === 0 ? (
          <Card className="border-border/30 bg-card/40">
            <CardContent className="p-8 text-center">
              <Coins className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum crédito pendente</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {creditRequests.map((req) => (
              <Card key={req.id} className="border-border/25 bg-card/40">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-gold">{req.userName?.[0]?.toUpperCase() || "?"}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{req.userName}</p>
                      <p className="text-[11px] text-muted-foreground">{ACTION_TYPE_LABELS[req.actionType] || req.actionType} · {communityTimeAgo(req.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 font-semibold">{formatCreditBRL(req.amount)}</Badge>
                    <Button
                      size="sm"
                      disabled={approveCreditMutation.isPending}
                      onClick={() => approveCreditMutation.mutate(req.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 text-xs"
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={rejectCreditMutation.isPending}
                      onClick={() => rejectCreditMutation.mutate(req.id)}
                      className="border-destructive/40 text-destructive hover:bg-destructive/10 h-7 px-2 text-xs"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Section C: Posts Recentes */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">Posts Recentes ({posts.length})</h3>

        {postsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : posts.length === 0 ? (
          <Card className="border-border/30 bg-card/40">
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum post na comunidade</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <Card key={post.id} className="border-border/25 bg-card/40">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {post.authorAvatar ? (
                        <img src={post.authorAvatar} alt="" className="w-8 h-8 rounded-full object-cover border border-gold/30 shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold/80 to-gold border border-gold/30 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-semibold text-[#0A1628]">{post.authorInitial}</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{post.authorName}</span>
                          {post.authorUsername && <span className="text-[10px] text-muted-foreground">@{post.authorUsername}</span>}
                          {POST_TYPE_LABELS[post.postType] && (
                            <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${POST_TYPE_LABELS[post.postType].className}`}>
                              {POST_TYPE_LABELS[post.postType].label}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">{communityTimeAgo(post.createdAt)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.content.length > 200 ? post.content.slice(0, 200) + "..." : post.content}</p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                          {post.imageUrls && post.imageUrls.length > 0 && (
                            <span className="flex items-center gap-1"><FileIcon className="w-3 h-3" /> {post.imageUrls.length} {post.imageUrls.length === 1 ? "imagem" : "imagens"}</span>
                          )}
                          <span className="flex items-center gap-1">♥ {post.likesCount}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {post.commentsCount}</span>
                        </div>
                      </div>
                    </div>
                    <AlertDialog open={deletingPostId === post.id} onOpenChange={(open) => { if (!open) setDeletingPostId(null); }}>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingPostId(post.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deletar post?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Essa ação não pode ser desfeita. O post de {post.authorName} será removido permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePostMutation.mutate(post.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deletePostMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                            Deletar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
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
  const { data: activityData } = useQuery<{ adminActions: any[]; studentActivity: any[] }>({
    queryKey: ["/api/admin/activity-log"],
    enabled: !!user,
  });
  const { data: allPlanModules = [] } = useQuery<PlanModuleEntry[]>({ queryKey: ["/api/admin/plan-modules"] });
  const { data: admins = [] } = useQuery<SafeUser[]>({
    queryKey: ["/api/admin/admins"],
    enabled: isSuperAdmin,
  });
  const { data: communityStats } = useQuery<{ totalPosts: number; totalComments: number; pendingCreditRequests: number }>({
    queryKey: ["/api/admin/community-stats"],
  });
  const { data: studentModulesSummary = {} } = useQuery<Record<number, number[]>>({
    queryKey: ["/api/admin/students/modules-summary"],
  });
  const [activeTab, setActiveTab] = useState("lessons");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Materials CRUD
  type MaterialThemeWithNested = MaterialTheme & { subcategories: (MaterialSubcategory & { files: MaterialFile[] })[]; fileCount: number };
  const { data: trialStudents = [] } = useQuery<SafeUser[]>({ queryKey: ["/api/admin/students/trial"] });
  const { data: materialThemes = [] } = useQuery<MaterialThemeWithNested[]>({
    queryKey: ["/api/materials"],
    queryFn: async () => { const res = await apiRequest("GET", "/api/materials"); return res.json(); },
  });
  // Credits data
  type CreditTransaction = { id: number; userId: number; userName: string; userEmail: string; planKey: string | null; type: string; amount: number; description: string; referenceId: string; createdAt: string };
  type CreditBalance = { userId: number; userName: string; userEmail: string; planKey: string | null; balance: number };
  const { data: creditsAdminData } = useQuery<{ transactions: CreditTransaction[]; balances: CreditBalance[]; totalOutstanding: number }>({
    queryKey: ["/api/admin/credits"],
    queryFn: async () => { const res = await apiRequest("GET", "/api/admin/credits"); return res.json(); },
  });
  const creditTransactions = creditsAdminData?.transactions || [];
  const creditBalances = creditsAdminData?.balances || [];
  const totalCreditOutstanding = creditsAdminData?.totalOutstanding || 0;
  const [creditFilter, setCreditFilter] = useState<string>("all");
  const [creditPlanFilter, setCreditPlanFilter] = useState<string>("all");
  const [creditPeriod, setCreditPeriod] = useState<string>("all");
  const [bonusDialogOpen, setBonusDialogOpen] = useState(false);
  const [bonusUserId, setBonusUserId] = useState<string>("");
  const [bonusAmount, setBonusAmount] = useState<string>("");
  const [bonusDesc, setBonusDesc] = useState<string>("");
  const [bonusLoading, setBonusLoading] = useState(false);
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  // Clinical sessions state & data
  type ClinicalSession = { id: number; studentId: number; studentName: string; studentEmail: string; sessionDate: string; startTime: string; endTime: string; durationHours: number; procedures: string[]; notes: string | null; status: string; adminName: string; createdAt: string; patientsCount?: number; patientsDetails?: string[]; adminSignedAt?: string | null; studentSignedAt?: string | null };
  const { data: clinicalSessionsData } = useQuery<{ sessions: ClinicalSession[] }>({
    queryKey: ["/api/admin/clinical-sessions"],
    queryFn: async () => { const res = await apiRequest("GET", "/api/admin/clinical-sessions"); return res.json(); },
  });
  const clinicalSessions = clinicalSessionsData?.sessions || [];
  const [clinicalDialogOpen, setClinicalDialogOpen] = useState(false);
  const [clinicalForm, setClinicalForm] = useState({ studentId: 0, sessionType: "pratica" as "pratica" | "observacao", sessionDate: "", startTime: "", endTime: "", durationHours: 0, procedures: [] as string[], notes: "", patientsCount: 0, patientsDetails: [] as string[] });
  const [clinicalLoading, setClinicalLoading] = useState(false);
  const handleAdminSign = async (sessionId: number) => {
    try {
      const res = await apiRequest("POST", `/api/admin/clinical-sessions/${sessionId}/sign`);
      if (res.ok) {
        toast({ title: "Sessao assinada", description: "Assinatura do orientador registrada." });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/clinical-sessions"] });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Erro", description: data.message || "Erro ao assinar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Erro ao assinar sessao", variant: "destructive" });
    }
  };
  // Contracts data
  type ContractEntry = { id: number; userId: number; userName: string; userEmail: string; planKey: string; planName: string; amountPaid: number; status: string; signedAt: string | null; contractGroup: string | null; acceptedAt: string | null; acceptedIp: string | null; contractHtml: string | null; createdAt: string };
  const { data: contractsData } = useQuery<{ contracts: ContractEntry[] }>({
    queryKey: ["/api/admin/contracts"],
    queryFn: async () => { const res = await apiRequest("GET", "/api/admin/contracts"); return res.json(); },
  });
  const contracts = contractsData?.contracts || [];
  const [viewContractHtml, setViewContractHtml] = useState<string | null>(null);
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
    name: "", phone: "", instagram: "", accessExpiresAt: "", approved: false,
    communityAccess: true, supportAccess: true, supportExpiresAt: "",
    clinicalPracticeAccess: true, clinicalPracticeHours: 0,
    clinicalObservationHours: 0,
    materialsAccess: false,
    mentorshipStartDate: "", mentorshipEndDate: "",
    planKey: "",
  });
  // Per-user module permissions state: { [moduleId]: { enabled, startDate, endDate } }
  const [editUserModules, setEditUserModules] = useState<Record<number, { enabled: boolean; startDate: string; endDate: string }>>({});
  // Per-user material category permissions state: { [title]: enabled }
  const [editUserMaterialCats, setEditUserMaterialCats] = useState<Record<string, boolean>>({});

  // Bulk module access duration state
  const [activeBulkDuration, setActiveBulkDuration] = useState<string | null>(null);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customBulkEndDate, setCustomBulkEndDate] = useState("");
  const [bulkFlashActive, setBulkFlashActive] = useState(false);

  // Helper to apply a duration to all modules at once
  const applyBulkDuration = (endDate: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const newMap: Record<number, { enabled: boolean; startDate: string; endDate: string }> = {};
    modules.forEach((m: any) => {
      newMap[m.id] = { enabled: true, startDate: today, endDate };
    });
    setEditUserModules(newMap);
    setBulkFlashActive(true);
    setTimeout(() => setBulkFlashActive(false), 1200);
  };

  const handleBulkDurationClick = (key: string) => {
    const today = new Date();
    let endDate: Date;
    switch (key) {
      case "3m": endDate = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate()); break;
      case "6m": endDate = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate()); break;
      case "1y": endDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()); break;
      case "2y": endDate = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate()); break;
      default: return;
    }
    setActiveBulkDuration(key);
    setShowCustomDatePicker(false);
    applyBulkDuration(endDate.toISOString().slice(0, 10));
    toast({ title: `Todos os modulos definidos para ${key === "3m" ? "3 meses" : key === "6m" ? "6 meses" : key === "1y" ? "1 ano" : "2 anos"}` });
  };

  const handleCustomDateApply = () => {
    if (!customBulkEndDate) return;
    setActiveBulkDuration("custom");
    applyBulkDuration(customBulkEndDate);
    setShowCustomDatePicker(false);
    toast({ title: `Todos os modulos definidos ate ${customBulkEndDate}` });
  };

  const applyMentoriaDatesToAllModules = () => {
    if (!editStudentForm.mentorshipStartDate && !editStudentForm.mentorshipEndDate) {
      toast({ title: "Defina as datas da mentoria primeiro", variant: "destructive" });
      return;
    }
    const newMap: Record<number, { enabled: boolean; startDate: string; endDate: string }> = {};
    modules.forEach((m: any) => {
      newMap[m.id] = {
        enabled: true,
        startDate: editStudentForm.mentorshipStartDate || "",
        endDate: editStudentForm.mentorshipEndDate || "",
      };
    });
    setEditUserModules(newMap);
    setActiveBulkDuration(null);
    setBulkFlashActive(true);
    setTimeout(() => setBulkFlashActive(false), 1200);
    toast({ title: "Datas da mentoria aplicadas a todos os modulos" });
  };

  const MATERIAL_CATEGORY_TITLES = [
    "Toxina Botulínica", "Preenchedores Faciais", "Bioestimuladores de Colágeno",
    "Moduladores de Matriz Extracelular", "Método NaturalUp®", "IA na Medicina",
  ];

  const openEditStudent = async (s: SafeUser) => {
    setEditingStudent(s);
    setEditStudentForm({
      name: s.name,
      phone: stripPhone(s.phone || ""),
      instagram: (s as any).instagram || "",
      accessExpiresAt: s.accessExpiresAt ? s.accessExpiresAt.slice(0, 16) : "",
      approved: s.approved,
      communityAccess: s.communityAccess ?? true,
      supportAccess: s.supportAccess ?? true,
      supportExpiresAt: s.supportExpiresAt ? s.supportExpiresAt.slice(0, 16) : "",
      clinicalPracticeAccess: s.clinicalPracticeAccess ?? true,
      clinicalPracticeHours: (s as any).clinicalPracticeHours ?? 0,
      clinicalObservationHours: (s as any).clinicalObservationHours ?? 0,
      materialsAccess: s.materialsAccess ?? false,
      mentorshipStartDate: (s as any).mentorshipStartDate ? (s as any).mentorshipStartDate.slice(0, 10) : "",
      mentorshipEndDate: (s as any).mentorshipEndDate ? (s as any).mentorshipEndDate.slice(0, 10) : "",
      planKey: (s as any).planKey || "",
    });
    // Load user module permissions
    try {
      const res = await apiRequest("GET", `/api/admin/students/${s.id}/modules`);
      const userMods: any[] = await res.json();
      const modsMap: Record<number, { enabled: boolean; startDate: string; endDate: string }> = {};
      if (Array.isArray(userMods) && userMods.length > 0) {
        userMods.forEach((um: any) => {
          modsMap[um.moduleId] = {
            enabled: um.enabled,
            startDate: um.startDate ? um.startDate.slice(0, 10) : "",
            endDate: um.endDate ? um.endDate.slice(0, 10) : "",
          };
        });
      } else if ((s as any).planKey) {
        // No individual records but has a plan — pre-select all modules
        modules.forEach((m: any) => {
          modsMap[m.id] = { enabled: true, startDate: "", endDate: "" };
        });
      }
      setEditUserModules(modsMap);
    } catch { setEditUserModules({}); }
    // Load user material category permissions
    try {
      const res = await apiRequest("GET", `/api/admin/students/${s.id}/material-categories`);
      const userCats: any[] = await res.json();
      const catsMap: Record<string, boolean> = {};
      if (Array.isArray(userCats) && userCats.length > 0) {
        userCats.forEach((uc: any) => { catsMap[uc.categoryTitle] = uc.enabled; });
      } else if (s.materialsAccess) {
        // No individual records but has materials access — pre-select all
        MATERIAL_CATEGORY_TITLES.forEach(c => { catsMap[c] = true; });
      }
      setEditUserMaterialCats(catsMap);
    } catch { setEditUserMaterialCats({}); }
  };

  const updateStudentMutation = useMutation({
    mutationFn: async ({ id, data, userModulesData, userMaterialCatsData, provisionPlanKey }: { id: number; data: any; userModulesData?: any; userMaterialCatsData?: any; provisionPlanKey?: string }) => {
      await apiRequest("PATCH", `/api/admin/students/${id}`, data);
      if (provisionPlanKey) {
        await apiRequest("POST", `/api/admin/students/${id}/provision`, { planKey: provisionPlanKey });
      }
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
  const [activityTab, setActivityTab] = useState<"admin" | "alunos">("alunos");

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
    admin_login: "Login admin",
    student_login: "Login aluno",
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
    admin_role_changed: "Role alterada",
    access_toggled: "Acesso alterado",
    credit_bonus: "Bonus creditado",
    broadcast_email: "Email enviado",
    plan_purchased: "Nova compra",
    plan_upgraded: "Upgrade de plano",
    plan_renewed: "Renovacao",
    payment_failed: "Falha de pagamento",
    invoice_payment_failed: "Falha de renovacao",
  };

  // Grupos de ações para filtro rápido
  const ACTION_GROUPS: Record<string, { label: string; actions: string[] }> = {
    stripe: { label: "Eventos Stripe", actions: ["plan_purchased", "plan_upgraded", "plan_renewed", "payment_failed", "invoice_payment_failed"] },
    creditos: { label: "Creditos", actions: ["credit_bonus"] },
    alunos: { label: "Gestao de alunos", actions: ["student_approved", "student_revoked", "student_deleted", "student_updated", "access_toggled", "password_reset"] },
    conteudo: { label: "Conteudo", actions: ["module_created", "module_updated", "module_deleted", "lesson_created", "lesson_updated", "lesson_deleted", "plan_created", "plan_updated", "plan_deleted"] },
    logins: { label: "Logins", actions: ["admin_login", "student_login"] },
  };

  // Detail key labels for formatted display
  const detailKeyLabels: Record<string, string> = {
    name: "Nome", email: "Email", phone: "Telefone", plan_key: "Plano", planKey: "Plano",
    approved: "Aprovado", role: "Cargo", accessExpiresAt: "Expira em", access_expires_at: "Expira em",
    materialsAccess: "Materiais", materials_access: "Materiais",
    communityAccess: "Comunidade", community_access: "Comunidade",
    supportAccess: "Suporte", support_access: "Suporte",
    clinicalPracticeAccess: "Pratica clinica", clinical_practice_access: "Pratica clinica",
    clinicalPracticeHours: "Horas pratica", clinical_practice_hours: "Horas pratica",
    clinicalObservationHours: "Horas observacao", clinical_observation_hours: "Horas observacao",
    mentorshipStartDate: "Inicio mentoria", mentorship_start_date: "Inicio mentoria",
    mentorshipEndDate: "Fim mentoria", mentorship_end_date: "Fim mentoria",
    moduleContentExpiresAt: "Conteudo expira", module_content_expires_at: "Conteudo expira",
    amount: "Valor", currency: "Moeda", status: "Status",
    old_plan: "Plano anterior", new_plan: "Novo plano",
    credits: "Creditos", reason: "Motivo", ip: "IP",
    user_agent: "Navegador", userAgent: "Navegador",
  };

  const formatDetailValue = (key: string, v: unknown): string => {
    const s = String(v);
    // Booleans
    if (v === true || s === "true") return "Sim";
    if (v === false || s === "false") return "Nao";
    // Null
    if (v === null || v === undefined || s === "null") return "-";
    // Currency (amount fields from Stripe come in cents)
    if ((key === "amount" || key === "valor") && typeof v === "number") {
      return `R$ ${(v / 100).toFixed(2).replace(".", ",")}`;
    }
    // Dates — ISO strings
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
      try {
        return new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
      } catch { /* fall through */ }
    }
    // Plan keys — humanize
    if ((key === "plan_key" || key === "planKey" || key === "old_plan" || key === "new_plan") && typeof v === "string") {
      return v.replace(/_/g, " ");
    }
    return s.length > 40 ? s.slice(0, 37) + "..." : s;
  };

  const [logFilterGroup, setLogFilterGroup] = useState<string>("all");
  const [logFilterStudent, setLogFilterStudent] = useState<string>("all");

  const filteredLogs = auditLogs.filter(log => {
    if (logFilterAdmin !== "all" && String(log.adminId) !== logFilterAdmin) return false;
    if (logFilterAction !== "all" && log.action !== logFilterAction) return false;
    if (logFilterGroup !== "all") {
      const group = ACTION_GROUPS[logFilterGroup];
      if (group && !group.actions.includes(log.action)) return false;
    }
    if (logFilterStudent !== "all" && String(log.targetId) !== logFilterStudent) return false;
    return true;
  });

  // Consolidate repeated login entries (same action + same user within sequence)
  const consolidatedLogs = (() => {
    const result: Array<typeof filteredLogs[0] & { repeatCount?: number }> = [];
    for (const log of filteredLogs) {
      const isLogin = log.action === "admin_login" || log.action === "student_login";
      const prev = result[result.length - 1];
      if (isLogin && prev && prev.action === log.action && prev.adminId === log.adminId) {
        prev.repeatCount = (prev.repeatCount || 1) + 1;
      } else {
        result.push({ ...log, repeatCount: 1 });
      }
    }
    return result;
  })();

  // Alunos únicos que aparecem no histórico (como target)
  const uniqueTargets = Array.from(new Map(auditLogs.filter(l => l.targetName && l.targetId).map(l => [l.targetId, l.targetName])).entries());

  const uniqueActions = Array.from(new Set(auditLogs.map(l => l.action)));
  const uniqueAdmins = Array.from(new Map(auditLogs.map(l => [l.adminId, l.adminName])).entries());

  // Greeting helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };
  const todayDate = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const completedLessons = allProgress.filter(p => p.completed).length;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ─── Welcome Header ─── */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-semibold text-foreground">
                {getGreeting()}, {user?.name?.split(" ")[0] || "Admin"}
              </h1>
              <Badge
                variant="secondary"
                className="text-[10px] sm:text-xs bg-gold/10 text-gold border border-gold/20 px-2 sm:px-3 py-0.5 sm:py-1 font-medium shrink-0"
              >
                <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                {isSuperAdmin ? "Super Admin" : "Admin"}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 capitalize truncate">{todayDate}</p>
          </div>
        </div>

        {/* ─── Hero Stats Grid ─── */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {[
            {
              label: "Alunos Ativos",
              shortLabel: "Ativos",
              value: approvedStudents.length,
              icon: GraduationCap,
              color: "text-emerald-400",
              gradient: "from-emerald-500/10 to-emerald-500/5",
              border: "border-emerald-500/20",
            },
            {
              label: "Em Conversao",
              shortLabel: "Conversao",
              value: pendingStudents.length,
              icon: TrendingUp,
              color: "text-amber-400",
              gradient: "from-amber-500/10 to-amber-500/5",
              border: pendingStudents.length > 0 ? "border-amber-500/30" : "border-amber-500/20",
              pulse: pendingStudents.length > 0,
            },
            {
              label: "Receita Creditos",
              shortLabel: "Receita",
              value: `R$ ${((totalCreditOutstanding || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`,
              icon: CreditCard,
              color: "text-gold",
              gradient: "from-gold/10 to-gold/5",
              border: "border-gold/20",
            },
            {
              label: "Posts Comunidade",
              shortLabel: "Posts",
              value: communityStats?.totalPosts ?? 0,
              icon: MessageCircle,
              color: "text-blue-400",
              gradient: "from-blue-500/10 to-blue-500/5",
              border: "border-blue-500/20",
            },
            {
              label: "Creditos Pendentes",
              shortLabel: "Pendentes",
              value: communityStats?.pendingCreditRequests ?? 0,
              icon: Coins,
              color: "text-amber-400",
              gradient: "from-amber-500/10 to-amber-500/5",
              border: (communityStats?.pendingCreditRequests ?? 0) > 0 ? "border-amber-500/30" : "border-amber-500/20",
              pulse: (communityStats?.pendingCreditRequests ?? 0) > 0,
            },
            {
              label: "Aulas Completas",
              shortLabel: "Aulas",
              value: completedLessons,
              icon: BarChart3,
              color: "text-violet-400",
              gradient: "from-violet-500/10 to-violet-500/5",
              border: "border-violet-500/20",
            },
          ].map((stat) => (
            <Card
              key={stat.label}
              className={`${stat.border} bg-gradient-to-br ${stat.gradient} hover:scale-[1.02] transition-all duration-200 cursor-default min-w-0`}
            >
              <CardContent className="p-2 sm:p-4">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-background/60 flex items-center justify-center">
                    <stat.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${stat.color}`} />
                  </div>
                  {"pulse" in stat && stat.pulse && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                    </span>
                  )}
                </div>
                <p className="text-base sm:text-xl font-semibold text-foreground truncate">{stat.value}</p>
                <p className="text-[9px] sm:text-[11px] text-muted-foreground uppercase tracking-brand mt-0.5 truncate">
                  <span className="sm:hidden">{stat.shortLabel}</span>
                  <span className="hidden sm:inline">{stat.label}</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ─── Quick Actions ─── */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-none">
          <Button
            size="sm"
            className="bg-gold text-[#0A1628] hover:bg-gold/90 font-medium gap-1.5 text-xs shrink-0 h-8"
            onClick={() => setActiveTab("lessons")}
          >
            <Plus className="w-3.5 h-3.5" /> Nova Aula
          </Button>
          <Button
            size="sm"
            className="font-medium gap-1.5 text-xs shrink-0 h-8"
            style={{ backgroundColor: '#10B981', color: '#fff' }}
            onClick={() => { setActiveTab("practices"); setClinicalDialogOpen(true); }}
          >
            <Stethoscope className="w-3.5 h-3.5" /> Lancar Pratica
          </Button>
          {(communityStats?.pendingCreditRequests ?? 0) > 0 && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-1.5 text-xs shrink-0 h-8"
              onClick={() => setActiveTab("community")}
            >
              <Coins className="w-3.5 h-3.5" />
              Creditos
              <Badge className="bg-white/20 text-white border-0 text-[10px] px-1.5 py-0 ml-0.5">
                {communityStats?.pendingCreditRequests}
              </Badge>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 font-medium gap-1.5 text-xs shrink-0 h-8"
            onClick={() => setActiveTab("leads")}
          >
            <Zap className="w-3.5 h-3.5" />
            Leads
            {trialStudents.length > 0 && (
              <Badge className="bg-blue-500/20 text-blue-400 border-0 text-[10px] px-1.5 py-0 ml-0.5">
                {trialStudents.length}
              </Badge>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-border/40 text-muted-foreground hover:text-foreground font-medium gap-1.5 text-xs shrink-0 h-8"
            onClick={() => setActiveTab("students")}
          >
            <Users className="w-3.5 h-3.5" />
            Alunos
          </Button>
        </div>

        {/* ─── Alerta: Acessos expirando nos próximos 30 dias ─── */}
        {(() => {
          const now = Date.now();
          const in30d = now + 30 * 86400000;
          const expiringSoon = students.filter(s => {
            if (!s.approved || !s.accessExpiresAt) return false;
            const exp = new Date(s.accessExpiresAt).getTime();
            return exp > now && exp <= in30d;
          }).sort((a, b) => new Date(a.accessExpiresAt!).getTime() - new Date(b.accessExpiresAt!).getTime());

          if (expiringSoon.length === 0) return null;
          return (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Acessos expirando nos proximos 30 dias ({expiringSoon.length})</p>
              </div>
              <div className="space-y-2">
                {expiringSoon.map(s => {
                  const daysLeft = Math.ceil((new Date(s.accessExpiresAt!).getTime() - now) / 86400000);
                  return (
                    <div key={s.id} className="flex items-center justify-between bg-background/30 rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.email} · {(s as any).planKey?.replace(/_/g, ' ') || 'Sem perfil'}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-semibold ${daysLeft <= 7 ? 'text-red-400' : daysLeft <= 15 ? 'text-amber-400' : 'text-yellow-500'}`}>
                          {daysLeft}d restantes
                        </span>
                        <button
                          className="text-xs text-gold hover:underline"
                          onClick={() => openEditStudent(s)}
                        >
                          Renovar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ─── Main Content Tabs ─── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* ─── Mobile: hamburger menu ─── */}
          <div className="sm:hidden">
            {(() => {
              const allTabs: { value: string; label: string; icon: any; badge?: number; group: string }[] = [
                { value: "students", label: "Alunos", icon: Users, group: "Pessoas" },
                { value: "leads", label: "Leads", icon: Zap, badge: trialStudents.length > 0 ? trialStudents.length : undefined, group: "Pessoas" },
                { value: "profiles", label: "Perfis", icon: FileText, group: "Pessoas" },
                { value: "modules", label: "Modulos", icon: Layers, group: "Conteudo" },
                { value: "lessons", label: "Aulas", icon: Video, group: "Conteudo" },
                { value: "materiais", label: "Materiais", icon: Library, group: "Conteudo" },
                { value: "practices", label: "Praticas", icon: Stethoscope, group: "Conteudo" },
                { value: "community", label: "Comunidade", icon: MessageCircle, group: "Engajamento" },
                { value: "credits", label: "Creditos", icon: Coins, group: "Engajamento" },
                ...(isSuperAdmin ? [
                  { value: "admins", label: "Admins", icon: UserCog, group: "Sistema" },
                  { value: "history", label: "Historico", icon: History, group: "Sistema" },
                ] : []),
              ];
              const current = allTabs.find(t => t.value === activeTab) || allTabs[0];
              const ActiveIcon = current.icon;
              const groups = ["Pessoas", "Conteudo", "Engajamento", ...(isSuperAdmin ? ["Sistema"] : [])];

              return (
                <>
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-card/60 border border-border/30 active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-center gap-2.5">
                      <ActiveIcon className="w-4 h-4 text-gold" />
                      <span className="text-sm font-medium text-foreground">{current.label}</span>
                      {current.badge && (
                        <span className="w-5 h-5 bg-gold text-[#0A1628] text-[10px] font-bold rounded-full flex items-center justify-center">
                          {current.badge}
                        </span>
                      )}
                    </div>
                    <Menu className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${mobileMenuOpen ? "rotate-90" : ""}`} />
                  </button>

                  {mobileMenuOpen && (
                    <>
                      <div className="fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-150" onClick={() => setMobileMenuOpen(false)} />
                      <div className="fixed left-4 right-4 top-[130px] z-50 bg-[#0F1A2E] border border-border/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Close button */}
                        <div className="flex items-center justify-between px-4 pt-3 pb-1">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold">Navegacao</p>
                          <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto pb-2">
                          {groups.map((group, gi) => (
                            <div key={group}>
                              {gi > 0 && <div className="mx-4 my-1 border-t border-border/20" />}
                              <p className="px-4 pt-2.5 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold">{group}</p>
                              {allTabs.filter(t => t.group === group).map((tab) => {
                                const TabIcon = tab.icon;
                                const isActive = activeTab === tab.value;
                                return (
                                  <button
                                    key={tab.value}
                                    onClick={() => { setActiveTab(tab.value); setMobileMenuOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                      isActive
                                        ? "text-gold bg-gold/5 border-l-2 border-gold"
                                        : "text-foreground hover:bg-white/5 border-l-2 border-transparent"
                                    }`}
                                  >
                                    <TabIcon className={`w-4 h-4 ${isActive ? "text-gold" : "text-muted-foreground"}`} />
                                    <span className="flex-1 text-left font-medium">{tab.label}</span>
                                    {tab.badge && (
                                      <span className="w-5 h-5 bg-gold text-[#0A1628] text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {tab.badge}
                                      </span>
                                    )}
                                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-gold" />}
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>

          {/* ─── Desktop: centered tab card ─── */}
          <div className="hidden sm:block">
            <div className="rounded-2xl border border-border/30 bg-card/40 backdrop-blur-sm p-4">
              <TabsList className="bg-transparent h-auto p-0 w-full flex items-center justify-center gap-8 flex-wrap">
                {/* Group: Pessoas */}
                <div className="flex items-center gap-1">
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-semibold mr-2">Pessoas</span>
                  <TabsTrigger
                    value="students"
                    data-testid="tab-students-d"
                    className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:border-gold/30 data-[state=active]:shadow-[0_0_12px_rgba(212,168,67,0.1)] data-[state=active]:shadow-none border border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Alunos
                  </TabsTrigger>
                  <TabsTrigger
                    value="leads"
                    data-testid="tab-leads-d"
                    className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:border-gold/30 data-[state=active]:shadow-[0_0_12px_rgba(212,168,67,0.1)] data-[state=active]:shadow-none border border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all relative"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Leads
                    {trialStudents.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold text-[#0A1628] text-[10px] font-bold rounded-full flex items-center justify-center">
                        {trialStudents.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="profiles"
                    data-testid="tab-profiles-d"
                    className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:border-gold/30 data-[state=active]:shadow-[0_0_12px_rgba(212,168,67,0.1)] data-[state=active]:shadow-none border border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Perfis
                  </TabsTrigger>
                </div>

                <div className="w-px h-6 bg-border/20" />

                {/* Group: Conteudo */}
                <div className="flex items-center gap-1">
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-semibold mr-2">Conteudo</span>
                  <TabsTrigger
                    value="modules"
                    data-testid="tab-modules-d"
                    className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:border-gold/30 data-[state=active]:shadow-[0_0_12px_rgba(212,168,67,0.1)] data-[state=active]:shadow-none border border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Modulos
                  </TabsTrigger>
                  <TabsTrigger
                    value="lessons"
                    data-testid="tab-lessons-d"
                    className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:border-gold/30 data-[state=active]:shadow-[0_0_12px_rgba(212,168,67,0.1)] data-[state=active]:shadow-none border border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <Video className="w-3.5 h-3.5" />
                    Aulas
                  </TabsTrigger>
                  <TabsTrigger
                    value="materiais"
                    data-testid="tab-materiais-d"
                    className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:border-gold/30 data-[state=active]:shadow-[0_0_12px_rgba(212,168,67,0.1)] data-[state=active]:shadow-none border border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <Library className="w-3.5 h-3.5" />
                    Materiais
                  </TabsTrigger>
                  <TabsTrigger
                    value="practices"
                    data-testid="tab-practices-d"
                    className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:border-gold/30 data-[state=active]:shadow-[0_0_12px_rgba(212,168,67,0.1)] data-[state=active]:shadow-none border border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    Praticas
                  </TabsTrigger>
                </div>

                <div className="w-px h-6 bg-border/20" />

                {/* Group: Engajamento */}
                <div className="flex items-center gap-1">
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-semibold mr-2">Engajamento</span>
                  <TabsTrigger
                    value="community"
                    data-testid="tab-community-d"
                    className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:border-gold/30 data-[state=active]:shadow-[0_0_12px_rgba(212,168,67,0.1)] data-[state=active]:shadow-none border border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Comunidade
                  </TabsTrigger>
                  <TabsTrigger
                    value="credits"
                    data-testid="tab-credits-d"
                    className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:border-gold/30 data-[state=active]:shadow-[0_0_12px_rgba(212,168,67,0.1)] data-[state=active]:shadow-none border border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    Creditos
                  </TabsTrigger>
                </div>

                {/* Group: Sistema (super admin only) */}
                {isSuperAdmin && (
                  <>
                    <div className="w-px h-6 bg-border/20" />
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-semibold mr-2">Sistema</span>
                      <TabsTrigger
                        value="admins"
                        data-testid="tab-admins-d"
                        className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:border-gold/30 data-[state=active]:shadow-[0_0_12px_rgba(212,168,67,0.1)] data-[state=active]:shadow-none border border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all"
                      >
                        <UserCog className="w-3.5 h-3.5" />
                        Admins
                      </TabsTrigger>
                      <TabsTrigger
                        value="history"
                        data-testid="tab-history-d"
                        className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:border-gold/30 data-[state=active]:shadow-[0_0_12px_rgba(212,168,67,0.1)] data-[state=active]:shadow-none border border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all"
                      >
                        <History className="w-3.5 h-3.5" />
                        Historico
                      </TabsTrigger>
                    </div>
                  </>
                )}
              </TabsList>
            </div>
          </div>

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
                          {s.phone && <p className="text-xs text-muted-foreground truncate mt-0.5">{formatPhoneDisplay(s.phone)}</p>}
                          {(s as any).instagram && <p className="text-xs text-muted-foreground truncate mt-0.5">@{(s as any).instagram}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="bg-gold text-background hover:bg-gold/90 font-medium flex-1 sm:flex-none"
                            onClick={() => { setApprovingStudent(s); setApprovePlanId(""); }}
                            data-testid={`button-approve-${s.id}`}
                          >
                            <Check className="w-4 h-4 mr-1.5" />
                            Converter
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
                    const progress = getStudentProgress(s.id);
                    const studentModIds = studentModulesSummary[s.id] || [];
                    const studentMods = modules.filter((m: any) => studentModIds.includes(m.id));
                    const practiceH = (s as any).clinicalPracticeHours || 0;
                    const obsH = (s as any).clinicalObservationHours || 0;
                    const planKeyLabels: Record<string, string> = {
                      modulo_avulso: "Modulo Avulso", pacote_completo: "Pacote Completo",
                      observador_essencial: "Observador Essencial", observador_avancado: "Observador Avancado",
                      observador_intensivo: "Observador Intensivo", imersao: "Imersao",
                      vip_online: "VIP Online", vip_presencial: "VIP Presencial", vip_completo: "VIP Completo",
                      extensao_acompanhamento: "Extensao Acompanhamento",
                      horas_clinicas_1: "Horas Clinicas (1)", horas_clinicas_2: "Horas Clinicas (2)", horas_clinicas_3: "Horas Clinicas (3)",
                    };
                    const planLabel = (s as any).planKey ? (planKeyLabels[(s as any).planKey] || (s as any).planKey.replace(/_/g, ' ')) : (plan ? plan.name : 'Trial');

                    return (
                      <Card key={s.id} className="border-border/30 bg-card/50 hover:bg-card/70 transition-colors">
                        <CardContent className="p-4 space-y-2.5">
                          {/* Row 1: Name + status + action buttons */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium truncate text-foreground">{s.name}</p>
                                {s.approved ? (
                                  (s as any).mentorshipEndDate && new Date((s as any).mentorshipEndDate) > new Date()
                                    ? <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-0 shrink-0">Mentoria Ativa</Badge>
                                    : <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-400 border-0 shrink-0">Concluido</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-400 border-0 shrink-0">Pendente</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {s.email}{s.phone ? ` | ${formatPhoneDisplay(s.phone)}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {s.approved && (
                                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-gold h-7 w-7 p-0" onClick={() => setSelectedStudent(s)} title="Ver progresso">
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-gold h-7 w-7 p-0" onClick={() => openEditStudent(s)} title="Editar aluno">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-gold h-7 w-7 p-0" onClick={() => resetPasswordMutation.mutate(s.id)} title="Resetar senha" disabled={resetPasswordMutation.isPending}>
                                <KeyRound className="w-3.5 h-3.5" />
                              </Button>
                              {s.phone && (
                                <a href={`https://wa.me/${stripPhone(s.phone)}`} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-green-400 h-7 w-7 p-0" title="WhatsApp">
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </Button>
                                </a>
                              )}
                              {isSuperAdmin && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive h-7 w-7 p-0" data-testid={`button-delete-student-${s.id}`}>
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

                          {/* Row 2: Info grid (only for approved students) */}
                          {s.approved && (
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                              <div><span className="text-muted-foreground">Plano:</span> <span className="font-medium text-foreground">{planLabel}</span></div>
                              <div><span className="text-muted-foreground">Aulas:</span> <span className={`font-medium ${progress.percent === 100 ? 'text-emerald-400' : 'text-foreground'}`}>{progress.completed}/{progress.total} ({progress.percent}%)</span></div>
                              {(s as any).mentorshipEndDate && (
                                <div><span className="text-muted-foreground">Mentoria:</span> <span className="font-medium text-foreground">ate {new Date((s as any).mentorshipEndDate).toLocaleDateString('pt-BR')}</span></div>
                              )}
                            </div>
                          )}
                          {!s.approved && (
                            <div className="text-xs text-muted-foreground">Plano: {planLabel}</div>
                          )}

                          {/* Row 3: Modules + Materials + Hours badges */}
                          {s.approved && (
                            <div className="space-y-1">
                              {studentMods.length > 0 && (
                                <div className="text-[11px]">
                                  <span className="text-muted-foreground">Modulos: </span>
                                  <span className="text-foreground">{studentMods.map((m: any) => m.title.length > 15 ? m.title.slice(0, 13) + '\u2026' : m.title).join(' | ')}</span>
                                </div>
                              )}
                              <div className="text-[11px]">
                                <span className="text-muted-foreground">Materiais: </span>
                                <span className="text-foreground">{(s as any).materialsAccess ? 'Todos' : 'Nenhum'}</span>
                              </div>
                              {(practiceH > 0 || obsH > 0) && (
                                <div className="flex flex-wrap gap-1.5 mt-0.5">
                                  {practiceH > 0 && (
                                    <span className="inline-flex items-center rounded-md bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
                                      {practiceH}h pratica
                                    </span>
                                  )}
                                  {obsH > 0 && (
                                    <span className="inline-flex items-center rounded-md bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400">
                                      {obsH}h observacao
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Row 4: Progress bar */}
                          {s.approved && lessons.length > 0 && (
                            <div className="flex items-center gap-3">
                              <Progress value={progress.percent} className="h-1.5 flex-1" />
                              <span className="text-[11px] text-muted-foreground w-8 text-right">{progress.percent}%</span>
                            </div>
                          )}

                          {/* Row 5: Action buttons */}
                          <div className="flex items-center gap-2">
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
                                Converter
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
                                  {formatPhoneDisplay(s.phone)}
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
                                onClick={() => openEditStudent(s)}
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
                                  href={`https://wa.me/${stripPhone(s.phone)}`}
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
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Phone className="w-3 h-3" /> Telefone
                        </Label>
                        <Input type="tel" placeholder="+55 (21) 99999-9999" value={formatPhoneDisplay(editStudentForm.phone)} onChange={e => { const { raw } = handlePhoneInput(e.target.value); setEditStudentForm(f => ({ ...f, phone: raw })); }} className="bg-background/50 border-border/40" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Instagram</Label>
                        <Input placeholder="@usuario" value={editStudentForm.instagram} onChange={e => setEditStudentForm(f => ({ ...f, instagram: e.target.value }))} className="bg-background/50 border-border/40" />
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
                      <Label className="text-xs uppercase tracking-wider text-gold">Plano</Label>
                      <Select value={editStudentForm.planKey || ""} onValueChange={(v) => setEditStudentForm(f => ({ ...f, planKey: v }))}>
                        <SelectTrigger className="bg-background/50 border-gold/30 border"><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem plano</SelectItem>
                          <SelectItem value="modulo_avulso">Modulo Avulso</SelectItem>
                          <SelectItem value="pacote_completo">Pacote Completo</SelectItem>
                          <SelectItem value="observador_essencial">Observador Essencial</SelectItem>
                          <SelectItem value="observador_avancado">Observador Avancado</SelectItem>
                          <SelectItem value="observador_intensivo">Observador Intensivo</SelectItem>
                          <SelectItem value="imersao">Imersao</SelectItem>
                          <SelectItem value="vip_online">VIP Online</SelectItem>
                          <SelectItem value="vip_presencial">VIP Presencial</SelectItem>
                          <SelectItem value="vip_completo">VIP Completo</SelectItem>
                          <SelectItem value="extensao_acompanhamento">Extensao de Acompanhamento (+3 meses)</SelectItem>
                          <SelectItem value="horas_clinicas_1">Horas Clinicas (1 encontro)</SelectItem>
                          <SelectItem value="horas_clinicas_2">Horas Clinicas (2 encontros)</SelectItem>
                          <SelectItem value="horas_clinicas_3">Horas Clinicas (3 encontros)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground">Ao salvar com um plano diferente, modulos e materiais serao provisionados automaticamente</p>
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
                    <button
                      type="button"
                      onClick={applyMentoriaDatesToAllModules}
                      className="flex items-center gap-1.5 text-[11px] text-gold hover:text-gold/80 transition-colors mt-1"
                    >
                      <Copy className="w-3 h-3" />
                      Aplicar para todos os modulos
                    </button>
                  </div>

                  <div className="w-full h-px bg-border/30" />

                  {/* ── Section: Modulos ── */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-gold uppercase tracking-brand flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" /> Modulos
                    </h4>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Configure quais modulos o aluno pode acessar.</p>
                      <button
                        type="button"
                        onClick={() => {
                          const allOn = modules.every((m: any) => editUserModules[m.id]?.enabled);
                          const newMap: Record<number, { enabled: boolean; startDate: string; endDate: string }> = {};
                          modules.forEach((m: any) => {
                            newMap[m.id] = { enabled: !allOn, startDate: editUserModules[m.id]?.startDate || "", endDate: editUserModules[m.id]?.endDate || "" };
                          });
                          setEditUserModules(newMap);
                        }}
                        className="text-xs text-gold hover:text-gold/80 transition-colors shrink-0"
                      >
                        {modules.every((m: any) => editUserModules[m.id]?.enabled) ? "Desmarcar todos" : "Selecionar todos"}
                      </button>
                    </div>

                    {/* ── Bulk Duration Selector ── */}
                    <div className="rounded-lg border border-gold/20 bg-gold/5 p-3 space-y-2.5">
                      <p className="text-[11px] font-semibold text-gold uppercase tracking-wider">Definir acesso a todos os modulos:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {([
                          { key: "3m", label: "3 meses" },
                          { key: "6m", label: "6 meses" },
                          { key: "1y", label: "1 ano" },
                          { key: "2y", label: "2 anos" },
                        ] as const).map(({ key, label }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleBulkDurationClick(key)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                              activeBulkDuration === key
                                ? "bg-gold text-[#0A1628] shadow-sm"
                                : "bg-background/60 text-foreground border border-border/30 hover:border-gold/40 hover:text-gold"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomDatePicker(!showCustomDatePicker);
                            setActiveBulkDuration(showCustomDatePicker ? activeBulkDuration : null);
                          }}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            activeBulkDuration === "custom"
                              ? "bg-gold text-[#0A1628] shadow-sm"
                              : "bg-background/60 text-foreground border border-border/30 hover:border-gold/40 hover:text-gold"
                          }`}
                        >
                          Personalizado
                        </button>
                      </div>
                      {showCustomDatePicker && (
                        <div className="flex items-end gap-2 pt-1">
                          <div className="space-y-1 flex-1">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Data final personalizada</Label>
                            <Input
                              type="date"
                              value={customBulkEndDate}
                              onChange={e => setCustomBulkEndDate(e.target.value)}
                              className="bg-background/50 border-border/40 h-8 text-xs"
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleCustomDateApply}
                            disabled={!customBulkEndDate}
                            className="bg-gold hover:bg-gold/90 text-[#0A1628] h-8 text-xs font-medium"
                          >
                            Aplicar
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {modules.sort((a, b) => a.order - b.order).map((mod) => {
                        const entry = editUserModules[mod.id];
                        const isEnabled = entry?.enabled ?? false;
                        return (
                          <div key={mod.id} className={`rounded-lg border p-3 space-y-2 transition-all duration-500 ${bulkFlashActive ? "border-gold/50 bg-gold/10 bulk-flash" : "border-border/20 bg-background/30"}`}>
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
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">Selecione as categorias de materiais.</p>
                          <button
                            type="button"
                            onClick={() => {
                              const allOn = MATERIAL_CATEGORY_TITLES.every(t => editUserMaterialCats[t]);
                              const newCats: Record<string, boolean> = {};
                              MATERIAL_CATEGORY_TITLES.forEach(c => { newCats[c] = !allOn; });
                              setEditUserMaterialCats(newCats);
                            }}
                            className="text-xs text-gold hover:text-gold/80 transition-colors shrink-0"
                          >
                            {MATERIAL_CATEGORY_TITLES.every(t => editUserMaterialCats[t]) ? "Desmarcar todos" : "Selecionar todos"}
                          </button>
                        </div>
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
                      {/* Campos de horas clinicas */}
                      <div className="flex items-center justify-between pl-2">
                        <div>
                          <Label className="text-sm font-medium">Horas de Pratica</Label>
                          <p className="text-xs text-muted-foreground">Atendimento a pacientes modelo</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={editStudentForm.clinicalPracticeHours ?? 0}
                            onChange={(e) => setEditStudentForm(f => ({ ...f, clinicalPracticeHours: Number(e.target.value) }))}
                            className="w-20 h-8 text-sm text-center bg-background/50 border-border/40"
                          />
                          <span className="text-xs text-muted-foreground">horas</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pl-2">
                        <div>
                          <Label className="text-sm font-medium">Horas de Observacao</Label>
                          <p className="text-xs text-muted-foreground">Observacao clinica presencial</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={editStudentForm.clinicalObservationHours ?? 0}
                            onChange={(e) => setEditStudentForm(f => ({ ...f, clinicalObservationHours: Number(e.target.value) } as any))}
                            className="w-20 h-8 text-sm text-center bg-background/50 border-border/40"
                          />
                          <span className="text-xs text-muted-foreground">horas</span>
                        </div>
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
                      if (editStudentForm.phone !== stripPhone(editingStudent.phone || "")) data.phone = editStudentForm.phone;
                      const normalizedIg = (editStudentForm.instagram || "").replace(/^@/, "").trim();
                      if (normalizedIg !== ((editingStudent as any).instagram || "")) data.instagram = normalizedIg;
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
                      data.clinicalPracticeHours = editStudentForm.clinicalPracticeHours ?? 0;
                      data.clinicalObservationHours = editStudentForm.clinicalObservationHours ?? 0;
                      data.materialsAccess = editStudentForm.materialsAccess;
                      if (editStudentForm.planKey && editStudentForm.planKey !== "none") {
                        data.planKey = editStudentForm.planKey;
                      } else if (editStudentForm.planKey === "none") {
                        data.planKey = null;
                      }

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

                      // If planKey changed, trigger auto-provisioning
                      const currentPlanKey = (editingStudent as any).planKey || "";
                      const newPlanKey = editStudentForm.planKey && editStudentForm.planKey !== "none" ? editStudentForm.planKey : "";
                      const planKeyChanged = newPlanKey && newPlanKey !== currentPlanKey;

                      updateStudentMutation.mutate({
                        id: editingStudent.id,
                        data,
                        provisionPlanKey: planKeyChanged ? newPlanKey : undefined,
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

            {/* ========== CLINICAL SESSIONS SECTION ========== */}
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Stethoscope className="w-5 h-5 text-gold" /> Sessões Clínicas</h3>
                <Dialog open={clinicalDialogOpen} onOpenChange={setClinicalDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-gold text-background hover:bg-gold/90"><Plus className="w-4 h-4 mr-1" /> Registrar Sessão</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border/40 max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Registrar Sessão Clínica</DialogTitle>
                      <DialogDescription>Selecione o aluno e preencha os dados da sessão.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Aluno</Label>
                        <Select value={clinicalForm.studentId ? String(clinicalForm.studentId) : ""} onValueChange={(v) => setClinicalForm(f => ({ ...f, studentId: parseInt(v) }))}>
                          <SelectTrigger className="bg-background/50 border-border/40"><SelectValue placeholder="Selecione o aluno..." /></SelectTrigger>
                          <SelectContent>
                            {students.filter(s => s.role === "student" && (s as any).clinicalPracticeHours > 0).map(s => (
                              <SelectItem key={s.id} value={String(s.id)}>{s.name} — {(s as any).clinicalPracticeHours}h restantes</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo de sessao</Label>
                        <div className="flex gap-2 mt-1">
                          <button type="button" onClick={() => setClinicalForm(f => ({ ...f, sessionType: 'pratica' }))} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${clinicalForm.sessionType === 'pratica' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-card border border-border/30 text-muted-foreground'}`}>Pratica Clinica</button>
                          <button type="button" onClick={() => setClinicalForm(f => ({ ...f, sessionType: 'observacao' }))} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${clinicalForm.sessionType === 'observacao' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40' : 'bg-card border border-border/30 text-muted-foreground'}`}>Observacao Clinica</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Data</Label>
                          <Input type="date" value={clinicalForm.sessionDate} onChange={e => setClinicalForm(f => ({ ...f, sessionDate: e.target.value }))} className="bg-background/50 border-border/40" />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Início</Label>
                          <Input type="time" value={clinicalForm.startTime} onChange={e => {
                            const st = e.target.value;
                            setClinicalForm(f => {
                              const updated = { ...f, startTime: st };
                              if (st && f.endTime) {
                                const [sh, sm] = st.split(":").map(Number);
                                const [eh, em] = f.endTime.split(":").map(Number);
                                const diff = (eh * 60 + em - sh * 60 - sm) / 60;
                                updated.durationHours = diff > 0 ? Math.round(diff * 100) / 100 : 0;
                              }
                              return updated;
                            });
                          }} className="bg-background/50 border-border/40" />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fim</Label>
                          <Input type="time" value={clinicalForm.endTime} onChange={e => {
                            const et = e.target.value;
                            setClinicalForm(f => {
                              const updated = { ...f, endTime: et };
                              if (f.startTime && et) {
                                const [sh, sm] = f.startTime.split(":").map(Number);
                                const [eh, em] = et.split(":").map(Number);
                                const diff = (eh * 60 + em - sh * 60 - sm) / 60;
                                updated.durationHours = diff > 0 ? Math.round(diff * 100) / 100 : 0;
                              }
                              return updated;
                            });
                          }} className="bg-background/50 border-border/40" />
                        </div>
                      </div>
                      {clinicalForm.durationHours > 0 && (
                        <p className="text-sm text-gold font-medium">Duração: {clinicalForm.durationHours}h</p>
                      )}
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Procedimentos</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {["Toxina Botulinica", "Preenchedores", "Bioestimuladores", "Fios de PDO", "Skinbooster", "Microagulhamento", "Ultrassom", "i-PRF", "PDRN", "Exossomos", "Outro"].map(proc => (
                            <label key={proc} className="flex items-center gap-2 text-sm cursor-pointer">
                              <Checkbox
                                checked={clinicalForm.procedures.includes(proc)}
                                onCheckedChange={(checked) => {
                                  setClinicalForm(f => ({
                                    ...f,
                                    procedures: checked ? [...f.procedures, proc] : f.procedures.filter(p => p !== proc)
                                  }));
                                }}
                              />
                              {proc}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pacientes atendidos</Label>
                        <Textarea value={(clinicalForm.patientsDetails || []).join('\n')} onChange={e => { const names = e.target.value.split('\n'); setClinicalForm(f => ({ ...f, patientsDetails: names, patientsCount: names.filter(n => n.trim()).length })); }} placeholder="Nome de cada paciente (um por linha)" rows={3} className="bg-background/50 border-border/40 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Detalhes dos pacientes</Label>
                        <Textarea
                          value={clinicalForm.patientsDetails.join("\n")}
                          onChange={e => setClinicalForm(f => ({ ...f, patientsDetails: e.target.value.split("\n").filter(l => l.trim() !== "") }))}
                          placeholder="Um detalhe por linha..."
                          className="bg-background/50 border-border/40"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Observações</Label>
                        <Textarea value={clinicalForm.notes} onChange={e => setClinicalForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas sobre a sessão..." className="bg-background/50 border-border/40" rows={2} />
                      </div>
                      <Button
                        className="w-full bg-gold text-background hover:bg-gold/90 font-medium"
                        disabled={!clinicalForm.studentId || !clinicalForm.sessionDate || clinicalForm.durationHours <= 0 || clinicalForm.procedures.length === 0 || clinicalLoading}
                        onClick={async () => {
                          setClinicalLoading(true);
                          try {
                            await apiRequest("POST", "/api/admin/clinical-sessions", {
                              ...clinicalForm,
                              patientsCount: clinicalForm.patientsCount,
                              patientsDetails: clinicalForm.patientsDetails,
                            });
                            queryClient.invalidateQueries({ queryKey: ["/api/admin/clinical-sessions"] });
                            queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
                            setClinicalDialogOpen(false);
                            setClinicalForm({ studentId: 0, sessionDate: "", startTime: "", endTime: "", durationHours: 0, procedures: [], notes: "", patientsCount: 0, patientsDetails: [] });
                            toast({ title: "Sessão registrada com sucesso!" });
                          } catch (err: any) {
                            toast({ title: "Erro ao registrar sessão", description: err.message, variant: "destructive" });
                          } finally {
                            setClinicalLoading(false);
                          }
                        }}
                      >
                        {clinicalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Registrar Sessão
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {clinicalSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma sessão clínica registrada ainda.</p>
              ) : (
                <div className="space-y-2">
                  {clinicalSessions.slice(0, 20).map(session => {
                    const adminSigned = !!session.adminSignedAt;
                    const studentSigned = !!session.studentSignedAt;
                    const statusLabel = adminSigned && studentSigned
                      ? "Concluida"
                      : adminSigned && !studentSigned
                        ? "Aguardando aluno"
                        : !adminSigned && studentSigned
                          ? "Aguardando orientador"
                          : "Pendente";
                    const statusClass = adminSigned && studentSigned
                      ? "bg-green-500/20 text-green-400 border-0"
                      : adminSigned && !studentSigned
                        ? "bg-amber-500/20 text-amber-400 border-0"
                        : !adminSigned && studentSigned
                          ? "bg-blue-500/20 text-blue-400 border-0"
                          : "bg-muted/30 text-muted-foreground border-0";
                    return (
                      <Card key={session.id} className="bg-card/50 border-border/20">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <Stethoscope className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{session.studentName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(session.sessionDate).toLocaleDateString("pt-BR")} · {session.startTime}-{session.endTime}
                                </p>
                                {(session.patientsCount !== undefined && session.patientsCount > 0) && (
                                  <p className="text-xs text-muted-foreground mt-0.5">Pacientes: {session.patientsCount}</p>
                                )}
                                <div className="flex gap-2 mt-1">
                                  {session.adminSignedAt && (
                                    <span className="text-[10px] text-muted-foreground">Orientador: {new Date(session.adminSignedAt).toLocaleDateString("pt-BR")}</span>
                                  )}
                                  {session.studentSignedAt && (
                                    <span className="text-[10px] text-muted-foreground">Aluno: {new Date(session.studentSignedAt).toLocaleDateString("pt-BR")}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <div className="flex items-center gap-1 flex-wrap justify-end">
                                {session.procedures.slice(0, 2).map(p => (
                                  <Badge key={p} variant="outline" className="text-[10px] border-gold/30 text-gold">{p}</Badge>
                                ))}
                                {session.procedures.length > 2 && (
                                  <Badge variant="outline" className="text-[10px] border-gold/20 text-muted-foreground">+{session.procedures.length - 2}</Badge>
                                )}
                                <Badge className="bg-gold/20 text-gold border-0">{session.durationHours}h</Badge>
                              </div>
                              <Badge className={statusClass}>{statusLabel}</Badge>
                              {!adminSigned && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-gold/40 text-gold hover:bg-gold/10"
                                  onClick={() => handleAdminSign(session.id)}
                                >
                                  <PenLine className="w-3 h-3 mr-1" /> Assinar
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ========== CONTRACTS SECTION ========== */}
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><FileSignature className="w-5 h-5 text-gold" /> Contratos Recentes</h3>
              {contracts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum contrato gerado ainda.</p>
              ) : (
                <div className="space-y-2">
                  {contracts.slice(0, 30).map(contract => (
                    <Card key={contract.id} className="bg-card/50 border-border/20">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileSignature className="w-4 h-4 text-gold shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{contract.userName}</p>
                              <p className="text-xs text-muted-foreground">{contract.planName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {contract.contractGroup && (
                              <Badge variant="outline" className="text-[10px] border-gold/30 text-gold">
                                {contract.contractGroup === "digital" ? "Digital" : contract.contractGroup === "observacao" ? "Observação" : contract.contractGroup === "vip" ? "VIP" : contract.contractGroup === "horas" ? "Horas" : contract.contractGroup}
                              </Badge>
                            )}
                            <Badge variant="outline" className={contract.status === "accepted" ? "border-emerald-500/30 text-emerald-400" : contract.status === "active" ? "border-green-500/30 text-green-400" : "border-yellow-500/30 text-yellow-400"}>
                              {contract.status === "accepted" ? "Aceito" : contract.status === "active" ? "Ativo" : contract.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">R$ {(contract.amountPaid / 100).toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">{new Date(contract.createdAt).toLocaleDateString("pt-BR")}</span>
                            {contract.contractHtml && (
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-gold hover:text-gold/80" onClick={() => setViewContractHtml(contract.contractHtml)}>
                                Ver contrato
                              </Button>
                            )}
                          </div>
                        </div>
                        {contract.acceptedAt && (
                          <p className="text-[11px] text-muted-foreground mt-1 ml-7">
                            Aceito em {new Date(contract.acceptedAt).toLocaleString("pt-BR")} · IP: {contract.acceptedIp || "—"}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Contract HTML viewer modal */}
            <Dialog open={!!viewContractHtml} onOpenChange={(open) => !open && setViewContractHtml(null)}>
              <DialogContent className="bg-card border-border/40 max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Contrato</DialogTitle>
                  <DialogDescription>Visualização do contrato aceito pelo aluno</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto rounded-lg bg-white p-1">
                  <div dangerouslySetInnerHTML={{ __html: viewContractHtml || "" }} />
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ========== PROFILES TAB ========== */}
          <TabsContent value="profiles" className="space-y-6 mt-0">
            {(() => {
              // Profile grouping definitions
              const profileGroups: { key: string; label: string; match: (s: SafeUser) => boolean }[] = [
                { key: "trial", label: "Trial", match: (s) => !s.planKey || s.role === "student" && !s.planPaidAt },
                { key: "modulo_avulso", label: "Modulo Avulso", match: (s) => s.planKey === "modulo_avulso" },
                { key: "pacote_completo", label: "Pacote Completo", match: (s) => s.planKey === "pacote_completo" },
                { key: "observador", label: "Observador (Essencial/Avancado/Intensivo)", match: (s) => s.planKey === "observador_essencial" || s.planKey === "observador_avancado" || s.planKey === "observador_intensivo" },
                { key: "imersao", label: "Imersao", match: (s) => s.planKey === "imersao" },
                { key: "vip", label: "VIP (Online/Presencial/Completo)", match: (s) => s.planKey === "vip_online" || s.planKey === "vip_presencial" || s.planKey === "vip_completo" },
                { key: "horas_clinicas", label: "Horas Clinicas", match: (s) => !!s.planKey && s.planKey.startsWith("horas_clinicas") },
              ];

              // Only students (not admins)
              const studentList = students.filter(s => s.role === "student");

              // Build grouped data
              const grouped = profileGroups.map(pg => {
                const groupStudents = studentList.filter(pg.match);
                const totalRevenue = groupStudents.reduce((sum, s) => sum + (s.planAmountPaid || 0), 0);
                return { ...pg, students: groupStudents, totalRevenue };
              });

              // Credit balance lookup
              const creditMap = new Map<number, number>();
              creditBalances.forEach(b => creditMap.set(b.userId, b.balance));

              const now = Date.now();
              const formatBRL = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

              return (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {grouped.map(g => (
                      <Card key={g.key} className="border-border/30 bg-card/40 cursor-pointer hover:border-gold/30 transition-colors" onClick={() => setExpandedProfile(expandedProfile === g.key ? null : g.key)}>
                        <CardContent className="p-4 space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{g.label}</p>
                          <p className="text-2xl font-bold text-foreground">{g.students.length}</p>
                          <p className="text-xs text-gold">{formatBRL(g.totalRevenue)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Expandable sections */}
                  <div className="space-y-3">
                    {grouped.map(g => (
                      <Card key={g.key} className="border-border/30 bg-card/40">
                        <CardContent className="p-0">
                          <button
                            className="w-full flex items-center justify-between p-4 text-left hover:bg-card/60 transition-colors"
                            onClick={() => setExpandedProfile(expandedProfile === g.key ? null : g.key)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                                <Users className="w-4 h-4 text-gold" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{g.label}</p>
                                <p className="text-xs text-muted-foreground">{g.students.length} aluno{g.students.length !== 1 ? 's' : ''} &middot; {formatBRL(g.totalRevenue)} receita</p>
                              </div>
                            </div>
                            {expandedProfile === g.key ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </button>
                          {expandedProfile === g.key && (
                            <div className="border-t border-border/20 px-4 pb-4">
                              {g.students.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-6 text-center">Nenhum aluno neste perfil</p>
                              ) : (
                                <div className="overflow-x-auto mt-3">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-border/20">
                                        <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome</th>
                                        <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Email</th>
                                        <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                                        <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Dias rest.</th>
                                        <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Horas clin.</th>
                                        <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Creditos</th>
                                        <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Inicio</th>
                                        <th className="py-2 px-2 text-center text-xs hidden xl:table-cell">Ultimo login</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {g.students.map(s => {
                                        const isActive = s.accessExpiresAt ? new Date(s.accessExpiresAt).getTime() > now : false;
                                        const isTrial = !s.planPaidAt && !s.planKey;
                                        const daysLeft = s.accessExpiresAt ? Math.max(0, Math.ceil((new Date(s.accessExpiresAt).getTime() - now) / 86400000)) : 0;
                                        const creditBal = creditMap.get(s.id) || 0;
                                        const startDate = s.planPaidAt || s.createdAt;
                                        return (
                                          <tr key={s.id} className="border-b border-border/10 hover:bg-card/30">
                                            <td className="py-2 px-2 text-foreground font-medium truncate max-w-[150px]">{s.name}</td>
                                            <td className="py-2 px-2 text-muted-foreground truncate max-w-[180px] hidden sm:table-cell">{s.email}</td>
                                            <td className="py-2 px-2 text-center">
                                              {isTrial ? (
                                                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">Trial</Badge>
                                              ) : isActive ? (
                                                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Ativo</Badge>
                                              ) : (
                                                <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">Expirado</Badge>
                                              )}
                                            </td>
                                            <td className="py-2 px-2 text-center text-muted-foreground hidden md:table-cell">{isActive ? `${daysLeft}d` : '-'}</td>
                                            <td className="py-2 px-2 text-center hidden lg:table-cell">
                                              <span className={s.clinicalPracticeHours > 0 ? 'text-foreground' : 'text-muted-foreground/50'}>{s.clinicalPracticeHours || 0}h</span>
                                            </td>
                                            <td className="py-2 px-2 text-right hidden md:table-cell">
                                              <span className={creditBal > 0 ? 'text-emerald-400' : 'text-muted-foreground/50'}>{creditBal > 0 ? formatBRL(creditBal) : '-'}</span>
                                            </td>
                                            <td className="py-2 px-2 text-right text-muted-foreground text-xs hidden lg:table-cell">
                                              {startDate ? new Date(startDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : '-'}
                                            </td>
                                            <td className="py-2 px-2 text-center text-xs hidden xl:table-cell">
                                              {(s as any).lastLoginAt ? (
                                                <span className="text-foreground">{new Date((s as any).lastLoginAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                                              ) : (
                                                <span className="text-muted-foreground/40">nunca</span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              );
            })()}
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

          {/* ========== CREDITS TAB ========== */}
          <TabsContent value="credits" className="space-y-6 mt-0">
            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-border/30 bg-card/40">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total pendente</p>
                  <p className="text-2xl font-bold text-gold mt-1">{(totalCreditOutstanding / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                </CardContent>
              </Card>
              <Card className="border-border/30 bg-card/40">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Usuarios com saldo</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{creditBalances.filter(b => b.balance > 0).length}</p>
                </CardContent>
              </Card>
              <Card className="border-border/30 bg-card/40">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Transacoes</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{creditTransactions.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Bonus dialog + Balances table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">Saldos por usuario</h3>
                <Dialog open={bonusDialogOpen} onOpenChange={setBonusDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 text-xs border-gold/30 text-gold hover:bg-gold/10">
                      <Gift className="w-3.5 h-3.5 mr-1.5" /> Dar b\u00f4nus
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border/40 max-w-md">
                    <DialogHeader>
                      <DialogTitle>Bonifica\u00e7\u00e3o de Cr\u00e9ditos</DialogTitle>
                      <DialogDescription>Credite um valor na carteira de um aluno como bonifica\u00e7\u00e3o especial.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Aluno</label>
                        <select
                          value={bonusUserId}
                          onChange={(e) => setBonusUserId(e.target.value)}
                          className="w-full mt-1 rounded-lg border border-border/40 bg-background/50 px-3 py-2 text-sm"
                        >
                          <option value="">Selecione um aluno...</option>
                          {students.filter(s => s.role !== 'admin' && s.role !== 'super_admin').map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Valor (R$)</label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Ex: 100"
                          value={bonusAmount}
                          onChange={(e) => setBonusAmount(e.target.value)}
                          className="mt-1 bg-background/50 border-border/40"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Motivo</label>
                        <Input
                          placeholder="Ex: Bonifica\u00e7\u00e3o HOF Meeting"
                          value={bonusDesc}
                          onChange={(e) => setBonusDesc(e.target.value)}
                          className="mt-1 bg-background/50 border-border/40"
                        />
                      </div>
                      <Button
                        className="w-full bg-gold hover:bg-gold/90 text-background font-semibold"
                        disabled={!bonusUserId || !bonusAmount || bonusLoading}
                        onClick={async () => {
                          setBonusLoading(true);
                          try {
                            const res = await apiRequest("POST", "/api/admin/credits/bonus", {
                              userId: Number(bonusUserId),
                              amount: Math.round(Number(bonusAmount) * 100),
                              description: bonusDesc || "Bonifica\u00e7\u00e3o especial",
                            });
                            const data = await res.json();
                            if (data.success) {
                              setBonusDialogOpen(false);
                              setBonusUserId(""); setBonusAmount(""); setBonusDesc("");
                              queryClient.invalidateQueries({ queryKey: ["/api/admin/credits"] });
                            }
                          } catch (e) { console.error(e); }
                          setBonusLoading(false);
                        }}
                      >
                        {bonusLoading ? "Creditando..." : "Creditar b\u00f4nus"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {creditBalances.length === 0 ? (
                <Card className="border-border/30 bg-card/40"><CardContent className="p-12 text-center"><Coins className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">Nenhum credito registrado</p></CardContent></Card>
              ) : (
                <div className="space-y-1">
                  {creditBalances
                    .filter(b => creditPlanFilter === "all" || b.planKey === creditPlanFilter)
                    .map(b => (
                    <Card key={b.userId} className="border-border/25 bg-card/40">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{b.userName || 'ID ' + b.userId}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground truncate">{b.userEmail}</p>
                            {b.planKey && (
                              <Badge variant="outline" className="text-[9px] px-1 border-border/30 text-muted-foreground shrink-0">
                                {b.planKey.replace(/_/g, ' ')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className={`shrink-0 ${b.balance > 0 ? 'text-emerald-400 border-emerald-500/30' : 'text-orange-400 border-orange-500/30'}`}>
                          {(b.balance / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Transactions table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">Transacoes</h3>
                <div className="flex gap-2 flex-wrap">
                  <Select value={creditFilter} onValueChange={setCreditFilter}>
                    <SelectTrigger className="bg-background/50 border-border/40 w-32 h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="cashback">Cashback</SelectItem>
                      <SelectItem value="referral">Indicacao</SelectItem>
                      <SelectItem value="usage">Uso</SelectItem>
                      <SelectItem value="adjustment">Ajuste</SelectItem>
                      <SelectItem value="bonus">Bonificacao</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={creditPlanFilter} onValueChange={setCreditPlanFilter}>
                    <SelectTrigger className="bg-background/50 border-border/40 w-40 h-8 text-xs"><SelectValue placeholder="Plano" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os planos</SelectItem>
                      <SelectItem value="modulo_avulso">Modulo Avulso</SelectItem>
                      <SelectItem value="pacote_completo">Pacote Completo</SelectItem>
                      <SelectItem value="observador_essencial">Obs. Essencial</SelectItem>
                      <SelectItem value="observador_avancado">Obs. Avancado</SelectItem>
                      <SelectItem value="observador_intensivo">Obs. Intensivo</SelectItem>
                      <SelectItem value="imersao">Imersao</SelectItem>
                      <SelectItem value="vip_online">VIP Online</SelectItem>
                      <SelectItem value="vip_presencial">VIP Presencial</SelectItem>
                      <SelectItem value="vip_completo">VIP Completo</SelectItem>
                      <SelectItem value="horas_clinicas">Horas Clinicas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={creditPeriod} onValueChange={setCreditPeriod}>
                    <SelectTrigger className="bg-background/50 border-border/40 w-32 h-8 text-xs"><SelectValue placeholder="Periodo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todo periodo</SelectItem>
                      <SelectItem value="7d">Ultimos 7 dias</SelectItem>
                      <SelectItem value="30d">Ultimos 30 dias</SelectItem>
                      <SelectItem value="90d">Ultimos 90 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(() => {
                let filtered = creditTransactions;
                if (creditFilter !== "all") filtered = filtered.filter(t => t.type === creditFilter);
                if (creditPlanFilter !== "all") filtered = filtered.filter(t => t.planKey === creditPlanFilter);
                if (creditPeriod !== "all") {
                  const days = creditPeriod === "7d" ? 7 : creditPeriod === "30d" ? 30 : 90;
                  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
                  filtered = filtered.filter(t => t.createdAt >= cutoff);
                }
                if (filtered.length === 0) return (
                  <Card className="border-border/30 bg-card/40"><CardContent className="p-12 text-center"><p className="text-sm text-muted-foreground">Nenhuma transacao encontrada</p></CardContent></Card>
                );
                return (
                  <div className="space-y-1">
                    {filtered.slice(0, 100).map(tx => (
                      <Card key={tx.id} className="border-border/25 bg-card/40">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${tx.amount > 0 ? 'bg-emerald-500/10' : 'bg-orange-500/10'}`}>
                            <Coins className={`w-3.5 h-3.5 ${tx.amount > 0 ? 'text-emerald-400' : 'text-orange-400'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground truncate">{tx.userName || 'ID ' + tx.userId}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 border-border/30 text-muted-foreground shrink-0">
                                {tx.type}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{tx.description}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-sm font-semibold ${tx.amount > 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                              {tx.amount > 0 ? '+' : ''}{(tx.amount / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </span>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })()}
            </div>
          </TabsContent>

          {/* ========== LEADS TRIAL TAB ========== */}
          <TabsContent value="leads" className="space-y-6 mt-0">
            <LeadsTab
              trialStudents={trialStudents}
              onConvert={(id) => approveMutation.mutate({ id })}
              onEdit={(s) => openEditStudent(s)}
            />
          </TabsContent>

          {/* ========== COMMUNITY TAB ========== */}
          <TabsContent value="community" className="space-y-6 mt-0">
            <CommunityAdminTab />
          </TabsContent>

          {/* ========== PRACTICES TAB ========== */}
          <TabsContent value="practices" className="space-y-6 mt-0">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Total Sessoes",
                  value: clinicalSessions.length,
                  icon: Stethoscope,
                  color: "text-gold",
                  bg: "bg-gold/10",
                },
                {
                  label: "Este Mes",
                  value: clinicalSessions.filter(s => {
                    const d = new Date(s.sessionDate);
                    const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  }).length,
                  icon: Calendar,
                  color: "text-blue-400",
                  bg: "bg-blue-500/10",
                },
                {
                  label: "Alunos c/ Pratica",
                  value: students.filter(s => (s as any).clinicalPracticeAccess && (s as any).clinicalPracticeHours > 0).length,
                  icon: Users,
                  color: "text-emerald-400",
                  bg: "bg-emerald-500/10",
                },
              ].map((stat) => (
                <Card key={stat.label} className="border-border/30 bg-card/50">
                  <CardContent className="p-3 sm:p-4">
                    <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}>
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                    <p className="text-lg sm:text-xl font-semibold text-foreground">{stat.value}</p>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-brand mt-0.5">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* New session button */}
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">
                Sessoes Clinicas ({clinicalSessions.length})
              </h3>
              <Dialog open={clinicalDialogOpen} onOpenChange={setClinicalDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-medium">
                    <Plus className="w-4 h-4 mr-1.5" /> Nova Sessao
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border/40 max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Registrar Sessao Clinica</DialogTitle>
                    <DialogDescription>Selecione o aluno e preencha os dados da sessao.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Aluno</Label>
                      <Select value={clinicalForm.studentId ? String(clinicalForm.studentId) : ""} onValueChange={(v) => setClinicalForm(f => ({ ...f, studentId: parseInt(v) }))}>
                        <SelectTrigger className="bg-background/50 border-border/40"><SelectValue placeholder="Selecione o aluno..." /></SelectTrigger>
                        <SelectContent>
                          {students.filter(s => s.role === "student" && (s as any).clinicalPracticeHours > 0).map(s => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name} — {(s as any).clinicalPracticeHours}h restantes</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Data</Label>
                        <Input type="date" value={clinicalForm.sessionDate} onChange={e => setClinicalForm(f => ({ ...f, sessionDate: e.target.value }))} className="bg-background/50 border-border/40" />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Inicio</Label>
                        <Input type="time" value={clinicalForm.startTime} onChange={e => {
                          const st = e.target.value;
                          setClinicalForm(f => {
                            const updated = { ...f, startTime: st };
                            if (st && f.endTime) {
                              const [sh, sm] = st.split(":").map(Number);
                              const [eh, em] = f.endTime.split(":").map(Number);
                              const diff = (eh * 60 + em - sh * 60 - sm) / 60;
                              updated.durationHours = diff > 0 ? Math.round(diff * 100) / 100 : 0;
                            }
                            return updated;
                          });
                        }} className="bg-background/50 border-border/40" />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fim</Label>
                        <Input type="time" value={clinicalForm.endTime} onChange={e => {
                          const et = e.target.value;
                          setClinicalForm(f => {
                            const updated = { ...f, endTime: et };
                            if (f.startTime && et) {
                              const [sh, sm] = f.startTime.split(":").map(Number);
                              const [eh, em] = et.split(":").map(Number);
                              const diff = (eh * 60 + em - sh * 60 - sm) / 60;
                              updated.durationHours = diff > 0 ? Math.round(diff * 100) / 100 : 0;
                            }
                            return updated;
                          });
                        }} className="bg-background/50 border-border/40" />
                      </div>
                    </div>
                    {clinicalForm.durationHours > 0 && (
                      <p className="text-sm text-gold font-medium">Duracao: {clinicalForm.durationHours}h</p>
                    )}
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Procedimentos</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {["Toxina Botulinica", "Preenchedores", "Bioestimuladores", "Fios de PDO", "Skinbooster", "Microagulhamento", "Ultrassom", "i-PRF", "PDRN", "Exossomos", "Outro"].map(proc => (
                          <label key={proc} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={clinicalForm.procedures.includes(proc)}
                              onCheckedChange={(checked) => {
                                setClinicalForm(f => ({
                                  ...f,
                                  procedures: checked ? [...f.procedures, proc] : f.procedures.filter(p => p !== proc)
                                }));
                              }}
                            />
                            {proc}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pacientes atendidos</Label>
                      <Textarea value={(clinicalForm.patientsDetails || []).join('\n')} onChange={e => { const names = e.target.value.split('\n'); setClinicalForm(f => ({ ...f, patientsDetails: names, patientsCount: names.filter(n => n.trim()).length })); }} placeholder="Nome de cada paciente (um por linha)" rows={3} className="bg-background/50 border-border/40 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Observacoes</Label>
                      <Textarea value={clinicalForm.notes} onChange={e => setClinicalForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas sobre a sessao..." className="bg-background/50 border-border/40" rows={2} />
                    </div>
                    <Button
                      className="w-full bg-gold text-background hover:bg-gold/90 font-medium"
                      disabled={!clinicalForm.studentId || !clinicalForm.sessionDate || clinicalForm.durationHours <= 0 || clinicalForm.procedures.length === 0 || clinicalLoading}
                      onClick={async () => {
                        setClinicalLoading(true);
                        try {
                          await apiRequest("POST", "/api/admin/clinical-sessions", {
                            ...clinicalForm,
                            patientsCount: clinicalForm.patientsCount,
                            patientsDetails: clinicalForm.patientsDetails,
                          });
                          queryClient.invalidateQueries({ queryKey: ["/api/admin/clinical-sessions"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
                          setClinicalDialogOpen(false);
                          setClinicalForm({ studentId: 0, sessionDate: "", startTime: "", endTime: "", durationHours: 0, procedures: [], notes: "", patientsCount: 0, patientsDetails: [] });
                          toast({ title: "Sessao registrada com sucesso!" });
                        } catch (err: any) {
                          toast({ title: "Erro ao registrar sessao", description: err.message, variant: "destructive" });
                        } finally {
                          setClinicalLoading(false);
                        }
                      }}
                    >
                      {clinicalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Registrar Sessao
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Session list */}
            {clinicalSessions.length === 0 ? (
              <Card className="border-border/30 bg-card/40">
                <CardContent className="p-12 text-center">
                  <div className="w-14 h-14 rounded-xl bg-card/80 flex items-center justify-center mx-auto mb-4">
                    <Stethoscope className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">Nenhuma sessao clinica registrada ainda.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Nova Sessao" para registrar a primeira.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {clinicalSessions.map(session => {
                  const adminSigned = !!session.adminSignedAt;
                  const studentSigned = !!session.studentSignedAt;
                  const statusLabel = adminSigned && studentSigned
                    ? "Concluida"
                    : adminSigned && !studentSigned
                      ? "Aguardando aluno"
                      : !adminSigned && studentSigned
                        ? "Aguardando orientador"
                        : "Pendente";
                  const statusClass = adminSigned && studentSigned
                    ? "bg-green-500/20 text-green-400 border-0"
                    : adminSigned && !studentSigned
                      ? "bg-amber-500/20 text-amber-400 border-0"
                      : !adminSigned && studentSigned
                        ? "bg-blue-500/20 text-blue-400 border-0"
                        : "bg-muted/30 text-muted-foreground border-0";
                  return (
                    <Card key={session.id} className="bg-card/50 border-border/20 hover:bg-card/70 transition-colors">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                              <Stethoscope className="w-4 h-4 text-gold" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">{session.studentName}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(session.sessionDate).toLocaleDateString("pt-BR")} · {session.startTime}–{session.endTime} · {session.durationHours}h
                              </p>
                              {session.notes && (
                                <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">{session.notes}</p>
                              )}
                              {(session.patientsCount !== undefined && session.patientsCount > 0) && (
                                <p className="text-xs text-muted-foreground mt-0.5">{session.patientsCount} paciente{session.patientsCount !== 1 ? "s" : ""}</p>
                              )}
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {session.procedures.slice(0, 3).map(p => (
                                  <Badge key={p} variant="outline" className="text-[10px] border-gold/30 text-gold px-1.5">{p}</Badge>
                                ))}
                                {session.procedures.length > 3 && (
                                  <Badge variant="outline" className="text-[10px] border-border/30 text-muted-foreground px-1.5">+{session.procedures.length - 3}</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <Badge className={statusClass}>{statusLabel}</Badge>
                            <div className="text-right space-y-0.5">
                              {session.adminSignedAt && (
                                <p className="text-[10px] text-muted-foreground">Orientador: {new Date(session.adminSignedAt).toLocaleDateString("pt-BR")}</p>
                              )}
                              {session.studentSignedAt && (
                                <p className="text-[10px] text-muted-foreground">Aluno: {new Date(session.studentSignedAt).toLocaleDateString("pt-BR")}</p>
                              )}
                            </div>
                            {!adminSigned && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-gold/40 text-gold hover:bg-gold/10"
                                onClick={() => handleAdminSign(session.id)}
                              >
                                <PenLine className="w-3 h-3 mr-1" /> Assinar
                              </Button>
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
                  const phone = student.phone ? stripPhone(student.phone) : null;
                  const waLink = phone ? `https://wa.me/${phone}` : null;
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
                                <span>{formatPhoneDisplay(student.phone)}</span>
                              </div>
                            )}
                            {(student as any).instagram && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Instagram className="w-3 h-3 shrink-0" />
                                <span>@{(student as any).instagram}</span>
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
                              onClick={() => openEditStudent(student)}
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
                      <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Phone className="w-3 h-3" /> Telefone (opcional)</Label><Input type="tel" value={formatPhoneDisplay(adminForm.phone)} onChange={e => { const { raw } = handlePhoneInput(e.target.value); setAdminForm(f => ({ ...f, phone: raw })); }} placeholder="+55 (21) 99999-9999" className="bg-background/50 border-border/40" /></div>
                      <div className="rounded-md bg-gold/5 border border-gold/20 p-3 text-xs text-muted-foreground space-y-1">
                        <p className="font-medium text-gold">Permissões do admin secundário:</p>
                        <p>- Gerenciar alunos (converter, editar, renovar)</p>
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
                          {admin.phone && <p className="text-xs text-muted-foreground mt-0.5">{formatPhoneDisplay(admin.phone)}</p>}
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
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-brand">Histórico de ações ({consolidatedLogs.length})</h3>
                <div className="flex items-center gap-2">
                  <Select value={logFilterGroup} onValueChange={(v) => { setLogFilterGroup(v); setLogFilterAction("all"); }}>
                    <SelectTrigger className="bg-background/50 border-border/40 w-36 h-8 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="stripe">Eventos Stripe</SelectItem>
                      <SelectItem value="creditos">Creditos</SelectItem>
                      <SelectItem value="alunos">Gestao de alunos</SelectItem>
                      <SelectItem value="conteudo">Conteudo</SelectItem>
                      <SelectItem value="logins">Logins</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={logFilterAction} onValueChange={setLogFilterAction}>
                    <SelectTrigger className="bg-background/50 border-border/40 w-40 h-8 text-xs"><SelectValue placeholder="Acao" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as acoes</SelectItem>
                      {uniqueActions.map(a => <SelectItem key={a} value={a}>{actionLabels[a] || a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={logFilterStudent} onValueChange={setLogFilterStudent}>
                    <SelectTrigger className="bg-background/50 border-border/40 w-44 h-8 text-xs"><SelectValue placeholder="Aluno" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os alunos</SelectItem>
                      {uniqueTargets.map(([id, name]) => <SelectItem key={id} value={String(id)}>{name as string}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={logFilterAdmin} onValueChange={setLogFilterAdmin}>
                    <SelectTrigger className="bg-background/50 border-border/40 w-40 h-8 text-xs"><SelectValue placeholder="Origem" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as origens</SelectItem>
                      {uniqueAdmins.map(([id, name]) => <SelectItem key={id} value={String(id)}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {consolidatedLogs.length === 0 ? (
                <Card className="border-border/30 bg-card/40"><CardContent className="p-12 text-center"><div className="w-14 h-14 rounded-xl bg-card/80 flex items-center justify-center mx-auto mb-4"><History className="w-7 h-7 text-muted-foreground/40" /></div><p className="text-sm text-muted-foreground">Nenhuma ação registrada</p></CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {consolidatedLogs.map((log) => (
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
                                  {(log.repeatCount || 0) > 1 && (
                                    <Badge variant="secondary" className="ml-2 text-[10px] bg-gold/15 text-gold border-0 px-1.5 py-0">{log.repeatCount}x</Badge>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {log.action === "student_login"
                                    ? <><span className="text-foreground font-medium">{log.targetName || log.adminName}</span></>
                                    : <>por <span className="text-foreground font-medium">{log.adminName}</span>
                                      {log.targetName && <> em <span className="text-foreground">{log.targetName}</span></>}</>
                                  }
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {new Date(log.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            {log.details && (() => {
                              try {
                                const details = JSON.parse(log.details);
                                const entries = Object.entries(details).slice(0, 6);
                                if (entries.length === 0) return null;
                                return (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {entries.map(([k, v]) => (
                                      <Badge key={k} variant="outline" className="text-[10px] border-border/30 text-muted-foreground px-1.5">
                                        {detailKeyLabels[k] || k}: {formatDetailValue(k, v)}
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

        {/* Historico de Atividades */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Historico de Atividades</h3>
            <div className="flex gap-1">
              <button
                onClick={() => setActivityTab("alunos")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activityTab === "alunos" ? "bg-gold/20 text-gold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Atividade Alunos
              </button>
              <button
                onClick={() => setActivityTab("admin")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activityTab === "admin" ? "bg-gold/20 text-gold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Acoes Admin
              </button>
            </div>
          </div>
          
          {activityTab === "alunos" && (
            <div className="space-y-2">
              {(activityData?.studentActivity || []).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-card/40 border border-border/20">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-emerald-400">{s.name?.[0]?.toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground">{s.email} - {s.plan_key?.replace(/_/g, " ") || s.role}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-foreground">
                      {s.last_login_at ? new Date(s.last_login_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "nunca"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{s.login_count || 0} logins</p>
                  </div>
                </div>
              ))}
              {(!activityData?.studentActivity || activityData.studentActivity.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum login de aluno registrado ainda</p>
              )}
            </div>
          )}
          
          {activityTab === "admin" && (
            <div className="space-y-2">
              {(activityData?.adminActions || []).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-card/40 border border-border/20">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{actionLabels[a.action] || a.action?.replace(/_/g, " ")}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{a.details || "-"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {a.created_at ? new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-"}
                    </p>
                    <p className="text-[10px] text-gold/70">{a.actor_name}</p>
                  </div>
                </div>
              ))}
              {(!activityData?.adminActions || activityData.adminActions.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma acao admin registrada</p>
              )}
            </div>
          )}
        </div>

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
            <DialogTitle>{approvingStudent?.role === "trial" ? "Converter para pacote pago" : "Converter aluno"}</DialogTitle>
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
                {"Converter"}
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
// deploy-trigger: 1775874863
