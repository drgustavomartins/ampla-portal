import { useEffect } from "react";
import { X } from "lucide-react";

interface TheaterModeProps {
  children: React.ReactNode;
  onExit: () => void;
}

export function TheaterMode({ children, onExit }: TheaterModeProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [onExit]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-200">
      <button
        onClick={onExit}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        aria-label="Sair do modo teatro"
      >
        <X className="w-5 h-5" />
      </button>
      <div className="w-full max-w-[90vw] max-h-[90vh] aspect-video">
        {children}
      </div>
    </div>
  );
}
