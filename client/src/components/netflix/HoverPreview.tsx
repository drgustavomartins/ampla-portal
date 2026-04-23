import { useState, useRef, useCallback, useEffect } from "react";
import { extractYouTubeId } from "@/lib/youtube-thumbnail";

interface HoverPreviewProps {
  videoUrl: string | null | undefined;
  children: React.ReactNode;
  /** Delay before preview starts (ms) */
  delay?: number;
  className?: string;
}

/**
 * Desktop-only hover preview. Wraps a card and shows a muted YouTube
 * thumbnail-sized player on hover after a delay.
 * Uses a lightweight embed (no full Player API) to keep it simple.
 */
export function HoverPreview({
  videoUrl,
  children,
  delay = 800,
  className = "",
}: HoverPreviewProps) {
  const [hovering, setHovering] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoId = extractYouTubeId(videoUrl);

  // Only enable on non-touch devices
  const isTouch = typeof window !== "undefined" && "ontouchstart" in window;

  const handleEnter = useCallback(() => {
    if (isTouch || !videoId) return;
    setHovering(true);
    timeoutRef.current = setTimeout(() => setShowPreview(true), delay);
  }, [videoId, delay, isTouch]);

  const handleLeave = useCallback(() => {
    setHovering(false);
    setShowPreview(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      {showPreview && videoId && (
        <div className="absolute inset-0 z-10 rounded-lg overflow-hidden shadow-2xl pointer-events-none">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&loop=1&playlist=${videoId}&start=5`}
            className="w-full h-full"
            allow="autoplay"
            tabIndex={-1}
          />
        </div>
      )}
    </div>
  );
}
