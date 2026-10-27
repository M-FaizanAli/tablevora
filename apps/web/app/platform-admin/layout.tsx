import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default function PlatformAdminLayout({ children }: { children: ReactNode }) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    redirect("/login");
  }

  return children;
}
