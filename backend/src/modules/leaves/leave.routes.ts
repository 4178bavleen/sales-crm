import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requirePermission } from '../permission/permission.middleware.js'
import {
  getMyLeavesController,
  getMyLeaveStatsController,
  applyLeaveController,
  cancelMyLeaveController,
  getAllLeavesController,
  reviewLeaveController,
} from './leave.controller.js'
import { ensureLeavePermissions } from './leave.service.js'

void ensureLeavePermissions()

const router = Router()
router.use(authenticateToken)

// Employee Self-Service endpoints (Accessible to all authenticated employees)
router.get('/my', getMyLeavesController)
router.get('/my/stats', getMyLeaveStatsController)
router.post('/my', applyLeaveController)
router.post('/my/:id/cancel', cancelMyLeaveController)

// Management / Approval endpoints (Requires leave.manage permission or Admin/Manager role)
router.get('/', requirePermission('leave.manage'), getAllLeavesController)
router.patch('/:id/review', requirePermission('leave.manage'), reviewLeaveController)

export default router
