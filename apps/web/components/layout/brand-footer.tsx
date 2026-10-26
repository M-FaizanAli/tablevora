import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { BRAND } from "@/lib/brand";

export function BrandFooter() {
  return (
    <div className="flex flex-col gap-2 border-t border-sidebar-border px-4 py-3">
      <a href={BRAND.supportUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg border border-sidebar-border px-3 py-1.5 text-xs font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent">
        <LifeBuoy className="h-3.5 w-3.5" /> Support & feedback
      </a>
      <div className="flex items-center justify-between text-xs text-sidebar-foreground/70">
        <span className="font-semibold">{BRAND.name}</span>
        <Link href="/about" className="hover:underline">About & source</Link>
      </div>
    </div>
  );
}
