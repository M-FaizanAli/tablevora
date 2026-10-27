"use client";

import { UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Seeded demo items that have a matching photo in /images/demo-menu.webp; the rest show the placeholder.
const SAMPLE_POSITION: Record<string, [number, number]> = {
  "demo-item-margherita": [100, 0],
  "demo-item-lemonade": [50, 100], // the sprite's mint-and-lime glass
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
