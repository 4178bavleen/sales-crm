import type { Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { prisma } from '../../config/database.js'

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
      return
    }

    const user = await prisma.user.findFirst({
      where: {
        id: req.user.id,
        isActive: true,
        deletedAt: null,
      },
      include: { role: true },
    })

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User account is inactive or no longer exists',
      })
      return
    }

    if (user.role.name !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Administrator access required',
      })
      return
    }

    next()
  } catch (error) {
    next(error)
  }
}