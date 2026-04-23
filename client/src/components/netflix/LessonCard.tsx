import { Play } from "lucide-react";
import type { Lesson, Module } from "@shared/schema";
import type { VideoProgressEntry } from "@/hooks/use-video-progress";
import { minutesRemaining } from "@/hooks/use-video-progress";
import { YouTubeThumbnail } from "@/components/YouTubeThumbnail";
import { HoverPreview } from "./HoverPreview";

interface LessonCardProps {
  lesson: Lesson;
  module?: Module;
  progress?: VideoProgressEntry | null;
  isNext?: boolean;
  isCompleted?: boolean;
  onClick: () => void;
}

function getLessonBadge(lesson: Lesson): { label: string; style: string } | null {
  const createdAt = (lesson as any).createdAt;
  const updatedAt = (lesson as any).updatedAt;
  if (!createdAt && !updatedAt) return null;

  const now = Date.now();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;

  if (createdAt && (now - new Date(createdAt).getTime()) < fourteenDays) {
    return { label: "NOVO", style: "bg-[#D4AF37] text-black" };
  }

  if (updatedAt && (now - new Date(updatedAt).getTime()) < fourteenDays) {
    return { label: "ATUALIZADO", style: "bg-[#D4AF37]/80 text-black" };
  }

  return null;
}
export function LessonCard({
  lesson,
  module,
  progress,
  isNext,
  isCompleted,
  onClick,
}: LessonCardProps) {
  const percentage = progress?.percentage ?? 0;
  const remaining = progress ? minutesRemaining(progress) : null;
  const badge = getLessonBadge(lesson);

  return (
    <button
      onClick={onClick}
      className="nf-card group shrink-0 w-[260px] sm:w-[280px] rounded-lg overflow-hidden bg-[#14213D] transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_8px_24px_rgba(212,175,55,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] text-left"
      aria-label={`${isNext ? "Próxima aula: " : ""}${lesson.title}${module ? ` — ${module.title}` : ""}${remaining ? `. ${remaining} min restantes` : ""}`}
    >
      {/* Thumbnail with hover preview */}
      <HoverPreview videoUrl={lesson.videoUrl} className="relative aspect-video bg-[#0A1628] overflow-hidden">
        <YouTubeThumbnail
          videoIdOrUrl={lesson.videoUrl}
          startSize="hqdefault"
          title={lesson.title}
          imgClassName="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {/* Overlay play icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#0A1628]/30">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-5 h-5 text-black fill-black ml-0.5" />
          </div>
        </div>

        {/* Top-left badge: PRÓXIMA > NOVO > ATUALIZADO (priority order) */}
        {isNext ? (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#D4AF37] text-black">
            Próxima
          </span>
        ) : badge ? (
          <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badge.style}`}>
            {badge.label}
          </span>
        ) : null}

        {/* Completed checkmark */}
        {isCompleted && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#D4AF37] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
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
      </HoverPreview>

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
