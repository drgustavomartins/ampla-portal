import { useState, useEffect } from "react";
import { getTimeLeft, type TimeLeft } from "@/lib/offer-deadline";

export function useCountdown(): TimeLeft {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft);

  useEffect(() => {
    const id = setInterval(() => {
      const tl = getTimeLeft();
      setTimeLeft(tl);
      if (tl.expired) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return timeLeft;
}
