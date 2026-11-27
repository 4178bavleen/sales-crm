import type { Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import * as leaveService from './leave.service.js'
import { LeaveServiceError } from './leave.service.js'
import {
  applyLeaveSchema,
  listLeavesQuerySchema,
  reviewLeaveSchema,
  leaveIdSchema,
} from './leave.validation.js'

function handleError(error: unknown, res: Response, next: NextFunction): void {
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

  if (error instanceof LeaveServiceError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    })
    return
  }

  next(error)
}

/**
 * GET /api/v1/leaves/my
 */
export async function getMyLeavesController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id
    const query = listLeavesQuerySchema.parse(req.query)
    const result = await leaveService.getMyLeaves(userId, query)

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

/**
 * GET /api/v1/leaves/my/stats
 */
export async function getMyLeaveStatsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id
    const year = req.query.year ? Number(req.query.year) : undefined
    const stats = await leaveService.getMyLeaveStats(userId, year)

    res.status(200).json({
      success: true,
      data: stats,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

/**
 * POST /api/v1/leaves/my
 */
export async function applyLeaveController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id
    const input = applyLeaveSchema.parse(req.body)
    const leave = await leaveService.applyLeave(userId, input)

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      data: { leave },
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

/**
 * POST /api/v1/leaves/my/:id/cancel
 */
export async function cancelMyLeaveController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id
    const leaveId = leaveIdSchema.parse(req.params.id)
    const result = await leaveService.cancelMyLeave(userId, leaveId)

    res.status(200).json({
      success: true,
      message: 'Leave application cancelled successfully',
      data: { leave: result },
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

/**
 * GET /api/v1/leaves
 * Admin / Manager endpoint to list all leave requests
 */
export async function getAllLeavesController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = listLeavesQuerySchema.parse(req.query)
    const result = await leaveService.getAllLeaves(query)

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

/**
 * PATCH /api/v1/leaves/:id/review
 * Admin / Manager endpoint to approve or reject a leave request
 */
export async function reviewLeaveController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminId = req.user!.id
    const leaveId = leaveIdSchema.parse(req.params.id)
    const input = reviewLeaveSchema.parse(req.body)
    const result = await leaveService.reviewLeave(adminId, leaveId, input)

    res.status(200).json({
      success: true,
      message: `Leave request has been ${result.status.toLowerCase()} successfully`,
      data: { leave: result },
    })
  } catch (error) {
    handleError(error, res, next)
  }
}
