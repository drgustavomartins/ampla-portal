import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Users, Zap, Trophy, TrendingUp, Pencil, Trash2, Clock, Loader2, AlertTriangle } from "lucide-react";
import { FunnelTab } from "./FunnelTab";
import { QuizLeadsTab } from "./QuizLeadsTab";

type LeadsSubTab = "trial" | "quiz" | "funil";

// ─── Trial Leads ──────────────────────────────────────────────────────────────
function TrialLeadsSection({ trialStudents, onConvert, onEdit }: {
  trialStudents: any[];
  onConvert: (id: number) => void;
  onEdit: (student: any) => void;
}) {
  const { toast } = useToast();

  // Retorna número de dias restantes, ou null se o acesso for vitalício (sem expiração).
  const getDaysLeft = (expiresAt: string | null | undefined): number | null => {
    if (!expiresAt) return null;
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
  };

  const extendMutation = useMutation({
    mutationFn: async ({ id, days }: { id: number; days: number }) => {
      await apiRequest("PUT", `/api/admin/students/${id}/extend-trial`, { days });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students/trial"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      toast({ title: "Trial estendido com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao estender trial", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/students/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students/trial"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students/pending"] });
      toast({ title: "Aluno excluido" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir aluno", variant: "destructive" });
    },
  });

  // Detect duplicates by email
  const emailCounts = new Map<string, number>();
  trialStudents.forEach((s: any) => {
    const e = (s.email || "").toLowerCase().trim();
    emailCounts.set(e, (emailCounts.get(e) || 0) + 1);
  });
  const duplicateEmails = new Set<string>();
  emailCounts.forEach((count, email) => { if (count > 1) duplicateEmails.add(email); });
  const hasDuplicates = duplicateEmails.size > 0;
  const duplicateStudentIds = trialStudents
    .filter((s: any) => duplicateEmails.has((s.email || "").toLowerCase().trim()))
    .sort((a: any, b: any) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
    .filter((_: any, i: number, arr: any[]) => {
      // Keep only the older duplicates (not the latest per email)
      const email = (_.email || "").toLowerCase().trim();
      const sameEmail = arr.filter((s: any) => (s.email || "").toLowerCase().trim() === email);
      return _ !== sameEmail[sameEmail.length - 1];
    })
    .map((s: any) => s.id);

  const deleteDuplicatesMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      for (const id of ids) {
        await apiRequest("DELETE", `/api/admin/students/${id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students/trial"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      toast({ title: "Duplicados removidos" });
    },
    onError: () => {
      toast({ title: "Erro ao remover duplicados", variant: "destructive" });
    },
  });

  if (trialStudents.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground">ALUNOS EM TRIAL (0)</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Alunos com cadastro gratuito (acesso por tempo indeterminado, primeiras aulas)</p>
        </div>
        <div className="rounded-xl border border-border/30 bg-card/40 py-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhum lead em trial no momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">Alunos em Trial ({trialStudents.length})</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Alunos com cadastro gratuito (acesso por tempo indeterminado, primeiras aulas)</p>
        </div>
        {hasDuplicates && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 gap-1.5 text-xs"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Excluir duplicados ({duplicateStudentIds.length})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border/40">
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir registros duplicados</AlertDialogTitle>
                <AlertDialogDescription>
                  Foram encontrados {duplicateStudentIds.length} registros duplicados (mesmo email).
                  Serao removidos os mais antigos, mantendo o mais recente de cada email.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border/40">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteDuplicatesMutation.mutate(duplicateStudentIds)}
                >
                  {deleteDuplicatesMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                  Excluir duplicados
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <div className="space-y-3">
        {trialStudents.map((student: any) => {
          const daysLeft = getDaysLeft(student.accessExpiresAt);
          const phone = (student.phone || "").replace(/\D/g, "");
          const isDuplicate = duplicateEmails.has((student.email || "").toLowerCase().trim());
          const wppMsg = encodeURIComponent(
            `Ola ${student.name?.split(" ")[0]}! Vi que voce esta no periodo de teste da Ampla Facial. Posso te ajudar a escolher o melhor plano?`
          );
          return (
            <div
              key={student.id}
              className={`rounded-xl border bg-card/40 p-4 space-y-3 ${isDuplicate ? "border-amber-500/30" : "border-border/30"}`}
            >
              {/* Row 1: Info + days badge */}
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{student.name}</p>
                    {isDuplicate && (
                      <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10 px-1.5">
                        Duplicado
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{student.email}</p>
                  {student.phone && <p className="text-xs text-muted-foreground">{student.phone}</p>}
                </div>
                <span className={`text-[10px] rounded-full px-2 py-0.5 font-semibold shrink-0 ${
                  daysLeft === null ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                  daysLeft === 0 ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                  daysLeft <= 2 ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                  daysLeft <= 4 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                  "bg-green-500/20 text-green-400 border border-green-500/30"
                }`}>
                  {daysLeft === null
                    ? "Acesso vitalício"
                    : daysLeft === 0
                    ? "Expirado"
                    : `${daysLeft} dia${daysLeft !== 1 ? "s" : ""} restante${daysLeft !== 1 ? "s" : ""}`}
                </span>
              </div>

              {/* Row 2: Extend pills + Action buttons */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                {/* Extend trial pills */}
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  {[7, 15, 30].map((days) => (
                    <button
                      key={days}
                      onClick={() => extendMutation.mutate({ id: student.id, days })}
                      disabled={extendMutation.isPending}
                      className="rounded-full border border-gold/30 bg-gold/5 px-2.5 py-0.5 text-[11px] font-medium text-gold hover:bg-gold/15 transition-colors disabled:opacity-50"
                    >
                      +{days}d
                    </button>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onConvert(student.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/5 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/10 transition-colors"
                  >
                    Converter
                  </button>
                  <button
                    onClick={() => onEdit(student)}
                    className="flex items-center justify-center rounded-lg border border-border/30 bg-card/50 w-8 h-8 text-muted-foreground hover:text-gold hover:border-gold/30 transition-colors"
                    title="Editar aluno"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="flex items-center justify-center rounded-lg border border-border/30 bg-card/50 w-8 h-8 text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
                        title="Excluir aluno"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border/40">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir {student.name}? Esta acao nao pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-border/40">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteMutation.mutate(student.id)}
                        >
                          {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  {phone && (
                    <a
                      href={`https://wa.me/55${phone.startsWith("55") ? phone.slice(2) : phone}?text=${wppMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg bg-green-600/10 border border-green-600/20 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-600/20 transition-colors"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function LeadsTab({ trialStudents = [], onConvert, onEdit }: {
  trialStudents?: any[];
  onConvert?: (id: number) => void;
  onEdit?: (student: any) => void;
}) {
  const [subTab, setSubTab] = useState<LeadsSubTab>("trial");

  const SUB_TABS = [
    { key: "trial" as LeadsSubTab,  label: "Trial",  icon: <Zap className="h-3.5 w-3.5" />,         badge: trialStudents.length },
    { key: "quiz" as LeadsSubTab,   label: "Quiz",   icon: <Trophy className="h-3.5 w-3.5" /> },
    { key: "funil" as LeadsSubTab,  label: "Funil",  icon: <TrendingUp className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-gold" /> CRM de Leads
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">Trial, Quiz e Funil de conversao em um so lugar</p>
      </div>

      {/* Sub-abas */}
      <div className="flex border-b border-border/30">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-sm font-medium border-b-2 transition-all relative ${
              subTab === t.key
                ? "border-gold text-gold bg-gold/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.badge !== undefined && t.badge > 0 && (
              <span className="min-w-[18px] h-[18px] rounded-full bg-gold text-[#0A1628] text-[10px] font-bold flex items-center justify-center px-1">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conteudo */}
      {subTab === "trial" && (
        <TrialLeadsSection
          trialStudents={trialStudents}
          onConvert={onConvert || (() => {})}
          onEdit={onEdit || (() => {})}
        />
      )}
      {subTab === "quiz"  && <QuizLeadsTab />}
      {subTab === "funil" && <FunnelTab />}
    </div>
  );
}
