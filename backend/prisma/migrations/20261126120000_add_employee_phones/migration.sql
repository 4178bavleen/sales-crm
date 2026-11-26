-- CreateTable
CREATE TABLE IF NOT EXISTS "employee_phones" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "countryCode" TEXT NOT NULL,
    "dialCode" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "label" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_phones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "employee_phones_userId_idx" ON "employee_phones"("userId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'employee_phones_userId_fkey'
    ) THEN
        ALTER TABLE "employee_phones" ADD CONSTRAINT "employee_phones_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
