/**
 * Phone number formatting utilities.
 * Format: +XX (XX) XXXXX-XXXX  (e.g. +55 (21) 97626-3881)
 * Stored as raw digits: "5521976263881"
 */

/** Strip all non-digit characters from a string. */
export function stripPhone(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Format a digit string into the display format: +XX (XX) XXXXX-XXXX
 * Builds progressively as the user types.
 */
export function formatPhone(digits: string): string {
  if (!digits) return "";
  let d = digits;

  // +CC
  if (d.length <= 2) return `+${d}`;
  const cc = d.slice(0, 2);
  d = d.slice(2);

  // +CC (DD
  if (d.length <= 2) return `+${cc} (${d}`;
  const ddd = d.slice(0, 2);
  d = d.slice(2);

  // +CC (DD) XXXXX
  if (d.length <= 5) return `+${cc} (${ddd}) ${d}`;
  const first = d.slice(0, 5);
  const last = d.slice(5, 9);

  // +CC (DD) XXXXX-XXXX
  return `+${cc} (${ddd}) ${first}-${last}`;
}

/**
 * Handle phone input change: strip non-digits, cap at 13 chars, format.
 * Returns { raw, formatted } where raw is digits-only and formatted is display.
 */
export function handlePhoneInput(inputValue: string): { raw: string; formatted: string } {
  const raw = stripPhone(inputValue).slice(0, 13);
  return { raw, formatted: formatPhone(raw) };
}

/**
 * Validate a phone number: must have country code (2-3 digits), DDD (2 digits),
 * and number (8-9 digits). Total: 12-14 digits.
 */
export function isValidPhone(digits: string): boolean {
  const d = stripPhone(digits);
  return d.length >= 12 && d.length <= 14;
}

/**
 * Format a raw digit string for display (e.g. from database).
 * Handles legacy formats that may already contain formatting characters.
 */
export function formatPhoneDisplay(value: string | null | undefined): string {
  if (!value) return "";
  const digits = stripPhone(value);
  if (digits.length < 10) return value; // too short to format, return as-is
  return formatPhone(digits);
}
