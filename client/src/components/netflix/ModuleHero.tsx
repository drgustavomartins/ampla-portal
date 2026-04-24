import { memo } from "react";
import { Play, Plus, BookOpen, CheckCircle2, Clock } from "lucide-react";
import type { Module } from "@shared/schema";

interface ModuleHeroProps {
  module: Module;
  totalLessons: number;
  completedLessons: number;
  totalDuration: string | null;
  progressPercent: number;
  hasProgress: boolean;
  onContinue: () => void;
}

function getCourseImage(mod: Module): string | null {
  const title = mod.title.toLowerCase();
  if (title.includes("toxina")) return "/images/course-toxina.png";
  if (title.includes("preenchedores") || title.includes("ácido") || title.includes("acido")) return "/images/course-preenchedores.png";
  if (title.includes("bioestimulador")) return "/images/bioestimuladores-colageno.png";
  if (title.includes("regeneração") || title.includes("regeneracao") || title.includes("modulador") || title.includes("matriz")) return "/images/moduladores-matriz.png";
  if (title.includes("naturalup") || title.includes("natural up") || title.includes("método") || title.includes("metodo")) return "/images/naturalup-v2.png";
  if (title.includes("boas vindas") || title.includes("boas-vindas")) return "/images/boas-vindas-v2.png";
  return null;
}

export const ModuleHero = memo(function ModuleHero({
  module: mod,
  totalLessons,
  completedLessons,
  totalDuration,
  progressPercent,
  hasProgress,
  onContinue,
}: ModuleHeroProps) {
  const courseImage = getCourseImage(mod);

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ minHeight: "clamp(320px, 55vh, 520px)" }}
    >
      {/* Background image + gradient */}
      <div className="absolute inset-0">
        {courseImage ? (
          <img
            src={courseImage}
            alt=""
            className="w-full h-full object-cover object-[30%_center] sm:object-center"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628]/90 via-[#0A1628]/75 to-[#0A1628]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-transparent to-[#0A1628]/30" />
      </div>

      {/* Content */}
      <div
        className="relative flex flex-col justify-end h-full px-4 sm:px-6 lg:px-10 pb-8 sm:pb-10 pt-20"
        style={{ minHeight: "clamp(320px, 55vh, 520px)" }}
      >
        {/* Module title */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight max-w-3xl mb-3">
          {mod.title}
        </h1>

        {/* Description */}
        {mod.description && (
          <p className="text-sm sm:text-base text-[#b3b3b3] max-w-2xl leading-relaxed mb-4">
            {mod.description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-4 sm:gap-6 text-sm text-[#b3b3b3] mb-5 flex-wrap">
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-[#D4AF37]" />
            {totalLessons} {totalLessons === 1 ? "aula" : "aulas"}
          </span>
          {totalDuration && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#D4AF37]" />
              {totalDuration}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
            {progressPercent}% concluído
          </span>
        </div>

        {/* Progress bar */}
        {progressPercent > 0 && (
          <div className="max-w-lg mb-5">
            <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#D4AF37] transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onContinue}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[#D4AF37] hover:bg-[#c9a432] text-black font-bold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <Play className="w-4 h-4 fill-black" />
            {hasProgress ? "Continuar" : "Começar"}
          </button>
          <button
            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-lg border border-white/30 hover:border-white/60 text-white font-semibold text-sm transition-colors bg-white/5 hover:bg-white/10"
          >
            <Plus className="w-4 h-4" />
            Minha Lista
          </button>
        </div>
      </div>
    </section>
  );
});
