import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requirePermission } from '../permission/permission.middleware.js'
import {
  exportReportController,
  getDealsReportController,
  getLeadsReportController,
  getOverviewReportController,
  getReportOptionsController,
  getRepPerformanceReportController,
} from './reports.controller.js'

const router = Router()

router.use(authenticateToken)

router.get('/options', requirePermission('reports.view'), getReportOptionsController)
router.get('/overview', requirePermission('reports.view'), getOverviewReportController)
router.get('/leads', requirePermission('reports.view'), getLeadsReportController)
router.get('/deals', requirePermission('reports.view'), getDealsReportController)
router.get('/performance', requirePermission('reports.view'), getRepPerformanceReportController)
router.get('/export', requirePermission('reports.view'), exportReportController)

export default router
