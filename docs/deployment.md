# Deploying Tablevora

## Portable server deployment

The supported portable architecture is a persistent Node API, PostgreSQL, and a Next.js frontend. For a Linux server with Docker:

1. Clone this repository. Copy `.env.example` to `.env`.
2. Set unique `POSTGRES_PASSWORD` and `JWT_SECRET` (at least 32 random characters), `FRONTEND_ORIGIN`, and `HOST_PORT`.
3. Run `docker compose up --build -d`.
4. Put an HTTPS reverse proxy in front of the web service; then set `COOKIE_SECURE=true` and the HTTPS frontend origin.
5. Keep database/uploads volumes backed up and test restoration.

The API applies migrations before listening. Do not publish PostgreSQL to the internet. The updater is opt-in and points to Tablevora, not upstream images. Linux USB mounts are only needed on hardware installations; use the cloud Compose file for servers without USB devices.

## Vercel frontend + persistent API

Vercel project root: `apps/web`.

- Install: `cd ../.. && pnpm install --frozen-lockfile`
- Build: `cd ../.. && pnpm --filter @nodedr-restaurant/types build && pnpm --filter web build`
- `BACKEND_URL`: HTTPS URL of the API (no trailing slash), configured **before building**.
- `NEXT_PUBLIC_SOCKET_TRANSPORT=polling`: preserves first-party cookies through the proxy to a persistent API.
- `NEXT_PUBLIC_DEMO_MODE=true`: shows the public demo credentials and sample-data banner.
- `NEXT_PUBLIC_SOURCE_URL`: repository or immutable release URL containing the exact deployed source.

The API needs `DATABASE_URL`, a unique `JWT_SECRET`, `PORT`, `CORS_ORIGIN` equal to the frontend origin, `COOKIE_SECURE=true`, `NODE_ENV=production`, and `ENABLE_SWAGGER=false`.

For a dedicated demo, set `DEMO_MODE=true`; run `node dist/prisma/seed.js` once after migrations. Never expose the seed operation as an HTTP route. No paid payment gateways are invoked by the demo's manual payment recording.

Demo mode disables automatic background cron jobs (scheduled order dispatch, reports, webhooks, backups, and fiscal retries). Interactive orders and kitchen actions still work. The public `/api/health` endpoint does not query PostgreSQL, so an external API health check does not keep a serverless database computing while the demo is idle. Database queries resume on actual use; free quotas still apply.

`render.yaml` describes the free demo API and asks for an external `DATABASE_URL`; it does not create an expiring Render PostgreSQL database. The hosted demo uses Neon Free through Vercel Marketplace. Keep that connection in Render's secret environment settings, never in the repository. For this persistent Prisma API, use the direct Neon URL with TLS and a small connection limit. The startup command applies migrations. `SEED_DEMO=false` preserves existing migrated data; run the demo seed explicitly only for a new, empty sample database.

The free demo uses an ephemeral uploads directory and blocks uploads; real client installations need durable upload storage and database backups. Neon may suspend idle compute and resume on the next query; this does not delete stored data. Do not ping the database continuously: that consumes its monthly free compute allowance. The API's database-free health endpoint is enough for the server keep-alive.

`.github/workflows/demo-health.yml` checks `https://tablevora-api.onrender.com/api/health` every ten minutes and supports manual runs. Public GitHub schedules can be delayed or disabled after prolonged repository inactivity; this is a best-effort demo check, not an uptime guarantee. Render's free instance-hour limits and Neon's free storage/compute limits still apply. No paid upgrade or automatic top-up is configured by this deployment.

## Operational limits

- Keep one API replica unless a Socket.IO shared adapter and shared request-rate limiter are configured. Persistent 2FA attempts are already shared through PostgreSQL.
- Logout revokes all sessions for the account. Connected sockets on that server disconnect immediately; other replicas recheck within 30 seconds.
- In-memory scheduled jobs require a persistent API process. A serverless migration needs external scheduling and shared realtime coordination, not only an entrypoint change.
- Offline terminal writes and printer failover are future features. Existing multi-tender settlement and notification sound are retained.
- Legacy Windows/CasaOS packages require their own signing and hardware validation before distribution under the new brand.
