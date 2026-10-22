
import { z } from 'zod'

const optionalText = (max: number) =>
  z.string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined)

const optionalPositiveInt = z.preprocess(
  (value) =>
    value === '' || value === undefined || value === null
      ? undefined
      : Number(value),
  z.number().int().positive().optional(),
)

const optionalDate = z.preprocess(
  (value) =>
    value === '' || value === undefined || value === null
      ? undefined
      : value,
  z.coerce.date().optional(),
)

export const importedLeadRowSchema = z.object({
  contactName: z.string().trim().min(2).max(150),

  companyName: optionalText(150),
  phone: optionalText(30),

  email: z.preprocess(
    (value) =>
      typeof value === 'string' && !value.trim()
        ? undefined
        : value,
    z.string().trim().email().max(254).optional(),
  ),

  sourceId: optionalPositiveInt,
  productServiceId: optionalPositiveInt,

  priority: z.preprocess(
    (value) =>
      value === '' || value === undefined || value === null
        ? 'MEDIUM'
        : String(value).trim().toUpperCase(),
    z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  ),

  notes: optionalText(5000),
  nextFollowUpAt: optionalDate,
  noFollowUpReasonId: optionalPositiveInt,
}).superRefine((row, ctx) => {
  if (!row.nextFollowUpAt && row.noFollowUpReasonId === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['nextFollowUpAt'],
      message:
        'Provide a follow-up date or a no-follow-up reason.',
    })
  }
})

export const confirmImportSchema = z.object({
  rows: z.array(
    z.object({
      rowNumber: z.number().int().positive(),
      values: z.record(z.string(), z.unknown()),
    }),
  ).min(1).max(1000),
})
