-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_noFollowUpReasonId_fkey";

-- AlterTable
ALTER TABLE "leads" DROP COLUMN IF EXISTS "noFollowUpReasonId",
ADD COLUMN IF NOT EXISTS "noFollowUpNote" TEXT;
