DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmploymentType') THEN
        CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Gender') THEN
        CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MaritalStatus') THEN
        CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceStatus') THEN
        CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE', 'WEEKEND', 'HOLIDAY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeaveType') THEN
        CREATE TYPE "LeaveType" AS ENUM ('CASUAL', 'SICK', 'EARNED', 'UNPAID', 'MATERNITY', 'PATERNITY', 'COMP_OFF', 'OTHER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeaveStatus') THEN
        CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayrollStatus') THEN
        CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PROCESSED', 'PAID', 'CANCELLED');
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "hr_departments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "headUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "hr_designations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" INTEGER,
    "level" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_designations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "employee_profiles" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "employeeCode" TEXT,
    "departmentId" INTEGER,
    "designationId" INTEGER,
    "managerId" INTEGER,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "workLocation" TEXT,
    "shiftStart" TEXT,
    "shiftEnd" TEXT,
    "dateOfBirth" DATE,
    "gender" "Gender",
    "maritalStatus" "MaritalStatus",
    "nationality" TEXT,
    "bloodGroup" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT DEFAULT 'IN',
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankIfscCode" TEXT,
    "taxId" TEXT,
    "salary" DECIMAL(14,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "hr_attendance" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "workingMinutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "hr_leave_requests" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "hr_payroll_records" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "basic" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "allowances" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "grossPay" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_payroll_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "hr_employee_documents" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "filePath" TEXT,
    "issuedAt" DATE,
    "expiresAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "hr_departments_name_key" ON "hr_departments"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "hr_designations_name_key" ON "hr_designations"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "employee_profiles_userId_key" ON "employee_profiles"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "employee_profiles_employeeCode_key" ON "employee_profiles"("employeeCode");
CREATE INDEX IF NOT EXISTS "employee_profiles_departmentId_idx" ON "employee_profiles"("departmentId");
CREATE INDEX IF NOT EXISTS "employee_profiles_designationId_idx" ON "employee_profiles"("designationId");
CREATE INDEX IF NOT EXISTS "employee_profiles_managerId_idx" ON "employee_profiles"("managerId");
CREATE INDEX IF NOT EXISTS "hr_designations_departmentId_idx" ON "hr_designations"("departmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "hr_attendance_userId_date_key" ON "hr_attendance"("userId", "date");
CREATE INDEX IF NOT EXISTS "hr_attendance_date_idx" ON "hr_attendance"("date");
CREATE INDEX IF NOT EXISTS "hr_leave_requests_userId_status_idx" ON "hr_leave_requests"("userId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "hr_payroll_records_userId_periodStart_periodEnd_key" ON "hr_payroll_records"("userId", "periodStart", "periodEnd");
CREATE INDEX IF NOT EXISTS "hr_payroll_records_status_idx" ON "hr_payroll_records"("status");
CREATE INDEX IF NOT EXISTS "hr_employee_documents_userId_idx" ON "hr_employee_documents"("userId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_departments_headUserId_fkey') THEN
        ALTER TABLE "hr_departments" ADD CONSTRAINT "hr_departments_headUserId_fkey"
        FOREIGN KEY ("headUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_designations_departmentId_fkey') THEN
        ALTER TABLE "hr_designations" ADD CONSTRAINT "hr_designations_departmentId_fkey"
        FOREIGN KEY ("departmentId") REFERENCES "hr_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_profiles_userId_fkey') THEN
        ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_profiles_departmentId_fkey') THEN
        ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_departmentId_fkey"
        FOREIGN KEY ("departmentId") REFERENCES "hr_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_profiles_designationId_fkey') THEN
        ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_designationId_fkey"
        FOREIGN KEY ("designationId") REFERENCES "hr_designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_profiles_managerId_fkey') THEN
        ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_managerId_fkey"
        FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_attendance_userId_fkey') THEN
        ALTER TABLE "hr_attendance" ADD CONSTRAINT "hr_attendance_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_leave_requests_userId_fkey') THEN
        ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_leave_requests_approvedById_fkey') THEN
        ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_approvedById_fkey"
        FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_payroll_records_userId_fkey') THEN
        ALTER TABLE "hr_payroll_records" ADD CONSTRAINT "hr_payroll_records_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_employee_documents_userId_fkey') THEN
        ALTER TABLE "hr_employee_documents" ADD CONSTRAINT "hr_employee_documents_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
