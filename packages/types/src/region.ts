import { z } from "zod";
import type { TaxMode, TaxRegime } from "./tax";

// ISO 3166-1 alpha-2 codes from the public-domain IANA iso3166.tab.
// Currency suggestions are current tender currencies from Unicode CLDR
// currencyData (https://github.com/unicode-org/cldr-json), captured 2026-10-28.
// Suggestions are editable: country alone cannot determine taxes or a legal tender for every business.
export const COUNTRY_CODES = ["AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE","EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","YE","YT","ZA","ZM","ZW"] as const;
const COUNTRY_SET: ReadonlySet<string> = new Set(COUNTRY_CODES);
export const COUNTRY_CURRENCY: Readonly<Record<string,string>> = {"AD":"EUR","AE":"AED","AF":"AFN","AG":"XCD","AI":"XCD","AL":"ALL","AM":"AMD","AO":"AOA","AR":"ARS","AS":"USD","AT":"EUR","AU":"AUD","AW":"AWG","AX":"EUR","AZ":"AZN","BA":"BAM","BB":"BBD","BD":"BDT","BE":"EUR","BF":"XOF","BG":"EUR","BH":"BHD","BI":"BIF","BJ":"XOF","BL":"EUR","BM":"BMD","BN":"BND","BO":"BOB","BQ":"USD","BR":"BRL","BS":"BSD","BT":"BTN","BV":"NOK","BW":"BWP","BY":"BYN","BZ":"BZD","CA":"CAD","CC":"AUD","CD":"CDF","CF":"XAF","CG":"XAF","CH":"CHF","CI":"XOF","CK":"NZD","CL":"CLP","CM":"XAF","CN":"CNY","CO":"COP","CR":"CRC","CU":"CUP","CV":"CVE","CW":"XCG","CX":"AUD","CY":"EUR","CZ":"CZK","DE":"EUR","DJ":"DJF","DK":"DKK","DM":"XCD","DO":"DOP","DZ":"DZD","EC":"USD","EE":"EUR","EG":"EGP","EH":"MAD","ER":"ERN","ES":"EUR","ET":"ETB","FI":"EUR","FJ":"FJD","FK":"FKP","FM":"USD","FO":"DKK","FR":"EUR","GA":"XAF","GB":"GBP","GD":"XCD","GE":"GEL","GF":"EUR","GG":"GBP","GH":"GHS","GI":"GIP","GL":"DKK","GM":"GMD","GN":"GNF","GP":"EUR","GQ":"XAF","GR":"EUR","GS":"GBP","GT":"GTQ","GU":"USD","GW":"XOF","GY":"GYD","HK":"HKD","HM":"AUD","HN":"HNL","HR":"EUR","HT":"USD","HU":"HUF","ID":"IDR","IE":"EUR","IL":"ILS","IM":"GBP","IN":"INR","IO":"USD","IQ":"IQD","IR":"IRR","IS":"ISK","IT":"EUR","JE":"GBP","JM":"JMD","JO":"JOD","JP":"JPY","KE":"KES","KG":"KGS","KH":"KHR","KI":"AUD","KM":"KMF","KN":"XCD","KP":"KPW","KR":"KRW","KW":"KWD","KY":"KYD","KZ":"KZT","LA":"LAK","LB":"LBP","LC":"XCD","LI":"CHF","LK":"LKR","LR":"LRD","LS":"LSL","LT":"EUR","LU":"EUR","LV":"EUR","LY":"LYD","MA":"MAD","MC":"EUR","MD":"MDL","ME":"EUR","MF":"EUR","MG":"MGA","MH":"USD","MK":"MKD","ML":"XOF","MM":"MMK","MN":"MNT","MO":"MOP","MP":"USD","MQ":"EUR","MR":"MRU","MS":"XCD","MT":"EUR","MU":"MUR","MV":"MVR","MW":"MWK","MX":"MXN","MY":"MYR","MZ":"MZN","NA":"NAD","NC":"XPF","NE":"XOF","NF":"AUD","NG":"NGN","NI":"NIO","NL":"EUR","NO":"NOK","NP":"NPR","NR":"AUD","NU":"NZD","NZ":"NZD","OM":"OMR","PA":"USD","PE":"PEN","PF":"XPF","PG":"PGK","PH":"PHP","PK":"PKR","PL":"PLN","PM":"EUR","PN":"NZD","PR":"USD","PS":"JOD","PT":"EUR","PW":"USD","PY":"PYG","QA":"QAR","RE":"EUR","RO":"RON","RS":"RSD","RU":"RUB","RW":"RWF","SA":"SAR","SB":"SBD","SC":"SCR","SD":"SDG","SE":"SEK","SG":"SGD","SH":"SHP","SI":"EUR","SJ":"NOK","SK":"EUR","SL":"SLE","SM":"EUR","SN":"XOF","SO":"SOS","SR":"SRD","SS":"SSP","ST":"STN","SV":"USD","SX":"XCG","SY":"SYP","SZ":"SZL","TC":"USD","TD":"XAF","TF":"EUR","TG":"XOF","TH":"THB","TJ":"TJS","TK":"NZD","TL":"USD","TM":"TMT","TN":"TND","TO":"TOP","TR":"TRY","TT":"TTD","TV":"AUD","TW":"TWD","TZ":"TZS","UA":"UAH","UG":"UGX","UM":"USD","US":"USD","UY":"UYU","UZ":"UZS","VA":"EUR","VC":"XCD","VE":"VES","VG":"USD","VI":"USD","VN":"VND","VU":"VUV","WF":"XPF","WS":"WST","YE":"YER","YT":"EUR","ZA":"ZAR","ZM":"ZMW","ZW":"ZWG"};
// Monetary storage and settlement currently use 2 decimal places. Offer only
// currencies that fit that precision; PKR retains its fractional paisa even
// though Intl's default display for en-PK omits it.
export const CURRENCY_CODES = Intl.supportedValuesOf("currency").filter((code) =>
  code === "PKR" || new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits === 2
);
const CURRENCY_SET: ReadonlySet<string> = new Set(CURRENCY_CODES);
export const countryCodeSchema = z.string().trim().toUpperCase().refine((v) => COUNTRY_SET.has(v), "Choose a valid country");
export const currencyCodeSchema = z.string().trim().toUpperCase().refine((v) => CURRENCY_SET.has(v), "Choose a supported currency");
export const timezoneSchema = z.string().trim().refine((v) => { try { new Intl.DateTimeFormat("en", { timeZone: v }); return true; } catch { return false; } }, "Choose a valid time zone");
export const taxRateSchema = z.preprocess((v) => v === "" ? undefined : v, z.coerce.number().min(0).max(100).refine((n) => Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-7, "Use at most 3 decimal places"));
export const restaurantRegionSchema = z.object({
  country: countryCodeSchema,
  currency: currencyCodeSchema,
  timezone: timezoneSchema,
  taxRegime: z.enum(["INDIA_GST", "US_SALES_TAX", "EU_VAT", "ES_IVA", "CUSTOM"]),
  taxMode: z.enum(["INCLUSIVE", "EXCLUSIVE"]),
  defaultTaxRatePercent: taxRateSchema,
  taxLabel: z.string().trim().max(30).optional(),
  taxId: z.string().trim().max(50).optional(),
  branchAddress: z.string().trim().max(300).optional(),
  branchPhone: z.string().trim().max(40).optional(),
});
export function suggestedTax(country: string): { regime: TaxRegime; mode: TaxMode; label: string } {
  if (country === "IN") return { regime: "INDIA_GST", mode: "INCLUSIVE", label: "GST" };
  if (country === "US") return { regime: "US_SALES_TAX", mode: "EXCLUSIVE", label: "Sales Tax" };
  if (country === "ES") return { regime: "ES_IVA", mode: "INCLUSIVE", label: "IVA" };
  if (country === "PK") return { regime: "CUSTOM", mode: "EXCLUSIVE", label: "Sales Tax" };
  if (EU_COUNTRIES.has(country)) return { regime: "EU_VAT", mode: "INCLUSIVE", label: "VAT" };
  return { regime: "CUSTOM", mode: "INCLUSIVE", label: "Tax" };
}
const EU_COUNTRIES = new Set("AT BE BG CY CZ DE DK EE FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK".split(" "));
