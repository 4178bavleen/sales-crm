import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type {
  CreateMeetingInput,
  ListMeetingsQuery,
  UpdateMeetingInput,
} from './meeting.validation.js'

export class MeetingServiceError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'MeetingServiceError'
    this.statusCode = statusCode
  }
}

const meetingInclude = {
  organizer: {
    select: { id: true, name: true, email: true },
  },
  lead: {
    select: { id: true, contactName: true, companyName: true, email: true, phone: true },
  },
  deal: {
    select: { id: true, name: true, estimatedValue: true },
  },
  company: {
    select: { id: true, name: true },
  },
  customer: {
    select: {
      id: true,
      primaryContact: {
        select: { id: true, fullName: true, email: true, phone: true },
      },
      company: {
        select: { id: true, name: true },
      },
    },
  },
  participants: {
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      contact: {
        select: { id: true, fullName: true, email: true, phone: true },
      },
    },
  },
  followUpTasks: {
    select: { id: true, title: true, status: true, priority: true, dueAt: true },
  },
} as const

export async function listMeetings(query: ListMeetingsQuery) {
  const where: Prisma.MeetingWhereInput = {}

  if (query.status) {
    where.status = query.status
  }

  if (query.organizerId) {
    where.organizerId = query.organizerId
  }

  if (query.leadId) {
    where.leadId = query.leadId
  }

  if (query.dealId) {
    where.dealId = query.dealId
  }

  if (query.dateFrom || query.dateTo) {
    where.startsAt = {}
    if (query.dateFrom) where.startsAt.gte = query.dateFrom
    if (query.dateTo) where.startsAt.lte = query.dateTo
  }

  if (query.search?.trim()) {
    const s = query.search.trim()
    where.OR = [
      { title: { contains: s, mode: 'insensitive' } },
      { location: { contains: s, mode: 'insensitive' } },
      { notes: { contains: s, mode: 'insensitive' } },
      { lead: { contactName: { contains: s, mode: 'insensitive' } } },
      { lead: { companyName: { contains: s, mode: 'insensitive' } } },
      { deal: { name: { contains: s, mode: 'insensitive' } } },
    ]
  }

  const page = query.page || 1
  const limit = query.limit || 50
  const skip = (page - 1) * limit

  const [meetings, total, plannedCount, completedCount, cancelledCount] =
    await Promise.all([
      prisma.meeting.findMany({
        where,
        include: meetingInclude,
        orderBy: { startsAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.meeting.count({ where }),
      prisma.meeting.count({ where: { status: 'PLANNED' } }),
      prisma.meeting.count({ where: { status: 'COMPLETED' } }),
      prisma.meeting.count({ where: { status: { in: ['CANCELLED', 'RESCHEDULED'] } } }),
    ])

  return {
    meetings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    metrics: {
      total,
      planned: plannedCount,
      completed: completedCount,
      cancelled: cancelledCount,
    },
  }
}

export async function getMeetingById(id: number) {
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: meetingInclude,
  })

  if (!meeting) {
    throw new MeetingServiceError('Meeting not found', 404)
  }

  return meeting
}

export async function createMeeting(data: CreateMeetingInput, actorId: number) {
  // Validate relations if passed
  if (data.leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: data.leadId } })
    if (!lead) throw new MeetingServiceError('Associated lead not found', 400)
  }
  if (data.dealId) {
    const deal = await prisma.deal.findUnique({ where: { id: data.dealId } })
    if (!deal) throw new MeetingServiceError('Associated deal not found', 400)
  }

  const { participantUserIds, participantContactIds, ...meetingData } = data

  const meeting = await prisma.$transaction(async (tx) => {
    const created = await tx.meeting.create({
      data: {
        ...meetingData,
        organizerId: actorId,
        meetingLink: meetingData.meetingLink || null,
        location: meetingData.location || null,
        notes: meetingData.notes || null,
        outcome: meetingData.outcome || null,
        nextSteps: meetingData.nextSteps || null,
      },
    })

    const participantsData: Array<{ meetingId: number; userId?: number; contactId?: number }> = []

    if (participantUserIds?.length) {
      for (const uId of participantUserIds) {
        participantsData.push({ meetingId: created.id, userId: uId })
      }
    }

    if (participantContactIds?.length) {
      for (const cId of participantContactIds) {
        participantsData.push({ meetingId: created.id, contactId: cId })
      }
    }

    if (participantsData.length > 0) {
      await tx.meetingParticipant.createMany({
        data: participantsData,
        skipDuplicates: true,
      })
    }

    return created
  })

  return getMeetingById(meeting.id)
}

export async function updateMeeting(id: number, data: UpdateMeetingInput) {
  const existing = await prisma.meeting.findUnique({ where: { id } })
  if (!existing) {
    throw new MeetingServiceError('Meeting not found', 404)
  }

  const { participantUserIds, participantContactIds, ...meetingData } = data

  await prisma.$transaction(async (tx) => {
    await tx.meeting.update({
      where: { id },
      data: {
        ...meetingData,
        meetingLink:
          meetingData.meetingLink !== undefined
            ? meetingData.meetingLink || null
            : undefined,
        location:
          meetingData.location !== undefined
            ? meetingData.location || null
            : undefined,
        notes:
          meetingData.notes !== undefined
            ? meetingData.notes || null
            : undefined,
        outcome:
          meetingData.outcome !== undefined
            ? meetingData.outcome || null
            : undefined,
        nextSteps:
          meetingData.nextSteps !== undefined
            ? meetingData.nextSteps || null
            : undefined,
      },
    })

    // If participant lists provided, replace
    if (participantUserIds !== undefined || participantContactIds !== undefined) {
      await tx.meetingParticipant.deleteMany({ where: { meetingId: id } })

      const participantsData: Array<{ meetingId: number; userId?: number; contactId?: number }> = []
      if (participantUserIds?.length) {
        for (const uId of participantUserIds) {
          participantsData.push({ meetingId: id, userId: uId })
        }
      }
      if (participantContactIds?.length) {
        for (const cId of participantContactIds) {
          participantsData.push({ meetingId: id, contactId: cId })
        }
      }
      if (participantsData.length > 0) {
        await tx.meetingParticipant.createMany({
          data: participantsData,
          skipDuplicates: true,
        })
      }
    }
  })

  return getMeetingById(id)
}

export async function deleteMeeting(id: number) {
  const existing = await prisma.meeting.findUnique({ where: { id } })
  if (!existing) {
    throw new MeetingServiceError('Meeting not found', 404)
  }

  await prisma.meeting.delete({
    where: { id },
  })

  return { id, deleted: true }
}

export async function getMeetingOptions() {
  const [users, leads, deals, contacts] = await Promise.all([
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
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 100,
    }),
    prisma.contact.findMany({
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
      take: 100,
    }),
  ])

  return { users, leads, deals, contacts }
}
