import type { NextFunction, Response } from 'express'
import { ZodError } from 'zod'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import * as meetingService from './meeting.service.js'
import { MeetingServiceError } from './meeting.service.js'
import {
  createMeetingSchema,
  listMeetingsQuerySchema,
  meetingIdSchema,
  updateMeetingSchema,
} from './meeting.validation.js'

function actorId(req: AuthenticatedRequest): number {
  if (!req.user?.id) {
    throw new MeetingServiceError('Authentication required', 401)
  }
  return Number(req.user.id)
}

function handleError(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof ZodError) {
    const errorDetails = error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join(', ')
    res.status(400).json({
      success: false,
      message: errorDetails ? `Validation failed: ${errorDetails}` : 'Validation failed',
      errors: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    })
    return
  }

  if (error instanceof MeetingServiceError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    })
    return
  }

  next(error)
}

export async function listMeetingsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const query = listMeetingsQuerySchema.parse(req.query)
    const result = await meetingService.listMeetings(query)
    res.status(200).json({
      success: true,
      message: 'Meetings retrieved successfully',
      data: result,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getMeetingController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = meetingIdSchema.parse(req.params.id)
    const meeting = await meetingService.getMeetingById(id)
    res.status(200).json({
      success: true,
      message: 'Meeting retrieved successfully',
      data: { meeting },
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function createMeetingController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = createMeetingSchema.parse(req.body)
    const meeting = await meetingService.createMeeting(input, actorId(req))
    res.status(201).json({
      success: true,
      message: 'Meeting scheduled successfully',
      data: { meeting },
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function updateMeetingController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = meetingIdSchema.parse(req.params.id)
    const input = updateMeetingSchema.parse(req.body)
    const meeting = await meetingService.updateMeeting(id, input)
    res.status(200).json({
      success: true,
      message: 'Meeting updated successfully',
      data: { meeting },
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function deleteMeetingController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = meetingIdSchema.parse(req.params.id)
    const result = await meetingService.deleteMeeting(id)
    res.status(200).json({
      success: true,
      message: 'Meeting deleted successfully',
      data: result,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getMeetingOptionsController(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const options = await meetingService.getMeetingOptions()
    res.status(200).json({
      success: true,
      data: options,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}
