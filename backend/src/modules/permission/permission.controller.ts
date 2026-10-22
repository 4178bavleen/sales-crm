
import type { NextFunction, Request, Response } from 'express'
import { z, ZodError } from 'zod'
import * as permissionService from './permission.service.js'
import { getUserPermissions, PermissionServiceError } from './permission.service.js'
import { AuthenticatedRequest } from '../auth/auth.middleware.js'

const roleIdSchema = z.coerce.number().int().positive()

const createRoleSchema = z.object({
  name: z.string().trim().min(2).max(50),
  description: z.string().trim().max(255).optional(),
  codes: z.array(z.string().trim().min(1)).optional(),
})

const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(50).optional(),
  description: z.string().trim().max(255).optional(),
})

const replacePermissionsSchema = z.object({
  codes: z.array(z.string().trim().min(1).max(100)).max(200),
})

function handleError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof ZodError) {
    const errorDetails = error.issues
      .map((issue) => `${issue.path.join('.') || 'request'}: ${issue.message}`)
      .join(', ')
    res.status(400).json({
      success: false,
      message: errorDetails ? `Validation failed: ${errorDetails}` : 'Validation failed',
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

export async function createRole(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = createRoleSchema.parse(req.body)
    const role = await permissionService.createRole(data)
    res.status(201).json({
      success: true,
      data: { role },
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function updateRole(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const roleId = roleIdSchema.parse(req.params.roleId)
    const data = updateRoleSchema.parse(req.body)
    const role = await permissionService.updateRole(roleId, data)
    res.status(200).json({
      success: true,
      data: { role },
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function deleteRole(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const roleId = roleIdSchema.parse(req.params.roleId)
    const rawReassign =
      req.query.reassignToRoleId ??
      (req.body && typeof req.body === 'object' ? req.body.reassignToRoleId : undefined)

    let reassignToRoleId: number | undefined
    if (
      rawReassign !== undefined &&
      rawReassign !== null &&
      String(rawReassign).trim() !== ''
    ) {
      reassignToRoleId = z.coerce.number().int().positive().parse(rawReassign)
    }

    const result = await permissionService.deleteRole(roleId, reassignToRoleId)
    res.status(200).json({
      success: true,
      data: result,
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