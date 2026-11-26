-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN     "hsnCode" VARCHAR(50);

-- AlterTable
ALTER TABLE "products_services" ADD COLUMN     "hsnCode" VARCHAR(50);

-- CreateIndex
CREATE INDEX "products_services_hsnCode_idx" ON "products_services"("hsnCode");
