
import type { ErrorRequestHandler } from 'express'
import { AppError } from '../errors/AppErrors'

export const errorMiddleware: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  const statusCode =
    error instanceof AppError ? error.statusCode : 500

  const message =
    error instanceof AppError
      ? error.message
      : 'Internal server error'

  if (statusCode >= 500) {
    console.error(error)
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
    },
  })
}
