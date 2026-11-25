import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requireAdmin } from '../users/user.middleware.js'
import {
  getFacebookSettingsHandler,
  testFacebookConnectionHandler,
  updateFacebookSettingsHandler,
} from './facebook.controller.js'
import {
  exchangeFacebookOAuthHandler,
  getFacebookOAuthUrlHandler,
  selectFacebookOAuthPageHandler,
} from './facebook-oauth.controller.js'

const router = Router()

router.use(authenticateToken, requireAdmin)
router.get('/', getFacebookSettingsHandler)
router.put('/', updateFacebookSettingsHandler)
router.post('/test', testFacebookConnectionHandler)
router.get('/oauth/url', getFacebookOAuthUrlHandler)
router.post('/oauth/exchange', exchangeFacebookOAuthHandler)
router.post('/oauth/select-page', selectFacebookOAuthPageHandler)

export default router
