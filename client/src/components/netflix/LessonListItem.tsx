import { Play, Lock, CheckCircle2, Clock, Paperclip } from "lucide-react";
import type { Lesson } from "@shared/schema";
import type { VideoProgressEntry } from "@/hooks/use-video-progress";

interface LessonListItemProps {
  lesson: Lesson;
  index: number;
  isCompleted: boolean;
  isActive: boolean;
  isLocked: boolean;
  progress?: VideoProgressEntry | null;
  supportLink?: { url: string; label: string } | null;
  descLine?: string | null;
  onClick: () => void;
}

function getYouTubeThumbnail(videoUrl: string | null): string | null {
  if (!videoUrl) return null;
  const match = videoUrl.match(
    /(?:(?:www\.)?youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/,
  );
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
}

function getLessonBadge(lesson: Lesson): string | null {
  const createdAt = (lesson as any).createdAt;
  const updatedAt = (lesson as any).updatedAt;
  if (!createdAt && !updatedAt) return null;
  const now = Date.now();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  if (createdAt && (now - new Date(createdAt).getTime()) < fourteenDays) return "NOVO";
  if (updatedAt && (now - new Date(updatedAt).getTime()) < fourteenDays) return "ATUALIZADO";
  return null;
}

export function LessonListItem({
  lesson,
  index,
  isCompleted,
  isActive,
  isLocked,
  progress,
  supportLink,
  descLine,
  onClick,
}: LessonListItemProps) {
  const thumbnail = getYouTubeThumbnail(lesson.videoUrl);
  const percentage = progress?.percentage ?? 0;
  const badge = getLessonBadge(lesson);
  const isDivider = lesson.title.startsWith("\u2501");

  if (isDivider) {
    return (
      <div className="px-4 pt-8 pb-3">
        <p className="text-sm font-bold uppercase tracking-widest text-[#D4AF37] border-b border-[#D4AF37]/20 pb-2">
          {lesson.title.replace(/\u2501/g, "").trim()}
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left group transition-all duration-200 ${isLocked ? "cursor-default opacity-50" : "cursor-pointer"}`}
    >
      <div
        className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 border ${
          isActive
            ? "border-[#D4AF37]/30 bg-[#D4AF37]/5"
            : isCompleted
              ? "border-transparent bg-[#1a1a1a]/60"
              : "border-transparent hover:bg-[#1a1a1a]/80"
        }`}
      >
        {/* Lesson number */}
        <span
          className={`w-8 text-center text-sm font-medium shrink-0 ${
            isCompleted ? "text-[#D4AF37]" : isLocked ? "text-white/20" : "text-[#808080]"
          }`}
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Thumbnail */}
        <div className="shrink-0 relative w-28 h-16 rounded-md overflow-hidden bg-[#141414]">
          {isLocked ? (
            <div className="w-full h-full flex items-center justify-center bg-[#141414]">
              <Lock className="w-4 h-4 text-white/20" />
            </div>
          ) : thumbnail ? (
            <>
              <img src={thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
              {/* Play icon overlay on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </div>
              {/* Completed overlay */}
              {isCompleted && (
                <div className="absolute top-1 right-1">
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37] drop-shadow-md" />
                </div>
              )}
              {/* Progress bar */}
              {percentage > 0 && percentage < 95 && !isCompleted && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
                  <div className="h-full bg-[#e50914]" style={{ width: `${percentage}%` }} />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />
              ) : (
                <Play className="w-5 h-5 text-white/20" />
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <p
              className={`text-sm font-medium truncate ${
                isActive ? "text-[#D4AF37]" : isLocked ? "text-white/30" : isCompleted ? "text-white/70" : "text-white"
              }`}
            >
              {lesson.title}
            </p>
            {badge && (
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#D4AF37]/80 text-black">
                {badge}
              </span>
            )}
          </div>
          {descLine && !isLocked && (
            <p className="text-[11px] text-[#808080] truncate">{descLine}</p>
          )}
          {supportLink && !isLocked && (
            <a
              href={supportLink.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] text-[#D4AF37] hover:underline"
            >
              <Paperclip className="w-3 h-3" />
              {supportLink.label}
            </a>
          )}
        </div>

        {/* Duration */}
        {lesson.duration && (
          <span className="text-xs text-[#808080] shrink-0 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {lesson.duration}
          </span>
        )}
      </div>
    </button>
  );
}
