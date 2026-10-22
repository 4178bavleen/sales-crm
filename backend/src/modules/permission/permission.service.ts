
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

export async function createRole(data: {
  name: string
  description?: string
  codes?: string[]
}) {
  const normalizedName = data.name.trim().toUpperCase().replace(/\s+/g, '_')
  const existing = await prisma.role.findUnique({
    where: { name: normalizedName },
  })
  if (existing) {
    throw new PermissionServiceError('A role with this name already exists', 409)
  }

  const role = await prisma.role.create({
    data: {
      name: normalizedName,
      description: data.description?.trim() || null,
    },
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { users: true, permissions: true } },
    },
  })

  if (data.codes && data.codes.length > 0) {
    const uniqueCodes = [...new Set(data.codes)]
    const perms = await prisma.permission.findMany({
      where: { code: { in: uniqueCodes } },
      select: { id: true },
    })

    if (perms.length > 0) {
      await prisma.rolePermission.createMany({
        data: perms.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
        skipDuplicates: true,
      })
    }
  }

  return prisma.role.findUniqueOrThrow({
    where: { id: role.id },
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { users: true, permissions: true } },
    },
  })
}

const SYSTEM_ROLES = ['ADMIN']

export async function updateRole(
  roleId: number,
  data: { name?: string; description?: string },
) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { id: true, name: true },
  })

  if (!role) {
    throw new PermissionServiceError('Role not found', 404)
  }

  const updateData: { name?: string; description?: string | null } = {}

  if (data.name !== undefined) {
    const normalized = data.name.trim().toUpperCase().replace(/\s+/g, '_')
    if (SYSTEM_ROLES.includes(role.name) && normalized !== role.name) {
      throw new PermissionServiceError('System role ADMIN cannot be renamed', 400)
    }
    const duplicate = await prisma.role.findFirst({
      where: { name: normalized, NOT: { id: roleId } },
    })
    if (duplicate) {
      throw new PermissionServiceError('A role with this name already exists', 409)
    }
    updateData.name = normalized
  }

  if (data.description !== undefined) {
    updateData.description = data.description.trim() || null
  }

  return prisma.role.update({
    where: { id: roleId },
    data: updateData,
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { users: true, permissions: true } },
    },
  })
}

export async function deleteRole(roleId: number, reassignToRoleId?: number) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: {
      id: true,
      name: true,
      _count: { select: { users: true } },
    },
  })

  if (!role) {
    throw new PermissionServiceError('Role not found', 404)
  }

  if (role.name === 'ADMIN') {
    throw new PermissionServiceError('The ADMIN system role cannot be deleted', 400)
  }

  if (role._count.users > 0) {
    if (!reassignToRoleId) {
      throw new PermissionServiceError(
        `Cannot delete role "${role.name}" because it is currently assigned to ${role._count.users} user(s). Reassign them first.`,
        400,
      )
    }

    if (reassignToRoleId === roleId) {
      throw new PermissionServiceError('Cannot reassign users to the role being deleted', 400)
    }

    const target = await prisma.role.findUnique({
      where: { id: reassignToRoleId },
    })
    if (!target) {
      throw new PermissionServiceError('Reassignment target role not found', 404)
    }

    await prisma.user.updateMany({
      where: { roleId },
      data: { roleId: reassignToRoleId },
    })
  }

  await prisma.role.delete({
    where: { id: roleId },
  })

  return { success: true, message: `Role "${role.name}" deleted successfully` }
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