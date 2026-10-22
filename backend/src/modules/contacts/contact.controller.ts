
import type { Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import * as contactService from './contact.service.js'
import { ContactServiceError } from './contact.service.js'
import {
  createContactSchema,
  listContactsSchema,
  updateContactSchema,
  contactIdSchema,
} from './contact.validation.js'

function handleContactControllerError(
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

  if (error instanceof ContactServiceError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    })
    return
  }

  next(error)
}

export async function createContact(
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

    const input = createContactSchema.parse(req.body)
    const contact = await contactService.createContact(input)

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: { contact },
    })
  } catch (error) {
    handleContactControllerError(error, res, next)
  }
}

export async function listContacts(
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

    const query = listContactsSchema.parse(req.query)
    const result = await contactService.getContacts(query)

    res.status(200).json({
      success: true,
      message: 'Contacts retrieved successfully',
      data: result,
    })
  } catch (error) {
    handleContactControllerError(error, res, next)
  }
}

export async function getContact(
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

    const id = contactIdSchema.parse(req.params.id)
    const contact = await contactService.getContactById(id)

    res.status(200).json({
      success: true,
      message: 'Contact retrieved successfully',
      data: { contact },
    })
  } catch (error) {
    handleContactControllerError(error, res, next)
  }
}

export async function editContact(
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

    const id = contactIdSchema.parse(req.params.id)
    const input = updateContactSchema.parse(req.body)
    const contact = await contactService.updateContact(id, input)

    res.status(200).json({
      success: true,
      message: 'Contact updated successfully',
      data: { contact },
    })
  } catch (error) {
    handleContactControllerError(error, res, next)
  }
}

export async function removeContact(
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

    const id = contactIdSchema.parse(req.params.id)
    const result = await contactService.deleteContact(id)

    res.status(200).json({
      success: true,
      message: 'Contact deleted successfully',
      data: result,
    })
  } catch (error) {
    handleContactControllerError(error, res, next)
  }
}
