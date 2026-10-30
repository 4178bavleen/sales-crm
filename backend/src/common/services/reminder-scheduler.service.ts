import { prisma } from '../../config/database.js'
import { createInAppNotification } from '../../modules/notifications/notification.service.js'

let isRunning = false

/**
 * Checks for tasks and meetings that require reminders:
 * 1. Tasks due today or overdue
 * 2. Meetings starting in the next 15-30 minutes
 */
export async function runReminderChecks() {
  if (isRunning) return
  isRunning = true

  try {
    const now = new Date()
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))

    // 1. Task Reminders: Active tasks due today
    const dueTasks = await prisma.task.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        dueAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        title: true,
        assignedToId: true,
        dueAt: true,
      },
    })

    for (const task of dueTasks) {
      // Check if a reminder notification was already sent today for this task
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: task.assignedToId,
          type: 'TASK_DUE_TODAY',
          entityType: 'task',
          entityId: task.id,
          createdAt: { gte: startOfDay },
        },
      })

      if (!existingNotification) {
        await createInAppNotification({
          userId: task.assignedToId,
          type: 'TASK_DUE_TODAY',
          title: 'Task due today',
          body: `Reminder: Task "${task.title}" is due today.`,
          entityType: 'task',
          entityId: task.id,
        })
      }
    }

    // 2. Meeting Reminders: Meetings starting within the next 30 minutes
    const windowStart = now
    const windowEnd = new Date(now.getTime() + 30 * 60 * 1000)

    const upcomingMeetings = await prisma.meeting.findMany({
      where: {
        status: 'PLANNED',
        startsAt: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      include: {
        participants: { select: { userId: true } },
      },
    })

    for (const meeting of upcomingMeetings) {
      const recipientIds = new Set<number>()
      if (meeting.organizerId) recipientIds.add(meeting.organizerId)
      for (const p of meeting.participants) {
        if (p.userId) recipientIds.add(p.userId)
      }

      for (const userId of recipientIds) {
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId,
            type: 'MEETING_UPCOMING_REMINDER',
            entityType: 'meeting',
            entityId: meeting.id,
            createdAt: { gte: new Date(now.getTime() - 4 * 60 * 60 * 1000) },
          },
        })

        if (!existingNotification) {
          const minutesRemaining = Math.max(1, Math.round((meeting.startsAt.getTime() - now.getTime()) / 60000))
          await createInAppNotification({
            userId,
            type: 'MEETING_UPCOMING_REMINDER',
            title: 'Upcoming meeting reminder',
            body: `Your meeting "${meeting.title}" begins in ~${minutesRemaining} minutes.`,
            entityType: 'meeting',
            entityId: meeting.id,
          })
        }
      }
    }
  } catch (err) {
    console.error('Error running automated reminder check:', err)
  } finally {
    isRunning = false
  }
}

/**
 * Initializes a background reminder timer running every 5 minutes.
 */
export function initReminderScheduler() {
  // Run first check 10 seconds after server start
  setTimeout(() => {
    void runReminderChecks()
  }, 10000)

  // Then run periodically every 5 minutes
  setInterval(() => {
    void runReminderChecks()
  }, 5 * 60 * 1000)
}
