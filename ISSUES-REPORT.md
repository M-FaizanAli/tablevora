# Project Issues, Security Audit & Improvement Report

> **Audience:** AI Agents, Security Auditors, and Developers working on this codebase.  
> **Repository:** `nodedr-restaurant-pos` (OrderRestro)  
> **Date:** October 26, 2026  
> **Environment Status:** Fully functional on local machine (Next.js web on `:3000`, NestJS API on `:4001`, embedded PostgreSQL 18.4 on `:5432`).  
> **Test Pass Rate:** 59/59 Frontend (`web`), 213/213 Backend (`@nodedr-restaurant/backend`).

---

## 1. Executive Summary

This report documents the security vulnerabilities, dependency risks, architectural improvement opportunities, and rebranding/personalization guide discovered during full-repository dynamic testing and static code analysis.

Future AI assistants working on this repository should treat **Section 2 (Security Vulnerabilities)** as immediate high-priority fixes before deploying to any production or multi-tenant environment.

---

## 2. Security Vulnerabilities (Code Level)

### [SEC-01] High: Missing `branchId` Query Validation Leads to Cross-Tenant Data Leak (IDOR)

- **Affected Files:**
  - `apps/backend/src/common/services/branch-access.service.ts`
  - `apps/backend/src/modules/customers/customers.controller.ts`
  - All controllers consuming `@Query('branchId') branchId: string` without validation pipes.
- **Vulnerability Mechanics:**
  In `BranchAccessService.assertAccess(restaurantId, branchId)`:
  ```typescript
  async assertAccess(restaurantId: string, branchId: string): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, restaurantId },
      select: { id: true },
    });
    if (!branch) {
      throw new ForbiddenException('Branch not found or not accessible');
    }
  }
  ```
  1. When an authenticated request omits `?branchId=` (e.g. `GET /api/v1/customers`), `branchId` is passed as `undefined`.
  2. In Prisma ORM, passing `{ id: undefined, restaurantId }` strips the `id` key from the generated SQL query (`where: { restaurantId }`).
  3. Since the caller belongs to a valid restaurant with at least one branch, `findFirst` returns the first branch and **access validation passes**.
  4. Next, `customersService.list(branchId, search)` executes:
     ```typescript
     this.prisma.customer.findMany({ where: { branchId: undefined, ... } });
     ```
  5. Prisma strips `branchId: undefined` again! The query executes without any branch or tenant filter:
     ```sql
     SELECT * FROM "Customer" ORDER BY "createdAt" DESC;
     ```
  6. **Impact:** Any authenticated user from any tenant can dump customer PII (names, phone numbers, emails, addresses, loyalty balances) across every restaurant in the entire database.
- **Defensive Remediation:**
  Update `apps/backend/src/common/services/branch-access.service.ts`:
  ```typescript
  import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
  import { PrismaService } from '../../prisma/prisma.service';

  @Injectable()
  export class BranchAccessService {
    constructor(private readonly prisma: PrismaService) {}

    async assertAccess(restaurantId: string, branchId: string): Promise<void> {
      if (!branchId || typeof branchId !== 'string' || branchId.trim() === '') {
        throw new BadRequestException('branchId query parameter is required and cannot be empty');
      }
      const branch = await this.prisma.branch.findFirst({
        where: { id: branchId.trim(), restaurantId },
        select: { id: true },
      });
      if (!branch) {
        throw new ForbiddenException('Branch not found or not accessible');
      }
    }
  }
  ```

---

### [SEC-02] Medium: In-Memory Rate Limiting for TOTP / 2FA Guesses

- **Affected File:** `apps/backend/src/auth/two-factor.service.ts`
- **Line:** Line 38
  ```typescript
  private readonly failures = new Map<string, { count: number; until: number }>();
  ```
- **Vulnerability Mechanics:**
  Failed TOTP and recovery-code attempts are tracked inside an in-memory `Map` instance on the NestJS singleton.
- **Risk Impact:**
  - Any server reboot, crash, or deployment immediately resets all lockouts and failed attempt counters.
  - In a clustered or multi-container environment (e.g., horizontal scaling behind a reverse proxy), requests hit different worker nodes, allowing an attacker to bypass the 5-attempt brute-force limit against 6-digit TOTP codes (only 1,000,000 potential combinations).
- **Defensive Remediation:**
  Store failed 2FA attempts directly in the database (`User` model schema: `failedTwoFactorAttempts: Int @default(0)`, `twoFactorLockedUntil: DateTime?`), or inside a shared Redis key-value store with TTL.

---

### [SEC-03] Medium: Lack of Server-Side JWT Invalidation on Logout

- **Affected File:** `apps/backend/src/auth/auth.service.ts` & `auth.controller.ts`
- **Vulnerability Mechanics:**
  Calling `POST /api/v1/auth/logout` only clears the HTTP cookie in the user's browser:
  ```typescript
  res.clearCookie('nodedr_session', ...);
  ```
  The JWT itself is signed with a 12-hour expiration (`JWT_EXPIRES_IN="12h"`). If the JWT token is intercepted or copied before logout, it remains cryptographically valid until the 12-hour period expires.
- **Defensive Remediation:**
  Add a `tokenVersion: Int @default(0)` or `lastLogoutAt: DateTime?` column to the `User` model. Include this timestamp/version in the JWT payload and verify that `payload.tokenVersion === user.tokenVersion` inside `apps/backend/src/auth/jwt.strategy.ts`.

---

### [SEC-04] Low: Swagger API Documentation Exposure Risk

- **Affected File:** `apps/backend/src/main.ts` (lines 122–133)
- **Vulnerability Mechanics:**
  Swagger docs at `/api/docs` are gated behind:
  ```typescript
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true')
  ```
  If self-hosters or deployers forget to set `NODE_ENV=production` in their `.env` file, the entire schema map, DTO structures, and internal endpoints remain unauthenticated and public.
- **Defensive Remediation:**
  Ensure the production deployment templates (`docker-compose.yml`, `.env.example`, and packaging scripts) explicitly default `NODE_ENV=production` and `ENABLE_SWAGGER=false`.

---

## 3. Dependency Security Vulnerabilities (`pnpm audit`)

As of October 2026, `pnpm audit` identifies 13 advisories across transitive dependencies. AI agents should apply the following overrides in the root `package.json`:

| Package | Severity | Advisory ID | Issue | Target Patched Version |
| :--- | :--- | :--- | :--- | :--- |
| `body-parser` | **High** | GHSA-27r3-jxmh-p828 | Denial of Service via trailing bytes after compressed body | `>=2.4.0` |
| `multer` | **High** | GHSA-q7qp-rjg7-q26m | DoS via pending async `fileFilter` after request teardown | `>=2.5.0` |
| `undici` | **High / Mod**| GHSA-xjj6-f33q-929c | DoS via unhandled error on excessive content-encodings & parser leak | `>=7.30.1` |
| `node-forge` | **High** | GHSA-86w9-cpqp-85rv | RSA PKCS#1 v1.5 verification accepts extra nested elements | Needs migration / update |
| `nodemailer` | **Moderate** | GHSA-8c8m-p3m8-cjg8 | Recipient injection in addressparser via comments or semicolons | `>=10.1.4` |
| `fast-uri` | **Mod / Low** | GHSA-xhq7-xmqj-769h | Regular Expression Denial of Service & scheme injection | `>=3.1.9` |

### Recommended Fix in root `package.json`:
Add a `pnpm.overrides` block:
```json
"pnpm": {
  "overrides": {
    "body-parser": ">=2.4.0",
    "multer": ">=2.5.0",
    "undici": ">=7.30.1",
    "nodemailer": ">=10.1.4",
    "fast-uri": ">=3.1.9"
  }
}
```
Then run `pnpm install --no-frozen-lockfile` and verify via `pnpm audit`.

---

## 4. Architectural & Functional Improvements

1. **Split Billing & Multi-Tender Support:**
   - *Current State:* The POS UI calculates equal bill splits for display purposes only.
   - *Improvement:* Implement full transactional split tender (e.g. Table order divided by individual seat items, or partial settlement where Guest A pays \$30 cash and Guest B pays \$50 card).
2. **Offline-Resilient Client Caching (Waiter Tablets):**
   - *Current State:* Terminals require a live connection to the local LAN backend.
   - *Improvement:* Use IndexedDB on the frontend to queue order creations during momentary Wi-Fi drops, synchronizing once LAN reconnects with idempotency keys (`Idempotency-Key` header).
3. **Audio Chimes & Notification Cues for KDS:**
   - *Current State:* Tickets update silently in real time over WebSockets.
   - *Improvement:* In noisy commercial kitchens, a configurable web audio chime on new ticket arrival and cancellation prevents delayed prep times.
4. **Thermal Printer Network Queue & Failover:**
   - *Current State:* Direct ESC/POS network socket to port 9100.
   - *Improvement:* If the primary receipt or KOT printer is offline (out of paper or unreachable), provide automatic failover to a designated secondary printer or trigger a browser print fallback modal.

---

## 5. Personalization & Rebranding Guide

To rebrand this project from **"Nodedr OrderRestro"** to a custom brand, update the following locations:

### A. Code & Metadata References
1. **Root Title & Meta:**
   - `apps/web/app/layout.tsx`: Update `metadata.title` (line 17: `"Nodedr OrderRestro"`).
2. **PWA Manifest:**
   - `apps/web/public/manifest.json`: Change `name` and `short_name`.
3. **Login & Signup Screens:**
   - `apps/web/app/login/page.tsx`: Line 70 (`<h1>Nodedr OrderRestro</h1>`).
   - `apps/web/app/signup/page.tsx`: Line 54.
4. **Sidebar Shell & Fallback:**
   - `apps/web/components/layout/app-shell.tsx`: Line 50 (fallback brand name).
   - `apps/web/components/layout/brand-footer.tsx`: Remove or replace links to `orderrestro.nodedr.com` and brand credit.
5. **Backend Swagger Title:**
   - `apps/backend/src/main.ts`: Line 126 (`setTitle`, `setDescription`).
6. **Documentation & Compliance Pages:**
   - `apps/web/app/docs/**`: Update or replace product documentation.

### B. Logo & Icon Image Assets
Replace the image files in `apps/web/public/`:
- `apps/web/public/logo.png` (Square icon, 512x512 PNG)
- `apps/web/public/brand-lockup.png` (Horizontal brand lockup with logotype)
- `apps/web/public/icons/favicon-32.png`
- `apps/web/public/icons/icon-192.png`
- `apps/web/public/icons/icon-512.png`
- `apps/web/public/icons/icon-512-maskable.png`

### C. Color Theme
- Edit `apps/web/app/globals.css`.
- The current primary color is a deep rose/crimson (`#9f1239` / OKLCH format). Replace the CSS variables `--primary`, `--primary-foreground`, and `--ring` to change the entire application accent color.

### D. In-App White-Labeling (Settings Page)
- Once logged in at `/settings`, update:
  - **Restaurant Name & Legal Name**
  - **Restaurant Logo** (uploaded to `/api/uploads/`, immediately replaces header mark)
  - **Receipt Header/Footer, GSTIN, Address & Contact Details**

---

## 6. Local setup

Use the sanitized instructions in README.md and docs/deployment.md. Real database credentials and JWT secrets must be configured in ignored environment files, never in documentation. Earlier local values were removed during Tablevora launch preparation.

## 7. Tablevora remediation

This is the original discovery report. See TABLEVORA-RELEASE.md for current fixes and verification. Feature recommendations above are historical and must be reconciled with current code before implementation.
