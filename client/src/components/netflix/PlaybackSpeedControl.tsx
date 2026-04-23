import { useState, useRef, useEffect } from "react";

const SPEEDS = [1, 1.25, 1.5, 2] as const;

interface PlaybackSpeedControlProps {
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export function PlaybackSpeedControl({ speed, onSpeedChange }: PlaybackSpeedControlProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-2 py-1 text-xs font-medium rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
        aria-label={`Velocidade de reprodução: ${speed}x`}
      >
        {speed}x
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-1 bg-[#14213D] border border-white/10 rounded-lg shadow-xl overflow-hidden z-10">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => { onSpeedChange(s); setOpen(false); }}
              className={`block w-full px-4 py-2 text-xs text-left transition-colors ${
                s === speed ? "bg-[#D4AF37]/20 text-[#D4AF37] font-bold" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
