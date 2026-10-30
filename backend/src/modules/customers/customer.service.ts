import { prisma } from '../../config/database.js'
import { logAudit } from '../audit/audit.service.js'
import type {
  CreateCustomerInput,
  ListCustomersInput,
  UpdateCustomerInput,
} from './customer.validation.js'

export class CustomerServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message)
    this.name = 'CustomerServiceError'
  }
}

const customerInclude = {
  company: {
    select: {
      id: true,
      name: true,
      industry: true,
      website: true,
      phone: true,
      city: true,
      country: true,
    },
  },
  primaryContact: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      jobTitle: true,
    },
  },
  owner: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  deals: {
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      estimatedValue: true,
      status: true,
    },
  },
} as const

function formatCustomer(c: any) {
  const deals = c.deals || []
  const dealCount = deals.length
  const pipelineValue = deals.reduce((acc: number, d: any) => {
    return acc + (Number(d.estimatedValue) || 0)
  }, 0)

  return {
    id: c.id,
    companyId: c.companyId,
    primaryContactId: c.primaryContactId,
    ownerId: c.ownerId,
    company: c.company?.name || '—',
    industry: c.company?.industry || 'Other',
    primaryContact: c.primaryContact?.fullName || '—',
    owner: c.owner?.name || 'Unassigned',
    notes: c.notes || '',
    dealCount,
    pipelineValue,
    convertedAt: c.convertedAt ? c.convertedAt.toISOString() : c.createdAt.toISOString(),
    createdAt: c.createdAt ? c.createdAt.toISOString() : '',
    updatedAt: c.updatedAt ? c.updatedAt.toISOString() : '',
    companyDetails: c.company,
    contactDetails: c.primaryContact,
    ownerDetails: c.owner,
  }
}

async function resolveCompany(
  companyId?: number | null,
  companyName?: string | null,
): Promise<number | null | undefined> {
  if (companyName !== undefined) {
    const trimmed = companyName?.trim()
    if (!trimmed || trimmed === '—' || trimmed === '-') {
      return null
    }

    if (companyId) {
      const existingById = await prisma.company.findFirst({
        where: { id: companyId, deletedAt: null },
      })
      if (
        existingById &&
        existingById.name.toLowerCase() === trimmed.toLowerCase()
      ) {
        return existingById.id
      }
    }

    const norm = trimmed.toLowerCase()
    const foundByName = await prisma.company.findFirst({
      where: {
        OR: [
          { name: { equals: trimmed, mode: 'insensitive' } },
          { normalizedName: norm },
        ],
        deletedAt: null,
      },
    })
    if (foundByName) {
      return foundByName.id
    }

    const created = await prisma.company.create({
      data: {
        name: trimmed,
        normalizedName: norm,
        industry: 'Other',
      },
    })
    return created.id
  }

  if (companyId !== undefined) {
    if (companyId === null) return null
    const comp = await prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
    })
    if (!comp) throw new CustomerServiceError('Company not found', 400)
    return comp.id
  }

  return undefined
}

async function resolvePrimaryContact(
  primaryContactId?: number | null,
  primaryContactName?: string | null,
  companyId?: number | null,
): Promise<number | null | undefined> {
  if (primaryContactName !== undefined) {
    const trimmed = primaryContactName?.trim()
    if (!trimmed || trimmed === '—' || trimmed === '-') {
      return null
    }

    if (primaryContactId) {
      const existingById = await prisma.contact.findFirst({
        where: { id: primaryContactId },
      })
      if (
        existingById &&
        existingById.fullName.toLowerCase() === trimmed.toLowerCase()
      ) {
        return existingById.id
      }
    }

    const foundByName = await prisma.contact.findFirst({
      where: {
        fullName: { equals: trimmed, mode: 'insensitive' },
        deletedAt: null,
        ...(companyId ? { companyId } : {}),
      },
    })
    if (foundByName) {
      return foundByName.id
    }

    const created = await prisma.contact.create({
      data: {
        fullName: trimmed,
        companyId: companyId ?? null,
      },
    })
    return created.id
  }

  if (primaryContactId !== undefined) {
    if (primaryContactId === null) return null
    const contact = await prisma.contact.findFirst({
      where: { id: primaryContactId },
    })
    if (!contact) throw new CustomerServiceError('Primary contact not found', 400)
    return contact.id
  }

  return undefined
}

export async function createCustomer(input: CreateCustomerInput) {
  const companyId = await resolveCompany(input.companyId, input.companyName)
  const primaryContactId = await resolvePrimaryContact(
    input.primaryContactId,
    input.primaryContactName,
    companyId ?? null,
  )

  if (input.ownerId) {
    const owner = await prisma.user.findFirst({
      where: { id: input.ownerId, deletedAt: null, isActive: true },
    })
    if (!owner) throw new CustomerServiceError('Owner not found or inactive', 400)
  }

  const created = await prisma.customer.create({
    data: {
      companyId: companyId ?? null,
      primaryContactId: primaryContactId ?? null,
      ownerId: input.ownerId ?? null,
      convertedAt: input.convertedAt ?? new Date(),
      notes: input.notes ?? null,
    },
    include: customerInclude,
  })

  void logAudit({
    action: 'CREATE',
    entityType: 'CUSTOMER',
    entityId: created.id,
    after: {
      companyId: created.companyId,
      primaryContactId: created.primaryContactId,
      ownerId: created.ownerId,
    },
  })

  return formatCustomer(created)
}

export async function listCustomers(input: ListCustomersInput) {
  const { page, limit, search, industry, ownerId, createdFrom, createdTo } = input

  const where: any = {
    deletedAt: null,
  }

  if (ownerId) {
    where.ownerId = ownerId
  }

  if (createdFrom || createdTo) {
    where.convertedAt = {}
    if (createdFrom) where.convertedAt.gte = createdFrom
    if (createdTo) where.convertedAt.lte = createdTo
  }

  if (industry) {
    where.company = {
      ...where.company,
      industry: { equals: industry, mode: 'insensitive' },
    }
  }

  if (search && search.trim()) {
    const term = search.trim()
    where.OR = [
      { company: { name: { contains: term, mode: 'insensitive' } } },
      { company: { industry: { contains: term, mode: 'insensitive' } } },
      { primaryContact: { fullName: { contains: term, mode: 'insensitive' } } },
      { primaryContact: { email: { contains: term, mode: 'insensitive' } } },
      { owner: { name: { contains: term, mode: 'insensitive' } } },
      { notes: { contains: term, mode: 'insensitive' } },
    ]
  }

  const [total, items] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      include: customerInclude,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { convertedAt: 'desc' },
    }),
  ])

  return {
    customers: items.map(formatCustomer),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  }
}

export async function getCustomerById(id: number) {
  const customer = await prisma.customer.findFirst({
    where: { id, deletedAt: null },
    include: customerInclude,
  })

  if (!customer) throw new CustomerServiceError('Customer not found', 404)
  return formatCustomer(customer)
}

export async function updateCustomer(id: number, input: UpdateCustomerInput) {
  await getCustomerById(id)

  const resolvedCompanyId = await resolveCompany(input.companyId, input.companyName)
  const resolvedContactId = await resolvePrimaryContact(
    input.primaryContactId,
    input.primaryContactName,
    resolvedCompanyId !== undefined ? (resolvedCompanyId ?? null) : undefined,
  )

  if (input.ownerId !== undefined && input.ownerId !== null) {
    const owner = await prisma.user.findFirst({
      where: { id: input.ownerId, deletedAt: null, isActive: true },
    })
    if (!owner) throw new CustomerServiceError('Owner not found or inactive', 400)
  }

  const updateData: any = {}
  if (resolvedCompanyId !== undefined) {
    updateData.companyId = resolvedCompanyId
  }
  if (resolvedContactId !== undefined) {
    updateData.primaryContactId = resolvedContactId
  }
  if (input.ownerId !== undefined) {
    updateData.ownerId = input.ownerId
  }
  if (input.convertedAt !== undefined) {
    updateData.convertedAt = input.convertedAt
  }
  if (input.notes !== undefined) {
    updateData.notes = input.notes
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: updateData,
    include: customerInclude,
  })

  void logAudit({
    action: 'UPDATE',
    entityType: 'CUSTOMER',
    entityId: id,
    after: updateData,
  })

  return formatCustomer(updated)
}

export async function deleteCustomer(id: number) {
  await getCustomerById(id)

  void logAudit({
    action: 'DELETE',
    entityType: 'CUSTOMER',
    entityId: id,
  })

  await prisma.customer.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  return { success: true }
}

export async function getCustomerOptions() {
  const [companies, contacts, users] = await Promise.all([
    prisma.company.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, industry: true },
      orderBy: { name: 'asc' },
    }),
    prisma.contact.findMany({
      where: { deletedAt: null },
      select: { id: true, fullName: true, email: true, companyId: true },
      orderBy: { fullName: 'asc' },
    }),
    prisma.user.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return {
    companies,
    contacts,
    users,
  }
}
