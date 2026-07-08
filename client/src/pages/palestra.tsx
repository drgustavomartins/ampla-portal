import { useState } from "react";
import { Loader2, CheckCircle2, Trophy, Sparkles, Instagram } from "lucide-react";
import { trackEvent } from "@/lib/funnel";

// ─── Paleta (inline p/ isolar do resto do app) ────────────────────────────────
const NAVY = "#14243d";
const NAVY_SOFT = "#1c3355";
const GOLD = "#D4A843";
const GOLD_DEEP = "#b8892f";
const CREAM = "#F8F7F4";

const PROFISSOES = [
  "Cirurgião(ã)-dentista",
  "Biomédico(a)",
  "Farmacêutico(a)",
  "Enfermeiro(a)",
  "Médico(a)",
  "Fisioterapeuta",
  "Estudante",
  "Outro",
];

const TEMPO_ATUACAO = [
  "Ainda não atuo",
  "Menos de 1 ano",
  "1 a 3 anos",
  "3 a 5 anos",
  "Mais de 5 anos",
];

const REALIZA = [
  "Ainda não realizo",
  "Sim, ocasionalmente",
  "Sim, regularmente",
];

const INTERESSE = [
  "Quero muito — é minha prioridade agora",
  "Tenho interesse e quero entender melhor",
  "Estou apenas conhecendo por enquanto",
];

type Estado = "form" | "enviando" | "sucesso";

export default function PalestraPage() {
  const [estado, setEstado] = useState<Estado>("form");
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: "",
    whatsapp: "",
    email: "",
    profissao: "",
    cidade_estado: "",
    tempo_atuacao: "",
    realiza_procedimentos: "",
    maior_desafio: "",
    destaque_palestra: "",
    interesse_mentoria: "",
    porque_merece: "",
    aceite_contato: false,
  });

  const set = (campo: string, valor: string | boolean) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  async function enviar() {
    setErro(null);

    if (!form.nome.trim() || !form.whatsapp.trim() || !form.email.trim()) {
      setErro("Preencha nome, WhatsApp e e-mail para participar.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setErro("Confira o seu e-mail — parece estar incompleto.");
      return;
    }
    if (!form.aceite_contato) {
      setErro("Marque a autorização de contato para concorrer ao sorteio.");
      return;
    }

    setEstado("enviando");
    try {
      const res = await fetch("/api/palestra-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Falha ao enviar. Tente novamente.");
      }
      // Envia também ao Web3Forms (e-mail de aviso na hora + painel do Web3Forms).
      // Feito direto do navegador do aluno, que passa pela proteção Cloudflare de forma
      // transparente. Fire-and-forget: nunca bloqueia nem quebra a confirmação da inscrição.
      try {
        fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            access_key: "4a79d409-1ffb-480f-a20d-a7fd4d934ade",
            subject: "🎯 Nova inscrição — Sorteio Mentoria VIP NaturalUp",
            from_name: "Portal Ampla Facial",
            name: form.nome.trim(),
            email: form.email.trim().toLowerCase(),
            WhatsApp: form.whatsapp.trim(),
            "Profissão": form.profissao || "—",
            "Cidade/Estado": form.cidade_estado || "—",
            "Tempo de atuação": form.tempo_atuacao || "—",
            "Realiza procedimentos": form.realiza_procedimentos || "—",
            "Maior desafio": form.maior_desafio || "—",
            "O que mais marcou na palestra": form.destaque_palestra || "—",
            "Interesse na mentoria": form.interesse_mentoria || "—",
            "Por que merece a vaga": form.porque_merece || "—",
            Evento: "Palestra NaturalUp",
          }),
        }).catch(() => {});
      } catch {}

      try {
        trackEvent("palestra_lead", { profissao: form.profissao }, form.email.trim().toLowerCase());
      } catch {}
      setEstado("sucesso");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setErro(e?.message || "Não foi possível enviar. Tente novamente.");
      setEstado("form");
    }
  }

  // ─── Tela de sucesso ────────────────────────────────────────────────────────
  if (estado === "sucesso") {
    return (
      <div style={{ minHeight: "100vh", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: 520, width: "100%", textAlign: "center", color: CREAM }}>
          <div style={{ width: 76, height: 76, borderRadius: "50%", background: `${GOLD}22`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", border: `1.5px solid ${GOLD}` }}>
            <CheckCircle2 size={40} color={GOLD} />
          </div>
          <h1 style={{ fontFamily: "var(--font-serif, Georgia, serif)", fontSize: 30, lineHeight: 1.2, marginBottom: 14, color: "#fff" }}>
            Inscrição confirmada!
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "#d7dce6", marginBottom: 8 }}>
            Você está concorrendo à <strong style={{ color: GOLD }}>Mentoria VIP NaturalUp® individual</strong>.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "#aab4c6", marginBottom: 32 }}>
            O resultado e as próximas oportunidades chegam pelo seu WhatsApp e e-mail. Fique de olho. 👀
          </p>

          <div style={{ borderTop: `1px solid ${NAVY_SOFT}`, paddingTop: 26 }}>
            <p style={{ fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase", color: GOLD, marginBottom: 16 }}>
              Continue por perto
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="https://instagram.com/dr.gustavomartins" target="_blank" rel="noreferrer"
                 style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: NAVY, padding: "11px 18px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                <Instagram size={17} /> @dr.gustavomartins
              </a>
              <a href="https://instagram.com/amplafacial" target="_blank" rel="noreferrer"
                 style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "#fff", border: `1px solid ${GOLD}`, padding: "11px 18px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                <Instagram size={17} /> @amplafacial
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Formulário ─────────────────────────────────────────────────────────────
  const enviando = estado === "enviando";

  const labelStyle: React.CSSProperties = { display: "block", fontSize: 13.5, fontWeight: 600, color: NAVY, marginBottom: 7 };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e3e0d8",
    background: "#fff", fontSize: 15, color: NAVY, outline: "none", boxSizing: "border-box",
    fontFamily: "inherit",
  };
  const req = <span style={{ color: GOLD_DEEP }}>*</span>;

  return (
    <div style={{ minHeight: "100vh", background: CREAM, paddingBottom: 48 }}>
      {/* Cabeçalho */}
      <div style={{ background: NAVY, padding: "34px 24px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% -20%, ${GOLD}22, transparent 60%)` }} />
        <div style={{ position: "relative" }}>
          <img src="/logo-transparent.png" alt="Ampla Facial" style={{ height: 46, margin: "0 auto 20px", display: "block" }}
               onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: `${GOLD}1f`, border: `1px solid ${GOLD}55`, color: GOLD, padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, letterSpacing: 0.4, marginBottom: 18 }}>
            <Trophy size={14} /> SORTEIO EXCLUSIVO PARA PRESENTES
          </div>
          <h1 style={{ fontFamily: "var(--font-serif, Georgia, serif)", color: "#fff", fontSize: 27, lineHeight: 1.25, margin: "0 auto 12px", maxWidth: 440 }}>
            Concorra a uma <span style={{ color: GOLD }}>Mentoria VIP NaturalUp®</span> individual
          </h1>
          <p style={{ color: "#b9c2d4", fontSize: 14.5, lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>
            Você acabou de assistir à palestra <strong style={{ color: "#e7ecf5" }}>NaturalUp®</strong>. Preencha em 1 minuto para participar do sorteio e receber conteúdos exclusivos do Dr. Gustavo Martins.
          </p>
        </div>
      </div>

      {/* Card do formulário */}
      <div style={{ maxWidth: 560, margin: "-20px auto 0", padding: "0 18px" }}>
        <div style={{ background: "#fff", borderRadius: 18, padding: "26px 22px", boxShadow: "0 12px 40px rgba(20,36,61,0.12)", border: "1px solid #efece4" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            <div>
              <label style={labelStyle}>Nome completo {req}</label>
              <input style={inputStyle} value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Seu nome" autoComplete="name" />
            </div>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px" }}>
                <label style={labelStyle}>WhatsApp (com DDD) {req}</label>
                <input style={inputStyle} value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="(21) 99999-9999" inputMode="tel" autoComplete="tel" />
              </div>
              <div style={{ flex: "1 1 200px" }}>
                <label style={labelStyle}>E-mail {req}</label>
                <input style={inputStyle} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="voce@email.com" inputMode="email" autoComplete="email" />
              </div>
            </div>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px" }}>
                <label style={labelStyle}>Profissão</label>
                <select style={inputStyle} value={form.profissao} onChange={(e) => set("profissao", e.target.value)}>
                  <option value="">Selecione...</option>
                  {PROFISSOES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ flex: "1 1 200px" }}>
                <label style={labelStyle}>Cidade / Estado</label>
                <input style={inputStyle} value={form.cidade_estado} onChange={(e) => set("cidade_estado", e.target.value)} placeholder="Rio de Janeiro / RJ" />
              </div>
            </div>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px" }}>
                <label style={labelStyle}>Há quanto tempo atua com estética / HOF?</label>
                <select style={inputStyle} value={form.tempo_atuacao} onChange={(e) => set("tempo_atuacao", e.target.value)}>
                  <option value="">Selecione...</option>
                  {TEMPO_ATUACAO.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ flex: "1 1 200px" }}>
                <label style={labelStyle}>Já realiza procedimentos injetáveis?</label>
                <select style={inputStyle} value={form.realiza_procedimentos} onChange={(e) => set("realiza_procedimentos", e.target.value)}>
                  <option value="">Selecione...</option>
                  {REALIZA.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Qual é o seu maior desafio hoje na estética facial?</label>
              <textarea style={{ ...inputStyle, minHeight: 68, resize: "vertical" }} value={form.maior_desafio} onChange={(e) => set("maior_desafio", e.target.value)} placeholder="Escreva livremente..." />
            </div>

            <div>
              <label style={labelStyle}>O que mais te marcou na palestra de hoje?</label>
              <textarea style={{ ...inputStyle, minHeight: 68, resize: "vertical" }} value={form.destaque_palestra} onChange={(e) => set("destaque_palestra", e.target.value)} placeholder="Um insight, um momento, uma ideia..." />
            </div>

            <div>
              <label style={labelStyle}>Qual o seu interesse na Mentoria VIP NaturalUp®?</label>
              <select style={inputStyle} value={form.interesse_mentoria} onChange={(e) => set("interesse_mentoria", e.target.value)}>
                <option value="">Selecione...</option>
                {INTERESSE.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}40`, borderRadius: 12, padding: "14px 15px" }}>
              <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 7 }}>
                <Sparkles size={15} color={GOLD_DEEP} /> Em uma frase, por que você merece a Mentoria VIP?
              </label>
              <textarea style={{ ...inputStyle, minHeight: 62, resize: "vertical", borderColor: `${GOLD}66` }} value={form.porque_merece} onChange={(e) => set("porque_merece", e.target.value)} placeholder="Conte pro Dr. Gustavo por que essa mentoria é pra você." />
            </div>

            {/* Consentimento LGPD */}
            <label style={{ display: "flex", gap: 11, alignItems: "flex-start", cursor: "pointer", fontSize: 13, color: "#556", lineHeight: 1.5 }}>
              <input type="checkbox" checked={form.aceite_contato} onChange={(e) => set("aceite_contato", e.target.checked)}
                     style={{ width: 19, height: 19, marginTop: 1, accentColor: GOLD_DEEP, flexShrink: 0 }} />
              <span>
                Autorizo o Dr. Gustavo Martins e a Ampla Facial a entrarem em contato comigo por WhatsApp e e-mail com conteúdos, novidades e oportunidades. Concordo com a{" "}
                <a href="/#/privacidade" target="_blank" rel="noreferrer" style={{ color: GOLD_DEEP, fontWeight: 600 }}>Política de Privacidade</a>. {req}
              </span>
            </label>

            {erro && (
              <div style={{ background: "#fdecec", border: "1px solid #f5c2c2", color: "#a13a3a", padding: "11px 14px", borderRadius: 10, fontSize: 13.5 }}>
                {erro}
              </div>
            )}

            <button onClick={enviar} disabled={enviando}
              style={{
                width: "100%", padding: "15px", borderRadius: 12, border: "none",
                background: enviando ? GOLD_DEEP : `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`,
                color: NAVY, fontWeight: 700, fontSize: 16, cursor: enviando ? "wait" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                boxShadow: `0 8px 22px ${GOLD}55`, opacity: enviando ? 0.85 : 1, fontFamily: "inherit",
              }}>
              {enviando ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : <><Trophy size={18} /> Quero concorrer à Mentoria VIP</>}
            </button>

            <p style={{ fontSize: 11.5, color: "#9aa", textAlign: "center", lineHeight: 1.5, margin: 0 }}>
              Seus dados ficam protegidos e são usados apenas pela Ampla Facial. Você pode pedir a remoção a qualquer momento.
            </p>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#a7a49b", marginTop: 20 }}>
          Método NaturalUp® · Dr. Gustavo Medeiros Martins · Ampla Facial
        </p>
      </div>
    </div>
  );
}
