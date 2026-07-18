"use client";

import { useMemo } from "react";
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumber,
  type CountryCode,
} from "libphonenumber-js";

export interface PhoneValue {
  country: CountryCode;
  /** National number as typed by the user. */
  national: string;
}

/** ISO-2 code → flag emoji via regional-indicator symbols. */
function flag(cc: string): string {
  return cc.replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/** E.164 (e.g. +919876543210) when the number is valid for its country, else null. */
export function phoneToE164(v: PhoneValue): string | null {
  const national = v.national.trim();
  if (!national) return null;
  try {
    const p = parsePhoneNumber(national, v.country);
    return p.isValid() ? p.number : null;
  } catch {
    return null;
  }
}

export function isPhoneValid(v: PhoneValue): boolean {
  return phoneToE164(v) !== null;
}

interface CountryOption {
  code: CountryCode;
  name: string;
  calling: string;
  flag: string;
}

let CACHED: CountryOption[] | null = null;
function countryOptions(): CountryOption[] {
  if (CACHED) return CACHED;
  const dn = new Intl.DisplayNames(["en"], { type: "region" });
  CACHED = getCountries()
    .map((code) => ({
      code,
      name: dn.of(code) || code,
      calling: getCountryCallingCode(code),
      flag: flag(code),
    }))
    // Deterministic across server/browser ICU data to avoid hydration mismatch.
    .sort((a, b) => a.code.localeCompare(b.code));
  return CACHED;
}

const controlCls = (invalid: boolean) =>
  `w-full rounded-xl border bg-ink px-4 py-3 text-fg placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${
    invalid ? "border-bad" : "border-line"
  }`;

/**
 * Country-aware phone entry: a full country picker plus a national-number input.
 * Validation (via libphonenumber-js) is the caller's job — use `isPhoneValid` /
 * `phoneToE164` on `{ country, national }`.
 */
export function PhoneField({
  value,
  onChange,
  invalid = false,
}: {
  value: PhoneValue;
  onChange: (next: PhoneValue) => void;
  invalid?: boolean;
}) {
  const options = useMemo(() => countryOptions(), []);
  return (
    <div className="space-y-2">
      <select
        value={value.country}
        onChange={(e) => onChange({ ...value, country: e.target.value as CountryCode })}
        className={controlCls(invalid)}
        aria-label="Country"
      >
        {options.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.name} (+{c.calling})
          </option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="tel"
        value={value.national}
        onChange={(e) => onChange({ ...value, national: e.target.value })}
        className={controlCls(invalid)}
        placeholder="Your mobile number"
        autoComplete="tel-national"
        aria-label="Phone number"
      />
    </div>
  );
}
