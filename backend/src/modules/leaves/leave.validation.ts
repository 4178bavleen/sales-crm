import { z } from 'zod'

export const LEAVE_TYPES = [
  'CASUAL',
  'SICK',
  'EARNED',
  'UNPAID',
  'MATERNITY',
  'PATERNITY',
  'COMP_OFF',
  'OTHER',
] as const

export const LEAVE_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const

export type LeaveType = (typeof LEAVE_TYPES)[number]
export type LeaveStatus = (typeof LEAVE_STATUSES)[number]

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

export const LEAVE_ACCRUAL_PERIODS = [
  'YEARLY',
  'HALF_YEARLY',
  'QUARTERLY',
  'MONTHLY',
] as const
export type LeaveAccrualPeriod = (typeof LEAVE_ACCRUAL_PERIODS)[number]

export const applyLeaveSchema = z
  .object({
    leaveType: z.string().trim().min(1, 'Leave category is required'),
    startDate: z
      .string()
      .regex(dateRegex, 'Start date must be in YYYY-MM-DD format'),
    endDate: z
      .string()
      .regex(dateRegex, 'End date must be in YYYY-MM-DD format'),
    reason: z
      .string()
      .trim()
      .min(3, 'Please provide a reason of at least 3 characters')
      .max(1000, 'Reason cannot exceed 1000 characters'),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: 'Start date cannot be after end date',
    path: ['endDate'],
  })

export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>

export const createLeavePolicySchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters').max(60),
  code: z.string().trim().min(2).max(40).optional(),
  quota: z.coerce.number().min(0).max(365).default(12),
  period: z.enum(LEAVE_ACCRUAL_PERIODS).default('YEARLY'),
  isPaid: z.boolean().default(true),
  requiresDocument: z.boolean().default(false),
  documentDescription: z.string().trim().max(255).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
})

export const updateLeavePolicySchema = createLeavePolicySchema.partial()

export type CreateLeavePolicyInput = z.infer<typeof createLeavePolicySchema>
export type UpdateLeavePolicyInput = z.infer<typeof updateLeavePolicySchema>

export const listLeavesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(LEAVE_STATUSES).optional(),
  leaveType: z.enum(LEAVE_TYPES).optional(),
  userId: z.coerce.number().int().positive().optional(),
  startDate: z.string().regex(dateRegex).optional(),
  endDate: z.string().regex(dateRegex).optional(),
  search: z.string().trim().optional(),
})

export type ListLeavesQueryInput = z.infer<typeof listLeavesQuerySchema>

export const reviewLeaveSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT'] as const),
  remarks: z.string().trim().max(500, 'Remarks cannot exceed 500 characters').optional(),
})

export type ReviewLeaveInput = z.infer<typeof reviewLeaveSchema>

export const leaveIdSchema = z.coerce
  .number()
  .int()
  .positive('Invalid leave ID')
