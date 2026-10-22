import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requirePermission } from '../permission/permission.middleware.js'
import {
  createTargetController,
  deleteTargetController,
  getTargetController,
  getTargetOptionsController,
  listTargetsController,
  updateTargetController,
} from './target.controller.js'

const router = Router()

router.use(authenticateToken)

router.get('/', requirePermission('targets.view'), listTargetsController)
router.get('/options', requirePermission('targets.view'), getTargetOptionsController)
router.get('/:id', requirePermission('targets.view'), getTargetController)
router.post('/', requirePermission('targets.create'), createTargetController)
router.patch('/:id', requirePermission('targets.edit'), updateTargetController)
router.delete('/:id', requirePermission('targets.delete'), deleteTargetController)

export default router
