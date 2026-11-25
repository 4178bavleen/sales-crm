-- CreateTable
CREATE TABLE IF NOT EXISTS "facebook_settings" (
    "id" SERIAL NOT NULL,
    "appId" TEXT NOT NULL DEFAULT '',
    "appSecret" TEXT NOT NULL DEFAULT '',
    "pageId" TEXT NOT NULL DEFAULT '',
    "pageAccessToken" TEXT NOT NULL DEFAULT '',
    "verifyToken" TEXT NOT NULL DEFAULT '',
    "defaultOwnerId" INTEGER,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notifyOwner" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_settings_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "facebookLeadId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "leads_facebookLeadId_key" ON "leads"("facebookLeadId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'facebook_settings_defaultOwnerId_fkey'
    ) THEN
        ALTER TABLE "facebook_settings" ADD CONSTRAINT "facebook_settings_defaultOwnerId_fkey"
        FOREIGN KEY ("defaultOwnerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
