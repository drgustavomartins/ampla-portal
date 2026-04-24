import { memo } from "react";

/**
 * Skeleton loading state for a LessonRow — shown via Suspense fallback.
 */
export const RowSkeleton = memo(function RowSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-6 w-48 rounded bg-white/5 animate-pulse" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="shrink-0 w-[260px] sm:w-[280px] rounded-lg overflow-hidden bg-[#14213D]">
            <div className="aspect-video bg-white/5 animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-3/4 rounded bg-white/5 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
