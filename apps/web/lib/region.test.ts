import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COUNTRY_CURRENCY,
  currencyMinorUnits,
  registerSchema,
  suggestedTax,
} from "@nodedr-restaurant/types";
import { formatCurrency } from "./format.ts";

const signup = (country: string, currency: string, rate: number | string) => ({
  restaurantName: "Test Cafe",
  branchName: "Main",
  ownerName: "Owner",
  email: "owner@example.com",
  password: "Password123!",
  country,
  currency,
  timezone: country === "PK" ? "Asia/Karachi" : "America/New_York",
  taxRegime: suggestedTax(country).regime,
  taxMode: suggestedTax(country).mode,
  defaultTaxRatePercent: rate,
});

test("country suggests its currency and tax system without fixing the rate", () => {
  assert.equal(COUNTRY_CURRENCY.US, "USD");
  assert.equal(COUNTRY_CURRENCY.PK, "PKR");
  assert.equal(COUNTRY_CURRENCY.IN, "INR");
  assert.equal(suggestedTax("US").mode, "EXCLUSIVE");
  assert.equal(suggestedTax("PK").label, "Sales Tax");
  assert.equal(registerSchema.parse(signup("PK", "PKR", 15)).defaultTaxRatePercent, 15);
  assert.equal(registerSchema.parse(signup("US", "USD", 8.875)).defaultTaxRatePercent, 8.875);
  assert.equal(registerSchema.safeParse(signup("US", "USD", "")).success, false);
});

test("rejects invalid country, currency, and time zone", () => {
  assert.equal(registerSchema.safeParse(signup("ZZ", "USD", 8)).success, false);
  assert.equal(registerSchema.safeParse(signup("US", "ZZZ", 8)).success, false);
  assert.equal(registerSchema.safeParse({ ...signup("US", "USD", 8), timezone: "Mars/Base" }).success, false);
});

test("formats USD and PKR with their own currency codes", () => {
  assert.match(formatCurrency(1234.5, "USD", "en-US"), /\$1,234\.50/);
  assert.match(formatCurrency(1234.5, "PKR", "en-PK"), /1,234\.50/);
});

test("formats zero- and three-decimal currencies without inventing cents", () => {
  assert.equal(currencyMinorUnits("JPY"), 0);
  assert.equal(currencyMinorUnits("KWD"), 3);
  assert.match(formatCurrency(1234, "JPY", "ja-JP"), /1,234/);
  assert.doesNotMatch(formatCurrency(1234, "JPY", "ja-JP"), /\.00/);
  assert.match(formatCurrency(1.234, "KWD", "en-KW"), /1\.234/);
});
