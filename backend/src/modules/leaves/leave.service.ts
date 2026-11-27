import { prisma } from '../../config/database.js'
import { AppError } from '../../common/errors/AppErrors.js'
import { logAudit } from '../audit/audit.service.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type {
  ApplyLeaveInput,
  ListLeavesQueryInput,
  ReviewLeaveInput,
  LeaveType,
  LeaveStatus,
} from './leave.validation.js'

export class LeaveServiceError extends AppError {
  constructor(message: string, statusCode = 400) {
    super(statusCode, message)
    this.name = 'LeaveServiceError'
  }
}

const leaveSelect = {
  id: true,
  userId: true,
  leaveType: true,
  startDate: true,
  endDate: true,
  reason: true,
  status: true,
  approvedById: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: { select: { name: true } },
      employeeProfile: {
        select: {
          employeeCode: true,
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      },
    },
  },
  approvedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.LeaveRequestSelect

function toDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getDatesInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = []
  const current = new Date(start)
  while (current <= end) {
    dates.push(new Date(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return dates
}

export async function ensureLeavePermissions(): Promise<void> {
  try {
    const definitions = [
      ['leave.view', 'View employee leave history and requests'],
      ['leave.manage', 'Approve, reject, and manage employee leave requests'],
    ] as const

    for (const [code, description] of definitions) {
      await prisma.permission.upsert({
        where: { code },
        update: { description },
        create: { code, description },
      })
    }

    const permissions = await prisma.permission.findMany({
      where: { code: { startsWith: 'leave.' } },
      select: { id: true, code: true },
    })

    const allRoles = await prisma.role.findMany({
      select: { id: true, name: true },
    })

    const viewPermission = permissions.find((p) => p.code === 'leave.view')
    const managePermission = permissions.find((p) => p.code === 'leave.manage')

    for (const role of allRoles) {
      // All employees across all departments get leave.view
      if (viewPermission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: viewPermission.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: viewPermission.id,
          },
        })
      }

      // ADMIN role gets leave.manage by default
      if (role.name === 'ADMIN' && managePermission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: managePermission.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: managePermission.id,
          },
        })
      }
    }
  } catch (error) {
    console.error('[LeaveService] Failed to ensure leave permissions:', error)
  }
}

/**
 * Submits a new leave application for the current user.
 */
export async function applyLeave(userId: number, input: ApplyLeaveInput) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null, isActive: true },
    select: { id: true, name: true, email: true },
  })

  if (!user) {
    throw new LeaveServiceError('User account not found or inactive', 404)
  }

  const startDate = toDateOnly(input.startDate)
  const endDate = toDateOnly(input.endDate)

  // Prevent overlapping pending or approved leave requests
  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      userId,
      status: { in: ['PENDING', 'APPROVED'] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      leaveType: true,
      status: true,
    },
  })

  if (overlapping) {
    throw new LeaveServiceError(
      `You already have an existing ${overlapping.status.toLowerCase()} leave request (${formatDate(overlapping.startDate)} to ${formatDate(overlapping.endDate)}) overlapping these dates.`,
      409
    )
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      userId,
      leaveType: input.leaveType,
      startDate,
      endDate,
      reason: input.reason.trim(),
      status: 'PENDING',
    },
    select: leaveSelect,
  })

  void logAudit({
    actorId: userId,
    action: 'APPLY_LEAVE',
    entityType: 'LEAVE_REQUEST',
    entityId: leave.id,
    after: {
      userId,
      leaveType: leave.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: leave.reason,
    },
  })

  // Notify Managers / Admins
  try {
    const managers = await prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        role: {
          OR: [
            { name: 'ADMIN' },
            { rolePermissions: { some: { permission: { code: 'leave.manage' } } } },
          ],
        },
      },
      select: { id: true },
    })

    if (managers.length > 0) {
      await prisma.notification.createMany({
        data: managers.map((m) => ({
          userId: m.id,
          type: 'LEAVE_REQUESTED',
          title: `New Leave Request from ${user.name}`,
          body: `${user.name} applied for ${input.leaveType} leave from ${input.startDate} to ${input.endDate}.`,
          entityType: 'LEAVE_REQUEST',
          entityId: leave.id,
        })),
      })
    }
  } catch (err) {
    console.error('[LeaveService] Failed to send leave notification:', err)
  }

  return leave
}

/**
 * Returns paginated leave requests for the logged in user.
 */
export async function getMyLeaves(userId: number, query: ListLeavesQueryInput) {
  const page = Math.max(1, query.page || 1)
  const limit = Math.min(100, Math.max(1, query.limit || 20))
  const skip = (page - 1) * limit

  const where: Prisma.LeaveRequestWhereInput = {
    userId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.leaveType ? { leaveType: query.leaveType } : {}),
    ...(query.startDate ? { startDate: { gte: toDateOnly(query.startDate) } } : {}),
    ...(query.endDate ? { endDate: { lte: toDateOnly(query.endDate) } } : {}),
  }

  const [records, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      select: leaveSelect,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.leaveRequest.count({ where }),
  ])

  return {
    records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Aggregates leave statistics and balances for an employee.
 */
export async function getMyLeaveStats(userId: number, year = new Date().getFullYear()) {
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`)
  const yearEnd = new Date(`${year}-12-31T23:59:59.999Z`)

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      userId,
      startDate: { gte: yearStart, lte: yearEnd },
    },
    select: {
      leaveType: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  })

  let pendingCount = 0
  let approvedDays = 0
  const daysByType: Record<LeaveType, number> = {
    CASUAL: 0,
    SICK: 0,
    EARNED: 0,
    UNPAID: 0,
    MATERNITY: 0,
    PATERNITY: 0,
    COMP_OFF: 0,
    OTHER: 0,
  }

  for (const item of leaves) {
    if (item.status === 'PENDING') {
      pendingCount++
    } else if (item.status === 'APPROVED') {
      const dates = getDatesInRange(item.startDate, item.endDate)
      const count = dates.length
      daysByType[item.leaveType] = (daysByType[item.leaveType] || 0) + count
      approvedDays += count
    }
  }

  // Standard Annual Allowances (can be customized per policy)
  const allowances = {
    CASUAL: 12,
    SICK: 10,
    EARNED: 15,
  }

  return {
    year,
    pendingRequests: pendingCount,
    totalApprovedDays: approvedDays,
    daysByType,
    remainingBalance: {
      CASUAL: Math.max(0, allowances.CASUAL - daysByType.CASUAL),
      SICK: Math.max(0, allowances.SICK - daysByType.SICK),
      EARNED: Math.max(0, allowances.EARNED - daysByType.EARNED),
    },
    annualQuota: allowances,
  }
}

/**
 * Cancels a pending leave application.
 */
export async function cancelMyLeave(userId: number, leaveId: number) {
  const existing = await prisma.leaveRequest.findFirst({
    where: { id: leaveId, userId },
    select: { id: true, status: true, startDate: true, endDate: true },
  })

  if (!existing) {
    throw new LeaveServiceError('Leave request not found', 404)
  }

  if (existing.status !== 'PENDING') {
    throw new LeaveServiceError(
      `Cannot cancel a leave request with status "${existing.status}". Only pending leaves can be cancelled.`,
      400
    )
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: { status: 'CANCELLED' },
    select: leaveSelect,
  })

  void logAudit({
    actorId: userId,
    action: 'CANCEL_LEAVE',
    entityType: 'LEAVE_REQUEST',
    entityId: leaveId,
    before: { status: 'PENDING' },
    after: { status: 'CANCELLED' },
  })

  return updated
}

/**
 * Returns all employee leaves for Admins and Managers.
 */
export async function getAllLeaves(query: ListLeavesQueryInput) {
  const page = Math.max(1, query.page || 1)
  const limit = Math.min(100, Math.max(1, query.limit || 20))
  const skip = (page - 1) * limit

  const where: Prisma.LeaveRequestWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.leaveType ? { leaveType: query.leaveType } : {}),
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.startDate ? { startDate: { gte: toDateOnly(query.startDate) } } : {}),
    ...(query.endDate ? { endDate: { lte: toDateOnly(query.endDate) } } : {}),
    ...(query.search
      ? {
          user: {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        }
      : {}),
  }

  const [records, total, pendingCount] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      select: leaveSelect,
      orderBy: [
        { status: 'asc' }, // PENDING first
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
    }),
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
  ])

  return {
    records,
    pendingCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Approves or Rejects an employee leave request.
 * If approved, automatically synchronizes the attendance table.
 */
export async function reviewLeave(
  adminId: number,
  leaveId: number,
  input: ReviewLeaveInput
) {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })

  if (!leave) {
    throw new LeaveServiceError('Leave request not found', 404)
  }

  if (leave.status !== 'PENDING') {
    throw new LeaveServiceError(
      `This leave request has already been ${leave.status.toLowerCase()}.`,
      400
    )
  }

  const newStatus: LeaveStatus = input.action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
  const reasonWithRemarks = input.remarks
    ? `${leave.reason || ''} [Reviewer Note: ${input.remarks}]`.trim()
    : leave.reason

  const updated = await prisma.$transaction(async (tx) => {
    const reviewed = await tx.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: newStatus,
        approvedById: adminId,
        approvedAt: new Date(),
        reason: reasonWithRemarks,
      },
      select: leaveSelect,
    })

    // If approved, automatically sync attendance days as 'LEAVE'
    if (newStatus === 'APPROVED') {
      const dates = getDatesInRange(leave.startDate, leave.endDate)
      for (const d of dates) {
        await tx.attendance.upsert({
          where: {
            userId_date: {
              userId: leave.userId,
              date: d,
            },
          },
          update: {
            status: 'LEAVE',
            notes: `Approved Leave (${leave.leaveType})`,
          },
          create: {
            userId: leave.userId,
            date: d,
            status: 'LEAVE',
            notes: `Approved Leave (${leave.leaveType})`,
          },
        })
      }
    }

    return reviewed
  })

  void logAudit({
    actorId: adminId,
    action: `LEAVE_${newStatus}`,
    entityType: 'LEAVE_REQUEST',
    entityId: leaveId,
    before: { status: 'PENDING' },
    after: { status: newStatus, approvedById: adminId, remarks: input.remarks },
  })

  // Notify the employee
  try {
    await prisma.notification.create({
      data: {
        userId: leave.userId,
        type: newStatus === 'APPROVED' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
        title: `Leave Request ${newStatus === 'APPROVED' ? 'Approved' : 'Rejected'}`,
        body: `Your leave request for ${formatDate(leave.startDate)} to ${formatDate(leave.endDate)} has been ${newStatus.toLowerCase()}.${input.remarks ? ` Note: ${input.remarks}` : ''}`,
        entityType: 'LEAVE_REQUEST',
        entityId: leave.id,
      },
    })
  } catch (err) {
    console.error('[LeaveService] Failed to notify employee:', err)
  }

  return updated
}
