"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import { useUpdateMenuItem } from "@/hooks/use-menu";
import { api, ApiError } from "@/lib/api";

type Item = { id: string; name: string; isActive: boolean; low: { id: string; name: string; unit: string; currentStock: string; reorderLevel: string; perServing: string }[] };

export function StockReview({ branchId }: { branchId: string | null }) {
  const { data: me } = useCurrentUser();
  const allowed = hasPermission(me?.user, "inventory.manage") && hasPermission(me?.user, "menu.view");
  const canChange = hasPermission(me?.user, "menu.manage") && process.env.NEXT_PUBLIC_DEMO_MODE !== "true";
  const update = useUpdateMenuItem(branchId);
  const review = useQuery({
    queryKey: ["inventory", "stock-review", branchId],
    queryFn: () => api.get<Item[]>(`/inventory/stock-review?${new URLSearchParams({ branchId: branchId! })}`),
    enabled: !!branchId && allowed,
    refetchInterval: 30_000,
  });
  if (!branchId || !allowed) return null;
  async function change(item: Item) {
    try {
      await update.mutateAsync({ id: item.id, dto: { isActive: !item.isActive } });
      await review.refetch();
      toast.success(item.isActive ? `${item.name} marked unavailable` : `${item.name} made available`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not change availability");
    }
  }
  return <Card className="gap-3 p-5">
    <h2 className="text-lg font-semibold">Stock and menu availability</h2>
    <p className="text-sm text-muted-foreground">Review low ingredients before service. Staff decide when to change an item&apos;s availability.</p>
    {review.isLoading && <p className="text-sm">Loading stock review…</p>}
    {review.isError && <p role="alert" className="text-sm text-destructive">Could not load stock review. Try refreshing.</p>}
    {review.data?.length === 0 && <p className="text-sm text-muted-foreground">No tracked items need review based on recorded stock and reorder levels.</p>}
    {review.data && review.data.length > 0 && <ul className="divide-y divide-border">{review.data.map((item) => <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="min-w-0"><p className="font-medium">{item.name} <span className="text-xs text-muted-foreground">{item.isActive ? "Available" : "Unavailable"}</span></p>
        {item.low.length ? item.low.map((ing) => <p key={ing.id} className="text-sm text-muted-foreground">{ing.name}: {ing.currentStock} {ing.unit} in stock; reorder level {ing.reorderLevel}, {ing.perServing} per serving.</p>) : <p className="text-sm text-muted-foreground">No mapped ingredients currently below their review levels. Check stock before restoring.</p>}
      </div>
      {canChange && <Button type="button" variant="outline" size="sm" disabled={update.isPending} onClick={() => void change(item)}>{item.isActive ? "Mark unavailable" : "Make available"}</Button>}
    </li>)}</ul>}
    <p className="text-xs text-muted-foreground">Low stock uses recorded quantities and reorder levels; verify counts before acting. Combos and untracked items are not assessed; a combo may still include an unavailable component. Existing open orders are unaffected. Availability changes apply to new items added to orders.</p>
  </Card>;
}
