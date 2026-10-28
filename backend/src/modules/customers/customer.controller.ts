import type { Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import * as customerService from './customer.service.js'
import { CustomerServiceError } from './customer.service.js'
import {
  createCustomerSchema,
  listCustomersSchema,
  updateCustomerSchema,
  customerIdSchema,
} from './customer.validation.js'

function handleCustomerControllerError(
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

  if (error instanceof CustomerServiceError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    })
    return
  }

  next(error)
}

export async function createCustomer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createCustomerSchema.parse(req.body)
    const customer = await customerService.createCustomer(input)

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    })
  } catch (error) {
    handleCustomerControllerError(error, res, next)
  }
}

export async function listCustomers(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = listCustomersSchema.parse(req.query)
    const result = await customerService.listCustomers(query)

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    handleCustomerControllerError(error, res, next)
  }
}

export async function getCustomer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = customerIdSchema.parse(req.params.id)
    const customer = await customerService.getCustomerById(id)

    res.status(200).json({
      success: true,
      data: customer,
    })
  } catch (error) {
    handleCustomerControllerError(error, res, next)
  }
}

export async function updateCustomer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = customerIdSchema.parse(req.params.id)
    const input = updateCustomerSchema.parse(req.body)
    const updated = await customerService.updateCustomer(id, input)

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: updated,
    })
  } catch (error) {
    handleCustomerControllerError(error, res, next)
  }
}

export async function removeCustomer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = customerIdSchema.parse(req.params.id)
    const result = await customerService.deleteCustomer(id)

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
      data: result,
    })
  } catch (error) {
    handleCustomerControllerError(error, res, next)
  }
}

export async function getOptions(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const options = await customerService.getCustomerOptions()
    res.status(200).json({
      success: true,
      data: options,
    })
  } catch (error) {
    handleCustomerControllerError(error, res, next)
  }
}
