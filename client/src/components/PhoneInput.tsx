import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { COUNTRY_CODES, DEFAULT_COUNTRY, findCountry } from "@/lib/country-codes";
import { handlePhoneInput, parseStoredPhone, formatPhone, stripPhone } from "@/lib/phone";

interface PhoneInputProps {
  /** Raw digit string including country code (e.g. "5521976263881") */
  value: string;
  /** Called with the full raw digit string (country code + local number) */
  onChange: (raw: string) => void;
  /** Additional class for the outer wrapper */
  className?: string;
  /** Placeholder text for the number input */
  placeholder?: string;
  /** If true, uses dark/transparent styling for login page */
  variant?: "default" | "dark";
}

export function PhoneInput({ value, onChange, className, placeholder, variant = "default" }: PhoneInputProps) {
  // Parse stored value to get country + local digits
  const parsed = parseStoredPhone(value);
  const [countryCode, setCountryCode] = useState(parsed.countryCode);
  const [localDisplay, setLocalDisplay] = useState(() => {
    if (!parsed.localDigits) return "";
    const country = findCountry(parsed.countryCode) || DEFAULT_COUNTRY;
    // Format just the local portion for display
    const full = formatPhone(parsed.countryCode + parsed.localDigits, parsed.countryCode);
    // Strip the "+CC " prefix from formatted string
    const prefix = `+${country.code} `;
    return full.startsWith(prefix) ? full.slice(prefix.length) : parsed.localDigits;
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Sync country code when value changes externally (e.g. loading existing data)
  useEffect(() => {
    const p = parseStoredPhone(value);
    if (p.countryCode !== countryCode) {
      setCountryCode(p.countryCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const selectedCountry = findCountry(countryCode) || DEFAULT_COUNTRY;

  const handleLocalChange = (inputValue: string) => {
    const { raw, formatted } = handlePhoneInput(inputValue, countryCode);
    // Strip the "+CC " prefix from formatted for local display
    const prefix = `+${countryCode} `;
    const display = formatted.startsWith(prefix) ? formatted.slice(prefix.length) : stripPhone(inputValue);
    setLocalDisplay(display);
    onChange(raw);
  };

  const handleCountryChange = (newCode: string) => {
    setCountryCode(newCode);
    setDropdownOpen(false);
    // Re-process the local digits with the new country code
    const currentLocal = stripPhone(localDisplay);
    if (currentLocal) {
      const { raw, formatted } = handlePhoneInput(currentLocal, newCode);
      const prefix = `+${newCode} `;
      const display = formatted.startsWith(prefix) ? formatted.slice(prefix.length) : currentLocal;
      setLocalDisplay(display);
      onChange(raw);
    } else {
      onChange(newCode);
    }
  };

  const isDark = variant === "dark";
  const baseInput = isDark
    ? "bg-white/5 border-white/10 focus:border-gold/50 text-white placeholder:text-white/20"
    : "bg-background/50 border-border/40";
  const baseTrigger = isDark
    ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
    : "bg-background/50 border-border/40 hover:bg-muted/30";
  const baseDropdown = isDark
    ? "bg-[#1a1a2e] border-white/10 text-white"
    : "bg-card border-border/40 text-foreground";
  const baseDropdownItem = isDark
    ? "hover:bg-white/10 text-white/80 hover:text-white"
    : "hover:bg-muted/50";

  return (
    <div className={`flex gap-1.5 ${className || ""}`}>
      {/* Country selector */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`flex items-center gap-1 h-9 px-2 rounded-md border text-sm ${baseTrigger} min-w-[72px] justify-between`}
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span className="text-xs opacity-70">+{selectedCountry.code}</span>
          <svg className="w-3 h-3 opacity-50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {dropdownOpen && (
          <>
            {/* Backdrop to close dropdown */}
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
            <div className={`absolute z-50 mt-1 left-0 rounded-md border shadow-lg max-h-60 overflow-y-auto min-w-[200px] ${baseDropdown}`}>
              {COUNTRY_CODES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCountryChange(c.code)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${baseDropdownItem} ${c.code === countryCode ? "font-medium" : ""}`}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="flex-1 text-left">{c.name}</span>
                  <span className="text-xs opacity-60">+{c.code}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Phone number input */}
      <Input
        type="tel"
        placeholder={placeholder || (selectedCountry.code === "55" ? "(21) 99999-9999" : "Numero")}
        value={localDisplay}
        onChange={(e) => handleLocalChange(e.target.value)}
        className={`flex-1 ${baseInput}`}
      />
    </div>
  );
}
