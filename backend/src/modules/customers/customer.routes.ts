import { Router } from 'express'
import {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  removeCustomer,
  getOptions,
} from './customer.controller.js'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requirePermission } from '../permission/permission.middleware.js'

const router = Router()

// All customer routes require authentication.
router.use(authenticateToken)

router.get('/options', getOptions)
router.post('/', requirePermission('deals.create'), createCustomer)
router.get('/', requirePermission('deals.view'), listCustomers)
router.get('/:id', requirePermission('deals.view'), getCustomer)
router.patch('/:id', requirePermission('deals.edit'), updateCustomer)
router.delete('/:id', requirePermission('deals.delete'), removeCustomer)

export default router
