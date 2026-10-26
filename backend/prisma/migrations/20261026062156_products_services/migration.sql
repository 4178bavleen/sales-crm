/*
  Warnings:

  - You are about to alter the column `name` on the `products_services` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.

*/
-- AlterTable
ALTER TABLE "products_services" ALTER COLUMN "name" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "updatedAt" DROP DEFAULT;
