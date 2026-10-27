import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export default function PendingSignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <section className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mb-5 flex justify-center">
          <Logo size={48} />
        </div>
        <h1 className="text-2xl font-semibold">Request received</h1>
        <p className="mt-3 text-muted-foreground">
          Your restaurant account is waiting for review. You can sign in after
          the platform administrator approves it.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 font-medium text-primary-foreground"
        >
          Return to sign in
        </Link>
      </section>
    </main>
  );
}
