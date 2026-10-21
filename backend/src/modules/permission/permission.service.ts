
import { prisma } from '../../config/database.js'

export class PermissionServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message)
    this.name = 'PermissionServiceError'
  }
}

export async function listRoles() {
  return prisma.role.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { users: true, permissions: true } },
    },
  })
}

export async function listPermissions() {
  return prisma.permission.findMany({
    orderBy: { code: 'asc' },
    select: {
      id: true,
      code: true,
      description: true,
    },
  })
}

export async function getRolePermissions(roleId: number) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: {
      id: true,
      name: true,
      description: true,
      permissions: {
        orderBy: { permission: { code: 'asc' } },
        select: {
          permission: {
            select: {
              id: true,
              code: true,
              description: true,
            },
          },
        },
      },
    },
  })

  if (!role) {
    throw new PermissionServiceError('Role not found', 404)
  }

  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions.map((item) => item.permission),
  }
}

export async function replaceRolePermissions(
  roleId: number,
  codes: string[],
) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { id: true, name: true },
  })

  if (!role) {
    throw new PermissionServiceError('Role not found', 404)
  }

  // Keep at least one permission manager so the system cannot
  // accidentally remove every administrator's permission to manage RBAC.
  if (role.name === 'ADMIN' && !codes.includes('permissions.manage')) {
    throw new PermissionServiceError(
      'ADMIN must retain permissions.manage',
      400,
    )
  }

  const uniqueCodes = [...new Set(codes)]

  const found = await prisma.permission.findMany({
    where: { code: { in: uniqueCodes } },
    select: { id: true, code: true },
  })

  const foundCodes = new Set(found.map((item) => item.code))
  const unknownCodes = uniqueCodes.filter((code) => !foundCodes.has(code))

  if (unknownCodes.length) {
    throw new PermissionServiceError(
      `Unknown permission codes: ${unknownCodes.join(', ')}`,
      400,
    )
  }

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({
      where: { roleId },
    })

    if (found.length) {
      await tx.rolePermission.createMany({
        data: found.map((permission) => ({
          roleId,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      })
    }
  })

  return getRolePermissions(roleId)
}


export async function getUserPermissions(userId: number) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true,
      deletedAt: null,
    },
    select: {
      role: {
        select: {
          name: true,
          permissions: {
            select: {
              permission: {
                select: {
                  code: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!user) {
    throw new PermissionServiceError(
      'User is inactive or no longer exists',
      401,
    )
  }

  return {
    role: user.role.name,
    permissions: user.role.permissions.map(
      (item) => item.permission.code,
    ),
  }
}