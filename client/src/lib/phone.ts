/**
 * Phone number formatting utilities with international support.
 * Stored as raw digits with country code prefix: e.g. "5521976263881"
 * Brazil format: +55 (XX) XXXXX-XXXX
 * Other countries: +{code} {remaining digits}
 */

import { type CountryCode, DEFAULT_COUNTRY, findCountry, detectCountryFromDigits } from "./country-codes";

/** Strip all non-digit characters from a string. */
export function stripPhone(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Ensure a digit string starts with the Brazilian country code "55".
 * Only applies heuristics when no explicit country code is provided.
 * Used for legacy data migration and backward compatibility.
 */
export function ensureBrazilPrefix(digits: string): string {
  if (!digits) return "";

  // Already has 55 prefix with enough digits
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
 * Format the local part of a phone number (digits after country code).
 * Brazil gets (DD) XXXXX-XXXX mask; others get raw digits.
 */
function formatLocalNumber(localDigits: string, country: CountryCode): string {
  if (!localDigits) return "";
  if (!country.format) return localDigits;

  const { mask } = country.format;
  let pos = 0;
  const parts: string[] = [];

  for (const len of mask) {
    if (pos >= localDigits.length) break;
    parts.push(localDigits.slice(pos, pos + len));
    pos += len;
  }

  if (parts.length === 0) return localDigits;

  // Brazil-specific formatting: (DD) XXXXX-XXXX
  if (country.code === "55") {
    if (parts.length === 1) return `(${parts[0]}`;
    if (parts.length === 2) return `(${parts[0]}) ${parts[1]}`;
    return `(${parts[0]}) ${parts[1]}-${parts[2]}`;
  }

  return parts.join(" ");
}

/**
 * Format a full digit string for display given a known country code.
 * Builds progressively as the user types.
 */
export function formatPhone(digits: string, countryCode?: string): string {
  if (!digits) return "";

  const country = countryCode ? findCountry(countryCode) || DEFAULT_COUNTRY : detectCountryFromDigits(digits);
  const cc = country.code;

  // If digits start with the country code, strip it for local formatting
  const localDigits = digits.startsWith(cc) ? digits.slice(cc.length) : digits;

  if (!localDigits) return `+${cc}`;

  const formatted = formatLocalNumber(localDigits, country);
  return `+${cc} ${formatted}`;
}

/**
 * Handle phone input change for a specific country.
 * Strips non-digits, prepends country code, caps length, formats.
 * Returns { raw, formatted } where raw is full digits (with country code).
 */
export function handlePhoneInput(inputValue: string, countryCode?: string): { raw: string; formatted: string } {
  const country = countryCode ? findCountry(countryCode) || DEFAULT_COUNTRY : DEFAULT_COUNTRY;
  let digits = stripPhone(inputValue);

  // Remove country code prefix if the user typed it (we add it ourselves)
  if (digits.startsWith(country.code)) {
    digits = digits.slice(country.code.length);
  }

  // Cap local digits: for Brazil max 11 (DDD + 9 digits), others max 15
  const maxLocal = country.format ? country.format.digits : 15;
  digits = digits.slice(0, maxLocal);

  // Full raw = country code + local digits
  const raw = country.code + digits;

  return { raw, formatted: formatPhone(raw, country.code) };
}

/**
 * Validate a phone number: country code + at least 7 local digits.
 */
export function isValidPhone(digits: string): boolean {
  const d = stripPhone(digits);
  if (d.length < 8) return false;
  // Check if it starts with any known country code
  const country = detectCountryFromDigits(d);
  const local = d.slice(country.code.length);
  return local.length >= 7;
}

/**
 * Format a raw digit string for display (e.g. from database).
 * Auto-detects country code from the stored digits.
 */
export function formatPhoneDisplay(value: string | null | undefined): string {
  if (!value) return "";
  const digits = stripPhone(value);
  if (digits.length < 8) return value; // too short to format, return as-is
  const country = detectCountryFromDigits(digits);
  return formatPhone(digits, country.code);
}

/**
 * Extract the country code and local number from stored raw digits.
 * Useful for populating the country selector from existing data.
 */
export function parseStoredPhone(value: string | null | undefined): { countryCode: string; localDigits: string } {
  if (!value) return { countryCode: DEFAULT_COUNTRY.code, localDigits: "" };
  const digits = stripPhone(value);
  if (!digits) return { countryCode: DEFAULT_COUNTRY.code, localDigits: "" };
  const country = detectCountryFromDigits(digits);
  return {
    countryCode: country.code,
    localDigits: digits.startsWith(country.code) ? digits.slice(country.code.length) : digits,
  };
}
