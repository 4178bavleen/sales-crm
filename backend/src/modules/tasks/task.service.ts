import { prisma } from '../../config/database.js'
import { Priority, TaskStatus } from '../../generated/prisma/client.js'

type TaskInput = Record<string, unknown>

export class TaskServiceError extends Error {
    statusCode: number

    constructor(message: string, statusCode = 400) {
        super(message)
        this.name = 'TaskServiceError'
        this.statusCode = statusCode
    }
}

const taskInclude = {
    assignedTo: {
        select: { id: true, name: true, email: true },
    },
    createdBy: {
        select: { id: true, name: true, email: true },
    },
    completedBy: {
        select: { id: true, name: true },
    },
    lead: {
        select: { id: true, contactName: true, companyName: true },
    },
    deal: {
        select: { id: true, name: true },
    },
    customer: {
        select: {
            id: true,
            companyId: true,
            primaryContactId: true,
            ownerId: true,
        },
    },
    company: {
        select: { id: true, name: true },
    },
    meeting: {
        select: { id: true, title: true, startsAt: true },
    },
    cancelReason: {
        select: { id: true, name: true },
    },
} as const

async function validateReferences(data: TaskInput) {
    if (data.assignedToId !== undefined) {
        const user = await prisma.user.findFirst({
            where: {
                id: data.assignedToId as number,
                isActive: true,
                deletedAt: null,
            },
            select: { id: true },
        })

        if (!user) {
            throw new TaskServiceError('Assigned user was not found or is inactive', 400)
        }
    }

    const checks = [
        ['leadId', () => prisma.lead.findFirst({
            where: { id: data.leadId as number, deletedAt: null },
            select: { id: true },
        })],
        ['dealId', () => prisma.deal.findUnique({
            where: { id: data.dealId as number },
            select: { id: true },
        })],
        ['customerId', () => prisma.customer.findUnique({
            where: { id: data.customerId as number },
            select: { id: true },
        })],
        ['companyId', () => prisma.company.findFirst({
            where: { id: data.companyId as number, deletedAt: null },
            select: { id: true },
        })],
        ['meetingId', () => prisma.meeting.findUnique({
            where: { id: data.meetingId as number },
            select: { id: true },
        })],
    ] as const

    for (const [field, check] of checks) {
        if (data[field] === undefined || data[field] === null) continue

        const record = await check()

        if (!record) {
            throw new TaskServiceError(`${field} references a record that does not exist`, 400)
        }
    }
}

export async function createTask(data: TaskInput, actorId: number) {
    await validateReferences(data)

    const links = ['leadId', 'dealId', 'customerId', 'companyId'].filter(
        (key) => data[key] !== undefined && data[key] !== null,
    )

    if (links.length > 1) {
        throw new TaskServiceError(
            'A task can be linked to at most one lead, deal, customer, or company',
        )
    }

    return prisma.task.create({
        data: {
            title: data.title as string,
            description: (data.description as string | null | undefined) ?? null,
            assignedToId: data.assignedToId as number,
            createdById: actorId,
            dueAt: data.dueAt as Date,
            priority: (data.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') ?? 'MEDIUM',
            status: (data.status as TaskStatus) ?? 'OPEN',
            leadId: (data.leadId as number | null | undefined) ?? null,
            dealId: (data.dealId as number | null | undefined) ?? null,
            customerId: (data.customerId as number | null | undefined) ?? null,
            companyId: (data.companyId as number | null | undefined) ?? null,
            meetingId: (data.meetingId as number | null | undefined) ?? null,
        },
        include: taskInclude,
    })
}

export async function listTasks(query: {
    page?: number
    limit?: number
    status?: TaskStatus
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    assignedToId?: number
    dueFrom?: Date
    dueTo?: Date
}) {
    const page = Math.max(query.page ?? 1, 1)
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100)

    const where = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
        ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
        ...(query.dueFrom || query.dueTo
            ? {
                dueAt: {
                    ...(query.dueFrom ? { gte: query.dueFrom } : {}),
                    ...(query.dueTo ? { lte: query.dueTo } : {}),
                },
            }
            : {}),
    }

    const [items, total] = await prisma.$transaction([
        prisma.task.findMany({
            where,
            include: taskInclude,
            orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.task.count({ where }),
    ])

    return {
        items,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    }
}

export async function getTaskById(id: number) {
    const task = await prisma.task.findUnique({
        where: { id },
        include: taskInclude,
    })

    if (!task) throw new TaskServiceError('Task not found', 404)

    return task
}

export async function updateTask(id: number, data: TaskInput) {
    const existing = await prisma.task.findUnique({ where: { id } })

    if (!existing) throw new TaskServiceError('Task not found', 404)

    await validateReferences(data)

    const updated = await prisma.task.update({
        where: { id },
        data: {
            ...data,
            ...(data.status === 'COMPLETED' && !existing.completedAt
                ? { completedAt: new Date() }
                : {}),
            ...(data.status === 'OPEN' || data.status === 'IN_PROGRESS'
                ? { completedAt: null, completedById: null, completionNote: null }
                : {}),
        },
        include: taskInclude,
    })

    return updated
}

export async function updateTaskStatus(
    id: number,
    status: TaskStatus,
    actorId: number,
    completionNote?: string,
    cancelReason?: string,
    cancelReasonId?: number,
) {
    const existing = await prisma.task.findUnique({ where: { id } })
    
    if (!existing) throw new TaskServiceError('Task not found', 404)

    let resolvedCancelReasonId = cancelReasonId;
    if (status === 'CANCELLED' && !resolvedCancelReasonId && cancelReason) {
        let found = await prisma.reason.findFirst({
            where: { name: cancelReason, type: 'TASK_CANCELLED' },
        });
        if (!found) {
            found = await prisma.reason.create({
                data: { name: cancelReason, type: 'TASK_CANCELLED' },
            });
        }
        resolvedCancelReasonId = found.id;
    }

    return prisma.task.update({
        where: { id },
        data: {
            status,
            completedAt: status === 'COMPLETED' ? new Date() : null,
            completedById: status === 'COMPLETED' ? actorId : null,
            completionNote:
                status === 'COMPLETED' ? completionNote?.trim() || null : null,
            cancelReasonId:
                status === 'CANCELLED' ? (resolvedCancelReasonId ?? existing.cancelReasonId) : null,
        },
        include: taskInclude,
    })
}

export async function deleteTask(id: number) {
    const task = await prisma.task.findUnique({ where: { id } })

    if (!task) throw new TaskServiceError('Task not found', 404)

    if (task.status === 'COMPLETED') {
        throw new TaskServiceError('Completed tasks cannot be deleted', 409)
    }

    return prisma.task.delete({ where: { id } })
}

export async function getTaskOptions() {
    const [users, leads, deals] = await Promise.all([
        prisma.user.findMany({
            where: { isActive: true, deletedAt: null },
            select: { id: true, name: true, email: true },
            orderBy: { name: 'asc' },
        }),
        prisma.lead.findMany({
            where: { deletedAt: null },
            select: { id: true, contactName: true, companyName: true },
            orderBy: { contactName: 'asc' },
            take: 100,
        }),
        prisma.deal.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
            take: 100,
        }),
    ])

    const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
    const statuses: TaskStatus[] = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

    return {
        users,
        leads,
        deals,
        priorities,
        statuses,
    }
}

