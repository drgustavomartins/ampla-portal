import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, FileText, Headphones, FileIcon, Download, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";

/* ───────── Types ───────── */

type FileEntry = {
  name: string;
  type: "pdf" | "mp3" | "docx";
  driveId: string;
};

type Subcategory = {
  name: string;
  files: FileEntry[];
};

type Theme = {
  title: string;
  cover: string;
  fileCount: number;
  subcategories: Subcategory[];
};

/* ───────── Data ───────── */

const THEMES: Theme[] = [
  {
    title: "Toxina Botulínica",
    cover: "/images/covers/cover_toxina_botulinica.png?v=2",
    fileCount: 42,
    subcategories: [
      {
        name: "Compilados e Resumos",
        files: [
          { name: "Compilado Toxina Botulínica — Ampla Facial", type: "pdf", driveId: "1AURBQNKIsduh6EBJV1uUfsgkaipm2qry" },
          { name: "Resumo em áudio: Toxina Botulínica", type: "mp3", driveId: "1g7S0Z3zAyyzWHGTXQ4vg7rndu-3q7m_6" },
          { name: "Apostila Ampla Facial — Outros mecanismos de ação", type: "pdf", driveId: "1vdMtVZhkNHRK8u86RY7Nk5JzF9zP_QEh" },
          { name: "Resumo em áudio: Apostila Outros Mecanismos", type: "mp3", driveId: "12r-XaTfIQFvGb9qVfj5ZxOd7R0jKP-hG" },
        ],
      },
      {
        name: "Artigos Científicos",
        files: [
          { name: "A Review of Complications Due to the Use of Botulinum Toxin A for Cosmetic Indications", type: "pdf", driveId: "1-HNxeYGn1JJm8NijtxtaiaZPzSiFmOv4" },
          { name: "Resumo em áudio: Complications of Botulinum Toxin", type: "mp3", driveId: "1vR1jdITazZ96tIlI80zc1--XYVTKdZTM" },
          { name: "Anatomia e avaliação funcional do músculo frontal", type: "pdf", driveId: "1-X7PiWBjt6n8XrAGIVRvSe88_j9GASRX" },
          { name: "Resumo em áudio: Anatomia do Músculo Frontal", type: "mp3", driveId: "1FlhbkgEUL2dzPLLFmkzRa07V3MJHb1Qn" },
          { name: "Botulinum Toxin in Aesthetic Medicine — Myths and Realities", type: "pdf", driveId: "1-O1GXXgI0DC9t5mbvnsGlF586g_KXZzY" },
          { name: "Resumo em áudio: Mitos e Realidades da Toxina", type: "mp3", driveId: "1QMB0OB_nkfZkMVzPds8LrAl8fmR7_zc8" },
          { name: "Botulinum toxin in the treatment of myofascial pain syndrome", type: "pdf", driveId: "1-UQQMgpAqgR_hy3A4xA8LlbgHXHklq9l" },
          { name: "Resumo em áudio: Síndrome de Dor Miofascial", type: "mp3", driveId: "1r6IVELgrPaiDnpcNkdqK0DcQF9XdZGaF" },
          { name: "Botulinum Toxin Injection for Facial Wrinkles", type: "pdf", driveId: "1-8x40NvTVS6M4XS3DQsMvO4X2awaY-Cw" },
          { name: "Resumo em áudio: Rugas Faciais", type: "mp3", driveId: "177-wutULh_ETvNpYWoNbflBdJXzlGVB1" },
          { name: "Botulinum toxin type A wear-off phenomenon in chronic migraine patients", type: "pdf", driveId: "1-p-5k1NPV5aMZGwG2PPXbWGfFKN5hVqI" },
          { name: "Resumo em áudio: Fenômeno Wear-off na Enxaqueca", type: "mp3", driveId: "1YEC4l1Ax5nWGPeEW8sZ1njTyKC2U-yEa" },
          { name: "Efecto de la toxina botulínica tipo A en la funcionalidad, las sincinesias y la calidad de vida", type: "pdf", driveId: "1-vBlawZ8iWEJKQb-RQP2WeVpgreDtB25" },
          { name: "Resumo em áudio: Funcionalidade e Sincinesias", type: "mp3", driveId: "1jsTRqm3jookYCYIubho5qjvpJp6hYQdl" },
          { name: "Estudo piloto dos padrões de contração do músculo frontal", type: "pdf", driveId: "1-3D7_dNgTPFUP6kEkNv0_ekXSAK9VyR8" },
          { name: "Resumo em áudio: Padrões de Contração Frontal", type: "mp3", driveId: "1c6yK8Jd9l3EKAB2cgUUWP5AgqHshbR86" },
          { name: "Evaluación de la duración del efecto de la toxina botulínica en la práctica clínica", type: "pdf", driveId: "1-vv12MpHUwOJbdWTr5pr1uRQFzGR3qnb" },
          { name: "Resumo em áudio: Duração do Efeito da Toxina", type: "mp3", driveId: "1x1UUbcGokM0cCjnierDDapZxZrB9-8YA" },
          { name: "Global Aesthetics Consensus — Botulinum Toxin Type A — Evidence-Based Review", type: "pdf", driveId: "1-ObpBZgHXtv4R4aA7VQ94WNaWaHJqVIm" },
          { name: "Resumo em áudio: Consenso Global — Revisão Baseada em Evidências", type: "mp3", driveId: "1uz5QeKt8Z-LjygMteDzC2cG7vDC3rfiO" },
          { name: "Global Aesthetics Consensus — Hyaluronic Acid Fillers and Botulinum Toxin Type A", type: "pdf", driveId: "1-7D1W2BwPOLJWDZwcMtakQpM9k4zloL7" },
          { name: "Resumo em áudio: Consenso Global — Preenchedores e Toxina", type: "mp3", driveId: "14O4a6A7NSf2i9TbYl7I4bfZrhUHMKwR3" },
          { name: "Hipertrofia maseterina unilateral idiopática", type: "pdf", driveId: "1-d7o5bOTy_ywxq2__EkNSB1-P8QhftMD" },
          { name: "Resumo em áudio: Hipertrofia Maseterina", type: "mp3", driveId: "1EAG2RthnnDbOtPDxJKj5-aGlCKgKWY_6" },
          { name: "La toxina botulínica como adyuvante en el tratamiento de la sonrisa gingival", type: "pdf", driveId: "1-BzZt4_jqBzPCWy1tnh2c4MX0zHBPpEu" },
          { name: "Resumo em áudio: Sorriso Gengival", type: "mp3", driveId: "111tRaoKn8WgSJNusKjBO8uWiCRK6GMGv" },
          { name: "The history of botulinum toxin in Brazil", type: "pdf", driveId: "1-3Y1n4HJLdp778ycX53_XS979ENA78uy" },
          { name: "Resumo em áudio: História da Toxina no Brasil", type: "mp3", driveId: "1dWOdR5_UaShYGMqAA7iTk4MsJ_Lx8Fzr" },
          { name: "Tolerancia inmune al tratamiento con toxina botulínica tipo A", type: "pdf", driveId: "1-BEciSjBVSoLSyAblqRT2dRmsjqwXlzU" },
          { name: "Resumo em áudio: Tolerância Imune à Toxina", type: "mp3", driveId: "1v4YuxFQCqGxbswwic9nJkypkx7eqZrvL" },
          { name: "Toxina Botulínica para el Tratamiento de los Desórdenes Temporomandibulares", type: "pdf", driveId: "1-fYuESlLoSKc4Itx3Q6n4-6N82aE1gZZ" },
          { name: "Resumo em áudio: DTM — Desórdenes Temporomandibulares", type: "mp3", driveId: "1sCSBnl7xGxAH2XsdWJ_tQ3AbBbCBm6r6" },
          { name: "Treatment of Various Types of Gummy Smile With Botulinum Toxin-A", type: "pdf", driveId: "1-bEx9GhpxFAhpSQaYs4WKDUSOqrJXPO2" },
          { name: "Resumo em áudio: Tipos de Sorriso Gengival", type: "mp3", driveId: "1FfD28IjJmDF3Z-HZByzokt8gxSQpHEOd" },
          { name: "Use of botulinum toxin type A in temporomandibular disorder", type: "pdf", driveId: "1-TAMpJ5Dk2OtxSwOhECjDgaGnGGQ7B2k" },
          { name: "Resumo em áudio: Toxina em DTM", type: "mp3", driveId: "1AAcwKyTHRjiNlcuh-77mC-f480SC5IiC" },
        ],
      },
      {
        name: "Materiais para Pacientes",
        files: [
          { name: "Contrato toxina botulínica", type: "docx", driveId: "1S4j3kicp9FrWBjgL5rUUeKy_wwmrwRs9" },
          { name: "Ficha para Toxina", type: "pdf", driveId: "1K3s2R2Q5dTG3Uma0z6WoJEJ6BX7vCONJ" },
        ],
      },
    ],
  },
  {
    title: "Preenchedores Faciais",
    cover: "/images/covers/cover_preenchedores_faciais.png?v=2",
    fileCount: 0,
    subcategories: [],
  },
  {
    title: "Bioestimuladores de Colágeno",
    cover: "/images/covers/cover_bioestimuladores.png?v=2",
    fileCount: 6,
    subcategories: [
      {
        name: "Compilados e Resumos",
        files: [
          { name: "Compilado Anti-inflamatórios x Bioestimuladores", type: "pdf", driveId: "1Svq0RTDq0cbgI1U6b5m-OXBN-I1Gv46t" },
          { name: "Resumo em áudio: Anti-inflamatórios x Bioestimuladores", type: "mp3", driveId: "1kHqq2DvI8g2Olz33JHt91-aBL4kK_Ev6" },
          { name: "Compilado Radiesse Plus (CaHA-CMC) — Bioestimulação e Mecanotransdução", type: "pdf", driveId: "1bBdy6huD7m6cvi785AFawivDTPNcIjbr" },
          { name: "Resumo em áudio: Radiesse Plus — Bioestimulação e Mecanotransdução", type: "mp3", driveId: "1JASqeIBL2y0KnsZQPCKo6nHfnmj-nl0-" },
          { name: "Compilado Mecanismos de Neocolagênese — Evidências sobre Bioestimuladores", type: "pdf", driveId: "1gaM22jyoyEdk_huTiyAiKS10g0M6VdC6" },
          { name: "Resumo em áudio: Mecanismos de Neocolagênese", type: "mp3", driveId: "1JASqeIBL2y0KnsZQPCKo6nHfnmj-nl0-" },
        ],
      },
    ],
  },
  {
    title: "Moduladores de Matriz Extracelular",
    cover: "/images/covers/cover_moduladores_matriz.png?v=2",
    fileCount: 0,
    subcategories: [],
  },
  {
    title: "Método NaturalUp®",
    cover: "/images/covers/cover_metodo_naturalup.png?v=2",
    fileCount: 2,
    subcategories: [
      {
        name: "Compilados e Resumos",
        files: [
          { name: "Compilado Full Face — Ampla Facial", type: "pdf", driveId: "1wi4rZ7s6bxJHMfpVefo33gaC-Au7roYp" },
          { name: "Resumo em áudio: Full Face", type: "mp3", driveId: "1ZeeeKTVPWMwv1j9jyANFyPqcEyElac4H" },
        ],
      },
    ],
  },
  {
    title: "IA na Medicina",
    cover: "/images/covers/cover_ia_medicina.png?v=2",
    fileCount: 2,
    subcategories: [
      {
        name: "Compilados e Resumos",
        files: [
          { name: "Compilado IA na Medicina — Ampla Facial", type: "pdf", driveId: "1ZszH0IrVrbh4eW6rdhckEHc4veA0avkN" },
          { name: "Resumo em áudio: IA na Medicina", type: "mp3", driveId: "1S5zoXRX2CWhsja_uTAkhIx_LApAAknpK" },
        ],
      },
    ],
  },
];

/* ───────── Helpers ───────── */

function driveViewUrl(id: string) {
  return `https://drive.google.com/file/d/${id}/view`;
}
function driveDownloadUrl(id: string) {
  return `https://drive.google.com/uc?export=download&id=${id}`;
}
function driveAudioUrl(id: string) {
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
  return (
    <div className="group flex items-start gap-3 py-3 px-3 rounded-lg hover:bg-white/[0.03] transition-colors">
      <FileTypeIcon type={file.type} />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-foreground/90 leading-snug">{file.name}</span>
          <TypeLabel type={file.type} />
        </div>
        {file.type === "mp3" && (
          <iframe
            src={driveAudioUrl(file.driveId)}
            className="w-full max-w-md h-20 mt-1 rounded-lg border border-border/20"
            allow="autoplay"
            sandbox="allow-same-origin allow-scripts allow-popups"
          />
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
        <a
          href={driveViewUrl(file.driveId)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-gold transition-colors"
          title="Visualizar"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <a
          href={driveDownloadUrl(file.driveId)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-gold transition-colors"
          title="Baixar"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>
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
          src={theme.cover}
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
        <div key={i} className="rounded-xl border border-border/30 bg-card/40 overflow-hidden">
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
              {sub.files.map((file, j) => (
                <FileRow key={j} file={file} />
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

  const { data: myMaterials } = useQuery<{ accessAll: boolean; topics: string[] }>({
    queryKey: ["/api/my-materials"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/my-materials");
      return res.json();
    },
    enabled: !!user,
  });

  // Per-user material category overrides (admin-configured via Edit Student)
  const { data: myUserMaterialCats = [] } = useQuery<{ id: number; userId: number; categoryName: string; enabled: boolean }[]>({
    queryKey: ["/api/my-user-material-categories"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/my-user-material-categories");
      return res.json();
    },
    enabled: !!user,
  });

  // Filter themes based on access: admins see all, students see only allowed topics
  // Then apply per-user category overrides
  const baseThemes = myMaterials?.accessAll
    ? THEMES
    : myMaterials && myMaterials.topics.length > 0
      ? THEMES.filter(t => myMaterials.topics.includes(t.title))
      : [];

  // Apply per-user category-level overrides: if overrides exist, filter out disabled categories
  const allowedThemes = myUserMaterialCats.length > 0
    ? baseThemes.filter(t => {
        const override = myUserMaterialCats.find(c => c.categoryName === t.title);
        return !override || override.enabled;
      })
    : baseThemes;

  // Don't render anything if no materials are accessible
  if (!myMaterials?.accessAll && allowedThemes.length === 0) {
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
            key={theme.title}
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
                src={theme.cover}
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
