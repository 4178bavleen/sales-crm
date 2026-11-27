import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requireAdmin } from './user.middleware.js'
import {
  getUserDetailHandler,
  updateBankDetailsHandler,
  updateCompanyDetailsHandler,
  updatePersonalDetailsHandler,
  uploadEmployeeAvatarHandler,
  uploadEmployeeFile,
  uploadEmployeeIdCardHandler,
} from './user-detail.controller.js'

const router = Router()
router.use(authenticateToken, requireAdmin)

router.get('/:id/details', getUserDetailHandler)
router.put('/:id/details/personal', updatePersonalDetailsHandler)
router.put('/:id/details/bank', updateBankDetailsHandler)
router.put('/:id/details/company', updateCompanyDetailsHandler)
router.post('/:id/details/avatar', uploadEmployeeFile, uploadEmployeeAvatarHandler)
router.post('/:id/details/id-card', uploadEmployeeFile, uploadEmployeeIdCardHandler)

export default router
