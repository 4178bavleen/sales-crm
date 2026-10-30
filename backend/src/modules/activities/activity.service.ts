import { prisma } from '../../config/database.js'
import type { ActivityType } from '../../generated/prisma/client.js'

type ActivityInput = Record<string, unknown>

export class ActivityServiceError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'ActivityServiceError'
    this.statusCode = statusCode
  }
}

const activityInclude = {
  performedBy: { select: { id: true, name: true, email: true, phone: true } },
  lead: { select: { id: true, contactName: true, companyName: true, status: true, phone: true } },
  deal: {
    select: {
      id: true,
      name: true,
      status: true,
      lead: { select: { phone: true, contactName: true } },
      customer: {
        select: {
          company: { select: { phone: true, name: true } },
          primaryContact: { select: { phone: true, fullName: true } },
        },
      },
    },
  },
  customer: {
    select: {
      id: true,
      companyId: true,
      primaryContactId: true,
      company: { select: { id: true, name: true, phone: true } },
      primaryContact: { select: { id: true, fullName: true, phone: true } },
    },
  },
  company: { select: { id: true, name: true, phone: true } },
  task: { select: { id: true, title: true, status: true, dueAt: true, assignedToId: true } },
} as const

async function validateReferences(data: ActivityInput) {
  const checks = [
    ['leadId', () => prisma.lead.findFirst({ where: { id: data.leadId as number, deletedAt: null }, select: { id: true } })],
    ['dealId', () => prisma.deal.findFirst({ where: { id: data.dealId as number, deletedAt: null }, select: { id: true } })],
    ['customerId', () => prisma.customer.findFirst({ where: { id: data.customerId as number, deletedAt: null }, select: { id: true } })],
    ['companyId', () => prisma.company.findFirst({ where: { id: data.companyId as number, deletedAt: null }, select: { id: true } })],
    ['taskId', () => prisma.task.findUnique({ where: { id: data.taskId as number }, select: { id: true, leadId: true, dealId: true, customerId: true, companyId: true } })],
  ] as const

  for (const [field, check] of checks) {
    if (data[field] === undefined || data[field] === null) continue
    const record = await check()
    if (!record) throw new ActivityServiceError(`${field} references a record that does not exist`, 400)

    if (field === 'taskId' && record) {
      const task = record as { leadId: number | null; dealId: number | null; customerId: number | null; companyId: number | null }
      const activityLink = ['leadId', 'dealId', 'customerId', 'companyId'].find((key) => data[key] !== undefined)
      if (activityLink && task[activityLink as keyof typeof task] && task[activityLink as keyof typeof task] !== data[activityLink]) {
        throw new ActivityServiceError('The task and activity must be linked to the same record', 400)
      }
      if (!activityLink) {
        if (task.leadId) data.leadId = task.leadId;
        else if (task.dealId) data.dealId = task.dealId;
        else if (task.customerId) data.customerId = task.customerId;
        else if (task.companyId) data.companyId = task.companyId;
      }
    }
  }
}

export async function createActivity(data: ActivityInput, actorId: number) {
  await validateReferences(data)
  const activity = await prisma.activity.create({
    data: {
      type: data.type as ActivityType,
      outcome: (data.outcome as string | null | undefined) ?? null,
      notes: (data.notes as string | null | undefined) ?? null,
      occurredAt: (data.occurredAt as Date | undefined) ?? new Date(),
      performedById: actorId,
      leadId: (data.leadId as number | undefined) ?? null,
      dealId: (data.dealId as number | undefined) ?? null,
      customerId: (data.customerId as number | undefined) ?? null,
      companyId: (data.companyId as number | undefined) ?? null,
      taskId: (data.taskId as number | undefined) ?? null,
    },
    include: activityInclude,
  })

  // Keep the linked lead's quick-reference date in sync when a next follow-up task is attached.
  if (activity.leadId && activity.taskId) {
    const task = await prisma.task.findUnique({ where: { id: activity.taskId }, select: { dueAt: true, status: true } })
    if (task && task.status !== 'COMPLETED' && task.status !== 'CANCELLED') {
      await prisma.lead.update({ where: { id: activity.leadId }, data: { nextFollowUpAt: task.dueAt } })
    }
  }

  return activity
}

export async function listActivities(query: {
  page: number
  limit: number
  type?: ActivityType
  leadId?: number
  taskId?: number
  performedById?: number
  dateFrom?: Date
  dateTo?: Date
}) {
  const occurredAt =
    query.dateFrom || query.dateTo
      ? {
          ...(query.dateFrom ? { gte: query.dateFrom } : {}),
          ...(query.dateTo ? { lte: query.dateTo } : {}),
        }
      : undefined
  const where = {
    ...(query.type ? { type: query.type } : {}),
    ...(query.leadId ? { leadId: query.leadId } : {}),
    ...(query.taskId ? { taskId: query.taskId } : {}),
    ...(query.performedById ? { performedById: query.performedById } : {}),
    ...(occurredAt ? { occurredAt } : {}),
  }
  const [items, total] = await prisma.$transaction([
    prisma.activity.findMany({
      where,
      include: activityInclude,
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.activity.count({ where }),
  ])
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  }
}

export async function getActivityById(id: number) {
  const activity = await prisma.activity.findUnique({ where: { id }, include: activityInclude })
  if (!activity) throw new ActivityServiceError('Activity not found', 404)
  return activity
}
