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

`render.yaml` describes an alternative backend/database deployment. The free demo uses an ephemeral uploads directory and blocks uploads; real client installations need a persistent upload volume and a durable database plan. Free hosting may sleep or expire: check the hosting account before presenting a live demo.

## Operational limits

- Keep one API replica unless a Socket.IO shared adapter and shared request-rate limiter are configured. Persistent 2FA attempts are already shared through PostgreSQL.
- Logout revokes all sessions for the account. Connected sockets on that server disconnect immediately; other replicas recheck within 30 seconds.
- In-memory scheduled jobs require a persistent API process. A serverless migration needs external scheduling and shared realtime coordination, not only an entrypoint change.
- Offline terminal writes and printer failover are future features. Existing multi-tender settlement and notification sound are retained.
- Legacy Windows/CasaOS packages require their own signing and hardware validation before distribution under the new brand.
