# Tablevora API

NestJS API with Prisma/PostgreSQL and Socket.IO. See the root README and `docs/deployment.md` for setup and deployment. Build `@nodedr-restaurant/types` first, generate the Prisma client, apply all migrations, then build the API.

Run `pnpm test --runInBand` in this directory. Certificate tests use the system OpenSSL command. PostgreSQL integration tests additionally require `VERIFACTU_TEST_DATABASE_URL` pointing to a disposable, migrated database.
