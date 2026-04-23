// April 30, 2026 at 23:59:59 BRT (UTC-3) = May 1, 2026 at 02:59:59 UTC
export const OFFER_DEADLINE = new Date('2026-05-01T02:59:59Z');

// Limite de vagas do lançamento
export const OFFER_SLOTS_LIMIT = 200;

export function isOfferExpired(): boolean {
  return Date.now() >= OFFER_DEADLINE.getTime();
}

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

export function getTimeLeft(): TimeLeft {
  const diff = OFFER_DEADLINE.getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
}
