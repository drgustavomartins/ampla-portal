import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Users, Zap, Trophy, TrendingUp, MousePointerClick, Download, ArrowRight } from "lucide-react";
import { FunnelTab } from "./FunnelTab";
import { QuizLeadsTab } from "./QuizLeadsTab";

// ─── Trial Leads (extraído do admin-dashboard) ────────────────────────────────
function TrialLeadsSection() {
  const { data: studentsData } = useQuery<any[]>({
    queryKey: ["/api/admin/students"],
    queryFn: () => apiRequest("GET", "/api/admin/students").then((r) => r.json()),
  });

  const convertMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/admin/students/${userId}/approve`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] }),
  });

  const students = studentsData || [];
  const trialStudents = students.filter((s: any) => s.role === "trial");

  const getDaysLeft = (expiresAt: string) => {
    if (!expiresAt) return 0;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Leads Trial ({trialStudents.length})</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Alunos no período de teste gratuito de 7 dias</p>
        </div>
      </div>

      {trialStudents.length === 0 ? (
        <div className="rounded-xl border border-border/30 bg-card/40 py-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhum lead em trial no momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trialStudents.map((student: any) => {
            const daysLeft = getDaysLeft(student.accessExpiresAt);
            const wppMsg = encodeURIComponent(
              `Olá ${student.name?.split(" ")[0]}! Vi que você está no período de teste da Ampla Facial. Posso te ajudar a escolher o melhor plano?`
            );
            return (
              <div key={student.id} className="rounded-xl border border-border/30 bg-card/40 p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{student.email}</p>
                  {student.phone && <p className="text-xs text-muted-foreground">{student.phone}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] rounded-full px-2 py-0.5 font-semibold ${
                      daysLeft <= 2 ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                      daysLeft <= 4 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                      "bg-green-500/20 text-green-400 border border-green-500/30"
                    }`}>
                      {daysLeft === 0 ? "Expirado" : `${daysLeft} dia${daysLeft !== 1 ? "s" : ""} restante${daysLeft !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => convertMutation.mutate(student.id)}
                    disabled={convertMutation.isPending}
                    className="flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/5 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/10 transition-colors"
                  >
                    Converter
                  </button>
                  <a
                    href={`https://wa.me/55${(student.phone || "").replace(/\D/g, "")}?text=${wppMsg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-green-600/10 border border-green-600/20 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-600/20 transition-colors"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    WhatsApp
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal Leads ───────────────────────────────────────────────
type LeadsSubTab = "trial" | "quiz" | "funil";

export function LeadsTab({ trialCount }: { trialCount?: number }) {
  const [subTab, setSubTab] = useState<LeadsSubTab>("trial");

  const SUB_TABS: { key: LeadsSubTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "trial",  label: "Trial",  icon: <Zap className="h-3.5 w-3.5" />,         badge: trialCount },
    { key: "quiz",   label: "Quiz",   icon: <Trophy className="h-3.5 w-3.5" /> },
    { key: "funil",  label: "Funil",  icon: <TrendingUp className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-gold" /> CRM de Leads
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">Trial, Quiz e Funil de conversão em um só lugar</p>
      </div>

      {/* Sub-abas */}
      <div className="flex gap-2 border-b border-border/30 pb-0">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all relative ${
              subTab === t.key
                ? "border-gold text-gold bg-gold/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/50"
            }`}
          >
            {t.icon}
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className="ml-1 min-w-[18px] h-[18px] rounded-full bg-gold text-[#0A1628] text-[10px] font-bold flex items-center justify-center px-1">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div>
        {subTab === "trial"  && <TrialLeadsSection />}
        {subTab === "quiz"   && <QuizLeadsTab />}
        {subTab === "funil"  && <FunnelTab />}
      </div>
    </div>
  );
}
