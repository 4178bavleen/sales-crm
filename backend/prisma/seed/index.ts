
import { createAdmin } from './admin.seed.js'
import { seedRoles } from './role.seed.js'
import {seedPermissions} from './permission.seed.js'

import { prisma } from '../../src/config/database.js'

async function main(): Promise<void> {
  console.log('🌱 Starting database seed...')

 
  await createAdmin()
  await seedRoles()
  await seedPermissions()

  console.log('✅ Database seed completed.')
}

main()
  .catch((error: unknown) => {
    console.error('❌ Database seeding failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })