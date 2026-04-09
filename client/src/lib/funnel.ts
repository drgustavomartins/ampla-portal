// ─── Funnel Tracking ──────────────────────────────────────────────────────────
// Rastreia cada etapa do funil por session_id (UUID persistido no sessionStorage)
// Eventos: banner_click → quiz_start → quiz_complete → lead_capture → plan_click → payment_start

function getSessionId(): string {
  let sid = sessionStorage.getItem("ampla_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("ampla_session_id", sid);
  }
  return sid;
}

export function trackEvent(event: string, metadata?: Record<string, unknown>, email?: string) {
  const session_id = getSessionId();
  fetch("/api/funnel/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id, email, event, metadata }),
  }).catch(() => {});
}

export function getSessionId_exported() {
  return getSessionId();
}
