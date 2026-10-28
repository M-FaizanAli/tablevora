import { currencyMinorUnits } from "@nodedr-restaurant/types";

let activeCurrency = "INR";
let activeLocale = "en-IN";

// The dashboard waits for tenant settings before rendering amounts. This
// browser-local default serves existing formatting call sites without
// sharing one tenant's currency through server-side module state.
export function setActiveCurrency(currency: string, country: string) {
  if (typeof window === "undefined") return;
  activeCurrency = currency;
  activeLocale = `en-${country}`;
}

export function getActiveCurrency() { return activeCurrency; }
export function getActiveLocale() { return activeLocale; }

export function formatCurrency(
  value: number | string,
  currency = activeCurrency,
  locale = activeLocale,
): string {
  const amount = typeof value === "string" ? Number(value) : value;
  const digits = currencyMinorUnits(currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}
