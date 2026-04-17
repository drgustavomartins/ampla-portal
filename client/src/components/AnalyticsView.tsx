import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Eye, Globe, Users, TrendingUp, ArrowRight, Search, Filter,
  MessageCircle, ArrowLeft, Calendar, MapPin, FileText, Activity,
  ChevronDown, ChevronUp, Clock,
} from "lucide-react";
import { formatPhoneDisplay, stripPhone } from "@/lib/phone";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalyticsOverview {
  visitsToday: number;
  visitsWeek: number;
  visitsMonth: number;
  uniqueToday: number;
  uniqueWeek: number;
  uniqueMonth: number;
  registrations: number;
  conversionRate: number;
}

interface FunnelData {
  visitors: number;
  regStarted: number;
  regCompleted: number;
  trialActive: number;
  paidConversion: number;
}

interface SourceData {
  source: string;
  visitors: number;
  converted: number;
}

interface PageData {
  page: string;
  views: number;
  unique_visitors: number;
}

interface VisitorRow {
  id: number;
  visitor_id: string;
  user_id: number | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  lead_source: string | null;
  referrer: string | null;
  first_page: string | null;
  created_at: string;
  last_seen_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  plan_key: string | null;
  access_expires_at: string | null;
  page_count: number;
}

interface VisitorJourney {
  visitor: any;
  pages: { page: string; referrer: string | null; created_at: string }[];
  events: any[];
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

function VisitorStatusBadge({ role, userId }: { role: string | null; userId: number | null }) {
  if (!userId) return <Badge variant="outline" className="border-gray-500/40 text-gray-400 text-[10px]">Visitante</Badge>;
  if (role === "trial") return <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px]">Trial</Badge>;
  if (role === "student") return <Badge variant="outline" className="border-green-500/40 text-green-400 text-[10px]">Aluno</Badge>;
  return <Badge variant="outline" className="border-blue-500/40 text-blue-400 text-[10px]">Lead</Badge>;
}

// ─── Visitor Journey Detail ─────────────────────────────────────────────────

function VisitorJourneyView({ visitorId, onBack }: { visitorId: string; onBack: () => void }) {
  const { data, isLoading } = useQuery<VisitorJourney>({
    queryKey: ["/api/admin/analytics/visitor", visitorId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/analytics/visitor/${visitorId}`);
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>Visitante não encontrado</p>
        <button onClick={onBack} className="text-gold hover:underline mt-2 text-sm">Voltar</button>
      </div>
    );
  }

  const { visitor, pages, events } = data;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Analytics
      </button>

      {/* Visitor Info Card */}
      <Card className="border-border/30 bg-card/50">
        <CardContent className="p-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {visitor.name || "Visitante Anônimo"}
              </h3>
              {visitor.email && <p className="text-xs text-muted-foreground mt-0.5">{visitor.email}</p>}
              {visitor.phone && <p className="text-xs text-muted-foreground">{formatPhoneDisplay(visitor.phone)}</p>}
            </div>
            <div className="flex items-center gap-2">
              <VisitorStatusBadge role={visitor.role} userId={visitor.user_id} />
              {visitor.lead_source && <SourceBadge source={visitor.lead_source} />}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Primeira Visita</p>
              <p className="text-xs text-foreground mt-0.5">{new Date(visitor.created_at).toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Última Visita</p>
              <p className="text-xs text-foreground mt-0.5">{new Date(visitor.last_seen_at).toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Páginas Visitadas</p>
              <p className="text-xs text-foreground mt-0.5">{pages.length}</p>
            </div>
            {visitor.plan_name && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Plano</p>
                <p className="text-xs text-foreground mt-0.5">{visitor.plan_name}</p>
              </div>
            )}
          </div>
          {(visitor.utm_source || visitor.utm_campaign) && (
            <div className="mt-4 pt-3 border-t border-border/20">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Atribuição UTM</p>
              <div className="flex flex-wrap gap-2">
                {visitor.utm_source && (
                  <span className="text-[11px] bg-background/50 px-2 py-0.5 rounded text-muted-foreground">
                    source: {visitor.utm_source}
                  </span>
                )}
                {visitor.utm_medium && (
                  <span className="text-[11px] bg-background/50 px-2 py-0.5 rounded text-muted-foreground">
                    medium: {visitor.utm_medium}
                  </span>
                )}
                {visitor.utm_campaign && (
                  <span className="text-[11px] bg-background/50 px-2 py-0.5 rounded text-muted-foreground">
                    campaign: {visitor.utm_campaign}
                  </span>
                )}
              </div>
            </div>
          )}
          {visitor.phone && (
            <div className="mt-4 pt-3 border-t border-border/20">
              <a
                href={`https://wa.me/${stripPhone(visitor.phone)}?text=${encodeURIComponent(`Oi, ${(visitor.name || "").split(" ")[0]}! Tudo bem?`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/10 border border-green-600/20 text-xs font-medium text-green-400 hover:bg-green-600/20 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Abordar via WhatsApp
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline: Pages + Events merged */}
      <Card className="border-border/30 bg-card/50">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Jornada Completa</h3>
          <div className="space-y-0">
            {(() => {
              // Merge pages and events into a single timeline
              const timeline: { type: "page" | "event"; data: any; date: string }[] = [
                ...pages.map(p => ({ type: "page" as const, data: p, date: p.created_at })),
                ...events.map(e => ({ type: "event" as const, data: e, date: e.created_at })),
              ].sort((a, b) => a.date.localeCompare(b.date));

              if (timeline.length === 0) {
                return <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado disponível</p>;
              }

              return timeline.map((item, i) => (
                <div key={i} className="flex gap-3 pb-4 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${item.type === "page" ? "bg-blue-400" : "bg-gold"}`} />
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-border/30 mt-1" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {item.type === "page" ? (
                      <>
                        <p className="text-xs text-foreground">
                          <Globe className="w-3 h-3 inline mr-1 text-blue-400" />
                          Visitou <span className="font-medium text-blue-400">{item.data.page}</span>
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-foreground">
                          <Activity className="w-3 h-3 inline mr-1 text-gold" />
                          <span className="font-medium">{item.data.event_description}</span>
                        </p>
                      </>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(item.date).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              ));
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Analytics View ────────────────────────────────────────────────────

export function AnalyticsView() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<"created_at" | "last_seen_at" | "page_count">("last_seen_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewingVisitor, setViewingVisitor] = useState<string | null>(null);

  const { data: overview, isLoading: overviewLoading } = useQuery<AnalyticsOverview>({
    queryKey: ["/api/admin/analytics/overview"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics/overview");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: funnel } = useQuery<FunnelData>({
    queryKey: ["/api/admin/analytics/funnel"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics/funnel");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: sources = [] } = useQuery<SourceData[]>({
    queryKey: ["/api/admin/analytics/sources"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics/sources");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: pages = [] } = useQuery<PageData[]>({
    queryKey: ["/api/admin/analytics/pages"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics/pages");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: visitors = [], isLoading: visitorsLoading } = useQuery<VisitorRow[]>({
    queryKey: ["/api/admin/analytics/visitors"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics/visitors");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const filteredVisitors = useMemo(() => {
    let list = [...visitors];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(v =>
        (v.name && v.name.toLowerCase().includes(q)) ||
        (v.email && v.email.toLowerCase().includes(q)) ||
        (v.first_page && v.first_page.toLowerCase().includes(q)) ||
        v.visitor_id.toLowerCase().includes(q)
      );
    }
    if (sourceFilter !== "all") {
      list = list.filter(v => (v.lead_source || "Direto") === sourceFilter);
    }
    if (statusFilter !== "all") {
      if (statusFilter === "visitor") list = list.filter(v => !v.user_id);
      else if (statusFilter === "lead") list = list.filter(v => v.user_id && !v.role);
      else if (statusFilter === "trial") list = list.filter(v => v.role === "trial");
      else if (statusFilter === "student") list = list.filter(v => v.role === "student");
    }
    list.sort((a, b) => {
      const av = sortField === "page_count" ? Number(a.page_count) : (sortField === "last_seen_at" ? a.last_seen_at : a.created_at);
      const bv = sortField === "page_count" ? Number(b.page_count) : (sortField === "last_seen_at" ? b.last_seen_at : b.created_at);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [visitors, search, sourceFilter, statusFilter, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  // Viewing a visitor's journey
  if (viewingVisitor) {
    return <VisitorJourneyView visitorId={viewingVisitor} onBack={() => setViewingVisitor(null)} />;
  }

  if (overviewLoading || visitorsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  const o = overview!;

  return (
    <div className="space-y-6">
      {/* ─── Overview Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/30 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Eye className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{o.visitsToday}</p>
            <p className="text-xs text-muted-foreground mt-1">Visitas hoje</p>
            <p className="text-[10px] text-muted-foreground">{o.uniqueToday} únicos</p>
          </CardContent>
        </Card>

        <Card className="border-border/30 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{o.visitsWeek}</p>
            <p className="text-xs text-muted-foreground mt-1">Visitas (7 dias)</p>
            <p className="text-[10px] text-muted-foreground">{o.uniqueWeek} únicos</p>
          </CardContent>
        </Card>

        <Card className="border-border/30 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                <Globe className="w-4 h-4 text-gold" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{o.visitsMonth}</p>
            <p className="text-xs text-muted-foreground mt-1">Visitas (mês)</p>
            <p className="text-[10px] text-muted-foreground">{o.uniqueMonth} únicos</p>
          </CardContent>
        </Card>

        <Card className="border-border/30 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{o.conversionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Conversão (mês)</p>
            <p className="text-[10px] text-muted-foreground">{o.registrations} cadastros</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Funnel ─── */}
      {funnel && (
        <Card className="border-border/30 bg-card/50">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Funil de Visitantes</h3>
            <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
              <FunnelStep label="Visitantes" count={funnel.visitors} color="text-blue-400" />
              <FunnelArrow from={funnel.visitors} to={funnel.regStarted} />
              <FunnelStep label="Iniciaram Cadastro" count={funnel.regStarted} color="text-purple-400" />
              <FunnelArrow from={funnel.regStarted} to={funnel.regCompleted} />
              <FunnelStep label="Cadastrados" count={funnel.regCompleted} color="text-amber-400" />
              <FunnelArrow from={funnel.regCompleted} to={funnel.trialActive} />
              <FunnelStep label="Trial Ativo" count={funnel.trialActive} color="text-cyan-400" />
              <FunnelArrow from={funnel.trialActive} to={funnel.paidConversion} />
              <FunnelStep label="Pagos" count={funnel.paidConversion} color="text-green-400" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Traffic Sources + Top Pages (side by side) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Traffic Sources */}
        {sources.length > 0 && (
          <Card className="border-border/30 bg-card/50">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Origem do Tráfego</h3>
              <div className="space-y-2">
                {sources.map((s) => {
                  const totalVisitors = sources.reduce((sum, src) => sum + Number(src.visitors), 0);
                  const pct = totalVisitors > 0 ? Math.round((Number(s.visitors) / totalVisitors) * 100) : 0;
                  return (
                    <div key={s.source} className="flex items-center gap-3">
                      <div className="w-24 shrink-0">
                        <SourceBadge source={s.source} />
                      </div>
                      <div className="flex-1 h-2 bg-background/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gold/40"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground w-12 text-right">{s.visitors}</span>
                      <span className="text-[10px] text-muted-foreground w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Pages */}
        {pages.length > 0 && (
          <Card className="border-border/30 bg-card/50">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Páginas Mais Visitadas</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/20">
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Página</th>
                      <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Visitas</th>
                      <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Únicos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.slice(0, 10).map((p) => (
                      <tr key={p.page} className="border-b border-border/10">
                        <td className="py-2 px-2 text-xs text-foreground truncate max-w-[200px]">
                          <Globe className="w-3 h-3 inline mr-1 text-muted-foreground" />
                          {p.page || "/"}
                        </td>
                        <td className="py-2 px-2 text-xs text-right font-medium text-foreground">{p.views}</td>
                        <td className="py-2 px-2 text-xs text-right text-muted-foreground">{p.unique_visitors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Visitors Table ─── */}
      <Card className="border-border/30 bg-card/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">
              Visitantes ({filteredVisitors.length})
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 w-40 bg-background/50 border-border/40 text-xs"
                />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-8 w-32 text-xs bg-background/50 border-border/40">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas origens</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Meta Ads">Meta Ads</SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Google">Google</SelectItem>
                  <SelectItem value="Indicação">Indicação</SelectItem>
                  <SelectItem value="Direto">Direto</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-32 text-xs bg-background/50 border-border/40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="visitor">Visitante</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="student">Aluno</SelectItem>
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
                    onClick={() => toggleSort("created_at")}
                  >
                    <span className="flex items-center gap-1">Data <SortIcon field="created_at" /></span>
                  </th>
                  <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Origem</th>
                  <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium hidden md:table-cell">Página</th>
                  <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Status</th>
                  <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium hidden lg:table-cell">Nome/Email</th>
                  <th
                    className="text-right py-2 px-2 text-xs text-muted-foreground font-medium cursor-pointer hover:text-foreground hidden sm:table-cell"
                    onClick={() => toggleSort("page_count")}
                  >
                    <span className="flex items-center justify-end gap-1">Páginas <SortIcon field="page_count" /></span>
                  </th>
                  <th
                    className="text-left py-2 px-2 text-xs text-muted-foreground font-medium cursor-pointer hover:text-foreground hidden sm:table-cell"
                    onClick={() => toggleSort("last_seen_at")}
                  >
                    <span className="flex items-center gap-1">Última visita <SortIcon field="last_seen_at" /></span>
                  </th>
                  <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.map(v => (
                  <tr
                    key={v.visitor_id}
                    className="border-b border-border/10 hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => setViewingVisitor(v.visitor_id)}
                  >
                    <td className="py-2 px-2 text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-2 px-2">
                      <SourceBadge source={v.lead_source || "Direto"} />
                    </td>
                    <td className="py-2 px-2 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
                        {v.first_page || "/"}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <VisitorStatusBadge role={v.role} userId={v.user_id} />
                    </td>
                    <td className="py-2 px-2 hidden lg:table-cell">
                      {v.name ? (
                        <div>
                          <p className="text-xs text-foreground truncate max-w-[150px]">{v.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{v.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right text-xs font-medium text-foreground hidden sm:table-cell">
                      {v.page_count}
                    </td>
                    <td className="py-2 px-2 text-xs text-muted-foreground hidden sm:table-cell">
                      {new Date(v.last_seen_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-2 px-2 text-center" onClick={e => e.stopPropagation()}>
                      {v.phone && (
                        <a
                          href={`https://wa.me/${stripPhone(v.phone)}?text=${encodeURIComponent(`Oi, ${(v.name || "").split(" ")[0]}! Tudo bem?`)}`}
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
                ))}
                {filteredVisitors.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum visitante encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Funnel Helper Components ───────────────────────────────────────────────

function FunnelStep({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="text-center min-w-[70px]">
      <p className={`text-2xl font-bold ${color}`}>{count}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function FunnelArrow({ from, to }: { from: number; to: number }) {
  return (
    <div className="flex flex-col items-center">
      <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
      {from > 0 && (
        <p className="text-[10px] text-muted-foreground">
          {Math.round((to / from) * 100)}%
        </p>
      )}
    </div>
  );
}
