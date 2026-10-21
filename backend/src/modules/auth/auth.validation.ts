
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) =>
    value.toLowerCase()
  ),
  password: z.string().min(1).max(72),
})


export type LoginInput = z.infer<typeof loginSchema>
