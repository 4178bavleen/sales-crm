import { prisma } from '../../config/database.js'
import { AppError } from '../../common/errors/AppErrors.js'

export class WhatsAppServiceError extends AppError {
  constructor(message: string, statusCode = 400) {
    super(statusCode, message)
    this.name = 'WhatsAppServiceError'
  }
}

export type WhatsAppSettingsDto = {
  id: number
  phoneNumberId: string
  wabaId: string
  hasAccessToken: boolean
  templateName: string
  templateLanguage: string
  isEnabled: boolean
  notifyDeals: boolean
  notifyDocuments: boolean
  notifyTargets: boolean
  notifyFollowUps: boolean
  updatedAt: Date
}

export type UpdateWhatsAppSettingsInput = {
  phoneNumberId?: string
  wabaId?: string
  accessToken?: string
  templateName?: string
  templateLanguage?: string
  isEnabled?: boolean
  notifyDeals?: boolean
  notifyDocuments?: boolean
  notifyTargets?: boolean
  notifyFollowUps?: boolean
}

/**
 * Sanitizes phone number to international numeric string format required by Meta (no '+', spaces, or dashes).
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return ''
  return phone.replace(/[^0-9]/g, '')
}

/**
 * Retrieves the global WhatsApp settings or initializes default row if none exists.
 */
export async function getWhatsAppSettings(): Promise<WhatsAppSettingsDto> {
  let settings = await prisma.whatsAppSetting.findFirst({
    orderBy: { id: 'asc' },
  })

  if (!settings) {
    settings = await prisma.whatsAppSetting.create({
      data: {
        phoneNumberId: '',
        wabaId: '',
        accessToken: '',
        templateName: 'crm_alert_notification',
        templateLanguage: 'en_US',
        isEnabled: false,
        notifyDeals: true,
        notifyDocuments: true,
        notifyTargets: true,
        notifyFollowUps: true,
      },
    })
  }

  return {
    id: settings.id,
    phoneNumberId: settings.phoneNumberId,
    wabaId: settings.wabaId,
    hasAccessToken: Boolean(settings.accessToken && settings.accessToken.trim().length > 0),
    templateName: settings.templateName,
    templateLanguage: settings.templateLanguage,
    isEnabled: settings.isEnabled,
    notifyDeals: settings.notifyDeals,
    notifyDocuments: settings.notifyDocuments,
    notifyTargets: settings.notifyTargets,
    notifyFollowUps: settings.notifyFollowUps,
    updatedAt: settings.updatedAt,
  }
}

/**
 * Updates the global WhatsApp configuration.
 */
export async function updateWhatsAppSettings(input: UpdateWhatsAppSettingsInput): Promise<WhatsAppSettingsDto> {
  let existing = await prisma.whatsAppSetting.findFirst({
    orderBy: { id: 'asc' },
  })

  if (!existing) {
    existing = await prisma.whatsAppSetting.create({
      data: {
        phoneNumberId: '',
        wabaId: '',
        accessToken: '',
        templateName: 'crm_alert_notification',
        templateLanguage: 'en_US',
        isEnabled: false,
      },
    })
  }

  const dataToUpdate: any = {}

  if (input.phoneNumberId !== undefined) dataToUpdate.phoneNumberId = input.phoneNumberId.trim()
  if (input.wabaId !== undefined) dataToUpdate.wabaId = input.wabaId.trim()
  if (input.templateName !== undefined) dataToUpdate.templateName = input.templateName.trim()
  if (input.templateLanguage !== undefined) dataToUpdate.templateLanguage = input.templateLanguage.trim()

  // Only overwrite access token if a non-empty string is provided
  if (input.accessToken !== undefined && input.accessToken.trim().length > 0) {
    dataToUpdate.accessToken = input.accessToken.trim()
  }

  if (input.isEnabled !== undefined) dataToUpdate.isEnabled = Boolean(input.isEnabled)
  if (input.notifyDeals !== undefined) dataToUpdate.notifyDeals = Boolean(input.notifyDeals)
  if (input.notifyDocuments !== undefined) dataToUpdate.notifyDocuments = Boolean(input.notifyDocuments)
  if (input.notifyTargets !== undefined) dataToUpdate.notifyTargets = Boolean(input.notifyTargets)
  if (input.notifyFollowUps !== undefined) dataToUpdate.notifyFollowUps = Boolean(input.notifyFollowUps)

  const updated = await prisma.whatsAppSetting.update({
    where: { id: existing.id },
    data: dataToUpdate,
  })

  return {
    id: updated.id,
    phoneNumberId: updated.phoneNumberId,
    wabaId: updated.wabaId,
    hasAccessToken: Boolean(updated.accessToken && updated.accessToken.trim().length > 0),
    templateName: updated.templateName,
    templateLanguage: updated.templateLanguage,
    isEnabled: updated.isEnabled,
    notifyDeals: updated.notifyDeals,
    notifyDocuments: updated.notifyDocuments,
    notifyTargets: updated.notifyTargets,
    notifyFollowUps: updated.notifyFollowUps,
    updatedAt: updated.updatedAt,
  }
}

/**
 * Internal helper to send message via Meta Cloud Graph API.
 */
async function callMetaCloudApi(params: {
  phoneNumberId: string
  accessToken: string
  payload: Record<string, any>
}) {
  const url = `https://graph.facebook.com/v21.0/${params.phoneNumberId}/messages`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params.payload),
  })

  const resJson: any = await response.json().catch(() => null)

  if (!response.ok) {
    const errorMsg =
      resJson?.error?.message ||
      resJson?.error?.error_user_msg ||
      `Meta WhatsApp API responded with HTTP status ${response.status}`
    const errorCode = resJson?.error?.code ? ` (Code: ${resJson.error.code})` : ''
    throw new WhatsAppServiceError(`${errorMsg}${errorCode}`, response.status >= 500 ? 502 : 400)
  }

  return resJson
}

/**
 * Sends a test WhatsApp message to verify Phone Number ID and Access Token.
 */
export async function sendTestWhatsApp(targetPhone: string) {
  const cleanPhone = sanitizePhoneNumber(targetPhone)
  if (!cleanPhone || cleanPhone.length < 8) {
    throw new WhatsAppServiceError(
      'A valid recipient phone number with country code is required (e.g., 919876543210 or 15551234567).',
      400
    )
  }

  const settings = await prisma.whatsAppSetting.findFirst({
    orderBy: { id: 'asc' },
  })

  if (!settings || !settings.phoneNumberId || !settings.accessToken) {
    throw new WhatsAppServiceError('WhatsApp Phone Number ID and Access Token must be configured in settings.', 400)
  }

  const templateName = settings.templateName || 'crm_alert_notification'
  const templateLanguage = settings.templateLanguage || 'en_US'

  // Attempt using registered template
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: templateLanguage,
      },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Admin' },
            { type: 'text', text: 'Connection Test' },
            { type: 'text', text: 'Your Sales CRM WhatsApp Cloud API connection has been verified successfully!' },
            { type: 'text', text: new Date().toLocaleTimeString() },
          ],
        },
      ],
    },
  }

  const result = await callMetaCloudApi({
    phoneNumberId: settings.phoneNumberId,
    accessToken: settings.accessToken,
    payload,
  })

  return {
    success: true,
    message: `Test WhatsApp message successfully dispatched to +${cleanPhone}`,
    data: result,
  }
}

/**
 * Dispatches an automated WhatsApp alert for a system notification.
 * Safe to fire-and-forget: logs errors but never throws unhandled rejections to callers.
 */
export async function sendNotificationWhatsApp(params: {
  recipientUserId: number
  type: string
  title: string
  body?: string | null
  entityType?: string | null
  entityId?: number | null
}) {
  try {
    const settings = await prisma.whatsAppSetting.findFirst({
      orderBy: { id: 'asc' },
    })

    if (!settings || !settings.isEnabled || !settings.phoneNumberId || !settings.accessToken) {
      return // WhatsApp alerts globally disabled or credentials not configured
    }

    const typeUpper = params.type.toUpperCase()
    const entityType = (params.entityType || '').toLowerCase()

    // Check category preferences
    if ((typeUpper.includes('DEAL') || entityType === 'deal') && !settings.notifyDeals) {
      return
    }
    if ((typeUpper.includes('DOCUMENT') || entityType === 'document') && !settings.notifyDocuments) {
      return
    }
    if ((typeUpper.includes('TARGET') || entityType === 'target') && !settings.notifyTargets) {
      return
    }
    if ((typeUpper.includes('FOLLOW_UP') || typeUpper.includes('FOLLOWUP')) && !settings.notifyFollowUps) {
      return
    }

    // Find recipient user and mobile number
    const user = await prisma.user.findFirst({
      where: { id: params.recipientUserId, isActive: true, deletedAt: null },
      select: { phone: true, name: true },
    })

    if (!user || !user.phone) {
      return // User has no phone number configured
    }

    const cleanPhone = sanitizePhoneNumber(user.phone)
    if (!cleanPhone || cleanPhone.length < 8) {
      console.warn(`[WhatsAppService] Skipping alert: Invalid phone number format for user "${user.name}" (${user.phone})`)
      return
    }

    const templateName = settings.templateName || 'crm_alert_notification'
    const templateLanguage = settings.templateLanguage || 'en_US'

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: templateLanguage,
        },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: user.name || 'Team Member' },
              { type: 'text', text: params.title },
              { type: 'text', text: params.body || params.title },
              { type: 'text', text: new Date().toLocaleTimeString() },
            ],
          },
        ],
      },
    }

    await callMetaCloudApi({
      phoneNumberId: settings.phoneNumberId,
      accessToken: settings.accessToken,
      payload,
    })

    console.log(`[WhatsAppService] Successfully sent WhatsApp alert "${params.title}" to +${cleanPhone}`)
  } catch (err: any) {
    console.error('[WhatsAppService] Failed to send WhatsApp alert:', err.message || err)
  }
}
