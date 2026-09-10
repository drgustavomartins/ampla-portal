import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ─── ContractGate ────────────────────────────────────────────────────────────
// Se o aluno logado tiver um contrato com status 'pending' (emitido pelo admin),
// cobre o portal inteiro até que ele leia e assine. Admins nunca são bloqueados.

type PendingContract = { id: number; planKey: string; planName: string; html: string; createdAt: string };

const NAVY = "#0A1628";
const GOLD = "#D4A843";
const CREAM = "#EDE8DC";

function extractBody(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return m ? m[1] : html;
}

function normalize(v: string) {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function ContractGate() {
  const { user, isAdmin, logout } = useAuth();
  const { toast } = useToast();
  const [contract, setContract] = useState<PendingContract | null>(null);
  const [readToEnd, setReadToEnd] = useState(false);
  const [agree, setAgree] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setContract(null);
    if (!user || isAdmin) return;
    apiRequest("GET", "/api/contracts/pending")
      .then(r => r.json())
      .then(d => { if (!cancelled) setContract(d?.contract || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id, isAdmin]);

  const bodyHtml = useMemo(() => (contract ? extractBody(contract.html) : ""), [contract]);

  // Se o conteúdo couber sem rolagem, considera lido.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 24) setReadToEnd(true);
  }, [bodyHtml]);

  useEffect(() => {
    if (!contract) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [contract]);

  if (!contract) return null;

  const onScroll = () => {
    const el = scrollRef.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setReadToEnd(true);
  };

  const nameOk = typedName.trim().split(/\s+/).length >= 2 && typedName.trim().length >= 5;
  const nameMatches = !user?.name || normalize(user.name).split(" ")[0] === normalize(typedName).split(" ")[0];
  const canSign = readToEnd && agree && nameOk && !submitting;

  const printCopy = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(contract.html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const sign = async () => {
    if (!canSign) return;
    if (!nameMatches && !window.confirm("O nome digitado é diferente do nome do seu cadastro. Deseja assinar mesmo assim?")) return;
    setSubmitting(true);
    try {
      await apiRequest("POST", `/api/contracts/${contract.id}/sign`, { agree: true, typedName });
      toast({ title: "Contrato assinado ✓", description: "Uma cópia foi enviada para o seu e-mail. Bons estudos!" });
      setContract(null);
    } catch (e: any) {
      const msg = String(e?.message || "").replace(/^\d+:\s*/, "");
      let text = "Não foi possível assinar agora. Tente novamente.";
      try { text = JSON.parse(msg).message || text; } catch {}
      toast({ title: "Erro", description: text, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Assinatura de contrato"
      style={{ position: "fixed", inset: 0, zIndex: 2147483000, background: NAVY, display: "flex", flexDirection: "column" }}
    >
      <style>{`
        .ctr-doc{font-family:Georgia,serif;color:#222;line-height:1.7;font-size:14px}
        .ctr-doc h1{text-align:center;font-size:18px;margin:0 0 4px;color:${NAVY}}
        .ctr-doc h2{font-size:15px;color:${NAVY};margin-top:26px;border-bottom:1px solid #ddd;padding-bottom:6px}
        .ctr-doc p{margin:8px 0;text-align:justify}
        .ctr-doc ul{padding-left:22px;margin:8px 0;list-style:disc}
        .ctr-doc li{margin:4px 0}
        .ctr-doc strong{color:${NAVY}}
        .ctr-doc small{color:#666}
        @media (max-width:640px){.ctr-doc div[style*="justify-content:space-between"]{flex-direction:column;gap:24px}}
      `}</style>

      {/* Cabeçalho */}
      <div style={{ padding: "18px 20px 12px", color: CREAM, maxWidth: 820, width: "100%", margin: "0 auto" }}>
        <p style={{ color: GOLD, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>Antes de começar</p>
        <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, margin: "4px 0 2px", color: "#fff" }}>
          Seu contrato — {contract.planName}
        </h2>
        <p style={{ fontSize: 13, opacity: 0.75, margin: 0 }}>
          Leia até o final, digite seu nome completo e confirme para liberar o acesso às aulas.
        </p>
      </div>

      {/* Documento */}
      <div style={{ flex: 1, minHeight: 0, padding: "0 12px", maxWidth: 820, width: "100%", margin: "0 auto" }}>
        <div
          ref={scrollRef}
          onScroll={onScroll}
          style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", background: "#fff", borderRadius: 12, padding: "24px 22px" }}
        >
          <div className="ctr-doc" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </div>
      </div>

      {/* Assinatura */}
      <div style={{ padding: "14px 20px 18px", maxWidth: 820, width: "100%", margin: "0 auto", color: CREAM, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        {!readToEnd && (
          <p style={{ fontSize: 12, color: GOLD, margin: "0 0 10px" }}>↓ Role o contrato até o final para habilitar a assinatura.</p>
        )}
        <input
          type="text"
          value={typedName}
          onChange={e => setTypedName(e.target.value)}
          disabled={!readToEnd}
          placeholder="Digite seu nome completo"
          autoComplete="name"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${GOLD}66`, background: "#0D1E35", color: "#fff", fontSize: 15, outline: "none", opacity: readToEnd ? 1 : 0.5 }}
        />
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 12, fontSize: 13, lineHeight: 1.5, opacity: readToEnd ? 1 : 0.5, cursor: readToEnd ? "pointer" : "default" }}>
          <input type="checkbox" checked={agree} disabled={!readToEnd} onChange={e => setAgree(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18, accentColor: GOLD }} />
          <span>Li e concordo com todos os termos deste contrato e reconheço esta assinatura eletrônica como válida.</span>
        </label>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={sign}
            disabled={!canSign}
            style={{ flex: "1 1 220px", padding: "13px 18px", borderRadius: 10, border: "none", background: canSign ? GOLD : `${GOLD}55`, color: NAVY, fontWeight: 700, fontSize: 15, cursor: canSign ? "pointer" : "not-allowed" }}
          >
            {submitting ? "Assinando..." : "Assinar e acessar o portal"}
          </button>
          <button onClick={printCopy} style={{ padding: "13px 14px", borderRadius: 10, border: `1px solid ${CREAM}44`, background: "transparent", color: CREAM, fontSize: 13, cursor: "pointer" }}>
            Imprimir / salvar PDF
          </button>
          <button onClick={() => logout()} style={{ padding: "13px 6px", border: "none", background: "transparent", color: CREAM, opacity: 0.6, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}

export default ContractGate;
