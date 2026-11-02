import nodemailer from 'nodemailer'
import { prisma } from '../../config/database.js'
import { AppError } from '../../common/errors/AppErrors.js'

export class EmailServiceError extends AppError {
  constructor(message: string, statusCode = 400) {
    super(statusCode, message)
    this.name = 'EmailServiceError'
  }
}

export type EmailSettingsDto = {
  id: number
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  hasPassword: boolean
  fromEmail: string
  fromName: string
  isEnabled: boolean
  notifyDeals: boolean
  notifyDocuments: boolean
  notifyTargets: boolean
  notifyFollowUps: boolean
  updatedAt: Date
}

export type UpdateEmailSettingsInput = {
  smtpHost?: string
  smtpPort?: number
  smtpSecure?: boolean
  smtpUser?: string
  smtpPass?: string
  fromEmail?: string
  fromName?: string
  isEnabled?: boolean
  notifyDeals?: boolean
  notifyDocuments?: boolean
  notifyTargets?: boolean
  notifyFollowUps?: boolean
}

/**
 * Retrieves the global email/SMTP settings or initializes default row if none exists.
 */
export async function getEmailSettings(): Promise<EmailSettingsDto> {
  let settings = await prisma.emailSetting.findFirst({
    orderBy: { id: 'asc' },
  })

  if (!settings) {
    settings = await prisma.emailSetting.create({
      data: {
        smtpHost: '',
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: '',
        smtpPass: '',
        fromEmail: '',
        fromName: 'Sales CRM',
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
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpSecure: settings.smtpSecure,
    smtpUser: settings.smtpUser,
    hasPassword: Boolean(settings.smtpPass && settings.smtpPass.trim().length > 0),
    fromEmail: settings.fromEmail,
    fromName: settings.fromName,
    isEnabled: settings.isEnabled,
    notifyDeals: settings.notifyDeals,
    notifyDocuments: settings.notifyDocuments,
    notifyTargets: settings.notifyTargets,
    notifyFollowUps: settings.notifyFollowUps,
    updatedAt: settings.updatedAt,
  }
}

/**
 * Updates the global email/SMTP configuration.
 */
export async function updateEmailSettings(input: UpdateEmailSettingsInput): Promise<EmailSettingsDto> {
  let existing = await prisma.emailSetting.findFirst({
    orderBy: { id: 'asc' },
  })

  if (!existing) {
    existing = await prisma.emailSetting.create({
      data: {
        smtpHost: '',
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: '',
        smtpPass: '',
        fromEmail: '',
        fromName: 'Sales CRM',
        isEnabled: false,
      },
    })
  }

  const dataToUpdate: any = {}

  if (input.smtpHost !== undefined) dataToUpdate.smtpHost = input.smtpHost.trim()
  if (input.smtpPort !== undefined) {
    const port = Number(input.smtpPort)
    if (isNaN(port) || port <= 0 || port > 65535) {
      throw new EmailServiceError('Invalid SMTP port. Must be between 1 and 65535.')
    }
    dataToUpdate.smtpPort = port
  }
  if (input.smtpSecure !== undefined) dataToUpdate.smtpSecure = Boolean(input.smtpSecure)
  if (input.smtpUser !== undefined) dataToUpdate.smtpUser = input.smtpUser.trim()
  
  // Only overwrite password if a non-empty string is provided
  if (input.smtpPass !== undefined && input.smtpPass.trim().length > 0) {
    dataToUpdate.smtpPass = input.smtpPass.trim()
  }

  if (input.fromEmail !== undefined) dataToUpdate.fromEmail = input.fromEmail.trim()
  if (input.fromName !== undefined) dataToUpdate.fromName = input.fromName.trim()
  if (input.isEnabled !== undefined) dataToUpdate.isEnabled = Boolean(input.isEnabled)
  if (input.notifyDeals !== undefined) dataToUpdate.notifyDeals = Boolean(input.notifyDeals)
  if (input.notifyDocuments !== undefined) dataToUpdate.notifyDocuments = Boolean(input.notifyDocuments)
  if (input.notifyTargets !== undefined) dataToUpdate.notifyTargets = Boolean(input.notifyTargets)
  if (input.notifyFollowUps !== undefined) dataToUpdate.notifyFollowUps = Boolean(input.notifyFollowUps)

  const updated = await prisma.emailSetting.update({
    where: { id: existing.id },
    data: dataToUpdate,
  })

  return {
    id: updated.id,
    smtpHost: updated.smtpHost,
    smtpPort: updated.smtpPort,
    smtpSecure: updated.smtpSecure,
    smtpUser: updated.smtpUser,
    hasPassword: Boolean(updated.smtpPass && updated.smtpPass.trim().length > 0),
    fromEmail: updated.fromEmail,
    fromName: updated.fromName,
    isEnabled: updated.isEnabled,
    notifyDeals: updated.notifyDeals,
    notifyDocuments: updated.notifyDocuments,
    notifyTargets: updated.notifyTargets,
    notifyFollowUps: updated.notifyFollowUps,
    updatedAt: updated.updatedAt,
  }
}

/**
 * Creates a nodemailer Transporter using current DB settings.
 */
async function createTransporter() {
  const settings = await prisma.emailSetting.findFirst({
    orderBy: { id: 'asc' },
  })

  if (!settings || !settings.smtpHost || !settings.smtpPort) {
    throw new EmailServiceError('SMTP server host and port are not configured.', 400)
  }

  const auth = settings.smtpUser
    ? {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      }
    : undefined

  return {
    settings,
    transporter: nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      auth,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    }),
  }
}

/**
 * Sends a test email to verify SMTP credentials and connectivity.
 */
export async function sendTestEmail(targetEmail: string) {
  if (!targetEmail || !targetEmail.includes('@')) {
    throw new EmailServiceError('A valid recipient email address is required.', 400)
  }

  const { settings, transporter } = await createTransporter()

  // Verify connection configuration first
  try {
    await transporter.verify()
  } catch (err: any) {
    throw new EmailServiceError(`SMTP verification failed: ${err.message || 'Unable to connect to SMTP server'}`, 400)
  }

  const fromSender = `"${settings.fromName || 'Sales CRM'}" <${settings.fromEmail || settings.smtpUser || 'noreply@crm.local'}>`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
      <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 20px;">SMTP Email Configuration Test</h2>
        <p style="color: #64748b; margin: 4px 0 0; font-size: 14px;">Sales CRM System Notification Service</p>
      </div>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">
        Success! Your dynamic SMTP server settings have been verified and email notifications are ready to be dispatched from the CRM.
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #475569;">
        <strong>Host:</strong> ${settings.smtpHost}<br/>
        <strong>Port:</strong> ${settings.smtpPort} (${settings.smtpSecure ? 'SSL' : 'TLS/STARTTLS'})<br/>
        <strong>Sender:</strong> ${fromSender}
      </div>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
        Sent automatically from Sales CRM Settings test console.
      </p>
    </div>
  `

  await transporter.sendMail({
    from: fromSender,
    to: targetEmail.trim(),
    subject: '✅ Sales CRM: SMTP Connection Test Successful',
    text: 'Your Sales CRM SMTP settings are working properly!',
    html,
  })

  return { success: true, message: `Test email successfully sent to ${targetEmail.trim()}` }
}

/**
 * Dispatches an automated email alert for a system notification.
 * Safe to fire-and-forget: logs errors but never throws unhandled rejections to callers.
 */
export async function sendNotificationEmail(params: {
  recipientUserId: number
  type: string
  title: string
  body?: string | null
  entityType?: string | null
  entityId?: number | null
}) {
  try {
    const settings = await prisma.emailSetting.findFirst({
      orderBy: { id: 'asc' },
    })

    if (!settings || !settings.isEnabled || !settings.smtpHost) {
      return // Email alerts globally disabled or SMTP not configured
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

    // Find recipient email
    const user = await prisma.user.findFirst({
      where: { id: params.recipientUserId, isActive: true, deletedAt: null },
      select: { email: true, name: true },
    })

    if (!user || !user.email) return

    const { transporter } = await createTransporter()
    const fromSender = `"${settings.fromName || 'Sales CRM'}" <${settings.fromEmail || settings.smtpUser || 'noreply@crm.local'}>`

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
        <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 20px;">${params.title}</h2>
          <p style="color: #64748b; margin: 4px 0 0; font-size: 14px;">Sales CRM Notification</p>
        </div>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          Hello <strong>${user.name}</strong>,
        </p>
        <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 4px; margin: 18px 0; font-size: 14px; color: #1e293b; line-height: 1.5;">
          ${params.body || params.title}
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 28px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
          You received this email because notification alerts are enabled for your Sales CRM account.
        </p>
      </div>
    `

    await transporter.sendMail({
      from: fromSender,
      to: user.email,
      subject: `[Sales CRM] ${params.title}`,
      text: `${params.title}\n\n${params.body || ''}`,
      html,
    })

    console.log(`[EmailService] Sent email notification "${params.title}" to ${user.email}`)
  } catch (err: any) {
    console.error('[EmailService] Failed to send email alert:', err.message || err)
  }
}
