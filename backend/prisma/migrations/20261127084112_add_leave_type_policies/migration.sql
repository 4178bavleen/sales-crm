-- CreateEnum
CREATE TYPE "LeaveAccrualPeriod" AS ENUM ('YEARLY', 'HALF_YEARLY', 'QUARTERLY', 'MONTHLY');

-- AlterTable (Safely cast existing leaveType to TEXT without data loss)
ALTER TABLE "hr_leave_requests" ADD COLUMN "policyId" INTEGER;
ALTER TABLE "hr_leave_requests" ALTER COLUMN "leaveType" TYPE TEXT USING "leaveType"::text;

-- CreateTable
CREATE TABLE "leave_type_policies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "quota" DECIMAL(5,1) NOT NULL DEFAULT 12.0,
    "period" "LeaveAccrualPeriod" NOT NULL DEFAULT 'YEARLY',
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "requiresDocument" BOOLEAN NOT NULL DEFAULT false,
    "documentDescription" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_type_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leave_type_policies_name_key" ON "leave_type_policies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "leave_type_policies_code_key" ON "leave_type_policies"("code");

-- CreateIndex
CREATE INDEX "hr_leave_requests_policyId_idx" ON "hr_leave_requests"("policyId");

-- AddForeignKey
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "leave_type_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
