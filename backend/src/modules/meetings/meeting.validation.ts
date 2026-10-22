import { z } from 'zod'

export const meetingStatusEnum = z.enum([
  'PLANNED',
  'COMPLETED',
  'CANCELLED',
  'RESCHEDULED',
])

export const meetingIdSchema = z.coerce.number().int().positive()

export const createMeetingSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(150),
  startsAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().min(5).max(480).default(30),
  location: z.string().trim().max(255).optional().nullable(),
  meetingLink: z.string().trim().url().optional().nullable().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().nullable(),
  outcome: z.string().trim().max(1000).optional().nullable(),
  nextSteps: z.string().trim().max(1000).optional().nullable(),
  status: meetingStatusEnum.default('PLANNED'),
  leadId: z.coerce.number().int().positive().optional().nullable(),
  dealId: z.coerce.number().int().positive().optional().nullable(),
  companyId: z.coerce.number().int().positive().optional().nullable(),
  customerId: z.coerce.number().int().positive().optional().nullable(),
  participantUserIds: z.array(z.number().int().positive()).optional(),
  participantContactIds: z.array(z.number().int().positive()).optional(),
})

export const updateMeetingSchema = createMeetingSchema.partial()

export const listMeetingsQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: meetingStatusEnum.optional(),
  organizerId: z.coerce.number().int().positive().optional(),
  leadId: z.coerce.number().int().positive().optional(),
  dealId: z.coerce.number().int().positive().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>
export type ListMeetingsQuery = z.infer<typeof listMeetingsQuerySchema>
