import { z } from 'zod'

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
  .refine((value) => {
    const d = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
  }, 'Enter a valid calendar date')

const optDate = dateSchema.nullable().optional().or(z.literal('').transform(() => null))
const optStr = (max = 255) =>
  z.string().trim().max(max).optional().nullable().or(z.literal('').transform(() => null))

export const userDetailIdSchema = z.coerce.number().int().positive()

export const personalDetailsSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  fatherName: optStr(100),
  mobileNumber: optStr(30),
  emergencyMobileNumber: optStr(30),
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  aadharNumber: optStr(30),
  panNumber: optStr(20),
  bloodGroup: optStr(10),
  dateOfBirth: optDate,
  state: optStr(100),
  city: optStr(100),
  permanentAddress: optStr(1000),
})

export const bankDetailsSchema = z.object({
  bankName: optStr(150),
  accountNumber: optStr(50),
  ifscCode: optStr(20),
})

export const companyDetailsSchema = z.object({
  employeeCode: optStr(50),
  designation: optStr(100),
  joiningDate: optDate,
  officialMail: z.string().trim().email().max(254).transform((v) => v.toLowerCase()).nullable().optional().or(z.literal('').transform(() => null)),
  laptopOrMobile: optStr(255),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).optional(),
  employmentStatus: z.enum(['ACTIVE', 'PROBATION', 'ON_LEAVE', 'NOTICE_PERIOD', 'RESIGNED', 'TERMINATED', 'INACTIVE']).optional(),
  assignedClient: optStr(255),
  workAssigned: optStr(2000),
  lastWorkingDate: optDate,
  handoverName: optStr(100),
  handoverDate: optDate,
})

export type PersonalDetailsInput = z.infer<typeof personalDetailsSchema>
export type BankDetailsInput = z.infer<typeof bankDetailsSchema>
export type CompanyDetailsInput = z.infer<typeof companyDetailsSchema>
