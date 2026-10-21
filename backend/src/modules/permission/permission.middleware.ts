
import type { NextFunction, Response } from 'express'
import { prisma } from '../../config/database.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'

export function requirePermission(code: string) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
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
        select: {
          role: {
            select: {
              permissions: {
                select: {
                  permission: {
                    select: { code: true },
                  },
                },
              },
            },
          },
        },
      })

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User is inactive or no longer exists',
        })
        return
      }

      const allowed = user.role.permissions.some(
        (item) => item.permission.code === code,
      )

      if (!allowed) {
        res.status(403).json({
          success: false,
          message: 'You do not have permission to perform this action',
          requiredPermission: code,
        })
        return
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}
