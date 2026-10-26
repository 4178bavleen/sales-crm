import { Router } from 'express'
import {
  createProductService,
  listProductServices,
  getProductService,
  editProductService,
  removeProductService,
} from './products-services.controller.js'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requirePermission } from '../permission/permission.middleware.js'

const router = Router()

router.use(authenticateToken)

router.post(
  '/',
  requirePermission('products_services.create'),
  createProductService,
)

router.get(
  '/',
  requirePermission('products_services.view'),
  listProductServices,
)

router.get(
  '/:id',
  requirePermission('products_services.view'),
  getProductService,
)

router.patch(
  '/:id',
  requirePermission('products_services.edit'),
  editProductService,
)

router.delete(
  '/:id',
  requirePermission('products_services.delete'),
  removeProductService,
)

export default router