/** Minimal YouTube IFrame Player API type declarations */
declare namespace YT {
  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }

  interface PlayerOptions {
    videoId?: string;
    width?: number | string;
    height?: number | string;
    playerVars?: Record<string, unknown>;
    events?: {
      onReady?: (event: PlayerEvent) => void;
      onStateChange?: (event: OnStateChangeEvent) => void;
      onError?: (event: OnErrorEvent) => void;
    };
  }

  interface PlayerEvent {
    target: Player;
  }

  interface OnStateChangeEvent {
    target: Player;
    data: number;
  }

  interface OnErrorEvent {
    target: Player;
    data: number;
  }

  class Player {
    constructor(elementId: string | HTMLElement, options: PlayerOptions);
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead?: boolean): void;
    loadVideoById(args: { videoId: string; startSeconds?: number }): void;
    getCurrentTime(): number;
    getDuration(): number;
    getPlayerState(): number;
    setPlaybackRate(rate: number): void;
    getPlaybackRate(): number;
    getAvailablePlaybackRates(): number[];
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    setVolume(volume: number): void;
    getVolume(): number;
    destroy(): void;
  }
}
