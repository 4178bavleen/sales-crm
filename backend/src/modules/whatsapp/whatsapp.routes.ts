import { Router } from 'express'
import {
  getWhatsAppSettingsHandler,
  updateWhatsAppSettingsHandler,
  sendTestWhatsAppHandler,
} from './whatsapp.controller.js'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requireAdmin } from '../users/user.middleware.js'

const router = Router()

// All WhatsApp settings routes require authentication and ADMIN access.
router.use(authenticateToken, requireAdmin)

router.get('/', getWhatsAppSettingsHandler)
router.put('/', updateWhatsAppSettingsHandler)
router.post('/test', sendTestWhatsAppHandler)

export default router
