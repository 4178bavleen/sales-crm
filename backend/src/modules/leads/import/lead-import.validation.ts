
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
  (value) => {
    if (value === '' || value === undefined || value === null) return undefined;
    const d = new Date(value as string | number | Date);
    return isNaN(d.getTime()) ? undefined : d;
  },
  z.date().optional(),
)

export const importedLeadRowSchema = z.object({
  contactName: z.string().trim().min(1).max(150),

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

  status: z.preprocess(
    (value) =>
      value === '' || value === undefined || value === null
        ? 'NEW'
        : String(value).trim().toUpperCase(),
    z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED']).default('NEW'),
  ),

  notes: optionalText(5000),
  nextFollowUpAt: optionalDate,
  noFollowUpReasonId: optionalPositiveInt,
}).transform((row) => {
  if (!row.nextFollowUpAt && row.noFollowUpReasonId === undefined) {
    row.noFollowUpReasonId = 1
  }
  return row
})

export const confirmImportSchema = z.object({
  rows: z.array(
    z.object({
      rowNumber: z.number().int().positive(),
      values: z.record(z.string(), z.unknown()),
    }),
  ).min(1).max(1000),
})
