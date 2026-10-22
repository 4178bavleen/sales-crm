import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requirePermission } from '../permission/permission.middleware.js'
import {
  createMeetingController,
  deleteMeetingController,
  getMeetingController,
  getMeetingOptionsController,
  listMeetingsController,
  updateMeetingController,
} from './meeting.controller.js'

const router = Router()

router.use(authenticateToken)

router.get('/', requirePermission('meetings.view'), listMeetingsController)
router.get('/options', requirePermission('meetings.view'), getMeetingOptionsController)
router.get('/:id', requirePermission('meetings.view'), getMeetingController)
router.post('/', requirePermission('meetings.create'), createMeetingController)
router.patch('/:id', requirePermission('meetings.edit'), updateMeetingController)
router.delete('/:id', requirePermission('meetings.delete'), deleteMeetingController)

export default router
