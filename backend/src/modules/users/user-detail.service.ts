import { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../../config/database.js'
import { UserServiceError } from './user.service.js'
import type { BankDetailsInput, CompanyDetailsInput, PersonalDetailsInput } from './user-detail.validation.js'

const detailSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  joiningDate: true,
  isActive: true,
  role: { select: { id: true, name: true } },
  employeeProfile: true,
} satisfies Prisma.UserSelect

function parseDate(value?: string | null) {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return new Date(`${value}T00:00:00.000Z`)
}

export async function getUserDetail(userId: number) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: detailSelect,
  })
  if (!user) throw new UserServiceError('User not found', 404)
  return user
}

async function ensureUser(userId: number) {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true, email: true } })
  if (!user) throw new UserServiceError('User not found', 404)
  return user
}

export async function updatePersonalDetails(userId: number, input: PersonalDetailsInput) {
  await ensureUser(userId)
  const email = input.email.toLowerCase()
  const existing = await prisma.user.findFirst({ where: { email, NOT: { id: userId }, deletedAt: null }, select: { id: true } })
  if (existing) throw new UserServiceError('Email is already in use', 409)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { name: input.fullName, email, phone: input.mobileNumber || null },
    }),
    prisma.employeeProfile.upsert({
      where: { userId },
      create: {
        userId,
        fatherName: input.fatherName || null,
        emergencyMobile: input.emergencyMobileNumber || null,
        aadharNumber: input.aadharNumber || null,
        panNumber: input.panNumber || null,
        bloodGroup: input.bloodGroup || null,
        dateOfBirth: parseDate(input.dateOfBirth) as any,
        state: input.state || null,
        city: input.city || null,
        permanentAddress: input.permanentAddress || null,
      },
      update: {
        fatherName: input.fatherName || null,
        emergencyMobile: input.emergencyMobileNumber || null,
        aadharNumber: input.aadharNumber || null,
        panNumber: input.panNumber || null,
        bloodGroup: input.bloodGroup || null,
        dateOfBirth: parseDate(input.dateOfBirth) as any,
        state: input.state || null,
        city: input.city || null,
        permanentAddress: input.permanentAddress || null,
      },
    }),
  ])
  return getUserDetail(userId)
}

export async function updateBankDetails(userId: number, input: BankDetailsInput) {
  await ensureUser(userId)
  await prisma.employeeProfile.upsert({
    where: { userId },
    create: {
      userId,
      bankName: input.bankName || null,
      bankAccountNumber: input.accountNumber || null,
      bankIfscCode: input.ifscCode || null,
    },
    update: {
      bankName: input.bankName || null,
      bankAccountNumber: input.accountNumber || null,
      bankIfscCode: input.ifscCode || null,
    },
  })
  return getUserDetail(userId)
}

export async function updateCompanyDetails(userId: number, input: CompanyDetailsInput) {
  await ensureUser(userId)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { joiningDate: parseDate(input.joiningDate) as any },
    }),
    prisma.employeeProfile.upsert({
      where: { userId },
      create: {
        userId,
        employeeCode: input.employeeCode || null,
        designationTitle: input.designation || null,
        officialMail: input.officialMail || null,
        laptopOrMobile: input.laptopOrMobile || null,
        employmentType: (input.employmentType as any) ?? undefined,
        employmentStatus: (input.employmentStatus as any) ?? undefined,
        assignedClient: input.assignedClient || null,
        workAssigned: input.workAssigned || null,
        lastWorkingDate: parseDate(input.lastWorkingDate) as any,
        handoverName: input.handoverName || null,
        handoverDate: parseDate(input.handoverDate) as any,
      },
      update: {
        employeeCode: input.employeeCode || null,
        designationTitle: input.designation || null,
        officialMail: input.officialMail || null,
        laptopOrMobile: input.laptopOrMobile || null,
        ...(input.employmentType ? { employmentType: input.employmentType as any } : {}),
        ...(input.employmentStatus ? { employmentStatus: input.employmentStatus as any } : {}),
        assignedClient: input.assignedClient || null,
        workAssigned: input.workAssigned || null,
        lastWorkingDate: parseDate(input.lastWorkingDate) as any,
        handoverName: input.handoverName || null,
        handoverDate: parseDate(input.handoverDate) as any,
      },
    }),
  ])
  return getUserDetail(userId)
}

export async function updateEmployeeAvatar(userId: number, filePath: string | null) {
  await ensureUser(userId)
  await prisma.employeeProfile.upsert({
    where: { userId },
    create: { userId, avatarPath: filePath },
    update: { avatarPath: filePath },
  })
  return getUserDetail(userId)
}

export async function updateEmployeeIdCard(userId: number, filePath: string | null, fileName: string | null) {
  await ensureUser(userId)
  await prisma.employeeProfile.upsert({
    where: { userId },
    create: { userId, idCardPath: filePath, idCardName: fileName },
    update: { idCardPath: filePath, idCardName: fileName },
  })
  return getUserDetail(userId)
}
