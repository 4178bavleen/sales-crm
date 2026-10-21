import { z } from 'zod'

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

  roleName: z
    .enum(['ADMIN', 'SALES_MANAGER', 'SALES_EMPLOYEE', 'REPORT_VIEWER'])
    .default('SALES_EMPLOYEE'),
    

})
export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  roleName: z
    .enum(['ADMIN', 'SALES_MANAGER', 'SALES_EMPLOYEE', 'REPORT_VIEWER'])
    .optional(),
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
    roleName: z
      .enum(['ADMIN', 'SALES_MANAGER', 'SALES_EMPLOYEE', 'REPORT_VIEWER'])
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  })

export type ListUsersInput = z.infer<typeof listUsersSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>

export type CreateUserInput = z.infer<typeof createUserSchema>