
import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requirePermission } from '../permission/permission.middleware.js'
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
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

router.post(
  '/roles',
  requirePermission('permissions.manage'),
  createRole,
)

router.patch(
  '/roles/:roleId',
  requirePermission('permissions.manage'),
  updateRole,
)

router.delete(
  '/roles/:roleId',
  requirePermission('permissions.manage'),
  deleteRole,
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