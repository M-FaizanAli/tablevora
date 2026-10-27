"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

type Invitation = { restaurantName: string; ownerName: string; email: string };

export default function OwnerInvitePage() {
  const [token, setToken] = useState("");
  const [invite, setInvite] = useState<Invitation | null>(null);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const value =
      new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
    window.history.replaceState(null, "", window.location.pathname);
    if (!value) {
      setError("This setup link is missing or invalid.");
      return;
    }
    setToken(value);
    void api
      .post<Invitation>("/platform/invites/validate", { token: value })
      .then(setInvite)
      .catch((err) =>
        setError(
          err instanceof ApiError
            ? err.message
            : "This setup link is invalid or expired.",
        ),
      );
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== form.get("confirmPassword")) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/platform/invites/accept", { token, password });
      setComplete(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not finish account setup. Request a new link from the platform administrator.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <section className="w-full max-w-lg space-y-5 rounded-2xl border bg-card p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Tablevora
        </p>
        {complete ? (
          <>
            <h1 className="text-2xl font-semibold">Account setup complete</h1>
            <p className="text-sm text-muted-foreground">
              Your password is set. You can sign in after your restaurant is
              approved by the platform administrator.
            </p>
            <Link
              href="/login"
              className="inline-flex rounded-md bg-primary px-4 py-2 text-primary-foreground"
            >
              Go to sign in
            </Link>
          </>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-semibold">
                Set up your owner account
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {invite
                  ? `${invite.restaurantName} · ${invite.ownerName} · ${invite.email}`
                  : "Checking your one-time setup link…"}
              </p>
            </div>
            {invite && (
              <form onSubmit={submit} className="space-y-4">
                <label className="block text-sm">
                  Choose a password
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  Confirm password
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                  />
                </label>
                <button
                  disabled={busy}
                  className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
                >
                  {busy ? "Saving password…" : "Finish account setup"}
                </button>
              </form>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
