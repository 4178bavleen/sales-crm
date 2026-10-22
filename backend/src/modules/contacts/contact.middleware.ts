
import type { NextFunction, Response } from 'express'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'

/**
 * Ensures the authenticated user is available to contact handlers.
 *
 * Authentication and permission checks are already handled by
 * authenticateToken and requirePermission in contact.routes.ts.
 */

export function requireContactUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    })
    return
  }

  next()
}
