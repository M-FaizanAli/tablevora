"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { MenuItemImage } from "@/components/menu/menu-item-image";
import { Input } from "@/components/ui/input";
import { QueryError } from "@/components/ui/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveTabs } from "@/components/ui/nav-picker";
import { useCategories, useMenuItems, type MenuItem } from "@/hooks/use-menu";
import { formatCurrency } from "@/lib/format";

export function ProductGrid({ branchId, onSelect }: { branchId: string | null; onSelect: (item: MenuItem) => void }) {
  const { data: categories } = useCategories(branchId);
  const [activeCategoryId, setActiveCategoryId] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const { data: items, isLoading, isError, error, refetch, isFetching } = useMenuItems(branchId, activeCategoryId);
  const filtered = items?.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input aria-label="Search menu" placeholder="Search menu…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 pl-9" />
      </div>
      {!!categories?.length && <ResponsiveTabs label="Category" value={activeCategoryId ?? "all"} onChange={(id) => setActiveCategoryId(id === "all" ? undefined : id)} className="shrink-0" desktopListClassName="h-auto min-h-10 w-full flex-wrap justify-start gap-1 p-1" items={[{ id: "all", label: "All" }, ...categories.map((c) => ({ id: c.id, label: c.name, hint: `${c._count.items} items` }))]} />}
      {isError && !items ? <QueryError error={error} what="the menu" onRetry={() => void refetch()} retrying={isFetching} /> : (
        <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(min(100%,9rem),1fr))] gap-3 overflow-y-auto p-1">
          {isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
          {filtered?.map((item) => (
            <button type="button" key={item.id} onClick={() => onSelect(item)} className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-[border-color,box-shadow] hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
              <MenuItemImage item={item} className="aspect-[4/3] w-full border-b border-border/60" />
              <span className="flex w-full flex-1 flex-col gap-2 p-3">
                <span className="flex items-start gap-2">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.isVeg ? "bg-success" : "bg-destructive"}`} title={item.isVeg ? "Vegetarian" : "Non-vegetarian"} />
                  <span className="min-w-0 break-words text-sm font-medium leading-snug text-foreground">{item.name}</span>
                </span>
                <span className="mt-auto flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(item.price)}</span>
                  {item.halfPrice != null && <span className="text-[11px] tabular-nums text-muted-foreground">Half {formatCurrency(item.halfPrice)}</span>}
                </span>
              </span>
            </button>
          ))}
          {filtered?.length === 0 && !isLoading && <p className="col-span-full py-10 text-center text-sm text-muted-foreground">{search ? <>No items match &quot;{search}&quot;</> : "No items in this category yet"}</p>}
        </div>
      )}
    </div>
  );
}
