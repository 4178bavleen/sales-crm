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

    // 1. Task Reminders: Active tasks due today or overdue
    const dueTasks = await prisma.task.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        dueAt: {
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

    let tasksNotified = 0
    for (const task of dueTasks) {
      const isOverdue = task.dueAt < startOfDay
      const notifType = isOverdue ? 'TASK_OVERDUE' : 'TASK_DUE_TODAY'
      const notifTitle = isOverdue ? 'Task is overdue' : 'Task due today'
      const notifBody = isOverdue
        ? `Reminder: Task "${task.title}" is overdue.`
        : `Reminder: Task "${task.title}" is due today.`

      // Check if a reminder notification was already sent today for this task
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: task.assignedToId,
          type: { in: ['TASK_DUE_TODAY', 'TASK_OVERDUE'] },
          entityType: 'task',
          entityId: task.id,
          createdAt: { gte: startOfDay },
        },
      })

      if (!existingNotification) {
        await createInAppNotification({
          userId: task.assignedToId,
          type: notifType,
          title: notifTitle,
          body: notifBody,
          entityType: 'task',
          entityId: task.id,
        })
        tasksNotified++
        console.log(`[ReminderScheduler] Dispatched ${notifType} for Task #${task.id} to User #${task.assignedToId}`)
      }
    }

    // 2. Meeting Reminders: Meetings starting within next 30 minutes
    // Includes a 10-minute backward grace window so short-notice meetings aren't missed between 5-min intervals
    const windowStart = new Date(now.getTime() - 10 * 60 * 1000)
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

    let meetingsNotified = 0
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
          const diffMinutes = Math.round((meeting.startsAt.getTime() - now.getTime()) / 60000)
          const timeText = diffMinutes <= 0 ? 'starting now' : `begins in ~${diffMinutes} minutes`
          await createInAppNotification({
            userId,
            type: 'MEETING_UPCOMING_REMINDER',
            title: 'Upcoming meeting reminder',
            body: `Your meeting "${meeting.title}" ${timeText}.`,
            entityType: 'meeting',
            entityId: meeting.id,
          })
          meetingsNotified++
          console.log(`[ReminderScheduler] Dispatched MEETING_UPCOMING_REMINDER for Meeting #${meeting.id} to User #${userId}`)
        }
      }
    }

    if (tasksNotified > 0 || meetingsNotified > 0) {
      console.log(`[ReminderScheduler] Sent ${tasksNotified} task reminders and ${meetingsNotified} meeting reminders.`)
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
  console.log('[ReminderScheduler] Initialized background scheduler (interval: 5m, initial check in 10s)')
  // Run first check 10 seconds after server start
  setTimeout(() => {
    void runReminderChecks()
  }, 10000)

  // Then run periodically every 5 minutes
  setInterval(() => {
    void runReminderChecks()
  }, 5 * 60 * 1000)
}
