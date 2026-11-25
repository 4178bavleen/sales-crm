-- AlterEnum
ALTER TYPE "ProposalStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL' BEFORE 'SENT';
ALTER TYPE "ProposalStatus" ADD VALUE IF NOT EXISTS 'APPROVED' BEFORE 'SENT';

-- AlterTable
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "submittedForApprovalAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "approvedById" INTEGER,
ADD COLUMN IF NOT EXISTS "approvalNote" TEXT;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'proposals_approvedById_fkey'
    ) THEN
        ALTER TABLE "proposals" ADD CONSTRAINT "proposals_approvedById_fkey"
        FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
