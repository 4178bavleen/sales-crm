
import bcrypt from 'bcryptjs'
import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { logAudit } from '../audit/audit.service.js'
import type {
  CreateUserInput,
  ListUsersInput,
  UpdateUserInput,
} from './user.validation.js'

export class UserServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message)
    this.name = 'UserServiceError'
  }
}

const employeePhoneSelect = {
  orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
  select: {
    id: true,
    countryCode: true,
    dialCode: true,
    number: true,
    label: true,
    isPrimary: true,
  },
} satisfies Prisma.EmployeePhoneFindManyArgs

type EmployeePhoneInput = NonNullable<CreateUserInput['phones']>[number]

function formatEmployeePhone(phone: EmployeePhoneInput): string {
  return `${phone.dialCode}${phone.number.replace(/\s+/g, '')}`
}

function parseJoiningDate(value?: string | null): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null
}

async function syncEmployeePhones(
  userId: number,
  phones?: EmployeePhoneInput[],
): Promise<void> {
  if (!phones) return

  const entries = phones
    .map((phone, index) => ({
      countryCode: phone.countryCode.toUpperCase(),
      dialCode: phone.dialCode,
      number: phone.number.trim(),
      label: phone.label?.trim() || null,
      isPrimary: phones.some((item) => item.isPrimary)
        ? Boolean(phone.isPrimary)
        : index === 0,
    }))
    .filter((phone) => phone.number.length > 0)

  const primary = entries.find((phone) => phone.isPrimary) ?? entries[0]
  if (primary) primary.isPrimary = true

  await prisma.$transaction([
    prisma.employeePhone.deleteMany({ where: { userId } }),
    ...(entries.length > 0
      ? [
          prisma.employeePhone.createMany({
            data: entries.map((phone) => ({ ...phone, userId })),
          }),
        ]
      : []),
    prisma.user.update({
      where: { id: userId },
      data: { phone: primary ? formatEmployeePhone(primary) : null },
    }),
  ])
}

export async function createUser(input: CreateUserInput) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  })

  if (existingUser) {
    throw new UserServiceError('A user with this email already exists', 409)
  }

  const role = await prisma.role.findUnique({
    where: { name: input.roleName },
  })

  if (!role) {
    throw new UserServiceError(
      `Role ${input.roleName} does not exist. Run the role seeder first.`,
      400,
    )
  }


  const passwordHash = await bcrypt.hash(input.password, 12)
  const primaryPhone = input.phones?.find((phone) => phone.isPrimary) ?? input.phones?.[0]

  let createdUserId: number
  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        phone: primaryPhone ? formatEmployeePhone(primaryPhone) : input.phone,
        joiningDate: parseJoiningDate(input.joiningDate),
        roleId: role.id,

        isActive: true,
      },
      select: { id: true },
    })

    void logAudit({
      action: 'CREATE',
      entityType: 'USER',
      entityId: user.id,
      after: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role?.name,
      },
    })

    return user
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new UserServiceError(
        'A user with this email already exists',
        409,
      )
    }

    throw error
  }

  await syncEmployeePhones(createdUserId, input.phones)
  return getUserById(createdUserId)
}

export async function getUsers(input: ListUsersInput) {
  const { page, limit } = input
  const search = input.search?.trim()

  const where = {
    deletedAt: null,
    ...(input.roleName ? { role: { name: input.roleName } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
            {
              phones: {
                some: { number: { contains: search, mode: 'insensitive' as const } },
              },
            },
          ],
        }
      : {}),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        joiningDate: true,
        createdAt: true,
        updatedAt: true,
        role: { select: { id: true, name: true } },
        phones: employeePhoneSelect,
      },
    }),
    prisma.user.count({ where }),
  ])

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function getUserById(id: number) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      joiningDate: true,
      createdAt: true,
      updatedAt: true,
      role: { select: { id: true, name: true } },
      phones: employeePhoneSelect,
    },
  })

  if (!user) {
    throw new UserServiceError('User not found', 404)
  }

  return user
}

export async function updateUser(id: number, input: UpdateUserInput) {
  const existingUser = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, email: true, phone: true, isActive: true, roleId: true },
  })

  if (!existingUser) {
    throw new UserServiceError('User not found', 404)
  }

  const data: {
    name?: string
    email?: string
    passwordHash?: string
    phone?: string | null
    joiningDate?: Date | null
    roleId?: number

    isActive?: boolean
  } = {}

  if (input.name !== undefined) data.name = input.name
  if (input.email !== undefined) data.email = input.email
  if (input.phone !== undefined) data.phone = input.phone
  if (input.joiningDate !== undefined) {
    data.joiningDate = parseJoiningDate(input.joiningDate)
  }
  if (input.isActive !== undefined) data.isActive = input.isActive
 

  if (input.password !== undefined) {
    data.passwordHash = await bcrypt.hash(input.password, 12)
  }

  if (input.roleName !== undefined) {
    const role = await prisma.role.findUnique({
      where: { name: input.roleName },
      select: { id: true },
    })

    if (!role) {
      throw new UserServiceError('Selected role not found', 400)
    }

    data.roleId = role.id
  }



  try {
    await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        role: { select: { id: true, name: true } },
    
      },
    })

    void logAudit({
      action: 'UPDATE',
      entityType: 'USER',
      entityId: updated.id,
      before: {
        name: existingUser.name,
        email: existingUser.email,
        phone: existingUser.phone,
        isActive: existingUser.isActive,
      },
      after: {
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        isActive: updated.isActive,
        role: updated.role?.name,
      },
    })

    return updated
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new UserServiceError('Email is already in use', 409)
    }

    throw error
  }

  await syncEmployeePhones(id, input.phones)
  return getUserById(id)
}

export async function deleteUser(id: number, actorId: number) {
  if (id === actorId) {
    throw new UserServiceError('You cannot delete your own account', 400)
  }

  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, email: true },
  })

  if (!user) {
    throw new UserServiceError('User not found', 404)
  }

  await prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  })

  void logAudit({
    actorId,
    action: 'DELETE',
    entityType: 'USER',
    entityId: id,
    before: { id: user.id, name: user.name, email: user.email },
  })

  return { id, deleted: true }
}
