import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface FunnelEvent {
  event: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface FunnelSession {
  session_id: string;
  email: string | null;
  events: FunnelEvent[];
  first_seen: string;
  last_seen: string;
}

// Ordem e label de cada etapa do funil
const ETAPAS = [
  { key: "banner_click",   label: "Clicou no banner",    cor: "bg-blue-500",   icon: "👆" },
  { key: "quiz_start",     label: "Iniciou o quiz",      cor: "bg-purple-500", icon: "🧩" },
  { key: "quiz_complete",  label: "Completou o quiz",    cor: "bg-yellow-500", icon: "✅" },
  { key: "lead_capture",   label: "Deixou os dados",     cor: "bg-orange-500", icon: "📋" },
  { key: "plan_click",     label: "Clicou em um plano",  cor: "bg-green-500",  icon: "💳" },
];

const RESULTADO_LABEL: Record<string, string> = {
  digital:    "Acesso Digital",
  observador: "Observador",
  vip:        "Mentoria VIP",
};

function SessionRow({ session }: { session: FunnelSession }) {
  const eventKeys = new Set(session.events.map((e) => e.event));
  const ultimoResultado = session.events
    .filter((e) => e.event === "quiz_complete")
    .at(-1)?.metadata?.resultado as string | undefined;

  const ultimaEtapa = [...ETAPAS].reverse().find((e) => eventKeys.has(e.key));
  const abandonou = ultimaEtapa && ultimaEtapa.key !== "plan_click";

  return (
    <div className="rounded-xl border border-border/30 bg-card/40 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm font-medium text-foreground">
            {session.email || <span className="text-muted-foreground italic">Anônimo</span>}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {new Date(session.first_seen).toLocaleString("pt-BR", {
              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ultimoResultado && (
            <span className="text-[10px] rounded-full border border-[#D4A843]/30 bg-[#D4A843]/10 px-2 py-0.5 text-[#D4A843]">
              {RESULTADO_LABEL[ultimoResultado] || ultimoResultado}
            </span>
          )}
          {abandonou && (
            <span className="text-[10px] rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-red-400">
              Abandonou em: {ultimaEtapa.label}
            </span>
          )}
          {eventKeys.has("plan_click") && (
            <span className="text-[10px] rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-green-400">
              Funil completo ✓
            </span>
          )}
        </div>
      </div>

      {/* Linha do tempo */}
      <div className="flex items-center gap-0">
        {ETAPAS.map((etapa, i) => {
          const atingiu = eventKeys.has(etapa.key);
          const isLast = i === ETAPAS.length - 1;
          return (
            <div key={etapa.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                  atingiu ? etapa.cor + " text-white shadow-md" : "bg-card border border-border/40 text-muted-foreground/30"
                }`}>
                  {etapa.icon}
                </div>
                <span className={`text-[8px] text-center leading-tight max-w-[56px] ${
                  atingiu ? "text-foreground" : "text-muted-foreground/30"
                }`}>
                  {etapa.label}
                </span>
              </div>
              {!isLast && (
                <div className={`h-0.5 w-full mx-1 mb-4 rounded-full transition-all ${
                  eventKeys.has(ETAPAS[i + 1]?.key) ? "bg-[#D4A843]/40" : "bg-border/20"
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FunnelTab() {
  const { data, isLoading } = useQuery<{ sessions: FunnelSession[] }>({
    queryKey: ["/api/admin/funnel"],
    queryFn: () => apiRequest("GET", "/api/admin/funnel").then((r) => r.json()),
    refetchInterval: 30000, // atualiza a cada 30s
  });

  const sessions = data?.sessions || [];

  // Calcular métricas do funil
  const total = sessions.length;
  const metrics = ETAPAS.map((etapa) => ({
    ...etapa,
    count: sessions.filter((s) => s.events.some((e) => e.event === etapa.key)).length,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Funil por visitante</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {total} sessão{total !== 1 ? "ões" : ""} — atualiza automaticamente a cada 30 segundos
        </p>
      </div>

      {/* Funil macro */}
      {total > 0 && (
        <div className="rounded-xl border border-border/30 bg-card/40 p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Visão geral do funil</p>
          <div className="space-y-2">
            {metrics.map((m, i) => {
              const pct = total > 0 ? Math.round((m.count / total) * 100) : 0;
              const dropoff = i > 0 ? metrics[i - 1].count - m.count : 0;
              return (
                <div key={m.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-foreground">
                      {m.icon} {m.label}
                    </span>
                    <span className="flex items-center gap-3">
                      {i > 0 && dropoff > 0 && (
                        <span className="text-red-400/70 text-[10px]">-{dropoff} saíram aqui</span>
                      )}
                      <span className="font-bold text-foreground">{m.count}</span>
                      <span className="text-muted-foreground w-8 text-right">{pct}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-border/20">
                    <div
                      className={`h-1.5 rounded-full ${m.cor} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista por sessão */}
      {sessions.length === 0 ? (
        <div className="rounded-xl border border-border/30 bg-card/40 py-16 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm text-muted-foreground">Nenhum dado ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">O funil começa a popular assim que alguém clicar no banner do quiz.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por visitante</p>
          {sessions.map((s) => (
            <SessionRow key={s.session_id} session={s} />
          ))}
        </div>
      )}
    </div>
  );
}
