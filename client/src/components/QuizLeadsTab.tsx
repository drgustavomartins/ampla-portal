import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Download, MousePointerClick, Users, TrendingUp } from "lucide-react";

interface QuizLead {
  id: number;
  nome: string;
  email: string;
  whatsapp: string;
  resultado: string;
  respostas: Record<number, string[]>;
  created_at: string;
}

const RESULTADO_LABEL: Record<string, { label: string; cor: string }> = {
  digital:    { label: "Acesso Digital",   cor: "text-blue-400" },
  observador: { label: "Observador",        cor: "text-yellow-400" },
  vip:        { label: "Mentoria VIP",      cor: "text-[#D4A843]" },
};

function exportCSV(leads: QuizLead[]) {
  const header = ["ID", "Nome", "Email", "WhatsApp", "Resultado", "Data"];
  const rows = leads.map((l) => [
    l.id,
    l.nome,
    l.email,
    l.whatsapp,
    RESULTADO_LABEL[l.resultado]?.label || l.resultado,
    new Date(l.created_at).toLocaleString("pt-BR"),
  ]);
  const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads_quiz_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

interface QuizStats {
  totalClicks: number;
  totalLeads: number;
  bySource: { source: string; total: number }[];
}

const SOURCE_LABEL: Record<string, string> = {
  login_banner: "Banner na tela de login",
  dashboard_banner: "Banner no dashboard",
  qr_code: "QR Code da palestra",
  unknown: "Outro",
};

export function QuizLeadsTab() {
  const { data, isLoading } = useQuery<{ leads: QuizLead[] }>({
    queryKey: ["/api/admin/quiz-leads"],
    queryFn: () => apiRequest("GET", "/api/admin/quiz-leads").then((r) => r.json()),
  });

  const { data: statsData } = useQuery<QuizStats>({
    queryKey: ["/api/admin/quiz-stats"],
    queryFn: () => apiRequest("GET", "/api/admin/quiz-stats").then((r) => r.json()),
  });

  const leads = data?.leads || [];
  const leadStats = {
    total: leads.length,
    digital: leads.filter((l) => l.resultado === "digital").length,
    observador: leads.filter((l) => l.resultado === "observador").length,
    vip: leads.filter((l) => l.resultado === "vip").length,
  };
  const stats = statsData;
  const conversao = stats?.totalClicks
    ? Math.round((stats.totalLeads / stats.totalClicks) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Leads do Quiz HOF</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{leadStats.total} participante{leadStats.total !== 1 ? "s" : ""} no total</p>
        </div>
        {leads.length > 0 && (
          <button
            onClick={() => exportCSV(leads)}
            className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/10 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
        )}
      </div>

      {/* Métricas de tracking */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
            <MousePointerClick className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{stats.totalClicks}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">Cliques no quiz</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
            <Users className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{stats.totalLeads}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">Leads gerados</p>
          </div>
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-center">
            <TrendingUp className="h-4 w-4 text-green-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-green-400">{conversao}%</p>
            <p className="text-[10px] uppercase tracking-wide text-green-400/60 mt-0.5">Conversão</p>
          </div>
        </div>
      )}

      {/* Por origem */}
      {stats?.bySource && stats.bySource.length > 0 && (
        <div className="rounded-xl border border-border/30 bg-card/40 p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cliques por origem</p>
          <div className="space-y-2">
            {stats.bySource.map((s) => (
              <div key={s.source} className="flex items-center justify-between">
                <span className="text-xs text-foreground">{SOURCE_LABEL[s.source] || s.source}</span>
                <span className="text-xs font-bold text-[#D4A843]">{s.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats por plano */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Acesso Digital", count: leadStats.digital, cor: "border-blue-500/20 bg-blue-500/5 text-blue-400" },
          { label: "Observador", count: leadStats.observador, cor: "border-yellow-500/20 bg-yellow-500/5 text-yellow-400" },
          { label: "Mentoria VIP", count: leadStats.vip, cor: "border-[#D4A843]/20 bg-[#D4A843]/5 text-[#D4A843]" },
        ].map(({ label, count, cor }) => (
          <div key={label} className={`rounded-xl border p-3 text-center ${cor}`}>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-[10px] uppercase tracking-wide opacity-70 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      {leads.length === 0 ? (
        <div className="rounded-xl border border-border/30 bg-card/40 py-16 text-center">
          <p className="text-sm text-muted-foreground">Nenhum lead ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">Compartilhe o link do quiz na sua próxima palestra.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/30 bg-card/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-card/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">WhatsApp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resultado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ação</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => {
                  const res = RESULTADO_LABEL[lead.resultado];
                  const wppMsg = encodeURIComponent(
                    `Olá ${lead.nome.split(" ")[0]}! Vi que você fez o quiz da Ampla Facial e seu perfil indicou ${res?.label}. Quero te contar mais sobre essa formação!`
                  );
                  return (
                    <tr key={lead.id} className={`border-b border-border/20 hover:bg-card/60 transition-colors ${i % 2 === 0 ? "" : "bg-card/20"}`}>
                      <td className="px-4 py-3 font-medium text-foreground">{lead.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{lead.email}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{lead.whatsapp}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${res?.cor || "text-foreground"}`}>
                          {res?.label || lead.resultado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(lead.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, "")}?text=${wppMsg}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-lg bg-green-600/10 border border-green-600/20 px-2.5 py-1 text-xs font-medium text-green-400 hover:bg-green-600/20 transition-colors whitespace-nowrap"
                        >
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          Abordar
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
