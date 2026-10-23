import { createAdmin } from './admin.seed.js'
import { seedRoles } from './role.seed.js'
import { seedPermissions } from './permission.seed.js'
import { seedTargets } from './target.seed.js'
import { seedLeadSources } from './leadSource.seed.js'
import { seedPipelineStages } from './pipelineStage.seed.js'
import { prisma } from '../../src/config/database.js'

async function main(): Promise<void> {
  console.log('🌱 Starting database seed...')

  await seedRoles()
  await seedPermissions()
  await createAdmin()
  await seedTargets()

  console.log('🌱 Seeding lead sources...')
  await seedLeadSources()

  console.log('🌱 Seeding pipeline stages...')
  await seedPipelineStages()

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