import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar, Clock, Video, Users, Award, Sparkles, ChevronLeft,
  PlayCircle, FileText, Lock, CheckCircle2, Coins,
} from "lucide-react";

interface CaseDiscussed {
  id: number;
  title: string;
  summary: string | null;
  tags: string[];
}

interface UpcomingEvent {
  id: number;
  title: string;
  description: string | null;
  theme: string | null;
  eventDate: string;
  durationMinutes: number;
  meetLink: string | null;
  status: string;
}

interface PastEvent {
  id: number;
  title: string;
  theme: string | null;
  eventDate: string;
  recordingUrl: string | null;
  cases: CaseDiscussed[];
  attendeesCount: number;
}

interface CreditHistoryRow {
  id: number;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  creditsAwarded: number;
  cameraOn: boolean;
  activeParticipation: boolean;
  note: string | null;
}

interface AcompanhamentoResponse {
  hasAccess: boolean;
  userPlanKey: string | null;
  upcoming: UpcomingEvent[];
  past: PastEvent[];
  creditsHistory: CreditHistoryRow[];
  stats: {
    totalCreditsFromEvents: number;
    totalAttended: number;
  };
}

function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string): { date: string; time: string; weekday: string; monthShort: string; day: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    weekday: d.toLocaleDateString("pt-BR", { weekday: "long" }),
    monthShort: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase(),
    day: d.toLocaleDateString("pt-BR", { day: "2-digit" }),
  };
}

function minutesUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

export default function AcompanhamentoPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery<AcompanhamentoResponse>({
    queryKey: ["/api/acompanhamento"],
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A0D14] to-[#1B2236] p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Lock className="w-12 h-12 text-[#D4A843] mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Acesso restrito</h2>
            <p className="text-gray-600 mb-6">Faça login para ver os encontros de Acompanhamento.</p>
            <Link href="/login">
              <Button className="w-full" style={{ backgroundColor: "#0A0D14", color: "#D4A843" }}>
                Entrar
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A0D14] to-[#1B2236]">
        <div className="text-[#D4A843] animate-pulse">Carregando Acompanhamento…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A0D14] to-[#1B2236]">
        <div className="text-white/70">Não foi possível carregar agora. Tente novamente em instantes.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0D14] via-[#0F1420] to-[#1B2236] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
              <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-[#D4A843]">
            <Sparkles className="w-5 h-5" />
            <span className="font-semibold text-sm">Acompanhamento</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Hero */}
        <section className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ fontFamily: "'EB Garamond', serif" }}>
            Acompanhamento ao vivo
          </h1>
          <p className="text-white/60 max-w-2xl leading-relaxed">
            Aulonas quinzenais em grupo com Dr. Gustavo — aprofundamento teórico, discussão de casos
            clínicos e tira-dúvidas. Participação ativa rende créditos na plataforma.
          </p>
        </section>

        {/* Gate: sem acesso */}
        {!data.hasAccess && (
          <Card className="mb-8 border-amber-200 bg-amber-50/90 backdrop-blur">
            <CardContent className="p-6 sm:p-7 flex flex-col md:flex-row md:items-center gap-5">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-amber-900 font-semibold mb-2">
                  <Lock className="w-4 h-4" />
                  Plano sem acesso às sessões ao vivo
                </div>
                <p className="text-sm text-amber-900/80 leading-relaxed">
                  O Acompanhamento quinzenal é benefício dos planos a partir do Observador. Seu
                  plano atual dá acesso somente às aulas gravadas e materiais.
                </p>
              </div>
              <Link href="/#/planos">
                <Button className="whitespace-nowrap" style={{ backgroundColor: "#0A0D14", color: "#D4A843" }}>
                  Ver planos com acompanhamento
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <Card className="bg-white/5 border-white/10 backdrop-blur">
            <CardContent className="p-5">
              <div className="text-xs text-white/50 mb-1 uppercase tracking-wider">Próximos encontros</div>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#D4A843]" />
                {data.upcoming.length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur">
            <CardContent className="p-5">
              <div className="text-xs text-white/50 mb-1 uppercase tracking-wider">Encontros participados</div>
              <div className="text-2xl font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                {data.stats.totalAttended}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#D4A843]/20 to-[#D4A843]/5 border-[#D4A843]/30 backdrop-blur">
            <CardContent className="p-5">
              <div className="text-xs text-[#D4A843] mb-1 uppercase tracking-wider">Créditos ganhos</div>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#D4A843]" />
                {formatBRL(data.stats.totalCreditsFromEvents)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Próximos encontros */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#D4A843]" />
            Próximos encontros
          </h2>
          {data.upcoming.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 text-center text-white/50">
                Nenhum encontro agendado no momento.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {data.upcoming.map((event) => {
                const dt = formatDate(event.eventDate);
                const minsUntil = minutesUntil(event.eventDate);
                const isLive = event.status === "live" || (minsUntil >= -30 && minsUntil <= event.durationMinutes);
                const isSoon = minsUntil > 0 && minsUntil < 60 * 24;
                return (
                  <Card key={event.id} className="bg-white/5 border-white/10 hover:border-[#D4A843]/30 transition">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row gap-5">
                        {/* Date block */}
                        <div className="flex-shrink-0 flex sm:flex-col items-center sm:items-center gap-3 sm:gap-0 w-full sm:w-20">
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#D4A843]/20 to-transparent border border-[#D4A843]/30 flex flex-col items-center justify-center">
                            <div className="text-[10px] text-[#D4A843] uppercase font-semibold tracking-wider">{dt.monthShort}</div>
                            <div className="text-2xl font-bold text-white leading-none">{dt.day}</div>
                          </div>
                          <div className="sm:mt-2 text-xs text-white/50 text-center">
                            {dt.weekday}<br />{dt.time}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-white">{event.title}</h3>
                            <div className="flex gap-2 shrink-0">
                              {isLive && (
                                <Badge className="bg-red-500 text-white gap-1.5">
                                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> AO VIVO
                                </Badge>
                              )}
                              {!isLive && isSoon && (
                                <Badge className="bg-amber-500 text-black">Em breve</Badge>
                              )}
                              {event.theme && (
                                <Badge variant="outline" className="border-white/20 text-white/70">
                                  {event.theme}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {event.description && (
                            <p className="text-sm text-white/60 mb-3 leading-relaxed">{event.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-white/50 mb-4">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> {event.durationMinutes} min
                            </span>
                          </div>
                          {data.hasAccess && event.meetLink ? (
                            <a href={event.meetLink} target="_blank" rel="noopener noreferrer">
                              <Button
                                className="gap-2"
                                style={{ backgroundColor: isLive ? "#DC2626" : "#D4A843", color: isLive ? "white" : "#0A0D14" }}
                              >
                                <Video className="w-4 h-4" />
                                {isLive ? "Entrar agora" : "Entrar no encontro"}
                              </Button>
                            </a>
                          ) : !data.hasAccess ? (
                            <Button disabled variant="outline" className="gap-2 border-white/20 text-white/50">
                              <Lock className="w-4 h-4" /> Plano sem acesso
                            </Button>
                          ) : (
                            <div className="text-xs text-white/40 italic">Link do encontro será disponibilizado em breve.</div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Histórico de créditos */}
        {data.creditsHistory.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#D4A843]" />
              Seus créditos por participação
            </h2>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  {data.creditsHistory.map((row) => {
                    const dt = formatDate(row.eventDate);
                    return (
                      <div key={row.id} className="p-4 sm:p-5 flex items-center gap-4 hover:bg-white/5 transition">
                        <div className="w-11 h-11 rounded-full bg-[#D4A843]/10 border border-[#D4A843]/30 flex items-center justify-center shrink-0">
                          <Coins className="w-5 h-5 text-[#D4A843]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{row.eventTitle}</div>
                          <div className="text-xs text-white/50 flex items-center gap-2 flex-wrap">
                            <span>{dt.date}</span>
                            {row.cameraOn && <span className="text-emerald-400">• câmera aberta</span>}
                            {row.activeParticipation && <span className="text-emerald-400">• participação ativa</span>}
                          </div>
                          {row.note && <div className="text-xs text-white/40 italic mt-1">"{row.note}"</div>}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[#D4A843] font-bold tabular-nums">+{formatBRL(row.creditsAwarded)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Encontros passados com casos */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-[#D4A843]" />
            Encontros anteriores
          </h2>
          {data.past.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 text-center text-white/50">
                Nenhum encontro anterior registrado ainda.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {data.past.map((event) => {
                const dt = formatDate(event.eventDate);
                return (
                  <Card key={event.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-1">{event.title}</h3>
                          <div className="flex items-center gap-3 text-xs text-white/50">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" /> {dt.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" /> {event.attendeesCount} participantes
                            </span>
                          </div>
                        </div>
                        {event.theme && (
                          <Badge variant="outline" className="border-white/20 text-white/70">{event.theme}</Badge>
                        )}
                      </div>

                      {event.cases.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" /> Casos discutidos
                          </div>
                          <div className="grid gap-2">
                            {event.cases.map((c) => (
                              <div key={c.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                                <div className="text-sm font-medium text-white mb-0.5">{c.title}</div>
                                {c.summary && <div className="text-xs text-white/60 leading-relaxed">{c.summary}</div>}
                                {c.tags && c.tags.length > 0 && (
                                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                    {c.tags.map((t, i) => (
                                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-[#D4A843]/15 text-[#D4A843]">
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {data.hasAccess && event.recordingUrl ? (
                        <a href={event.recordingUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-2 border-white/20 text-white hover:bg-white/10">
                            <PlayCircle className="w-4 h-4" /> Ver gravação
                          </Button>
                        </a>
                      ) : !data.hasAccess && event.recordingUrl ? (
                        <Button disabled variant="outline" size="sm" className="gap-2 border-white/20 text-white/40">
                          <Lock className="w-4 h-4" /> Gravação exclusiva para planos com acompanhamento
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer nota */}
        <div className="text-center text-xs text-white/30 mt-16">
          Os encontros são quinzenais, às quartas-feiras 10h. Créditos expiram 6 meses após a data do encontro.
        </div>
      </main>
    </div>
  );
}
