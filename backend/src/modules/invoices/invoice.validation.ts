import { z } from 'zod'

export const invoiceItemSchema = z.object({
  id: z.number().int().positive().optional(),
  productServiceId: z.number().int().positive().nullable().optional(),
  itemName: z.string().min(1, 'Item name is required'),
  description: z.string().nullable().optional(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  discountPercent: z.number().min(0).max(100).default(0),
  taxPercent: z.number().min(0).max(100).default(18),
})

export const createInvoiceSchema = z.object({
  customerId: z.number().int().positive('Customer is required'),
  dealId: z.number().int().positive().nullable().optional(),
  billingAddress: z.string().trim().max(500).nullable().optional(),
  invoiceNumber: z.string().trim().min(1).optional(),
  issueDate: z.string().or(z.date()).transform((val) => new Date(val)),
  dueDate: z.string().or(z.date()).transform((val) => new Date(val)),
  status: z
    .enum(['DRAFT', 'ISSUED', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'])
    .default('DRAFT'),
  templateEdition: z
    .enum(['MODERN_EXECUTIVE', 'CLASSIC_CORPORATE', 'MINIMALIST_CLEAN', 'VIBRANT_TECH'])
    .default('VIBRANT_TECH'),
  taxType: z.enum(['INTRA_STATE', 'INTER_STATE', 'EXEMPT']).default('INTRA_STATE'),
  currency: z.string().default('INR'),
  
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  totalDiscount: z.number().min(0).default(0),

  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
})

export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  items: z.array(invoiceItemSchema).optional(),
})

export const listInvoicesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z
    .enum(['DRAFT', 'ISSUED', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'])
    .optional(),
  customerId: z.coerce.number().int().positive().optional(),
  dealId: z.coerce.number().int().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'issueDate', 'dueDate', 'grandTotal', 'invoiceNumber']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const recordPaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be greater than 0'),
  paymentDate: z.string().or(z.date()).transform((val) => new Date(val)).default(() => new Date()),
  paymentMethod: z
    .enum([
      'CASH',
      'BANK_TRANSFER',
      'CREDIT_CARD',
      'DEBIT_CARD',
      'UPI',
      'CHEQUE',
      'OTHER',
    ])
    .default('BANK_TRANSFER'),
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  syncToCashflow: z.boolean().default(true),
})

export const updateInvoiceSettingsSchema = z.object({
  companyName: z.string().min(1).optional(),
  companyLogo: z.string().nullable().optional(),
  companyEmail: z.string().email().optional(),
  companyPhone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  addressLine1: z.string().nullable().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().nullable().optional(),
  gstin: z.string().nullable().optional(),
  panNumber: z.string().nullable().optional(),
  
  bankName: z.string().nullable().optional(),
  bankAccountNo: z.string().nullable().optional(),
  bankIfsc: z.string().nullable().optional(),
  bankBranch: z.string().nullable().optional(),
  upiId: z.string().nullable().optional(),

  invoicePrefix: z.string().min(1).max(20).optional(),
  nextNumber: z.number().int().positive().optional(),
  defaultTemplate: z
    .enum(['MODERN_EXECUTIVE', 'CLASSIC_CORPORATE', 'MINIMALIST_CLEAN', 'VIBRANT_TECH'])
    .optional(),
  brandColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  defaultNotes: z.string().nullable().optional(),
  defaultTerms: z.string().nullable().optional(),

  autoInvoiceOnDealWon: z.boolean().optional(),
  autoSyncCashflow: z.boolean().optional(),
})

export const sendInvoiceEmailSchema = z.object({
  recipientEmail: z.string().email().optional(),
  cc: z.array(z.string().email()).optional(),
  subject: z.string().optional(),
  message: z.string().optional(),
})

export const sendInvoiceWhatsAppSchema = z.object({
  recipientPhone: z.string().optional(),
  customMessage: z.string().optional(),
})

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>
export type ListInvoicesInput = z.infer<typeof listInvoicesSchema>
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>
export type UpdateInvoiceSettingsInput = z.infer<typeof updateInvoiceSettingsSchema>
export type SendInvoiceEmailInput = z.infer<typeof sendInvoiceEmailSchema>
export type SendInvoiceWhatsAppInput = z.infer<typeof sendInvoiceWhatsAppSchema>
