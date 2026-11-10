import { strict as assert } from "node:assert";
import { test } from "node:test";
import { lowRecipeMargins, recordedWasteCost } from "./profit-radar.ts";

test("flags low recipe margins, ordered by margin, without treating missing costs as profit", () => {
  const rows = [
    ["Healthy", 100, 40, 60, 60],
    ["Low", 100, 75, 25, 25],
    ["Loss", 100, 110, -10, -10],
    ["Missing cost", 100, 0, 100, 100],
    ["At threshold", 100, 70, 30, 30],
  ];
  assert.deepEqual(lowRecipeMargins(rows).map((row) => row[0]), ["Loss", "Low"]);
});

test("sums recorded waste costs across reasons", () => {
  assert.equal(recordedWasteCost([["SPOILED", 2, 12.5], ["OTHER", 1, 3]]), 15.5);
  assert.equal(recordedWasteCost([]), 0);
});
