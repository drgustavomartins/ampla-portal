import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, TrendingUp, BarChart3, Search, MessageCircle, ChevronDown, ChevronUp,
  ArrowRight, Filter, Kanban, LayoutDashboard,
} from "lucide-react";
import { formatPhoneDisplay, stripPhone } from "@/lib/phone";
import { PipelineView } from "./PipelineView";
import { LeadDetail } from "./LeadDetail";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CrmStats {
  leadsThisMonth: number;
  leadsBySource: Record<string, number>;
  conversionRate: number;
  totalTrials: number;
  totalConverted: number;
  sourcePerformance: {
    source: string;
    leads: number;
    converted: number;
    rate: number;
    revenue: number;
  }[];
  funnel: {
    lpVisits: number;
    registered: number;
    converted: number;
  };
  waClicks: number;
}

interface CrmLead {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  plan_key: string | null;
  plan_id: number | null;
  created_at: string;
  access_expires_at: string | null;
  approved: boolean;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  lead_source: string | null;
  converted_at: string | null;
  landing_page: string | null;
  trial_started_at: string | null;
  plan_amount_paid: number | null;
  plan_name: string | null;
}

// ─── Source Badge Colors ─────────────────────────────────────────────────────

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
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${cls}`}>
      {source}
    </span>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ role, accessExpiresAt, planKey }: { role: string; accessExpiresAt: string | null; planKey: string | null }) {
  if (role === "trial") {
    const expired = accessExpiresAt ? new Date(accessExpiresAt) < new Date() : false;
    if (expired) return <Badge variant="outline" className="border-red-500/40 text-red-400 text-[10px]">Expirado</Badge>;
    return <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px]">Trial</Badge>;
  }
  if (role === "student" && planKey) {
    return <Badge variant="outline" className="border-green-500/40 text-green-400 text-[10px]">Ativo</Badge>;
  }
  return <Badge variant="outline" className="border-gray-500/40 text-gray-400 text-[10px]">{role}</Badge>;
}

// ─── Days Left ───────────────────────────────────────────────────────────────

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
}

// ─── Sub-tab type ────────────────────────────────────────────────────────────

type CrmSubTab = "overview" | "pipeline";

// ─── Lead Detail State ───────────────────────────────────────────────────────

interface LeadViewState {
  leadId?: number | null;
  quizLeadId?: number | null;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CrmTab() {
  const [subTab, setSubTab] = useState<CrmSubTab>("overview");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortField, setSortField] = useState<"created_at" | "name">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewingLead, setViewingLead] = useState<LeadViewState | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<CrmStats>({
    queryKey: ["/api/admin/crm/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/crm/stats");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<CrmLead[]>({
    queryKey: ["/api/admin/crm/leads"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/crm/leads");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const filteredLeads = useMemo(() => {
    let list = [...leads];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.phone && l.phone.includes(q))
      );
    }
    if (sourceFilter !== "all") {
      list = list.filter(l => (l.lead_source || "Direto") === sourceFilter);
    }
    list.sort((a, b) => {
      const av = sortField === "created_at" ? a.created_at : a.name.toLowerCase();
      const bv = sortField === "created_at" ? b.created_at : b.name.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [leads, search, sourceFilter, sortField, sortDir]);

  const toggleSort = (field: "created_at" | "name") => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "created_at" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  // Handle viewing lead detail
  const handleViewLead = (lead: any) => {
    if (typeof lead.id === "string" && lead.id.startsWith("ql_")) {
      setViewingLead({ quizLeadId: lead.quiz_lead_id });
    } else {
      setViewingLead({ leadId: lead.id });
    }
  };

  // If viewing a lead detail, show that instead
  if (viewingLead) {
    return (
      <LeadDetail
        leadId={viewingLead.leadId}
        quizLeadId={viewingLead.quizLeadId}
        onBack={() => setViewingLead(null)}
      />
    );
  }

  if (statsLoading || leadsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  const s = stats!;

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex items-center gap-1 bg-card/30 rounded-lg p-1 border border-border/20 w-fit">
        <button
          onClick={() => setSubTab("overview")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
            ${subTab === "overview"
              ? "bg-gold/15 text-gold border border-gold/30"
              : "text-muted-foreground hover:text-foreground"
            }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Visão Geral
        </button>
        <button
          onClick={() => setSubTab("pipeline")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
            ${subTab === "pipeline"
              ? "bg-gold/15 text-gold border border-gold/30"
              : "text-muted-foreground hover:text-foreground"
            }`}
        >
          <Kanban className="w-3.5 h-3.5" />
          Pipeline
        </button>
      </div>

      {/* Pipeline View */}
      {subTab === "pipeline" && (
        <PipelineView onViewLead={handleViewLead} />
      )}

      {/* Overview View (existing) */}
      {subTab === "overview" && (
        <>
          {/* ─── 4a. Overview Cards ─── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-border/30 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-gold" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{s.leadsThisMonth}</p>
                <p className="text-xs text-muted-foreground mt-1">Leads este mês</p>
              </CardContent>
            </Card>

            <Card className="border-border/30 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{s.conversionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">Taxa de conversão</p>
              </CardContent>
            </Card>

            <Card className="border-border/30 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{s.totalConverted}</p>
                <p className="text-xs text-muted-foreground mt-1">Convertidos (total)</p>
              </CardContent>
            </Card>

            <Card className="border-border/30 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{s.waClicks}</p>
                <p className="text-xs text-muted-foreground mt-1">Cliques WhatsApp</p>
              </CardContent>
            </Card>
          </div>

          {/* ─── Leads by Source (mini cards) ─── */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(s.leadsBySource).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
              <button
                key={source}
                onClick={() => setSourceFilter(sourceFilter === source ? "all" : source)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors
                  ${sourceFilter === source
                    ? "bg-gold/15 border-gold/40 text-gold"
                    : "bg-card/50 border-border/30 text-muted-foreground hover:bg-card/70"
                  }`}
              >
                <SourceBadge source={source} />
                <span className="font-bold">{count}</span>
              </button>
            ))}
            {sourceFilter !== "all" && (
              <button
                onClick={() => setSourceFilter("all")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/30 bg-card/50 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Filter className="w-3 h-3" />
                Limpar filtro
              </button>
            )}
          </div>

          {/* ─── 4b. Funnel ─── */}
          <Card className="border-border/30 bg-card/50">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Funil de Conversão</h3>
              <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                {/* LP Visits */}
                <div className="text-center min-w-[80px]">
                  <p className="text-2xl font-bold text-blue-400">{s.funnel.lpVisits}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Visitaram LP</p>
                </div>
                <div className="flex flex-col items-center">
                  <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
                  {s.funnel.lpVisits > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      {Math.round((s.funnel.registered / s.funnel.lpVisits) * 100)}%
                    </p>
                  )}
                </div>
                {/* Registered */}
                <div className="text-center min-w-[80px]">
                  <p className="text-2xl font-bold text-amber-400">{s.funnel.registered}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Cadastrados</p>
                </div>
                <div className="flex flex-col items-center">
                  <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
                  {s.funnel.registered > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      {Math.round((s.funnel.converted / s.funnel.registered) * 100)}%
                    </p>
                  )}
                </div>
                {/* Converted */}
                <div className="text-center min-w-[80px]">
                  <p className="text-2xl font-bold text-green-400">{s.funnel.converted}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Convertidos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ─── 4d. Source Performance Table ─── */}
          {s.sourcePerformance.length > 0 && (
            <Card className="border-border/30 bg-card/50">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Performance por Origem</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/20">
                        <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Origem</th>
                        <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Leads</th>
                        <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Convertidos</th>
                        <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Taxa</th>
                        <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Receita</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.sourcePerformance.map(sp => (
                        <tr key={sp.source} className="border-b border-border/10 hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3"><SourceBadge source={sp.source} /></td>
                          <td className="py-2.5 px-3 text-right font-medium text-foreground">{sp.leads}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-foreground">{sp.converted}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`text-xs font-semibold ${sp.rate >= 20 ? "text-green-400" : sp.rate >= 10 ? "text-amber-400" : "text-muted-foreground"}`}>
                              {sp.rate}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-foreground">
                            {sp.revenue > 0 ? `R$ ${(sp.revenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── 4c. Lead Table ─── */}
          <Card className="border-border/30 bg-card/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">
                  Leads ({filteredLeads.length})
                </h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Buscar..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-8 w-48 bg-background/50 border-border/40 text-xs"
                    />
                  </div>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="h-8 w-36 text-xs bg-background/50 border-border/40">
                      <SelectValue placeholder="Origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas origens</SelectItem>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="Meta Ads">Meta Ads</SelectItem>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                      <SelectItem value="Google">Google</SelectItem>
                      <SelectItem value="Indicação">Indicação</SelectItem>
                      <SelectItem value="Questionário">Questionário</SelectItem>
                      <SelectItem value="Direto">Direto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/20">
                      <th
                        className="text-left py-2 px-2 text-xs text-muted-foreground font-medium cursor-pointer hover:text-foreground"
                        onClick={() => toggleSort("name")}
                      >
                        <span className="flex items-center gap-1">Nome <SortIcon field="name" /></span>
                      </th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium hidden md:table-cell">Email</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium hidden lg:table-cell">Telefone</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Origem</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium hidden lg:table-cell">Campanha</th>
                      <th
                        className="text-left py-2 px-2 text-xs text-muted-foreground font-medium cursor-pointer hover:text-foreground"
                        onClick={() => toggleSort("created_at")}
                      >
                        <span className="flex items-center gap-1">Cadastro <SortIcon field="created_at" /></span>
                      </th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Status</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium hidden md:table-cell">Plano</th>
                      <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map(lead => {
                      const daysLeft = lead.role === "trial" ? getDaysLeft(lead.access_expires_at) : null;
                      return (
                        <tr
                          key={lead.id}
                          className="border-b border-border/10 hover:bg-white/[0.02] cursor-pointer"
                          onClick={() => handleViewLead(lead)}
                        >
                          <td className="py-2 px-2">
                            <p className="font-medium text-foreground text-xs truncate max-w-[150px]">{lead.name}</p>
                            <p className="text-[10px] text-muted-foreground md:hidden">{lead.email}</p>
                          </td>
                          <td className="py-2 px-2 text-xs text-muted-foreground hidden md:table-cell truncate max-w-[180px]">{lead.email}</td>
                          <td className="py-2 px-2 hidden lg:table-cell">
                            {lead.phone ? (
                              <span className="text-xs text-muted-foreground">{formatPhoneDisplay(lead.phone)}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            <SourceBadge source={lead.lead_source || "Direto"} />
                          </td>
                          <td className="py-2 px-2 hidden lg:table-cell">
                            {lead.utm_campaign ? (
                              <span className="text-[11px] text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded">
                                {lead.utm_campaign}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-xs text-muted-foreground">
                            {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-1.5">
                              <StatusBadge role={lead.role} accessExpiresAt={lead.access_expires_at} planKey={lead.plan_key} />
                              {daysLeft !== null && daysLeft <= 7 && (
                                <span className={`text-[10px] font-medium ${daysLeft <= 2 ? "text-red-400" : "text-amber-400"}`}>
                                  {daysLeft}d
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 hidden md:table-cell">
                            <span className="text-xs text-muted-foreground">
                              {lead.plan_name || lead.plan_key?.replace(/_/g, " ") || "—"}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center" onClick={e => e.stopPropagation()}>
                            {lead.phone && (
                              <a
                                href={`https://wa.me/${stripPhone(lead.phone)}?text=${encodeURIComponent(`Oi, ${(lead.name || "").split(" ")[0]}! Tudo bem?`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-green-400 hover:text-green-300 hover:bg-green-500/10 transition-colors"
                                title="WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredLeads.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                          Nenhum lead encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
