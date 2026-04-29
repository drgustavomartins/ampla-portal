import { useRef, useEffect, useCallback, useState } from "react";
import { extractYouTubeId } from "@/lib/youtube-thumbnail";
import { saveVideoProgress, getVideoProgress } from "@/hooks/use-video-progress";
import { PlaybackSpeedControl } from "./PlaybackSpeedControl";

/* ── YouTube IFrame API global bootstrap ── */
let apiReady = false;
let apiLoading = false;
const readyCallbacks: (() => void)[] = [];

function ensureYTApi(): Promise<void> {
  if (apiReady) return Promise.resolve();
  return new Promise((resolve) => {
    readyCallbacks.push(resolve);
    if (apiLoading) return;
    apiLoading = true;
    const prev = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      prev?.();
      apiReady = true;
      readyCallbacks.forEach((cb) => cb());
      readyCallbacks.length = 0;
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
}

/* ── Types ── */
export interface NetflixPlayerProps {
  videoUrl: string | null | undefined;
  lessonId: number;
  lessonTitle: string;
  /** Called when video ends naturally */
  onEnded?: () => void;
  /** Called periodically with current progress */
  onProgress?: (currentTime: number, duration: number) => void;
  /** Enable theater (wide) mode */
  theaterMode?: boolean;
}

/* ── Component ── */
export function NetflixPlayer({
  videoUrl,
  lessonId,
  lessonTitle,
  onEnded,
  onProgress,
  theaterMode,
}: NetflixPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lessonIdRef = useRef(lessonId);
  const onEndedRef = useRef(onEnded);
  const onProgressRef = useRef(onProgress);
  const [speed, setSpeed] = useState(1);
  const [playerReady, setPlayerReady] = useState(false);

  // Keep refs current
  lessonIdRef.current = lessonId;
  onEndedRef.current = onEnded;
  onProgressRef.current = onProgress;

  const videoId = extractYouTubeId(videoUrl);

  const saveProgress = useCallback(() => {
    const p = playerRef.current;
    if (!p || typeof p.getCurrentTime !== "function") return;
    try {
      const ct = p.getCurrentTime();
      const dur = p.getDuration();
      if (dur > 0) {
        saveVideoProgress(lessonIdRef.current, ct, dur);
        onProgressRef.current?.(ct, dur);
      }
    } catch {
      // player may be destroyed
    }
  }, []);

  const startProgressInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(saveProgress, 10_000);
  }, [saveProgress]);

  const stopProgressInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Save on visibilitychange and beforeunload
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) saveProgress();
    };
    const handleBeforeUnload = () => saveProgress();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveProgress]);

  // Create / update player
  useEffect(() => {
    if (!videoId || !containerRef.current) return;

    let destroyed = false;

    const createPlayer = async () => {
      await ensureYTApi();
      if (destroyed || !containerRef.current) return;

      // If player exists and video changed, load new video
      if (playerRef.current) {
        try {
          const existingProgress = getVideoProgress(lessonId);
          const startTime = existingProgress?.percentage && existingProgress.percentage < 95
            ? Math.max(0, existingProgress.currentTime - 2)
            : 0;
          playerRef.current.loadVideoById({
            videoId,
            startSeconds: startTime,
          });
          setSpeed(1);
          return;
        } catch {
          // player may be stale, recreate
        }
      }

      // Determine start time from saved progress
      const existingProgress = getVideoProgress(lessonId);
      const startTime = existingProgress?.percentage && existingProgress.percentage < 95
        ? Math.max(0, existingProgress.currentTime - 2)
        : 0;

      // Clear container
      containerRef.current.innerHTML = "";
      const div = document.createElement("div");
      div.id = `yt-player-${lessonId}`;
      containerRef.current.appendChild(div);

      playerRef.current = new YT.Player(div.id, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          fs: 1,
          start: Math.floor(startTime),
          playsinline: 1,
        },
        events: {
          onReady: () => {
            if (destroyed) return;
            // Ensure fullscreen permissions on the iframe created by the
            // YouTube IFrame API. Some browsers (notably iOS Safari and
            // some Android Chrome versions) won't expose the fullscreen
            // button unless these attributes are present on the iframe.
            try {
              const iframe = containerRef.current?.querySelector("iframe");
              if (iframe) {
                iframe.setAttribute(
                  "allow",
                  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
                );
                iframe.setAttribute("allowfullscreen", "true");
                iframe.setAttribute("webkitallowfullscreen", "true");
                iframe.setAttribute("mozallowfullscreen", "true");
              }
            } catch { /* noop */ }
            setPlayerReady(true);
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            if (destroyed) return;
            switch (event.data) {
              case YT.PlayerState.PLAYING:
                startProgressInterval();
                break;
              case YT.PlayerState.PAUSED:
                saveProgress();
                stopProgressInterval();
                break;
              case YT.PlayerState.ENDED:
                saveProgress();
                stopProgressInterval();
                onEndedRef.current?.();
                break;
            }
          },
        },
      });
    };

    createPlayer();

    return () => {
      destroyed = true;
      stopProgressInterval();
      saveProgress();
    };
  }, [videoId, lessonId]);

  // Apply playback speed
  useEffect(() => {
    if (playerRef.current && playerReady) {
      try {
        playerRef.current.setPlaybackRate(speed);
      } catch {
        // player may not support it
      }
    }
  }, [speed, playerReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProgressInterval();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch { /* */ }
        playerRef.current = null;
      }
    };
  }, []);

  if (!videoId) {
    return (
      <div className="aspect-video bg-gradient-to-br from-[#0A1628] via-[#14213D] to-[#1C2E52] rounded-lg flex flex-col items-center justify-center ring-1 ring-border/30">
        <span className="px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-[#D4AF37] text-black mb-3">
          Em Breve
        </span>
        <p className="text-sm text-white/50">{lessonTitle}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={`aspect-video bg-black rounded-lg overflow-hidden ring-1 ring-border/30 ${theaterMode ? "fixed inset-0 z-50 rounded-none ring-0" : ""}`}
      >
        <div ref={containerRef} className="w-full h-full [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full" />
      </div>
      {playerReady && !theaterMode && (
        <div className="flex items-center justify-end">
          <PlaybackSpeedControl speed={speed} onSpeedChange={setSpeed} />
        </div>
      )}
    </div>
  );
}
