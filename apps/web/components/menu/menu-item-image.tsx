"use client";

import { UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const SAMPLE_POSITION: Record<string, [number, number]> = {
  "demo-item-paneer-tikka": [0, 0],
  "demo-item-chicken-65": [50, 0],
  "demo-item-margherita": [100, 0],
  "demo-item-butter-chicken": [0, 100],
  "demo-item-mojito": [50, 100],
  "demo-item-cola": [100, 100],
};

export function MenuItemImage({ item, className }: {
  item: { id: string; name: string; imageUrl?: string | null };
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = item.imageUrl && item.imageUrl !== failedUrl ? item.imageUrl : null;
  const sample = process.env.NEXT_PUBLIC_DEMO_MODE === "true" ? SAMPLE_POSITION[item.id] : undefined;
  return (
    <span className={cn("relative block shrink-0 overflow-hidden bg-accent", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- same-origin uploads or bounded inline images
        <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" onError={() => setFailedUrl(src)} />
      ) : sample ? (
        <span aria-hidden className="absolute inset-x-0 top-1/2 aspect-square -translate-y-1/2 bg-[url('/images/demo-menu.webp')] bg-no-repeat" style={{ backgroundSize: "300% 200%", backgroundPosition: `${sample[0]}% ${sample[1]}%` }} />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-primary/45" aria-label="No photo">
          <UtensilsCrossed className="h-7 w-7" aria-hidden />
        </span>
      )}
    </span>
  );
}
