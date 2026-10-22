
import { prisma } from '../../src/config/database.js'

const roles = [
  { name: 'ADMIN', description: 'Full system administration' },
  { name: 'SALES_MANAGER', description: 'Sales team management' },
  { name: 'SALES_EMPLOYEE', description: 'Sales operations' },
  { name: 'REPORT_VIEWER', description: 'Read-only reporting access' },
]

const permissionDefinitions = [
  ['dashboard.view', 'View dashboard'],
  ['leads.view', 'View leads'],
  ['leads.create', 'Create leads'],
  ['leads.edit', 'Edit leads'],
  ['leads.delete', 'Delete leads'],
  ['leads.assign', 'Assign leads'],
  ['contacts.view', 'View contacts'],
  ['contacts.create', 'Create contacts'],
  ['contacts.edit', 'Edit contacts'],
  ['contacts.delete', 'Delete contacts'],
  ['companies.view', 'View companies'],
  ['companies.create', 'Create companies'],
  ['companies.edit', 'Edit companies'],
  ['companies.delete', 'Delete companies'],
  ['deals.view', 'View deals'],
  ['deals.create', 'Create deals'],
  ['deals.edit', 'Edit deals'],
  ['deals.delete', 'Delete deals'],
  ['tasks.view', 'View tasks'],
  ['tasks.create', 'Create tasks'],
  ['tasks.edit', 'Edit tasks'],
  ['tasks.delete', 'Delete tasks'],
  ['meetings.view', 'View meetings'],
  ['meetings.create', 'Create meetings'],
  ['meetings.edit', 'Edit meetings'],
  ['meetings.delete', 'Delete meetings'],
  ['reports.view', 'View reports'],
  ['reports.export', 'Export reports'],
  ['users.view', 'View users'],
  ['users.create', 'Create users'],
  ['users.edit', 'Edit users'],
  ['users.deactivate', 'Deactivate users'],
  ['permissions.view', 'View roles and permissions'],
  ['permissions.manage', 'Manage role permissions'],
] as const

export async function seedPermissions() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    })
  }

  for (const [code, description] of permissionDefinitions) {
    await prisma.permission.upsert({
      where: { code },
      update: { description },
      create: { code, description },
    })
  }

  const admin = await prisma.role.findUniqueOrThrow({
    where: { name: 'ADMIN' },
    select: { id: true },
  })

  const permissions = await prisma.permission.findMany({
    select: { id: true },
  })

  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({
      roleId: admin.id,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  })

  console.log(`✅ Seeded ${permissionDefinitions.length} permissions.`)
}
