
import { z } from 'zod'

const optionalText = (max: number) =>
  z.string().trim().max(max).optional()

export const createContactSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  companyId: z.number().int().positive().nullable().optional(),
  jobTitle: optionalText(150),
  email: z.string().trim().email().max(254).optional(),
  phone: optionalText(30),
  notes: optionalText(5000),
})

export const updateContactSchema = z.object({
  fullName: z.string().trim().min(2).max(200).optional(),
  companyId: z.number().int().positive().nullable().optional(),
  jobTitle: z.string().trim().max(150).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Provide at least one field to update' },
)

export const listContactsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  companyId: z.coerce.number().int().positive().optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
})

export const contactIdSchema = z.coerce.number().int().positive()

export type CreateContactInput = z.infer<typeof createContactSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>
export type ListContactsInput = z.infer<typeof listContactsSchema>
