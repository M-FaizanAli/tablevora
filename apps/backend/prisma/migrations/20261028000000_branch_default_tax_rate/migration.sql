ALTER TABLE "branches"
  ADD COLUMN "defaultTaxRatePercent" DECIMAL(6,3) NOT NULL DEFAULT 0;

ALTER TABLE "menu_items" ALTER COLUMN "taxRatePercent" TYPE DECIMAL(6,3);
ALTER TABLE "modifiers" ALTER COLUMN "taxRatePercent" TYPE DECIMAL(6,3);
ALTER TABLE "order_items" ALTER COLUMN "taxRateSnapshot" TYPE DECIMAL(6,3);
