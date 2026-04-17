// ─── Visitor Tracking ────────────────────────────────────────────────────────
// Generates a unique visitor_id (UUID) stored in localStorage. On each page
// navigation sends a page-visit event to /api/tracking/pagevisit, along with
// any UTM parameters present in the URL or previously captured.

import { getUtmData, captureUtmParams } from "./utm";

const VISITOR_ID_KEY = "ampla_visitor_id";

/** Get or create a persistent visitor ID */
export function getVisitorId(): string {
  let vid = localStorage.getItem(VISITOR_ID_KEY);
  if (!vid) {
    vid = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, vid);
  }
  return vid;
}

/** Track a page visit — call on every route change */
export function trackPageVisit(page?: string): void {
  try {
    captureUtmParams();
    const visitorId = getVisitorId();
    const utm = getUtmData();
    const currentPage = page || window.location.hash.replace(/^#/, "") || "/";

    fetch("/api/tracking/pagevisit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitor_id: visitorId,
        page: currentPage,
        referrer: document.referrer || null,
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        utm_content: utm.utm_content,
        utm_term: utm.utm_term,
        lead_source: utm.lead_source,
      }),
    }).catch(() => {});
  } catch {
    // Never break the app for tracking failures
  }
}
