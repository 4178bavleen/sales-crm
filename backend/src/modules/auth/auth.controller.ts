
import type { Request, Response, NextFunction } from 'express'
import * as authService from './auth.service.js'
import {  loginSchema } from './auth.validation.js'


export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = loginSchema.parse(req.body)
    const result = await authService.loginUser(input)

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // The authentication middleware will attach the verified user ID.
    const userId = (req as Request & { user?: { id: number } }).user?.id

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
      return
    }

    const user = await authService.getUserProfile(userId)

    res.status(200).json({
      success: true,
      data: { user },
    })
  } catch (error) {
    next(error)
  }
}
export function logout(_req: Request, res: Response): void {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  })
}