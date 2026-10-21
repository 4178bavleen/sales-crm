import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'
import type { JwtPayload } from './auth.types.js'

export interface AuthenticatedRequest extends Request {
  user?: { id: number }
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const authorization = req.headers.authorization
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : undefined

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    })
    return
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    const userId = Number(decoded.sub)

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      })
      return
    }

    req.user = { id: userId }
    next()
  } catch (error) {
  if (error instanceof jwt.TokenExpiredError) {
    res.status(401).json({
      success: false,
      message: 'Access token has expired. Please log in again.',
    })
    return
  }

  if (error instanceof jwt.JsonWebTokenError) {
    console.error('JWT verification failed:', error.name, error.message)

    res.status(401).json({
      success: false,
      message: 'Invalid authentication token',
    })
    return
  }
  next(error)
}
}