import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import {
  listProposalsController,
  getProposalByIdController,
  getProposalStatsController,
  getProposalOptionsController,
  createProposalController,
  updateProposalController,
  updateProposalStatusController,
  submitProposalForApprovalController,
  approveProposalController,
  requestProposalChangesController,
  sendProposalController,
  deleteProposalController,
} from './proposal.controller.js'
import { ensureProposalPermissions } from './proposal.service.js'

// Auto-seed proposal permissions on startup
void ensureProposalPermissions()

const router = Router()
router.use(authenticateToken)

// Options and Stats
router.get('/options', getProposalOptionsController)
router.get('/stats', getProposalStatsController)

// Proposal CRUD & actions
router.get('/', listProposalsController)
router.post('/', createProposalController)
router.get('/:id', getProposalByIdController)
router.patch('/:id', updateProposalController)
router.patch('/:id/status', updateProposalStatusController)
router.post('/:id/submit-approval', submitProposalForApprovalController)
router.post('/:id/approve', approveProposalController)
router.post('/:id/request-changes', requestProposalChangesController)
router.post('/:id/send', sendProposalController)
router.delete('/:id', deleteProposalController)

export default router
