-- CreateTable
CREATE TABLE IF NOT EXISTS "whatsapp_settings" (
    "id" SERIAL NOT NULL,
    "phoneNumberId" TEXT NOT NULL DEFAULT '',
    "wabaId" TEXT NOT NULL DEFAULT '',
    "accessToken" TEXT NOT NULL DEFAULT '',
    "templateName" TEXT NOT NULL DEFAULT 'crm_alert_notification',
    "templateLanguage" TEXT NOT NULL DEFAULT 'en_US',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notifyDeals" BOOLEAN NOT NULL DEFAULT true,
    "notifyDocuments" BOOLEAN NOT NULL DEFAULT true,
    "notifyTargets" BOOLEAN NOT NULL DEFAULT true,
    "notifyFollowUps" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_settings_pkey" PRIMARY KEY ("id")
);
