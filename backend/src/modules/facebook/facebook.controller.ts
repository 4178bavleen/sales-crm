import type { Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../../common/errors/AppErrors.js'
import {
  getFacebookSettings,
  testFacebookConnection,
  updateFacebookSettings,
} from './facebook.service.js'
import { updateFacebookSettingsSchema } from './facebook.validation.js'

export function handleFacebookError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input',
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ success: false, message: error.message })
  }
  console.error('[Facebook] Unhandled error:', error)
  return res.status(500).json({ success: false, message: 'An unexpected error occurred' })
}

export async function getFacebookSettingsHandler(_req: Request, res: Response) {
  try {
    const settings = await getFacebookSettings()
    return res.status(200).json({ success: true, data: settings })
  } catch (error) {
    return handleFacebookError(res, error)
  }
}

export async function updateFacebookSettingsHandler(req: Request, res: Response) {
  try {
    const input = updateFacebookSettingsSchema.parse(req.body ?? {})
    const settings = await updateFacebookSettings(input)
    return res.status(200).json({
      success: true,
      message: 'Facebook settings saved successfully',
      data: settings,
    })
  } catch (error) {
    return handleFacebookError(res, error)
  }
}

export async function testFacebookConnectionHandler(_req: Request, res: Response) {
  try {
    const result = await testFacebookConnection()
    return res.status(200).json(result)
  } catch (error) {
    return handleFacebookError(res, error)
  }
}
