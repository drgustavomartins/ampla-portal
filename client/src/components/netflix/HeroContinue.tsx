import { Play, Info } from "lucide-react";
import type { Lesson, Module } from "@shared/schema";
import type { VideoProgressEntry } from "@/hooks/use-video-progress";
import { minutesRemaining } from "@/hooks/use-video-progress";

interface HeroContinueProps {
  lesson: Lesson;
  module: Module | undefined;
  progress: VideoProgressEntry | null;
  isCompleted: boolean;
  firstName: string;
  onContinue: () => void;
  onDetails: () => void;
}

function getYouTubeThumbnail(videoUrl: string | null): string | null {
  if (!videoUrl) return null;
  const match = videoUrl.match(
    /(?:(?:www\.)?youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/,
  );
  // Use maxresdefault for hero (larger image)
  return match ? `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg` : null;
}

export function HeroContinue({
  lesson,
  module,
  progress,
  isCompleted,
  firstName,
  onContinue,
  onDetails,
}: HeroContinueProps) {
  const thumbnail = getYouTubeThumbnail(lesson.videoUrl);
  const hasProgress = progress && progress.percentage > 0 && progress.percentage < 95;
  const percentage = progress?.percentage ?? 0;
  const remaining = progress ? minutesRemaining(progress) : null;

  // If student has no in-progress lesson, show a welcome hero
  const isWelcome = !hasProgress && isCompleted === false && percentage === 0;

  return (
    <section
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ minHeight: "clamp(280px, 50vh, 480px)" }}
      aria-label={isWelcome ? "Boas-vindas" : `Continue de onde parou: ${lesson.title}`}
    >
      {/* Background thumbnail + gradient overlay */}
      <div className="absolute inset-0">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            className="w-full h-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="w-full h-full bg-[#141414]" />
        )}
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col justify-end h-full p-6 sm:p-8 lg:p-10" style={{ minHeight: "clamp(280px, 50vh, 480px)" }}>
        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-[#D4AF37] text-black w-fit mb-4">
          {isWelcome ? "Comece sua jornada" : "Continue de onde parou"}
        </span>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight max-w-2xl mb-1">
          {isWelcome
            ? `Boas-vindas, ${firstName}!`
            : lesson.title}
        </h1>

        {/* Subtitle (module name) */}
        {module && (
          <p className="text-sm sm:text-base text-[#b3b3b3] mb-4 max-w-xl">
            {isWelcome
              ? "Comece pelo primeiro módulo da sua formação"
              : module.title}
          </p>
        )}

        {/* Progress bar + remaining */}
        {hasProgress && (
          <div className="max-w-md mb-4 space-y-1.5">
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#e50914] transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-[#808080]">
              <span>{percentage}% concluído</span>
              {remaining !== null && remaining > 0 && (
                <span>{remaining} min restantes</span>
              )}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={onContinue}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#D4AF37] hover:bg-[#c9a432] text-black font-bold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label={isWelcome ? "Começar primeira aula" : `Continuar ${lesson.title}`}
          >
            <Play className="w-4 h-4 fill-black" />
            {isWelcome ? "Começar" : "Continuar"}
          </button>
          <button
            onClick={onDetails}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-white/30 hover:border-white/60 text-white font-semibold text-sm transition-colors bg-white/5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label={`Ver detalhes de ${module?.title ?? "módulo"}`}
          >
            <Info className="w-4 h-4" />
            Ver detalhes
          </button>
        </div>
      </div>
    </section>
  );
}
