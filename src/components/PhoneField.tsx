"use client";

import { useMemo, useSyncExternalStore } from "react";
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

/**
 * The country list, twice: once with plain ISO codes for the label and once
 * with localized names.
 *
 * `Intl.DisplayNames` is not safe to render on the server, because Node's ICU
 * and the browser's disagree on a handful of regions — Node calls FK "Falkland
 * Islands" where Chrome says "Falkland Islands (Islas Malvinas)". A single
 * differing `<option>` failed hydration for the whole page, and React responds
 * to a failed hydration by re-rendering from the server tree, which threw away
 * the `light` class the pre-paint theme script had just set. Light mode
 * silently reverted to dark on every page carrying this field.
 *
 * So the server and the first client render both use the bare code, which is
 * identical in both, and the localized names are swapped in after mount where
 * hydration can no longer be affected. The sort key is the code either way, so
 * the order never shifts.
 */
const CACHED: Partial<Record<"codes" | "names", CountryOption[]>> = {};
function countryOptions(localized: boolean): CountryOption[] {
  const key = localized ? "names" : "codes";
  const cached = CACHED[key];
  if (cached) return cached;
  const dn = localized ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
  const built = getCountries()
    .map((code) => ({
      code,
      name: (dn ? dn.of(code) : code) || code,
      calling: getCountryCallingCode(code),
      flag: flag(code),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
  CACHED[key] = built;
  return built;
}

/* Stable identities for the "am I on the client yet" store below. */
const neverChanges = () => () => {};
const onClient = () => true;
const onServer = () => false;

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
  /*
    False for the server render and the hydrating one, true from then on — see
    countryOptions above for why the names cannot be rendered on the server.
    useSyncExternalStore rather than a mount flag in an effect: it is the same
    idiom ThemeToggle uses for its own server snapshot, and it does not set
    state from an effect.
  */
  const localized = useSyncExternalStore(neverChanges, onClient, onServer);
  const options = useMemo(() => countryOptions(localized), [localized]);
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
