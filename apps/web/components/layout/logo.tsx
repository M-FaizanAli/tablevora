import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/brand-mark.svg"
      alt="Tablevora"
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      unoptimized
      preload
    />
  );
}
