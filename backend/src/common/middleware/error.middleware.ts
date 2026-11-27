
import type { ErrorRequestHandler } from 'express'
import fs from 'fs'
import path from 'path'
import { AppError } from '../errors/AppErrors.js'

export const errorMiddleware: ErrorRequestHandler = (
  error,
  req,
  res,
  _next,
) => {
  const isJsonParseError =
    error !== null &&
    typeof error === 'object' &&
    (error as { type?: string }).type === 'entity.parse.failed'

  const isPayloadTooLarge =
    error !== null &&
    typeof error === 'object' &&
    ((error as { type?: string }).type === 'entity.too.large' || (error as { name?: string }).name === 'PayloadTooLargeError')

  const statusCode = isPayloadTooLarge
    ? 413
    : isJsonParseError
      ? 400
      : error instanceof AppError
        ? error.statusCode
        : 500

  const message = isPayloadTooLarge
    ? 'Uploaded image or payload is too large. Maximum size is 15MB.'
    : isJsonParseError
      ? 'Invalid JSON payload'
      : error instanceof AppError
        ? error.message
        : 'Internal server error'

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)

  if (statusCode >= 500) {
    console.error(`\x1b[31m[${timestamp}] [ERROR ${statusCode}] ${req.method} ${req.originalUrl || req.url}\x1b[0m`)
    console.error(error)
    try {
      const logPath = path.resolve(process.cwd(), 'logs', 'crm_last_error.log')
      fs.mkdirSync(path.dirname(logPath), { recursive: true })
      fs.appendFileSync(
        logPath,
        `\n[${timestamp}] [ERROR ${statusCode}] ${req.method} ${req.originalUrl || req.url}\n${error && (error as any).stack ? (error as any).stack : String(error)}\nPayload: ${JSON.stringify(req.body)}\n`
      )
    } catch (e) {
      console.error('Failed to write error log:', e)
    }
  } else if (statusCode >= 400) {
    console.warn(`\x1b[33m[${timestamp}] [WARN ${statusCode}] ${req.method} ${req.originalUrl || req.url} - ${message}\x1b[0m`)
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
    },
  })
}
