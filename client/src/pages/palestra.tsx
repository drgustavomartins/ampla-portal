import { useState } from "react";
import { Loader2, CheckCircle2, Trophy, Sparkles, Instagram } from "lucide-react";
import { trackEvent } from "@/lib/funnel";

// ─── Paleta (inline p/ isolar do resto do app) ────────────────────────────────
const NAVY = "#14243d";
const NAVY_SOFT = "#1c3355";
const GOLD = "#D4A843";
const GOLD_DEEP = "#b8892f";
const CREAM = "#F8F7F4";

// WhatsApp acadêmico (formato internacional p/ wa.me): +55 (21) 97626-3881
const WHATSAPP_NUMERO = "5521976263881";

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
  const [waLink, setWaLink] = useState<string>("");

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

      // Monta a mensagem já preenchida para o WhatsApp acadêmico.
      const linhas = [
        "Olá! 👋 Vim pelo formulário da palestra e quero concorrer ao Acompanhamento VIP completo.",
        "",
        `*Nome:* ${form.nome.trim()}`,
      ];
      if (form.profissao) linhas.push(`*Profissão:* ${form.profissao}`);
      if (form.porque_merece.trim()) {
        linhas.push("");
        linhas.push("*Por que a Mentoria NaturalUp faz sentido pra mim neste momento:*");
        linhas.push(form.porque_merece.trim());
      }
      const wa = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(linhas.join("\n"))}`;
      setWaLink(wa);

      // Envia também ao Web3Forms (e-mail de aviso na hora + painel do Web3Forms).
      // keepalive:true garante que a requisição termine mesmo com o redirecionamento pro WhatsApp.
      try {
        fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          keepalive: true,
          body: JSON.stringify({
            access_key: "4a79d409-1ffb-480f-a20d-a7fd4d934ade",
            subject: "🎯 Nova inscrição — Sorteio Acompanhamento VIP",
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
      // Leva o aluno direto pra conversa no WhatsApp (após ver a confirmação por um instante).
      setTimeout(() => { try { window.location.href = wa; } catch {} }, 1400);
    } catch (e: any) {
      setErro(e?.message || "Não foi possível enviar. Tente novamente.");
      setEstado("form");
    }
  }

  // ─── Tela de sucesso ────────────────────────────────────────────────────────
  if (estado === "sucesso") {
    const WA_ICON = (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    );
    return (
      <div style={{ minHeight: "100vh", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: 520, width: "100%", textAlign: "center", color: CREAM }}>
          <div style={{ width: 76, height: 76, borderRadius: "50%", background: `${GOLD}22`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", border: `1.5px solid ${GOLD}` }}>
            <CheckCircle2 size={40} color={GOLD} />
          </div>
          <h1 style={{ fontFamily: "var(--font-serif, Georgia, serif)", fontSize: "clamp(26px, 7vw, 30px)", lineHeight: 1.2, marginBottom: 14, color: "#fff" }}>
            Inscrição confirmada!
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "#d7dce6", marginBottom: 8 }}>
            Você está concorrendo ao <strong style={{ color: GOLD }}>Acompanhamento VIP completo</strong> — 6 meses de mentoria individual.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "#aab4c6", marginBottom: 26 }}>
            Falta <strong style={{ color: "#e7ecf5" }}>1 passo</strong>: confirme sua participação no nosso WhatsApp acadêmico. Estamos te levando para lá agora...
          </p>

          <a href={waLink || `https://wa.me/${WHATSAPP_NUMERO}`} target="_blank" rel="noreferrer"
             style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#25D366", color: "#0b3d2c", padding: "16px 22px", borderRadius: 14, fontWeight: 800, fontSize: 16.5, textDecoration: "none", boxShadow: "0 10px 26px rgba(37,211,102,0.35)", maxWidth: 380, margin: "0 auto" }}>
            {WA_ICON} Abrir conversa no WhatsApp
          </a>
          <p style={{ fontSize: 12.5, color: "#8b96a8", marginTop: 12, marginBottom: 30 }}>
            Se o WhatsApp não abrir sozinho, toque no botão acima.
          </p>

          <div style={{ borderTop: `1px solid ${NAVY_SOFT}`, paddingTop: 24 }}>
            <p style={{ fontSize: 12.5, letterSpacing: 0.5, textTransform: "uppercase", color: "#8b96a8", marginBottom: 14 }}>
              Continue por perto
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="https://instagram.com/dr.gustavomartins" target="_blank" rel="noreferrer"
                 style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "#cdd4e0", border: `1px solid ${NAVY_SOFT}`, padding: "10px 16px", borderRadius: 10, fontWeight: 600, fontSize: 13.5, textDecoration: "none" }}>
                <Instagram size={16} /> @dr.gustavomartins
              </a>
              <a href="https://instagram.com/amplafacial" target="_blank" rel="noreferrer"
                 style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "#cdd4e0", border: `1px solid ${NAVY_SOFT}`, padding: "10px 16px", borderRadius: 10, fontWeight: 600, fontSize: 13.5, textDecoration: "none" }}>
                <Instagram size={16} /> @amplafacial
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
      <div style={{ background: NAVY, padding: "42px 24px 46px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% -20%, ${GOLD}22, transparent 60%)` }} />
        <div style={{ position: "relative" }}>
          <img src="/logo-palestra.png" alt="Ampla Facial" style={{ height: "clamp(76px, 20vw, 100px)", width: "auto", margin: "0 auto 22px", display: "block", filter: "drop-shadow(0 3px 12px rgba(0,0,0,0.28))" }}
               onError={(e) => { const t = e.currentTarget as HTMLImageElement; if (!t.dataset.fb) { t.dataset.fb = "1"; t.src = "/logo-transparent.png"; } else { t.style.display = "none"; } }} />
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: `${GOLD}1f`, border: `1px solid ${GOLD}55`, color: GOLD, padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, letterSpacing: 0.4, marginBottom: 18 }}>
            <Trophy size={14} /> SORTEIO EXCLUSIVO PARA PRESENTES
          </div>
          <h1 style={{ fontFamily: "var(--font-serif, Georgia, serif)", color: "#fff", fontSize: "clamp(24px, 6.4vw, 31px)", lineHeight: 1.25, margin: "0 auto 12px", maxWidth: 440 }}>
            Concorra ao <span style={{ color: GOLD }}>Acompanhamento VIP</span> completo
          </h1>
          <p style={{ color: "#b9c2d4", fontSize: 14.5, lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>
            Você acabou de assistir à palestra <strong style={{ color: "#e7ecf5" }}>NaturalUp®</strong>. O prêmio é o Acompanhamento VIP inteiro: 6 meses de mentoria individual, 16h de prática hands-on em pacientes modelo e o Método NaturalUp® completo. Preencha em 1 minuto para participar.
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
              <label style={labelStyle}>Qual o seu interesse no Acompanhamento VIP?</label>
              <select style={inputStyle} value={form.interesse_mentoria} onChange={(e) => set("interesse_mentoria", e.target.value)}>
                <option value="">Selecione...</option>
                {INTERESSE.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}40`, borderRadius: 12, padding: "14px 15px" }}>
              <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 7 }}>
                <Sparkles size={15} color={GOLD_DEEP} /> Em uma frase, por que você merece o Acompanhamento VIP?
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
              {enviando ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : <><Trophy size={18} /> Quero concorrer ao Acompanhamento VIP</>}
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
