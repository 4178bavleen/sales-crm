
import type { Request, Response, NextFunction } from 'express'
import * as authService from './auth.service.js'
import { loginSchema } from './auth.validation.js'
import { logAudit } from '../audit/audit.service.js'
import type { AuthenticatedRequest } from './auth.middleware.js'

function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  return req.ip || null
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const ipAddress = getClientIp(req)
  try {
    const input = loginSchema.parse(req.body)
    const result = await authService.loginUser(input)

    void logAudit({
      actorId: result.user.id,
      action: 'LOGIN',
      entityType: 'AUTH',
      entityId: result.user.id,
      ipAddress,
      after: {
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    })

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    })
  } catch (error) {
    if (req.body?.email) {
      void logAudit({
        actorId: null,
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        entityId: 0,
        ipAddress,
        after: {
          attemptedEmail: String(req.body.email),
          reason: 'Invalid credentials or inactive account',
        },
      })
    }
    next(error)
  }
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // The authentication middleware will attach the verified user ID.
    const userId = (req as Request & { user?: { id: number } }).user?.id

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
      return
    }

    const user = await authService.getUserProfile(userId)

    res.status(200).json({
      success: true,
      data: { user },
    })
  } catch (error) {
    next(error)
  }
}

export function logout(req: Request, res: Response): void {
  const userId = (req as AuthenticatedRequest).user?.id
  const ipAddress = getClientIp(req)

  if (userId) {
    void logAudit({
      actorId: userId,
      action: 'LOGOUT',
      entityType: 'AUTH',
      entityId: userId,
      ipAddress,
      after: {
        status: 'User session closed',
      },
    })
  }

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  })
}