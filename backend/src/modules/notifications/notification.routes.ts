import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import {
  deleteNotificationController,
  listNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController,
  unreadCountController,
} from './notification.controller.js'

const router = Router()
router.use(authenticateToken)

router.get('/unread-count', unreadCountController)
router.patch('/read-all', markAllNotificationsReadController)
router.get('/', listNotificationsController)
router.patch('/:id/read', markNotificationReadController)
router.delete('/:id', deleteNotificationController)

export default router
