import fs from 'fs'
import { prisma } from '../../config/database.js'
import { AppError } from '../../common/errors/AppErrors.js'
import { logAudit } from '../audit/audit.service.js'
import { createInAppNotification } from '../notifications/notification.service.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type {
  ApplyLeaveInput,
  ListLeavesQueryInput,
  ReviewLeaveInput,
  LeaveType,
  LeaveStatus,
  CreateLeavePolicyInput,
  UpdateLeavePolicyInput,
} from './leave.validation.js'

export class LeaveServiceError extends AppError {
  constructor(message: string, statusCode = 400) {
    super(statusCode, message)
    this.name = 'LeaveServiceError'
  }
}

export interface LeaveDocumentData {
  path: string
  name: string
  mimeType: string
}

const leaveSelect = {
  id: true,
  userId: true,
  leaveType: true,
  policyId: true,
  policy: {
    select: {
      id: true,
      name: true,
      code: true,
      quota: true,
      period: true,
      isPaid: true,
    },
  },
  startDate: true,
  endDate: true,
  reason: true,
  documentPath: true,
  documentName: true,
  documentType: true,
  rejectionReason: true,
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

      // ADMIN and MANAGER roles get leave.manage by default
      const roleNameUpper = role.name.toUpperCase()
      const isManagementRole =
        ['ADMIN', 'MANAGER', 'HR_MANAGER', 'SUPER_ADMIN'].includes(roleNameUpper) ||
        roleNameUpper.includes('MANAGER')

      if (isManagementRole && managePermission) {
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
 * Seeds default leave policies if none exist in the database.
 */
export async function ensureDefaultLeavePolicies() {
  try {
    const count = await prisma.leaveTypePolicy.count()
    if (count === 0) {
      const defaults = [
        {
          name: 'Casual Leave',
          code: 'CASUAL',
          quota: 12,
          period: 'YEARLY' as const,
          isPaid: true,
          requiresDocument: false,
          description: 'For personal matters and urgent unplanned absences',
          sortOrder: 1,
        },
        {
          name: 'Sick Leave',
          code: 'SICK',
          quota: 10,
          period: 'YEARLY' as const,
          isPaid: true,
          requiresDocument: true,
          documentDescription: "Doctor's prescription or medical slip",
          description: 'For illness, recovery, and medical appointments',
          sortOrder: 2,
        },
        {
          name: 'Earned Leave',
          code: 'EARNED',
          quota: 15,
          period: 'YEARLY' as const,
          isPaid: true,
          requiresDocument: false,
          description: 'Privileged paid annual leave for planned vacations and time off',
          sortOrder: 3,
        },
        {
          name: 'Compensatory Off',
          code: 'COMP_OFF',
          quota: 0,
          period: 'YEARLY' as const,
          isPaid: true,
          requiresDocument: false,
          description: 'Time off earned by working overtime or on holidays',
          sortOrder: 4,
        },
        {
          name: 'Maternity Leave',
          code: 'MATERNITY',
          quota: 180,
          period: 'YEARLY' as const,
          isPaid: true,
          requiresDocument: true,
          documentDescription: 'Medical certificate',
          description: 'Statutory maternity leave for new mothers',
          sortOrder: 5,
        },
        {
          name: 'Paternity Leave',
          code: 'PATERNITY',
          quota: 15,
          period: 'YEARLY' as const,
          isPaid: true,
          requiresDocument: true,
          documentDescription: 'Medical certificate',
          description: 'Paternity time off for new fathers',
          sortOrder: 6,
        },
        {
          name: 'Unpaid Leave',
          code: 'UNPAID',
          quota: 0,
          period: 'YEARLY' as const,
          isPaid: false,
          requiresDocument: false,
          description: 'Leave without pay / unpaid absence',
          sortOrder: 7,
        },
      ]

      for (const item of defaults) {
        await prisma.leaveTypePolicy.create({ data: item })
      }
    }
  } catch (error) {
    console.error('[LeaveService] Failed to seed default leave policies:', error)
  }
}

/**
 * Submits a new leave application for the current user.
 */
export async function applyLeave(
  userId: number,
  input: ApplyLeaveInput,
  document?: LeaveDocumentData
) {
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

  // Look up policy by code or name
  const policy = await prisma.leaveTypePolicy.findFirst({
    where: {
      OR: [
        { code: input.leaveType },
        { name: { equals: input.leaveType, mode: 'insensitive' } },
      ],
    },
    select: { id: true, code: true, name: true },
  })

  const leave = await prisma.leaveRequest.create({
    data: {
      userId,
      leaveType: policy?.code || input.leaveType,
      policyId: policy?.id || null,
      startDate,
      endDate,
      reason: input.reason.trim(),
      status: 'PENDING',
      documentPath: document?.path || null,
      documentName: document?.name || null,
      documentType: document?.mimeType || null,
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
    const employeeWithManager = await prisma.employeeProfile.findUnique({
      where: { userId },
      select: { managerId: true },
    })

    const managers = await prisma.user.findMany({
      where: {
        id: { not: userId }, // Don't notify the applicant themself
        deletedAt: null,
        isActive: true,
        OR: [
          {
            role: {
              OR: [
                { name: { in: ['ADMIN', 'MANAGER', 'HR_MANAGER'], mode: 'insensitive' } },
                { name: { contains: 'MANAGER', mode: 'insensitive' } },
                { permissions: { some: { permission: { code: 'leave.manage' } } } },
              ],
            },
          },
          ...(employeeWithManager?.managerId ? [{ id: employeeWithManager.managerId }] : []),
        ],
      },
      select: { id: true },
    })

    if (managers.length > 0) {
      const recipientIds = Array.from(new Set(managers.map((m) => m.id)))
      const bodyReason = input.reason?.trim() ? ` Reason: ${input.reason.trim()}` : ''
      const bodyDoc = document ? ' (Supporting document attached)' : ''
      await Promise.allSettled(
        recipientIds.map((mId) =>
          createInAppNotification({
            userId: mId,
            type: 'LEAVE_REQUESTED',
            title: `New Leave Request from ${user.name}`,
            body: `${user.name} applied for ${input.leaveType} leave from ${input.startDate} to ${input.endDate}.${bodyReason}${bodyDoc}`,
            entityType: 'LEAVE_REQUEST',
            entityId: leave.id,
          })
        )
      )
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
  const daysByType: Record<string, number> = {
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

  // Fetch dynamic leave policies configured in DB
  const policies = await prisma.leaveTypePolicy.findMany({
    where: { isActive: true },
    orderBy: [
      { sortOrder: 'asc' },
      { id: 'asc' },
    ],
  })

  // Build allowance dictionary dynamically from database policies
  const allowances: Record<string, number> = {
    CASUAL: 12,
    SICK: 10,
    EARNED: 15,
  }
  for (const p of policies) {
    allowances[p.code] = Number(p.quota)
  }

  // Format dynamic policy cards for stat cards
  const policyStats = policies.map((p) => {
    const quota = Number(p.quota)
    const taken = (daysByType as Record<string, number>)[p.code] || 0
    const remaining = Math.max(0, quota - taken)

    let periodLabel = 'Per Year'
    if (p.period === 'MONTHLY') periodLabel = 'Per Month'
    else if (p.period === 'QUARTERLY') periodLabel = 'Per Quarter'
    else if (p.period === 'HALF_YEARLY') periodLabel = 'Per Half-Year'

    return {
      id: p.id,
      code: p.code,
      name: p.name,
      quota,
      period: p.period,
      periodLabel,
      isPaid: p.isPaid,
      requiresDocument: p.requiresDocument,
      documentDescription: p.documentDescription,
      description: p.description,
      usedDays: taken,
      remainingDays: remaining,
    }
  })

  const remainingBalance: Record<string, number> = {}
  for (const [code, quota] of Object.entries(allowances)) {
    const used = (daysByType as Record<string, number>)[code] || 0
    remainingBalance[code] = Math.max(0, quota - used)
  }

  return {
    year,
    pendingRequests: pendingCount,
    totalApprovedDays: approvedDays,
    daysByType,
    policies: policyStats,
    remainingBalance,
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
        rejectionReason: newStatus === 'REJECTED' ? (input.remarks || 'Rejected by reviewer') : null,
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
    await createInAppNotification({
      userId: leave.userId,
      type: newStatus === 'APPROVED' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
      title: `Leave Request ${newStatus === 'APPROVED' ? 'Approved' : 'Rejected'}`,
      body: `Your leave request for ${formatDate(leave.startDate)} to ${formatDate(leave.endDate)} has been ${newStatus.toLowerCase()}.${input.remarks ? ` Note: ${input.remarks}` : ''}`,
      entityType: 'LEAVE_REQUEST',
      entityId: leave.id,
    })
  } catch (err) {
    console.error('[LeaveService] Failed to notify employee:', err)
  }

  return updated
}

/**
 * Retrieves the document file path and metadata for a leave request.
 * Authorizes the leave owner, admin, or users with leave.manage permission.
 */
export async function getLeaveDocument(
  leaveId: number,
  viewer: { id: number; role?: string; permissions?: string[] }
) {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveId },
    select: {
      id: true,
      userId: true,
      documentPath: true,
      documentName: true,
      documentType: true,
    },
  })

  if (!leave) {
    throw new LeaveServiceError('Leave request not found', 404)
  }

  const isOwner = leave.userId === viewer.id
  const isAdmin = viewer.role?.toUpperCase() === 'ADMIN'
  const canManage = Boolean(viewer.permissions?.includes('leave.manage'))

  if (!isOwner && !isAdmin && !canManage) {
    throw new LeaveServiceError('You do not have permission to view this document', 403)
  }

  if (!leave.documentPath) {
    throw new LeaveServiceError('No document attached to this leave request', 404)
  }

  if (!fs.existsSync(leave.documentPath)) {
    throw new LeaveServiceError('Attached document file was not found on server', 404)
  }

  return {
    filePath: leave.documentPath,
    documentName: leave.documentName || 'leave-document',
    documentType: leave.documentType || 'application/octet-stream',
  }
}

/**
 * Returns all configured leave policies (active and inactive), ordered by sortOrder.
 */
export async function getLeavePolicies() {
  return prisma.leaveTypePolicy.findMany({
    orderBy: [
      { sortOrder: 'asc' },
      { id: 'asc' },
    ],
  })
}

/**
 * Returns only active leave policies for employee selection and dashboard stat cards.
 */
export async function getActiveLeavePolicies() {
  return prisma.leaveTypePolicy.findMany({
    where: { isActive: true },
    orderBy: [
      { sortOrder: 'asc' },
      { id: 'asc' },
    ],
  })
}

/**
 * Creates a new leave category / policy.
 */
export async function createLeavePolicy(input: CreateLeavePolicyInput) {
  const code = (input.code?.trim() || input.name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'))
  const existing = await prisma.leaveTypePolicy.findFirst({
    where: {
      OR: [
        { code },
        { name: { equals: input.name.trim(), mode: 'insensitive' } },
      ],
    },
  })

  if (existing) {
    throw new LeaveServiceError(`A leave policy with name "${input.name}" or code "${code}" already exists`, 409)
  }

  return prisma.leaveTypePolicy.create({
    data: {
      name: input.name.trim(),
      code,
      quota: input.quota,
      period: input.period,
      isPaid: input.isPaid,
      requiresDocument: input.requiresDocument,
      documentDescription: input.documentDescription?.trim() || null,
      description: input.description?.trim() || null,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
  })
}

/**
 * Updates an existing leave policy (quotas, periods, rules, etc.).
 */
export async function updateLeavePolicy(id: number, input: UpdateLeavePolicyInput) {
  const existing = await prisma.leaveTypePolicy.findUnique({
    where: { id },
  })

  if (!existing) {
    throw new LeaveServiceError('Leave policy not found', 404)
  }

  if (input.name && input.name.trim() !== existing.name) {
    const duplicate = await prisma.leaveTypePolicy.findFirst({
      where: {
        id: { not: id },
        name: { equals: input.name.trim(), mode: 'insensitive' },
      },
    })
    if (duplicate) {
      throw new LeaveServiceError(`A leave policy with name "${input.name}" already exists`, 409)
    }
  }

  return prisma.leaveTypePolicy.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
      ...(input.quota !== undefined ? { quota: input.quota } : {}),
      ...(input.period !== undefined ? { period: input.period } : {}),
      ...(input.isPaid !== undefined ? { isPaid: input.isPaid } : {}),
      ...(input.requiresDocument !== undefined ? { requiresDocument: input.requiresDocument } : {}),
      ...(input.documentDescription !== undefined ? { documentDescription: input.documentDescription?.trim() || null } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  })
}

/**
 * Deletes or deactivates a leave policy.
 */
export async function deleteLeavePolicy(id: number) {
  const existing = await prisma.leaveTypePolicy.findUnique({
    where: { id },
    include: { _count: { select: { leaveRequests: true } } },
  })

  if (!existing) {
    throw new LeaveServiceError('Leave policy not found', 404)
  }

  // If there are existing leave requests under this policy, deactivate it instead of deleting
  if (existing._count.leaveRequests > 0) {
    const deactivated = await prisma.leaveTypePolicy.update({
      where: { id },
      data: { isActive: false },
    })
    return { ...deactivated, softDeleted: true, message: 'Policy has existing leave records, deactivated successfully.' }
  }

  return prisma.leaveTypePolicy.delete({
    where: { id },
  })
}
