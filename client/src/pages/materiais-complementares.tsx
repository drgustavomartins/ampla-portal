import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, FileText, FileIcon, Headphones, Download, ChevronDown, ChevronUp, ExternalLink, Eye, X, Loader2,
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

/* ───────── Components ───────── */

function FileRow({ file }: { file: FileEntry }) {
  const [pdfOpen, setPdfOpen] = useState(false);
  const showDownload = file.type !== "mp3";

  return (
    <div className="group py-3 px-3 rounded-lg hover:bg-white/[0.03] transition-colors">
      <div className="flex items-start gap-3">
        <FileTypeIcon type={file.type} />
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

function ThemeDetail({ theme, onBack }: { theme: Theme; onBack: () => void }) {
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
                <FileRow key={file.id} file={file} />
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
  const { user } = useAuth();

  const { data: allThemes = [], isLoading: themesLoading } = useQuery<Theme[]>({
    queryKey: ["/api/materials"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/materials");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: myMaterials } = useQuery<{ accessAll: boolean; topics: string[] }>({
    queryKey: ["/api/my-materials"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/my-materials");
      return res.json();
    },
    enabled: !!user,
  });

  // Filter themes based on access: admins see all, students see only allowed topics
  const allowedThemes = myMaterials?.accessAll
    ? allThemes
    : myMaterials && myMaterials.topics.length > 0
      ? allThemes.filter(t => myMaterials.topics.includes(t.title))
      : [];

  // Loading state
  if (themesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    );
  }

  // Don't render anything if no materials are accessible
  if (!myMaterials?.accessAll && (!myMaterials || myMaterials.topics.length === 0)) {
    return null;
  }

  if (selectedTheme) {
    return (
      <div className="max-w-4xl mx-auto">
        <ThemeDetail theme={selectedTheme} onBack={() => setSelectedTheme(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
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
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
              Materiais Complementares
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Artigos, compilados e materiais de apoio organizados por tema
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {allowedThemes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => theme.fileCount > 0 && setSelectedTheme(theme)}
            className={`group relative rounded-xl overflow-hidden border border-border/30 text-left transition-all duration-200 ${
              theme.fileCount > 0
                ? "cursor-pointer hover:border-gold/40 hover:shadow-lg hover:shadow-gold/5"
                : "cursor-default opacity-80"
            }`}
          >
            {/* Cover image */}
            <div className="relative h-56 sm:h-64">
              <img
                src={theme.coverUrl}
                alt={theme.title}
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-[#0A1628]/50 to-[#0A1628]/20" />

              {/* File count badge */}
              {theme.fileCount > 0 && (
                <Badge className="absolute top-3 right-3 bg-gold/90 text-background border-0 text-xs font-medium">
                  {theme.fileCount} {theme.fileCount === 1 ? "arquivo" : "arquivos"}
                </Badge>
              )}
            </div>

            {/* Title area */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-gold transition-colors">
                {theme.title}
              </h3>
              {theme.fileCount === 0 && (
                <p className="text-sm italic text-gold/70 mt-1">Conteúdo em breve</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
