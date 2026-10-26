import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import * as XLSX from 'xlsx'
import type { ReportQuery } from './reports.validation.js'

export class ReportServiceError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'ReportServiceError'
    this.statusCode = statusCode
  }
}

export function resolveDateRange(query: ReportQuery): { start: Date | null; end: Date | null } {
  const now = new Date()
  const period = query.period || 'this_month'

  if (period === 'all') {
    return { start: null, end: null }
  }

  if (period === 'custom') {
    const start = query.startDate ? new Date(query.startDate) : null
    const end = query.endDate ? new Date(query.endDate) : null
    if (end) {
      end.setHours(23, 59, 59, 999)
    }
    return { start, end }
  }

  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    return { start, end }
  }

  if (period === 'last_7_days') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    start.setHours(0, 0, 0, 0)
    return { start, end: now }
  }

  if (period === 'last_30_days') {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    start.setHours(0, 0, 0, 0)
    return { start, end: now }
  }

  if (period === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end }
  }

  if (period === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    return { start, end }
  }

  if (period === 'this_quarter') {
    const quarter = Math.floor(now.getMonth() / 3)
    const start = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0, 0)
    const end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999)
    return { start, end }
  }

  if (period === 'this_year') {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
    return { start, end }
  }

  return { start: null, end: null }
}

function buildDateFilter(start: Date | null, end: Date | null, field: string = 'createdAt') {
  if (!start && !end) return {}
  return {
    [field]: {
      ...(start ? { gte: start } : {}),
      ...(end ? { lte: end } : {}),
    },
  }
}

export async function getReportFilterOptions() {
  const [users, teams, sources, stages] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.team.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.leadSource.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.pipelineStage.findMany({
      where: { isActive: true },
      select: { id: true, name: true, position: true, kind: true },
      orderBy: { position: 'asc' },
    }),
  ])

  return { users, teams, sources, stages }
}

export async function getOverviewReport(query: ReportQuery) {
  const { start, end } = resolveDateRange(query)

  const leadWhere: Prisma.LeadWhereInput = {
    deletedAt: null,
    ...buildDateFilter(start, end, 'createdAt'),
    ...(query.userId ? { ownerId: query.userId } : {}),
  }

  const dealWhere: Prisma.DealWhereInput = {
    deletedAt: null,
    ...buildDateFilter(start, end, 'createdAt'),
    ...(query.userId ? { ownerId: query.userId } : {}),
  }

  const [
    totalLeads,
    convertedLeads,
    qualifiedLeads,
    disqualifiedLeads,
    deals,
    stages,
    completedTasksCount,
    completedMeetingsCount,
  ] = await Promise.all([
    prisma.lead.count({ where: leadWhere }),
    prisma.lead.count({ where: { ...leadWhere, status: 'CONVERTED' } }),
    prisma.lead.count({ where: { ...leadWhere, status: 'QUALIFIED' } }),
    prisma.lead.count({ where: { ...leadWhere, status: 'DISQUALIFIED' } }),
    prisma.deal.findMany({
      where: dealWhere,
      select: {
        id: true,
        status: true,
        estimatedValue: true,
        closedRevenue: true,
        closedAt: true,
        createdAt: true,
        stageId: true,
        stage: { select: { id: true, name: true, kind: true, position: true } },
        owner: { select: { id: true, name: true } },
      },
    }),
    prisma.pipelineStage.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
      select: { id: true, name: true, position: true, kind: true },
    }),
    prisma.task.count({
      where: {
        status: 'COMPLETED',
        ...buildDateFilter(start, end, 'updatedAt'),
        ...(query.userId ? { assignedToId: query.userId } : {}),
      },
    }),
    prisma.meeting.count({
      where: {
        status: 'COMPLETED',
        ...buildDateFilter(start, end, 'startsAt'),
        ...(query.userId ? { organizerId: query.userId } : {}),
      },
    }),
  ])

  // Process deals summary
  let totalPipelineValue = 0
  let wonRevenue = 0
  let lostValue = 0
  let openDealsCount = 0
  let wonDealsCount = 0
  let lostDealsCount = 0

  const stageCounts: Record<number, { count: number; value: number }> = {}
  stages.forEach((s) => {
    stageCounts[s.id] = { count: 0, value: 0 }
  })

  deals.forEach((d) => {
    const estVal = Number(d.estimatedValue || 0)
    const closedRev = Number(d.closedRevenue || estVal)

    if (stageCounts[d.stageId]) {
      stageCounts[d.stageId].count += 1
      stageCounts[d.stageId].value += estVal
    }

    if (d.status === 'OPEN') {
      openDealsCount += 1
      totalPipelineValue += estVal
    } else if (d.status === 'WON') {
      wonDealsCount += 1
      wonRevenue += closedRev
    } else if (d.status === 'LOST') {
      lostDealsCount += 1
      lostValue += estVal
    }
  })

  const closedDealsTotal = wonDealsCount + lostDealsCount
  const winRate = closedDealsTotal > 0 ? (wonDealsCount / closedDealsTotal) * 100 : 0
  const leadConversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
  const averageDealSize = wonDealsCount > 0 ? wonRevenue / wonDealsCount : 0

  // Stage distribution list
  const stageDistribution = stages.map((s) => ({
    stageId: s.id,
    stageName: s.name,
    position: s.position,
    kind: s.kind,
    count: stageCounts[s.id]?.count || 0,
    totalValue: stageCounts[s.id]?.value || 0,
  }))

  // Monthly trends for the last 6 months
  const monthsTrend = await generateMonthlyTrends(query.userId)

  return {
    summary: {
      totalLeads,
      convertedLeads,
      qualifiedLeads,
      disqualifiedLeads,
      leadConversionRate: Number(leadConversionRate.toFixed(1)),
      totalDeals: deals.length,
      openDeals: openDealsCount,
      wonDeals: wonDealsCount,
      lostDeals: lostDealsCount,
      totalPipelineValue,
      wonRevenue,
      lostValue,
      winRate: Number(winRate.toFixed(1)),
      averageDealSize: Number(averageDealSize.toFixed(2)),
      totalTasksCompleted: completedTasksCount,
      totalMeetingsConducted: completedMeetingsCount,
    },
    stageDistribution,
    trends: monthsTrend,
  }
}

async function generateMonthlyTrends(userId?: number) {
  const months = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
    const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' })

    months.push({ label, monthStart, monthEnd })
  }

  const results = await Promise.all(
    months.map(async ({ label, monthStart, monthEnd }) => {
      const [leadsCount, convertedCount, wonDeals] = await Promise.all([
        prisma.lead.count({
          where: {
            deletedAt: null,
            createdAt: { gte: monthStart, lte: monthEnd },
            ...(userId ? { ownerId: userId } : {}),
          },
        }),
        prisma.lead.count({
          where: {
            deletedAt: null,
            status: 'CONVERTED',
            createdAt: { gte: monthStart, lte: monthEnd },
            ...(userId ? { ownerId: userId } : {}),
          },
        }),
        prisma.deal.findMany({
          where: {
            deletedAt: null,
            status: 'WON',
            createdAt: { gte: monthStart, lte: monthEnd },
            ...(userId ? { ownerId: userId } : {}),
          },
          select: { estimatedValue: true, closedRevenue: true },
        }),
      ])

      const revenue = wonDeals.reduce((sum, d) => sum + Number(d.closedRevenue || d.estimatedValue || 0), 0)

      return {
        month: label,
        leads: leadsCount,
        conversions: convertedCount,
        wonRevenue: revenue,
        wonDealsCount: wonDeals.length,
      }
    }),
  )

  return results
}

export async function getLeadsReport(query: ReportQuery) {
  const { start, end } = resolveDateRange(query)

  const leadWhere: Prisma.LeadWhereInput = {
    deletedAt: null,
    ...buildDateFilter(start, end, 'createdAt'),
    ...(query.userId ? { ownerId: query.userId } : {}),
  }

  const [
    totalLeads,
    byStatusGroups,
    byPriorityGroups,
    sources,
    leadsWithSources,
    disqualifiedReasons,
  ] = await Promise.all([
    prisma.lead.count({ where: leadWhere }),
    prisma.lead.groupBy({
      by: ['status'],
      where: leadWhere,
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ['priority'],
      where: leadWhere,
      _count: { _all: true },
    }),
    prisma.leadSource.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    }),
    prisma.lead.findMany({
      where: leadWhere,
      select: { sourceId: true, status: true },
    }),
    prisma.lead.findMany({
      where: {
        ...leadWhere,
        status: 'DISQUALIFIED',
        disqualifyReasonId: { not: null },
      },
      select: {
        disqualifyReason: { select: { id: true, name: true } },
      },
    }),
  ])

  // Status mapping
  const statusCounts: Record<string, number> = {
    NEW: 0,
    CONTACTED: 0,
    QUALIFIED: 0,
    DISQUALIFIED: 0,
    CONVERTED: 0,
  }
  byStatusGroups.forEach((g) => {
    statusCounts[g.status] = g._count._all
  })

  // Priority mapping
  const priorityCounts: Record<string, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    URGENT: 0,
  }
  byPriorityGroups.forEach((g) => {
    priorityCounts[g.priority] = g._count._all
  })

  // By Source mapping
  const sourceStats: Record<number, { count: number; converted: number }> = {}
  sources.forEach((s) => {
    sourceStats[s.id] = { count: 0, converted: 0 }
  })
  let unassignedSourceCount = 0
  let unassignedSourceConverted = 0

  leadsWithSources.forEach((l) => {
    if (l.sourceId && sourceStats[l.sourceId]) {
      sourceStats[l.sourceId].count += 1
      if (l.status === 'CONVERTED') {
        sourceStats[l.sourceId].converted += 1
      }
    } else {
      unassignedSourceCount += 1
      if (l.status === 'CONVERTED') {
        unassignedSourceConverted += 1
      }
    }
  })

  const bySource = sources.map((s) => {
    const count = sourceStats[s.id]?.count || 0
    const converted = sourceStats[s.id]?.converted || 0
    const rate = count > 0 ? (converted / count) * 100 : 0
    return {
      sourceId: s.id,
      sourceName: s.name,
      count,
      convertedCount: converted,
      conversionRate: Number(rate.toFixed(1)),
    }
  })

  if (unassignedSourceCount > 0) {
    bySource.push({
      sourceId: 0,
      sourceName: 'Direct / Other',
      count: unassignedSourceCount,
      convertedCount: unassignedSourceConverted,
      conversionRate: Number(((unassignedSourceConverted / unassignedSourceCount) * 100).toFixed(1)),
    })
  }

  // Disqualification reasons breakdown
  const reasonMap: Record<string, number> = {}
  disqualifiedReasons.forEach((d) => {
    const name = d.disqualifyReason?.name || 'Unspecified'
    reasonMap[name] = (reasonMap[name] || 0) + 1
  })
  const disqualificationAnalysis = Object.entries(reasonMap).map(([reason, count]) => ({
    reason,
    count,
  }))

  const convertedCount = statusCounts.CONVERTED || 0
  const conversionRate = totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0

  return {
    totalLeads,
    convertedLeads: convertedCount,
    conversionRate: Number(conversionRate.toFixed(1)),
    byStatus: Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: totalLeads > 0 ? Number(((count / totalLeads) * 100).toFixed(1)) : 0,
    })),
    byPriority: Object.entries(priorityCounts).map(([priority, count]) => ({
      priority,
      count,
      percentage: totalLeads > 0 ? Number(((count / totalLeads) * 100).toFixed(1)) : 0,
    })),
    bySource,
    disqualificationAnalysis,
  }
}

export async function getDealsReport(query: ReportQuery) {
  const { start, end } = resolveDateRange(query)

  const dealWhere: Prisma.DealWhereInput = {
    deletedAt: null,
    ...buildDateFilter(start, end, 'createdAt'),
    ...(query.userId ? { ownerId: query.userId } : {}),
  }

  const [deals, stages, lostReasons] = await Promise.all([
    prisma.deal.findMany({
      where: dealWhere,
      select: {
        id: true,
        name: true,
        status: true,
        estimatedValue: true,
        closedRevenue: true,
        closedAt: true,
        createdAt: true,
        stageId: true,
        lostReasonId: true,
        lostReason: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, position: true, kind: true } },
      },
    }),
    prisma.pipelineStage.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
      select: { id: true, name: true, position: true, kind: true },
    }),
    prisma.reason.findMany({
      where: { type: 'DEAL_LOST', isActive: true },
      select: { id: true, name: true },
    }),
  ])

  let totalPipelineValue = 0
  let wonRevenue = 0
  let lostValue = 0
  let openDeals = 0
  let wonDeals = 0
  let lostDeals = 0
  let totalSalesCycleDays = 0
  let wonWithCycleCount = 0

  const stageMap: Record<number, { count: number; totalValue: number }> = {}
  stages.forEach((st) => {
    stageMap[st.id] = { count: 0, totalValue: 0 }
  })

  // Size distribution brackets
  const sizeBrackets = {
    micro: { label: 'Under $5,000', count: 0, value: 0 },
    small: { label: '$5,000 - $20,000', count: 0, value: 0 },
    medium: { label: '$20,000 - $50,000', count: 0, value: 0 },
    large: { label: 'Over $50,000', count: 0, value: 0 },
  }

  const lostReasonMap: Record<string, { count: number; value: number }> = {}

  deals.forEach((d) => {
    const estVal = Number(d.estimatedValue || 0)
    const closedRev = Number(d.closedRevenue || estVal)

    if (stageMap[d.stageId]) {
      stageMap[d.stageId].count += 1
      stageMap[d.stageId].totalValue += estVal
    }

    if (d.status === 'OPEN') {
      openDeals += 1
      totalPipelineValue += estVal
    } else if (d.status === 'WON') {
      wonDeals += 1
      wonRevenue += closedRev

      if (d.closedAt && d.createdAt) {
        const diffMs = new Date(d.closedAt).getTime() - new Date(d.createdAt).getTime()
        const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)))
        totalSalesCycleDays += diffDays
        wonWithCycleCount += 1
      }
    } else if (d.status === 'LOST') {
      lostDeals += 1
      lostValue += estVal

      const reasonName = d.lostReason?.name || 'Unspecified'
      if (!lostReasonMap[reasonName]) {
        lostReasonMap[reasonName] = { count: 0, value: 0 }
      }
      lostReasonMap[reasonName].count += 1
      lostReasonMap[reasonName].value += estVal
    }

    // Size bracket
    if (estVal < 5000) {
      sizeBrackets.micro.count += 1
      sizeBrackets.micro.value += estVal
    } else if (estVal <= 20000) {
      sizeBrackets.small.count += 1
      sizeBrackets.small.value += estVal
    } else if (estVal <= 50000) {
      sizeBrackets.medium.count += 1
      sizeBrackets.medium.value += estVal
    } else {
      sizeBrackets.large.count += 1
      sizeBrackets.large.value += estVal
    }
  })

  const closedDeals = wonDeals + lostDeals
  const winRate = closedDeals > 0 ? (wonDeals / closedDeals) * 100 : 0
  const avgCycleDays = wonWithCycleCount > 0 ? Math.round(totalSalesCycleDays / wonWithCycleCount) : 0

  const stageDistribution = stages.map((st) => {
    const stats = stageMap[st.id] || { count: 0, totalValue: 0 }
    return {
      stageId: st.id,
      stageName: st.name,
      position: st.position,
      kind: st.kind,
      count: stats.count,
      totalValue: stats.totalValue,
      averageValue: stats.count > 0 ? Number((stats.totalValue / stats.count).toFixed(2)) : 0,
    }
  })

  const lossReasonsAnalysis = Object.entries(lostReasonMap).map(([reason, stats]) => ({
    reason,
    count: stats.count,
    lostValue: stats.value,
  }))

  return {
    totalDeals: deals.length,
    openDeals,
    wonDeals,
    lostDeals,
    totalPipelineValue,
    wonRevenue,
    lostValue,
    winRate: Number(winRate.toFixed(1)),
    averageSalesCycleDays: avgCycleDays,
    stageDistribution,
    lossReasonsAnalysis,
    sizeDistribution: Object.values(sizeBrackets),
  }
}

export async function getRepPerformanceReport(query: ReportQuery) {
  const { start, end } = resolveDateRange(query)

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      ...(query.userId ? { id: query.userId } : {}),
      ...(query.teamId ? { teamId: query.teamId } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: { select: { name: true } },
      team: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  })

  const repPerformance = await Promise.all(
    users.map(async (user) => {
      const [leads, deals, targets, tasksCompleted, meetingsConducted] = await Promise.all([
        prisma.lead.findMany({
          where: {
            ownerId: user.id,
            deletedAt: null,
            ...buildDateFilter(start, end, 'createdAt'),
          },
          select: { id: true, status: true },
        }),
        prisma.deal.findMany({
          where: {
            ownerId: user.id,
            deletedAt: null,
            ...buildDateFilter(start, end, 'createdAt'),
          },
          select: {
            id: true,
            status: true,
            estimatedValue: true,
            closedRevenue: true,
          },
        }),
        prisma.revenueTarget.findMany({
          where: {
            userId: user.id,
            ...(start || end
              ? {
                  AND: [
                    ...(start ? [{ periodEnd: { gte: start } }] : []),
                    ...(end ? [{ periodStart: { lte: end } }] : []),
                  ],
                }
              : {}),
          },
          select: { amount: true },
        }),
        prisma.task.count({
          where: {
            assignedToId: user.id,
            status: 'COMPLETED',
            ...buildDateFilter(start, end, 'updatedAt'),
          },
        }),
        prisma.meeting.count({
          where: {
            organizerId: user.id,
            status: 'COMPLETED',
            ...buildDateFilter(start, end, 'startsAt'),
          },
        }),
      ])

      const totalLeads = leads.length
      const convertedLeads = leads.filter((l) => l.status === 'CONVERTED').length
      const leadConversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0

      const wonDealsList = deals.filter((d) => d.status === 'WON')
      const lostDealsList = deals.filter((d) => d.status === 'LOST')
      const openDealsList = deals.filter((d) => d.status === 'OPEN')

      const revenueAchieved = wonDealsList.reduce(
        (sum, d) => sum + Number(d.closedRevenue || d.estimatedValue || 0),
        0,
      )
      const pipelineValue = openDealsList.reduce((sum, d) => sum + Number(d.estimatedValue || 0), 0)

      const closedDeals = wonDealsList.length + lostDealsList.length
      const winRate = closedDeals > 0 ? (wonDealsList.length / closedDeals) * 100 : 0

      const targetQuota = targets.reduce((sum, t) => sum + Number(t.amount || 0), 0)
      const targetAttainment = targetQuota > 0 ? (revenueAchieved / targetQuota) * 100 : 0

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        teamName: user.team?.name || null,
        leadsAssigned: totalLeads,
        leadsConverted: convertedLeads,
        leadConversionRate: Number(leadConversionRate.toFixed(1)),
        dealsCreated: deals.length,
        dealsWon: wonDealsList.length,
        dealsLost: lostDealsList.length,
        openDeals: openDealsList.length,
        pipelineValue,
        revenueAchieved,
        targetQuota,
        targetAttainment: Number(targetAttainment.toFixed(1)),
        winRate: Number(winRate.toFixed(1)),
        tasksCompleted,
        meetingsHeld: meetingsConducted,
      }
    }),
  )

  // Sort by revenue achieved descending
  repPerformance.sort((a, b) => b.revenueAchieved - a.revenueAchieved)

  return repPerformance
}

export async function exportReportToExcel(query: ReportQuery): Promise<Buffer> {
  const [overview, leads, deals, reps] = await Promise.all([
    getOverviewReport(query),
    getLeadsReport(query),
    getDealsReport(query),
    getRepPerformanceReport(query),
  ])

  const wb = XLSX.utils.book_new()

  // 1. Executive Summary Sheet
  const summaryRows = [
    { Metric: 'Report Period', Value: query.period || 'this_month' },
    { Metric: 'Generated At', Value: new Date().toISOString() },
    { Metric: '', Value: '' },
    { Metric: 'Total Leads Generated', Value: overview.summary.totalLeads },
    { Metric: 'Leads Converted', Value: overview.summary.convertedLeads },
    { Metric: 'Lead Conversion Rate', Value: `${overview.summary.leadConversionRate}%` },
    { Metric: 'Total Pipeline Value ($)', Value: overview.summary.totalPipelineValue },
    { Metric: 'Closed Won Revenue ($)', Value: overview.summary.wonRevenue },
    { Metric: 'Won Deals Count', Value: overview.summary.wonDeals },
    { Metric: 'Lost Deals Count', Value: overview.summary.lostDeals },
    { Metric: 'Win Rate', Value: `${overview.summary.winRate}%` },
    { Metric: 'Average Deal Size ($)', Value: overview.summary.averageDealSize },
    { Metric: 'Tasks Completed', Value: overview.summary.totalTasksCompleted },
    { Metric: 'Meetings Conducted', Value: overview.summary.totalMeetingsConducted },
  ]
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary')

  // 2. Leads by Source Sheet
  const leadSourceRows = leads.bySource.map((s) => ({
    Source: s.sourceName,
    'Total Leads': s.count,
    Converted: s.convertedCount,
    'Conversion Rate (%)': `${s.conversionRate}%`,
  }))
  const wsLeads = XLSX.utils.json_to_sheet(leadSourceRows)
  XLSX.utils.book_append_sheet(wb, wsLeads, 'Leads by Source')

  // 3. Pipeline Stages Sheet
  const stageRows = deals.stageDistribution.map((st) => ({
    Stage: st.stageName,
    Position: st.position,
    Kind: st.kind,
    'Deals Count': st.count,
    'Total Value ($)': st.totalValue,
    'Average Value ($)': st.averageValue,
  }))
  const wsStages = XLSX.utils.json_to_sheet(stageRows)
  XLSX.utils.book_append_sheet(wb, wsStages, 'Pipeline by Stage')

  // 4. Sales Rep Performance Sheet
  const repRows = reps.map((r) => ({
    'Representative Name': r.name,
    Email: r.email,
    Role: r.role,
    Team: r.teamName || 'None',
    'Leads Assigned': r.leadsAssigned,
    'Leads Converted': r.leadsConverted,
    'Lead Conv. Rate (%)': `${r.leadConversionRate}%`,
    'Deals Won': r.dealsWon,
    'Deals Lost': r.dealsLost,
    'Win Rate (%)': `${r.winRate}%`,
    'Revenue Achieved ($)': r.revenueAchieved,
    'Target Quota ($)': r.targetQuota,
    'Target Attainment (%)': `${r.targetAttainment}%`,
    'Tasks Completed': r.tasksCompleted,
    'Meetings Held': r.meetingsHeld,
  }))
  const wsReps = XLSX.utils.json_to_sheet(repRows)
  XLSX.utils.book_append_sheet(wb, wsReps, 'Rep Performance')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}
