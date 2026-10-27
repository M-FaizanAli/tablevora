<div align="center">
  <img src="apps/web/public/brand-lockup.png" width="560" alt="Tablevora">
  <p><strong>A calmer service. A smarter restaurant.</strong></p>
  <p>Restaurant POS, kitchen display, tables, billing, inventory, and reporting.</p>
</div>

Tablevora is a customized, self-hostable restaurant operations platform maintained by **Faizan**. It builds on [Nodedr OrderRestro](https://github.com/Raktim94/nodedr-restaurant-pos) by Nodedr Infotech Private Limited and Raktim Ranjit. It is distributed under **AGPL-3.0-only**, with original attribution preserved. See [NOTICE](NOTICE) and [LICENSE](LICENSE).

## What you can do

- Take dine-in, takeaway, and delivery orders, with modifiers and kitchen tickets.
- Track tables and kitchen preparation, accept orders, and manage cancellations.
- Settle bills with multiple payment methods, partial payments, and receipts.
- Manage menus, stock, customers, reservations, staff, and reports.
- Run on a restaurant's LAN without internet, provided terminals can reach the local server.
- Customize and offer installation, training, managed hosting, and support services.

## Quick start

Use Node 22+ and pnpm. PostgreSQL is required. Internal package names are preserved for compatibility.

```sh
pnpm install --frozen-lockfile
cp apps/backend/.env.example apps/backend/.env
# Set a real DATABASE_URL and a unique random JWT_SECRET in the ignored .env.
pnpm --filter @nodedr-restaurant/types build
pnpm --filter @nodedr-restaurant/backend exec prisma generate
pnpm --filter @nodedr-restaurant/backend exec prisma migrate deploy
pnpm --filter @nodedr-restaurant/backend build
```

Start the API from `apps/backend` using `node --env-file=.env dist/src/main.js`. In another terminal, run `pnpm --filter web dev`. Configure `CORS_ORIGIN=http://localhost:3000` for the default Next.js development port.

For a **dedicated demo database only**, run `pnpm --filter @nodedr-restaurant/backend prisma:seed`. Production demo seeding requires `DEMO_MODE=true`. Demo credentials are `owner@demo.local` / `Password123!`. Never seed a real client database with these public credentials.

## Deployment

Hosted sample workspace: [Tablevora demo](https://tablevora.vercel.app/login). Use `owner@demo.local` / `Password123!` and fictional information only. The demo uses Vercel for the frontend, Render Free for the API, and Neon Free PostgreSQL provisioned through Vercel Marketplace. Free quotas and cold starts apply.

See [the deployment guide](docs/deployment.md) for Docker, Vercel frontend, and persistent API hosting. The shared demo disables administrative configuration, integrations, system operations, and hardware printing while retaining operational workflows. Menu photos can be added, replaced, or removed; demo uploads are resized and stored in PostgreSQL. It uses sample data; do not enter real customer information.

For a real installation, keep `DEMO_MODE=false`, configure unique credentials, HTTPS, backups, and the correct local tax settings. Browser printing works remotely; direct USB/network printing needs a backend with access to the restaurant's devices.

### Separate Tablevora client service and Platform Admin

The public showcase remains a separate demo deployment. Its Render configuration explicitly sets `DEMO_MODE=true`, `TENANT_SIGNUP_ENABLED=false`, and `PLATFORM_ADMIN_ENABLED=false`. Do not point client tenants at the demo database.

For a separate client SaaS deployment, provision a distinct API, PostgreSQL database, and Vercel project, then configure `DEMO_MODE=false`, `TENANT_SIGNUP_ENABLED=true`, `PLATFORM_ADMIN_ENABLED=true`, `PLATFORM_ADMIN_BOOTSTRAP_SECRET` and `PLATFORM_ADMIN_ENCRYPTION_KEY` (each at least 32 random characters), and a unique `JWT_SECRET`. Use HTTPS and set `COOKIE_SECURE=true`. The platform session signing key is derived separately from `JWT_SECRET`; TOTP secrets are encrypted at rest with the separate encryption key. Apply Prisma migrations before enabling traffic. Do not seed demo data.

Once the production-only service is deployed, run the one-time setup at `/platform-admin/bootstrap` using the bootstrap secret and configure an authenticator before opening the console. Save the recovery codes offline. If the password or MFA is lost, run `pnpm --filter @nodedr-restaurant/backend platform-admin:recover` on the API host and follow its confirmation prompt, then bootstrap again. This retains audit rows while clearing the admin actor reference.

New restaurant signup is held as `PENDING` and creates no session. Approval is required before the owner can sign in. `READ_ONLY` blocks tenant writes while keeping reads available. The admin console shows account metadata and platform audit events only; it has no access to restaurant orders, customer records, or sales reports.

Platform Admin can also create a restaurant and its first owner directly. The tenant remains `PENDING`; the owner chooses their password through a one-time setup link that expires after seven days. Share the link with the owner directly; no email service is required. A new setup link can be issued for an owner who has not completed setup.

The existing public demo is on free resources. A separate production-mode tenant service must be evaluated against current provider quotas before provisioning. This repository change does not create or upgrade any hosted resource; stop if the required separate deployment is not available on free tiers.

## Quality checks

```sh
pnpm --filter @nodedr-restaurant/types build
pnpm --filter @nodedr-restaurant/backend exec prisma generate
pnpm --filter @nodedr-restaurant/backend build
pnpm --filter web build
pnpm test
pnpm audit
```

See [release notes](TABLEVORA-RELEASE.md) for the exact checks performed and remaining limitations. [The original issue report](ISSUES-REPORT.md) and [historical audit](SECURITY-AUDIT-REPORT.md) provide context, not a current guarantee of security.

See [the launch and client-service workflow](docs/LAUNCH-PLAN.md) for the portfolio, pilot, and commercial rollout.

## Service offering

Tablevora can be customized and deployed for restaurants and cafés. Services include menu setup, workflow changes, deployment, training, and maintenance. Software licensing rights remain under AGPL; service agreements cover the work and support provided.

[Source and issues](https://github.com/M-FaizanAli/tablevora) · [Brand guide](docs/brand/README.md) · [Architecture](ARCHITECTURE.md)
