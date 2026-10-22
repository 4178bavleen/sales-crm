import type { NextFunction, Request, Response } from 'express'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import {
  createTask,
  deleteTask,
  getTaskById,
  getTaskOptions,
  listTasks,
  TaskServiceError,
  updateTask,
  updateTaskStatus,
} from './task.service.js'
import {
  parseId,
  parseTaskInput,
  parseTaskStatus,
  TaskValidationError,
} from './task.validation.js'

function actorId(req: AuthenticatedRequest): number {
  if (!req.user?.id) {
    throw new TaskServiceError('Authentication required', 401)
  }

  return Number(req.user.id)
}

function handleError(
  error: unknown,
  res: Response,
  next: NextFunction,
) {
  if (error instanceof TaskValidationError) {
    res.status(400).json({ success: false, message: error.message })
    return
  }

  if (error instanceof TaskServiceError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    })
    return
  }

  next(error)
}

export async function createTaskController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const task = await createTask(
      parseTaskInput(req.body as Record<string, unknown>),
      actorId(req),
    )

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function listTasksController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const query = req.query

    const result = await listTasks({
      page: query.page ? parseId(query.page, 'page') : 1,
      limit: query.limit ? parseId(query.limit, 'limit') : 20,
      status: query.status
        ? parseTaskStatus(query.status)
        : undefined,
      priority: query.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | undefined,
      assignedToId: query.assignedToId
        ? parseId(query.assignedToId, 'assignedToId')
        : undefined,
      dueFrom: query.dueFrom
        ? new Date(String(query.dueFrom))
        : undefined,
      dueTo: query.dueTo
        ? new Date(String(query.dueTo))
        : undefined,
    })

    res.json({ success: true, data: result })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getTaskController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const task = await getTaskById(parseId(req.params.id))

    res.json({ success: true, data: task })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function updateTaskController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = parseTaskInput(
      req.body as Record<string, unknown>,
      true,
    )

    if (Object.keys(data).length === 0) {
      res.status(400).json({
        success: false,
        message: 'Provide at least one field to update',
      })
      return
    }

    const task = await updateTask(parseId(req.params.id), data)

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function updateTaskStatusController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const status = parseTaskStatus(req.body.status)

    if (
      req.body.completionNote !== undefined &&
      typeof req.body.completionNote !== 'string'
    ) {
      throw new TaskValidationError('completionNote must be a string')
    }

    const cancelReason =
      typeof req.body.cancelReason === 'string'
        ? req.body.cancelReason.trim()
        : undefined

    const cancelReasonId = req.body.cancelReasonId
      ? parseId(req.body.cancelReasonId, 'cancelReasonId')
      : undefined

    const task = await updateTaskStatus(
      parseId(req.params.id),
      status,
      actorId(req),
      req.body.completionNote,
      cancelReason,
      cancelReasonId,
    )

    res.json({
      success: true,
      message: 'Task status updated successfully',
      data: task,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function deleteTaskController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await deleteTask(parseId(req.params.id))

    res.json({
      success: true,
      message: 'Task deleted successfully',
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getTaskOptionsController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const options = await getTaskOptions()
    res.json({
      success: true,
      data: options,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}
