import { Award, Download } from "lucide-react";
import type { CertificateItem } from "@/hooks/use-student-init";
import { apiRequest } from "@/lib/queryClient";

interface CertificateCardProps {
  certificate: CertificateItem;
}

export function CertificateCard({ certificate }: CertificateCardProps) {
  const handleDownload = async () => {
    try {
      const res = await apiRequest("GET", `/api/student/certificate/${certificate.module_id}/pdf`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificado-${certificate.certificate_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
  };

  const issuedDate = new Date(certificate.issued_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <button
      onClick={handleDownload}
      className="nf-card group shrink-0 w-[260px] sm:w-[280px] rounded-lg overflow-hidden bg-[#14213D] transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_8px_24px_rgba(212,175,55,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] text-left"
      aria-label={`Baixar certificado: ${certificate.module_name}`}
    >
      {/* Certificate visual */}
      <div className="relative aspect-video bg-gradient-to-br from-[#0A1628] to-[#1C2E52] overflow-hidden flex items-center justify-center">
        <div className="text-center space-y-2">
          <Award className="w-16 h-16 text-[#D4AF37] mx-auto" />
          <p className="text-xs text-[#D4AF37] font-semibold tracking-wider uppercase">Certificado</p>
        </div>

        {/* Download icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#0A1628]/50">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37] flex items-center justify-center">
            <Download className="w-5 h-5 text-black" />
          </div>
        </div>

        {/* Top badge */}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#D4AF37] text-black flex items-center gap-1">
          <Award className="w-3 h-3" />
          Concluido
        </span>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <h3 className="text-sm font-semibold text-white line-clamp-2 leading-snug">
          {certificate.module_name}
        </h3>
        <p className="text-[11px] text-[#b3b3b3] truncate">
          {certificate.completed_lessons} aulas concluidas
        </p>
        <p className="text-[10px] text-[#808080]">
          Emitido em {issuedDate} — {certificate.certificate_number}
        </p>
      </div>
    </button>
  );
}
