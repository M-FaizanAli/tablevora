// Server-authoritative pricing. Mirrors the hard-won lesson from
// nodedr-pos (see its project memory): the price entered against a menu
// item is TAX-INCLUSIVE, not tax-exclusive — GST/VAT must be backed OUT of
// it, never added on top. A flat/percent discount is computed against the
// tax-inclusive subtotal directly (the rupee amount a cashier actually
// types), not against an already-backed-out exclusive base — computing it
// the other way under-discounts the customer, a distinct trap from the
// inclusive/exclusive bug itself.
//
// Never re-derive this from scratch on future pricing changes — round with
// round2, verify numerically (a clean MRP like 118 at 18% backs out to
// exactly 100), and confirm totalAmount never exceeds the sum of entered
// prices before any discount.
//
// Multi-region tax (2026-09-27): a branch's taxMode decides how a raw menu
// item price is turned into the tax-inclusive unit price this file works
// off of. INCLUSIVE (India GST / EU VAT / Spain IVA — tax-inclusive menu
// prices are the norm/regulation in all three) passes the entered price
// through unchanged, exactly as before. EXCLUSIVE (US sales tax — prices
// are conventionally shown pre-tax, tax added at checkout) grosses it up
// by the tax rate first. toEffectiveInclusiveUnitPrice is the ONLY place
// that conversion happens; priceLine/computeOrderTotals below are
// unchanged and still always operate on an inclusive amount, so every
// downstream consumer (OrderItem.lineTotal, receipts, refunds, KOTs) keeps
// working exactly as it did before this file existed.

import type { TaxMode } from '@nodedr-restaurant/types';
import { Prisma } from '@prisma/client';

export function roundMoney(value: number, minorUnits = 2): number {
  if (!Number.isInteger(minorUnits) || minorUnits < 0 || minorUnits > 4) {
    throw new RangeError('Currency precision must be between 0 and 4 digits');
  }
  return new Prisma.Decimal(value).toDecimalPlaces(minorUnits).toNumber();
}

export function toEffectiveInclusiveUnitPrice(
  rawUnitPrice: number,
  taxRatePercent: number,
  taxMode: TaxMode,
  minorUnits = 2,
): number {
  if (taxMode === 'EXCLUSIVE' && taxRatePercent > 0) {
    return roundMoney(rawUnitPrice * (1 + taxRatePercent / 100), minorUnits);
  }
  return roundMoney(rawUnitPrice, minorUnits);
}

export interface PricedLineInput {
  quantity: number;
  unitPriceInclusive: number; // menuItem.price + sum(selected modifier.priceAdjustment)
  taxRatePercent: number;
}

export interface PricedLine {
  lineTotal: number; // inclusive
  taxAmount: number; // informational breakup only, already inside lineTotal
}

export function round2(value: number): number {
  return roundMoney(value, 2);
}

export function priceLine(input: PricedLineInput, minorUnits = 2): PricedLine {
  const lineTotal = roundMoney(input.unitPriceInclusive * input.quantity, minorUnits);
  const rate = input.taxRatePercent / 100;
  const taxAmount = rate > 0 ? roundMoney(lineTotal - lineTotal / (1 + rate), minorUnits) : 0;
  return { lineTotal, taxAmount };
}

export interface OrderTotals {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
}

export function computeOrderTotals(
  lines: PricedLine[],
  discountPercent = 0,
  discountFlat = 0,
  minorUnits = 2,
): OrderTotals {
  const subtotal = roundMoney(lines.reduce((sum, l) => sum + l.lineTotal, 0), minorUnits);
  const taxAmount = roundMoney(lines.reduce((sum, l) => sum + l.taxAmount, 0), minorUnits);

  const percentDiscount = roundMoney((subtotal * discountPercent) / 100, minorUnits);
  const discountAmount = roundMoney(
    Math.min(percentDiscount + discountFlat, subtotal),
    minorUnits,
  );

  const totalAmount = roundMoney(subtotal - discountAmount, minorUnits);

  return { subtotal, taxAmount, discountAmount, totalAmount };
}
