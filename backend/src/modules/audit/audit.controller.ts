import type { NextFunction, Response } from 'express'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { listAuditLogs } from './audit.service.js'

export async function listAuditLogsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { entityType, entityId, actorId, action, page, limit } = req.query

    const result = await listAuditLogs({
      entityType: entityType ? String(entityType) : undefined,
      entityId: entityId ? Number(entityId) : undefined,
      actorId: actorId ? Number(actorId) : undefined,
      action: action ? String(action) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
