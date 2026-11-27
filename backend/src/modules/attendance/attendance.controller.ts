import type { Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import * as attendanceService from './attendance.service.js'
import { AttendanceServiceError } from './attendance.service.js'
import {
  bulkAttendanceSchema,
  createAttendanceSchema,
  updateAttendanceSchema,
  listAttendanceSchema,
  attendanceIdSchema,
} from './attendance.validation.js'

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

  if (error instanceof AttendanceServiceError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    })
    return
  }

  next(error)
}

export async function listAttendanceController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = listAttendanceSchema.parse(req.query)
    const viewer = req.user
      ? { id: req.user.id, role: req.user.role, permissions: req.user.permissions }
      : undefined
    const result = await attendanceService.listAttendance(input, viewer)

    res.status(200).json({
      success: true,
      data: {
        records: result.records,
        pagination: result.pagination,
        summary: result.summary,
      },
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getAttendanceOptionsController(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const options = await attendanceService.getAttendanceOptions()
    res.status(200).json({
      success: true,
      data: options,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getAttendanceByIdController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = attendanceIdSchema.parse(req.params.id)
    const record = await attendanceService.getAttendanceById(id)

    res.status(200).json({
      success: true,
      data: record,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function saveBulkAttendanceController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = bulkAttendanceSchema.parse(req.body)
    const result = await attendanceService.saveBulkAttendance(input, req.user?.id)

    res.status(200).json({
      success: true,
      message: 'Attendance register saved successfully',
      data: result,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function createAttendanceController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createAttendanceSchema.parse(req.body)
    const record = await attendanceService.createAttendance(input, req.user?.id)

    res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: record,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function updateAttendanceController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = attendanceIdSchema.parse(req.params.id)
    const input = updateAttendanceSchema.parse(req.body)
    const record = await attendanceService.updateAttendance(id, input, req.user?.id)

    res.status(200).json({
      success: true,
      message: 'Attendance updated successfully',
      data: record,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function deleteAttendanceController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = attendanceIdSchema.parse(req.params.id)
    const result = await attendanceService.deleteAttendance(id, req.user?.id)

    res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully',
      data: result,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}
