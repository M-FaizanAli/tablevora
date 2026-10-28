"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { COUNTRY_CURRENCY, TAX_REGIME_PRESETS, TAX_REGIMES, registerSchema, suggestedTax, type RegisterDto } from "@nodedr-restaurant/types";
import { motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useRegister } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";
import { countryOptions, currencyOptions, timeZoneOptions } from "@/lib/region-options";

export default function SignupPage() {
  const router = useRouter();
  const register = useRegister();
  const prefersReducedMotion = useReducedMotion();
  const {
    register: field,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterDto>({
    resolver: zodResolver(registerSchema),
    defaultValues: { branchName: "Main Branch", timezone: "UTC", taxRegime: "CUSTOM", taxMode: "INCLUSIVE" },
  });

  useEffect(() => {
    setValue("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, [setValue]);

  const country = watch("country");
  const taxRegime = watch("taxRegime");
  const onCountryChange = (code: string) => {
    const tax = suggestedTax(code);
    const suggestion = COUNTRY_CURRENCY[code];
    setValue("currency", suggestion && currencyOptions.some((c) => c.code === suggestion) ? suggestion : "", { shouldValidate: true });
    setValue("taxRegime", tax.regime);
    setValue("taxMode", tax.mode);
    setValue("taxLabel", tax.label);
  };

  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <section className="max-w-md rounded-2xl border bg-card p-8 text-center">
          <h1 className="text-2xl font-semibold">Signup is unavailable</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Restaurant signup is disabled on the shared Tablevora demo.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-block text-primary underline"
          >
            Return to sign in
          </Link>
        </section>
      </main>
    );
  }

  const onSubmit = (dto: RegisterDto) => {
    register.mutate(dto, {
      onSuccess: () => router.push("/signup/pending"),
      onError: (err) => {
        toast.error(
          err instanceof ApiError ? err.message : "Something went wrong",
        );
      },
    });
  };

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(50%_50%_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_90%),transparent)]"
      />
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg"
      >
        <div className="mb-10 flex flex-col items-center gap-2 text-center">
          <Link href="/">
            <Logo size={44} />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Tablevora
          </h1>
          <p className="text-sm text-muted-foreground">
            Set up your restaurant
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="restaurantName">Restaurant name</Label>
            <Input
              id="restaurantName"
              autoComplete="organization"
              placeholder="e.g. Spice Route"
              {...field("restaurantName")}
            />
            {errors.restaurantName && (
              <p className="text-xs text-destructive">
                {errors.restaurantName.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="branchName">First branch name</Label>
            <Input
              id="branchName"
              placeholder="Main Branch"
              defaultValue="Main Branch"
              {...field("branchName")}
            />
            {errors.branchName && (
              <p className="text-xs text-destructive">
                {errors.branchName.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="country">Country</Label>
              <select id="country" className="h-10 rounded-md border bg-background px-3" required {...field("country", { onChange: (e) => onCountryChange(e.target.value) })}>
                <option value="">Select country</option>
                {countryOptions.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
              </select>
              {errors.country && <p className="text-xs text-destructive">{errors.country.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="currency">Currency</Label>
              <select id="currency" className="h-10 rounded-md border bg-background px-3" required {...field("currency")}>
                <option value="">Select currency</option>
                {currencyOptions.map(({ code, name }) => <option key={code} value={code}>{code} — {name}</option>)}
              </select>
              {errors.currency && <p className="text-xs text-destructive">{errors.currency.message}</p>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">The currency is suggested from {country ? countryOptions.find((c) => c.code === country)?.name : "your country"}; change it if your restaurant uses another currency. This version supports currencies with two decimal places.</p>

          <div className="flex flex-col gap-2">
            <Label htmlFor="timezone">Restaurant time zone</Label>
            <select id="timezone" className="h-10 rounded-md border bg-background px-3" required {...field("timezone")}>
              {timeZoneOptions.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
            </select>
            {errors.timezone && <p className="text-xs text-destructive">{errors.timezone.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="taxRegime">Tax system</Label>
              <select id="taxRegime" className="h-10 rounded-md border bg-background px-3" {...field("taxRegime", { onChange: (e) => {
                const preset = TAX_REGIME_PRESETS[e.target.value as keyof typeof TAX_REGIME_PRESETS];
                setValue("taxMode", preset.defaultMode);
                setValue("taxLabel", preset.taxLabel);
              } })}>
                {TAX_REGIMES.map((regime) => <option key={regime} value={regime}>{TAX_REGIME_PRESETS[regime].displayName}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="taxMode">Menu prices</Label>
              <select id="taxMode" className="h-10 rounded-md border bg-background px-3" {...field("taxMode")}>
                <option value="INCLUSIVE">Include tax</option>
                <option value="EXCLUSIVE">Add tax at checkout</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="defaultTaxRatePercent">Default tax rate (%)</Label>
              <Input id="defaultTaxRatePercent" type="number" min="0" max="100" step="0.001" required {...field("defaultTaxRatePercent")} />
              {errors.defaultTaxRatePercent && <p className="text-xs text-destructive">Enter the rate for this location.</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="taxLabel">Tax label</Label>
              <Input id="taxLabel" placeholder={TAX_REGIME_PRESETS[taxRegime ?? "CUSTOM"].taxLabel} {...field("taxLabel")} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Tax rates can differ by city, service, and item. Confirm this rate for your location; individual menu items can override it.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2"><Label htmlFor="taxId">Tax registration ID (optional)</Label><Input id="taxId" {...field("taxId")} /></div>
            <div className="flex flex-col gap-2"><Label htmlFor="branchPhone">Branch phone (optional)</Label><Input id="branchPhone" type="tel" {...field("branchPhone")} /></div>
          </div>
          <div className="flex flex-col gap-2"><Label htmlFor="branchAddress">Branch address (optional)</Label><Input id="branchAddress" autoComplete="street-address" {...field("branchAddress")} /></div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ownerName">Your name</Label>
            <Input
              id="ownerName"
              autoComplete="name"
              placeholder="e.g. Priya Sharma"
              {...field("ownerName")}
            />
            {errors.ownerName && (
              <p className="text-xs text-destructive">
                {errors.ownerName.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@restaurant.com"
              {...field("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"

              autoComplete="new-password"
              placeholder="At least 8 characters"
              {...field("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="mt-2 h-11"
            disabled={register.isPending}
          >
            {register.isPending ? "Creating your account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground hover:underline"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
