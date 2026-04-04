// Force rebuild v2 — ensure Vite cache invalidation for Preenchedores Faciais content
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, FileText, FileIcon, Download, ChevronDown, ChevronUp, ExternalLink, Eye, X,
} from "lucide-react";

/* ───────── Types ───────── */

type FileEntry = {
  name: string;
  type: "pdf" | "docx";
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
    fileCount: 22,
    subcategories: [
      {
        name: "Compilados e Resumos",
        files: [
          { name: "Compilado Toxina Botulínica — Ampla Facial", type: "pdf", driveId: "1AURBQNKIsduh6EBJV1uUfsgkaipm2qry" },
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
    title: "Preenchedores Faciais",
    cover: "/images/covers/cover_preenchedores_faciais.png?v=2",
    fileCount: 45,
    subcategories: [
      {
        name: "Compilados e Resumos",
        files: [
          { name: "Revisão sobre reticulação dos AH com comparativos reológicos", type: "pdf", driveId: "1kU7T9IvhGjndK332K7P-qoFk9KFRhkW_" },
          { name: "Compilado CPM e Belotero — Ampla Facial", type: "pdf", driveId: "1JD6WGYvuKqLzQZRyLiqTUwKm75965Kt7" },
          { name: "Compilado Crosslinkers (DVS, BDDE e PEG) — Ampla Facial", type: "pdf", driveId: "1W_uZQD_T1sdNWsHmVY5KxUiVxUDGNJuI" },
          { name: "Compilado Processo de Fabricação — Ampla Facial", type: "pdf", driveId: "1L8i8gdiPPkJWV9QaTdy_zhgDhWoqsPJo" },
          { name: "Compilado Reologia e Propriedades Físicas — Ampla Facial", type: "pdf", driveId: "1iM3ozs7b2R-86dXns70RvaUEFq7JPkF7" },
          { name: "Compilado Degradação e Longevidade — Ampla Facial", type: "pdf", driveId: "1IvmnMPSu4iVCBlnF06NcryKeKIo5OG8w" },
          { name: "Compilado Segurança e Complicações — Ampla Facial", type: "pdf", driveId: "1dSgYgEWiCjZD_a54yYt-Vv_0IvznoKWq" },
          { name: "Compilado Revisões Gerais e Perspectivas — Ampla Facial", type: "pdf", driveId: "1N6RU6wlN2PG7s1oB9ObWboSsVDwxa4rS" },
        ],
      },
      {
        name: "Artigos — Tecnologia CPM e Belotero",
        files: [
          { name: "Sattler 2025 — CPM-HA Adverse Events NLF", type: "pdf", driveId: "1uRyWVE3c14d7GheeDDdzM0WbsIFKruXS" },
          { name: "Gauglitz 2021 — CPM-HA20G Skin Revitalization", type: "pdf", driveId: "151iu1JQHZFKgsGkEjKGWfZ5JyaHTrFuK" },
          { name: "Nikolis 2016 — CPM Literature Review", type: "pdf", driveId: "1LTyOmAhTPplFtf0jLQa8FWSZj0xF3gQq" },
          { name: "Hanschmann 2019 — CPM-HA20G Early Intervention", type: "pdf", driveId: "1Sp5CH6uNuJpddKbaYhPD16xrxkvj_56G" },
          { name: "Vandeputte 2018 — CPM Volume RealWorld", type: "pdf", driveId: "10vUqe9aCvazhpDOwaZisLmx9PejT14Ah" },
        ],
      },
      {
        name: "Artigos — Crosslinkers (DVS, BDDE e PEG)",
        files: [
          { name: "Chen 2025 — HA Crosslinking Modalities Review", type: "pdf", driveId: "1moLMZOyBFTawLjllz1cbX0QwCO2BvSRY" },
          { name: "Wojtkiewicz 2024 — BDDE Harms Scoping Review", type: "pdf", driveId: "1Yoc8-YFUXk-PbNDHiDSYoHdmlIqLns5r" },
          { name: "Hinsenkamp 2022 — DVS vs BDDE InVivo", type: "pdf", driveId: "1SUjG-wimVZyUnPRtJD-tcVWqt0jT8TYa" },
          { name: "Vilas-Vilela 2019 — DVS BDDE PEG Nanogels", type: "pdf", driveId: "16m__Hz59KskuEZSvy5L4I3H0TNPqNZqE" },
          { name: "Zerbinati 2021 — PEG Crosslinked HA Fillers", type: "pdf", driveId: "13Ft5QgkFQ13qezLBwJUkoNZR4WBUrzuG" },
          { name: "Tezel 2013 — BDDE Metabolism Review", type: "pdf", driveId: "1zcYt08Y4hymhBF8p3XJZk2IDXnb01Hqu" },
          { name: "Luu 2025 — Crosslinker Length Density Skin", type: "pdf", driveId: "1MMhbIha-Dr6CpJJlOqFafmONq5btkUSs" },
        ],
      },
      {
        name: "Artigos — Processo de Fabricação",
        files: [
          { name: "Hong 2024 — Manufacturing Process HA Fillers", type: "pdf", driveId: "1F2w7IkdUmU6i7a3WgMzFg04coRQzmkJu" },
          { name: "Borzacchiello 2024 — HA CMC Composite Hydrogel", type: "pdf", driveId: "1m4T6-mM285PZVULH0QL369m4lmRJGMYJ" },
          { name: "Rashid 2024 — Residual Crosslinker GC Analysis", type: "pdf", driveId: "1V1g7xgT7gRnEHwFA4QbzrAf9NJAqRt8z" },
          { name: "Cho 2024 — Dispersion Process BDDE Quality", type: "pdf", driveId: "1lHDOy0x18sx8EflFEwVxfCvQhiulqqrL" },
          { name: "Yang & Lee 2024 — NMR Structural Analysis HA", type: "pdf", driveId: "1NJ0mV--01y3TqgW1jBoBk-TC8OJejFqy" },
        ],
      },
      {
        name: "Artigos — Reologia e Propriedades Físicas",
        files: [
          { name: "Soares 2025 — Filler Rheology Future", type: "pdf", driveId: "1z_gh9z_fv_1FfyX6R4Wo6EI06gJlCztc" },
          { name: "Micheels 2024 — Injectability 28 Fillers", type: "pdf", driveId: "15V0QXuXJ49RwX95FQoah9T3mUBwb6aS5" },
          { name: "Bernardin 2022 — Rheologic Physicochemical Overview", type: "pdf", driveId: "17-Hc5fez-FTzFQJ9r7JBkyGUzlJ7Sawv" },
          { name: "Malgapo 2022 — Rheology Clinical Implications", type: "pdf", driveId: "1MBKrtjQ05iLfBKMSpzsO5zoN45cHco-p" },
          { name: "Zerbinati 2021 — BDDE Comparative Physicochemical", type: "pdf", driveId: "1VPoXzGGhFec4eE35Vm08uLR_aekgF7IS" },
          { name: "Hong 2025 — Conditions Choosing Fillers", type: "pdf", driveId: "1KKZX1D-BGf8tJaXZ4SpMXhfJtitNltHX" },
        ],
      },
      {
        name: "Artigos — Degradação e Longevidade",
        files: [
          { name: "Hong 2024 — Decomposition InVivo Post HA", type: "pdf", driveId: "1vqLieDBRKo9WZntRVB7Zel9LK4U97ATm" },
          { name: "Gallagher 2024 — Hyaluronidase Degradation Kinetics", type: "pdf", driveId: "1Umk9ulBzeLTp1zF5w93W2jRCMcif7SX3" },
          { name: "Wollina & Goldman 2023 — Spontaneous Degradation", type: "pdf", driveId: "1ifyTQd8t6roq7MF_Kajy2sOralmyBezj" },
          { name: "Foster 2023 — 21 Fillers Hyaluronidase", type: "pdf", driveId: "1VDQpOMQFKYf4fgt7QI-OUKzCl01amWWN" },
        ],
      },
      {
        name: "Artigos — Segurança e Complicações",
        files: [
          { name: "Arrigoni 2025 — Hyaluronidase Aesthetic Medicine", type: "pdf", driveId: "1BhJzCBysmr_-AN3s3xekOfSxlsUYJOMr" },
          { name: "Chakhachiro 2025 — Vascular Occlusion MetaAnalysis", type: "pdf", driveId: "1lTPiPyQVDrTAxz2FEdoFNL6ZkIwaQur7" },
          { name: "Baranska 2024 — Late Onset Reactions", type: "pdf", driveId: "17vjlmDgNuLJVWujRefSlgaCyJsfFI71B" },
          { name: "Soares 2022 — FIVO Pathophysiology", type: "pdf", driveId: "17tfjc6bhrWqy8Jz8e9qCD_QE7DUXodXi" },
          { name: "De Boulle 2016 — Global Consensus Complications", type: "pdf", driveId: "1ip2pcXyk5UumY7-vHl4H7iqyfsHCquAP" },
          { name: "Swift 2018 — 10-Point Plan Complications", type: "pdf", driveId: "1qoq_TxREPmIfPhwnF1vKALqw1AWlIcxg" },
        ],
      },
      {
        name: "Artigos — Revisões Gerais e Perspectivas",
        files: [
          { name: "Schiraldi 2021 — Soft Tissue Fillers Overview", type: "pdf", driveId: "11RPJo52UCFPEZo-GO0WlM_vlecoMHq9I" },
          { name: "Guarise 2023 — Crosslinking Parameters Design", type: "pdf", driveId: "1rTzUdOFjJ-qSQn6gwVfCDRKsFib-Y-qs" },
          { name: "Akinbiyi 2020 — Better Results Facial Rejuvenation", type: "pdf", driveId: "1Rhsu93o5uOV-XQvyxmb4CfmhYY79G2x0" },
          { name: "Peng 2023 — Hydrogel Structure InVivo Performance", type: "pdf", driveId: "1qZDCur848qyaDJvDQG3AQVIJ3x63foAK" },
        ],
      },
    ],
  },
  {
    title: "Bioestimuladores de Colágeno",
    cover: "/images/covers/cover_bioestimuladores.png?v=2",
    fileCount: 3,
    subcategories: [
      {
        name: "Compilados e Resumos",
        files: [
          { name: "Compilado Anti-inflamatórios x Bioestimuladores", type: "pdf", driveId: "1Svq0RTDq0cbgI1U6b5m-OXBN-I1Gv46t" },
          { name: "Compilado Radiesse Plus (CaHA-CMC) — Bioestimulação e Mecanotransdução", type: "pdf", driveId: "1bBdy6huD7m6cvi785AFawivDTPNcIjbr" },
          { name: "Compilado Mecanismos de Neocolagênese — Evidências sobre Bioestimuladores", type: "pdf", driveId: "1gaM22jyoyEdk_huTiyAiKS10g0M6VdC6" },
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
    fileCount: 1,
    subcategories: [
      {
        name: "Compilados e Resumos",
        files: [
          { name: "Compilado Full Face — Ampla Facial", type: "pdf", driveId: "1wi4rZ7s6bxJHMfpVefo33gaC-Au7roYp" },
        ],
      },
    ],
  },
  {
    title: "IA na Medicina",
    cover: "/images/covers/cover_ia_medicina.png?v=2",
    fileCount: 1,
    subcategories: [
      {
        name: "Compilados e Resumos",
        files: [
          { name: "Compilado IA na Medicina — Ampla Facial", type: "pdf", driveId: "1ZszH0IrVrbh4eW6rdhckEHc4veA0avkN" },
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
function drivePreviewUrl(id: string) {
  return `https://drive.google.com/file/d/${id}/preview`;
}

function FileTypeIcon({ type }: { type: FileEntry["type"] }) {
  switch (type) {
    case "pdf":
      return <FileText className="w-4 h-4 text-red-400 shrink-0" />;
    case "docx":
      return <FileIcon className="w-4 h-4 text-blue-400 shrink-0" />;
  }
}

function TypeLabel({ type }: { type: FileEntry["type"] }) {
  const labels: Record<FileEntry["type"], string> = { pdf: "PDF", docx: "DOCX" };
  const colors: Record<FileEntry["type"], string> = {
    pdf: "bg-red-500/15 text-red-400 border-red-500/20",
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
  const showDownload = true;

  return (
    <div className="group py-3 px-3 rounded-lg hover:bg-white/[0.03] transition-colors">
      <div className="flex items-start gap-3">
        <FileTypeIcon type={file.type} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-foreground/90 leading-snug">{file.name}</span>
            <TypeLabel type={file.type} />
          </div>

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

  // Filter themes based on access: admins see all, students see only allowed topics
  const allowedThemes = myMaterials?.accessAll
    ? THEMES
    : myMaterials && myMaterials.topics.length > 0
      ? THEMES.filter(t => myMaterials.topics.includes(t.title))
      : [];

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
