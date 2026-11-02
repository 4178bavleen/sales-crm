import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import {
  listDocumentsController,
  getDocumentByIdController,
  createDocumentController,
  addDocumentVersionController,
  updateDocumentController,
  deleteDocumentController,
  downloadDocumentController,
  getDocumentOptionsController,
  uploadDocumentFile,
} from './document.controller.js'
import { ensureDocumentPermissions } from './document.service.js'

// Auto-seed document permissions on startup
void ensureDocumentPermissions()

const router = Router()
router.use(authenticateToken)

router.get('/options', getDocumentOptionsController)
router.get('/:id/download', downloadDocumentController)
router.get('/:id/versions/:versionNo/download', downloadDocumentController)
router.post('/:id/versions', uploadDocumentFile, addDocumentVersionController)
router.get('/', listDocumentsController)
router.get('/:id', getDocumentByIdController)
router.post('/', uploadDocumentFile, createDocumentController)
router.patch('/:id', updateDocumentController)
router.delete('/:id', deleteDocumentController)

export default router
