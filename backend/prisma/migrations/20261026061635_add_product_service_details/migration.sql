-- Create the enum type for products and services
CREATE TYPE "ProductServiceType" AS ENUM ('PRODUCT', 'SERVICE');

-- Add the new fields to the existing table
ALTER TABLE "products_services"
ADD COLUMN "description" TEXT,
ADD COLUMN "type" "ProductServiceType" NOT NULL DEFAULT 'PRODUCT',
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add the index
CREATE INDEX "products_services_type_isActive_idx"
ON "products_services"("type", "isActive");