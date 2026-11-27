import { z } from 'zod'

const optionalText = (max: number) =>
  z.string().trim().max(max).optional()

export const createCustomerSchema = z.object({
  companyId: z.number().int().positive().nullable().optional(),
  companyName: z.string().trim().max(200).nullable().optional(),
  primaryContactId: z.number().int().positive().nullable().optional(),
  primaryContactName: z.string().trim().max(200).nullable().optional(),
  ownerId: z.number().int().positive().nullable().optional(),
  convertedAt: z.coerce.date().optional(),
  notes: optionalText(5000),
  address: optionalText(500),
  city: optionalText(100),
  state: optionalText(100),
  country: optionalText(100),
})

export const updateCustomerSchema = z.object({
  companyId: z.number().int().positive().nullable().optional(),
  companyName: z.string().trim().max(200).nullable().optional(),
  primaryContactId: z.number().int().positive().nullable().optional(),
  primaryContactName: z.string().trim().max(200).nullable().optional(),
  ownerId: z.number().int().positive().nullable().optional(),
  convertedAt: z.coerce.date().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  address: optionalText(500),
  city: optionalText(100),
  state: optionalText(100),
  country: optionalText(100),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Provide at least one field to update' },
)

export const listCustomersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(10),
  search: z.string().trim().max(100).optional(),
  industry: z.string().trim().max(100).optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
})

export const customerIdSchema = z.coerce.number().int().positive()

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
export type ListCustomersInput = z.infer<typeof listCustomersSchema>
