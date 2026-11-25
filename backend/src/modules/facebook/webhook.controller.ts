import type { Request, Response } from 'express'
import { getFacebookSettingsRecord, verifyFacebookSignature, verifyFacebookWebhookToken } from './facebook.service.js'
import { processFacebookWebhook } from './facebook-webhook.service.js'

function getRawBody(req: Request): Buffer {
  const attached = (req as Request & { rawBody?: Buffer }).rawBody
  if (Buffer.isBuffer(attached)) return attached
  if (Buffer.isBuffer(req.body)) return req.body
  return Buffer.from(JSON.stringify(req.body ?? {}))
}

export async function verifyWebhookHandler(req: Request, res: Response) {
  try {
    const token =
      typeof req.query['hub.verify_token'] === 'string' ? req.query['hub.verify_token'] : ''
    const challenge =
      typeof req.query['hub.challenge'] === 'string' ? req.query['hub.challenge'] : ''
    const result = await verifyFacebookWebhookToken(token, challenge)
    if (!result.ok) return res.status(403).send('Forbidden')
    return res.status(200).type('text/plain').send(result.challenge)
  } catch (error) {
    console.error('[FacebookWebhook] Verification failed:', error)
    return res.status(500).send('Webhook verification error')
  }
}

export async function receiveWebhookHandler(req: Request, res: Response) {
  const rawBody = getRawBody(req)
  const signature = req.header('x-hub-signature-256') ?? undefined

  let appSecret = ''
  try {
    const settings = await getFacebookSettingsRecord()
    appSecret = settings.appSecret
  } catch (error) {
    console.error('[FacebookWebhook] Could not load settings:', error)
    return res.status(500).json({ success: false, message: 'Could not verify webhook signature' })
  }

  if (!verifyFacebookSignature(rawBody, signature, appSecret)) {
    console.warn('[FacebookWebhook] Rejected request with invalid signature')
    return res.status(403).json({ success: false, message: 'Invalid webhook signature' })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' })
  }

  try {
    const result = await processFacebookWebhook(payload)
    return res.status(200).json({ success: true, ...result })
  } catch (error) {
    console.error('[FacebookWebhook] Could not process payload:', error)
    return res.status(200).json({
      success: true,
      message: 'Webhook acknowledged with errors',
      processed: 0,
      duplicates: 0,
      failed: 0,
      ignored: 0,
    })
  }
}
