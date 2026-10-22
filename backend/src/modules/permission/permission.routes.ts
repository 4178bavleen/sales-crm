
import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requirePermission } from '../permission/permission.middleware.js'
import {
  listRoles,
  listPermissions,
  getRolePermissions,
  updateRolePermissions,
} from './permission.controller.js'

import { getMyPermissions } from './permission.controller.js'

const router = Router()

router.use(authenticateToken)

router.get(
  '/roles',
  requirePermission('permissions.view'),
  listRoles,
)

router.get(
  '/permissions',
  requirePermission('permissions.view'),
  listPermissions,
)

router.get(
  '/roles/:roleId/permissions',
  requirePermission('permissions.view'),
  getRolePermissions,
)

router.put(
  '/roles/:roleId/permissions',
  requirePermission('permissions.manage'),
  updateRolePermissions,
)
router.get('/me', getMyPermissions)

export default router