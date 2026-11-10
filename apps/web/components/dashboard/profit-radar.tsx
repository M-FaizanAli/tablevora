"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { lowRecipeMargins, recordedWasteCost, type ReportRow } from "@/lib/profit-radar";

type Report = { rows: ReportRow[] };

export function ProfitRadar({ branchId }: { branchId: string | null }) {
  const { data: me } = useCurrentUser();
  const allowed = hasPermission(me?.user, "reports.access") && hasPermission(me?.user, "dashboard.sales.view");
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
  const query = useQuery({
    queryKey: ["profit-radar", branchId, from, to],
    queryFn: async () => {
      const qs = new URLSearchParams({ branchId: branchId!, from, to });
      const [food, waste] = await Promise.all([
        api.get<Report>(`/reports/food-cost?${qs}`),
        api.get<Report>(`/reports/waste?${qs}`),
      ]);
      return { food, waste };
    },
    enabled: !!branchId && allowed,
    refetchInterval: 60_000,
  });

  if (!allowed || !branchId) return null;
  const items = lowRecipeMargins(query.data?.food.rows ?? []);
  const wasteCost = recordedWasteCost(query.data?.waste.rows ?? []);

  return (
    <Card className="gap-3 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Profit signals</h2>
        <Link href="/reports" className="text-sm font-medium text-primary underline-offset-4 hover:underline">Open reports</Link>
      </div>
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading profit signals…</p> : query.isError ? (
        <p className="text-sm text-destructive" role="alert">Could not load profit signals. Try refreshing the page.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Recorded waste ({from} to {to}): <strong className="text-foreground">{formatCurrency(wasteCost)}</strong></p>
          <p className="text-sm font-medium">Items with estimated recipe margin below 30%</p>
          {items.length === 0 ? <p className="text-sm text-muted-foreground">No items flagged. Items without recipes or recorded ingredient costs are not assessed.</p> : (
            <ul className="divide-y divide-border">
              {items.map((row, i) => <li key={`${row[0]}-${i}`} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{row[0]}</span><span className="tabular-nums">{Number(row[4]).toFixed(1)}% · {formatCurrency(Number(row[2]))} recipe cost</span></li>)}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">A 30% threshold is a review prompt, not a target. Estimates use current menu prices and recorded recipe costs; tax, discounts, labor, fees and other costs are not deducted. Check recipe completeness and prices before making decisions.</p>
        </>
      )}
    </Card>
  );
}
