import { Router } from 'express'
import {
  createUser,
  listUsers,
  getUser,
  editUser,
  removeUser,
} from './user.controller.js'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requireAdmin } from './user.middleware.js'

const router = Router()

// All user-management routes require authentication and ADMIN access.
router.use(authenticateToken, requireAdmin)

router.post('/', createUser)
router.get('/', listUsers)
router.get('/:id', getUser)
router.patch('/:id', editUser)
router.delete('/:id', removeUser)

export default router