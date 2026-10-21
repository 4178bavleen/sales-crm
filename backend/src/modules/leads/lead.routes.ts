
import { Router } from 'express'
import {
  createLead,
  listLeads,
  getLead,
  editLead,
  removeLead,
} from './lead.controller.js'
import { authenticateToken } from '../auth/auth.middleware.js'
import { assignLeadController } from './lead.controller.js'
import { changeLeadStatus } from './lead.controller.js'
import { requirePermission } from '../permission/permission.middleware.js'

const router = Router()

// All lead routes require authentication.
router.use(authenticateToken)

router.post('/',requirePermission('leads.create'), createLead)
router.get('/', requirePermission('leads.view'), listLeads)
router.get('/:id', requirePermission('leads.view'), getLead)
router.patch('/:id', requirePermission('leads.edit'), editLead)
router.delete('/:id', requirePermission('leads.delete'), removeLead)
router.patch('/:id/assign', requirePermission('leads.assign'), assignLeadController)
router.patch('/:id/status', requirePermission('leads.edit'), changeLeadStatus)

export default router
