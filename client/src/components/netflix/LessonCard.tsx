import { Play } from "lucide-react";
import type { Lesson, Module } from "@shared/schema";
import type { VideoProgressEntry } from "@/hooks/use-video-progress";
import { minutesRemaining } from "@/hooks/use-video-progress";

interface LessonCardProps {
  lesson: Lesson;
  module?: Module;
  progress?: VideoProgressEntry | null;
  isNext?: boolean;
  onClick: () => void;
}

function getYouTubeThumbnail(videoUrl: string | null): string | null {
  if (!videoUrl) return null;
  const match = videoUrl.match(
    /(?:(?:www\.)?youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/,
  );
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
}

export function LessonCard({
  lesson,
  module,
  progress,
  isNext,
  onClick,
}: LessonCardProps) {
  const thumbnail = getYouTubeThumbnail(lesson.videoUrl);
  const percentage = progress?.percentage ?? 0;
  const remaining = progress ? minutesRemaining(progress) : null;

  return (
    <button
      onClick={onClick}
      className="nf-card group shrink-0 w-[260px] sm:w-[280px] rounded-lg overflow-hidden bg-[#1a1a1a] transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_8px_24px_rgba(212,175,55,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] text-left"
      aria-label={`${isNext ? "Próxima aula: " : ""}${lesson.title}${module ? ` — ${module.title}` : ""}${remaining ? `. ${remaining} min restantes` : ""}`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[#141414] overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-10 h-10 text-white/20" />
          </div>
        )}

        {/* Overlay play icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-5 h-5 text-black fill-black ml-0.5" />
          </div>
        </div>

        {/* "PRÓXIMA" badge */}
        {isNext && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#D4AF37] text-black">
            Próxima
          </span>
        )}

        {/* Progress bar at bottom of thumbnail */}
        {percentage > 0 && percentage < 95 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-[#e50914] transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <h3 className="text-sm font-semibold text-white line-clamp-2 leading-snug">
          {lesson.title}
        </h3>
        {module && (
          <p className="text-[11px] text-[#b3b3b3] truncate">{module.title}</p>
        )}
        {remaining !== null && remaining > 0 && (
          <p className="text-[10px] text-[#808080]">{remaining} min restantes</p>
        )}
      </div>
    </button>
  );
}
