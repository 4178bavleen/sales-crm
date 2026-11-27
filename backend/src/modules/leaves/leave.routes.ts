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
  viewLeaveDocumentController,
  getLeavePoliciesController,
  getActiveLeavePoliciesController,
  createLeavePolicyController,
  updateLeavePolicyController,
  deleteLeavePolicyController,
} from './leave.controller.js'
import { uploadLeaveDocument } from './leave.upload.js'
import { ensureLeavePermissions, ensureDefaultLeavePolicies } from './leave.service.js'

void ensureLeavePermissions()
void ensureDefaultLeavePolicies()

const router = Router()
router.use(authenticateToken)

// Leave Categories / Policies endpoints
router.get('/policies', getLeavePoliciesController)
router.get('/policies/active', getActiveLeavePoliciesController)
router.post('/policies', requirePermission('leave.manage'), createLeavePolicyController)
router.patch('/policies/:id', requirePermission('leave.manage'), updateLeavePolicyController)
router.delete('/policies/:id', requirePermission('leave.manage'), deleteLeavePolicyController)

// Employee Self-Service endpoints (Accessible to all authenticated employees)
router.get('/my', getMyLeavesController)
router.get('/my/stats', getMyLeaveStatsController)
router.post('/my', uploadLeaveDocument, applyLeaveController)
router.post('/my/:id/cancel', cancelMyLeaveController)

// Document viewing endpoint (Authorized to leave owner or users with leave.manage / Admin)
router.get('/:id/document', viewLeaveDocumentController)

// Management / Approval endpoints (Requires leave.manage permission or Admin/Manager role)
router.get('/', requirePermission('leave.manage'), getAllLeavesController)
router.patch('/:id/review', requirePermission('leave.manage'), reviewLeaveController)

export default router
