import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { prisma } from '../../config/database.js'
import { logAudit } from '../audit/audit.service.js'
import { createInAppNotification } from '../notifications/notification.service.js'
import type { DocumentCategory } from '../../generated/prisma/client.js'
import type {
  CreateDocumentInput,
  UpdateDocumentInput,
  DocumentFilterQuery,
} from './document.types.js'

export class DocumentError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'DocumentError'
    this.statusCode = statusCode
  }
}

const baseBackendDir = process.cwd().endsWith('backend') ? process.cwd() : path.resolve(process.cwd(), 'backend')
export const UPLOAD_DIR = path.resolve(baseBackendDir, 'uploads', 'documents')

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

/**
 * Idempotently ensure document permission codes exist in DB and are mapped to ADMIN and SALES_MANAGER
 */
export async function ensureDocumentPermissions() {
  try {
    const docPerms = [
      ['documents.view', 'View documents and files'],
      ['documents.create', 'Upload documents and new versions'],
      ['documents.edit', 'Edit document metadata'],
      ['documents.delete', 'Delete documents'],
    ]

    for (const [code, description] of docPerms) {
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

    const permissions = await prisma.permission.findMany({
      where: { code: { startsWith: 'documents.' } },
      select: { id: true },
    })

    for (const role of rolesToAssign) {
      await prisma.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
        skipDuplicates: true,
      })
    }
  } catch (err) {
    console.error('Failed to auto-seed document permissions:', err)
  }
}

/**
 * Safely format document version to convert BigInt sizeBytes into number
 */
function formatVersion(v: any) {
  if (!v) return null
  return {
    ...v,
    sizeBytes: typeof v.sizeBytes === 'bigint' ? Number(v.sizeBytes) : v.sizeBytes,
  }
}

function formatDocument(doc: any) {
  if (!doc) return null
  return {
    ...doc,
    versions: doc.versions ? doc.versions.map(formatVersion) : undefined,
    latestVersion: doc.versions && doc.versions.length > 0 ? formatVersion(doc.versions[0]) : null,
  }
}

export async function createDocument(
  input: CreateDocumentInput,
  file: Express.Multer.File,
  clientIp?: string,
) {
  if (!file) {
    throw new DocumentError('File is required', 400)
  }

  // Validate relationships if provided
  if (input.leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: input.leadId }, select: { id: true } })
    if (!lead) throw new DocumentError('Linked Lead does not exist', 400)
  }
  if (input.dealId) {
    const deal = await prisma.deal.findUnique({ where: { id: input.dealId }, select: { id: true } })
    if (!deal) throw new DocumentError('Linked Deal does not exist', 400)
  }
  if (input.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: input.customerId }, select: { id: true } })
    if (!customer) throw new DocumentError('Linked Customer does not exist', 400)
  }

  const fileExt = path.extname(file.originalname).replace(/^\./, '').toLowerCase() || 'bin'
  const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex')
  const storageFileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`
  const targetPath = path.join(UPLOAD_DIR, storageFileName)

  // Write file from buffer to disk
  fs.writeFileSync(targetPath, file.buffer)

  const document = await prisma.$transaction(async (tx) => {
    const doc = await tx.document.create({
      data: {
        name: input.name.trim(),
        category: input.category || 'OTHER',
        uploadedById: input.uploadedById,
        currentVersion: 1,
        leadId: input.leadId ?? null,
        dealId: input.dealId ?? null,
        customerId: input.customerId ?? null,
      },
    })

    await tx.documentVersion.create({
      data: {
        documentId: doc.id,
        versionNo: 1,
        storageKey: storageFileName,
        originalFileName: file.originalname,
        fileType: fileExt,
        mimeType: file.mimetype || 'application/octet-stream',
        sizeBytes: BigInt(file.size),
        checksum: fileHash,
        uploadedById: input.uploadedById,
        replaceNote: 'Initial upload',
      },
    })

    return doc
  })

  await logAudit({
    actorId: input.uploadedById,
    action: 'CREATE',
    entityType: 'DOCUMENT',
    entityId: document.id,
    ipAddress: clientIp,
    after: {
      id: document.id,
      name: document.name,
      category: document.category,
      fileName: file.originalname,
      sizeBytes: file.size,
    },
  })

  void notifyDocumentRecipients('ATTACHED', document, input.uploadedById)

  return getDocumentById(document.id)
}

async function notifyDocumentRecipients(
  action: 'ATTACHED' | 'NEW_VERSION',
  doc: { id: number; name: string; leadId: number | null; dealId: number | null; customerId: number | null },
  uploadedById: number,
  versionNo?: number,
) {
  try {
    const recipientIds = new Set<number>()
    const contexts: string[] = []

    if (doc.leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: doc.leadId },
        select: { ownerId: true, contactName: true },
      })
      if (lead?.ownerId) {
        recipientIds.add(lead.ownerId)
        contexts.push(`Lead "${lead.contactName}"`)
      }
    }

    if (doc.dealId) {
      const deal = await prisma.deal.findUnique({
        where: { id: doc.dealId },
        select: { ownerId: true, name: true },
      })
      if (deal?.ownerId) {
        recipientIds.add(deal.ownerId)
        contexts.push(`Deal "${deal.name}"`)
      }
    }

    if (doc.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: doc.customerId },
        select: {
          ownerId: true,
          company: { select: { name: true } },
          primaryContact: { select: { fullName: true } },
        },
      })
      if (customer?.ownerId) {
        recipientIds.add(customer.ownerId)
        const name = customer.company?.name || customer.primaryContact?.fullName || `Customer #${doc.customerId}`
        contexts.push(`Customer "${name}"`)
      }
    }

    const contextStr = contexts.length > 0 ? contexts.join(', ') : 'an assigned record'

    for (const userId of recipientIds) {
      const isVersion = action === 'NEW_VERSION'
      const title = isVersion ? 'New document version uploaded' : 'New document attached'
      const body = isVersion
        ? `Version ${versionNo ?? 2} of document "${doc.name}" was uploaded for ${contextStr}.`
        : `A new document "${doc.name}" was attached to ${contextStr}.`

      await createInAppNotification({
        userId,
        type: isVersion ? 'DOCUMENT_NEW_VERSION' : 'DOCUMENT_ATTACHED',
        title,
        body,
        entityType: 'document',
        entityId: doc.id,
      })
      console.log(`[DocumentNotification] Dispatched ${action} for Document #${doc.id} to User #${userId}`)
    }
  } catch (err) {
    console.error('[DocumentNotification] Failed to dispatch document notification:', err)
  }
}

export async function addDocumentVersion(
  documentId: number,
  uploadedById: number,
  file: Express.Multer.File,
  replaceNote?: string | null,
  clientIp?: string,
) {
  if (!file) {
    throw new DocumentError('File is required for new version', 400)
  }

  const existing = await prisma.document.findFirst({
    where: { id: documentId, deletedAt: null },
  })

  if (!existing) {
    throw new DocumentError('Document not found', 404)
  }

  const newVersionNo = existing.currentVersion + 1
  const fileExt = path.extname(file.originalname).replace(/^\./, '').toLowerCase() || 'bin'
  const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex')
  const storageFileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`
  const targetPath = path.join(UPLOAD_DIR, storageFileName)

  fs.writeFileSync(targetPath, file.buffer)

  await prisma.$transaction(async (tx) => {
    await tx.document.update({
      where: { id: documentId },
      data: { currentVersion: newVersionNo },
    })

    await tx.documentVersion.create({
      data: {
        documentId,
        versionNo: newVersionNo,
        storageKey: storageFileName,
        originalFileName: file.originalname,
        fileType: fileExt,
        mimeType: file.mimetype || 'application/octet-stream',
        sizeBytes: BigInt(file.size),
        checksum: fileHash,
        uploadedById,
        replaceNote: replaceNote?.trim() || null,
      },
    })
  })

  await logAudit({
    actorId: uploadedById,
    action: 'UPDATE',
    entityType: 'DOCUMENT',
    entityId: documentId,
    ipAddress: clientIp,
    after: {
      action: 'NEW_VERSION',
      versionNo: newVersionNo,
      fileName: file.originalname,
      sizeBytes: file.size,
      note: replaceNote,
    },
  })

  void notifyDocumentRecipients('NEW_VERSION', existing, uploadedById, newVersionNo)

  return getDocumentById(documentId)
}

export async function listDocuments(query: DocumentFilterQuery) {
  const page = Math.max(1, query.page || 1)
  const limit = Math.min(100, Math.max(1, query.limit || 10))
  const skip = (page - 1) * limit

  const where: any = {
    deletedAt: null,
  }

  if (query.category && query.category !== 'ALL') {
    where.category = query.category
  }

  if (query.leadId) where.leadId = query.leadId
  if (query.dealId) where.dealId = query.dealId
  if (query.customerId) where.customerId = query.customerId

  if (query.search?.trim()) {
    const s = query.search.trim()
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      {
        versions: {
          some: {
            originalFileName: { contains: s, mode: 'insensitive' },
          },
        },
      },
    ]
  }

  const orderByField = query.sortBy || 'createdAt'
  const orderDirection = query.sortOrder || 'desc'
  const orderBy: any = { [orderByField]: orderDirection }

  const [items, total, contractsCount, proposalsCount, customerFilesCount, meetingNotesCount, otherCount] =
    await Promise.all([
      prisma.document.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } },
          lead: { select: { id: true, contactName: true, companyName: true } },
          deal: { select: { id: true, name: true } },
          customer: {
            select: {
              id: true,
              company: { select: { id: true, name: true } },
              primaryContact: { select: { id: true, fullName: true } },
            },
          },
          versions: {
            orderBy: { versionNo: 'desc' },
            take: 1,
            include: {
              uploadedBy: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.document.count({ where }),
      prisma.document.count({ where: { deletedAt: null, category: 'CONTRACT' } }),
      prisma.document.count({ where: { deletedAt: null, category: 'PROPOSAL' } }),
      prisma.document.count({ where: { deletedAt: null, category: 'CUSTOMER_FILE' } }),
      prisma.document.count({ where: { deletedAt: null, category: 'MEETING_NOTES' } }),
      prisma.document.count({ where: { deletedAt: null, category: 'OTHER' } }),
    ])

  return {
    items: items.map(formatDocument),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
    stats: {
      total: contractsCount + proposalsCount + customerFilesCount + meetingNotesCount + otherCount,
      contracts: contractsCount,
      proposals: proposalsCount,
      customerFiles: customerFilesCount,
      meetingNotes: meetingNotesCount,
      other: otherCount,
    },
  }
}

export async function getDocumentById(id: number) {
  const doc = await prisma.document.findFirst({
    where: { id, deletedAt: null },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
      lead: { select: { id: true, contactName: true, companyName: true } },
      deal: { select: { id: true, name: true } },
      customer: {
        select: {
          id: true,
          company: { select: { id: true, name: true } },
          primaryContact: { select: { id: true, fullName: true } },
        },
      },
      versions: {
        orderBy: { versionNo: 'desc' },
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  if (!doc) {
    throw new DocumentError('Document not found', 404)
  }

  return formatDocument(doc)
}

export async function updateDocument(
  id: number,
  actorId: number,
  input: UpdateDocumentInput,
  clientIp?: string,
) {
  const existing = await prisma.document.findFirst({
    where: { id, deletedAt: null },
  })

  if (!existing) {
    throw new DocumentError('Document not found', 404)
  }

  const updated = await prisma.document.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.leadId !== undefined ? { leadId: input.leadId } : {}),
      ...(input.dealId !== undefined ? { dealId: input.dealId } : {}),
      ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
    },
  })

  await logAudit({
    actorId,
    action: 'UPDATE',
    entityType: 'DOCUMENT',
    entityId: id,
    ipAddress: clientIp,
    before: { name: existing.name, category: existing.category },
    after: { name: updated.name, category: updated.category },
  })

  return getDocumentById(id)
}

export async function deleteDocument(id: number, actorId: number, clientIp?: string) {
  const existing = await prisma.document.findFirst({
    where: { id, deletedAt: null },
  })

  if (!existing) {
    throw new DocumentError('Document not found', 404)
  }

  await prisma.document.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  await logAudit({
    actorId,
    action: 'DELETE',
    entityType: 'DOCUMENT',
    entityId: id,
    ipAddress: clientIp,
    before: { name: existing.name, category: existing.category },
  })

  return { success: true, message: 'Document deleted successfully' }
}

export async function getDocumentVersionFile(documentId: number, versionNo?: number) {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, deletedAt: null },
    select: { currentVersion: true },
  })

  if (!doc) {
    throw new DocumentError('Document not found', 404)
  }

  const targetVersion = versionNo ?? doc.currentVersion

  const version = await prisma.documentVersion.findUnique({
    where: {
      documentId_versionNo: {
        documentId,
        versionNo: targetVersion,
      },
    },
  })

  if (!version) {
    throw new DocumentError(`Document version ${targetVersion} not found`, 404)
  }

  const candidatePaths = [
    path.join(UPLOAD_DIR, version.storageKey),
    path.resolve(process.cwd(), 'uploads', 'documents', version.storageKey),
    path.resolve(process.cwd(), 'backend', 'uploads', 'documents', version.storageKey),
  ]
  const filePath = candidatePaths.find((p) => fs.existsSync(p))
  if (!filePath) {
    throw new DocumentError('Physical document file was not found.', 404)
  }

  return {
    filePath,
    originalFileName: version.originalFileName,
    mimeType: version.mimeType,
    versionNo: version.versionNo,
  }
}

export async function getDocumentOptions() {
  const [leads, deals, customers] = await Promise.all([
    prisma.lead.findMany({
      where: { deletedAt: null },
      select: { id: true, contactName: true, companyName: true },
      orderBy: { contactName: 'asc' },
      take: 100,
    }),
    prisma.deal.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 100,
    }),
    prisma.customer.findMany({
      select: {
        id: true,
        company: { select: { name: true } },
        primaryContact: { select: { fullName: true } },
      },
      orderBy: { id: 'desc' },
      take: 100,
    }),
  ])

  return {
    leads: leads.map((l) => ({
      id: l.id,
      label: l.companyName ? `${l.contactName} (${l.companyName})` : l.contactName,
    })),
    deals: deals.map((d) => ({
      id: d.id,
      label: d.name,
    })),
    customers: customers.map((c) => ({
      id: c.id,
      label: c.company?.name || c.primaryContact?.fullName || `Customer #${c.id}`,
    })),
  }
}
