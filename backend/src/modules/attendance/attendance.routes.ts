import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requirePermission } from '../permission/permission.middleware.js'
import {
  listAttendanceController,
  getAttendanceOptionsController,
  getAttendanceByIdController,
  saveBulkAttendanceController,
  createAttendanceController,
  updateAttendanceController,
  deleteAttendanceController,
} from './attendance.controller.js'
import { ensureAttendancePermissions } from './attendance.service.js'

void ensureAttendancePermissions()

const router = Router()
router.use(authenticateToken)

router.get('/options', requirePermission('attendance.view'), getAttendanceOptionsController)
router.post('/bulk', requirePermission('attendance.manage'), saveBulkAttendanceController)
router.get('/:id', requirePermission('attendance.view'), getAttendanceByIdController)
router.get('/', requirePermission('attendance.view'), listAttendanceController)
router.post('/', requirePermission('attendance.manage'), createAttendanceController)
router.patch('/:id', requirePermission('attendance.manage'), updateAttendanceController)
router.delete('/:id', requirePermission('attendance.manage'), deleteAttendanceController)

export default router
