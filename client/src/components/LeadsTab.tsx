import { useState } from "react";
import { Users, Zap, Trophy, TrendingUp } from "lucide-react";
import { FunnelTab } from "./FunnelTab";
import { QuizLeadsTab } from "./QuizLeadsTab";

type LeadsSubTab = "trial" | "quiz" | "funil";

// ─── Trial Leads ──────────────────────────────────────────────────────────────
function TrialLeadsSection({ trialStudents, onConvert }: {
  trialStudents: any[];
  onConvert: (id: number) => void;
}) {
  const getDaysLeft = (expiresAt: string) => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
  };

  if (trialStudents.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Leads Trial (0)</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Alunos no período de teste gratuito de 7 dias</p>
        </div>
        <div className="rounded-xl border border-border/30 bg-card/40 py-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhum lead em trial no momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground">Leads Trial ({trialStudents.length})</h4>
        <p className="text-xs text-muted-foreground mt-0.5">Alunos no período de teste gratuito de 7 dias</p>
      </div>
      <div className="space-y-3">
        {trialStudents.map((student: any) => {
          const daysLeft = getDaysLeft(student.accessExpiresAt);
          const phone = (student.phone || "").replace(/\D/g, "");
          const wppMsg = encodeURIComponent(
            `Olá ${student.name?.split(" ")[0]}! Vi que você está no período de teste da Ampla Facial. Posso te ajudar a escolher o melhor plano?`
          );
          return (
            <div key={student.id} className="rounded-xl border border-border/30 bg-card/40 p-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{student.name}</p>
                <p className="text-xs text-muted-foreground">{student.email}</p>
                {student.phone && <p className="text-xs text-muted-foreground">{student.phone}</p>}
                <div className="mt-1.5">
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
                  onClick={() => onConvert(student.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/5 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/10 transition-colors"
                >
                  Converter
                </button>
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
          );
        })}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function LeadsTab({ trialStudents = [], onConvert }: {
  trialStudents?: any[];
  onConvert?: (id: number) => void;
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
        <p className="text-xs text-muted-foreground mt-0.5">Trial, Quiz e Funil de conversão em um só lugar</p>
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

      {/* Conteúdo */}
      {subTab === "trial" && (
        <TrialLeadsSection
          trialStudents={trialStudents}
          onConvert={onConvert || (() => {})}
        />
      )}
      {subTab === "quiz"  && <QuizLeadsTab />}
      {subTab === "funil" && <FunnelTab />}
    </div>
  );
}
