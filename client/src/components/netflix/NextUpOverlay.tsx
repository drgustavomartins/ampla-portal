import { useState, useEffect, useCallback } from "react";
import { Play, X } from "lucide-react";
import { YouTubeThumbnail } from "@/components/YouTubeThumbnail";
import type { Lesson } from "@shared/schema";

interface NextUpOverlayProps {
  nextLesson: Lesson;
  /** Seconds for the countdown (default 10) */
  countdownSeconds?: number;
  onPlay: () => void;
  onCancel: () => void;
}

export function NextUpOverlay({
  nextLesson,
  countdownSeconds = 10,
  onPlay,
  onCancel,
}: NextUpOverlayProps) {
  const [remaining, setRemaining] = useState(countdownSeconds);

  useEffect(() => {
    if (remaining <= 0) {
      onPlay();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onPlay]);

  const handleCancel = useCallback(() => {
    setRemaining(-1); // stop countdown
    onCancel();
  }, [onCancel]);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center px-4">
        {/* Countdown ring */}
        <div className="relative w-16 h-16">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="3" />
            <circle
              cx="32" cy="32" r="28" fill="none" stroke="#D4AF37" strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - remaining / countdownSeconds)}`}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
            {remaining}
          </span>
        </div>

        <p className="text-xs uppercase tracking-widest text-white/60 font-medium">Próxima aula</p>

        {/* Thumbnail + title */}
        <div className="w-full max-w-[240px] rounded-lg overflow-hidden">
          <div className="aspect-video">
            <YouTubeThumbnail
              videoIdOrUrl={nextLesson.videoUrl}
              startSize="mqdefault"
              title={nextLesson.title}
              imgClassName="w-full h-full object-cover"
            />
          </div>
          <div className="bg-[#14213D] px-3 py-2">
            <p className="text-sm font-semibold text-white line-clamp-2">{nextLesson.title}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onPlay}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#c9a432] text-black font-bold text-sm transition-colors"
          >
            <Play className="w-4 h-4 fill-black" />
            Assistir agora
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 px-3 py-2.5 rounded-lg border border-white/20 hover:border-white/40 text-white/70 hover:text-white text-sm transition-colors"
          >
            <X className="w-4 h-4" />
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
