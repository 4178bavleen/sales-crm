
import type { Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import * as userService from './user.service.js'
import { UserServiceError } from './user.service.js'
import {
  createUserSchema,
  listUsersSchema,
  updateUserSchema,
  userIdSchema,
} from './user.validation.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'

function handleUserControllerError(
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

  if (error instanceof UserServiceError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    })
    return
  }

  next(error)
}

export async function createUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createUserSchema.parse(req.body)
    const user = await userService.createUser(input)

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user },
    })
  } catch (error) {
    handleUserControllerError(error, res, next)
  }
}

export async function listUsers(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = listUsersSchema.parse(req.query)
    const result = await userService.getUsers(query)

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: result,
    })
  } catch (error) {
    handleUserControllerError(error, res, next)
  }
}

export async function getUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = userIdSchema.parse(req.params.id)
    const user = await userService.getUserById(id)

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: { user },
    })
  } catch (error) {
    handleUserControllerError(error, res, next)
  }
}

export async function editUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = userIdSchema.parse(req.params.id)
    const input = updateUserSchema.parse(req.body)
    const user = await userService.updateUser(id, input)

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user },
    })
  } catch (error) {
    handleUserControllerError(error, res, next)
  }
}

export async function removeUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = userIdSchema.parse(req.params.id)

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
      return
    }

    const result = await userService.deleteUser(id, req.user.id)

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: result,
    })
  } catch (error) {
    handleUserControllerError(error, res, next)
  }
}
