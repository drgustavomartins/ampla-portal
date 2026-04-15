/**
 * Phone number formatting utilities for Brazilian phones.
 * Format: +55 (XX) XXXXX-XXXX  (e.g. +55 (21) 97626-3881)
 * Stored as raw digits: "5521976263881" (13 digits)
 */

/** Strip all non-digit characters from a string. */
export function stripPhone(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Ensure a digit string starts with the Brazilian country code "55".
 * Handles common cases:
 * - Already starts with 55 → keep as-is
 * - Starts with 0XX (old trunk prefix) → strip 0, prepend 55
 * - Starts with a 2-digit DDD (11-99) followed by 8-9 digit number → prepend 55
 * - Just digits with no country code → prepend 55
 */
export function ensureBrazilPrefix(digits: string): string {
  if (!digits) return "";

  // Already has +55 prefix
  if (digits.startsWith("55") && digits.length >= 12) return digits;

  // Starts with 0 (old Brazilian trunk dialing): strip 0, prepend 55
  if (digits.startsWith("0") && digits.length >= 11) {
    return "55" + digits.slice(1);
  }

  // 10-11 digits starting with valid DDD (11-99): prepend 55
  if (digits.length >= 10 && digits.length <= 11) {
    const ddd = parseInt(digits.slice(0, 2), 10);
    if (ddd >= 11 && ddd <= 99) {
      return "55" + digits;
    }
  }

  return digits;
}

/**
 * Format a digit string into the display format: +55 (XX) XXXXX-XXXX
 * Always assumes Brazilian format. Builds progressively as the user types.
 */
export function formatPhone(digits: string): string {
  if (!digits) return "";
  const d = ensureBrazilPrefix(digits);

  // +55
  if (d.length <= 2) return `+${d}`;
  const cc = d.slice(0, 2); // always "55"
  const rest = d.slice(2);

  // +55 (DD
  if (rest.length <= 2) return `+${cc} (${rest}`;
  const ddd = rest.slice(0, 2);
  const num = rest.slice(2);

  // +55 (DD) XXXXX
  if (num.length <= 5) return `+${cc} (${ddd}) ${num}`;
  const first = num.slice(0, 5);
  const last = num.slice(5, 9);

  // +55 (DD) XXXXX-XXXX
  return `+${cc} (${ddd}) ${first}-${last}`;
}

/**
 * Handle phone input change: strip non-digits, ensure +55, cap at 13 chars, format.
 * Returns { raw, formatted } where raw is digits-only and formatted is display.
 */
export function handlePhoneInput(inputValue: string): { raw: string; formatted: string } {
  let raw = stripPhone(inputValue);

  // If user cleared the field and is retyping, ensure 55 prefix
  raw = ensureBrazilPrefix(raw);

  // Cap at 13 digits: 55 (country) + 2 (DDD) + 9 (number) = 13
  raw = raw.slice(0, 13);

  return { raw, formatted: formatPhone(raw) };
}

/**
 * Validate a phone number: must be 55 + DDD (2 digits) + number (8-9 digits).
 * Total: 12-13 digits.
 */
export function isValidPhone(digits: string): boolean {
  const d = stripPhone(digits);
  return d.startsWith("55") && d.length >= 12 && d.length <= 13;
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
