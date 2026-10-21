
import type { Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import * as leadService from './lead.service.js'
import { LeadServiceError } from './lead.service.js'
import {
  createLeadSchema,
  listLeadsSchema,
  updateLeadSchema,
  leadIdSchema,
  assignLeadSchema,
  updateLeadStatusSchema
} from './lead.validation.js'

function handleLeadControllerError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    })
    return
  }

  if (error instanceof LeadServiceError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    })
    return
  }

  next(error)
}

export async function createLead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
      return
    }

    const input = createLeadSchema.parse(req.body)
    const lead = await leadService.createLead(input, req.user.id)

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: { lead },
    })
  } catch (error) {
    handleLeadControllerError(error, res, next)
  }
}

export async function listLeads(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
      return
    }

    const query = listLeadsSchema.parse(req.query)
    const result = await leadService.getLeads(query)

    res.status(200).json({
      success: true,
      message: 'Leads retrieved successfully',
      data: result,
    })
  } catch (error) {
    handleLeadControllerError(error, res, next)
  }
}

export async function getLead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
      return
    }

    const id = leadIdSchema.parse(req.params.id)
    const lead = await leadService.getLeadById(id)

    res.status(200).json({
      success: true,
      message: 'Lead retrieved successfully',
      data: { lead },
    })
  } catch (error) {
    handleLeadControllerError(error, res, next)
  }
}

export async function editLead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
      return
    }

    const id = leadIdSchema.parse(req.params.id)
    const input = updateLeadSchema.parse(req.body)
    const lead = await leadService.updateLead(id, input)

    res.status(200).json({
      success: true,
      message: 'Lead updated successfully',
      data: { lead },
    })
  } catch (error) {
    handleLeadControllerError(error, res, next)
  }
}

export async function removeLead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
      return
    }

    const id = leadIdSchema.parse(req.params.id)
    const result = await leadService.deleteLead(id)



    res.status(200).json({
      success: true,
      message: 'Lead deleted successfully',
      data: result,
    })
  } catch (error) {
    handleLeadControllerError(error, res, next)
  }
}

export async function assignLeadController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
      return
    }

    const id = leadIdSchema.parse(req.params.id)
    const input = assignLeadSchema.parse(req.body)

    const lead = await leadService.assignLead(
      id,
      input.ownerId,
      req.user.id,
      input.note,
    )

    res.status(200).json({
      success: true,
      message: 'Lead assignment updated successfully',
      data: { lead },
    })
  } catch (error) {
    handleLeadControllerError(error, res, next)
  }
}
export async function changeLeadStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
      return
    }

    const id = leadIdSchema.parse(req.params.id)
    const input = updateLeadStatusSchema.parse(req.body)

    const lead = await leadService.updateLeadStatus(id, input)

    res.status(200).json({
      success: true,
      message: 'Lead status updated successfully',
      data: { lead },
    })
  } catch (error) {
    handleLeadControllerError(error, res, next)
  }
}