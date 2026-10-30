import { prisma } from '../../config/database.js'

export class AuditLogServiceError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'AuditLogServiceError'
    this.statusCode = statusCode
  }
}

export type CreateAuditLogInput = {
  actorId?: number | null
  action: string
  entityType: string
  entityId: number
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  ipAddress?: string | null
}

export async function logAudit(input: CreateAuditLogInput) {
  try {
    return await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action.trim(),
        entityType: input.entityType.trim().toUpperCase(),
        entityId: input.entityId,
        before: (input.before as any) ?? undefined,
        after: (input.after as any) ?? undefined,
        ipAddress: input.ipAddress ?? null,
      },
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
    return null
  }
}

export async function listAuditLogs(query: {
  entityType?: string
  entityId?: number
  actorId?: number
  action?: string
  page?: number
  limit?: number
}) {
  const page = Math.max(1, query.page || 1)
  const limit = Math.min(100, Math.max(1, query.limit || 20))
  const skip = (page - 1) * limit

  const where: any = {}
  if (query.entityType && query.entityType.toUpperCase() !== 'ALL') {
    const et = query.entityType.trim().toUpperCase()
    if (et === 'FOLLOWUP' || et === 'ACTIVITY') {
      where.entityType = { in: ['ACTIVITY', 'FOLLOWUP'] }
    } else {
      where.entityType = {
        equals: query.entityType.trim(),
        mode: 'insensitive',
      }
    }
  }
  if (query.entityId) {
    where.entityId = query.entityId
  }
  if (query.actorId) {
    where.actorId = query.actorId
  }
  if (query.action) {
    where.action = {
      contains: query.action.trim(),
      mode: 'insensitive',
    }
  }

  const [total, logs, entityGroups, allCount] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.groupBy({
      by: ['entityType'],
      _count: { _all: true },
    }),
    prisma.auditLog.count(),
  ])

  const countsByType: Record<string, number> = {}
  for (const g of entityGroups) {
    countsByType[g.entityType.toUpperCase()] = g._count._all
  }

  // Convert BigInt id to string for JSON serialization
  const items = logs.map((log) => ({
    id: log.id.toString(),
    actorId: log.actorId,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    before: log.before,
    after: log.after,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt.toISOString(),
    actor: log.actor,
  }))

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    stats: {
      total: allCount,
      leads: countsByType['LEAD'] || 0,
      deals: countsByType['DEAL'] || 0,
      customers: countsByType['CUSTOMER'] || 0,
      users: (countsByType['USER'] || 0) + (countsByType['AUTH'] || 0),
    },
  }
}
