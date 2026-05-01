import { useState } from "react";

/**
 * Limpa descrições copiadas do YouTube e similares:
 * - remove URLs longas com `?text=...` (links de wa.me com mensagem pré-preenchida)
 * - encolhe sequências de "—" / "_" / "=" usadas como separadores
 * - normaliza múltiplas quebras de linha
 * - remove espaços duplicados
 */
export function cleanDescription(raw: string): string {
  if (!raw) return "";
  let s = raw;

  // Remove URLs com query string longa (wa.me?text=, share, utm, etc)
  // mantém o domínio + caminho mas tira o texto enorme
  s = s.replace(/(https?:\/\/[^\s?]+)\?[^\s]{60,}/g, "$1");

  // Encolhe linhas separadoras (———, ___, ===) deixando uma quebra
  s = s.replace(/[\u2014\u2015\-_=]{4,}/g, "\n");

  // Normaliza quebras (no máx. 2 seguidas)
  s = s.replace(/\n{3,}/g, "\n\n");

  // Espaços duplicados
  s = s.replace(/[ \t]{2,}/g, " ");

  // Trim por linha
  s = s.split("\n").map((l) => l.trim()).join("\n").trim();

  return s;
}

function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gold underline hover:text-gold/80 break-all"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

interface DescriptionProps {
  text: string;
  className?: string;
  collapsedChars?: number;
}

/**
 * Renderiza descrição limpa com expandir/recolher.
 * Mostra só os primeiros `collapsedChars` (default 280) e oferece "Ler mais".
 */
export function Description({ text, className, collapsedChars = 280 }: DescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const cleaned = cleanDescription(text);
  if (!cleaned) return null;

  const isLong = cleaned.length > collapsedChars;
  const visible = expanded || !isLong ? cleaned : cleaned.slice(0, collapsedChars).trimEnd() + "…";

  return (
    <div className={className}>
      <p className="whitespace-pre-line break-words">{linkify(visible)}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs text-gold hover:text-gold/80 underline"
        >
          {expanded ? "Mostrar menos" : "Ler mais"}
        </button>
      )}
    </div>
  );
}
