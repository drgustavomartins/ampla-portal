import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, UserPlus, ClipboardCheck, Play, Clock, CreditCard, AlertTriangle,
  MessageCircle, PenLine, Send, Phone, Calendar, MapPin, Target, FileText,
  Coins, Zap, StickyNote, User,
} from "lucide-react";
import { formatPhoneDisplay, stripPhone } from "@/lib/phone";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeadEvent {
  id: number;
  user_id: number | null;
  quiz_lead_id: number | null;
  event_type: string;
  event_description: string;
  metadata: string | null;
  created_at: string;
}

interface LeadDetailData {
  user: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    plan_key: string | null;
    plan_name: string | null;
    created_at: string;
    access_expires_at: string | null;
    approved: boolean;
    lead_source: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    trial_started_at: string | null;
    converted_at: string | null;
    plan_amount_paid: number | null;
    landing_page: string | null;
  } | null;
  quiz: {
    id: number;
    nome: string;
    email: string;
    whatsapp: string;
    resultado: string;
    respostas: any;
    created_at: string;
  } | null;
  events: LeadEvent[];
}

// ─── Event Icon Map ──────────────────────────────────────────────────────────

const EVENT_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  cadastro: { icon: UserPlus, color: "text-blue-400", bg: "bg-blue-500/15" },
  quiz_completo: { icon: ClipboardCheck, color: "text-violet-400", bg: "bg-violet-500/15" },
  trial_inicio: { icon: Play, color: "text-amber-400", bg: "bg-amber-500/15" },
  trial_expirado: { icon: Clock, color: "text-red-400", bg: "bg-red-500/15" },
  convertido: { icon: CreditCard, color: "text-green-400", bg: "bg-green-500/15" },
  modulo_acesso: { icon: FileText, color: "text-cyan-400", bg: "bg-cyan-500/15" },
  credito: { icon: Coins, color: "text-yellow-400", bg: "bg-yellow-500/15" },
  whatsapp_lp: { icon: MessageCircle, color: "text-[#25D366]", bg: "bg-[#25D366]/15" },
  nota_admin: { icon: StickyNote, color: "text-gold", bg: "bg-gold/15" },
};

function getEventStyle(type: string) {
  return EVENT_ICONS[type] || { icon: Zap, color: "text-muted-foreground", bg: "bg-muted/15" };
}

// ─── Time Formatting ─────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;
  const months = Math.floor(days / 30);
  return `há ${months} meses`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Source Badge ─────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  "Instagram": "bg-pink-500/15 text-pink-400 border-pink-500/30",
  "Meta Ads": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "WhatsApp": "bg-green-500/15 text-green-400 border-green-500/30",
  "Google": "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  "Indicação": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "Questionário": "bg-violet-500/15 text-violet-400 border-violet-500/30",
  "Direto": "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

// ─── Quiz Answers Display ────────────────────────────────────────────────────

function QuizAnswers({ respostas, resultado }: { respostas: any; resultado: string }) {
  if (!respostas) return null;

  const labels: Record<string, string> = {
    vip: "Mentoria VIP",
    observador: "Plano Observador",
    digital: "Acesso Digital",
    parcial: "Incompleto",
  };

  let answers: Record<string, any> = {};
  try {
    answers = typeof respostas === "string" ? JSON.parse(respostas) : respostas;
  } catch {
    return null;
  }

  return (
    <Card className="border-border/20 bg-violet-500/5">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardCheck className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold text-violet-300">Questionário</span>
          <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-400">
            {labels[resultado] || resultado}
          </Badge>
        </div>
        <div className="space-y-1.5">
          {Object.entries(answers).map(([question, answer]) => (
            <div key={question} className="text-[11px]">
              <span className="text-muted-foreground">{question}:</span>{" "}
              <span className="text-foreground font-medium">{String(answer)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Activity Timeline ───────────────────────────────────────────────────────

function ActivityTimeline({ events }: { events: LeadEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">Nenhuma atividade registrada</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Timeline vertical line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border/30" />

      <div className="space-y-4">
        {events.map((event, idx) => {
          const style = getEventStyle(event.event_type);
          const Icon = style.icon;
          return (
            <div key={event.id} className="relative">
              {/* Timeline dot */}
              <div className={`absolute -left-6 top-0.5 w-[22px] h-[22px] rounded-full ${style.bg} flex items-center justify-center ring-2 ring-background`}>
                <Icon className={`w-3 h-3 ${style.color}`} />
              </div>

              {/* Event content */}
              <div className="ml-2">
                <p className="text-xs text-foreground leading-relaxed">
                  {event.event_description}
                </p>
                {event.event_type === "nota_admin" && (
                  <div className="mt-1 px-2 py-1 rounded bg-gold/5 border border-gold/20">
                    <p className="text-[10px] text-gold/70">
                      {(() => {
                        try {
                          const meta = JSON.parse(event.metadata || "{}");
                          return `— ${meta.admin || "Admin"}`;
                        } catch {
                          return "";
                        }
                      })()}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground font-medium">{relativeTime(event.created_at)}</span>
                  <span className="text-[10px] text-muted-foreground/60">{formatDate(event.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Lead Detail Component ──────────────────────────────────────────────

export function LeadDetail({
  leadId,
  quizLeadId,
  onBack,
}: {
  leadId?: number | null;
  quizLeadId?: number | null;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [note, setNote] = useState("");

  const isQuizOnly = !leadId && !!quizLeadId;
  const apiUrl = isQuizOnly
    ? `/api/admin/crm/quiz-leads/${quizLeadId}/detail`
    : `/api/admin/crm/leads/${leadId}/detail`;

  const { data, isLoading } = useQuery<LeadDetailData>({
    queryKey: [apiUrl],
    queryFn: async () => {
      const res = await apiRequest("GET", apiUrl);
      return res.json();
    },
    enabled: !!(leadId || quizLeadId),
  });

  const noteMutation = useMutation({
    mutationFn: async (noteText: string) => {
      const noteUrl = isQuizOnly
        ? `/api/admin/crm/quiz-leads/${quizLeadId}/note`
        : `/api/admin/crm/leads/${leadId}/note`;
      await apiRequest("POST", noteUrl, { note: noteText });
    },
    onSuccess: () => {
      setNote("");
      queryClient.invalidateQueries({ queryKey: [apiUrl] });
      toast({ title: "Nota adicionada" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar nota", variant: "destructive" });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  const user = data.user;
  const quiz = data.quiz;
  const events = data.events || [];
  const displayName = user?.name || quiz?.nome || "Lead";
  const displayEmail = user?.email || quiz?.email || "";
  const displayPhone = user?.phone || quiz?.whatsapp || null;
  const leadSource = user?.lead_source || (quiz ? "Questionário" : "Direto");

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">{displayName}</h2>
          <p className="text-[10px] text-muted-foreground">{displayEmail}</p>
        </div>
        {displayPhone && (
          <a
            href={`https://wa.me/${stripPhone(displayPhone)}?text=${encodeURIComponent(`Oi, ${(displayName || "").split(" ")[0]}! Tudo bem?`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs font-medium hover:bg-[#25D366]/20 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: Lead info + quiz */}
        <div className="lg:col-span-1 space-y-3">
          {/* Lead info card */}
          <Card className="border-border/20 bg-card/50">
            <CardContent className="p-3 space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informações</h3>

              <div className="space-y-1.5">
                {displayPhone && (
                  <div className="flex items-center gap-2 text-xs">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <span className="text-foreground">{formatPhoneDisplay(displayPhone)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs">
                  <Target className="w-3 h-3 text-muted-foreground" />
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${SOURCE_COLORS[leadSource] || SOURCE_COLORS["Direto"]}`}>
                    {leadSource}
                  </span>
                </div>
                {user?.role && (
                  <div className="flex items-center gap-2 text-xs">
                    <User className="w-3 h-3 text-muted-foreground" />
                    <span className="text-foreground capitalize">{user.role}</span>
                    {user.plan_name && <span className="text-muted-foreground">• {user.plan_name}</span>}
                  </div>
                )}
                {user?.created_at && (
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-foreground">{formatDate(user.created_at)}</span>
                  </div>
                )}
                {user?.utm_campaign && (
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    <span className="text-foreground text-[11px]">Campanha: {user.utm_campaign}</span>
                  </div>
                )}
                {user?.landing_page && (
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    <span className="text-foreground text-[11px] truncate">{user.landing_page}</span>
                  </div>
                )}
                {user?.access_expires_at && (
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-foreground text-[11px]">
                      Expira: {new Date(user.access_expires_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quiz answers if available */}
          {quiz && quiz.resultado && quiz.resultado !== "parcial" && (
            <QuizAnswers respostas={quiz.respostas} resultado={quiz.resultado} />
          )}
        </div>

        {/* Right column: Timeline */}
        <div className="lg:col-span-2 space-y-3">
          {/* Add note */}
          <Card className="border-border/20 bg-card/50">
            <CardContent className="p-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Adicionar Nota</h3>
              <div className="flex gap-2">
                <Textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ex: Conversou por WhatsApp, interessada no VIP..."
                  className="h-16 text-xs bg-background/50 border-border/40 resize-none"
                />
                <Button
                  size="sm"
                  disabled={!note.trim() || noteMutation.isPending}
                  onClick={() => noteMutation.mutate(note)}
                  className="self-end h-8 bg-gold text-background hover:bg-gold/90"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card className="border-border/20 bg-card/50">
            <CardContent className="p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Linha do Tempo ({events.length})
              </h3>
              <ScrollArea className="max-h-[400px]">
                <ActivityTimeline events={events} />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
