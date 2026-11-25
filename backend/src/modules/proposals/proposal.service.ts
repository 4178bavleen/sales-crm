import { prisma } from '../../config/database.js'
import { logAudit } from '../audit/audit.service.js'
import { createInAppNotification } from '../notifications/notification.service.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type {
  CreateProposalInput,
  UpdateProposalInput,
  UpdateProposalStatusInput,
  ProposalFilterQuery,
  ProposalStats,
  ProposalItemInput,
} from './proposal.types.js'

export class ProposalError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'ProposalError'
    this.statusCode = statusCode
  }
}

/**
 * Idempotently ensure proposal permission codes exist in DB and are mapped to ADMIN, SALES_MANAGER, SALES_EMPLOYEE
 */
export async function ensureProposalPermissions() {
  try {
    const permissions = [
      ['proposals.view', 'View customer proposals'],
      ['proposals.create', 'Create customer proposals'],
      ['proposals.edit', 'Edit customer proposals'],
      ['proposals.delete', 'Delete customer proposals'],
      ['proposals.approve', 'Approve customer proposals before sending'],
      ['proposals.send', 'Send proposals to customers'],
    ]

    for (const [code, description] of permissions) {
      await prisma.permission.upsert({
        where: { code },
        update: { description },
        create: { code, description },
      })
    }

    const rolesToAssign = await prisma.role.findMany({
      where: { name: { in: ['ADMIN', 'SALES_MANAGER', 'SALES_EMPLOYEE'] } },
      select: { id: true, name: true },
    })

    const perms = await prisma.permission.findMany({
      where: { code: { startsWith: 'proposals.' } },
      select: { id: true, code: true },
    })

    for (const role of rolesToAssign) {
      const rolePerms =
        role.name === 'ADMIN'
          ? perms
          : perms.filter((p) => p.code !== 'proposals.approve')

      await prisma.rolePermission.createMany({
        data: rolePerms.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
        skipDuplicates: true,
      })
    }
  } catch (err) {
    console.warn('Could not auto-seed proposal permissions:', err)
  }
}

/**
 * Generate formatted proposal number like PROP-2026-0001
 */
export async function generateProposalNumber(): Promise<string> {
  const currentYear = new Date().getFullYear()
  const prefix = `PROP-${currentYear}-`

  const latest = await prisma.proposal.findFirst({
    where: {
      proposalNumber: { startsWith: prefix },
    },
    orderBy: { id: 'desc' },
    select: { proposalNumber: true },
  })

  let nextSequence = 1
  if (latest?.proposalNumber) {
    const parts = latest.proposalNumber.split('-')
    const lastNum = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(lastNum)) {
      nextSequence = lastNum + 1
    }
  }

  return `${prefix}${String(nextSequence).padStart(4, '0')}`
}

/**
 * Accurately calculate financial totals
 */
export function calculateProposalTotals(
  items: ProposalItemInput[],
  discountType: 'PERCENTAGE' | 'FIXED' = 'PERCENTAGE',
  discountValue = 0,
  taxRate = 0,
) {
  let subtotal = 0

  const computedItems = items.map((item, idx) => {
    const qty = Number(item.quantity) || 1
    const price = Number(item.unitPrice) || 0
    const discPct = Number(item.discountPercent) || 0
    const itemTax = Number(item.taxRate) || 0

    const gross = qty * price
    const discAmount = gross * (discPct / 100)
    const lineTotal = Math.max(0, gross - discAmount)

    subtotal += lineTotal

    return {
      productServiceId: item.productServiceId || null,
      title: item.title,
      description: item.description || null,
      quantity: qty,
      unitPrice: price,
      discountPercent: discPct,
      taxRate: itemTax,
      total: lineTotal,
      position: item.position ?? idx,
    }
  })

  let discountAmount = 0
  if (discountType === 'PERCENTAGE') {
    discountAmount = subtotal * (discountValue / 100)
  } else {
    discountAmount = Math.min(subtotal, Number(discountValue) || 0)
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount)
  const taxAmount = taxableAmount * (taxRate / 100)
  const grandTotal = taxableAmount + taxAmount

  return {
    computedItems,
    subtotal: Number(subtotal.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
  }
}

/**
 * List proposals with filtering and pagination
 */
export async function listProposals(query: ProposalFilterQuery) {
  const page = Math.max(1, query.page || 1)
  const limit = Math.min(100, Math.max(1, query.limit || 10))
  const skip = (page - 1) * limit

  const where: Prisma.ProposalWhereInput = {
    deletedAt: null,
  }

  if (query.status && query.status !== 'ALL') {
    where.status = query.status
  }

  if (query.customerId) {
    where.customerId = query.customerId
  }

  if (query.dealId) {
    where.dealId = query.dealId
  }

  if (query.ownerId) {
    where.ownerId = query.ownerId
  }

  if (query.dateFrom || query.dateTo) {
    where.validUntil = {}
    if (query.dateFrom) {
      where.validUntil.gte = new Date(query.dateFrom)
    }
    if (query.dateTo) {
      where.validUntil.lte = new Date(query.dateTo)
    }
  }

  if (query.search?.trim()) {
    const s = query.search.trim()
    where.OR = [
      { proposalNumber: { contains: s, mode: 'insensitive' } },
      { title: { contains: s, mode: 'insensitive' } },
      {
        customer: {
          company: {
            name: { contains: s, mode: 'insensitive' },
          },
        },
      },
      {
        customer: {
          primaryContact: {
            fullName: { contains: s, mode: 'insensitive' },
          },
        },
      },
    ]
  }

  const orderBy: Prisma.ProposalOrderByWithRelationInput = {}
  const sortBy = query.sortBy || 'createdAt'
  const sortOrder = query.sortOrder || 'desc'
  orderBy[sortBy] = sortOrder

  const [proposals, total] = await Promise.all([
    prisma.proposal.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        customer: {
          include: {
            company: {
              select: { id: true, name: true, industry: true, phone: true, address: true, city: true },
            },
            primaryContact: {
              select: { id: true, fullName: true, email: true, phone: true, jobTitle: true },
            },
          },
        },
        deal: {
          select: { id: true, name: true, estimatedValue: true, status: true },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          orderBy: { position: 'asc' },
        },
      },
    }),
    prisma.proposal.count({ where }),
  ])

  return {
    proposals,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

/**
 * Get proposal by ID
 */
export async function getProposalById(id: number) {
  const proposal = await prisma.proposal.findFirst({
    where: { id, deletedAt: null },
    include: {
      customer: {
        include: {
          company: true,
          primaryContact: true,
        },
      },
      deal: true,
      lead: true,
      owner: {
        select: { id: true, name: true, email: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      approvedBy: {
        select: { id: true, name: true, email: true },
      },
      items: {
        orderBy: { position: 'asc' },
        include: {
          productService: {
            select: { id: true, name: true, type: true, description: true },
          },
        },
      },
    },
  })

  if (!proposal) {
    throw new ProposalError('Proposal not found', 404)
  }

  return proposal
}

/**
 * Get proposal metrics / stats
 */
export async function getProposalStats(): Promise<ProposalStats> {
  const proposals = await prisma.proposal.findMany({
    where: { deletedAt: null },
    select: { status: true, grandTotal: true },
  })

  let totalValue = 0
  let draftCount = 0
  let draftValue = 0
  let pendingApprovalCount = 0
  let pendingApprovalValue = 0
  let approvedCount = 0
  let approvedValue = 0
  let sentCount = 0
  let sentValue = 0
  let underReviewCount = 0
  let underReviewValue = 0
  let acceptedCount = 0
  let acceptedValue = 0
  let rejectedCount = 0
  let rejectedValue = 0
  let expiredCount = 0
  let expiredValue = 0

  for (const p of proposals) {
    const val = Number(p.grandTotal) || 0
    totalValue += val

    switch (p.status) {
      case 'DRAFT':
        draftCount++
        draftValue += val
        break
      case 'PENDING_APPROVAL':
        pendingApprovalCount++
        pendingApprovalValue += val
        break
      case 'APPROVED':
        approvedCount++
        approvedValue += val
        break
      case 'SENT':
        sentCount++
        sentValue += val
        break
      case 'UNDER_REVIEW':
        underReviewCount++
        underReviewValue += val
        break
      case 'ACCEPTED':
        acceptedCount++
        acceptedValue += val
        break
      case 'REJECTED':
        rejectedCount++
        rejectedValue += val
        break
      case 'EXPIRED':
        expiredCount++
        expiredValue += val
        break
    }
  }

  const decidedCount = acceptedCount + rejectedCount
  const acceptanceRate = decidedCount > 0 ? Number(((acceptedCount / decidedCount) * 100).toFixed(1)) : 0

  return {
    totalCount: proposals.length,
    totalValue: Number(totalValue.toFixed(2)),
    draftCount,
    draftValue: Number(draftValue.toFixed(2)),
    pendingApprovalCount,
    pendingApprovalValue: Number(pendingApprovalValue.toFixed(2)),
    approvedCount,
    approvedValue: Number(approvedValue.toFixed(2)),
    sentCount,
    sentValue: Number(sentValue.toFixed(2)),
    underReviewCount,
    underReviewValue: Number(underReviewValue.toFixed(2)),
    acceptedCount,
    acceptedValue: Number(acceptedValue.toFixed(2)),
    rejectedCount,
    rejectedValue: Number(rejectedValue.toFixed(2)),
    expiredCount,
    expiredValue: Number(expiredValue.toFixed(2)),
    acceptanceRate,
  }
}

/**
 * Dropdown options for proposal creation
 */
export async function getProposalOptions() {
  const [customers, deals, productsServices, users] = await Promise.all([
    prisma.customer.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        company: {
          select: { id: true, name: true, industry: true, address: true, city: true },
        },
        primaryContact: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        owner: {
          select: { id: true, name: true },
        },
      },
      orderBy: { id: 'desc' },
    }),
    prisma.deal.findMany({
      where: { deletedAt: null, status: 'OPEN' },
      select: {
        id: true,
        name: true,
        customerId: true,
        estimatedValue: true,
      },
      orderBy: { id: 'desc' },
    }),
    prisma.productService.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    }),
  ])

  return {
    customers,
    deals,
    productsServices,
    users,
  }
}

/**
 * Create a new proposal
 */
export async function createProposal(input: CreateProposalInput, userId: number) {
  // Validate customer
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, deletedAt: null },
    include: { company: true },
  })

  if (!customer) {
    throw new ProposalError('Customer not found', 404)
  }

  // Validate deal if provided
  if (input.dealId) {
    const deal = await prisma.deal.findFirst({
      where: { id: input.dealId, deletedAt: null },
    })
    if (!deal) {
      throw new ProposalError('Linked deal not found', 404)
    }
  }

  // Generate proposal number if not given
  const proposalNumber = input.proposalNumber?.trim() || (await generateProposalNumber())

  // Check unique proposal number
  const existing = await prisma.proposal.findUnique({
    where: { proposalNumber },
  })
  if (existing) {
    throw new ProposalError(`Proposal number ${proposalNumber} already exists`, 409)
  }

  const ownerId = input.ownerId || customer.ownerId || userId
  const { computedItems, subtotal, discountAmount, taxAmount, grandTotal } = calculateProposalTotals(
    input.items,
    input.discountType,
    input.discountValue,
    input.taxRate,
  )

  const issueDate = input.issueDate ? new Date(input.issueDate) : new Date()
  const validUntil = new Date(input.validUntil)

  const proposal = await prisma.$transaction(async (tx) => {
    const created = await tx.proposal.create({
      data: {
        proposalNumber,
        title: input.title.trim(),
        customerId: input.customerId,
        leadId: input.leadId || null,
        dealId: input.dealId || null,
        ownerId,
        createdById: userId,
        status: 'DRAFT',
        currency: input.currency || 'INR',
        issueDate,
        validUntil,
        subtotal,
        discountType: input.discountType || 'PERCENTAGE',
        discountValue: input.discountValue || 0,
        discountAmount,
        taxRate: input.taxRate || 0,
        taxAmount,
        grandTotal,
        summary: input.summary?.trim() || null,
        terms: input.terms?.trim() || null,
        clientNotes: input.clientNotes?.trim() || null,
        items: {
          create: computedItems.map((item) => ({
            productServiceId: item.productServiceId,
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            taxRate: item.taxRate,
            total: item.total,
            position: item.position,
          })),
        },
      },
      include: {
        customer: {
          include: { company: true, primaryContact: true },
        },
        deal: true,
        owner: { select: { id: true, name: true, email: true } },
        items: true,
      },
    })

    return created
  })

  // Audit log
  await logAudit({
    actorId: userId,
    action: 'CREATE',
    entityType: 'PROPOSAL',
    entityId: proposal.id,
    after: {
      proposalNumber: proposal.proposalNumber,
      title: proposal.title,
      customerId: proposal.customerId,
      grandTotal: Number(proposal.grandTotal),
    },
  })

  // In-app notification for owner
  if (ownerId !== userId) {
    await createInAppNotification({
      userId: ownerId,
      type: 'PROPOSAL_ASSIGNED',
      title: 'New proposal assigned',
      body: `You were assigned proposal ${proposal.proposalNumber}: ${proposal.title}`,
      entityType: 'proposal',
      entityId: proposal.id,
    })
  }

  return proposal
}

/**
 * Update an existing proposal
 */
export async function updateProposal(id: number, input: UpdateProposalInput, userId: number) {
  const existing = await prisma.proposal.findFirst({
    where: { id, deletedAt: null },
    include: { items: true },
  })

  if (!existing) {
    throw new ProposalError('Proposal not found', 404)
  }

  const itemsToCompute = input.items ?? existing.items.map((it) => ({
    productServiceId: it.productServiceId,
    title: it.title,
    description: it.description,
    quantity: Number(it.quantity),
    unitPrice: Number(it.unitPrice),
    discountPercent: Number(it.discountPercent),
    taxRate: Number(it.taxRate),
    position: it.position,
  }))

  const discountType = input.discountType ?? existing.discountType
  const discountValue = input.discountValue !== undefined ? input.discountValue : Number(existing.discountValue)
  const taxRate = input.taxRate !== undefined ? input.taxRate : Number(existing.taxRate)

  const { computedItems, subtotal, discountAmount, taxAmount, grandTotal } = calculateProposalTotals(
    itemsToCompute,
    discountType,
    discountValue,
    taxRate,
  )

  const resetApprovalOnEdit = existing.status === 'APPROVED' || existing.status === 'PENDING_APPROVAL'

  const updated = await prisma.$transaction(async (tx) => {
    // If items provided, replace items
    if (input.items) {
      await tx.proposalItem.deleteMany({
        where: { proposalId: id },
      })

      await tx.proposalItem.createMany({
        data: computedItems.map((item) => ({
          proposalId: id,
          productServiceId: item.productServiceId,
          title: item.title,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          taxRate: item.taxRate,
          total: item.total,
          position: item.position,
        })),
      })
    }

    const proposalUpdated = await tx.proposal.update({
      where: { id },
      data: {
        title: input.title !== undefined ? input.title.trim() : undefined,
        proposalNumber: input.proposalNumber !== undefined ? input.proposalNumber.trim() : undefined,
        customerId: input.customerId,
        leadId: input.leadId,
        dealId: input.dealId,
        ownerId: input.ownerId,
        status: resetApprovalOnEdit ? 'DRAFT' : undefined,
        submittedForApprovalAt: resetApprovalOnEdit ? null : undefined,
        approvedAt: resetApprovalOnEdit ? null : undefined,
        approvedById: resetApprovalOnEdit ? null : undefined,
        currency: input.currency,
        issueDate: input.issueDate ? new Date(input.issueDate) : undefined,
        validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        taxRate,
        taxAmount,
        grandTotal,
        summary: input.summary !== undefined ? (input.summary?.trim() || null) : undefined,
        terms: input.terms !== undefined ? (input.terms?.trim() || null) : undefined,
        clientNotes: input.clientNotes !== undefined ? (input.clientNotes?.trim() || null) : undefined,
        rejectionReason: input.rejectionReason !== undefined ? input.rejectionReason : undefined,
      },
      include: {
        customer: {
          include: { company: true, primaryContact: true },
        },
        deal: true,
        owner: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        items: { orderBy: { position: 'asc' } },
      },
    })

    return proposalUpdated
  })

  // Audit log
  await logAudit({
    actorId: userId,
    action: 'UPDATE',
    entityType: 'PROPOSAL',
    entityId: id,
    before: { title: existing.title, status: existing.status, grandTotal: Number(existing.grandTotal) },
    after: { title: updated.title, status: updated.status, grandTotal: Number(updated.grandTotal) },
  })

  return updated
}

/**
 * Helper to load proposal with standard relations after workflow transitions
 */
const proposalDetailInclude = {
  customer: {
    include: { company: true, primaryContact: true },
  },
  deal: true,
  owner: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
  items: { orderBy: { position: 'asc' as const } },
}

/**
 * Submit a DRAFT proposal to Admins for approval
 */
export async function submitProposalForApproval(id: number, userId: number) {
  const proposal = await prisma.proposal.findFirst({
    where: { id, deletedAt: null },
  })

  if (!proposal) {
    throw new ProposalError('Proposal not found', 404)
  }

  if (proposal.status !== 'DRAFT') {
    throw new ProposalError('Only draft proposals can be submitted for admin approval', 400)
  }

  const updated = await prisma.proposal.update({
    where: { id },
    data: {
      status: 'PENDING_APPROVAL',
      submittedForApprovalAt: new Date(),
      approvedAt: null,
      approvedById: null,
      approvalNote: null,
    },
    include: proposalDetailInclude,
  })

  await logAudit({
    actorId: userId,
    action: 'SUBMIT_FOR_APPROVAL',
    entityType: 'PROPOSAL',
    entityId: id,
    before: { status: proposal.status },
    after: { status: 'PENDING_APPROVAL' },
  })

  // Notify active ADMIN users
  try {
    const admins = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        role: { name: 'ADMIN' },
      },
      select: { id: true },
    })

    for (const admin of admins) {
      if (admin.id === userId) continue
      await createInAppNotification({
        userId: admin.id,
        type: 'PROPOSAL_APPROVAL_REQUESTED',
        title: 'Proposal awaiting approval',
        body: `Proposal ${proposal.proposalNumber} (${proposal.title}) was submitted for admin approval`,
        entityType: 'proposal',
        entityId: id,
      })
    }
  } catch (e) {
    console.warn('Could not notify admins for proposal approval:', e)
  }

  return updated
}

/**
 * Admin approves a proposal so it can be sent to the customer
 */
export async function approveProposal(
  id: number,
  userId: number,
  userRole: string,
  note?: string | null,
) {
  if (userRole.toUpperCase() !== 'ADMIN') {
    throw new ProposalError('Only administrators can approve proposals', 403)
  }

  const proposal = await prisma.proposal.findFirst({
    where: { id, deletedAt: null },
  })

  if (!proposal) {
    throw new ProposalError('Proposal not found', 404)
  }

  if (proposal.status !== 'PENDING_APPROVAL') {
    throw new ProposalError('Only proposals pending approval can be approved', 400)
  }

  const trimmedNote = note?.trim() || null

  const updated = await prisma.proposal.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedById: userId,
      approvalNote: trimmedNote,
    },
    include: proposalDetailInclude,
  })

  await logAudit({
    actorId: userId,
    action: 'APPROVE',
    entityType: 'PROPOSAL',
    entityId: id,
    before: { status: proposal.status },
    after: { status: 'APPROVED', approvalNote: trimmedNote },
  })

  if (proposal.customerId) {
    try {
      await prisma.activity.create({
        data: {
          performedById: userId,
          customerId: proposal.customerId,
          type: 'OTHER',
          outcome: `Proposal ${proposal.proposalNumber} approved by admin`,
          notes: trimmedNote || undefined,
        },
      })
    } catch (e) {
      console.warn('Could not log activity for proposal approval:', e)
    }
  }

  // Notify proposal owner & creator (deduped, excluding approver)
  const recipientIds = new Set<number>()
  if (proposal.ownerId && proposal.ownerId !== userId) recipientIds.add(proposal.ownerId)
  if (proposal.createdById && proposal.createdById !== userId) recipientIds.add(proposal.createdById)

  for (const recipientId of recipientIds) {
    try {
      await createInAppNotification({
        userId: recipientId,
        type: 'PROPOSAL_APPROVED',
        title: 'Proposal approved',
        body: `Proposal ${proposal.proposalNumber} has been approved by admin and is ready to send to the customer`,
        entityType: 'proposal',
        entityId: id,
      })
    } catch (e) {
      console.warn('Could not notify user about proposal approval:', e)
    }
  }

  return updated
}

/**
 * Admin sends a proposal back to DRAFT with feedback for revisions
 */
export async function requestProposalChanges(
  id: number,
  userId: number,
  userRole: string,
  reason?: string | null,
) {
  if (userRole.toUpperCase() !== 'ADMIN') {
    throw new ProposalError('Only administrators can review proposal approvals', 403)
  }

  const proposal = await prisma.proposal.findFirst({
    where: { id, deletedAt: null },
  })

  if (!proposal) {
    throw new ProposalError('Proposal not found', 404)
  }

  if (proposal.status !== 'PENDING_APPROVAL') {
    throw new ProposalError('Only proposals pending approval can be returned for revisions', 400)
  }

  const feedback = reason?.trim() || 'Returned by admin for revisions'

  const updated = await prisma.proposal.update({
    where: { id },
    data: {
      status: 'DRAFT',
      approvedAt: null,
      approvedById: null,
      approvalNote: feedback,
    },
    include: proposalDetailInclude,
  })

  await logAudit({
    actorId: userId,
    action: 'APPROVAL_CHANGES_REQUESTED',
    entityType: 'PROPOSAL',
    entityId: id,
    before: { status: proposal.status },
    after: { status: 'DRAFT', approvalNote: feedback },
  })

  const recipientIds = new Set<number>()
  if (proposal.ownerId && proposal.ownerId !== userId) recipientIds.add(proposal.ownerId)
  if (proposal.createdById && proposal.createdById !== userId) recipientIds.add(proposal.createdById)

  for (const recipientId of recipientIds) {
    try {
      await createInAppNotification({
        userId: recipientId,
        type: 'PROPOSAL_CHANGES_REQUESTED',
        title: 'Proposal revision requested',
        body: `Proposal ${proposal.proposalNumber} was returned to draft: ${feedback}`,
        entityType: 'proposal',
        entityId: id,
      })
    } catch (e) {
      console.warn('Could not notify user about proposal revision request:', e)
    }
  }

  return updated
}

/**
 * Update proposal status (enforces admin-approval workflow before sending to customer)
 */
export async function updateProposalStatus(
  id: number,
  input: UpdateProposalStatusInput,
  userId: number,
  userRole = '',
) {
  const proposal = await prisma.proposal.findFirst({
    where: { id, deletedAt: null },
    include: {
      customer: { include: { company: true } },
    },
  })

  if (!proposal) {
    throw new ProposalError('Proposal not found', 404)
  }

  const oldStatus = proposal.status
  const newStatus = input.status

  if (newStatus === 'PENDING_APPROVAL') {
    return submitProposalForApproval(id, userId)
  }

  if (newStatus === 'APPROVED') {
    return approveProposal(id, userId, userRole, input.rejectionReason)
  }

  if (newStatus === 'SENT' && oldStatus !== 'APPROVED') {
    throw new ProposalError('Proposal must be approved by an admin before sending to the customer', 400)
  }

  if ((newStatus === 'ACCEPTED' || newStatus === 'REJECTED') && oldStatus !== 'SENT' && oldStatus !== 'UNDER_REVIEW') {
    throw new ProposalError('Only sent or under-review proposals can be marked as accepted or rejected', 400)
  }

  if (newStatus === 'UNDER_REVIEW' && oldStatus !== 'SENT') {
    throw new ProposalError('Only sent proposals can be moved to under review', 400)
  }

  const data: Prisma.ProposalUpdateInput = {
    status: newStatus,
  }

  if (newStatus === 'SENT' && !proposal.sentAt) {
    data.sentAt = new Date()
  } else if (newStatus === 'ACCEPTED') {
    data.acceptedAt = new Date()
  } else if (newStatus === 'REJECTED') {
    data.rejectedAt = new Date()
    data.rejectionReason = input.rejectionReason || null
  }

  const updated = await prisma.proposal.update({
    where: { id },
    data,
    include: proposalDetailInclude,
  })

  // Audit log
  await logAudit({
    actorId: userId,
    action: 'STATUS_CHANGE',
    entityType: 'PROPOSAL',
    entityId: id,
    before: { status: oldStatus },
    after: { status: newStatus, rejectionReason: input.rejectionReason },
  })

  // Log activity on customer if applicable
  if (proposal.customerId) {
    try {
      await prisma.activity.create({
        data: {
          performedById: userId,
          customerId: proposal.customerId,
          type: 'OTHER',
          outcome: `Proposal ${proposal.proposalNumber} marked as ${newStatus}`,
          notes: input.rejectionReason ? `Reason: ${input.rejectionReason}` : undefined,
        },
      })
    } catch (e) {
      console.warn('Could not log activity for proposal status change:', e)
    }
  }

  // Notify proposal owner
  if (proposal.ownerId && proposal.ownerId !== userId) {
    await createInAppNotification({
      userId: proposal.ownerId,
      type: 'PROPOSAL_STATUS_CHANGED',
      title: `Proposal ${newStatus}`,
      body: `Proposal ${proposal.proposalNumber} is now ${newStatus}`,
      entityType: 'proposal',
      entityId: id,
    })
  }

  return updated
}

/**
 * Mark an admin-approved proposal as sent to customer
 */
export async function sendProposal(id: number, userId: number) {
  return updateProposalStatus(id, { status: 'SENT' }, userId)
}

/**
 * Soft delete proposal
 */
export async function deleteProposal(id: number, userId: number) {
  const proposal = await prisma.proposal.findFirst({
    where: { id, deletedAt: null },
  })

  if (!proposal) {
    throw new ProposalError('Proposal not found', 404)
  }

  await prisma.proposal.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  await logAudit({
    actorId: userId,
    action: 'DELETE',
    entityType: 'PROPOSAL',
    entityId: id,
    before: { proposalNumber: proposal.proposalNumber, title: proposal.title },
  })

  return { success: true, message: 'Proposal deleted successfully' }
}
