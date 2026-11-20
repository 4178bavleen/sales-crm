import { z } from 'zod'

export const proposalIdSchema = z.coerce.number().int().positive('Invalid proposal ID')

export const proposalItemSchema = z.object({
  id: z.number().int().positive().optional(),
  productServiceId: z.number().int().positive().nullable().optional(),
  title: z.string().min(1, 'Item title is required').max(255),
  description: z.string().nullable().optional(),
  quantity: z.coerce.number().min(0.01, 'Quantity must be greater than zero'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  position: z.coerce.number().int().default(0),
})

export const createProposalSchema = z.object({
  title: z.string().min(1, 'Proposal title is required').max(255),
  proposalNumber: z.string().max(50).optional(),
  customerId: z.coerce.number().int().positive('Valid customer is required'),
  leadId: z.coerce.number().int().positive().nullable().optional(),
  dealId: z.coerce.number().int().positive().nullable().optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  currency: z.string().default('USD'),
  issueDate: z.string().or(z.date()).optional(),
  validUntil: z.string().or(z.date()),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  discountValue: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  summary: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  clientNotes: z.string().nullable().optional(),
  items: z.array(proposalItemSchema).min(1, 'At least one line item is required'),
})

export const updateProposalSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  proposalNumber: z.string().max(50).optional(),
  customerId: z.coerce.number().int().positive().optional(),
  leadId: z.coerce.number().int().positive().nullable().optional(),
  dealId: z.coerce.number().int().positive().nullable().optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  status: z.enum(['DRAFT', 'SENT', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'EXPIRED']).optional(),
  currency: z.string().optional(),
  issueDate: z.string().or(z.date()).optional(),
  validUntil: z.string().or(z.date()).optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  discountValue: z.coerce.number().min(0).optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  summary: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  clientNotes: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  items: z.array(proposalItemSchema).optional(),
})

export const updateProposalStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'EXPIRED']),
  rejectionReason: z.string().nullable().optional(),
})

export const proposalFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['ALL', 'DRAFT', 'SENT', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'EXPIRED']).default('ALL'),
  customerId: z.coerce.number().int().positive().optional(),
  dealId: z.coerce.number().int().positive().optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['issueDate', 'validUntil', 'grandTotal', 'createdAt', 'proposalNumber']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})
