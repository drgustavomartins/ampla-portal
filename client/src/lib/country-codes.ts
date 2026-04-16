/** Country dialing codes with flag emojis for the phone selector. */

export interface CountryCode {
  code: string;   // dialing code digits (e.g. "55")
  flag: string;   // emoji flag
  name: string;   // country name in Portuguese
  format?: {
    /** Number of digits after country code for a mobile number */
    digits: number;
    /** Mask segments: array of digit group lengths, e.g. [2, 5, 4] for (XX) XXXXX-XXXX */
    mask: number[];
  };
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: "55",  flag: "\u{1F1E7}\u{1F1F7}", name: "Brasil",    format: { digits: 11, mask: [2, 5, 4] } },
  { code: "351", flag: "\u{1F1F5}\u{1F1F9}", name: "Portugal" },
  { code: "54",  flag: "\u{1F1E6}\u{1F1F7}", name: "Argentina" },
  { code: "1",   flag: "\u{1F1FA}\u{1F1F8}", name: "EUA" },
  { code: "57",  flag: "\u{1F1E8}\u{1F1F4}", name: "Col\u00f4mbia" },
  { code: "56",  flag: "\u{1F1E8}\u{1F1F1}", name: "Chile" },
  { code: "52",  flag: "\u{1F1F2}\u{1F1FD}", name: "M\u00e9xico" },
  { code: "595", flag: "\u{1F1F5}\u{1F1FE}", name: "Paraguai" },
  { code: "598", flag: "\u{1F1FA}\u{1F1FE}", name: "Uruguai" },
  { code: "34",  flag: "\u{1F1EA}\u{1F1F8}", name: "Espanha" },
  { code: "39",  flag: "\u{1F1EE}\u{1F1F9}", name: "It\u00e1lia" },
  { code: "81",  flag: "\u{1F1EF}\u{1F1F5}", name: "Jap\u00e3o" },
];

/** Find a country by its dialing code string. */
export function findCountry(code: string): CountryCode | undefined {
  return COUNTRY_CODES.find(c => c.code === code);
}

/** Default country (Brazil). */
export const DEFAULT_COUNTRY = COUNTRY_CODES[0];

/**
 * Try to detect the country code from a raw digit string.
 * Checks longest codes first (3-digit, then 2-digit, then 1-digit).
 */
export function detectCountryFromDigits(digits: string): CountryCode {
  if (!digits || digits.length < 4) return DEFAULT_COUNTRY;
  // Check 3-digit codes first
  const three = COUNTRY_CODES.find(c => c.code.length === 3 && digits.startsWith(c.code));
  if (three) return three;
  // Then 2-digit
  const two = COUNTRY_CODES.find(c => c.code.length === 2 && digits.startsWith(c.code));
  if (two) return two;
  // Then 1-digit
  const one = COUNTRY_CODES.find(c => c.code.length === 1 && digits.startsWith(c.code));
  if (one) return one;
  return DEFAULT_COUNTRY;
}
