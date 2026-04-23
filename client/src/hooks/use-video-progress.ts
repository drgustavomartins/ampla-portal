/**
 * Client-side video watch progress, persisted in localStorage.
 * Used by the Netflix-style "Continue Watching" feature.
 *
 * Storage key: "ampla_video_progress"
 * Shape: Record<lessonId, { currentTime, duration, percentage, lastWatchedAt }>
 */

export interface VideoProgressEntry {
  currentTime: number; // seconds
  duration: number; // seconds
  percentage: number; // 0-100
  lastWatchedAt: string; // ISO date
}

type ProgressStore = Record<string, VideoProgressEntry>;

const STORAGE_KEY = "ampla_video_progress";

function getStore(): ProgressStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStore(store: ProgressStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // quota exceeded — silently fail
  }
}

export function getVideoProgress(lessonId: number): VideoProgressEntry | null {
  const store = getStore();
  return store[String(lessonId)] ?? null;
}

export function getAllVideoProgress(): ProgressStore {
  return getStore();
}

export function saveVideoProgress(
  lessonId: number,
  currentTime: number,
  duration: number,
) {
  if (duration <= 0) return;
  const percentage = Math.min(100, Math.round((currentTime / duration) * 100));
  const store = getStore();
  store[String(lessonId)] = {
    currentTime,
    duration,
    percentage,
    lastWatchedAt: new Date().toISOString(),
  };
  setStore(store);
}

export function clearVideoProgress(lessonId: number) {
  const store = getStore();
  delete store[String(lessonId)];
  setStore(store);
}

/**
 * Computes "minutes remaining" from a progress entry.
 */
export function minutesRemaining(entry: VideoProgressEntry): number {
  const remaining = Math.max(0, entry.duration - entry.currentTime);
  return Math.ceil(remaining / 60);
}
