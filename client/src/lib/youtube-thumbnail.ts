/**
 * YouTube thumbnail utilities — robust ID extraction + progressive fallback.
 *
 * Supports URL formats:
 *   youtube.com/watch?v=ID, youtube.com/watch?v=ID&t=123
 *   youtu.be/ID, youtu.be/ID?t=123
 *   youtube.com/embed/ID, youtube.com/v/ID, youtube.com/shorts/ID
 *   Raw 11-char ID string
 */

const YT_PATTERNS = [
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  /^([a-zA-Z0-9_-]{11})$/,
];

export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  for (const p of YT_PATTERNS) {
    const m = trimmed.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

export type ThumbnailSize = "maxresdefault" | "hqdefault" | "mqdefault" | "sddefault" | "0";

export function getYouTubeThumbnail(
  videoIdOrUrl: string | null | undefined,
  size: ThumbnailSize = "hqdefault",
): string | null {
  const id = extractYouTubeId(videoIdOrUrl);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/${size}.jpg`;
}

/** Fallback chain: maxresdefault → hqdefault → mqdefault → 0 → null */
const FALLBACK_ORDER: ThumbnailSize[] = ["maxresdefault", "hqdefault", "mqdefault", "0"];

/**
 * Get the next fallback size after the current one fails.
 * Returns null if no more fallbacks.
 */
export function getNextFallback(currentSrc: string): string | null {
  for (let i = 0; i < FALLBACK_ORDER.length - 1; i++) {
    if (currentSrc.includes(`/${FALLBACK_ORDER[i]}.jpg`)) {
      return currentSrc.replace(`/${FALLBACK_ORDER[i]}.jpg`, `/${FALLBACK_ORDER[i + 1]}.jpg`);
    }
  }
  return null;
}
