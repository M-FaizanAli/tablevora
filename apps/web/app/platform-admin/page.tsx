"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type {
  PlatformRestaurantList,
  PlatformRestaurantSummary,
  RestaurantLifecycleStatus,
} from "@nodedr-restaurant/types";
import { COUNTRY_CURRENCY, TAX_REGIME_PRESETS, TAX_REGIMES, suggestedTax, type TaxMode, type TaxRegime } from "@nodedr-restaurant/types";
import { countryOptions, currencyOptions, timeZoneOptions } from "@/lib/region-options";

const statusOptions: [RestaurantLifecycleStatus | "ALL", string][] = [
  ["ALL", "All accounts"],
  ["PENDING", "Pending"],
  ["ACTIVE", "Active"],
  ["READ_ONLY", "Read only"],
  ["DECLINED", "Declined"],
];
export default function PlatformAdminPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PlatformRestaurantSummary[]>([]);
  const [status, setStatus] = useState<RestaurantLifecycleStatus | "ALL">(
    "ALL",
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createCountry, setCreateCountry] = useState("");
  const [createCurrency, setCreateCurrency] = useState("");
  const [createTimeZone, setCreateTimeZone] = useState("UTC");
  const [createRegime, setCreateRegime] = useState<TaxRegime>("CUSTOM");
  const [createMode, setCreateMode] = useState<TaxMode>("INCLUSIVE");
  const [createTaxLabel, setCreateTaxLabel] = useState("Tax");
  const [invite, setInvite] = useState<{
    restaurantName: string;
    url: string;
    expiresAt: string;
  } | null>(null);
  async function load() {
    setLoading(true);
    try {
      await api.get("/platform/auth/me");
      const q = new URLSearchParams({
        page: String(page),
        pageSize: "25",
        ...(status !== "ALL" ? { status } : {}),
        ...(search ? { search } : {}),
      });
      const data = await api.get<PlatformRestaurantList>(
        `/platform/restaurants?${q}`,
      );
      setRows(data.data);
      setTotal(data.total);
      setError("");
    } catch {
      router.replace("/platform-admin/login");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [status, page, search]);
  async function change(id: string, next: "ACTIVE" | "READ_ONLY" | "DECLINED") {
    try {
      await api.patch(`/platform/restaurants/${id}/status`, { status: next });
      await load();
      if (selected?.restaurant?.id === id)
        setSelected(await api.get(`/platform/restaurants/${id}`));
    } catch {
      setError("Could not update this restaurant. Refresh and try again.");
    }
  }
  async function details(id: string) {
    try {
      setSelected(await api.get(`/platform/restaurants/${id}`));
    } catch {
      setError("Could not load this restaurant account.");
    }
  }
  async function logout() {
    await api.post("/platform/auth/logout");
    router.replace("/platform-admin/login");
  }
  async function createRestaurant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await api.post<{
        restaurantName: string;
        inviteToken: string;
        inviteExpiresAt: string;
      }>("/platform/restaurants", {
        restaurantName: form.get("restaurantName"),
        branchName: form.get("branchName"),
        ownerName: form.get("ownerName"),
        ownerEmail: form.get("ownerEmail"),
        country: createCountry,
        currency: createCurrency,
        timezone: createTimeZone,
        taxRegime: createRegime,
        taxMode: createMode,
        defaultTaxRatePercent: form.get("defaultTaxRatePercent"),
        taxLabel: createTaxLabel,
        taxId: form.get("taxId") || undefined,
        branchAddress: form.get("branchAddress") || undefined,
        branchPhone: form.get("branchPhone") || undefined,
      });
      setInvite({
        restaurantName: result.restaurantName,
        url: `${window.location.origin}/platform-admin/invite#token=${result.inviteToken}`,
        expiresAt: result.inviteExpiresAt,
      });
      setCreateOpen(false);
      await load();
    } catch {
      setError(
        "Could not create the restaurant account. Check that the owner email is not already in use.",
      );
    }
  }
  async function reissueInvite(restaurantId: string, restaurantName: string) {
    try {
      const result = await api.post<{
        inviteToken: string;
        inviteExpiresAt: string;
      }>(`/platform/restaurants/${restaurantId}/invite`);
      setInvite({
        restaurantName,
        url: `${window.location.origin}/platform-admin/invite#token=${result.inviteToken}`,
        expiresAt: result.inviteExpiresAt,
      });
    } catch {
      setError("Could not create a new owner setup link.");
    }
  }
  const action = (r: PlatformRestaurantSummary) =>
    r.status === "PENDING" ? (
      <>
        <button
          onClick={() => void change(r.id, "ACTIVE")}
          className="rounded bg-primary px-3 py-1.5 text-primary-foreground"
        >
          Approve
        </button>
        <button
          onClick={() => void change(r.id, "DECLINED")}
          className="rounded border px-3 py-1.5"
        >
          Decline
        </button>
      </>
    ) : r.status === "ACTIVE" ? (
      <button
        onClick={() => void change(r.id, "READ_ONLY")}
        className="rounded border px-3 py-1.5"
      >
        Set read only
      </button>
    ) : r.status === "READ_ONLY" ? (
      <button
        onClick={() => void change(r.id, "ACTIVE")}
        className="rounded bg-primary px-3 py-1.5 text-primary-foreground"
      >
        Reactivate
      </button>
    ) : (
      <span className="text-xs text-muted-foreground">Retained</span>
    );
  return (
    <main className="min-h-screen bg-muted/30">
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Tablevora
          </p>
          <h1 className="text-xl font-semibold">Platform Admin</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Create restaurant
          </button>
          <button
            onClick={() => void logout()}
            className="rounded-md border px-3 py-2 text-sm"
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-8">
        <div>
          <h2 className="text-2xl font-semibold">Restaurant accounts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage tenant access and approvals. Restaurant business data is not
            available here.
          </p>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3 rounded-xl border bg-background p-4">
          <input
            aria-label="Search tenants"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search restaurant or owner email"
            className="min-w-64 flex-1 rounded-md border px-3 py-2"
          />
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as any);
            }}
            className="rounded-md border bg-background px-3 py-2"
          >
            {statusOptions.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto rounded-xl border bg-background">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-muted-foreground">
              <tr>
                {[
                  "Restaurant",
                  "Owner contact",
                  "Created",
                  "Branches",
                  "Staff",
                  "Status",
                  "Actions",
                ].map((x) => (
                  <th key={x} className="px-4 py-3 font-medium">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-4">
                    <button
                      onClick={() => void details(r.id)}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {r.name}
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    {r.owner?.name ?? "—"}
                    <span className="block text-xs text-muted-foreground">
                      {r.owner?.email ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">{r.branchCount}</td>
                  <td className="px-4 py-4">{r.staffCount}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
                      {r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="space-x-2 px-4 py-4">{action(r)}</td>
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No restaurant accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {loading ? "Loading…" : `${total} account${total === 1 ? "" : "s"}`}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border px-3 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={rows.length < 25}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelected(null)}
        >
          <section
            className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between">
              <h2 className="text-xl font-semibold">
                {selected.restaurant?.name}
              </h2>
              <button onClick={() => setSelected(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {selected.restaurant?.status} ·{" "}
              {selected.restaurant?.owner?.email}
            </p>
            <h3 className="mt-6 font-medium">Platform audit history</h3>
            {selected.ownerSetupPending && (
              <button
                onClick={() =>
                  void reissueInvite(
                    selected.restaurant.id,
                    selected.restaurant.name,
                  )
                }
                className="mt-3 rounded-md border px-3 py-2 text-sm"
              >
                Create new owner setup link
              </button>
            )}
            <ul className="mt-2 space-y-2">
              {selected.audit?.map((a: any) => (
                <li key={a.id} className="rounded border p-3 text-sm">
                  <span>{a.action}</span>
                  <span className="ml-2 text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
      {createOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-restaurant-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setCreateOpen(false)}
        >
          <form
            onSubmit={createRestaurant}
            className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl bg-background p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <h2
                id="create-restaurant-title"
                className="text-xl font-semibold"
              >
                Create restaurant account
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The owner will receive a one-time link to choose their password.
                The account starts pending until you approve it.
              </p>
            </div>
            {[
              ["restaurantName", "Restaurant name", "text"],
              ["branchName", "First branch", "text"],
              ["ownerName", "Owner name", "text"],
              ["ownerEmail", "Owner email", "email"],
            ].map(([name, label, type]) => (
              <label key={name} className="block text-sm">
                {label}
                <input
                  required
                  name={name}
                  type={type}
                  minLength={2}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                />
              </label>
            ))}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">Country
                <select required value={createCountry} onChange={(e) => {
                  const country = e.target.value;
                  const tax = suggestedTax(country);
                  setCreateCountry(country);
                  const suggestion = COUNTRY_CURRENCY[country];
                  setCreateCurrency(suggestion && currencyOptions.some((c) => c.code === suggestion) ? suggestion : "");
                  setCreateRegime(tax.regime);
                  setCreateMode(tax.mode);
                  setCreateTaxLabel(tax.label);
                }} className="mt-1 w-full rounded-md border bg-background px-3 py-2">
                  <option value="">Select country</option>
                  {countryOptions.map(({code,name}) => <option key={code} value={code}>{name}</option>)}
                </select>
              </label>
              <label className="block text-sm">Currency
                <select required value={createCurrency} onChange={(e) => setCreateCurrency(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2">
                  <option value="">Select currency</option>
                  {currencyOptions.map(({code,name}) => <option key={code} value={code}>{code} — {name}</option>)}
                </select>
              </label>
            </div>
            <label className="block text-sm">Restaurant time zone
              <select required value={createTimeZone} onChange={(e) => setCreateTimeZone(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2">
                {timeZoneOptions.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
              </select>
            </label>
            <p className="text-xs text-muted-foreground">Currency choices currently support two decimal places.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">Tax system
                <select value={createRegime} onChange={(e) => {
                  const regime = e.target.value as TaxRegime;
                  setCreateRegime(regime);
                  setCreateMode(TAX_REGIME_PRESETS[regime].defaultMode);
                  setCreateTaxLabel(TAX_REGIME_PRESETS[regime].taxLabel);
                }} className="mt-1 w-full rounded-md border bg-background px-3 py-2">
                  {TAX_REGIMES.map((regime) => <option key={regime} value={regime}>{TAX_REGIME_PRESETS[regime].displayName}</option>)}
                </select>
              </label>
              <label className="block text-sm">Menu prices
                <select value={createMode} onChange={(e) => setCreateMode(e.target.value as TaxMode)} className="mt-1 w-full rounded-md border bg-background px-3 py-2">
                  <option value="INCLUSIVE">Include tax</option><option value="EXCLUSIVE">Add tax at checkout</option>
                </select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">Default tax rate (%)
                <input required name="defaultTaxRatePercent" type="number" min="0" max="100" step="0.001" className="mt-1 w-full rounded-md border bg-background px-3 py-2" />
              </label>
              <label className="block text-sm">Tax label
                <input value={createTaxLabel} onChange={(e) => setCreateTaxLabel(e.target.value)} maxLength={30} className="mt-1 w-full rounded-md border bg-background px-3 py-2" />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Confirm the rate for this location. Menu items can have a different rate.</p>
            <label className="block text-sm">Tax registration ID (optional)<input name="taxId" className="mt-1 w-full rounded-md border bg-background px-3 py-2" /></label>
            <label className="block text-sm">Branch address (optional)<input name="branchAddress" className="mt-1 w-full rounded-md border bg-background px-3 py-2" /></label>
            <label className="block text-sm">Branch phone (optional)<input name="branchPhone" type="tel" className="mt-1 w-full rounded-md border bg-background px-3 py-2" /></label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-md border px-3 py-2"
              >
                Cancel
              </button>
              <button className="rounded-md bg-primary px-3 py-2 text-primary-foreground">
                Create and get setup link
              </button>
            </div>
          </form>
        </div>
      )}
      {invite && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-title"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setInvite(null)}
        >
          <section
            className="w-full max-w-lg space-y-4 rounded-xl bg-background p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <h2 id="invite-title" className="text-xl font-semibold">
                Owner setup link
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Share this one-time link with {invite.restaurantName}&apos;s
                owner. It expires {new Date(invite.expiresAt).toLocaleString()}{" "}
                and is shown only now.
              </p>
            </div>
            <input
              readOnly
              aria-label="One-time owner setup link"
              value={invite.url}
              onFocus={(event) => event.currentTarget.select()}
              className="w-full rounded-md border bg-muted px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => void navigator.clipboard.writeText(invite.url)}
                className="rounded-md border px-3 py-2"
              >
                Copy link
              </button>
              <button
                onClick={() => setInvite(null)}
                className="rounded-md bg-primary px-3 py-2 text-primary-foreground"
              >
                Done
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
