import { strict as assert } from "node:assert";
import { test } from "node:test";
import { simulateRecipe } from "./price-simulator.ts";

test("simulates a changed ingredient cost using recipe quantities", () => {
  const lines = [
    { ingredientId: "chicken", quantity: "0.5", ingredient: { costPerUnit: "100" } },
    { ingredientId: "rice", quantity: "2", ingredient: { costPerUnit: "10" } },
  ];
  assert.deepEqual(simulateRecipe(lines, "chicken", 120, 200), { currentCost: 70, projectedCost: 80, margin: 60 });
  assert.equal(simulateRecipe(lines, "chicken", 120, 0).margin, null);
  assert.equal(simulateRecipe(lines, "chicken", 120, 50).margin, -60);
});
