import { z } from 'zod'

const roleNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(50)
  .regex(/^[A-Za-z0-9_ ]+$/, 'Use letters, numbers, spaces and underscores only')
  .transform((value) => value.toUpperCase().replace(/\s+/g, '_'))

const employeePhoneSchema = z.object({
  countryCode: z
    .string()
    .trim()
    .length(2, 'Use a 2-letter country code')
    .transform((value) => value.toUpperCase()),
  dialCode: z
    .string()
    .trim()
    .regex(/^\+\d{1,5}$/, 'Use a country dial code like +91'),
  number: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[\d\s()-]+$/, 'Use digits, spaces, dashes or brackets only'),
  label: z.string().trim().max(50).optional().nullable(),
  isPrimary: z.boolean().optional(),
})

const employeePhonesSchema = z
  .array(employeePhoneSchema)
  .max(10, 'Maximum 10 phone numbers per employee')
  .refine(
    (phones) => phones.filter((phone) => phone.isPrimary).length <= 1,
    'Only one phone number can be primary',
  )

const joiningDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    )
  }, 'Enter a valid calendar date')

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),

  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(8)
    .refine(
      (value) => Buffer.byteLength(value, 'utf8') <= 72,
      'Password must not exceed 72 bytes',
    ),

  phone: z.string().trim().max(20).optional(),
  phones: employeePhonesSchema.optional(),
  joiningDate: joiningDateSchema.nullable().optional(),

  roleName: roleNameSchema.default('SALES_EMPLOYEE'),
})
export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  roleName: roleNameSchema.optional(),
})

export const userIdSchema = z.coerce.number().int().positive()

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase())
      .optional(),
    password: z
      .string()
      .min(8)
      .refine(
        (value) => Buffer.byteLength(value, 'utf8') <= 72,
        'Password must not exceed 72 bytes',
      )
      .optional(),
    phone: z.string().trim().max(20).nullable().optional(),
    phones: employeePhonesSchema.optional(),
    joiningDate: joiningDateSchema.nullable().optional(),
    roleName: roleNameSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  })

export type ListUsersInput = z.infer<typeof listUsersSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>

export type CreateUserInput = z.infer<typeof createUserSchema>