import { prisma } from '../../config/database.js'
import { Priority, TaskStatus } from '../../generated/prisma/client.js'
import { createInAppNotification } from '../notifications/notification.service.js'
import { logAudit } from '../audit/audit.service.js'

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
    rescheduleHistory: {
        orderBy: { createdAt: 'desc' },
        take: 10,
    },
    activities: {
        include: {
            performedBy: { select: { id: true, name: true } },
        },
        orderBy: { occurredAt: 'desc' },
        take: 10,
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

    const task = await prisma.task.create({
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

    // Notify the assignee after the task has been created.
    if (task.assignedToId !== actorId) {
        try {
            await createInAppNotification({
                userId: task.assignedToId,
                type: 'TASK_ASSIGNED',
                title: 'New task assigned',
                body: `You have been assigned a task: ${task.title}`,
                entityType: 'task',
                entityId: task.id,
            })
        } catch (error) {
            // Do not report task creation as failed if notification creation fails.
            console.error('Failed to create task assignment notification:', error)
        }
    }

    void logAudit({
        actorId,
        action: 'CREATE',
        entityType: 'TASK',
        entityId: task.id,
        after: {
            title: task.title,
            priority: task.priority,
            status: task.status,
            dueAt: task.dueAt?.toISOString(),
            assignedToId: task.assignedToId,
        },
    })

    return task
}


export async function listTasks(query: {
    page?: number
    limit?: number
    status?: TaskStatus
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    assignedToId?: number
    dueFrom?: Date
    dueTo?: Date
    followUpView?: 'today' | 'overdue' | 'upcoming' | 'completed'
    userId?: number
    isAdmin?: boolean
}) {
    const page = Math.max(query.page ?? 1, 1)
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100)

    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    const startOfTomorrow = new Date(startOfToday)
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

    let followUpFilter = {}

    switch (query.followUpView) {
        case 'today':
            followUpFilter = {
                status: { in: ['OPEN', 'IN_PROGRESS'] as TaskStatus[] },
                dueAt: {
                    gte: startOfToday,
                    lt: startOfTomorrow,
                },
            }
            break

        case 'overdue':
            followUpFilter = {
                status: { in: ['OPEN', 'IN_PROGRESS'] as TaskStatus[] },
                dueAt: { lt: startOfToday },
            }
            break

        case 'upcoming':
            followUpFilter = {
                status: { in: ['OPEN', 'IN_PROGRESS'] as TaskStatus[] },
                dueAt: { gte: startOfTomorrow },
            }
            break

        case 'completed':
            followUpFilter = {
                status: 'COMPLETED' as TaskStatus,
            }
            break
    }

    const userFilter = query.isAdmin
        ? (query.assignedToId ? { assignedToId: query.assignedToId } : {})
        : query.userId
            ? {
                OR: [
                    { assignedToId: query.userId },
                    { createdById: query.userId },
                ],
            }
            : (query.assignedToId ? { assignedToId: query.assignedToId } : {});

    const where = {
        ...followUpFilter,
        ...userFilter,
        ...(query.status && !query.followUpView ? { status: query.status } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
        ...(!query.followUpView && (query.dueFrom || query.dueTo)
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


export async function updateTask(id: number, data: TaskInput, actorId?: number) {
    const existing = await prisma.task.findUnique({ where: { id } })

    if (!existing) {
        throw new TaskServiceError('Task not found', 404)
    }

    await validateReferences(data)

    const dueDateChanged =
        data.dueAt !== undefined &&
        data.dueAt !== null &&
        new Date(data.dueAt as string | Date).getTime() !== existing.dueAt.getTime()

    if (dueDateChanged && actorId) {
        await prisma.taskRescheduleHistory.create({
            data: {
                taskId: id,
                previousDueAt: existing.dueAt,
                newDueAt: new Date(data.dueAt as string | Date),
                rescheduledById: actorId,
                note: (data.rescheduleNote as string) || (data.note as string) || null,
            },
        })
    }

    const { rescheduleNote, note: _n, ...cleanData } = data

    // When a task is rescheduled (due date changed) or explicitly set to OPEN / IN_PROGRESS,
    // ensure the task is reopened and completion/cancellation fields are cleared.
    const shouldReopen =
        (dueDateChanged && !data.status) ||
        data.status === 'OPEN' ||
        data.status === 'IN_PROGRESS';

    const nextStatus = (data.status as TaskStatus) || (dueDateChanged ? ('OPEN' as TaskStatus) : existing.status);

    const updated = await prisma.task.update({
        where: { id },
        data: {
            ...cleanData,
            status: nextStatus,
            ...(dueDateChanged ? { rescheduleCount: { increment: 1 } } : {}),
            ...(nextStatus === 'COMPLETED' && !existing.completedAt
                ? { completedAt: new Date(), completedById: actorId ?? null }
                : {}),
            ...(shouldReopen
                ? {
                    completedAt: null,
                    completedById: null,
                    completionNote: null,
                    cancelReasonId: null,
                }
                : {}),
        },
        include: taskInclude,
    })

    // Notify only when the task is assigned to a different user.
    const newAssigneeId = updated.assignedToId

    if (
        data.assignedToId !== undefined &&
        newAssigneeId !== existing.assignedToId
    ) {
        try {
            await createInAppNotification({
                userId: newAssigneeId,
                type: 'TASK_ASSIGNED',
                title: 'Task reassigned to you',
                body: `You have been assigned a task: ${updated.title}`,
                entityType: 'task',
                entityId: updated.id,
            })
        } catch (error) {
            console.error(
                'Failed to create task reassignment notification:',
                error,
            )
        }
    }

    void logAudit({
        actorId: actorId ?? null,
        action: dueDateChanged ? 'RESCHEDULE' : 'UPDATE',
        entityType: 'TASK',
        entityId: updated.id,
        before: {
            status: existing.status,
            dueAt: existing.dueAt?.toISOString(),
            assignedToId: existing.assignedToId,
        },
        after: {
            status: updated.status,
            dueAt: updated.dueAt?.toISOString(),
            assignedToId: updated.assignedToId,
            title: updated.title,
        },
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

    const updated = await prisma.task.update({
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

    void logAudit({
        actorId,
        action: status === 'COMPLETED' ? 'COMPLETE' : status === 'CANCELLED' ? 'CANCEL' : 'STATUS_CHANGE',
        entityType: 'TASK',
        entityId: id,
        before: { status: existing.status },
        after: {
            status,
            title: updated.title,
            completionNote: status === 'COMPLETED' ? completionNote : undefined,
            cancelReason: status === 'CANCELLED' ? cancelReason : undefined,
        },
    })

    return updated
}

export async function deleteTask(id: number) {
    const task = await prisma.task.findUnique({ where: { id } })

    if (!task) throw new TaskServiceError('Task not found', 404)

    if (task.status === 'COMPLETED') {
        throw new TaskServiceError('Completed tasks cannot be deleted', 409)
    }

    void logAudit({
        action: 'DELETE',
        entityType: 'TASK',
        entityId: id,
        before: { title: task.title, status: task.status },
    })

    return prisma.task.delete({ where: { id } })
}

export async function getTaskOptions() {
    const [users, leads, deals, cancelReasons] = await Promise.all([
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
        prisma.reason.findMany({
            where: { isActive: true, type: 'TASK_CANCELLED' },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        }),
    ])

    const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
    const statuses: TaskStatus[] = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

    return {
        users,
        leads,
        deals,
        cancelReasons,
        priorities,
        statuses,
    }
}


export async function getFollowUpStats(userId: number, isAdmin: boolean) {
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    const startOfTomorrow = new Date(startOfToday)
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

    const baseWhere = isAdmin
        ? {}
        : {
            OR: [
                { assignedToId: userId },
                { createdById: userId },
            ],
        }

    const [dueToday, overdue, upcoming, completed, all] = await Promise.all([
        prisma.task.count({
            where: {
                ...baseWhere,
                status: { in: ['OPEN', 'IN_PROGRESS'] },
                dueAt: { gte: startOfToday, lt: startOfTomorrow },
            },
        }),
        prisma.task.count({
            where: {
                ...baseWhere,
                status: { in: ['OPEN', 'IN_PROGRESS'] },
                dueAt: { lt: startOfToday },
            },
        }),
        prisma.task.count({
            where: {
                ...baseWhere,
                status: { in: ['OPEN', 'IN_PROGRESS'] },
                dueAt: { gte: startOfTomorrow },
            },
        }),
        prisma.task.count({
            where: {
                ...baseWhere,
                status: 'COMPLETED',
            },
        }),
        prisma.task.count({
            where: baseWhere,
        }),
    ])

    return {
        dueToday,
        overdue,
        upcoming,
        completed,
        all,
    }
}
