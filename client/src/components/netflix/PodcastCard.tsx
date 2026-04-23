import { Headphones, Play } from "lucide-react";
import { YouTubeThumbnail } from "@/components/YouTubeThumbnail";
import type { SupplementaryItem } from "@/hooks/use-student-init";

interface PodcastCardProps {
  item: SupplementaryItem;
  onClick: () => void;
}

export function PodcastCard({ item, onClick }: PodcastCardProps) {
  return (
    <button
      onClick={onClick}
      className="nf-card group shrink-0 w-[260px] sm:w-[280px] rounded-lg overflow-hidden bg-[#14213D] transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_8px_24px_rgba(212,175,55,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] text-left"
      aria-label={item.title}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[#0A1628] overflow-hidden">
        {item.video_url ? (
          <YouTubeThumbnail
            videoIdOrUrl={item.video_url}
            startSize="hqdefault"
            title={item.title}
            imgClassName="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1C2E52] to-[#0A1628]">
            <Headphones className="w-12 h-12 text-[#D4AF37]/50" />
          </div>
        )}

        {/* Overlay play icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#0A1628]/30">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-5 h-5 text-black fill-black ml-0.5" />
          </div>
        </div>

        {/* Podcast badge */}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#D4AF37] text-black flex items-center gap-1">
          <Headphones className="w-3 h-3" />
          Podcast
        </span>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <h3 className="text-sm font-semibold text-white line-clamp-2 leading-snug">
          {item.title}
        </h3>
        {item.category && (
          <p className="text-[11px] text-[#b3b3b3] truncate">{item.category}</p>
        )}
        {item.duration && (
          <p className="text-[10px] text-[#808080]">{item.duration}</p>
        )}
      </div>
    </button>
  );
}
