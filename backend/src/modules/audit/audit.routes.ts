import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import { listAuditLogsController } from './audit.controller.js'

const router = Router()

router.use(authenticateToken)
router.get('/', listAuditLogsController)

export default router
