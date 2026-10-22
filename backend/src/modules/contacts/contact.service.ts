
import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type {
  CreateContactInput,
  ListContactsInput,
  UpdateContactInput,
} from './contact.validation.js'

export class ContactServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message)
    this.name = 'ContactServiceError'
  }
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null
}

function normalizePhone(phone?: string | null) {
  return phone ? phone.replace(/\D/g, '') || null : null
}

async function validateCompany(companyId?: number | null) {
  if (companyId == null) return

  const company = await prisma.company.findFirst({
    where: { id: companyId, deletedAt: null },
    select: { id: true },
  })

  if (!company) {
    throw new ContactServiceError('Company not found', 400)
  }
}

const contactSelect = {
  id: true,
  fullName: true,
  companyId: true,
  jobTitle: true,
  email: true,
  normalizedEmail: true,
  phone: true,
  normalizedPhone: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  company: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.ContactSelect

export async function createContact(input: CreateContactInput) {
  await validateCompany(input.companyId)

  const email = normalizeEmail(input.email)
  const phone = input.phone?.trim() || null

  return prisma.contact.create({
    data: {
      fullName: input.fullName,
      companyId: input.companyId ?? null,
      jobTitle: input.jobTitle || null,
      email,
      normalizedEmail: email,
      phone,
      normalizedPhone: normalizePhone(phone),
      notes: input.notes || null,
    },
    select: contactSelect,
  })
}

export async function getContacts(input: ListContactsInput) {
  const { page, limit, search, companyId, createdFrom, createdTo } = input

  const where: Prisma.ContactWhereInput = {
    deletedAt: null,
    ...(companyId !== undefined ? { companyId } : {}),
    ...(createdFrom || createdTo
      ? {
          createdAt: {
            ...(createdFrom ? { gte: createdFrom } : {}),
            ...(createdTo ? { lte: createdTo } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { jobTitle: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: contactSelect,
    }),
    prisma.contact.count({ where }),
  ])

  return {
    contacts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function getContactById(id: number) {
  const contact = await prisma.contact.findFirst({
    where: { id, deletedAt: null },
    select: contactSelect,
  })

  if (!contact) {
    throw new ContactServiceError('Contact not found', 404)
  }

  return contact
}

export async function updateContact(
  id: number,
  input: UpdateContactInput,
) {
  const existing = await prisma.contact.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  })

  if (!existing) {
    throw new ContactServiceError('Contact not found', 404)
  }

  if (input.companyId !== undefined) {
    await validateCompany(input.companyId)
  }

  const data: Prisma.ContactUpdateInput = {}

  if (input.fullName !== undefined) data.fullName = input.fullName
  if (input.companyId !== undefined) {
    data.company =
      input.companyId === null
        ? { disconnect: true }
        : { connect: { id: input.companyId } }
  }
  if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle
  if (input.email !== undefined) {
    data.email = normalizeEmail(input.email)
    data.normalizedEmail = normalizeEmail(input.email)
  }
  if (input.phone !== undefined) {
    data.phone = input.phone?.trim() || null
    data.normalizedPhone = normalizePhone(input.phone)
  }
  if (input.notes !== undefined) data.notes = input.notes

  return prisma.contact.update({
    where: { id },
    data,
    select: contactSelect,
  })
}

export async function deleteContact(id: number) {
  const existing = await prisma.contact.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  })

  if (!existing) {
    throw new ContactServiceError('Contact not found', 404)
  }

  await prisma.contact.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  return { id, deleted: true }
}
