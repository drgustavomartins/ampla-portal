import { useState, useEffect } from "react";
import { Play } from "lucide-react";
import { getNextFallback, extractYouTubeId, type ThumbnailSize } from "@/lib/youtube-thumbnail";

interface YouTubeThumbnailProps {
  videoIdOrUrl: string | null | undefined;
  /** Starting resolution. Hero uses "maxresdefault", cards use "mqdefault". */
  startSize?: ThumbnailSize;
  alt?: string;
  className?: string;
  imgClassName?: string;
  loading?: "eager" | "lazy";
  /** fetchpriority hint — use "high" for hero/above-the-fold images */
  fetchPriority?: "high" | "low" | "auto";
  /** Placeholder when no thumbnail available — rendered inside the container */
  placeholder?: React.ReactNode;
  /** Lesson/video title — shown in the "coming soon" placeholder when no video */
  title?: string;
}

function GradientPlayPlaceholder({ title }: { title?: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0A1628] via-[#14213D] to-[#1C2E52]">
      <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center mb-2">
        <Play className="w-5 h-5 text-[#D4AF37] ml-0.5" />
      </div>
      {title && (
        <p className="text-xs text-white/50 text-center px-4 line-clamp-2 max-w-[200px]">
          {title}
        </p>
      )}
    </div>
  );
}

function ComingSoonPlaceholder({ title }: { title?: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0A1628] via-[#14213D] to-[#1C2E52]">
      <span className="px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-[#D4AF37] text-black mb-3">
        Em Breve
      </span>
      {title && (
        <p className="text-xs text-white/50 text-center px-4 line-clamp-2 max-w-[200px]">
          {title}
        </p>
      )}
    </div>
  );
}

export function YouTubeThumbnail({
  videoIdOrUrl,
  startSize = "mqdefault",
  alt = "",
  className = "",
  imgClassName = "w-full h-full object-cover",
  loading = "lazy",
  fetchPriority,
  placeholder,
  title,
}: YouTubeThumbnailProps) {
  const videoId = extractYouTubeId(videoIdOrUrl);

  const [currentSize, setCurrentSize] = useState<ThumbnailSize>(startSize);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCurrentSize(startSize);
    setHasError(false);
  }, [videoId, startSize]);

  // No videoId extractable → show placeholder immediately
  if (!videoId) {
    return <>{placeholder ?? <ComingSoonPlaceholder title={title} />}</>;
  }

  // All fallbacks exhausted → show gradient play placeholder
  if (hasError) {
    return <>{placeholder ?? <GradientPlayPlaceholder title={title} />}</>;
  }

  const thumbUrl = `https://img.youtube.com/vi/${videoId}/${currentSize}.jpg`;

  return (
    <img
      key={`${videoId}-${currentSize}`}
      src={thumbUrl}
      alt={alt}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      {...(fetchPriority ? { fetchPriority } : {})}
      className={`${imgClassName} ${className}`}
      onError={() => {
        const next = getNextFallback(thumbUrl);
        if (next) {
          const match = next.match(/\/(maxresdefault|hqdefault|mqdefault|sddefault|0)\.jpg/);
          if (match) {
            setCurrentSize(match[1] as ThumbnailSize);
          } else {
            setHasError(true);
          }
        } else {
          setHasError(true);
        }
      }}
    />
  );
}
