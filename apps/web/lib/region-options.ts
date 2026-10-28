import { COUNTRY_CODES, CURRENCY_CODES } from "@nodedr-restaurant/types";

const regions = new Intl.DisplayNames(["en"], { type: "region" });
const currencies = new Intl.DisplayNames(["en"], { type: "currency" });

export const countryOptions = COUNTRY_CODES.map((code) => ({
  code,
  name: regions.of(code) ?? code,
})).sort((a, b) => a.name.localeCompare(b.name));

export const currencyOptions = CURRENCY_CODES.map((code) => ({
  code,
  name: currencies.of(code) ?? code,
})).sort((a, b) => a.code.localeCompare(b.code));

export const timeZoneOptions = ["UTC", ...Intl.supportedValuesOf("timeZone")];
