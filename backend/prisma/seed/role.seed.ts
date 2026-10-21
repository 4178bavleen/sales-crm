import { prisma } from '../../src/config/database.js'

const roles = [
  {
    name: 'ADMIN',
    description: 'Full system administration access',
  },
  {
    name: 'SALES_MANAGER',
    description: 'Manages sales team, leads, deals and targets',
  },
  {
    name: 'SALES_EMPLOYEE',
    description: 'Manages assigned leads, contacts, deals and follow-ups',
  },
  {
    name: 'REPORT_VIEWER',
    description: 'Read-only access to permitted reports',
  },
]

export async function seedRoles(): Promise<void> {
  console.log('🌱 Seeding roles...')

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        description: role.description,
      },
      create: role,
    })
  }

  console.log('✅ Roles seeded successfully.')
}