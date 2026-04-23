import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface LessonRowProps {
  title: string;
  children: React.ReactNode;
}

export function LessonRow({ title, children }: LessonRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, []);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector(".nf-card");
    const w = card ? card.clientWidth + 16 : 296;
    el.scrollBy({ left: direction === "left" ? -w : w, behavior: "smooth" });
  };

  return (
    <section className="space-y-3" aria-label={title}>
      <h2 className="text-lg sm:text-xl font-semibold text-white px-1">
        {title}
      </h2>

      <div className="relative group/row">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            aria-label="Rolar para a esquerda"
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-[#0A1628]/70 border border-white/10 items-center justify-center text-white/70 hover:text-white hover:bg-[#0A1628]/90 transition-all opacity-0 group-hover/row:opacity-100 -translate-x-1/2"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            aria-label="Rolar para a direita"
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-[#0A1628]/70 border border-white/10 items-center justify-center text-white/70 hover:text-white hover:bg-[#0A1628]/90 transition-all opacity-0 group-hover/row:opacity-100 translate-x-1/2"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-none scroll-smooth -mx-4 px-4 sm:-mx-6 sm:px-6"
          style={{ scrollSnapType: "x proximity" }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
