import { memo } from "react";
import { Play, Info } from "lucide-react";
import type { Lesson, Module } from "@shared/schema";
import type { VideoProgressEntry } from "@/hooks/use-video-progress";
import { minutesRemaining } from "@/hooks/use-video-progress";
import { YouTubeThumbnail } from "@/components/YouTubeThumbnail";

export type HeroMode = "continue-watching" | "continue-journey" | "welcome";

interface HeroContinueProps {
  lesson: Lesson;
  module: Module | undefined;
  progress: VideoProgressEntry | null;
  isCompleted: boolean;
  firstName: string;
  heroMode: HeroMode;
  onContinue: () => void;
  onDetails: () => void;
}

export const HeroContinue = memo(function HeroContinue({
  lesson,
  module,
  progress,
  isCompleted,
  firstName,
  heroMode,
  onContinue,
  onDetails,
}: HeroContinueProps) {
  const hasProgress = progress && progress.percentage > 0 && progress.percentage < 95;
  const percentage = progress?.percentage ?? 0;
  const remaining = progress ? minutesRemaining(progress) : null;

  const isWelcome = heroMode === "welcome";
  const isContinueJourney = heroMode === "continue-journey";

  const badgeText = isWelcome
    ? "Comece sua jornada"
    : isContinueJourney
      ? "Continue sua jornada"
      : "Continue de onde parou";

  const titleText = isWelcome
    ? `Boas-vindas, ${firstName}!`
    : lesson.title;

  const subtitleText = isWelcome
    ? "Comece pelo primeiro módulo da sua formação"
    : isContinueJourney
      ? `Próxima aula: ${module?.title ?? ""}`
      : module?.title ?? "";

  const buttonLabel = isWelcome
    ? "Começar"
    : isContinueJourney
      ? "Assistir"
      : "Continuar";

  return (
    <section
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ minHeight: "clamp(280px, 50vh, 480px)" }}
      aria-label={isWelcome ? "Boas-vindas" : `Continue de onde parou: ${lesson.title}`}
    >
      {/* Background thumbnail + gradient overlay */}
      <div className="absolute inset-0">
        <YouTubeThumbnail
          videoIdOrUrl={lesson.videoUrl}
          startSize="maxresdefault"
          loading="eager"
          fetchPriority="high"
          title={lesson.title}
          placeholder={<div className="w-full h-full bg-[#0A1628]" />}
        />
        {/* Gradient overlays (navy) */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628]/90 via-[#0A1628]/70 to-[#0A1628]/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628]/80 via-transparent to-[#0A1628]/20" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col justify-end h-full p-6 sm:p-8 lg:p-10" style={{ minHeight: "clamp(280px, 50vh, 480px)" }}>
        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-[#D4AF37] text-black w-fit mb-4">
          {badgeText}
        </span>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight max-w-2xl mb-1">
          {titleText}
        </h1>

        {/* Subtitle (module name) */}
        {(module || isWelcome) && (
          <p className="text-sm sm:text-base text-[#b3b3b3] mb-4 max-w-xl">
            {subtitleText}
          </p>
        )}

        {/* Progress bar + remaining (only for continue-watching mode) */}
        {hasProgress && heroMode === "continue-watching" && (
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#D4AF37] hover:bg-[#c9a432] text-black font-bold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1628]"
            aria-label={isWelcome ? "Começar primeira aula" : `Continuar ${lesson.title}`}
          >
            <Play className="w-4 h-4 fill-black" />
            {buttonLabel}
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
});
