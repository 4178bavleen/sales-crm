import { prisma } from '../../config/database.js'

export class NotificationServiceError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'NotificationServiceError'
    this.statusCode = statusCode
  }
}

export type CreateNotificationInput = {
  userId: number
  type: string
  title: string
  body?: string | null
  entityType?: string | null
  entityId?: number | null
}

/** Shared entry point for CRM modules to create an in-app notification. */
export async function createInAppNotification(input: CreateNotificationInput) {
  if (!Number.isSafeInteger(input.userId) || input.userId <= 0) {
    throw new NotificationServiceError('userId must be a positive integer')
  }
  if (!input.type.trim()) throw new NotificationServiceError('type is required')
  if (!input.title.trim()) throw new NotificationServiceError('title is required')

  const recipient = await prisma.user.findFirst({
    where: { id: input.userId, isActive: true, deletedAt: null },
    select: { id: true },
  })
  if (!recipient) {
    throw new NotificationServiceError('Notification recipient was not found or is inactive', 404)
  }

  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type.trim(),
      title: input.title.trim(),
      body: input.body?.trim() || null,
      entityType: input.entityType?.trim() || null,
      entityId: input.entityId ?? null,
    },
  })
}

export async function listNotifications(input: {
  userId: number
  page?: number
  limit?: number
  unreadOnly?: boolean
}) {
  const page = Math.max(1, input.page ?? 1)
  const limit = Math.min(100, Math.max(1, input.limit ?? 20))
  const where = {
    userId: input.userId,
    ...(input.unreadOnly ? { isRead: false } : {}),
  }

  const [items, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: input.userId, isRead: false } }),
  ])

  return {
    items,
    unreadCount,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export async function getUnreadNotificationCount(userId: number) {
  return prisma.notification.count({ where: { userId, isRead: false } })
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true, readAt: new Date() },
  })
  if (result.count === 0) {
    throw new NotificationServiceError('Notification not found', 404)
  }
  return prisma.notification.findFirst({ where: { id: notificationId, userId } })
}

export async function markAllNotificationsRead(userId: number) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  })
  return { updatedCount: result.count }
}

export async function deleteNotification(userId: number, notificationId: number) {
  const result = await prisma.notification.deleteMany({
    where: { id: notificationId, userId },
  })
  if (result.count === 0) {
    throw new NotificationServiceError('Notification not found', 404)
  }
}
