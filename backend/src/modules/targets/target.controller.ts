import type { NextFunction, Response } from 'express'
import { ZodError } from 'zod'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import * as targetService from './target.service.js'
import { TargetServiceError } from './target.service.js'
import {
  createTargetSchema,
  listTargetsQuerySchema,
  targetIdSchema,
  updateTargetSchema,
} from './target.validation.js'

function actorId(req: AuthenticatedRequest): number {
  if (!req.user?.id) {
    throw new TargetServiceError('Authentication required', 401)
  }
  return Number(req.user.id)
}

function handleError(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof ZodError) {
    const errorDetails = error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join(', ')
    res.status(400).json({
      success: false,
      message: errorDetails ? `Validation failed: ${errorDetails}` : 'Validation failed',
      errors: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    })
    return
  }

  if (error instanceof TargetServiceError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    })
    return
  }

  next(error)
}

export async function listTargetsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const query = listTargetsQuerySchema.parse(req.query)
    const result = await targetService.listTargets(query)
    res.status(200).json({
      success: true,
      message: 'Targets retrieved successfully',
      data: result,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getTargetOptionsController(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const options = await targetService.getTargetOptions()
    res.status(200).json({
      success: true,
      message: 'Target options retrieved successfully',
      data: options,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getTargetController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = targetIdSchema.parse(req.params)
    const target = await targetService.getTargetById(id)
    res.status(200).json({
      success: true,
      message: 'Target retrieved successfully',
      data: target,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function createTargetController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = createTargetSchema.parse(req.body)
    const target = await targetService.createTarget(body, actorId(req))
    res.status(201).json({
      success: true,
      message: 'Sales target created successfully',
      data: target,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function updateTargetController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = targetIdSchema.parse(req.params)
    const body = updateTargetSchema.parse(req.body)
    const target = await targetService.updateTarget(id, body, actorId(req))
    res.status(200).json({
      success: true,
      message: 'Sales target updated successfully',
      data: target,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function deleteTargetController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = targetIdSchema.parse(req.params)
    await targetService.deleteTarget(id)
    res.status(200).json({
      success: true,
      message: 'Sales target deleted successfully',
    })
  } catch (error) {
    handleError(error, res, next)
  }
}
