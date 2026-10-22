import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type {
  CreateTargetInput,
  ListTargetsQuery,
  UpdateTargetInput,
} from './target.validation.js'

export class TargetServiceError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'TargetServiceError'
    this.statusCode = statusCode
  }
}

export interface TargetProgressItem {
  id: number
  userId: number | null
  teamId: number | null
  periodType: 'MONTHLY' | 'QUARTERLY'
  periodStart: string
  periodEnd: string
  amount: number
  achievedRevenue: number
  progressPercentage: number
  wonDealsCount: number
  pipelineRevenue: number
  openDealsCount: number
  status: 'ACHIEVED' | 'ON_TRACK' | 'AT_RISK' | 'BEHIND'
  employee: {
    id: number
    name: string
    email: string
    role?: { name: string } | null
  } | null
  team: {
    id: number
    name: string
    membersCount: number
  } | null
  createdBy: {
    id: number
    name: string
    email: string
  }
  changesCount: number
  createdAt: string
  updatedAt: string
}

export interface TargetMetricsSummary {
  totalQuota: number
  totalAchieved: number
  overallAttainment: number
  totalTargets: number
  achievedCount: number
  onTrackCount: number
  atRiskCount: number
  behindCount: number
  topPerformer: {
    id: number
    name: string
    attainment: number
    achieved: number
    quota: number
  } | null
  trends: {
    quota: number[]
    revenue: number[]
    attainment: number[]
    performance: number[]
  }
}

function calculateTargetStatus(progress: number): 'ACHIEVED' | 'ON_TRACK' | 'AT_RISK' | 'BEHIND' {
  if (progress >= 100) return 'ACHIEVED'
  if (progress >= 70) return 'ON_TRACK'
  if (progress >= 40) return 'AT_RISK'
  return 'BEHIND'
}

export async function listTargets(query: ListTargetsQuery) {
  const where: Prisma.RevenueTargetWhereInput = {}

  if (query.periodType) {
    where.periodType = query.periodType
  }

  if (query.userId) {
    where.userId = query.userId
  }

  if (query.teamId) {
    where.teamId = query.teamId
  }

  if (query.year) {
    const yearStart = new Date(Date.UTC(query.year, 0, 1))
    const yearEnd = new Date(Date.UTC(query.year, 11, 31, 23, 59, 59, 999))
    where.periodStart = {
      gte: yearStart,
      lte: yearEnd,
    }
  }

  if (query.month && query.year) {
    const monthStart = new Date(Date.UTC(query.year, query.month - 1, 1))
    const monthEnd = new Date(Date.UTC(query.year, query.month, 0, 23, 59, 59, 999))
    where.periodStart = {
      gte: monthStart,
      lte: monthEnd,
    }
  }

  if (query.quarter && query.year) {
    const startMonth = (query.quarter - 1) * 3
    const qStart = new Date(Date.UTC(query.year, startMonth, 1))
    const qEnd = new Date(Date.UTC(query.year, startMonth + 3, 0, 23, 59, 59, 999))
    where.periodStart = {
      gte: qStart,
      lte: qEnd,
    }
  }

  if (query.search) {
    const search = query.search.trim()
    where.OR = [
      { employee: { name: { contains: search, mode: 'insensitive' } } },
      { employee: { email: { contains: search, mode: 'insensitive' } } },
      { team: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const rawTargets = await prisma.revenueTarget.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: { select: { name: true } },
        },
      },
      team: {
        select: {
          id: true,
          name: true,
          _count: { select: { members: true } },
          members: { select: { id: true } },
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: { changes: true },
      },
    },
    orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
  })

  // Compute progress for each target
  const items: TargetProgressItem[] = []
  let totalQuota = 0
  let totalAchieved = 0
  let achievedCount = 0
  let onTrackCount = 0
  let atRiskCount = 0
  let behindCount = 0
  let topPerformer: TargetMetricsSummary['topPerformer'] = null

  for (const t of rawTargets) {
    const targetAmount = Number(t.amount)
    totalQuota += targetAmount

    // Identify user IDs whose deals contribute to this target
    let contributingUserIds: number[] = []
    if (t.userId) {
      contributingUserIds = [t.userId]
    } else if (t.team && t.team.members) {
      contributingUserIds = t.team.members.map((m) => m.id)
    }

    let achievedRevenue = 0
    let wonDealsCount = 0
    let pipelineRevenue = 0
    let openDealsCount = 0

    if (contributingUserIds.length > 0) {
      // Won deals within period
      const wonDeals = await prisma.deal.findMany({
        where: {
          ownerId: { in: contributingUserIds },
          status: 'WON',
          deletedAt: null,
          OR: [
            {
              closedAt: {
                gte: t.periodStart,
                lte: t.periodEnd,
              },
            },
            {
              closedAt: null,
              expectedCloseDate: {
                gte: t.periodStart,
                lte: t.periodEnd,
              },
            },
          ],
        },
        select: {
          closedRevenue: true,
          estimatedValue: true,
        },
      })

      wonDealsCount = wonDeals.length
      achievedRevenue = wonDeals.reduce((sum, d) => {
        const val = d.closedRevenue !== null ? Number(d.closedRevenue) : Number(d.estimatedValue || 0)
        return sum + val
      }, 0)

      // Open pipeline
      const openDeals = await prisma.deal.findMany({
        where: {
          ownerId: { in: contributingUserIds },
          status: 'OPEN',
          deletedAt: null,
        },
        select: {
          estimatedValue: true,
        },
      })

      openDealsCount = openDeals.length
      pipelineRevenue = openDeals.reduce((sum, d) => sum + Number(d.estimatedValue || 0), 0)
    }

    totalAchieved += achievedRevenue

    const progress = targetAmount > 0 ? (achievedRevenue / targetAmount) * 100 : 0
    const roundedProgress = Math.round(progress * 10) / 10
    const status = calculateTargetStatus(roundedProgress)

    if (status === 'ACHIEVED') achievedCount++
    else if (status === 'ON_TRACK') onTrackCount++
    else if (status === 'AT_RISK') atRiskCount++
    else behindCount++

    // Track top performer
    const candidateName = t.employee?.name || t.team?.name || 'Unnamed'
    const candidateId = t.employee?.id || t.team?.id || t.id
    if (!topPerformer || roundedProgress > topPerformer.attainment) {
      topPerformer = {
        id: candidateId,
        name: candidateName,
        attainment: roundedProgress,
        achieved: achievedRevenue,
        quota: targetAmount,
      }
    }

    items.push({
      id: t.id,
      userId: t.userId,
      teamId: t.teamId,
      periodType: t.periodType,
      periodStart: t.periodStart.toISOString().split('T')[0],
      periodEnd: t.periodEnd.toISOString().split('T')[0],
      amount: targetAmount,
      achievedRevenue,
      progressPercentage: roundedProgress,
      wonDealsCount,
      pipelineRevenue,
      openDealsCount,
      status,
      employee: t.employee
        ? {
            id: t.employee.id,
            name: t.employee.name,
            email: t.employee.email,
            role: t.employee.role,
          }
        : null,
      team: t.team
        ? {
            id: t.team.id,
            name: t.team.name,
            membersCount: t.team._count.members,
          }
        : null,
      createdBy: t.createdBy,
      changesCount: t._count.changes,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })
  }

  const overallAttainment =
    totalQuota > 0 ? Math.round((totalAchieved / totalQuota) * 1000) / 10 : 0

  // Calculate dynamic monthly trend data points for the 4 stat card sparklines
  const selectedYear = query.year || new Date().getFullYear()
  const monthlyQuotas = new Array(12).fill(0)
  const monthlyRevenues = new Array(12).fill(0)

  for (const t of rawTargets) {
    const tYear = t.periodStart.getUTCFullYear()
    if (tYear === selectedYear) {
      const m = t.periodStart.getUTCMonth()
      monthlyQuotas[m] += Number(t.amount)
    }
  }

  const dealsInYear = await prisma.deal.findMany({
    where: {
      status: 'WON',
      deletedAt: null,
      OR: [
        {
          closedAt: {
            gte: new Date(Date.UTC(selectedYear, 0, 1)),
            lte: new Date(Date.UTC(selectedYear, 11, 31, 23, 59, 59, 999)),
          },
        },
        {
          closedAt: null,
          expectedCloseDate: {
            gte: new Date(Date.UTC(selectedYear, 0, 1)),
            lte: new Date(Date.UTC(selectedYear, 11, 31, 23, 59, 59, 999)),
          },
        },
      ],
    },
    select: {
      closedRevenue: true,
      estimatedValue: true,
      closedAt: true,
      expectedCloseDate: true,
    },
  })

  for (const d of dealsInYear) {
    const dDate = d.closedAt || d.expectedCloseDate
    if (dDate) {
      const m = dDate.getUTCMonth()
      const val = d.closedRevenue !== null ? Number(d.closedRevenue) : Number(d.estimatedValue || 0)
      monthlyRevenues[m] += val
    }
  }

  const monthlyAttainments = monthlyQuotas.map((q, idx) => {
    const rev = monthlyRevenues[idx]
    if (q > 0) return Math.min(200, Math.round((rev / q) * 100))
    if (rev > 0) return 100
    return 0
  })

  const performanceTrend = items
    .map((t) => t.progressPercentage)
    .sort((a, b) => a - b)

  const summary: TargetMetricsSummary = {
    totalQuota,
    totalAchieved,
    overallAttainment,
    totalTargets: items.length,
    achievedCount,
    onTrackCount,
    atRiskCount,
    behindCount,
    topPerformer: topPerformer && topPerformer.attainment > 0 ? topPerformer : null,
    trends: {
      quota: monthlyQuotas,
      revenue: monthlyRevenues,
      attainment: monthlyAttainments,
      performance: performanceTrend.length > 0 ? performanceTrend : [0, 50, 100],
    },
  }

  return {
    targets: items,
    summary,
  }
}

export async function getTargetById(id: number) {
  const target = await prisma.revenueTarget.findUnique({
    where: { id },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: { select: { name: true } },
        },
      },
      team: {
        select: {
          id: true,
          name: true,
          members: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      changes: {
        include: {
          changedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { changedAt: 'desc' },
      },
    },
  })

  if (!target) {
    throw new TargetServiceError('Sales target not found', 404)
  }

  const targetAmount = Number(target.amount)
  let contributingUserIds: number[] = []
  if (target.userId) {
    contributingUserIds = [target.userId]
  } else if (target.team?.members) {
    contributingUserIds = target.team.members.map((m) => m.id)
  }

  const wonDeals = await prisma.deal.findMany({
    where: {
      ownerId: { in: contributingUserIds },
      status: 'WON',
      deletedAt: null,
      OR: [
        {
          closedAt: {
            gte: target.periodStart,
            lte: target.periodEnd,
          },
        },
        {
          closedAt: null,
          expectedCloseDate: {
            gte: target.periodStart,
            lte: target.periodEnd,
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      closedRevenue: true,
      estimatedValue: true,
      closedAt: true,
      owner: { select: { id: true, name: true } },
    },
    orderBy: { closedAt: 'desc' },
  })

  const achievedRevenue = wonDeals.reduce((sum, d) => {
    const val = d.closedRevenue !== null ? Number(d.closedRevenue) : Number(d.estimatedValue || 0)
    return sum + val
  }, 0)

  const progress = targetAmount > 0 ? (achievedRevenue / targetAmount) * 100 : 0
  const roundedProgress = Math.round(progress * 10) / 10

  return {
    id: target.id,
    userId: target.userId,
    teamId: target.teamId,
    periodType: target.periodType,
    periodStart: target.periodStart.toISOString().split('T')[0],
    periodEnd: target.periodEnd.toISOString().split('T')[0],
    amount: targetAmount,
    achievedRevenue,
    progressPercentage: roundedProgress,
    status: calculateTargetStatus(roundedProgress),
    employee: target.employee,
    team: target.team,
    createdBy: target.createdBy,
    wonDeals: wonDeals.map((d) => ({
      id: d.id,
      name: d.name,
      amount: d.closedRevenue !== null ? Number(d.closedRevenue) : Number(d.estimatedValue || 0),
      closedAt: d.closedAt?.toISOString() || null,
      owner: d.owner,
    })),
    changes: target.changes.map((c) => ({
      id: c.id,
      oldAmount: Number(c.oldAmount),
      newAmount: Number(c.newAmount),
      changedAt: c.changedAt.toISOString(),
      reason: c.reason,
      changedBy: c.changedBy,
    })),
    createdAt: target.createdAt.toISOString(),
    updatedAt: target.updatedAt.toISOString(),
  }
}

export async function createTarget(input: CreateTargetInput, actorId: number) {
  const start = new Date(input.periodStart)
  const end = new Date(input.periodEnd)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new TargetServiceError('Invalid period start or end date', 400)
  }

  if (start > end) {
    throw new TargetServiceError('Period start date must be before or equal to period end date', 400)
  }

  if (input.userId) {
    const userExists = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, name: true },
    })
    if (!userExists) {
      throw new TargetServiceError('Selected employee does not exist', 404)
    }

    // Check for duplicate target for the exact same period
    const existing = await prisma.revenueTarget.findFirst({
      where: {
        userId: input.userId,
        periodType: input.periodType,
        periodStart: start,
        periodEnd: end,
      },
    })
    if (existing) {
      throw new TargetServiceError('A target already exists for this employee for the selected period', 409)
    }
  }

  if (input.teamId) {
    const teamExists = await prisma.team.findUnique({
      where: { id: input.teamId },
      select: { id: true, name: true },
    })
    if (!teamExists) {
      throw new TargetServiceError('Selected team does not exist', 404)
    }

    const existing = await prisma.revenueTarget.findFirst({
      where: {
        teamId: input.teamId,
        periodType: input.periodType,
        periodStart: start,
        periodEnd: end,
      },
    })
    if (existing) {
      throw new TargetServiceError('A target already exists for this team for the selected period', 409)
    }
  }

  const target = await prisma.revenueTarget.create({
    data: {
      userId: input.userId ?? null,
      teamId: input.teamId ?? null,
      periodType: input.periodType,
      periodStart: start,
      periodEnd: end,
      amount: input.amount,
      createdById: actorId,
    },
    include: {
      employee: {
        select: { id: true, name: true, email: true },
      },
      team: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  // Log initial change history entry
  await prisma.targetChange.create({
    data: {
      targetId: target.id,
      oldAmount: 0,
      newAmount: input.amount,
      changedById: actorId,
      reason: input.reason || 'Initial target allocation',
    },
  })

  return {
    ...target,
    amount: Number(target.amount),
  }
}

export async function updateTarget(id: number, input: UpdateTargetInput, actorId: number) {
  const existing = await prisma.revenueTarget.findUnique({
    where: { id },
  })

  if (!existing) {
    throw new TargetServiceError('Sales target not found', 404)
  }

  const updateData: Prisma.RevenueTargetUpdateInput = {}

  if (input.userId !== undefined) {
    updateData.employee = input.userId ? { connect: { id: input.userId } } : { disconnect: true }
  }

  if (input.teamId !== undefined) {
    updateData.team = input.teamId ? { connect: { id: input.teamId } } : { disconnect: true }
  }

  if (input.periodType) {
    updateData.periodType = input.periodType
  }

  if (input.periodStart) {
    const start = new Date(input.periodStart)
    if (isNaN(start.getTime())) throw new TargetServiceError('Invalid period start date', 400)
    updateData.periodStart = start
  }

  if (input.periodEnd) {
    const end = new Date(input.periodEnd)
    if (isNaN(end.getTime())) throw new TargetServiceError('Invalid period end date', 400)
    updateData.periodEnd = end
  }

  const oldAmountNumber = Number(existing.amount)

  if (input.amount !== undefined) {
    updateData.amount = input.amount

    if (Math.abs(input.amount - oldAmountNumber) > 0.001) {
      // Record revision in TargetChange
      await prisma.targetChange.create({
        data: {
          targetId: existing.id,
          oldAmount: existing.amount,
          newAmount: input.amount,
          changedById: actorId,
          reason: input.reason || 'Quota adjustment',
        },
      })
    }
  }

  const updated = await prisma.revenueTarget.update({
    where: { id },
    data: updateData,
    include: {
      employee: {
        select: { id: true, name: true, email: true },
      },
      team: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  return {
    ...updated,
    amount: Number(updated.amount),
  }
}

export async function deleteTarget(id: number) {
  const existing = await prisma.revenueTarget.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!existing) {
    throw new TargetServiceError('Sales target not found', 404)
  }

  // TargetChange relations will cascade delete
  await prisma.revenueTarget.delete({
    where: { id },
  })

  return { success: true }
}

export async function getTargetOptions() {
  const [users, teams] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: {
          select: { name: true },
        },
        team: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.team.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ])

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  return {
    users,
    teams,
    years,
  }
}
