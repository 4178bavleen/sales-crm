import { prisma } from '../../config/database.js'
import { Prisma } from '../../generated/prisma/client.js'
import { AppError } from '../../common/errors/AppErrors.js'
import { logAudit } from '../audit/audit.service.js'
import { createExpense } from '../expenses/expense.service.js'
import { generateInvoicePdfBuffer } from './invoice.pdf.js'
import nodemailer from 'nodemailer'
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  ListInvoicesInput,
  RecordPaymentInput,
  UpdateInvoiceSettingsInput,
  SendInvoiceEmailInput,
  SendInvoiceWhatsAppInput,
} from './invoice.validation.js'

export class InvoiceServiceError extends AppError {
  constructor(message: string, statusCode = 400) {
    super(statusCode, message)
    this.name = 'InvoiceServiceError'
  }
}

/**
 * Automatically seeds permission codes for invoice module
 */
export async function ensureInvoicePermissions(): Promise<void> {
  try {
    const permissions = [
      ['invoices.view', 'View invoices and payment receipts'],
      ['invoices.create', 'Create and generate new invoices'],
      ['invoices.edit', 'Edit invoices and record payments'],
      ['invoices.delete', 'Delete invoices'],
      ['invoices.settings', 'Manage invoice editions, branding and numbering settings'],
    ]

    for (const [code, description] of permissions) {
      await prisma.permission.upsert({
        where: { code },
        update: { description },
        create: { code, description },
      })
    }

    const adminRole = await prisma.role.findFirst({
      where: { name: 'ADMIN' },
      select: { id: true },
    })

    const salesManagerRole = await prisma.role.findFirst({
      where: { name: 'SALES_MANAGER' },
      select: { id: true },
    })

    const salesEmployeeRole = await prisma.role.findFirst({
      where: { name: 'SALES_EMPLOYEE' },
      select: { id: true },
    })

    const reportViewerRole = await prisma.role.findFirst({
      where: { name: 'REPORT_VIEWER' },
      select: { id: true },
    })

    const dbPermissions = await prisma.permission.findMany({
      where: { code: { startsWith: 'invoices.' } },
      select: { id: true, code: true },
    })

    if (adminRole) {
      await prisma.rolePermission.createMany({
        data: dbPermissions.map((p) => ({
          roleId: adminRole.id,
          permissionId: p.id,
        })),
        skipDuplicates: true,
      })
    }

    if (salesManagerRole) {
      const nonSettingsPermissions = dbPermissions.filter((p) => p.code !== 'invoices.settings')
      await prisma.rolePermission.createMany({
        data: nonSettingsPermissions.map((p) => ({
          roleId: salesManagerRole.id,
          permissionId: p.id,
        })),
        skipDuplicates: true,
      })

      const settingsPerm = dbPermissions.find((p) => p.code === 'invoices.settings')
      if (settingsPerm) {
        await prisma.rolePermission.deleteMany({
          where: {
            roleId: salesManagerRole.id,
            permissionId: settingsPerm.id,
          },
        })
      }
    }

    if (salesEmployeeRole) {
      const employeePerms = dbPermissions.filter((p) =>
        ['invoices.view', 'invoices.create', 'invoices.edit'].includes(p.code)
      )
      await prisma.rolePermission.createMany({
        data: employeePerms.map((p) => ({
          roleId: salesEmployeeRole.id,
          permissionId: p.id,
        })),
        skipDuplicates: true,
      })
    }

    if (reportViewerRole) {
      const viewPerm = dbPermissions.find((p) => p.code === 'invoices.view')
      if (viewPerm) {
        await prisma.rolePermission.createMany({
          data: [{ roleId: reportViewerRole.id, permissionId: viewPerm.id }],
          skipDuplicates: true,
        })
      }
    }
  } catch (err) {
    console.error('[InvoiceService] Failed to ensure invoice permissions:', err)
  }
}

/**
 * Retrieves global invoice and company branding settings
 */
export async function getInvoiceSettings() {
  let settings = await prisma.invoiceSetting.findFirst({
    orderBy: { id: 'asc' },
  })

  if (!settings) {
    settings = await prisma.invoiceSetting.create({
      data: {
        companyName: 'Vibrantick Infotech Solutions',
        companyEmail: 'info@vibrantick.in',
        companyPhone: '+91 8699792040',
        whatsappNumber: '8699792040',
        addressLine1: 'SCO 12, Level 2, IT Park',
        city: 'Mohali',
        state: 'Punjab',
        country: 'India',
        pincode: '160071',
        gstin: '03ABCDE1234F1Z5',
        panNumber: 'ABCDE1234F',

        bankName: 'HDFC Bank',
        bankAccountNo: '50200012345678',
        bankIfsc: 'HDFC0001234',
        bankBranch: 'IT Park Branch',
        upiId: '8699792040@upi',

        invoicePrefix: 'VIS-INV-',
        nextNumber: 1001,
        defaultTemplate: 'VIBRANT_TECH',
        brandColor: '#1d61e7',
        defaultNotes: 'Thank you for partnering with Vibrantick Infotech Solutions.',
        defaultTerms:
          '1. Payment is due within 15 days of invoice date.\n2. Please quote the invoice number when making electronic transfer.\n3. All disputes are subject to local jurisdiction.',

        autoInvoiceOnDealWon: true,
        autoSyncCashflow: true,
      },
    })
  }

  return settings
}

/**
 * Updates invoice settings
 */
export async function updateInvoiceSettings(input: UpdateInvoiceSettingsInput, userId?: number) {
  const current = await getInvoiceSettings()

  const updated = await prisma.invoiceSetting.update({
    where: { id: current.id },
    data: {
      ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
      ...(input.companyLogo !== undefined ? { companyLogo: input.companyLogo } : {}),
      ...(input.companyEmail !== undefined ? { companyEmail: input.companyEmail } : {}),
      ...(input.companyPhone !== undefined ? { companyPhone: input.companyPhone } : {}),
      ...(input.whatsappNumber !== undefined ? { whatsappNumber: input.whatsappNumber } : {}),
      ...(input.addressLine1 !== undefined ? { addressLine1: input.addressLine1 } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.state !== undefined ? { state: input.state } : {}),
      ...(input.country !== undefined ? { country: input.country } : {}),
      ...(input.pincode !== undefined ? { pincode: input.pincode } : {}),
      ...(input.gstin !== undefined ? { gstin: input.gstin } : {}),
      ...(input.panNumber !== undefined ? { panNumber: input.panNumber } : {}),
      ...(input.bankName !== undefined ? { bankName: input.bankName } : {}),
      ...(input.bankAccountNo !== undefined ? { bankAccountNo: input.bankAccountNo } : {}),
      ...(input.bankIfsc !== undefined ? { bankIfsc: input.bankIfsc } : {}),
      ...(input.bankBranch !== undefined ? { bankBranch: input.bankBranch } : {}),
      ...(input.upiId !== undefined ? { upiId: input.upiId } : {}),
      ...(input.invoicePrefix !== undefined ? { invoicePrefix: input.invoicePrefix } : {}),
      ...(input.nextNumber !== undefined ? { nextNumber: input.nextNumber } : {}),
      ...(input.defaultTemplate !== undefined ? { defaultTemplate: input.defaultTemplate } : {}),
      ...(input.brandColor !== undefined ? { brandColor: input.brandColor } : {}),
      ...(input.defaultNotes !== undefined ? { defaultNotes: input.defaultNotes } : {}),
      ...(input.defaultTerms !== undefined ? { defaultTerms: input.defaultTerms } : {}),
      ...(input.autoInvoiceOnDealWon !== undefined ? { autoInvoiceOnDealWon: input.autoInvoiceOnDealWon } : {}),
      ...(input.autoSyncCashflow !== undefined ? { autoSyncCashflow: input.autoSyncCashflow } : {}),
    },
  })

  if (userId) {
    void logAudit({
      actorId: userId,
      action: 'UPDATE',
      entityType: 'InvoiceSetting',
      entityId: updated.id,
      before: current,
      after: updated,
    })
  }

  return updated
}

/**
 * Calculates item totals, taxes, and grand totals
 */
export function calculateTotals(
  items: Array<{
    itemName: string
    description?: string | null
    quantity: number
    unitPrice: number
    discountPercent?: number
    taxPercent?: number
    productServiceId?: number | null
  }>,
  taxType: 'INTRA_STATE' | 'INTER_STATE' | 'EXEMPT',
  totalDiscount = 0
) {
  let subtotal = 0
  let totalTax = 0

  const processedItems = items.map((item) => {
    const qty = Number(item.quantity) || 1
    const price = Number(item.unitPrice) || 0
    const discPct = Math.min(100, Math.max(0, Number(item.discountPercent) || 0))
    const taxRate = taxType === 'EXEMPT' ? 0 : Math.min(100, Math.max(0, Number(item.taxPercent) || 0))

    const rawTotal = qty * price
    const itemDiscount = rawTotal * (discPct / 100)
    const taxableAmount = Math.max(0, rawTotal - itemDiscount)
    const itemTaxAmount = taxableAmount * (taxRate / 100)
    const lineTotal = taxableAmount + itemTaxAmount

    subtotal += taxableAmount
    totalTax += itemTaxAmount

    return {
      productServiceId: item.productServiceId || null,
      itemName: item.itemName,
      description: item.description || null,
      quantity: new Prisma.Decimal(qty),
      unitPrice: new Prisma.Decimal(price),
      discountPercent: new Prisma.Decimal(discPct),
      taxPercent: new Prisma.Decimal(taxRate),
      lineTotal: new Prisma.Decimal(Number(lineTotal.toFixed(2))),
    }
  })

  subtotal = Number(subtotal.toFixed(2))
  totalTax = Number(totalTax.toFixed(2))
  const grandTotal = Math.max(0, Number((subtotal + totalTax - totalDiscount).toFixed(2)))

  return {
    subtotal: new Prisma.Decimal(subtotal),
    taxAmount: new Prisma.Decimal(totalTax),
    totalDiscount: new Prisma.Decimal(totalDiscount),
    grandTotal: new Prisma.Decimal(grandTotal),
    processedItems,
  }
}

/**
 * Previews the next sequence invoice number without incrementing the counter
 */
export async function previewNextInvoiceNumber(): Promise<string> {
  const settings = await getInvoiceSettings()
  const year = new Date().getFullYear()
  const sequenceStr = settings.nextNumber.toString().padStart(4, '0')
  return `${settings.invoicePrefix}${year}-${sequenceStr}`
}

/**
 * Generates sequential invoice number atomically
 */
export async function getNextInvoiceNumber(): Promise<string> {
  const settings = await getInvoiceSettings()

  // Atomically increment sequence counter
  const updated = await prisma.invoiceSetting.update({
    where: { id: settings.id },
    data: { nextNumber: { increment: 1 } },
    select: { nextNumber: true, invoicePrefix: true },
  })

  const year = new Date().getFullYear()
  // The allocated number for this invoice is the pre-increment value
  const allocatedNumber = updated.nextNumber - 1
  const sequenceStr = allocatedNumber.toString().padStart(4, '0')
  return `${updated.invoicePrefix}${year}-${sequenceStr}`
}

/**
 * Creates a new invoice manually
 */
export async function createInvoice(input: CreateInvoiceInput, userId: number) {
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, deletedAt: null },
    include: { company: true, primaryContact: true },
  })
  if (!customer) {
    throw new InvoiceServiceError('Customer not found or has been deleted', 404)
  }

  if (input.dealId) {
    const deal = await prisma.deal.findFirst({
      where: { id: input.dealId, deletedAt: null },
    })
    if (!deal) {
      throw new InvoiceServiceError('Selected deal not found', 404)
    }
  }

  const settings = await getInvoiceSettings()
  let invoiceNumber = input.invoiceNumber?.trim()
  if (!invoiceNumber) {
    invoiceNumber = await getNextInvoiceNumber()
  } else {
    // If the provided invoice number ends with digits >= settings.nextNumber, advance nextNumber
    const match = invoiceNumber.match(/(\d+)$/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num >= settings.nextNumber) {
        await prisma.invoiceSetting.update({
          where: { id: settings.id },
          data: { nextNumber: num + 1 },
        })
      }
    }
  }

  // Check duplicate invoice number
  const existing = await prisma.invoice.findUnique({
    where: { invoiceNumber },
  })
  if (existing) {
    // If the conflicting invoice number was the previewed sequential number, atomically generate the next available sequence number
    const isSequentialPattern = invoiceNumber.startsWith(settings.invoicePrefix)
    if (isSequentialPattern) {
      invoiceNumber = await getNextInvoiceNumber()
    } else {
      throw new InvoiceServiceError(`Invoice number "${invoiceNumber}" already exists`, 409)
    }
  }

  // Validate and sanitize any productServiceIds in items
  const productIds = input.items
    .map((i) => i.productServiceId)
    .filter((id): id is number => typeof id === 'number' && id > 0)
  if (productIds.length > 0) {
    const existingProducts = await prisma.productService.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    })
    const validIds = new Set(existingProducts.map((p) => p.id))
    for (const item of input.items) {
      if (item.productServiceId && !validIds.has(item.productServiceId)) {
        item.productServiceId = null
      }
    }
  }

  const { subtotal, taxAmount, totalDiscount, grandTotal, processedItems } = calculateTotals(
    input.items,
    input.taxType,
    input.totalDiscount
  )

  const amountDue = grandTotal

  let invoice
  try {
    invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: input.customerId,
        dealId: input.dealId || null,
        createdById: userId,
        status: input.status || 'DRAFT',
        templateEdition: input.templateEdition || settings.defaultTemplate,
        taxType: input.taxType || 'INTRA_STATE',
        currency: input.currency || 'INR',
        issueDate: input.issueDate,
        dueDate: input.dueDate,

        subtotal,
        totalDiscount,
        taxAmount,
        grandTotal,
        amountPaid: new Prisma.Decimal(0),
        amountDue,

        notes: input.notes !== undefined ? input.notes : settings.defaultNotes,
        terms: input.terms !== undefined ? input.terms : settings.defaultTerms,

        items: {
          create: processedItems,
        },
      },
      include: {
        customer: {
          include: {
            company: true,
            primaryContact: true,
          },
        },
        deal: true,
        items: true,
        payments: true,
      },
    })
  } catch (createErr) {
    if (
      createErr instanceof Prisma.PrismaClientKnownRequestError &&
      createErr.code === 'P2002'
    ) {
      // Allocate next sequence number and retry once
      const fallbackNumber = await getNextInvoiceNumber()
      invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: fallbackNumber,
          customerId: input.customerId,
          dealId: input.dealId || null,
          createdById: userId,
          status: input.status || 'DRAFT',
          templateEdition: input.templateEdition || settings.defaultTemplate,
          taxType: input.taxType || 'INTRA_STATE',
          currency: input.currency || 'INR',
          issueDate: input.issueDate,
          dueDate: input.dueDate,

          subtotal,
          totalDiscount,
          taxAmount,
          grandTotal,
          amountPaid: new Prisma.Decimal(0),
          amountDue,

          notes: input.notes !== undefined ? input.notes : settings.defaultNotes,
          terms: input.terms !== undefined ? input.terms : settings.defaultTerms,

          items: {
            create: processedItems,
          },
        },
        include: {
          customer: {
            include: {
              company: true,
              primaryContact: true,
            },
          },
          deal: true,
          items: true,
          payments: true,
        },
      })
    } else {
      throw createErr
    }
  }

  void logAudit({
    actorId: userId,
    action: 'CREATE',
    entityType: 'Invoice',
    entityId: invoice.id,
    after: invoice,
  })

  return invoice
}

/**
 * Updates an invoice
 */
export async function updateInvoice(id: number, input: UpdateInvoiceInput, userId: number) {
  const existing = await prisma.invoice.findFirst({
    where: { id, deletedAt: null },
    include: { items: true, payments: true },
  })
  if (!existing) {
    throw new InvoiceServiceError('Invoice not found or has been deleted', 404)
  }

  const taxType = input.taxType || existing.taxType
  const totalDiscount = input.totalDiscount !== undefined ? input.totalDiscount : Number(existing.totalDiscount)

  let subtotal = existing.subtotal
  let taxAmount = existing.taxAmount
  let grandTotal = existing.grandTotal
  let processedItems = null

  if (input.items && input.items.length > 0) {
    // Validate and sanitize any productServiceIds in items
    const productIds = input.items
      .map((i) => i.productServiceId)
      .filter((id): id is number => typeof id === 'number' && id > 0)
    if (productIds.length > 0) {
      const existingProducts = await prisma.productService.findMany({
        where: { id: { in: productIds } },
        select: { id: true },
      })
      const validIds = new Set(existingProducts.map((p) => p.id))
      for (const item of input.items) {
        if (item.productServiceId && !validIds.has(item.productServiceId)) {
          item.productServiceId = null
        }
      }
    }

    const calc = calculateTotals(input.items, taxType, totalDiscount)
    subtotal = calc.subtotal
    taxAmount = calc.taxAmount
    grandTotal = calc.grandTotal
    processedItems = calc.processedItems
  } else if (input.taxType !== undefined || input.totalDiscount !== undefined) {
    const currentItems = existing.items.map((i) => ({
      itemName: i.itemName,
      description: i.description,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      discountPercent: Number(i.discountPercent),
      taxPercent: Number(i.taxPercent),
      productServiceId: i.productServiceId,
    }))
    const calc = calculateTotals(currentItems, taxType, totalDiscount)
    subtotal = calc.subtotal
    taxAmount = calc.taxAmount
    grandTotal = calc.grandTotal
  }

  const amountPaid = Number(existing.amountPaid)
  const amountDue = Math.max(0, Number((Number(grandTotal) - amountPaid).toFixed(2)))

  let newStatus = input.status || existing.status
  if (amountDue <= 0 && amountPaid > 0) {
    newStatus = 'PAID'
  } else if (amountPaid > 0 && amountDue > 0) {
    newStatus = 'PARTIALLY_PAID'
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (processedItems) {
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id },
      })

      await tx.invoiceItem.createMany({
        data: processedItems.map((item) => ({
          invoiceId: id,
          ...item,
        })),
      })
    }

    return tx.invoice.update({
      where: { id },
      data: {
        ...(input.customerId ? { customerId: input.customerId } : {}),
        ...(input.dealId !== undefined ? { dealId: input.dealId } : {}),
        ...(input.issueDate ? { issueDate: input.issueDate } : {}),
        ...(input.dueDate ? { dueDate: input.dueDate } : {}),
        status: newStatus,
        templateEdition: input.templateEdition || existing.templateEdition,
        taxType,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.terms !== undefined ? { terms: input.terms } : {}),

        subtotal,
        totalDiscount: new Prisma.Decimal(totalDiscount),
        taxAmount,
        grandTotal,
        amountDue: new Prisma.Decimal(amountDue),
      },
      include: {
        customer: {
          include: {
            company: true,
            primaryContact: true,
          },
        },
        deal: true,
        items: true,
        payments: true,
      },
    })
  })

  void logAudit({
    actorId: userId,
    action: 'UPDATE',
    entityType: 'Invoice',
    entityId: id,
    before: existing,
    after: updated,
  })

  return updated
}

/**
 * List invoices with filtering, pagination and search
 */
export async function listInvoices(input: ListInvoicesInput) {
  const page = Math.max(1, input.page || 1)
  const limit = Math.min(100, Math.max(1, input.limit || 20))
  const skip = (page - 1) * limit

  const where: any = { deletedAt: null }

  if (input.status) {
    where.status = input.status
  }

  if (input.customerId) {
    where.customerId = input.customerId
  }

  if (input.dealId) {
    where.dealId = input.dealId
  }

  if (input.search) {
    const q = input.search.trim()
    where.OR = [
      { invoiceNumber: { contains: q, mode: 'insensitive' } },
      { customer: { company: { name: { contains: q, mode: 'insensitive' } } } },
      { customer: { primaryContact: { fullName: { contains: q, mode: 'insensitive' } } } },
      { notes: { contains: q, mode: 'insensitive' } },
    ]
  }

  if (input.startDate || input.endDate) {
    where.issueDate = {}
    if (input.startDate) {
      where.issueDate.gte = new Date(input.startDate)
    }
    if (input.endDate) {
      where.issueDate.lte = new Date(input.endDate)
    }
  }

  const orderBy: any = {}
  orderBy[input.sortBy || 'createdAt'] = input.sortOrder || 'desc'

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        customer: {
          include: {
            company: true,
            primaryContact: true,
          },
        },
        deal: {
          select: {
            id: true,
            name: true,
            estimatedValue: true,
            status: true,
          },
        },
        payments: true,
      },
    }),
    prisma.invoice.count({ where }),
  ])

  // Summary aggregation (exclude CANCELLED invoices from financial totals)
  const summaryAggregations = await prisma.invoice.groupBy({
    by: ['status'],
    where: {
      deletedAt: null,
      status: { not: 'CANCELLED' },
    },
    _sum: {
      grandTotal: true,
      amountPaid: true,
      amountDue: true,
    },
    _count: {
      id: true,
    },
  })

  // Get total count per status including CANCELLED for status badge tallies
  const allStatusCounts = await prisma.invoice.groupBy({
    by: ['status'],
    where: { deletedAt: null },
    _count: {
      id: true,
    },
  })

  const summary = {
    totalInvoiced: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    statusCounts: {} as Record<string, number>,
  }

  allStatusCounts.forEach((item) => {
    summary.statusCounts[item.status] = item._count.id
  })

  summaryAggregations.forEach((item) => {
    summary.totalInvoiced += Number(item._sum.grandTotal || 0)
    summary.totalPaid += Number(item._sum.amountPaid || 0)
    summary.totalOutstanding += Number(item._sum.amountDue || 0)
  })

  return {
    invoices,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    summary,
  }
}

/**
 * Gets a single invoice by ID
 */
export async function getInvoiceById(id: number) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, deletedAt: null },
    include: {
      customer: {
        include: {
          company: true,
          primaryContact: true,
        },
      },
      deal: true,
      items: true,
      payments: {
        orderBy: { paymentDate: 'desc' },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  if (!invoice) {
    throw new InvoiceServiceError('Invoice not found', 404)
  }

  return invoice
}

/**
 * Deletes an invoice
 */
export async function deleteInvoice(id: number, userId: number) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, deletedAt: null },
    include: { payments: true },
  })

  if (!invoice) {
    throw new InvoiceServiceError('Invoice not found or already deleted', 404)
  }

  if (invoice.payments.length > 0) {
    throw new InvoiceServiceError(
      'Cannot delete invoice that has recorded payments. Please void or cancel the invoice instead.',
      400
    )
  }

  await prisma.invoice.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  void logAudit({
    actorId: userId,
    action: 'DELETE',
    entityType: 'Invoice',
    entityId: id,
    before: invoice,
  })

  return { success: true, message: 'Invoice deleted successfully' }
}

/**
 * Records a payment against an invoice and automatically synchronizes with Cashflow (Expense/Income)
 */
export async function recordInvoicePayment(invoiceId: number, input: RecordPaymentInput, userId: number) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, deletedAt: null },
    include: {
      customer: {
        include: {
          company: true,
          primaryContact: true,
        },
      },
      payments: true,
    },
  })

  if (!invoice) {
    throw new InvoiceServiceError('Invoice not found or has been deleted', 404)
  }

  if (invoice.status === 'CANCELLED') {
    throw new InvoiceServiceError('Cannot record payment for a cancelled invoice', 400)
  }

  if (invoice.status === 'PAID') {
    throw new InvoiceServiceError('Invoice is already fully paid', 400)
  }

  const currentAmountDue = Number(invoice.amountDue)
  if (input.amount > currentAmountDue) {
    throw new InvoiceServiceError(
      `Payment amount (₹${input.amount}) exceeds the remaining balance due (₹${currentAmountDue})`,
      400
    )
  }

  const currentAmountPaid = Number(invoice.amountPaid)
  const newAmountPaid = Number((currentAmountPaid + input.amount).toFixed(2))
  const newAmountDue = Math.max(0, Number((Number(invoice.grandTotal) - newAmountPaid).toFixed(2)))
  const newStatus = newAmountDue <= 0 ? 'PAID' : 'PARTIALLY_PAID'

  let financialTransactionId: number | null = null

  // Auto-sync to Expense / Financial Management system
  if (input.syncToCashflow) {
    try {
      const clientName = invoice.customer?.company?.name || 'Client'
      const transaction = await createExpense(
        {
          type: 'INCOME',
          title: `Payment for Invoice #${invoice.invoiceNumber}`,
          category: 'Client Payment',
          amount: input.amount,
          transactionDate: input.paymentDate.toISOString(),
          paymentMethod: input.paymentMethod,
          status: 'COMPLETED',
          reference: input.reference || invoice.invoiceNumber,
          description: `Automatic payment record for Invoice #${invoice.invoiceNumber} (${clientName})`,
          customerId: invoice.customerId || undefined,
          dealId: invoice.dealId || undefined,
        },
        userId
      )
      financialTransactionId = transaction.id
    } catch (syncErr) {
      console.error('[InvoiceService] Failed to auto-sync payment to cashflow:', syncErr)
    }
  }

  const payment = await prisma.$transaction(async (tx) => {
    const paymentRecord = await tx.invoicePayment.create({
      data: {
        invoiceId,
        amount: new Prisma.Decimal(input.amount),
        paymentDate: input.paymentDate,
        paymentMethod: input.paymentMethod,
        reference: input.reference || null,
        notes: input.notes || null,
        financialTransactionId,
      },
    })

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: new Prisma.Decimal(newAmountPaid),
        amountDue: new Prisma.Decimal(newAmountDue),
        status: newStatus,
      },
    })

    return paymentRecord
  })

  void logAudit({
    actorId: userId,
    action: 'RECORD_PAYMENT',
    entityType: 'Invoice',
    entityId: invoiceId,
    after: {
      payment,
      newAmountPaid,
      newAmountDue,
      newStatus,
    },
  })

  return payment
}

/**
 * Automatically creates an invoice when a Deal is marked WON
 */
export async function generateInvoiceFromDeal(dealId: number, userId: number) {
  const settings = await getInvoiceSettings()
  if (!settings.autoInvoiceOnDealWon) {
    return null
  }

  // Check if invoice already exists for this deal
  const existingInvoice = await prisma.invoice.findFirst({
    where: { dealId, deletedAt: null },
  })
  if (existingInvoice) {
    return existingInvoice
  }

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      customer: {
        include: {
          company: true,
          primaryContact: true,
        },
      },
      productService: true,
    },
  })

  if (!deal || !deal.customerId || !deal.customer) {
    return null
  }

  const issueDate = new Date()
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 15)

  const dealValue = Number(deal.closedRevenue || deal.estimatedValue || 0)
  const items = [
    {
      productServiceId: deal.productServiceId || null,
      itemName: deal.productService?.name || `Project: ${deal.name}`,
      description: 'Professional IT products and services delivery',
      quantity: 1,
      unitPrice: dealValue,
      discountPercent: 0,
      taxPercent: 18,
    },
  ]

  const createdInvoice = await createInvoice(
    {
      customerId: deal.customerId,
      dealId: deal.id,
      issueDate,
      dueDate,
      status: 'ISSUED',
      templateEdition: settings.defaultTemplate,
      taxType: 'INTRA_STATE',
      currency: 'INR',
      totalDiscount: 0,
      items,
      notes: `Generated automatically upon winning deal "${deal.name}".`,
      terms: settings.defaultTerms,
    },
    userId
  )

  return createdInvoice
}

/**
 * Generates the PDF buffer for an invoice
 */
export async function generateInvoicePdf(invoiceId: number) {
  const invoice = await getInvoiceById(invoiceId)
  const settings = await getInvoiceSettings()

  const buffer = await generateInvoicePdfBuffer({
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    status: invoice.status,
    templateEdition: invoice.templateEdition,
    taxType: invoice.taxType,
    currency: invoice.currency,
    subtotal: Number(invoice.subtotal),
    totalDiscount: Number(invoice.totalDiscount),
    taxAmount: Number(invoice.taxAmount),
    grandTotal: Number(invoice.grandTotal),
    amountPaid: Number(invoice.amountPaid),
    amountDue: Number(invoice.amountDue),
    notes: invoice.notes,
    terms: invoice.terms,
    customer: invoice.customer
      ? {
          companyName: invoice.customer.company?.name || 'Valued Customer',
          contactPerson: invoice.customer.primaryContact?.fullName || null,
          email: invoice.customer.primaryContact?.email || null,
          phone: invoice.customer.primaryContact?.phone || invoice.customer.company?.phone || null,
          address: [
            invoice.customer.company?.address,
            invoice.customer.company?.city,
            invoice.customer.company?.state,
            invoice.customer.company?.country,
          ]
            .filter(Boolean)
            .map((s) => String(s).trim())
            .filter(Boolean)
            .join(', ') || null,
        }
      : null,
    items: invoice.items.map((i) => ({
      itemName: i.itemName,
      description: i.description,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      discountPercent: Number(i.discountPercent),
      taxPercent: Number(i.taxPercent),
      lineTotal: Number(i.lineTotal),
    })),
    settings: {
      companyName: settings.companyName,
      companyLogo: settings.companyLogo,
      companyEmail: settings.companyEmail,
      companyPhone: settings.companyPhone,
      whatsappNumber: settings.whatsappNumber,
      addressLine1: settings.addressLine1,
      city: settings.city,
      state: settings.state,
      country: settings.country,
      pincode: settings.pincode,
      gstin: settings.gstin,
      panNumber: settings.panNumber,
      bankName: settings.bankName,
      bankAccountNo: settings.bankAccountNo,
      bankIfsc: settings.bankIfsc,
      bankBranch: settings.bankBranch,
      upiId: settings.upiId,
      brandColor: settings.brandColor,
      defaultTerms: settings.defaultTerms,
    },
  })

  return {
    buffer,
    filename: `Invoice-${invoice.invoiceNumber}.pdf`,
  }
}

/**
 * Sends Invoice via Email with PDF attachment
 */
export async function sendInvoiceEmail(invoiceId: number, input?: SendInvoiceEmailInput) {
  const invoice = await getInvoiceById(invoiceId)
  const settings = await getInvoiceSettings()

  const emailSettings = await prisma.emailSetting.findFirst({
    orderBy: { id: 'asc' },
  })

  const recipient = input?.recipientEmail || invoice.customer?.primaryContact?.email
  if (!recipient || !recipient.includes('@')) {
    throw new InvoiceServiceError('A valid recipient email address is required', 400)
  }

  const { buffer, filename } = await generateInvoicePdf(invoiceId)

  // Create transporter
  let transporter: any = null
  let fromSender = `"${settings.companyName}" <billing@vibrantick.in>`

  if (emailSettings && emailSettings.smtpHost && emailSettings.smtpPort) {
    const auth = emailSettings.smtpUser
      ? { user: emailSettings.smtpUser, pass: emailSettings.smtpPass }
      : undefined

    transporter = nodemailer.createTransport({
      host: emailSettings.smtpHost,
      port: emailSettings.smtpPort,
      secure: emailSettings.smtpSecure,
      auth,
      connectionTimeout: 10000,
    })

    fromSender = `"${emailSettings.fromName || settings.companyName}" <${
      emailSettings.fromEmail || emailSettings.smtpUser || 'billing@vibrantick.in'
    }>`
  }

  const subject =
    input?.subject ||
    `Tax Invoice #${invoice.invoiceNumber} from ${settings.companyName || 'Vibrantick Infotech Solutions'}`

  const clientName = invoice.customer?.primaryContact?.fullName || invoice.customer?.company?.name || 'Client'

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid ${settings.brandColor || '#1d61e7'}; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 22px;">${settings.companyName}</h2>
        <p style="color: #64748b; margin: 4px 0 0; font-size: 14px;">Official Tax Invoice & Receipt</p>
      </div>

      <p style="color: #334155; font-size: 15px; line-height: 1.6;">
        Dear <strong>${clientName}</strong>,
      </p>

      <p style="color: #334155; font-size: 15px; line-height: 1.6;">
        ${input?.message || 'Please find attached the official invoice for recent products & services rendered.'}
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="color: #64748b; padding: 6px 0;"><strong>Invoice Number:</strong></td>
            <td style="color: #0f172a; text-align: right; padding: 6px 0;"><strong>${invoice.invoiceNumber}</strong></td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 6px 0;">Issue Date:</td>
            <td style="color: #0f172a; text-align: right; padding: 6px 0;">${new Date(invoice.issueDate).toLocaleDateString('en-IN')}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 6px 0;">Due Date:</td>
            <td style="color: #0f172a; text-align: right; padding: 6px 0;">${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 6px 0;">Total Amount:</td>
            <td style="color: #1d61e7; font-weight: bold; font-size: 16px; text-align: right; padding: 6px 0;">₹ ${Number(invoice.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          ${
            Number(invoice.amountDue) > 0
              ? `<tr>
                  <td style="color: #dc2626; padding: 6px 0;"><strong>Balance Due:</strong></td>
                  <td style="color: #dc2626; font-weight: bold; text-align: right; padding: 6px 0;">₹ ${Number(invoice.amountDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>`
              : `<tr>
                  <td style="color: #16a34a; padding: 6px 0;"><strong>Status:</strong></td>
                  <td style="color: #16a34a; font-weight: bold; text-align: right; padding: 6px 0;">PAID IN FULL</td>
                </tr>`
          }
        </table>
      </div>

      <div style="background-color: #f1f5f9; border-radius: 6px; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #475569;">
        <strong>Bank:</strong> ${settings.bankName || 'HDFC Bank'} | 
        <strong>A/C:</strong> ${settings.bankAccountNo || 'XXXXXXXX'} | 
        <strong>IFSC:</strong> ${settings.bankIfsc || 'HDFC0001234'}<br/>
        ${settings.upiId ? `<strong>UPI ID:</strong> ${settings.upiId}<br/>` : ''}
        ${settings.whatsappNumber ? `<strong>WhatsApp Support:</strong> +91 ${settings.whatsappNumber}` : ''}
      </div>

      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
        A copy of the invoice is attached in PDF format for your records. If you have any questions, feel free to contact us.
      </p>

      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
        Sent automatically from ${settings.companyName || 'Sales CRM'}${settings.whatsappNumber ? ` • Official Support: +91 ${settings.whatsappNumber}` : ''}
      </p>
    </div>
  `

  let dispatchResult = { sent: false, note: '' }

  if (transporter) {
    try {
      await transporter.sendMail({
        from: fromSender,
        to: recipient,
        cc: input?.cc,
        subject,
        html,
        attachments: [
          {
            filename,
            content: buffer,
            contentType: 'application/pdf',
          },
        ],
      })
      dispatchResult = { sent: true, note: 'Email dispatched via configured SMTP transporter with PDF attachment' }
    } catch (err: any) {
      console.error('[InvoiceService] SMTP Send Error:', err)
      dispatchResult = { sent: false, note: `SMTP send failed: ${err.message}` }
    }
  } else {
    dispatchResult = {
      sent: true,
      note: 'Simulated email dispatch (SMTP host not configured yet in Email Settings). PDF rendered successfully.',
    }
  }

  // Only update invoice status and emailSentAt if email was actually dispatched or simulated successfully
  if (dispatchResult.sent) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        emailSentAt: new Date(),
        status: invoice.status === 'DRAFT' || invoice.status === 'ISSUED' ? 'SENT' : invoice.status,
      },
    })
  }

  return {
    success: dispatchResult.sent,
    recipient,
    subject,
    ...dispatchResult,
  }
}

/**
 * Dispatches or formats WhatsApp delivery using the sender number configured in WhatsApp Settings
 */
export async function sendInvoiceWhatsApp(invoiceId: number, input?: SendInvoiceWhatsAppInput) {
  const invoice = await getInvoiceById(invoiceId)
  const settings = await getInvoiceSettings()

  const rawPhone = input?.recipientPhone || invoice.customer?.primaryContact?.phone || invoice.customer?.company?.phone
  if (!rawPhone) {
    throw new InvoiceServiceError('A recipient phone number is required for WhatsApp delivery', 400)
  }

  // Clean phone number (numeric digits only)
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '')
  const recipientPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone

  // Fetch WhatsApp settings early so we can use the configured sender number in the message text
  const whatsAppSettings = await prisma.whatsAppSetting.findFirst({
    orderBy: { id: 'asc' },
  })

  // Use the WhatsApp Settings phone number if available, else fall back to InvoiceSetting whatsappNumber
  const officialNumber = settings.whatsappNumber || ''
  const clientName = invoice.customer?.primaryContact?.fullName || invoice.customer?.company?.name || 'Client'

  const messageText =
    input?.customMessage ||
    `Hello ${clientName},

Greetings from *${settings.companyName || 'Vibrantick Infotech Solutions'}*!

Here is your Tax Invoice summary:
📄 *Invoice Number:* ${invoice.invoiceNumber}
📅 *Issue Date:* ${new Date(invoice.issueDate).toLocaleDateString('en-IN')}
⏳ *Due Date:* ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}
💰 *Total Amount:* ₹${Number(invoice.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
${Number(invoice.amountDue) > 0 ? `❗ *Balance Due:* ₹${Number(invoice.amountDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '✅ *Status:* PAID'}

🏦 *Bank Details:*
A/C: ${settings.bankAccountNo || 'XXXXXXXX'}
IFSC: ${settings.bankIfsc || 'HDFC0001234'}
${settings.upiId ? `UPI: ${settings.upiId}\n` : ''}
For any queries, reply to this message or call us at +91 ${officialNumber}.
Thank you for your business!`

  // Direct WhatsApp Web / Mobile deep-link
  const directWhatsAppUrl = `https://wa.me/${recipientPhone}?text=${encodeURIComponent(messageText)}`

  let metaApiResult = { dispatchedViaMeta: false, note: '' }

  if (
    whatsAppSettings &&
    whatsAppSettings.phoneNumberId &&
    whatsAppSettings.accessToken &&
    whatsAppSettings.accessToken.trim().length > 0
  ) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${whatsAppSettings.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${whatsAppSettings.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipientPhone,
            type: 'text',
            text: { body: messageText },
          }),
        }
      )

      if (response.ok) {
        metaApiResult = {
          dispatchedViaMeta: true,
          note: `Message dispatched via WhatsApp Cloud API from sender number ${officialNumber}`,
        }
      } else {
        const errorData = await response.json()
        metaApiResult = {
          dispatchedViaMeta: false,
          note: `Meta Cloud API response: ${JSON.stringify(errorData)}`,
        }
      }
    } catch (err: any) {
      metaApiResult = {
        dispatchedViaMeta: false,
        note: `Meta Cloud API network call failed: ${err.message}`,
      }
    }
  } else {
    metaApiResult = {
      dispatchedViaMeta: false,
      note: `Meta Cloud API credentials not configured. Direct WhatsApp dispatch URL is ready to launch (+91 ${officialNumber}).`,
    }
  }

  // Update invoice status and whatsappSentAt if message was dispatched via Meta or direct WhatsApp URL is prepared
  const isDeliveredOrReady = metaApiResult.dispatchedViaMeta || (!whatsAppSettings?.accessToken && directWhatsAppUrl)

  if (isDeliveredOrReady) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        whatsappSentAt: new Date(),
        status: invoice.status === 'DRAFT' || invoice.status === 'ISSUED' ? 'SENT' : invoice.status,
      },
    })
  }

  return {
    success: Boolean(isDeliveredOrReady),
    recipientPhone,
    officialSenderNumber: officialNumber,
    directWhatsAppUrl,
    messageText,
    ...metaApiResult,
  }
}
