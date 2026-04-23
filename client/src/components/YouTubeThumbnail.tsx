import { useState, useCallback } from "react";
import { Play } from "lucide-react";
import { getYouTubeThumbnail, getNextFallback, type ThumbnailSize } from "@/lib/youtube-thumbnail";

interface YouTubeThumbnailProps {
  videoIdOrUrl: string | null | undefined;
  /** Starting resolution. Hero uses "maxresdefault", cards use "hqdefault". */
  startSize?: ThumbnailSize;
  alt?: string;
  className?: string;
  imgClassName?: string;
  loading?: "eager" | "lazy";
  /** Placeholder when no thumbnail available — rendered inside the container */
  placeholder?: React.ReactNode;
}

const DEFAULT_PLACEHOLDER = (
  <div className="w-full h-full flex items-center justify-center bg-[#14213D]">
    <Play className="w-10 h-10 text-white/20" />
  </div>
);

export function YouTubeThumbnail({
  videoIdOrUrl,
  startSize = "hqdefault",
  alt = "",
  className = "",
  imgClassName = "w-full h-full object-cover",
  loading = "lazy",
  placeholder,
}: YouTubeThumbnailProps) {
  const initialSrc = getYouTubeThumbnail(videoIdOrUrl, startSize);
  const [src, setSrc] = useState<string | null>(initialSrc);
  const [failed, setFailed] = useState(false);

  const handleError = useCallback(() => {
    if (!src) { setFailed(true); return; }
    const next = getNextFallback(src);
    if (next) {
      setSrc(next);
    } else {
      setFailed(true);
    }
  }, [src]);

  if (!src || failed) {
    return <>{placeholder ?? DEFAULT_PLACEHOLDER}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      className={`${imgClassName} ${className}`}
      onError={handleError}
    />
  );
}
