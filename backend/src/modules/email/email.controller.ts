import type { Request, Response } from 'express'
import {
  getEmailSettings,
  updateEmailSettings,
  sendTestEmail,
  EmailServiceError,
} from './email.service.js'

export async function getSettingsHandler(_req: Request, res: Response) {
  try {
    const data = await getEmailSettings()
    res.json({ success: true, data })
  } catch (err: any) {
    const status = err instanceof EmailServiceError ? err.statusCode : 500
    res.status(status).json({ success: false, message: err.message || 'Failed to fetch email settings' })
  }
}

export async function updateSettingsHandler(req: Request, res: Response) {
  try {
    let input = req.body
    if (typeof input === 'string') {
      try {
        input = JSON.parse(input)
      } catch {
        // use as-is
      }
    }
    const data = await updateEmailSettings(input || {})
    res.json({ success: true, message: 'Email settings saved successfully', data })
  } catch (err: any) {
    const status = err instanceof EmailServiceError ? err.statusCode : 400
    res.status(status).json({ success: false, message: err.message || 'Failed to update email settings' })
  }
}

export async function sendTestEmailHandler(req: Request, res: Response) {
  try {
    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {
        // use as-is
      }
    }
    const targetEmail = body?.targetEmail || (req as any).user?.email
    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'Recipient email address is required' })
    }
    const result = await sendTestEmail(targetEmail)
    res.json(result)
  } catch (err: any) {
    const status = err instanceof EmailServiceError ? err.statusCode : 400
    res.status(status).json({ success: false, message: err.message || 'Failed to deliver test email' })
  }
}
