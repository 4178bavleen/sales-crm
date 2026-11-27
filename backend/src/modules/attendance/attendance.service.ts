import { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../../config/database.js'
import { AppError } from '../../common/errors/AppErrors.js'
import { logAudit } from '../audit/audit.service.js'
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
  type BulkAttendanceInput,
  type CreateAttendanceInput,
  type ListAttendanceInput,
  type UpdateAttendanceInput,
} from './attendance.validation.js'

export class AttendanceServiceError extends AppError {
  constructor(message: string, statusCode = 400) {
    super(statusCode, message)
    this.name = 'AttendanceServiceError'
  }
}

export type AttendanceViewer = {
  id: number
  role: string
  permissions?: string[]
}

export type AttendanceSummary = Record<AttendanceStatus, number> & { total: number }

const attendanceSelect = {
  id: true,
  userId: true,
  date: true,
  checkIn: true,
  checkOut: true,
  status: true,
  workingMinutes: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: { select: { name: true } },
      employeeProfile: { select: { employeeCode: true } },
    },
  },
}

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function toTimeDate(date: string, time: string | null): Date | null {
  if (!time) return null
  const [hour, minute] = time.split(':').map(Number)
  const value = toDate(date)
  value.setUTCHours(hour, minute, 0, 0)
  return value
}

function formatTime(value: Date | string | null): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  const hour = String(value.getUTCHours()).padStart(2, '0')
  const minute = String(value.getUTCMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}

function minutesBetween(checkIn: string | null, checkOut: string | null): number {
  if (!checkIn || !checkOut) return 0

  const [inHour, inMinute] = checkIn.split(':').map(Number)
  const [outHour, outMinute] = checkOut.split(':').map(Number)
  const difference = outHour * 60 + outMinute - (inHour * 60 + inMinute)

  return difference > 0 ? difference : 0
}

function buildWhere(
  input: ListAttendanceInput,
  viewer?: AttendanceViewer,
): Prisma.AttendanceWhereInput {
  const where: Prisma.AttendanceWhereInput = {}

  if (input.date) {
    where.date = toDate(input.date)
  } else if (input.from || input.to) {
    const range: Prisma.DateTimeFilter = {}
    if (input.from) range.gte = toDate(input.from)
    if (input.to) range.lte = toDate(input.to)
    where.date = range
  }

  if (input.userId) where.userId = input.userId
  if (input.status) where.status = input.status

  const search = input.search?.trim()
  if (search) {
    where.user = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }
  }

  // If user does not have attendance.manage permission and is not Admin, restrict to their own records
  const canManage = viewer?.role === 'ADMIN' || Boolean(viewer?.permissions?.includes('attendance.manage'))
  if (viewer && !canManage) {
    where.userId = viewer.id
  }

  return where
}

function emptySummary(): AttendanceSummary {
  const summary = Object.fromEntries(
    ATTENDANCE_STATUSES.map((status) => [status, 0]),
  ) as Record<AttendanceStatus, number>
  return { ...summary, total: 0 }
}

async function buildSummary(where: Prisma.AttendanceWhereInput): Promise<AttendanceSummary> {
  const grouped = await prisma.attendance.groupBy({
    by: ['status'],
    where,
    _count: { _all: true },
  })

  const summary = emptySummary()
  for (const row of grouped) {
    summary[row.status] = Number(row._count._all)
    summary.total += Number(row._count._all)
  }
  return summary
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export async function ensureAttendancePermissions() {
  try {
    const definitions = [
      ['attendance.view', 'View employee attendance records'],
      ['attendance.manage', 'Create, edit and delete employee attendance records'],
    ] as const

    for (const [code, description] of definitions) {
      await prisma.permission.upsert({
        where: { code },
        update: { description },
        create: { code, description },
      })
    }

    const permissions = await prisma.permission.findMany({
      where: { code: { startsWith: 'attendance.' } },
      select: { id: true, code: true },
    })

    const allRoles = await prisma.role.findMany({
      select: { id: true, name: true },
    })

    const viewPermission = permissions.find((p) => p.code === 'attendance.view')
    const managePermission = permissions.find((p) => p.code === 'attendance.manage')

    for (const role of allRoles) {
      // All employees across all departments get attendance.view
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

      // ADMIN role gets attendance.manage by default
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
    console.error('[AttendanceService] Failed to ensure attendance permissions:', error)
  }
}

export async function listAttendance(input: ListAttendanceInput, viewer?: AttendanceViewer) {
  const page = Math.max(1, input.page || 1)
  const limit = Math.min(100, Math.max(1, input.limit || 20))
  const skip = (page - 1) * limit
  const where = buildWhere(input, viewer)

  const [records, total, summary] = await Promise.all([
    prisma.attendance.findMany({
      where,
      select: attendanceSelect,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.attendance.count({ where }),
    buildSummary(where),
  ])

  return {
    records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    summary,
  }
}

export async function getAttendanceOptions() {
  const employees = await prisma.user.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: { select: { name: true } },
      employeeProfile: { select: { employeeCode: true } },
    },
    orderBy: [{ name: 'asc' }],
  })

  return { employees }
}

export async function getAttendanceById(id: number) {
  const record = await prisma.attendance.findUnique({
    where: { id },
    select: attendanceSelect,
  })

  if (!record) {
    throw new AttendanceServiceError('Attendance record not found', 404)
  }

  return record
}

export async function createAttendance(input: CreateAttendanceInput, actorId?: number) {
  const employee = await prisma.user.findFirst({
    where: { id: input.userId, deletedAt: null },
    select: { id: true },
  })

  if (!employee) {
    throw new AttendanceServiceError('Selected employee was not found', 404)
  }

  const checkIn = input.checkIn ?? null
  const checkOut = input.checkOut ?? null

  try {
    const created = await prisma.attendance.create({
      data: {
        userId: input.userId,
        date: toDate(input.date),
        checkIn: toTimeDate(input.date, checkIn),
        checkOut: toTimeDate(input.date, checkOut),
        status: input.status,
        workingMinutes: input.workingMinutes ?? minutesBetween(checkIn, checkOut),
        notes: input.notes ?? null,
      },
      select: attendanceSelect,
    })

    await logAudit({
      actorId,
      action: 'CREATE',
      entityType: 'ATTENDANCE',
      entityId: created.id,
      after: { ...created },
    })

    return created
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AttendanceServiceError('Attendance for this employee and date already exists', 409)
    }
    throw error
  }
}

export async function saveBulkAttendance(
  input: BulkAttendanceInput,
  actorId?: number,
) {
  const date = toDate(input.date)
  const requestedUserIds = [
    ...input.records.map((record) => record.userId),
    ...(input.clearUserIds ?? []),
  ]
  const uniqueUserIds = [...new Set(requestedUserIds)]

  if (uniqueUserIds.length) {
    const employeeCount = await prisma.user.count({
      where: { id: { in: uniqueUserIds }, deletedAt: null },
    })
    if (employeeCount !== uniqueUserIds.length) {
      throw new AttendanceServiceError('One or more selected employees were not found', 404)
    }
  }

  const saved = await prisma.$transaction(async (tx) => {
    if (input.clearUserIds?.length) {
      await tx.attendance.deleteMany({
        where: { date, userId: { in: input.clearUserIds } },
      })
    }

    const results: unknown[] = []
    for (const entry of input.records) {
      const checkIn = entry.checkIn ?? null
      const checkOut = entry.checkOut ?? null
      const values = {
        status: entry.status,
        checkIn: toTimeDate(input.date, checkIn),
        checkOut: toTimeDate(input.date, checkOut),
        workingMinutes: minutesBetween(checkIn, checkOut),
        notes: entry.notes ?? null,
      }

      results.push(
        await tx.attendance.upsert({
          where: { userId_date: { userId: entry.userId, date } },
          create: { userId: entry.userId, date, ...values },
          update: values,
          select: attendanceSelect,
        }),
      )
    }
    return results
  })

  await logAudit({
    actorId,
    action: 'BULK_SAVE',
    entityType: 'ATTENDANCE',
    entityId: 0,
    after: {
      date: input.date,
      saved: saved.length,
      cleared: input.clearUserIds?.length ?? 0,
    },
  })

  return {
    records: saved,
    count: saved.length,
    cleared: input.clearUserIds?.length ?? 0,
  }
}

export async function updateAttendance(
  id: number,
  input: UpdateAttendanceInput,
  actorId?: number,
) {
  const existing = await prisma.attendance.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      date: true,
      checkIn: true,
      checkOut: true,
      status: true,
      workingMinutes: true,
      notes: true,
    },
  })

  if (!existing) {
    throw new AttendanceServiceError('Attendance record not found', 404)
  }

  if (input.userId) {
    const employee = await prisma.user.findFirst({
      where: { id: input.userId, deletedAt: null },
      select: { id: true },
    })
    if (!employee) {
      throw new AttendanceServiceError('Selected employee was not found', 404)
    }
  }

  const recordDate = input.date ?? existing.date.toISOString().slice(0, 10)
  const checkIn = input.checkIn !== undefined ? input.checkIn : formatTime(existing.checkIn)
  const checkOut = input.checkOut !== undefined ? input.checkOut : formatTime(existing.checkOut)
  const timesChanged = input.checkIn !== undefined || input.checkOut !== undefined

  try {
    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        userId: input.userId ?? existing.userId,
        date: toDate(recordDate),
        checkIn: toTimeDate(recordDate, checkIn),
        checkOut: toTimeDate(recordDate, checkOut),
        status: input.status ?? existing.status,
        workingMinutes:
          input.workingMinutes !== undefined
            ? input.workingMinutes
            : timesChanged
              ? minutesBetween(checkIn, checkOut)
              : existing.workingMinutes,
        notes: input.notes !== undefined ? input.notes : existing.notes,
      },
      select: attendanceSelect,
    })

    await logAudit({
      actorId,
      action: 'UPDATE',
      entityType: 'ATTENDANCE',
      entityId: id,
      before: { ...existing },
      after: { ...updated },
    })

    return updated
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AttendanceServiceError('Attendance for this employee and date already exists', 409)
    }
    throw error
  }
}

export async function deleteAttendance(id: number, actorId?: number) {
  const existing = await prisma.attendance.findUnique({
    where: { id },
    select: attendanceSelect,
  })

  if (!existing) {
    throw new AttendanceServiceError('Attendance record not found', 404)
  }

  await prisma.attendance.delete({ where: { id } })

  await logAudit({
    actorId,
    action: 'DELETE',
    entityType: 'ATTENDANCE',
    entityId: id,
    before: { ...existing },
  })

  return { id, deleted: true }
}
