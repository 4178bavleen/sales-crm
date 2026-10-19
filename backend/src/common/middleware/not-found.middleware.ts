
import type { RequestHandler } from 'express'

export const notFoundMiddleware: RequestHandler = (
  req,
  _res,
  next,
) => {
  next(new Error(`Route not found: ${req.method} ${req.originalUrl}`))
}
