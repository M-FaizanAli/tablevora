"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import { useIngredients } from "@/hooks/use-inventory";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { simulateRecipe, type CostLine } from "@/lib/price-simulator";

type Item = { id: string; name: string; price: string; recipeLines: CostLine[] };

export function PriceSimulator({ branchId }: { branchId: string | null }) {
  const { data: me } = useCurrentUser();
  const { data: ingredients } = useIngredients(branchId);
  const [ingredientId, setIngredientId] = useState("");
  const [cost, setCost] = useState("");
  const ingredient = ingredients?.find((item) => item.id === ingredientId);
  const allowed = hasPermission(me?.user, "inventory.manage") && hasPermission(me?.user, "menu.view");
  const impact = useQuery({
    queryKey: ["price-impact", branchId, ingredientId],
    queryFn: () => api.get<Item[]>(`/inventory/ingredients/${encodeURIComponent(ingredientId)}/price-impact?${new URLSearchParams({ branchId: branchId! })}`),
    enabled: !!branchId && !!ingredientId && !!ingredient && allowed,
  });
  if (!allowed || !branchId) return null;
  const proposed = Number(cost);
  const valid = cost.trim() !== "" && Number.isFinite(proposed) && proposed >= 0;
  return (
    <Card className="p-5">
      <details>
        <summary className="cursor-pointer font-semibold">Menu price simulator</summary>
        <p className="mt-2 text-sm text-muted-foreground">See how a possible ingredient cost affects recipes and try a selling price. Nothing is saved.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">Ingredient
            <select className="h-10 rounded-lg border border-border bg-background px-2" value={ingredient ? ingredientId : ""} onChange={(e) => { setIngredientId(e.target.value); setCost(""); }}>
              <option value="">Select an ingredient</option>
              {ingredients?.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          {ingredient && <label className="grid gap-1.5 text-sm">Proposed cost per {ingredient.unit} <span className="text-xs text-muted-foreground">Current average: {formatCurrency(ingredient.costPerUnit)}</span>
            <Input type="number" min="0" step="any" value={cost} onChange={(e) => setCost(e.target.value)} />
          </label>}
        </div>
        {ingredient && cost !== "" && !valid && <p role="alert" className="mt-2 text-sm text-destructive">Enter a valid cost of zero or more.</p>}
        {ingredient && impact.isLoading && <p className="mt-4 text-sm">Loading affected recipes…</p>}
        {ingredient && impact.isError && <p role="alert" className="mt-4 text-sm text-destructive">Could not load affected recipes.</p>}
        {ingredient && valid && impact.data && (impact.data.length ? <div className="mt-4 divide-y divide-border">{impact.data.map((item) => <PriceRow key={item.id} item={item} ingredientId={ingredientId} proposedCost={proposed} />)}</div> : <p className="mt-4 text-sm text-muted-foreground">No active recipes use this ingredient.</p>)}
        <p className="mt-4 text-xs text-muted-foreground">Estimates use recorded recipe quantities and current average ingredient costs. They exclude tax adjustments, discounts, labor, packaging and fees. Incomplete recipes or missing costs make estimates unreliable. Combos and directly tracked items are not included.</p>
      </details>
    </Card>
  );
}

function PriceRow({ item, ingredientId, proposedCost }: { item: Item; ingredientId: string; proposedCost: number }) {
  const [price, setPrice] = useState(item.price);
  const sellingPrice = Number(price);
  const valid = price.trim() !== "" && Number.isFinite(sellingPrice) && sellingPrice > 0;
  const result = simulateRecipe(item.recipeLines, ingredientId, proposedCost, valid ? sellingPrice : 0);
  return <div className="grid gap-3 py-4 sm:grid-cols-[1fr_160px]">
    <div><p className="font-medium">{item.name}</p><p className="text-sm text-muted-foreground">Recipe cost: {formatCurrency(result.currentCost)} → {formatCurrency(result.projectedCost)}</p><p className="text-sm">Estimated recipe margin: {result.margin === null ? "Enter a selling price" : `${result.margin.toFixed(1)}%`}</p></div>
    <label className="grid gap-1 text-sm">Try selling price<Input type="number" min="0" step="any" value={price} onChange={(e) => setPrice(e.target.value)} />{!valid && <span className="text-xs text-destructive">Enter a price above zero.</span>}</label>
  </div>;
}
