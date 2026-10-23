
import type { ErrorRequestHandler } from 'express'
import { AppError } from '../errors/AppErrors.js'

export const errorMiddleware: ErrorRequestHandler = (
  error,
  req,
  res,
  _next,
) => {
  const statusCode =
    error instanceof AppError ? error.statusCode : 500

  const message =
    error instanceof AppError
      ? error.message
      : 'Internal server error'

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)

  if (statusCode >= 500) {
    console.error(`\x1b[31m[${timestamp}] [ERROR ${statusCode}] ${req.method} ${req.originalUrl || req.url}\x1b[0m`)
    console.error(error)
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
