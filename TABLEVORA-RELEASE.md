# Tablevora launch work — 26 October 2026

## Visual and menu-photo follow-up — 27 October 2026

- Replaced the padded raster nav mark with a vector master and regenerated app icons/favicon from the same geometry.
- Fixed dashboard shell sizing/scrolling, POS category/product widths, table picker overflow and hover clipping, menu item name/price overflow, photo display/fallbacks, and laptop menu-table crowding. Tightened login spacing and chart currency-label space, and wrapped the kitchen progress strip at narrow widths.
- Added six bundled sample dish images to the demo. Real menu photo add/replace/remove now goes through a size-limited raster pipeline and persists in PostgreSQL; demo users cannot change other menu fields. Disabled the custom vegetarian switch alongside the other read-only demo fields.
- Desktop and 390 px phone browser review showed the POS photo grid/cart, responsive navigation, and 1024 px menu table fit without horizontal clipping. Menu photo editor is visible and read-only fields are disabled. Browser file-picker automation did not open the system picker, so a real file selection was not verified through the browser.
- Frontend logic: 59 tests passed. Full backend suite: 256 passed, 13 database integration tests skipped without the opt-in integration database. Types and frontend production build passed after the final breakpoint and demo-read-only adjustments. The browser file-picker automation did not open the system picker, so the actual file selection path was instead exercised against the isolated local demo API: upload returned 201, photo update 200, and a fresh menu query read back the image; the original sample item was restored afterward.

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

- Browser verification: signed in, selected Table 1, customized a pizza, submitted it to the kitchen, and recorded a fictional cash payment. Realtime queue and unread notification counters updated.
- Fixed dashboard nested button markup, link button semantics, and the refund icon accessible label discovered during browser testing.

## Limits / follow-up

This is not a certification or exhaustive security audit. Local and hosted end-to-end checks are reported separately. Original feature-checklist entries are historical: multi-tender settlement and notification sound already exist. Offline terminal-write synchronization, printer failover, and per-seat billing remain future product work. No claim is made that all roadmap items are implemented.

Single API replica is the initial deployment target. Multi-replica Socket.IO fan-out and global HTTP rate limiting need shared infrastructure. Hardware printing and legacy signed desktop packages require dedicated hardware/signing validation. Demo data is shared and should contain fictional information only.

A web search screened the working name, but no trademark clearance or domain purchase was performed. Commercial services must preserve software users' AGPL rights.

## Hosted database migration — 27 October 2026

Neon Free PostgreSQL was provisioned through Vercel Marketplace in Portland, in the same region as the Render Free API. The live API connection uses Neon, with TLS and a small connection pool. The old Render database is retained only as a rollback copy and retains its original expiry. No paid database plan was selected.

All 39 schema migrations applied. A snapshot of 77 application tables and 223 rows was copied while the API was suspended. Every row count and SHA-256 digest matched, with foreign keys checked before committing. Automatic reseeding is disabled. Demo-mode cron jobs are disabled to avoid idle database polling; interactive workflows remain enabled. The GitHub API health check does not query PostgreSQL.

Hosted verification after cutover: API health returned HTTP 200; the public Vercel sign-in, tenant isolation, demo restrictions, logout token revocation, and disabled Swagger checks passed. The logout test changed the user record in Neon, confirming the live API's database target. Browser sign-in displayed the migrated three orders and ₹990 sample revenue.
