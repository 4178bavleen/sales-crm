import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requirePermission } from '../permission/permission.middleware.js'
import { createActivityController, getActivityController, listActivitiesController } from './activity.controller.js'

const router = Router()
router.use(authenticateToken)
router.post('/', requirePermission('activities.create'), createActivityController)
router.get('/', requirePermission('activities.view'), listActivitiesController)
router.get('/:id', requirePermission('activities.view'), getActivityController)

export default router
