import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trackPageVisit } from "@/lib/visitor-tracker";

/**
 * Invisible component that auto-tracks page visits on route changes.
 * Mount once at the top level of the app (inside the Router).
 */
export function VisitorTracker() {
  const [location] = useLocation();
  const prevLocation = useRef<string | null>(null);

  useEffect(() => {
    // Only track when location actually changes (avoid double-fires)
    if (prevLocation.current !== location) {
      prevLocation.current = location;
      trackPageVisit(location);
    }
  }, [location]);

  // Also track on initial mount
  useEffect(() => {
    trackPageVisit();
  }, []);

  return null;
}
