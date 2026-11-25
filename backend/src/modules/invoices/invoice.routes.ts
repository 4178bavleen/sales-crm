import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requirePermission } from '../permission/permission.middleware.js'
import {
  listInvoicesController,
  getInvoiceByIdController,
  createInvoiceController,
  updateInvoiceController,
  deleteInvoiceController,
  recordPaymentController,
  getInvoiceSettingsController,
  updateInvoiceSettingsController,
  getNextInvoiceNumberController,
  downloadInvoicePdfController,
  sendInvoiceEmailController,
  sendInvoiceWhatsAppController,
} from './invoice.controller.js'
import { ensureInvoicePermissions } from './invoice.service.js'

// Automatically ensure invoice permissions are seeded
void ensureInvoicePermissions()

const router = Router()
router.use(authenticateToken)

// Settings
router.get('/settings', requirePermission('invoices.settings'), getInvoiceSettingsController)
router.put('/settings', requirePermission('invoices.settings'), updateInvoiceSettingsController)

// Sequence helper (preview next invoice number)
router.get('/next-number', requirePermission('invoices.view'), getNextInvoiceNumberController)

// CRUD
router.get('/', requirePermission('invoices.view'), listInvoicesController)
router.post('/', requirePermission('invoices.create'), createInvoiceController)
router.get('/:id', requirePermission('invoices.view'), getInvoiceByIdController)
router.patch('/:id', requirePermission('invoices.edit'), updateInvoiceController)
router.delete('/:id', requirePermission('invoices.delete'), deleteInvoiceController)

// Payments
router.post('/:id/payments', requirePermission('invoices.edit'), recordPaymentController)

// PDF & Deliveries
router.get('/:id/pdf', requirePermission('invoices.view'), downloadInvoicePdfController)
router.post('/:id/email', requirePermission('invoices.edit'), sendInvoiceEmailController)
router.post('/:id/whatsapp', requirePermission('invoices.edit'), sendInvoiceWhatsAppController)

export default router
