import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, FileText, FileIcon, Headphones, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ExternalLink, Eye, X, Loader2, Lock, Play,
} from "lucide-react";

/* ───────── Types ───────── */

type FileEntry = {
  id: number;
  name: string;
  type: "pdf" | "docx" | "mp3";
  driveId: string;
  youtubeId?: string | null;
  order: number;
};

type Subcategory = {
  id: number;
  name: string;
  order: number;
  files: FileEntry[];
};

type Theme = {
  id: number;
  title: string;
  coverUrl: string;
  order: number;
  fileCount: number;
  subcategories: Subcategory[];
};

/* ───────── Helpers ───────── */

function driveViewUrl(id: string) {
  return `https://drive.google.com/file/d/${id}/view`;
}
function driveDownloadUrl(id: string) {
  return `https://drive.google.com/uc?export=download&id=${id}`;
}
function drivePreviewUrl(id: string) {
  return `https://drive.google.com/file/d/${id}/preview`;
}

function FileTypeIcon({ type }: { type: FileEntry["type"] }) {
  switch (type) {
    case "pdf":
      return <FileText className="w-4 h-4 text-red-400 shrink-0" />;
    case "mp3":
      return <Headphones className="w-4 h-4 text-emerald-400 shrink-0" />;
    case "docx":
      return <FileIcon className="w-4 h-4 text-blue-400 shrink-0" />;
  }
}

function TypeLabel({ type }: { type: FileEntry["type"] }) {
  const labels: Record<FileEntry["type"], string> = { pdf: "PDF", mp3: "MP3", docx: "DOCX" };
  const colors: Record<FileEntry["type"], string> = {
    pdf: "bg-red-500/15 text-red-400 border-red-500/20",
    mp3: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    docx: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  };
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${colors[type]}`}>
      {labels[type]}
    </Badge>
  );
}

/* ───────── Thumbnail helper ───────── */

function getFileThumbnail(file: FileEntry): string | null {
  if (file.type === "mp3" && file.youtubeId) {
    return `https://img.youtube.com/vi/${file.youtubeId}/mqdefault.jpg`;
  }
  if (file.type === "pdf") {
    return `https://lh3.googleusercontent.com/d/${file.driveId}=w200`;
  }
  return null;
}

function FileThumbnail({ file }: { file: FileEntry }) {
  const thumb = getFileThumbnail(file);
  const [imgError, setImgError] = useState(false);

  if (!thumb || imgError) {
    return <FileTypeIcon type={file.type} />;
  }

  return (
    <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden ring-1 ring-border/20 bg-card/60 relative group/thumb">
      <img
        src={thumb}
        alt=""
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => setImgError(true)}
      />
      {file.type === "mp3" && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
          <Play className="w-3.5 h-3.5 text-white ml-0.5 drop-shadow-md" />
        </div>
      )}
    </div>
  );
}

/* ───────── Components ───────── */

const TRIAL_FREE_MATERIAL_DRIVE_ID = "1AURBQNKIsduh6EBJV1uUfsgkaipm2qry"; // Compilado Toxina Botulínica — Ampla Facial

function FileRow({ file, trialLocked = false }: { file: FileEntry; trialLocked?: boolean }) {
  const [pdfOpen, setPdfOpen] = useState(false);
  const showDownload = file.type !== "mp3";

  if (trialLocked) {
    return (
      <div className="group py-3 px-3 rounded-lg opacity-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm text-muted-foreground leading-snug">{file.name}</span>
          </div>
          <a
            href="https://wa.me/5521976310365"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-yellow-500 hover:text-yellow-400 shrink-0 font-medium"
          >
            Assinar
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="group py-3 px-3 rounded-lg hover:bg-white/[0.03] transition-colors">
      <div className="flex items-start gap-3">
        <FileThumbnail file={file} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-foreground/90 leading-snug">{file.name}</span>
            <TypeLabel type={file.type} />
          </div>
          {file.type === "mp3" && file.youtubeId ? (
            <div className="relative w-full mt-1 rounded-lg overflow-hidden border border-border/20" style={{ paddingBottom: "56.25%", maxWidth: "28rem" }}>
              <iframe
                src={`https://www.youtube.com/embed/${file.youtubeId}`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                frameBorder="0"
                title={file.name}
              />
            </div>
          ) : file.type === "mp3" ? (
            <iframe
              src={drivePreviewUrl(file.driveId)}
              className="w-full max-w-md h-20 mt-1 rounded-lg border border-border/20"
              allow="autoplay"
              sandbox="allow-same-origin allow-scripts allow-popups"
              title={file.name}
            />
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {file.type === "pdf" && (
            <button
              onClick={() => setPdfOpen(!pdfOpen)}
              className={`transition-colors ${pdfOpen ? "text-gold" : "text-muted-foreground hover:text-gold"}`}
              title={pdfOpen ? "Fechar visualização" : "Visualizar PDF"}
            >
              {pdfOpen ? <X className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          <a
            href={driveViewUrl(file.driveId)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-gold transition-colors"
            title="Abrir no Google Drive"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          {showDownload && (
            <a
              href={driveDownloadUrl(file.driveId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-gold transition-colors"
              title="Baixar"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
      {file.type === "pdf" && pdfOpen && (
        <div className="mt-2 rounded-lg overflow-hidden border border-border/20">
          <iframe
            src={drivePreviewUrl(file.driveId)}
            className="w-full border-0"
            style={{ height: "min(70vh, 600px)" }}
            title={file.name}
          />
        </div>
      )}
    </div>
  );
}

function ThemeDetail({ theme, onBack, isTrial = false }: { theme: Theme; onBack: () => void; isTrial?: boolean }) {
  const [openSubs, setOpenSubs] = useState<Record<number, boolean>>(
    () => Object.fromEntries(theme.subcategories.map((_, i) => [i, true]))
  );

  const toggle = (i: number) =>
    setOpenSubs((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar aos temas
      </button>

      <div className="flex items-center gap-4">
        <img
          src={theme.coverUrl}
          alt={theme.title}
          className="w-16 h-20 object-cover rounded-lg shadow-lg"
        />
        <div>
          <h2 className="text-xl font-semibold text-foreground">{theme.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {theme.fileCount} {theme.fileCount === 1 ? "arquivo" : "arquivos"}
          </p>
        </div>
      </div>

      {isTrial && (
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-2.5">
          <Lock className="w-4 h-4 text-yellow-500 shrink-0" />
          <p className="text-xs text-yellow-500">Você está no período de teste — apenas o primeiro material está disponível. <a href="https://wa.me/5521976310365" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Assine para liberar tudo.</a></p>
        </div>
      )}

      {theme.subcategories.map((sub, i) => (
        <div key={sub.id} className="rounded-xl border border-border/30 bg-card/40 overflow-hidden">
          <button
            onClick={() => toggle(i)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
          >
            <span className="text-sm font-medium text-gold">{sub.name}</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-gold/10 text-gold border-0 text-[10px] px-2 py-0">
                {sub.files.length}
              </Badge>
              {openSubs[i] ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </button>
          {openSubs[i] && (
            <div className="px-2 pb-2 divide-y divide-border/20">
              {sub.files.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  trialLocked={isTrial && file.driveId !== TRIAL_FREE_MATERIAL_DRIVE_ID}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ───────── Main Page ───────── */

export default function MateriaisComplementares({ onBack }: { onBack?: () => void }) {
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const { user, isTrial } = useAuth();
  const matShelfRef = useRef<HTMLDivElement>(null);

  const scrollMatShelf = (direction: "left" | "right") => {
    if (!matShelfRef.current) return;
    const card = matShelfRef.current.querySelector(".shelf-card");
    const w = card?.clientWidth || 280;
    matShelfRef.current.scrollBy({ left: direction === "left" ? -(w + 24) : (w + 24), behavior: "smooth" });
  };

  const { data: allThemes = [], isLoading: themesLoading } = useQuery<Theme[]>({
    queryKey: ["/api/materials"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/materials");
        return res.json();
      } catch {
        return [];
      }
    },
    enabled: !!user,
  });

  // All users have access to all materials — no filtering needed
  const allowedThemes = allThemes;

  // Loading state
  if (themesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    );
  }

  // Don't render if no themes loaded
  if (allowedThemes.length === 0) {
    return null;
  }

  // Trial: only allow access to Toxina Botulínica theme
  const visibleThemes = isTrial
    ? allowedThemes.filter((t) => t.title === "Toxina Botulínica")
    : allowedThemes;

  if (selectedTheme) {
    return (
      <div className="max-w-4xl mx-auto">
        <ThemeDetail theme={selectedTheme} onBack={() => setSelectedTheme(null)} isTrial={isTrial} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-[22px] font-semibold text-foreground tracking-tight">
              Materiais Complementares
            </h2>
            <p className="text-[13px] text-muted-foreground/50 mt-0.5">
              Artigos, compilados e áudios organizados por tema
            </p>
          </div>
        </div>
      </div>

      {isTrial && (
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-2.5">
          <Lock className="w-4 h-4 text-yellow-500 shrink-0" />
          <p className="text-xs text-yellow-500">Período de teste — apenas 1 material disponível. <a href="https://wa.me/5521976310365" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Assine para liberar tudo.</a></p>
        </div>
      )}

      <div className="relative group/matshelf">
        {/* Left arrow */}
        <button
          onClick={() => scrollMatShelf("left")}
          className="hidden sm:flex absolute left-0 top-[35%] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all duration-300 opacity-0 group-hover/matshelf:opacity-100 -translate-x-1/2"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        {/* Right arrow */}
        <button
          onClick={() => scrollMatShelf("right")}
          className="hidden sm:flex absolute right-0 top-[35%] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all duration-300 opacity-0 group-hover/matshelf:opacity-100 translate-x-1/2"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div ref={matShelfRef} className="shelf-scroll flex gap-6 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
        {visibleThemes.map((theme) => (
          <div
            key={theme.id}
            className={`shelf-card shrink-0 group transition-all duration-500 ${
              theme.fileCount > 0 ? "cursor-pointer" : "cursor-default"
            }`}
            onClick={() => theme.fileCount > 0 && setSelectedTheme(theme)}
          >
            {/* Book cover image */}
            <div className="relative rounded-[20px] overflow-hidden transition-all duration-500 group-hover:-translate-y-1.5 group-hover:shadow-[0_20px_60px_-12px_rgba(0,0,0,0.5)]" style={{ aspectRatio: "4/5" }}>
              <img
                src={theme.coverUrl}
                alt={theme.title}
                className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
              />

              {/* Soft vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/[0.06] via-transparent to-transparent" />

              {/* Lock overlay for empty */}
              {theme.fileCount === 0 && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px] flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white/20" />
                </div>
              )}
            </div>

            {/* Text below — Apple-style minimal */}
            <div className="pt-4 pb-1 space-y-1.5">
              <span className={`text-[10px] font-medium uppercase tracking-[0.12em] ${
                theme.fileCount > 0 ? "text-emerald-400/90" : "text-white/30"
              }`}>
                {theme.fileCount > 0 ? `${theme.fileCount} arquivos` : "Em breve"}
              </span>
              <h3 className="font-semibold text-[15px] text-foreground/90 leading-snug line-clamp-2 tracking-[-0.01em] min-h-[2.6em]">
                {theme.title}
              </h3>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
