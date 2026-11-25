import crypto from 'node:crypto'
import { prisma } from '../../config/database.js'
import { AppError } from '../../common/errors/AppErrors.js'
import type { Prisma } from '../../generated/prisma/client.js'

export class FacebookServiceError extends AppError {
  constructor(message: string, statusCode = 400) {
    super(statusCode, message)
    this.name = 'FacebookServiceError'
  }
}

export type FacebookSettingsDto = {
  id: number
  appId: string
  hasAppSecret: boolean
  pageId: string
  hasPageAccessToken: boolean
  hasVerifyToken: boolean
  defaultOwnerId: number | null
  defaultOwnerName: string | null
  isEnabled: boolean
  notifyOwner: boolean
  updatedAt: Date
}

export type UpdateFacebookSettingsInput = {
  appId?: string
  appSecret?: string
  pageId?: string
  pageAccessToken?: string
  verifyToken?: string
  defaultOwnerId?: number | null
  isEnabled?: boolean
  notifyOwner?: boolean
}

export type FacebookSettingsRecord = {
  id: number
  appId: string
  appSecret: string
  pageId: string
  pageAccessToken: string
  verifyToken: string
  defaultOwnerId: number | null
  isEnabled: boolean
  notifyOwner: boolean
  updatedAt: Date
}

async function ensureSettings(): Promise<FacebookSettingsRecord> {
  let settings = await prisma.facebookSetting.findFirst({ orderBy: { id: 'asc' } })
  if (!settings) {
    settings = await prisma.facebookSetting.create({
      data: {
        appId: '',
        appSecret: '',
        pageId: '',
        pageAccessToken: '',
        verifyToken: '',
        isEnabled: false,
        notifyOwner: true,
      },
    })
  }
  return settings
}

function toDto(settings: FacebookSettingsRecord, defaultOwnerName: string | null): FacebookSettingsDto {
  return {
    id: settings.id,
    appId: settings.appId,
    hasAppSecret: Boolean(settings.appSecret.trim()),
    pageId: settings.pageId,
    hasPageAccessToken: Boolean(settings.pageAccessToken.trim()),
    hasVerifyToken: Boolean(settings.verifyToken.trim()),
    defaultOwnerId: settings.defaultOwnerId,
    defaultOwnerName,
    isEnabled: settings.isEnabled,
    notifyOwner: settings.notifyOwner,
    updatedAt: settings.updatedAt,
  }
}

export async function getFacebookSettings(): Promise<FacebookSettingsDto> {
  const settings = await ensureSettings()
  let defaultOwnerName: string | null = null
  if (settings.defaultOwnerId) {
    const owner = await prisma.user.findFirst({
      where: { id: settings.defaultOwnerId, isActive: true, deletedAt: null },
      select: { name: true },
    })
    defaultOwnerName = owner?.name ?? null
  }
  return toDto(settings, defaultOwnerName)
}

export async function getFacebookSettingsRecord(): Promise<FacebookSettingsRecord> {
  return ensureSettings()
}

export async function updateFacebookSettings(
  input: UpdateFacebookSettingsInput,
): Promise<FacebookSettingsDto> {
  const existing = await ensureSettings()
  const data: Prisma.FacebookSettingUpdateInput = {}

  if (input.appId !== undefined) data.appId = input.appId.trim()
  if (input.pageId !== undefined) data.pageId = input.pageId.trim()
  if (input.isEnabled !== undefined) data.isEnabled = Boolean(input.isEnabled)
  if (input.notifyOwner !== undefined) data.notifyOwner = Boolean(input.notifyOwner)

  if (input.appSecret !== undefined && input.appSecret.trim()) {
    data.appSecret = input.appSecret.trim()
  }
  if (input.pageAccessToken !== undefined && input.pageAccessToken.trim()) {
    data.pageAccessToken = input.pageAccessToken.trim()
  }
  if (input.verifyToken !== undefined && input.verifyToken.trim()) {
    data.verifyToken = input.verifyToken.trim()
  }

  if (input.defaultOwnerId !== undefined) {
    if (input.defaultOwnerId === null) {
      data.defaultOwner = { disconnect: true }
    } else {
      const owner = await prisma.user.findFirst({
        where: { id: input.defaultOwnerId, isActive: true, deletedAt: null },
        select: { id: true },
      })
      if (!owner) throw new FacebookServiceError('Default owner was not found or is inactive', 400)
      data.defaultOwner = { connect: { id: owner.id } }
    }
  }

  const updated = await prisma.facebookSetting.update({
    where: { id: existing.id },
    data,
  })

  return getFacebookSettings()
}

export function verifyFacebookSignature(
  rawBody: Buffer,
  signature: string | undefined,
  appSecret: string,
): boolean {
  if (!signature || !appSecret) return false
  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`
  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(signature)
  if (expectedBuffer.length !== providedBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
}

export async function verifyFacebookWebhookToken(
  token: string,
  challenge: string,
): Promise<{ ok: boolean; challenge: string }> {
  const settings = await ensureSettings()
  const configured = settings.verifyToken.trim()
  if (!configured || token !== configured) return { ok: false, challenge: '' }
  return { ok: true, challenge }
}

export async function testFacebookConnection() {
  const settings = await ensureSettings()
  const token = settings.pageAccessToken.trim()
  if (!token) throw new FacebookServiceError('Page access token is not configured', 400)

  const response = await fetch(
    `https://graph.facebook.com/v27.0/me?fields=id,name&access_token=${encodeURIComponent(token)}`,
    { method: 'GET' },
  )
  const result: any = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      result?.error?.message ||
      result?.error?.error_user_msg ||
      `Meta API responded with HTTP status ${response.status}`
    throw new FacebookServiceError(message, response.status >= 500 ? 502 : 400)
  }

  return {
    success: true,
    message: `Connected to Meta as ${result?.name || result?.id || 'unknown'}`,
    data: {
      id: result?.id ?? null,
      name: result?.name ?? null,
      pageConfigured: Boolean(settings.pageId.trim()),
      webhookConfigured: Boolean(settings.appSecret.trim() && settings.verifyToken.trim()),
    },
  }
}
