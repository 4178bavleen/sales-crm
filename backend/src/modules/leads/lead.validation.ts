
import { z } from 'zod'

const optionalText = (max: number) =>
  z.string().trim().max(max).optional()

/**
 * Split a comma-separated query value into its parts.
 *
 * `?status=NEW,CONTACTED` and `?status=NEW&status=CONTACTED` both become
 * `['NEW', 'CONTACTED']`, so one filter can select several values at once.
 */
function splitCsv(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : undefined
}

/** Comma-separated status filter, e.g. `status=NEW,CONTACTED`. */
const csvStatus = z.preprocess(
  splitCsv,
  z
    .array(
      z.enum([
        'NEW',
        'CONTACTED',
        'QUALIFIED',
        'DISQUALIFIED',
        'CONVERTED',
      ]),
    )
    .min(1)
    .optional(),
)

/** Comma-separated priority filter, e.g. `priority=HIGH,URGENT`. */
const csvPriority = z.preprocess(
  splitCsv,
  z.array(z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])).min(1).optional(),
)

/** Comma-separated lead source filter, e.g. `sourceId=1,3`. */
const csvSourceIds = z.preprocess(
  (value) => {
    const parts = splitCsv(value)
    return Array.isArray(parts) ? parts.map((part) => Number(part)) : parts
  },
  z.array(z.number().int().positive()).min(1).optional(),
)

/**
 * Comma-separated owner filter, e.g. `ownerId=2,3`.
 *
 * The literal `none` selects leads that have no owner yet, so the value can
 * be `null` as well as a user id.
 */
const csvOwnerIds = z.preprocess(
  (value) => {
    const parts = splitCsv(value)
    if (!Array.isArray(parts)) return parts
    return parts.map((part) =>
      String(part).toLowerCase() === 'none' ? null : Number(part),
    )
  },
  z
    .array(z.union([z.number().int().positive(), z.null()]))
    .min(1)
    .optional(),
)

export const createLeadSchema = z.object({
  contactName: z.string().trim().min(2).max(150),
  companyName: optionalText(150),
  phone: optionalText(30),
  email: z.string().trim().email().max(254).optional(),
  sourceId: z.number().int().positive().nullable().optional(),
  productServiceId: z.number().int().positive().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  // A lead can be created in any status except DISQUALIFIED, which needs a
  // reason and is therefore only reachable through the status endpoint.
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED']).default('NEW'),
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
  status: csvStatus,
  priority: csvPriority,
  ownerId: csvOwnerIds,
  sourceId: csvSourceIds,
  /** Only leads created at or after this instant. */
  createdFrom: z.coerce.date().optional(),
  /** Only leads created at or before this instant. */
  createdTo: z.coerce.date().optional(),
})

export const leadIdSchema = z.coerce.number().int().positive()

export const assignLeadSchema = z.object({
  ownerId: z.number().int().positive().nullable(),
  note: z.string().trim().max(1000).optional(),
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
}).superRefine((data, ctx) => {
  if (
    data.status === 'DISQUALIFIED' &&
    data.disqualifyReasonId == null &&
    !data.disqualifyNote?.trim()
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['disqualifyReasonId'],
      message: 'Provide a disqualification reason or note',
    })
  }
})


export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
export type ListLeadsInput = z.infer<typeof listLeadsSchema>
export type AssignLeadInput = z.infer<typeof assignLeadSchema>
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>
