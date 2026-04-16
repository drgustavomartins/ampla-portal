import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, UserPlus, ClipboardCheck, Play, Clock, CreditCard, AlertTriangle,
  MessageCircle, ChevronRight, ArrowRight, Phone,
} from "lucide-react";
import { formatPhoneDisplay, stripPhone } from "@/lib/phone";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PipelineLead {
  id: number | string;
  quiz_lead_id?: number;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  lead_source: string | null;
  created_at: string;
  access_expires_at?: string | null;
  approved?: boolean;
  plan_key?: string | null;
  plan_name?: string | null;
  quiz_resultado?: string | null;
  quiz_respostas?: any;
  days_in_stage: number;
  trial_started_at?: string | null;
  converted_at?: string | null;
  plan_amount_paid?: number | null;
}

interface PipelineData {
  novo_lead: PipelineLead[];
  quiz_completo: PipelineLead[];
  trial_ativo: PipelineLead[];
  trial_expirado: PipelineLead[];
  aluno_pagante: PipelineLead[];
  expirado: PipelineLead[];
}

const STAGES = [
  {
    key: "novo_lead",
    label: "Novo Lead",
    icon: UserPlus,
    color: "bg-slate-500",
    headerBg: "bg-slate-500/10 border-slate-500/30",
    textColor: "text-slate-300",
    badgeBg: "bg-slate-500/20 text-slate-300",
  },
  {
    key: "quiz_completo",
    label: "Quiz Completo",
    icon: ClipboardCheck,
    color: "bg-violet-500",
    headerBg: "bg-violet-500/10 border-violet-500/30",
    textColor: "text-violet-300",
    badgeBg: "bg-violet-500/20 text-violet-300",
  },
  {
    key: "trial_ativo",
    label: "Trial Ativo",
    icon: Play,
    color: "bg-amber-500",
    headerBg: "bg-amber-500/10 border-amber-500/30",
    textColor: "text-amber-300",
    badgeBg: "bg-amber-500/20 text-amber-300",
  },
  {
    key: "trial_expirado",
    label: "Trial Expirado",
    icon: Clock,
    color: "bg-red-500",
    headerBg: "bg-red-500/10 border-red-500/30",
    textColor: "text-red-300",
    badgeBg: "bg-red-500/20 text-red-300",
  },
  {
    key: "aluno_pagante",
    label: "Aluno Pagante",
    icon: CreditCard,
    color: "bg-green-500",
    headerBg: "bg-green-500/10 border-green-500/30",
    textColor: "text-green-300",
    badgeBg: "bg-green-500/20 text-green-300",
  },
  {
    key: "expirado",
    label: "Expirado",
    icon: AlertTriangle,
    color: "bg-gray-500",
    headerBg: "bg-gray-500/10 border-gray-500/30",
    textColor: "text-gray-400",
    badgeBg: "bg-gray-500/20 text-gray-400",
  },
] as const;

const SOURCE_COLORS: Record<string, string> = {
  "Instagram": "bg-pink-500/15 text-pink-400 border-pink-500/30",
  "Meta Ads": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "WhatsApp": "bg-green-500/15 text-green-400 border-green-500/30",
  "Google": "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  "Indicação": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "Questionário": "bg-violet-500/15 text-violet-400 border-violet-500/30",
  "Direto": "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

function SourceBadge({ source }: { source: string }) {
  const cls = SOURCE_COLORS[source] || SOURCE_COLORS["Direto"];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>
      {source}
    </span>
  );
}

function QuizBadge({ resultado }: { resultado: string }) {
  const labels: Record<string, string> = {
    vip: "VIP",
    observador: "Observador",
    digital: "Digital",
    parcial: "Parcial",
  };
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/15 text-violet-400 border border-violet-500/30">
      {labels[resultado] || resultado}
    </span>
  );
}

// ─── Pipeline Column ─────────────────────────────────────────────────────────

function PipelineColumn({
  stage,
  leads,
  onViewLead,
  onMoveLead,
}: {
  stage: typeof STAGES[number];
  leads: PipelineLead[];
  onViewLead: (lead: PipelineLead) => void;
  onMoveLead: (userId: number, targetStage: string) => void;
}) {
  const Icon = stage.icon;

  return (
    <div className="flex flex-col min-w-[260px] max-w-[300px] sm:min-w-[280px] flex-1">
      {/* Column Header */}
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-lg border ${stage.headerBg}`}>
        <div className={`w-6 h-6 rounded-md ${stage.color}/20 flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${stage.textColor}`} />
        </div>
        <span className={`text-xs font-semibold ${stage.textColor}`}>{stage.label}</span>
        <span className={`ml-auto text-xs font-bold ${stage.textColor} ${stage.badgeBg} px-2 py-0.5 rounded-full`}>
          {leads.length}
        </span>
      </div>

      {/* Column Body */}
      <ScrollArea className="flex-1 border border-t-0 border-border/20 rounded-b-lg bg-card/30 max-h-[500px]">
        <div className="p-2 space-y-2">
          {leads.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-6">Nenhum lead</p>
          )}
          {leads.map(lead => (
            <LeadCard
              key={typeof lead.id === 'string' ? lead.id : `u_${lead.id}`}
              lead={lead}
              stage={stage}
              onView={() => onViewLead(lead)}
              onMove={(target) => {
                const numericId = typeof lead.id === 'string' ? null : lead.id;
                if (numericId) onMoveLead(numericId, target);
              }}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Lead Card ───────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  stage,
  onView,
  onMove,
}: {
  lead: PipelineLead;
  stage: typeof STAGES[number];
  onView: () => void;
  onMove: (target: string) => void;
}) {
  const isQuizOnly = typeof lead.id === "string" && lead.id.startsWith("ql_");
  const daysLeft = lead.access_expires_at
    ? Math.max(0, Math.ceil((new Date(lead.access_expires_at).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <Card
      className="border-border/20 bg-background/40 hover:bg-background/60 transition-colors cursor-pointer"
      onClick={onView}
    >
      <CardContent className="p-2.5">
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate">{lead.name}</p>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{lead.email}</p>
          </div>
          {lead.phone && (
            <a
              href={`https://wa.me/${stripPhone(lead.phone)}?text=${encodeURIComponent(`Oi, ${(lead.name || "").split(" ")[0]}! Tudo bem?`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-none w-6 h-6 rounded-md flex items-center justify-center text-green-400 hover:bg-green-500/10 transition-colors"
              title="WhatsApp"
              onClick={e => e.stopPropagation()}
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          {lead.lead_source && <SourceBadge source={lead.lead_source} />}
          {lead.quiz_resultado && <QuizBadge resultado={lead.quiz_resultado} />}
          {daysLeft !== null && stage.key === "trial_ativo" && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              daysLeft <= 2 ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"
            }`}>
              {daysLeft}d restantes
            </span>
          )}
        </div>

        {/* Days in stage */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-muted-foreground">
            {lead.days_in_stage}d neste estágio
          </span>
          {lead.phone && (
            <span className="text-[10px] text-muted-foreground">
              {formatPhoneDisplay(lead.phone)}
            </span>
          )}
        </div>

        {/* Action buttons */}
        {!isQuizOnly && (
          <div className="flex gap-1 mt-2" onClick={e => e.stopPropagation()}>
            {(stage.key === "novo_lead" || stage.key === "quiz_completo") && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] px-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                onClick={() => onMove("trial_ativo")}
              >
                <Play className="w-3 h-3 mr-1" />
                Converter Trial
              </Button>
            )}
            {(stage.key === "trial_ativo" || stage.key === "trial_expirado") && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] px-2 border-green-500/30 text-green-400 hover:bg-green-500/10"
                onClick={() => onMove("aluno_pagante")}
              >
                <CreditCard className="w-3 h-3 mr-1" />
                Converter Pagante
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Pipeline Component ─────────────────────────────────────────────────

export function PipelineView({
  onViewLead,
}: {
  onViewLead: (lead: PipelineLead) => void;
}) {
  const { toast } = useToast();

  const { data: pipeline, isLoading } = useQuery<PipelineData>({
    queryKey: ["/api/admin/crm/pipeline"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/crm/pipeline");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const moveMutation = useMutation({
    mutationFn: async ({ userId, targetStage }: { userId: number; targetStage: string }) => {
      await apiRequest("POST", "/api/admin/crm/pipeline/move", { userId, targetStage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm/pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      toast({ title: "Lead movido com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao mover lead", variant: "destructive" });
    },
  });

  if (isLoading || !pipeline) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalLeads = Object.values(pipeline).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-foreground">Pipeline</span>
        <span className="text-xs text-muted-foreground">({totalLeads} leads)</span>
        <div className="flex-1" />
        {/* Stage count pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {STAGES.map(stage => {
            const count = pipeline[stage.key as keyof PipelineData]?.length || 0;
            return (
              <span
                key={stage.key}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${stage.badgeBg}`}
              >
                {stage.label}: {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Pipeline Columns — horizontal scroll on desktop, vertical stack on mobile */}
      <div className="hidden md:flex gap-3 overflow-x-auto pb-2">
        {STAGES.map(stage => (
          <PipelineColumn
            key={stage.key}
            stage={stage}
            leads={pipeline[stage.key as keyof PipelineData] || []}
            onViewLead={onViewLead}
            onMoveLead={(userId, target) => moveMutation.mutate({ userId, targetStage: target })}
          />
        ))}
      </div>

      {/* Mobile: vertical stack */}
      <div className="md:hidden space-y-4">
        {STAGES.map(stage => {
          const leads = pipeline[stage.key as keyof PipelineData] || [];
          const Icon = stage.icon;
          return (
            <div key={stage.key}>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${stage.headerBg} mb-2`}>
                <Icon className={`w-4 h-4 ${stage.textColor}`} />
                <span className={`text-xs font-semibold ${stage.textColor}`}>{stage.label}</span>
                <span className={`ml-auto text-xs font-bold ${stage.badgeBg} px-2 py-0.5 rounded-full`}>
                  {leads.length}
                </span>
              </div>
              {leads.length > 0 && (
                <div className="space-y-2 pl-1">
                  {leads.slice(0, 5).map(lead => (
                    <LeadCard
                      key={typeof lead.id === 'string' ? lead.id : `u_${lead.id}`}
                      lead={lead}
                      stage={stage}
                      onView={() => onViewLead(lead)}
                      onMove={(target) => {
                        const numericId = typeof lead.id === 'string' ? null : lead.id;
                        if (numericId) moveMutation.mutate({ userId: numericId, targetStage: target });
                      }}
                    />
                  ))}
                  {leads.length > 5 && (
                    <p className="text-[10px] text-muted-foreground text-center py-1">
                      + {leads.length - 5} mais
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
