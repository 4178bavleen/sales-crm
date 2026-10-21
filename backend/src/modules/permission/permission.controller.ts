
import type { NextFunction, Request, Response } from 'express'
import { z, ZodError } from 'zod'
import * as permissionService from './permission.service.js'
import { getUserPermissions, PermissionServiceError } from './permission.service.js'
import { AuthenticatedRequest } from '../auth/auth.middleware.js'

const roleIdSchema = z.coerce.number().int().positive()

const replacePermissionsSchema = z.object({
  codes: z.array(z.string().trim().min(1).max(100)).max(200),
})

function handleError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    })
    return
  }
  if (error instanceof PermissionServiceError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    })
    return
  }

  next(error)
}

export async function listRoles(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const roles = await permissionService.listRoles()
    res.status(200).json({
      success: true,
      data: { roles },
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function listPermissions(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const permissions = await permissionService.listPermissions()
    res.status(200).json({
      success: true,
      data: { permissions },
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getRolePermissions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const roleId = roleIdSchema.parse(req.params.roleId)
    const role = await permissionService.getRolePermissions(roleId)

    res.status(200).json({
      success: true,
      data: { role },
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function updateRolePermissions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const roleId = roleIdSchema.parse(req.params.roleId)
    const { codes } = replacePermissionsSchema.parse(req.body)

    const role = await permissionService.replaceRolePermissions(
      roleId,
      codes,
    )

    res.status(200).json({
      success: true,
      message: 'Role permissions updated successfully',
      data: { role },
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getMyPermissions(
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

    const data = await getUserPermissions(req.user.id)

    res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    if (error instanceof PermissionServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      })
      return
    }

    next(error)
  }
}