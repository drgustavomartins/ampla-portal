import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronDown, ChevronRight, FileText, Download,
  Music, File, FolderOpen
} from "lucide-react";

// ── Types ──

type MaterialFile = {
  name: string;
  type: "pdf" | "mp3" | "docx";
  driveId: string;
};

type Subcategory = {
  name: string;
  files: MaterialFile[];
};

type Theme = {
  id: string;
  title: string;
  cover: string;
  fileCount: number;
  subcategories: Subcategory[];
};

// ── Data ──

const THEMES: Theme[] = [
  {
    id: "toxina-botulinica",
    title: "Toxina Botulínica",
    cover: "/covers/cover_toxina_botulinica.png",
    fileCount: 23,
    subcategories: [
      {
        name: "Compilados e Resumos",
        files: [
          { name: "Compilado Toxina Botulínica — Ampla Facial", type: "pdf", driveId: "1AURBQNKIsduh6EBJV1uUfsgkaipm2qry" },
          { name: "Resumo em áudio: Toxina Botulínica", type: "mp3", driveId: "1g7S0Z3zAyyzWHGTXQ4vg7rndu-3q7m_6" },
          { name: "Apostila Ampla Facial — Outros mecanismos de ação", type: "pdf", driveId: "1vdMtVZhkNHRK8u86RY7Nk5JzF9zP_QEh" },
        ],
      },
      {
        name: "Artigos Científicos",
        files: [
          { name: "A Review of Complications Due to the Use of Botulinum Toxin A for Cosmetic Indications", type: "pdf", driveId: "1-HNxeYGn1JJm8NijtxtaiaZPzSiFmOv4" },
          { name: "Anatomia e avaliação funcional do músculo frontal", type: "pdf", driveId: "1-X7PiWBjt6n8XrAGIVRvSe88_j9GASRX" },
          { name: "Botulinum Toxin in Aesthetic Medicine — Myths and Realities", type: "pdf", driveId: "1-O1GXXgI0DC9t5mbvnsGlF586g_KXZzY" },
          { name: "Botulinum toxin in the treatment of myofascial pain syndrome", type: "pdf", driveId: "1-UQQMgpAqgR_hy3A4xA8LlbgHXHklq9l" },
          { name: "Botulinum Toxin Injection for Facial Wrinkles", type: "pdf", driveId: "1-8x40NvTVS6M4XS3DQsMvO4X2awaY-Cw" },
          { name: "Botulinum toxin type A wear-off phenomenon in chronic migraine patients", type: "pdf", driveId: "1-p-5k1NPV5aMZGwG2PPXbWGfFKN5hVqI" },
          { name: "Efecto de la toxina botulínica tipo A en la funcionalidad, las sincinesias y la calidad de vida", type: "pdf", driveId: "1-vBlawZ8iWEJKQb-RQP2WeVpgreDtB25" },
          { name: "Estudo piloto dos padrões de contração do músculo frontal", type: "pdf", driveId: "1-3D7_dNgTPFUP6kEkNv0_ekXSAK9VyR8" },
          { name: "Evaluación de la duración del efecto de la toxina botulínica en la práctica clínica", type: "pdf", driveId: "1-vv12MpHUwOJbdWTr5pr1uRQFzGR3qnb" },
          { name: "Global Aesthetics Consensus — Botulinum Toxin Type A — Evidence-Based Review", type: "pdf", driveId: "1-ObpBZgHXtv4R4aA7VQ94WNaWaHJqVIm" },
          { name: "Global Aesthetics Consensus — Hyaluronic Acid Fillers and Botulinum Toxin Type A", type: "pdf", driveId: "1-7D1W2BwPOLJWDZwcMtakQpM9k4zloL7" },
          { name: "Hipertrofia maseterina unilateral idiopática", type: "pdf", driveId: "1-d7o5bOTy_ywxq2__EkNSB1-P8QhftMD" },
          { name: "La toxina botulínica como adyuvante en el tratamiento de la sonrisa gingival", type: "pdf", driveId: "1-BzZt4_jqBzPCWy1tnh2c4MX0zHBPpEu" },
          { name: "The history of botulinum toxin in Brazil", type: "pdf", driveId: "1-3Y1n4HJLdp778ycX53_XS979ENA78uy" },
          { name: "Tolerancia inmune al tratamiento con toxina botulínica tipo A", type: "pdf", driveId: "1-BEciSjBVSoLSyAblqRT2dRmsjqwXlzU" },
          { name: "Toxina Botulínica para el Tratamiento de los Desórdenes Temporomandibulares", type: "pdf", driveId: "1-fYuESlLoSKc4Itx3Q6n4-6N82aE1gZZ" },
          { name: "Treatment of Various Types of Gummy Smile With Botulinum Toxin-A", type: "pdf", driveId: "1-bEx9GhpxFAhpSQaYs4WKDUSOqrJXPO2" },
          { name: "Use of botulinum toxin type A in temporomandibular disorder", type: "pdf", driveId: "1-TAMpJ5Dk2OtxSwOhECjDgaGnGGQ7B2k" },
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
    id: "preenchedores-faciais",
    title: "Preenchedores Faciais",
    cover: "/covers/cover_preenchedores_faciais.png",
    fileCount: 0,
    subcategories: [],
  },
  {
    id: "bioestimuladores",
    title: "Bioestimuladores de Colágeno",
    cover: "/covers/cover_bioestimuladores.png",
    fileCount: 6,
    subcategories: [
      {
        name: "Compilados e Resumos",
        files: [
          { name: "Compilado Anti-inflamatórios x Bioestimuladores", type: "pdf", driveId: "1Svq0RTDq0cbgI1U6b5m-OXBN-I1Gv46t" },
          { name: "Resumo em áudio: Anti-inflamatórios x Bioestimuladores", type: "mp3", driveId: "1kHqq2DvI8g2Olz33JHt91-aBL4kK_Ev6" },
          { name: "Compilado Radiesse Plus e Hidroxiapatitas", type: "pdf", driveId: "1bBdy6huD7m6cvi785AFawivDTPNcIjbr" },
          { name: "Resumo em áudio: Radiesse Plus e Hidroxiapatitas", type: "mp3", driveId: "1JASqeIBL2y0KnsZQPCKo6nHfnmj-nl0-" },
          { name: "Compilado Neocolagênese", type: "pdf", driveId: "1gaM22jyoyEdk_huTiyAiKS10g0M6VdC6" },
          { name: "Resumo em áudio: Neocolagênese", type: "mp3", driveId: "1JASqeIBL2y0KnsZQPCKo6nHfnmj-nl0-" },
        ],
      },
    ],
  },
  {
    id: "moduladores-matriz",
    title: "Moduladores de Matriz Extracelular",
    cover: "/covers/cover_moduladores_matriz.png",
    fileCount: 0,
    subcategories: [],
  },
  {
    id: "metodo-naturalup",
    title: "Método NaturalUp\u00AE",
    cover: "/covers/cover_metodo_naturalup.png",
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
    id: "ia-medicina",
    title: "IA na Medicina",
    cover: "/covers/cover_ia_medicina.png",
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

// ── Helpers ──

function getDriveViewUrl(driveId: string) {
  return `https://drive.google.com/file/d/${driveId}/view`;
}

function getDriveDownloadUrl(driveId: string) {
  return `https://drive.google.com/uc?export=download&id=${driveId}`;
}

function getDriveAudioUrl(driveId: string) {
  return `https://docs.google.com/uc?export=open&id=${driveId}`;
}

function FileIcon({ type }: { type: MaterialFile["type"] }) {
  switch (type) {
    case "pdf":
      return <FileText className="w-4 h-4 text-red-400 shrink-0" />;
    case "mp3":
      return <Music className="w-4 h-4 text-emerald-400 shrink-0" />;
    case "docx":
      return <File className="w-4 h-4 text-blue-400 shrink-0" />;
  }
}

function FileTypeBadge({ type }: { type: MaterialFile["type"] }) {
  const colors: Record<string, string> = {
    pdf: "bg-red-500/15 text-red-400 border-red-500/30",
    mp3: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    docx: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${colors[type]}`}>
      {type}
    </span>
  );
}

// ── Component ──

export default function MateriaisComplementares() {
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);

  const handleBack = () => setLocation("/");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="text-sm text-muted-foreground hover:text-gold flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="flex items-center gap-3">
            <img src="/logo-icon.png" alt="Ampla Facial" className="w-6 h-6 object-contain" />
            <span className="text-sm font-medium text-gold tracking-wide">AMPLA FACIAL</span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:py-10 space-y-8">
          {/* Page title */}
          <div className="space-y-2">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-foreground">
              Materiais Complementares
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed">
              Compilados, artigos cientificos, resumos em audio e materiais de apoio organizados por tema.
            </p>
          </div>

          {/* Theme cards grid */}
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            {THEMES.map((theme) => {
              const isExpanded = expandedTheme === theme.id;
              const isEmpty = theme.fileCount === 0;

              return (
                <div key={theme.id} className={`${isExpanded ? "sm:col-span-2" : ""}`}>
                  {/* Card */}
                  <div
                    className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 group ${
                      isExpanded
                        ? "ring-2 ring-gold/40"
                        : "hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                    }`}
                    style={{ minHeight: isEmpty ? "200px" : "220px" }}
                    onClick={() => {
                      if (isEmpty) return;
                      setExpandedTheme(isExpanded ? null : theme.id);
                    }}
                  >
                    {/* Cover image background */}
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url(${theme.cover})` }}
                    />
                    {/* Fallback gradient if no image */}
                    <div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(135deg, hsl(200 45% 12%), hsl(200 55% 8%))" }}
                    />
                    {/* Cover image on top of fallback */}
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url(${theme.cover})` }}
                    />
                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

                    {/* Content overlay */}
                    <div className="relative h-full flex flex-col justify-end p-5 sm:p-6">
                      {/* File count badge */}
                      <div className="absolute top-3 right-3">
                        {isEmpty ? (
                          <span className="inline-flex items-center rounded-md bg-black/40 backdrop-blur-sm border border-white/10 px-2 py-1 text-[10px] font-bold text-white/60 uppercase tracking-wider">
                            Em breve
                          </span>
                        ) : (
                          <Badge className="bg-gold/25 backdrop-blur-sm border-gold/40 text-gold text-[10px] font-bold uppercase tracking-wider hover:bg-gold/25">
                            {theme.fileCount} {theme.fileCount === 1 ? "arquivo" : "arquivos"}
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-white font-bold text-lg sm:text-xl leading-tight drop-shadow-md">
                        {theme.title}
                      </h3>

                      {isEmpty && (
                        <p className="text-gold/80 italic text-sm mt-2">Conteudo em breve</p>
                      )}

                      {!isEmpty && (
                        <div className="flex items-center gap-2 mt-2 text-gold/80 text-xs">
                          {isExpanded ? (
                            <>
                              <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                              <span>Fechar</span>
                            </>
                          ) : (
                            <>
                              <ChevronRight className="w-3.5 h-3.5" />
                              <span>Ver materiais</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && !isEmpty && (
                    <div className="mt-4 space-y-6 px-1">
                      {theme.subcategories.map((sub) => (
                        <div key={sub.name} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-gold" />
                            <h4 className="text-sm font-semibold text-gold uppercase tracking-brand">
                              {sub.name}
                            </h4>
                            <span className="text-[10px] text-muted-foreground">
                              ({sub.files.length})
                            </span>
                          </div>

                          <div className="space-y-2">
                            {sub.files.map((file) => (
                              <div
                                key={file.driveId}
                                className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-3"
                              >
                                <div className="flex items-start gap-3">
                                  <FileIcon type={file.type} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-medium text-foreground leading-snug">
                                        {file.name}
                                      </p>
                                      <FileTypeBadge type={file.type} />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <a
                                      href={getDriveViewUrl(file.driveId)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-gold hover:text-gold/80 hover:underline transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Abrir
                                    </a>
                                    <a
                                      href={getDriveDownloadUrl(file.driveId)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-8 h-8 rounded-lg bg-gold/10 hover:bg-gold/20 flex items-center justify-center transition-colors"
                                      title="Download"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Download className="w-3.5 h-3.5 text-gold" />
                                    </a>
                                  </div>
                                </div>

                                {/* Inline audio player for MP3 */}
                                {file.type === "mp3" && (
                                  <audio
                                    controls
                                    preload="none"
                                    className="w-full h-10 rounded-lg"
                                    style={{ colorScheme: "dark" }}
                                  >
                                    <source src={getDriveAudioUrl(file.driveId)} type="audio/mpeg" />
                                    Seu navegador nao suporta o player de audio.
                                  </audio>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-6 mt-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>&copy; 2026 Ampla Facial &mdash; Todos os direitos reservados</span>
          <span className="text-gold-muted font-semibold tracking-brand text-[10px]">NATURALUP&reg;</span>
        </div>
      </footer>
    </div>
  );
}
