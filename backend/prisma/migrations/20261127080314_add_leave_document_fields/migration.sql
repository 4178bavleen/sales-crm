-- AlterTable
ALTER TABLE "hr_leave_requests" ADD COLUMN     "documentName" TEXT,
ADD COLUMN     "documentPath" TEXT,
ADD COLUMN     "documentType" TEXT,
ADD COLUMN     "rejectionReason" TEXT;
