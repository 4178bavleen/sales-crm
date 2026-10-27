import type { NextFunction, Response } from 'express'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import {
  deleteNotification,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationServiceError,
} from '../notifications/notification.service.js'

function actorId(req: AuthenticatedRequest): number {
  const id = Number(req.user?.id)
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new NotificationServiceError('Authentication required', 401)
  }
  return id
}

function parsePositiveInt(value: unknown, field: string, fallback?: number): number {
  if (value === undefined && fallback !== undefined) return fallback
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new NotificationServiceError(`${field} must be a positive integer`, 400)
  }
  return parsed
}

function handleError(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof NotificationServiceError) {
    res.status(error.statusCode).json({ success: false, message: error.message })
    return
  }
  next(error)
}

export async function listNotificationsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = actorId(req)
    const rawUnread = req.query.unreadOnly
    if (rawUnread !== undefined && rawUnread !== 'true' && rawUnread !== 'false') {
      throw new NotificationServiceError('unreadOnly must be true or false', 400)
    }
    const data = await listNotifications({
      userId,
      page: parsePositiveInt(req.query.page, 'page', 1),
      limit: parsePositiveInt(req.query.limit, 'limit', 20),
      unreadOnly: rawUnread === 'true',
    })
    res.json({ success: true, data })
  } catch (error) { handleError(error, res, next) }
}

export async function unreadCountController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const count = await getUnreadNotificationCount(actorId(req))
    res.json({ success: true, data: { unreadCount: count } })
  } catch (error) { handleError(error, res, next) }
}

export async function markNotificationReadController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const notification = await markNotificationRead(actorId(req), parsePositiveInt(req.params.id, 'id'))
    res.json({ success: true, message: 'Notification marked as read', data: notification })
  } catch (error) { handleError(error, res, next) }
}

export async function markAllNotificationsReadController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await markAllNotificationsRead(actorId(req))
    res.json({ success: true, message: 'All notifications marked as read', data })
  } catch (error) { handleError(error, res, next) }
}

export async function deleteNotificationController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await deleteNotification(actorId(req), parsePositiveInt(req.params.id, 'id'))
    res.json({ success: true, message: 'Notification deleted successfully' })
  } catch (error) { handleError(error, res, next) }
}
