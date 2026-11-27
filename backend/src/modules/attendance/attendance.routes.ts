import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requireAnyPermission } from '../permission/permission.middleware.js'
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

router.get(
  '/options',
  requireAnyPermission('attendance.view', 'attendance.viewAll', 'attendance.manage'),
  getAttendanceOptionsController,
)
router.post(
  '/bulk',
  requireAnyPermission('attendance.manage', 'attendance.create', 'attendance.edit', 'attendance.delete'),
  saveBulkAttendanceController,
)
router.get(
  '/:id',
  requireAnyPermission('attendance.view', 'attendance.viewAll', 'attendance.manage'),
  getAttendanceByIdController,
)
router.get(
  '/',
  requireAnyPermission('attendance.view', 'attendance.viewAll', 'attendance.manage'),
  listAttendanceController,
)
router.post('/', requireAnyPermission('attendance.manage', 'attendance.create'), createAttendanceController)
router.patch('/:id', requireAnyPermission('attendance.manage', 'attendance.edit'), updateAttendanceController)
router.delete('/:id', requireAnyPermission('attendance.manage', 'attendance.delete'), deleteAttendanceController)

export default router
