# AI Agent Guidelines & Context

Welcome to **Nodedr OrderRestro** (Restaurant POS & Management System).

## Key Documentation for AI Agents
- **`ISSUES-REPORT.md`**: Complete report of security vulnerabilities, dependency alerts, architectural improvements, and rebranding guide. **Read this file first before making changes.**
- **`ARCHITECTURE.md`**: Architecture decision records (NestJS + Next.js App Router + Prisma + PostgreSQL + Socket.IO).
- **`FEATURE-CHECKLIST.md`**: 20-module product domain status and roadmap tracking.
- **`SECURITY-AUDIT-REPORT.md`**: Historical security audit report (August 2026).

## Monorepo Layout
- `apps/backend`: NestJS modular backend (port 4001).
- `apps/web`: Next.js 16 (App Router) with Tailwind CSS & shadcn/ui (port 3000 / 1995).
- `packages/types`: Shared TypeScript definitions and Zod validation schemas. Must be built (`pnpm --filter @nodedr-restaurant/types build`) before backend or web can compile.

## Local Development & Testing Runbook
- **Node & pnpm**: Use Node `>=22` and `pnpm`.
- **Database**: PostgreSQL on `localhost:5432` (`nodedr_restaurant`).
- **Build & Test**:
  - Build types: `pnpm --filter @nodedr-restaurant/types build`
  - Build backend: `pnpm --filter @nodedr-restaurant/backend build`
  - Run all tests: `pnpm test`
- **Demo Credentials**:
  - Email: `owner@demo.local`
  - Password: `Password123!`
