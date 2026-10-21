
import bcrypt from 'bcryptjs'
import { prisma } from '../../config/database.js'
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

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        phone: input.phone,
        roleId: role.id,
    
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        role: { select: { id: true, name: true } },

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
        createdAt: true,
        updatedAt: true,
        role: { select: { id: true, name: true } },
       
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
      createdAt: true,
      updatedAt: true,
      role: { select: { id: true, name: true } },
  
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
    select: { id: true },
  })

  if (!existingUser) {
    throw new UserServiceError('User not found', 404)
  }

  const data: {
    name?: string
    email?: string
    passwordHash?: string
    phone?: string | null
    roleId?: number
   
    isActive?: boolean
  } = {}

  if (input.name !== undefined) data.name = input.name
  if (input.email !== undefined) data.email = input.email
  if (input.phone !== undefined) data.phone = input.phone
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
    return await prisma.user.update({
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
}

export async function deleteUser(id: number, actorId: number) {
  if (id === actorId) {
    throw new UserServiceError('You cannot delete your own account', 400)
  }

  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
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

  return { id, deleted: true }
}
