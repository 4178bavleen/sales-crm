import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requirePermission } from '../permission/permission.middleware.js'
import {
  createTaskController,
  deleteTaskController,
  getTaskController,
  getTaskOptionsController,
  listTasksController,
  updateTaskController,
  updateTaskStatusController,
} from './task.controller.js'

const router = Router()

router.use(authenticateToken)

router.post('/', requirePermission('tasks.create'), createTaskController)
router.get('/', requirePermission('tasks.view'), listTasksController)
router.get('/options', requirePermission('tasks.view'), getTaskOptionsController)
router.get('/:id', requirePermission('tasks.view'), getTaskController)
router.patch('/:id', requirePermission('tasks.edit'), updateTaskController)
router.patch(
  '/:id/status',
  requirePermission('tasks.edit'),
  updateTaskStatusController,
)
router.delete('/:id', requirePermission('tasks.delete'), deleteTaskController)

export default router