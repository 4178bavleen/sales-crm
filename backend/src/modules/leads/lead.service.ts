
import { prisma } from '../../config/database.js'
import type {
  CreateLeadInput,
  ListLeadsInput,
  UpdateLeadInput,
} from './lead.validation.js'

import type { UpdateLeadStatusInput } from './lead.validation.js'
export class LeadServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message)
    this.name = 'LeadServiceError'
  }
}

const leadSelect = {
  id: true,
  contactName: true,
  companyName: true,
  phone: true,
  email: true,
  priority: true,
  status: true,
  notes: true,
  sourceId: true,
  productServiceId: true,
  createdById: true,
  ownerId: true,
  nextFollowUpAt: true,
  disqualifyReasonId: true,
  disqualifyNote: true,
  disqualifiedAt: true,
  createdAt: true,
  updatedAt: true,
  source: {
    select: { id: true, name: true },
  },
  productService: {
    select: { id: true, name: true },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  owner: {
    select: { id: true, name: true, email: true },
  },
} as const

function normalizePhone(phone?: string | null) {
  return phone ? phone.replace(/\D/g, '') || null : null
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null
}

function normalizeCompany(company?: string | null) {
  return company?.trim().toLowerCase() || null
}

async function validateReferences(input: {
  sourceId?: number | null
  productServiceId?: number | null
  ownerId?: number | null
}) {
  if (input.sourceId != null) {
    const source = await prisma.leadSource.findUnique({
      where: { id: input.sourceId },
      select: { id: true },
    })

    if (!source) {
      throw new LeadServiceError('Lead source not found', 400)
    }
  }

  if (input.productServiceId != null) {
    const productService = await prisma.productService.findUnique({
      where: { id: input.productServiceId },
      select: { id: true },
    })

    if (!productService) {
      throw new LeadServiceError('Product or service not found', 400)
    }
  }

  if (input.ownerId != null) {
    const owner = await prisma.user.findFirst({
      where: {
        id: input.ownerId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (!owner) {
      throw new LeadServiceError(
        'Assigned user does not exist or is inactive',
        400,
      )
    }
  }
}

export async function createLead(
  input: CreateLeadInput,
  actorId: number,
) {
  const creator = await prisma.user.findFirst({
    where: {
      id: actorId,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  })

  if (!creator) {
    throw new LeadServiceError('Authenticated user not found or inactive', 401)
  }

  await validateReferences({
    sourceId: input.sourceId,
    productServiceId: input.productServiceId,
    ownerId: input.ownerId,
  })

  const email = normalizeEmail(input.email)
  const phone = normalizePhone(input.phone)

  return prisma.lead.create({
    data: {
      contactName: input.contactName,
      companyName: input.companyName || null,
      phone: input.phone || null,
      email,
      normalizedEmail: email,
      normalizedPhone: phone,
      normalizedCompany: normalizeCompany(input.companyName),
      sourceId: input.sourceId ?? null,
      productServiceId: input.productServiceId ?? null,
      priority: input.priority,
      notes: input.notes || null,
      ownerId: input.ownerId ?? null,
      nextFollowUpAt: input.nextFollowUpAt ?? null,
      noFollowUpReasonId: input.noFollowUpReasonId ?? null,
      createdById: actorId,
    },
    select: leadSelect,
  })
}

export async function getLeads(input: ListLeadsInput) {
  const { page, limit, search, status, priority, ownerId, sourceId } = input

  const where = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(ownerId !== undefined ? { ownerId } : {}),
    ...(sourceId !== undefined ? { sourceId } : {}),
    ...(search
      ? {
          OR: [
            { contactName: { contains: search, mode: 'insensitive' as const } },
            { companyName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: leadSelect,
    }),
    prisma.lead.count({ where }),
  ])

  return {
    leads,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function getLeadById(id: number) {
  const lead = await prisma.lead.findFirst({
    where: { id, deletedAt: null },
    select: {
      ...leadSelect,
      assignments: {
        orderBy: { assignedAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!lead) {
    throw new LeadServiceError('Lead not found', 404)
  }

  return lead
}

export async function updateLead(
  id: number,
  input: UpdateLeadInput,
) {
  const existing = await prisma.lead.findFirst({
    where: { id, deletedAt: null },
  })

  if (!existing) {
    throw new LeadServiceError('Lead not found', 404)
  }

  await validateReferences({
    sourceId: input.sourceId,
    productServiceId: input.productServiceId,
  })

  const data: {
    contactName?: string
    companyName?: string | null
    phone?: string | null
    email?: string | null
    normalizedPhone?: string | null
    normalizedEmail?: string | null
    normalizedCompany?: string | null
    sourceId?: number | null
    productServiceId?: number | null
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    notes?: string | null
    nextFollowUpAt?: Date | null
    noFollowUpReasonId?: number | null
  } = {}

  if (input.contactName !== undefined) {
    data.contactName = input.contactName
  }

  if (input.companyName !== undefined) {
    data.companyName = input.companyName
    data.normalizedCompany = normalizeCompany(input.companyName)
  }

  if (input.phone !== undefined) {
    data.phone = input.phone
    data.normalizedPhone = normalizePhone(input.phone)
  }

  if (input.email !== undefined) {
    data.email = normalizeEmail(input.email)
    data.normalizedEmail = normalizeEmail(input.email)
  }

  if (input.sourceId !== undefined) data.sourceId = input.sourceId
  if (input.productServiceId !== undefined) {
    data.productServiceId = input.productServiceId
  }
  if (input.priority !== undefined) data.priority = input.priority
  if (input.notes !== undefined) data.notes = input.notes
  if (input.nextFollowUpAt !== undefined) {
    data.nextFollowUpAt = input.nextFollowUpAt
  }
  if (input.noFollowUpReasonId !== undefined) {
    data.noFollowUpReasonId = input.noFollowUpReasonId
  }

  return prisma.lead.update({
    where: { id },
    data,
    select: leadSelect,
  })
}

export async function deleteLead(id: number) {
  const lead = await prisma.lead.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  })

  if (!lead) {
    throw new LeadServiceError('Lead not found', 404)
  }

  await prisma.lead.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  return { id, deleted: true }
}
export async function assignLead(
  leadId: number,
  ownerId: number | null,
  assignedById: number,
  note?: string,
) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, deletedAt: null },
    select: { id: true, ownerId: true },
  })

  if (!lead) {
    throw new LeadServiceError('Lead not found', 404)
  }

  if (ownerId !== null) {
    const owner = await prisma.user.findFirst({
      where: {
        id: ownerId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (!owner) {
      throw new LeadServiceError(
        'Assigned user does not exist or is inactive',
        400,
      )
    }
  }

  if (lead.ownerId === ownerId) {
    return getLeadById(leadId)
  }

  await prisma.$transaction(async (tx) => {
    const activeAssignment = await tx.leadAssignment.findFirst({
      where: {
        leadId,
        unassignedAt: null,
      },
      orderBy: { assignedAt: 'desc' },
      select: { id: true },
    })

    if (activeAssignment) {
      await tx.leadAssignment.update({
        where: { id: activeAssignment.id },
        data: { unassignedAt: new Date() },
      })
    }

    await tx.lead.update({
      where: { id: leadId },
      data: { ownerId },
    })

    if (ownerId !== null) {
      await tx.leadAssignment.create({
        data: {
          leadId,
          assignedToId: ownerId,
          assignedById,
          note: note || null,
        },
      })
    }
  })

  return getLeadById(leadId)
}
export async function updateLeadStatus(
  id: number,
  input: UpdateLeadStatusInput,
) {
  const existing = await prisma.lead.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      status: true,
    },
  })

  if (!existing) {
    throw new LeadServiceError('Lead not found', 404)
  }

  if (input.status === 'DISQUALIFIED' && input.disqualifyReasonId != null) {
    const reason = await prisma.reason.findFirst({
      where: {
        id: input.disqualifyReasonId,
        isActive: true,
      },
      select: { id: true },
    })

    if (!reason) {
      throw new LeadServiceError(
        'Disqualification reason not found or inactive',
        400,
      )
    }
  }

  const now = new Date()

  const data = {
    status: input.status,
    disqualifyReasonId:
      input.status === 'DISQUALIFIED'
        ? input.disqualifyReasonId ?? null
        : null,
    disqualifyNote:
      input.status === 'DISQUALIFIED'
        ? input.disqualifyNote?.trim() || null
        : null,
    disqualifiedAt:
      input.status === 'DISQUALIFIED'
        ? existing.status === 'DISQUALIFIED'
          ? undefined
          : now
        : null,
  }

  return prisma.lead.update({
    where: { id },
    data,
    select: leadSelect,
  })
}