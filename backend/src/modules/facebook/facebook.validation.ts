import { z } from 'zod'

export const updateFacebookSettingsSchema = z.object({
  appId: z.string().max(200).optional(),
  appSecret: z.string().max(500).optional(),
  pageId: z.string().max(100).optional(),
  pageAccessToken: z.string().max(2000).optional(),
  verifyToken: z.string().max(200).optional(),
  defaultOwnerId: z.coerce.number().int().positive().nullable().optional(),
  isEnabled: z.boolean().optional(),
  notifyOwner: z.boolean().optional(),
})

const leadgenValueSchema = z
  .object({
    leadgen_id: z.union([z.string(), z.number()]).optional(),
    form_id: z.union([z.string(), z.number()]).optional(),
    page_id: z.union([z.string(), z.number()]).optional(),
    created_time: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough()

export const facebookOAuthExchangeSchema = z.object({
  code: z.string().min(1).max(2000),
  state: z.string().min(1).max(200),
})

export const facebookOAuthSelectPageSchema = z.object({
  sessionId: z.string().min(1).max(200),
  pageId: z.string().min(1).max(100),
})

export const facebookWebhookSchema = z.object({
  object: z.string(),
  entry: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]).optional(),
        time: z.number().optional(),
        changes: z
          .array(
            z.object({
              field: z.string(),
              value: leadgenValueSchema.optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
})
