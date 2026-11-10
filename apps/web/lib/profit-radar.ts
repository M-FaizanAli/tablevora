export type ReportRow = (string | number | null)[];

// The food-cost report uses current list prices and recipe costs, not historical profit.
export function lowRecipeMargins(rows: ReportRow[]) {
  return rows
    .filter((row) => Number(row[1]) > 0 && Number(row[2]) > 0 && Number(row[4]) < 30)
    .sort((a, b) => Number(a[4]) - Number(b[4]))
    .slice(0, 5);
}

export function recordedWasteCost(rows: ReportRow[]) {
  return rows.reduce((sum, row) => sum + Number(row[2] ?? 0), 0);
}
