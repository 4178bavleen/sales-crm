
import { z } from 'zod'

const optionalText = (max: number) =>
  z.string().trim().max(max).optional()

export const createLeadSchema = z.object({
  contactName: z.string().trim().min(2).max(150),
  companyName: optionalText(150),
  phone: optionalText(30),
  email: z.string().trim().email().max(254).optional(),
  sourceId: z.number().int().positive().nullable().optional(),
  productServiceId: z.number().int().positive().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  notes: optionalText(5000),
  ownerId: z.number().int().positive().nullable().optional(),
  nextFollowUpAt: z.coerce.date().nullable().optional(),
  noFollowUpReasonId: z.number().int().positive().nullable().optional(),
})

export const updateLeadSchema = z.object({
  contactName: z.string().trim().min(2).max(150).optional(),
  companyName: z.string().trim().max(150).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  sourceId: z.number().int().positive().nullable().optional(),
  productServiceId: z.number().int().positive().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  nextFollowUpAt: z.coerce.date().nullable().optional(),
  noFollowUpReasonId: z.number().int().positive().nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Provide at least one field to update' },
)

export const listLeadsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  status: z.enum([
    'NEW',
    'CONTACTED',
    'QUALIFIED',
    'DISQUALIFIED',
    'CONVERTED',
  ]).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  sourceId: z.coerce.number().int().positive().optional(),
})

export const leadIdSchema = z.coerce.number().int().positive()

export const assignLeadSchema = z.object({
  ownerId: z.number().int().positive().nullable(),
})

export const updateLeadStatusSchema = z.object({
  status: z.enum([
    'NEW',
    'CONTACTED',
    'QUALIFIED',
    'DISQUALIFIED',
    'CONVERTED',
  ]),
  disqualifyReasonId: z.number().int().positive().nullable().optional(),
  disqualifyNote: z.string().trim().max(2000).nullable().optional(),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
export type ListLeadsInput = z.infer<typeof listLeadsSchema>
export type AssignLeadInput = z.infer<typeof assignLeadSchema>
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>
