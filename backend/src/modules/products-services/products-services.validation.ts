import { z } from 'zod'

export const createProductServiceSchema = z.object({
  name: z.string().trim().min(2).max(200),
  isActive: z.boolean().optional().default(true),
})

export const updateProductServiceSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Provide at least one field to update' },
)

export const listProductServicesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  isActive: z.enum(['true', 'false']).optional(),
})

export const productServiceIdSchema = z.coerce.number().int().positive()

export type CreateProductServiceInput =
  z.infer<typeof createProductServiceSchema>

export type UpdateProductServiceInput =
  z.infer<typeof updateProductServiceSchema>

export type ListProductServicesInput =
  z.infer<typeof listProductServicesSchema>