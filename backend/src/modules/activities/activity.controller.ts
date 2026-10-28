import type { NextFunction, Response } from 'express'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { ActivityServiceError, createActivity, getActivityById, listActivities } from './activity.service.js'
import { ActivityValidationError, parseActivityId, parseActivityListQuery, parseCreateActivityInput } from './activity.validation.js'

function actorId(req: AuthenticatedRequest): number {
  const id = Number(req.user?.id)
  if (!Number.isSafeInteger(id) || id <= 0) throw new ActivityServiceError('Authentication required', 401)
  return id
}

function handleError(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof ActivityValidationError) {
    res.status(400).json({ success: false, message: error.message })
    return
  }
  if (error instanceof ActivityServiceError) {
    res.status(error.statusCode).json({ success: false, message: error.message })
    return
  }
  next(error)
}

export async function createActivityController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const activity = await createActivity(parseCreateActivityInput(req.body as Record<string, unknown>), actorId(req))
    res.status(201).json({ success: true, message: 'Activity logged successfully', data: activity })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function listActivitiesController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const query = parseActivityListQuery(req.query as Record<string, unknown>)
    const userId = actorId(req)
    const isAdminOrManager = req.user?.role === 'ADMIN' || req.user?.role === 'SALES_MANAGER'
    const result = await listActivities({
      ...query,
      performedById: isAdminOrManager ? undefined : userId,
    })
    res.json({ success: true, data: result })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getActivityController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const activity = await getActivityById(parseActivityId(req.params.id))
    const userId = actorId(req)
    const isAdminOrManager = req.user?.role === 'ADMIN' || req.user?.role === 'SALES_MANAGER'
    if (!isAdminOrManager && activity.performedById !== userId) {
      res.status(403).json({ success: false, message: 'You do not have permission to view this activity' })
      return
    }
    res.json({ success: true, data: activity })
  } catch (error) {
    handleError(error, res, next)
  }
}
