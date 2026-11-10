export type CostLine = { ingredientId: string; quantity: string; ingredient: { costPerUnit: string } };

export function simulateRecipe(lines: CostLine[], ingredientId: string, proposedCost: number, sellingPrice: number) {
  const currentCost = lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.ingredient.costPerUnit), 0);
  const projectedCost = lines.reduce((sum, line) => sum + Number(line.quantity) * (line.ingredientId === ingredientId ? proposedCost : Number(line.ingredient.costPerUnit)), 0);
  return { currentCost, projectedCost, margin: sellingPrice > 0 ? (sellingPrice - projectedCost) / sellingPrice * 100 : null };
}
