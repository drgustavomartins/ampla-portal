/**
 * Client-side video watch progress, persisted in localStorage + synced to DB.
 * Used by the Netflix-style "Continue Watching" feature.
 *
 * Storage key: "ampla_video_progress"
 * Shape: Record<lessonId, { currentTime, duration, percentage, lastWatchedAt }>
 *
 * DB sync: saveVideoProgress() debounces a POST to /api/student/video-progress
 * every 5 seconds so progress survives across devices/browsers.
 * On init, mergeServerProgress() merges server data into localStorage
 * (server wins if more recent).
 */

import { apiRequest } from "@/lib/queryClient";

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

// ---- DB sync debounce ----
const pendingSync = new Map<number, ReturnType<typeof setTimeout>>();

function syncToServer(lessonId: number, currentTime: number, duration: number) {
  // Debounce 5s per lessonId
  const existing = pendingSync.get(lessonId);
  if (existing) clearTimeout(existing);
  pendingSync.set(lessonId, setTimeout(() => {
    pendingSync.delete(lessonId);
    apiRequest("POST", "/api/student/video-progress", {
      lessonId,
      currentSeconds: Math.round(currentTime),
      durationSeconds: Math.round(duration),
    }).catch(() => {
      // silently fail — localStorage is the fallback
    });
  }, 5000));
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
  syncToServer(lessonId, currentTime, duration);
}

export function clearVideoProgress(lessonId: number) {
  const store = getStore();
  delete store[String(lessonId)];
  setStore(store);
}

/**
 * Merge server-side video progress rows into localStorage.
 * Server wins when its lastWatchedAt is more recent.
 * Called once on dashboard load with data from /api/student/init.
 */
export function mergeServerProgress(
  serverRows: Array<{
    lessonId: number;
    currentSeconds: number;
    durationSeconds: number | null;
    lastWatchedAt: string;
  }>,
) {
  if (!serverRows || serverRows.length === 0) return;
  const store = getStore();
  for (const row of serverRows) {
    const key = String(row.lessonId);
    const dur = row.durationSeconds ?? 0;
    const pct = dur > 0 ? Math.min(100, Math.round((row.currentSeconds / dur) * 100)) : 0;
    const serverEntry: VideoProgressEntry = {
      currentTime: row.currentSeconds,
      duration: dur,
      percentage: pct,
      lastWatchedAt: row.lastWatchedAt,
    };
    const local = store[key];
    // Server wins if local doesn't exist or server is more recent
    if (!local || new Date(row.lastWatchedAt) >= new Date(local.lastWatchedAt)) {
      store[key] = serverEntry;
    }
  }
  setStore(store);
}

/**
 * Computes "minutes remaining" from a progress entry.
 */
export function minutesRemaining(entry: VideoProgressEntry): number {
  const remaining = Math.max(0, entry.duration - entry.currentTime);
  return Math.ceil(remaining / 60);
}
