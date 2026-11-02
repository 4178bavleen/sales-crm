import type { Request, Response } from 'express'
import {
  getWhatsAppSettings,
  updateWhatsAppSettings,
  sendTestWhatsApp,
  WhatsAppServiceError,
} from './whatsapp.service.js'

export async function getWhatsAppSettingsHandler(_req: Request, res: Response) {
  try {
    const data = await getWhatsAppSettings()
    res.json({ success: true, data })
  } catch (err: any) {
    const status = err instanceof WhatsAppServiceError ? err.statusCode : 500
    res.status(status).json({ success: false, message: err.message || 'Failed to fetch WhatsApp settings' })
  }
}

export async function updateWhatsAppSettingsHandler(req: Request, res: Response) {
  try {
    let input = req.body
    if (typeof input === 'string') {
      try {
        input = JSON.parse(input)
      } catch {
        // use as-is
      }
    }
    const data = await updateWhatsAppSettings(input || {})
    res.json({ success: true, message: 'WhatsApp settings saved successfully', data })
  } catch (err: any) {
    const status = err instanceof WhatsAppServiceError ? err.statusCode : 400
    res.status(status).json({ success: false, message: err.message || 'Failed to update WhatsApp settings' })
  }
}

export async function sendTestWhatsAppHandler(req: Request, res: Response) {
  try {
    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {
        // use as-is
      }
    }
    const targetPhone = body?.targetPhone || (req as any).user?.phone
    if (!targetPhone) {
      return res.status(400).json({
        success: false,
        message: 'Recipient phone number with country code is required (e.g. 919876543210)',
      })
    }
    const result = await sendTestWhatsApp(targetPhone)
    res.json(result)
  } catch (err: any) {
    const status = err instanceof WhatsAppServiceError ? err.statusCode : 400
    res.status(status).json({ success: false, message: err.message || 'Failed to deliver test WhatsApp message' })
  }
}
