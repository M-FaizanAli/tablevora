CREATE TYPE "RestaurantLifecycleStatus" AS ENUM ('PENDING', 'ACTIVE', 'READ_ONLY', 'DECLINED');

ALTER TABLE "restaurants"
  ADD COLUMN "status" "RestaurantLifecycleStatus" NOT NULL DEFAULT 'ACTIVE';
CREATE INDEX "restaurants_status_createdAt_idx" ON "restaurants"("status", "createdAt");

CREATE TABLE "platform_admins" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "tokenVersion" INTEGER NOT NULL DEFAULT 0,
  "twoFactorSecret" TEXT,
  "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  "twoFactorRecoveryHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "twoFactorLastStep" INTEGER,
  "failedTwoFactorAttempts" INTEGER NOT NULL DEFAULT 0,
  "twoFactorLockedUntil" TIMESTAMP(3),
  "bootstrapChallengeHash" TEXT,
  "bootstrapChallengeUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");

CREATE TABLE "platform_admin_audits" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "restaurantId" TEXT,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_admin_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "platform_admin_audits_restaurantId_createdAt_idx"
  ON "platform_admin_audits"("restaurantId", "createdAt");
CREATE INDEX "platform_admin_audits_action_createdAt_idx"
  ON "platform_admin_audits"("action", "createdAt");
ALTER TABLE "platform_admin_audits"
  ADD CONSTRAINT "platform_admin_audits_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
