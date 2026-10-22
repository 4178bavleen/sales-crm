import { z } from 'zod'

export const targetPeriodEnum = z.enum(['MONTHLY', 'QUARTERLY'])

export const listTargetsQuerySchema = z.object({
  periodType: targetPeriodEnum.optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  quarter: z.coerce.number().int().min(1).max(4).optional(),
  userId: z.coerce.number().int().positive().optional(),
  teamId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
})

export type ListTargetsQuery = z.infer<typeof listTargetsQuerySchema>

export const createTargetSchema = z
  .object({
    userId: z.number().int().positive().nullable().optional(),
    teamId: z.number().int().positive().nullable().optional(),
    periodType: targetPeriodEnum,
    periodStart: z.string().min(1, 'Period start date is required'),
    periodEnd: z.string().min(1, 'Period end date is required'),
    amount: z.number().positive('Target amount must be greater than 0'),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((data) => data.userId || data.teamId, {
    message: 'Either userId or teamId must be provided',
    path: ['userId'],
  })
  .refine((data) => !(data.userId && data.teamId), {
    message: 'Target cannot be assigned to both an employee and a team simultaneously',
    path: ['teamId'],
  })

export type CreateTargetInput = z.infer<typeof createTargetSchema>

export const updateTargetSchema = z
  .object({
    userId: z.number().int().positive().nullable().optional(),
    teamId: z.number().int().positive().nullable().optional(),
    periodType: targetPeriodEnum.optional(),
    periodStart: z.string().optional(),
    periodEnd: z.string().optional(),
    amount: z.number().positive('Target amount must be greater than 0').optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((data) => !(data.userId && data.teamId), {
    message: 'Target cannot be assigned to both an employee and a team simultaneously',
    path: ['teamId'],
  })

export type UpdateTargetInput = z.infer<typeof updateTargetSchema>

export const targetIdSchema = z.object({
  id: z.coerce.number().int().positive('Valid target ID is required'),
})
