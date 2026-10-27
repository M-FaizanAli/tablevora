"use client";
import { FormEvent, useState } from "react";
import { api, ApiError } from "@/lib/api";

export default function PlatformAdminBootstrapPage() {
  const [challenge, setChallenge] = useState<{
    challengeToken: string;
    secret: string;
    otpauthUrl: string;
  } | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  async function start(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const r = await api.post<typeof challenge>("/platform/auth/bootstrap", {
        bootstrapSecret: f.get("bootstrapSecret"),
        email: f.get("email"),
        name: f.get("name"),
        password: f.get("password"),
      });
      setChallenge(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Bootstrap failed");
    }
  }
  async function finish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!challenge) return;
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const r = await api.post<{
        recoveryCodes: string[];
        admin: { id: string };
      }>("/platform/auth/bootstrap/confirm", {
        challengeToken: challenge.challengeToken,
        code: f.get("code"),
      });
      setCodes(r.recoveryCodes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed");
    }
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <section className="w-full max-w-lg rounded-2xl border bg-card p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Tablevora
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Platform Admin setup</h1>
        {codes.length > 0 ? (
          <>
            <p className="mt-3 text-sm">
              Save these recovery codes offline. They are shown once.
            </p>
            <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
              {codes.join("\n")}
            </pre>
            <a
              className="mt-5 inline-block text-primary underline"
              href="/platform-admin"
            >
              Open console
            </a>
          </>
        ) : !challenge ? (
          <form onSubmit={start} className="mt-6 space-y-4">
            {[
              ["bootstrapSecret", "Bootstrap secret", "password"],
              ["name", "Your name", "text"],
              ["email", "Email", "email"],
              ["password", "Admin password (12+ characters)", "password"],
            ].map(([name, label, type]) => (
              <label key={name} className="block text-sm">
                {label}
                <input
                  name={name}
                  required
                  type={type}
                  minLength={
                    name === "bootstrapSecret"
                      ? 32
                      : name === "password"
                        ? 12
                        : undefined
                  }
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                />
              </label>
            ))}
            <button className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground">
              Create admin and configure MFA
            </button>
          </form>
        ) : (
          <form onSubmit={finish} className="mt-6 space-y-4">
            <p className="text-sm">
              Add this secret to your authenticator, or open{" "}
              <a className="underline" href={challenge.otpauthUrl}>
                the authenticator link
              </a>
              . Keep the secret private.
            </p>
            <code className="block break-all rounded bg-muted p-3">
              {challenge.secret}
            </code>
            <label className="block text-sm">
              6 digit authenticator code
              <input
                name="code"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <button className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground">
              Verify and finish setup
            </button>
          </form>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
