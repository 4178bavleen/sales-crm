import type { Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import * as productService from './products-services.service.js'
import { ProductServiceError } from './products-services.service.js'
import {
  createProductServiceSchema,
  updateProductServiceSchema,
  listProductServicesSchema,
  productServiceIdSchema,
} from './products-services.validation.js'

function handleError(
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

  if (error instanceof ProductServiceError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    })
    return
  }

  next(error)
}

export async function createProductService(
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

    const input = createProductServiceSchema.parse(req.body)
    const item = await productService.createProductService(input)

    res.status(201).json({
      success: true,
      message: 'Product or service created successfully',
      data: { productService: item },
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function listProductServices(
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

    const query = listProductServicesSchema.parse(req.query)
    const result = await productService.getProductServices(query)

    res.status(200).json({
      success: true,
      message: 'Products and services retrieved successfully',
      data: result,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getProductService(
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

    const id = productServiceIdSchema.parse(req.params.id)
    const item = await productService.getProductServiceById(id)

    res.status(200).json({
      success: true,
      message: 'Product or service retrieved successfully',
      data: { productService: item },
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function editProductService(
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

    const id = productServiceIdSchema.parse(req.params.id)
    const input = updateProductServiceSchema.parse(req.body)
    const item = await productService.updateProductService(id, input)

    res.status(200).json({
      success: true,
      message: 'Product or service updated successfully',
      data: { productService: item },
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function removeProductService(
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

    const id = productServiceIdSchema.parse(req.params.id)
    const result = await productService.deleteProductService(id)

    res.status(200).json({
      success: true,
      message: 'Product or service deleted successfully',
      data: result,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}