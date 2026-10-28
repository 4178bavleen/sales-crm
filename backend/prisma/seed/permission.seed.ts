import { PrismaClient } from '../../src/generated/prisma/client.js'
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const roles = [
  { name: 'ADMIN', description: 'Full system administration' },
  { name: 'SALES_MANAGER', description: 'Sales team management' },
  { name: 'SALES_EMPLOYEE', description: 'Sales operations' },
  { name: 'REPORT_VIEWER', description: 'Read-only reporting access' },
]

const permissions = [
  ['users.view', 'View users'],
  ['users.create', 'Create users'],
  ['users.edit', 'Edit users'],
  ['users.delete', 'Delete users'],
  ['roles.view', 'View roles and permissions'],
  ['roles.manage', 'Manage roles and permissions'],
  ['leads.view', 'View leads'],
  ['leads.create', 'Create leads'],
  ['leads.edit', 'Edit leads'],
  ['leads.delete', 'Delete leads'],
  ['leads.import', 'Import leads'],
  ['leads.export', 'Export leads'],
  ['deals.view', 'View deals and pipelines'],
  ['deals.create', 'Create deals'],
  ['deals.edit', 'Edit deals'],
  ['deals.delete', 'Delete deals'],
  ['deals.move', 'Move deals between stages'],
  ['contacts.view', 'View contacts'],
  ['contacts.create', 'Create contacts'],
  ['contacts.edit', 'Edit contacts'],
  ['contacts.delete', 'Delete contacts'],
  ['tasks.view', 'View tasks'],
  ['tasks.create', 'Create tasks'],
  ['tasks.edit', 'Edit tasks'],
  ['tasks.delete', 'Delete tasks'],
  ['activities.view', 'View activities'],
  ['activities.create', 'Create activities'],
  ['targets.view', 'View sales targets'],
  ['targets.create', 'Create sales targets'],
  ['targets.edit', 'Edit sales targets'],
  ['targets.delete', 'Delete sales targets'],
  ['meetings.view', 'View meetings'],
  ['meetings.create', 'Create meetings'],
  ['meetings.edit', 'Edit meetings'],
  ['meetings.delete', 'Delete meetings'],
  ['reports.view', 'View reports'],
  ['reports.export', 'Export reports'],
  ['products_services.view', 'View products and services'],
  ['products_services.create', 'Create products and services'],
  ['products_services.edit', 'Edit products and services'],
  ['products_services.delete', 'Delete products and services'],
]

export async function seedPermissions() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    })
  }

  for (const [code, description] of permissions) {
    await prisma.permission.upsert({
      where: { code },
      update: { description },
      create: { code, description },
    })
  }

  const admin = await prisma.role.findUnique({
    where: { name: 'ADMIN' },
    select: { id: true },
  })

  if (!admin) {
    throw new Error('ADMIN role not found after seed')
  }

  const allPermissions = await prisma.permission.findMany({
    select: { id: true },
  })

  await prisma.rolePermission.createMany({
    data: allPermissions.map((permission) => ({
      roleId: admin.id,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  })

  const salesManager = await prisma.role.findUnique({
    where: { name: 'SALES_MANAGER' },
    select: { id: true },
  })

  if (salesManager) {
    const managerPerms = await prisma.permission.findMany({
      where: {
        code: {
          in: [
            'tasks.view',
            'tasks.create',
            'tasks.edit',
            'tasks.delete',
            'activities.view',
            'activities.create',
            'targets.view',
            'targets.create',
            'targets.edit',
            'targets.delete',
            'meetings.view',
            'meetings.create',
            'meetings.edit',
            'meetings.delete',
            'reports.view',
            'reports.export',
            'products_services.view',
            'products_services.create',
            'products_services.edit',
          ],
        },
      },
      select: { id: true },
    })

    await prisma.rolePermission.createMany({
      data: managerPerms.map((p) => ({
        roleId: salesManager.id,
        permissionId: p.id,
      })),
      skipDuplicates: true,
    })
  }

  const salesEmployee = await prisma.role.findUnique({
    where: { name: 'SALES_EMPLOYEE' },
    select: { id: true },
  })

  if (salesEmployee) {
    const empPerms = await prisma.permission.findMany({
      where: {
        code: {
          in: [
            'tasks.view',
            'tasks.create',
            'tasks.edit',
            'tasks.delete',
            'activities.view',
            'activities.create',
            'targets.view',
            'meetings.view',
            'meetings.create',
            'meetings.edit',
            'products_services.view',
          ],
        },
      },
      select: { id: true },
    })

    await prisma.rolePermission.createMany({
      data: empPerms.map((p) => ({
        roleId: salesEmployee.id,
        permissionId: p.id,
      })),
      skipDuplicates: true,
    })
  }
}
