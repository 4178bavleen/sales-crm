import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requireAdmin } from '../users/user.middleware.js'
import { listAuditLogsController } from './audit.controller.js'

const router = Router()

router.use(authenticateToken, requireAdmin)
router.get('/', listAuditLogsController)

export default router
