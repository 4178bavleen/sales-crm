import { Router } from 'express'
import {
  getSettingsHandler,
  updateSettingsHandler,
  sendTestEmailHandler,
} from './email.controller.js'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requireAdmin } from '../users/user.middleware.js'

const router = Router()

// All email settings routes require authentication and ADMIN access.
router.use(authenticateToken, requireAdmin)

router.get('/', getSettingsHandler)
router.put('/', updateSettingsHandler)
router.post('/test', sendTestEmailHandler)

export default router
