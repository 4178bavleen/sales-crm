import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requireAdmin } from '../users/user.middleware.js'
import {
  getFacebookSettingsHandler,
  testFacebookConnectionHandler,
  updateFacebookSettingsHandler,
} from './facebook.controller.js'

const router = Router()

router.use(authenticateToken, requireAdmin)
router.get('/', getFacebookSettingsHandler)
router.put('/', updateFacebookSettingsHandler)
router.post('/test', testFacebookConnectionHandler)

export default router
