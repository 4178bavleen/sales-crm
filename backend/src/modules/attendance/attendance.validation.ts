import { z } from 'zod'

export const ATTENDANCE_STATUSES = [
  'PRESENT',
  'ABSENT',
  'LATE',
  'HALF_DAY',
  'LEAVE',
  'WEEKEND',
  'HOLIDAY',
] as const

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    )
  }, 'Enter a valid calendar date')

const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM format')

export const attendanceIdSchema = z.coerce.number().int().positive()

export const listAttendanceSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    date: dateSchema.optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    userId: z.coerce.number().int().positive().optional(),
    status: z.enum(ATTENDANCE_STATUSES).optional(),
    search: z.string().trim().max(100).optional(),
  })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: 'From date must be before to date',
    path: ['to'],
  })

export const createAttendanceSchema = z
  .object({
    userId: z.coerce.number().int().positive(),
    date: dateSchema,
    checkIn: timeSchema.nullable().optional(),
    checkOut: timeSchema.nullable().optional(),
    status: z.enum(ATTENDANCE_STATUSES).default('PRESENT'),
    workingMinutes: z.coerce.number().int().min(0).max(1440).optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .refine(
    (data) => !data.checkIn || !data.checkOut || data.checkIn <= data.checkOut,
    { message: 'Check-out time must be after check-in', path: ['checkOut'] },
  )

export const updateAttendanceSchema = z
  .object({
    userId: z.coerce.number().int().positive().optional(),
    date: dateSchema.optional(),
    checkIn: timeSchema.nullable().optional(),
    checkOut: timeSchema.nullable().optional(),
    status: z.enum(ATTENDANCE_STATUSES).optional(),
    workingMinutes: z.coerce.number().int().min(0).max(1440).optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  })

export const bulkAttendanceSchema = z
  .object({
    date: dateSchema,
    clearUserIds: z.array(z.coerce.number().int().positive()).max(200).optional(),
    records: z
      .array(
        z
          .object({
            userId: z.coerce.number().int().positive(),
            status: z.enum(ATTENDANCE_STATUSES),
            checkIn: timeSchema.nullable().optional(),
            checkOut: timeSchema.nullable().optional(),
            notes: z.string().trim().max(500).nullable().optional(),
          })
          .refine(
            (data) => !data.checkIn || !data.checkOut || data.checkIn <= data.checkOut,
            { message: 'Check-out time must be after check-in', path: ['checkOut'] },
          ),
      )
      .max(200),
  })
  .refine(
    (data) => data.records.length > 0 || (data.clearUserIds?.length ?? 0) > 0,
    { message: 'Provide at least one mark or employee to clear', path: ['records'] },
  )
  .refine(
    (data) => new Set(data.records.map((record) => record.userId)).size === data.records.length,
    { message: 'Each employee can appear only once', path: ['records'] },
  )

export type ListAttendanceInput = z.infer<typeof listAttendanceSchema>
export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>
export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>
