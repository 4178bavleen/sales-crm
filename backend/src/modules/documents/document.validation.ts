import { z } from 'zod'

export const documentCategoryEnum = z.enum([
  'PROPOSAL',
  'CONTRACT',
  'MEETING_NOTES',
  'CUSTOMER_FILE',
  'OTHER',
])

export const createDocumentSchema = z.object({
  name: z.string().trim().min(1, 'Document name is required').max(255),
  category: documentCategoryEnum.default('OTHER'),
  leadId: z.coerce.number().int().positive().nullable().optional(),
  dealId: z.coerce.number().int().positive().nullable().optional(),
  customerId: z.coerce.number().int().positive().nullable().optional(),
})

export const updateDocumentSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  category: documentCategoryEnum.optional(),
  leadId: z.coerce.number().int().positive().nullable().optional(),
  dealId: z.coerce.number().int().positive().nullable().optional(),
  customerId: z.coerce.number().int().positive().nullable().optional(),
})

export const addVersionSchema = z.object({
  replaceNote: z.string().trim().max(1000).nullable().optional(),
})

export const listDocumentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  category: z.union([documentCategoryEnum, z.literal('ALL')]).optional(),
  leadId: z.coerce.number().int().positive().optional(),
  dealId: z.coerce.number().int().positive().optional(),
  customerId: z.coerce.number().int().positive().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'category']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const documentIdSchema = z.coerce.number().int().positive()
export const versionNoSchema = z.coerce.number().int().positive()
