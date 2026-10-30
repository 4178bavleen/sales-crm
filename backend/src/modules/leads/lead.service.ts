
import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { LeadStatus } from '../../generated/prisma/client.js'
import type {
  CreateLeadInput,
  ListLeadsInput,
  UpdateLeadInput,
} from './lead.validation.js'


import type { UpdateLeadStatusInput } from './lead.validation.js'
import { createInAppNotification } from '../notifications/notification.service.js'
import { logAudit } from '../audit/audit.service.js'
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
  noFollowUpNote: true,
  disqualifyReasonId: true,
  disqualifyNote: true,
  disqualifiedAt: true,
  contactId: true,
  companyId: true,
  convertedCustomerId: true,
  convertedAt: true,
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

  const createdLead = await prisma.lead.create({
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
      status: input.status,
      notes: input.notes || null,
      ownerId: input.ownerId ?? actorId,
      nextFollowUpAt: input.nextFollowUpAt ?? null,
      noFollowUpNote: input.noFollowUpNote ?? null,
      createdById: actorId,
    },
    select: leadSelect,
  })

  void logAudit({
    actorId,
    action: 'CREATE',
    entityType: 'LEAD',
    entityId: createdLead.id,
    after: {
      contactName: createdLead.contactName,
      companyName: createdLead.companyName,
      status: createdLead.status,
      ownerId: createdLead.ownerId,
    },
  })

  return createdLead
}

export async function getLeads(input: ListLeadsInput) {
  const {
    page,
    limit,
    search,
    status,
    priority,
    ownerId,
    sourceId,
    createdFrom,
    createdTo,
  } = input

  // Filters that can match several branches (a text search, an owner list that
  // may include "no owner") are combined with AND, so each one keeps its own
  // OR group instead of overriding the other.
  const and: Prisma.LeadWhereInput[] = []

  if (search) {
    and.push({
      OR: [
        { contactName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ],
    })
  }

  if (ownerId && ownerId.length > 0) {
    const ownerIds = ownerId.filter((id): id is number => id !== null)
    const branches: Prisma.LeadWhereInput[] = []
    if (ownerIds.length > 0) branches.push({ ownerId: { in: ownerIds } })
    if (ownerId.includes(null)) branches.push({ ownerId: null })
    and.push({ OR: branches })
  }

  const where: Prisma.LeadWhereInput = {
    deletedAt: null,
    ...(status && status.length > 0 ? { status: { in: status } } : {}),
    ...(priority && priority.length > 0 ? { priority: { in: priority } } : {}),
    ...(sourceId && sourceId.length > 0 ? { sourceId: { in: sourceId } } : {}),
    ...(createdFrom || createdTo
      ? {
        createdAt: {
          ...(createdFrom ? { gte: createdFrom } : {}),
          ...(createdTo ? { lte: createdTo } : {}),
        },
      }
      : {}),
    ...(and.length > 0 ? { AND: and } : {}),
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
    leads: leads.map((lead) => ({
      ...lead,
      ownerId: lead.ownerId ?? lead.createdById,
      owner: lead.owner ?? lead.createdBy,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Counts of every non-deleted lead, grouped by status.
 *
 * The KPI cards need the totals of the whole list, which a paginated
 * response cannot provide.
 */
export async function getLeadStats() {
  const grouped = await prisma.lead.groupBy({
    by: ['status'],
    where: { deletedAt: null },
    _count: { _all: true },
  })

  const byStatus: Record<LeadStatus, number> = {
    NEW: 0,
    CONTACTED: 0,
    QUALIFIED: 0,
    DISQUALIFIED: 0,
    CONVERTED: 0,
  }

  let total = 0

  for (const row of grouped) {
    byStatus[row.status] = row._count._all
    total += row._count._all
  }

  return { total, byStatus }
}

/**
 * Reference data the leads page needs for its filters and forms:
 * lead sources, assigned users (owners), available statuses, priorities,
 * and no follow-up reasons.
 */
export async function getLeadOptions() {
  const [sources, owners, noFollowUpReasons] = await Promise.all([
    prisma.leadSource.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    prisma.reason.findMany({
      where: { isActive: true, type: 'NO_FOLLOWUP' },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    }),
  ]);

  const statuses = Object.values(LeadStatus);
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  return { sources, owners, statuses, priorities, noFollowUpReasons };
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

  return {
    ...lead,
    ownerId: lead.ownerId ?? lead.createdById,
    owner: lead.owner ?? lead.createdBy,
  }
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
    noFollowUpNote?: string | null
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
  if (input.noFollowUpNote !== undefined) {
    data.noFollowUpNote = input.noFollowUpNote
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

  await prisma.lead.delete({
    where: { id },
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

  if (lead.ownerId !== ownerId) {
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
  }

  const updatedLead = await getLeadById(leadId)

  void logAudit({
    actorId: assignedById,
    action: 'ASSIGN',
    entityType: 'LEAD',
    entityId: leadId,
    before: { ownerId: lead.ownerId },
    after: { ownerId, note },
  })

  // Notify the new owner after the assignment succeeds.
  if (ownerId !== null && ownerId !== assignedById) {
    try {
      await createInAppNotification({
        userId: ownerId,
        type: 'LEAD_ASSIGNED',
        title: 'New lead assigned to you',
        body: `You have been assigned the lead: ${updatedLead.contactName}`,
        entityType: 'lead',
        entityId: updatedLead.id,
      })
    } catch (error) {
      // Assignment should remain successful if notification creation fails.
      console.error('Failed to create lead assignment notification:', error)
    }
  }

  return updatedLead
}
export async function updateLeadStatus(
  id: number,
  input: UpdateLeadStatusInput,
  actorId: number,
) {
  const existing = await prisma.lead.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      status: true,
      contactName: true,
      companyName: true,
      phone: true,
      email: true,
      normalizedPhone: true,
      normalizedEmail: true,
      ownerId: true,
      createdById: true,
      productServiceId: true,
      contactId: true,
      companyId: true,
      convertedCustomerId: true,
    },
  })

  if (!existing) {
    throw new LeadServiceError('Lead not found', 404)
  }

  const now = new Date()

  const data = {
    status: input.status,
    disqualifyReasonId: null,
    disqualifyNote:
      input.status === 'DISQUALIFIED'
        ? input.disqualifyReason?.trim() || null
        : null,
    disqualifiedAt:
      input.status === 'DISQUALIFIED'
        ? existing.status === 'DISQUALIFIED'
          ? undefined
          : now
        : null,
  }

  if (input.status !== 'CONVERTED' || existing.convertedCustomerId != null) {
    const updated = await prisma.lead.update({
      where: { id },
      data,
      select: leadSelect,
    })

    void logAudit({
      actorId,
      action: input.status === 'DISQUALIFIED' ? 'DISQUALIFY' : 'STATUS_CHANGE',
      entityType: 'LEAD',
      entityId: id,
      before: { status: existing.status },
      after: {
        status: input.status,
        disqualifyReason: input.disqualifyReason,
      },
    })

    return updated
  }

  const conversion = input as any

  return prisma.$transaction(async (tx) => {
    let companyId = existing.companyId

    if (companyId == null && existing.companyName?.trim()) {
      const companyName = existing.companyName.trim()
      const normalizedName =
        normalizeCompany(companyName) ?? companyName.toLowerCase()

      const company = await tx.company.findFirst({
        where: {
          normalizedName,
          deletedAt: null,
        },
        select: { id: true },
      })

      companyId =
        company?.id ??
        (
          await tx.company.create({
            data: {
              name: companyName,
              normalizedName,
            },
            select: { id: true },
          })
        ).id
    }

    let contactId = existing.contactId

    if (contactId == null) {
      const contact = await tx.contact.create({
        data: {
          companyId,
          fullName: existing.contactName,
          email: existing.normalizedEmail ?? normalizeEmail(existing.email),
          normalizedEmail:
            existing.normalizedEmail ?? normalizeEmail(existing.email),
          phone: existing.phone,
          normalizedPhone:
            existing.normalizedPhone ?? normalizePhone(existing.phone),
        },
        select: { id: true },
      })

      contactId = contact.id
    }

    let customerIdToUse = conversion.customerId ?? null
    if (customerIdToUse) {
      const existingCustomer = await tx.customer.findFirst({
        where: { id: customerIdToUse, deletedAt: null },
        select: { id: true },
      })
      if (!existingCustomer) customerIdToUse = null
    }

    const customer = customerIdToUse
      ? await tx.customer.findFirst({
        where: { id: customerIdToUse },
        select: { id: true },
      })
      : await tx.customer.create({
        data: {
          companyId,
          primaryContactId: contactId,
          ownerId: conversion.ownerId ?? existing.ownerId ?? actorId,
          convertedAt: now,
          notes: `Converted from lead #${id}`,
        },
        select: { id: true },
      })

    if (!customer) throw new LeadServiceError('Failed to create customer', 500)

    const existingDealCount = await tx.deal.count({
      where: {
        leadId: id,
        deletedAt: null,
      },
    })

    if (existingDealCount > 0) {
      await tx.deal.updateMany({
        where: {
          leadId: id,
          customerId: null,
          deletedAt: null,
        },
        data: { customerId: customer.id },
      })
    } else {
      let stageIdToUse = conversion.stageId ?? null
      if (stageIdToUse) {
        const s = await tx.pipelineStage.findFirst({
          where: { id: stageIdToUse, isActive: true, kind: 'OPEN' },
          select: { id: true },
        })
        if (!s) stageIdToUse = null
      }
      if (!stageIdToUse) {
        const stage = await tx.pipelineStage.findFirst({
          where: { kind: 'OPEN', isActive: true },
          orderBy: { position: 'asc' },
          select: { id: true },
        })
        stageIdToUse = stage?.id ?? null
      }

      if (stageIdToUse) {
        const dealName =
          conversion.dealName?.trim() ||
          [existing.companyName, existing.contactName]
            .filter((value): value is string => Boolean(value?.trim()))
            .map((value) => value.trim())
            .join(' - ')
            .slice(0, 200) ||
          `Lead #${id}`

        const deal = await tx.deal.create({
          data: {
            name: dealName,
            leadId: id,
            customerId: customer.id,
            ownerId: conversion.ownerId ?? existing.ownerId ?? actorId,
            createdById: actorId,
            productServiceId:
              conversion.productServiceId !== undefined
                ? conversion.productServiceId
                : existing.productServiceId,
            stageId: stageIdToUse,
            estimatedValue: conversion.estimatedValue ?? 0,
            expectedCloseDate: conversion.expectedCloseDate ?? null,
          },
          select: { id: true },
        })

        await tx.dealStageHistory.create({
          data: {
            dealId: deal.id,
            fromStageId: null,
            toStageId: stageIdToUse,
            changedById: actorId,
            note: 'Deal created from lead conversion',
          },
        })
      }
    }

    return tx.lead.update({
      where: { id },
      data: {
        ...data,
        contactId,
        companyId,
        convertedCustomerId: customer.id,
        convertedAt: now,
      },
      select: leadSelect,
    })
  })
}
