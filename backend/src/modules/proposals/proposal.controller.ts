import type { Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import {
  listProposals,
  getProposalById,
  getProposalStats,
  getProposalOptions,
  createProposal,
  updateProposal,
  updateProposalStatus,
  sendProposal,
  deleteProposal,
  ProposalError,
} from './proposal.service.js'
import {
  proposalIdSchema,
  createProposalSchema,
  updateProposalSchema,
  updateProposalStatusSchema,
  proposalFilterSchema,
} from './proposal.validation.js'

function handleProposalError(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    })
    return
  }
  if (error instanceof ProposalError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    })
    return
  }
  next(error)
}

export async function listProposalsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const validated = proposalFilterSchema.parse(req.query)
    const result = await listProposals(validated)
    res.status(200).json({ success: true, ...result })
  } catch (error) {
    handleProposalError(error, res, next)
  }
}

export async function getProposalByIdController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = proposalIdSchema.parse(req.params.id)
    const proposal = await getProposalById(id)
    res.status(200).json({ success: true, data: proposal })
  } catch (error) {
    handleProposalError(error, res, next)
  }
}

export async function getProposalStatsController(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const stats = await getProposalStats()
    res.status(200).json({ success: true, data: stats })
  } catch (error) {
    handleProposalError(error, res, next)
  }
}

export async function getProposalOptionsController(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const options = await getProposalOptions()
    res.status(200).json({ success: true, data: options })
  } catch (error) {
    handleProposalError(error, res, next)
  }
}

export async function createProposalController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const validated = createProposalSchema.parse(req.body)
    const proposal = await createProposal(validated, req.user.id)
    res.status(201).json({
      success: true,
      message: 'Proposal created successfully',
      data: proposal,
    })
  } catch (error) {
    handleProposalError(error, res, next)
  }
}

export async function updateProposalController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const id = proposalIdSchema.parse(req.params.id)
    const validated = updateProposalSchema.parse(req.body)
    const proposal = await updateProposal(id, validated, req.user.id)
    res.status(200).json({
      success: true,
      message: 'Proposal updated successfully',
      data: proposal,
    })
  } catch (error) {
    handleProposalError(error, res, next)
  }
}

export async function updateProposalStatusController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const id = proposalIdSchema.parse(req.params.id)
    const validated = updateProposalStatusSchema.parse(req.body)
    const proposal = await updateProposalStatus(id, validated, req.user.id)
    res.status(200).json({
      success: true,
      message: 'Proposal status updated successfully',
      data: proposal,
    })
  } catch (error) {
    handleProposalError(error, res, next)
  }
}

export async function sendProposalController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const id = proposalIdSchema.parse(req.params.id)
    const proposal = await sendProposal(id, req.user.id)
    res.status(200).json({
      success: true,
      message: 'Proposal marked as sent to customer',
      data: proposal,
    })
  } catch (error) {
    handleProposalError(error, res, next)
  }
}

export async function deleteProposalController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const id = proposalIdSchema.parse(req.params.id)
    const result = await deleteProposal(id, req.user.id)
    res.status(200).json(result)
  } catch (error) {
    handleProposalError(error, res, next)
  }
}
