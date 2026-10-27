CREATE TABLE "platform_admin_invites" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_admin_invites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "platform_admin_invites_tokenHash_key" ON "platform_admin_invites"("tokenHash");
CREATE INDEX "platform_admin_invites_ownerId_expiresAt_idx" ON "platform_admin_invites"("ownerId", "expiresAt");
ALTER TABLE "platform_admin_invites" ADD CONSTRAINT "platform_admin_invites_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_admin_invites" ADD CONSTRAINT "platform_admin_invites_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
