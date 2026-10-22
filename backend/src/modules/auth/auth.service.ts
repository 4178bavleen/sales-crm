import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../config/database.js'
import { env } from '../../config/env.js'
import { AppError } from '../../common/errors/AppErrors.js'
import type { LoginInput } from './auth.validation.js'

const ACCESS_TOKEN_EXPIRY = '7h'

export class AuthError extends AppError {
  constructor(message: string, statusCode: number) {
    super(statusCode, message)
    this.name = 'AuthError'
  }
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { role: true },
  })

  // Use the same response for unknown emails and incorrect passwords.
  if (!user || !user.isActive || user.deletedAt) {
    throw new AuthError('Invalid email or password', 401)
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  )

  if (!passwordMatches) {
    throw new AuthError('Invalid email or password', 401)
  }

  const token = jwt.sign(
    { sub: String(user.id) },
    env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  )

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role.name,
    },
  }
}

export async function getUserProfile(userId: number) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true,
      deletedAt: null,
    },
    include: { role: true },
  })

  if (!user) {
    throw new AuthError('User not found or inactive', 401)
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role.name,
  }
}