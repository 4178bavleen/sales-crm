import { z } from 'zod'

export const reportPeriodEnum = z.enum([
  'all',
  'today',
  'last_7_days',
  'last_30_days',
  'this_month',
  'last_month',
  'this_quarter',
  'this_year',
  'custom',
])

export const reportQuerySchema = z.object({
  period: reportPeriodEnum.optional().default('this_month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.coerce.number().int().positive().optional(),
  teamId: z.coerce.number().int().positive().optional(),
})

export type ReportQuery = z.infer<typeof reportQuerySchema>
