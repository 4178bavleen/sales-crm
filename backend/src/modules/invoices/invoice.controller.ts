import type { Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import * as invoiceService from './invoice.service.js'
import { InvoiceServiceError } from './invoice.service.js'
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  listInvoicesSchema,
  recordPaymentSchema,
  updateInvoiceSettingsSchema,
  sendInvoiceEmailSchema,
  sendInvoiceWhatsAppSchema,
} from './invoice.validation.js'

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

  if (error instanceof InvoiceServiceError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    })
    return
  }

  next(error)
}

function requireActorId(req: AuthenticatedRequest, res: Response): number | null {
  const userId = req.user?.id
  if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    })
    return null
  }
  return userId
}

export async function listInvoicesController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = listInvoicesSchema.parse(req.query)
    const result = await invoiceService.listInvoices(input)

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getInvoiceByIdController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10)
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ success: false, message: 'Invalid invoice ID' })
      return
    }

    const invoice = await invoiceService.getInvoiceById(id)
    res.status(200).json({
      success: true,
      data: invoice,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function createInvoiceController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = requireActorId(req, res)
    if (!userId) return

    const input = createInvoiceSchema.parse(req.body)
    const invoice = await invoiceService.createInvoice(input, userId)
    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function updateInvoiceController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = requireActorId(req, res)
    if (!userId) return

    const id = parseInt(String(req.params.id), 10)
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ success: false, message: 'Invalid invoice ID' })
      return
    }

    const input = updateInvoiceSchema.parse(req.body)
    const updated = await invoiceService.updateInvoice(id, input, userId)
    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: updated,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function deleteInvoiceController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = requireActorId(req, res)
    if (!userId) return

    const id = parseInt(String(req.params.id), 10)
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ success: false, message: 'Invalid invoice ID' })
      return
    }

    const result = await invoiceService.deleteInvoice(id, userId)
    res.status(200).json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function recordPaymentController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = requireActorId(req, res)
    if (!userId) return

    const id = parseInt(String(req.params.id), 10)
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ success: false, message: 'Invalid invoice ID' })
      return
    }

    const input = recordPaymentSchema.parse(req.body)
    const payment = await invoiceService.recordInvoicePayment(id, input, userId)
    res.status(201).json({
      success: true,
      message: 'Payment recorded and synced with finance successfully',
      data: payment,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getInvoiceSettingsController(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const settings = await invoiceService.getInvoiceSettings()
    res.status(200).json({
      success: true,
      data: settings,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function getNextInvoiceNumberController(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const invoiceNumber = await invoiceService.previewNextInvoiceNumber()
    res.status(200).json({
      success: true,
      data: { invoiceNumber },
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function updateInvoiceSettingsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = requireActorId(req, res)
    if (!userId) return

    const input = updateInvoiceSettingsSchema.parse(req.body)
    const settings = await invoiceService.updateInvoiceSettings(input, userId)
    res.status(200).json({
      success: true,
      message: 'Invoice settings updated successfully',
      data: settings,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function downloadInvoicePdfController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10)
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ success: false, message: 'Invalid invoice ID' })
      return
    }

    const { buffer, filename } = await invoiceService.generateInvoicePdf(id)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
    res.status(200).send(buffer)
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function sendInvoiceEmailController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10)
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ success: false, message: 'Invalid invoice ID' })
      return
    }

    const input = sendInvoiceEmailSchema.parse(req.body)
    const result = await invoiceService.sendInvoiceEmail(id, input)

    res.status(200).json({
      success: true,
      message: 'Invoice email dispatch processed',
      data: result,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}

export async function sendInvoiceWhatsAppController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10)
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ success: false, message: 'Invalid invoice ID' })
      return
    }

    const input = sendInvoiceWhatsAppSchema.parse(req.body)
    const result = await invoiceService.sendInvoiceWhatsApp(id, input)

    res.status(200).json({
      success: true,
      message: 'Invoice WhatsApp payload prepared',
      data: result,
    })
  } catch (error) {
    handleError(error, res, next)
  }
}
