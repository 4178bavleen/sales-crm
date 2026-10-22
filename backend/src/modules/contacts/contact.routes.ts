
import { Router } from 'express'
import {
  createContact,
  listContacts,
  getContact,
  editContact,
  removeContact,
} from './contact.controller.js'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requirePermission } from '../permission/permission.middleware.js'

const router = Router()

// All contact routes require authentication.
router.use(authenticateToken)

router.post('/', requirePermission('contacts.create'), createContact)
router.get('/', requirePermission('contacts.view'), listContacts)
router.get('/:id', requirePermission('contacts.view'), getContact)
router.patch('/:id', requirePermission('contacts.edit'), editContact)
router.delete('/:id', requirePermission('contacts.delete'), removeContact)

export default router
