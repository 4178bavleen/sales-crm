
import { Router } from 'express'
import {
  createLead,
  listLeads,
  getLead,
  editLead,
  removeLead,
  getLeadStats,
  getLeadOptions,
} from './lead.controller.js'
import { authenticateToken } from '../auth/auth.middleware.js'
import { assignLeadController } from './lead.controller.js'
import { changeLeadStatus } from './lead.controller.js'
import { requirePermission } from '../permission/permission.middleware.js'

import {
  uploadLeadImportFile,
  previewLeadImport,
  confirmLeadImportController,
} from "./import/lead-import.controller.js";

const router = Router()

router.use(authenticateToken)
router.post('/',  requirePermission('leads.create'), createLead)
router.get('/', requirePermission('leads.view'), listLeads)
router.get('/options', requirePermission('leads.view'), getLeadOptions)
router.get('/stats', requirePermission('leads.view'), getLeadStats)
router.get('/:id', requirePermission('leads.view'), getLead)
router.patch('/:id', requirePermission('leads.edit'), editLead)
router.delete('/:id', requirePermission('leads.delete'), removeLead)
router.patch('/:id/assign', requirePermission('leads.assign'), assignLeadController)
router.patch('/:id/status', requirePermission('leads.edit'), changeLeadStatus)

router.post(
  "/import/preview",
  requirePermission("leads.create"),
  uploadLeadImportFile,
  previewLeadImport,
);

router.post(
  "/import/confirm",
  requirePermission("leads.create"),
  confirmLeadImportController,
);



export default router
