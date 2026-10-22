
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '../../src/config/database.js'

export async function createAdmin(): Promise<void> {
  const name = process.env.ADMIN_NAME
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD

  if (!name || !email || !password) {
    throw new Error(
      'Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in your .env file.',
    )
  }

  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Admin password must be at most 72 bytes.')
  }

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'System administrator',
    },
  })

  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    console.log(`A user with email ${email} already exists.`)
    console.log('No user details or password were changed.')
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      roleId: adminRole.id,
      isActive: true,
    },
  })

  console.log(`Admin account created successfully for ${email}.`)
}
