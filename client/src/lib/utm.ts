// ─── UTM Tracking Utility ────────────────────────────────────────────────────
// Captures UTM parameters from URL query strings, persists them in localStorage,
// and provides lead source classification from referrer when no UTMs are present.

const UTM_STORAGE_KEY = "ampla_utm";
const LANDING_PAGE_KEY = "ampla_landing_page";
const INVITE_CODE_KEY = "ampla_invite_code";

export interface UtmData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  lead_source?: string;
  landing_page?: string;
}

/** Read UTM params and invite code from the current URL and store in localStorage. Call on page load. */
export function captureUtmParams(): void {
  const params = new URLSearchParams(window.location.search);

  // Capture invite code from ?invite=CODE (before the hash)
  const inviteCode = params.get("invite");
  if (inviteCode) {
    localStorage.setItem(INVITE_CODE_KEY, inviteCode.trim());
  }
  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");
  const utmContent = params.get("utm_content");
  const utmTerm = params.get("utm_term");

  // Only overwrite if we have at least one UTM param in the URL
  if (utmSource || utmMedium || utmCampaign || utmContent || utmTerm) {
    const data: UtmData = {};
    if (utmSource) data.utm_source = utmSource;
    if (utmMedium) data.utm_medium = utmMedium;
    if (utmCampaign) data.utm_campaign = utmCampaign;
    if (utmContent) data.utm_content = utmContent;
    if (utmTerm) data.utm_term = utmTerm;
    data.lead_source = classifyLeadSource(utmSource);
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(data));
  }

  // Always store the landing page on first visit
  if (!localStorage.getItem(LANDING_PAGE_KEY)) {
    localStorage.setItem(LANDING_PAGE_KEY, window.location.pathname + window.location.search);
  }
}

/** Classify lead source from utm_source value */
function classifyLeadSource(utmSource: string | null | undefined): string {
  if (!utmSource) return classifyFromReferrer();
  const src = utmSource.toLowerCase();
  if (src === "instagram" || src === "ig") return "Instagram";
  if (src === "facebook" || src === "fb" || src === "meta") return "Meta Ads";
  if (src === "whatsapp" || src === "wa") return "WhatsApp";
  if (src === "google") return "Google";
  if (src === "referral" || src === "indicacao") return "Indicação";
  return "Direto";
}

/** Classify lead source from document.referrer when no UTM params exist */
function classifyFromReferrer(): string {
  const ref = (typeof document !== "undefined" ? document.referrer : "").toLowerCase();
  if (!ref) return "Direto";
  if (ref.includes("instagram")) return "Instagram";
  if (ref.includes("facebook") || ref.includes("fb.com") || ref.includes("fbclid")) return "Meta Ads";
  if (ref.includes("google")) return "Google";
  if (ref.includes("whatsapp") || ref.includes("wa.me")) return "WhatsApp";
  // Same domain = direct
  if (typeof window !== "undefined" && ref.includes(window.location.hostname)) return "Direto";
  return "Direto";
}

/** Get stored UTM data for inclusion in registration requests */
export function getUtmData(): UtmData & { visitor_id?: string } {
  const stored = localStorage.getItem(UTM_STORAGE_KEY);
  const landingPage = localStorage.getItem(LANDING_PAGE_KEY);
  const data: UtmData & { visitor_id?: string } = stored ? JSON.parse(stored) : {};

  // If no UTM data was captured, try to classify from referrer
  if (!data.lead_source) {
    data.lead_source = classifyFromReferrer();
  }

  if (landingPage) {
    data.landing_page = landingPage;
  }

  // Include visitor_id for linking anonymous tracking to user account
  const visitorId = localStorage.getItem("ampla_visitor_id");
  if (visitorId) {
    data.visitor_id = visitorId;
  }

  return data;
}

/** Get stored invite code (captured from ?invite=CODE URL param) */
export function getInviteCode(): string | null {
  return localStorage.getItem(INVITE_CODE_KEY);
}

/** Clear stored invite code after successful registration */
export function clearInviteCode(): void {
  localStorage.removeItem(INVITE_CODE_KEY);
}

/** Track a WhatsApp click event */
export function trackWhatsAppClick(sourcePage: string): void {
  const utm = getUtmData();
  fetch("/api/tracking/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_type: "whatsapp_click",
      source_page: sourcePage,
      utm_source: utm.utm_source,
    }),
  }).catch(() => {});
}
