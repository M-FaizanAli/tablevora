# Tablevora launch work — 26 October 2026

## Implemented

- Tablevora identity: generated logo, app icons, green/cream/mint light and dark palettes, Outfit/Geist typography, new public landing and sign-in layout.
- Customer-facing names, docs links, API labels, installer and update repository references updated. Internal package names and integration signature headers retained for compatibility.
- AGPL license and original copyright retained; NOTICE and in-app About/source page added.
- SEC-01: branch access rejects missing, empty, repeated/non-string, and whitespace-padded identifiers before Prisma executes a query.
- SEC-02: 2FA attempts serialized with a PostgreSQL row lock; persistent attempt count and expiry shared across restarts and workers. TOTP replay and recovery-code consumption use current locked state.
- SEC-03: versioned JWTs; logout increments the version and disconnects realtime sessions. Legacy/unversioned tokens are rejected. Logout signs the account out on all devices.
- SEC-04: Swagger now requires explicit ENABLE_SWAGGER=true; production templates disable it.
- Updated body-parser, multer, undici, nodemailer, and fast-uri. Replaced node-forge with OpenSSL parsing and native Node crypto certificate/key matching. Private-key material never appears in command arguments or error messages.
- Shared-demo guard allows operational workflows and blocks configuration, infrastructure, integrations, and physical printing. Dedicated local demo database and seed safeguards.
- Portable cloud Compose, Render blueprint, Vercel frontend instructions, CI checks, and API smoke test.

## Verification

- Backend: 246 tests passed, 13 database integration tests skipped without their opt-in database setting.
- Frontend logic: 59 tests passed.
- Backend build and final frontend production build passed. Two additional demo API-key route restriction tests passed.
- pnpm audit: zero advisories after dependency changes.
- All 39 migrations applied successfully to a fresh dedicated PostgreSQL demo database; seed completed.
- History secret scan: 207 commits scanned; eight findings manually reviewed as example bearer tokens and the NestJS template's dummy token. Real local credentials were removed from the untracked issue report before publication. The staged diff scan flagged only the deletion of that same dummy NestJS token.

## Limits / follow-up

This is not a certification or exhaustive security audit. Local and hosted end-to-end checks are reported separately. Original feature-checklist entries are historical: multi-tender settlement and notification sound already exist. Offline terminal-write synchronization, printer failover, and per-seat billing remain future product work. No claim is made that all roadmap items are implemented.

Single API replica is the initial deployment target. Multi-replica Socket.IO fan-out and global HTTP rate limiting need shared infrastructure. Hardware printing and legacy signed desktop packages require dedicated hardware/signing validation. Demo data is shared and should contain fictional information only.

A web search screened the working name, but no trademark clearance or domain purchase was performed. Commercial services must preserve software users' AGPL rights.
