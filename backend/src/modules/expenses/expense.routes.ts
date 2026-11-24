import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import { requirePermission } from '../permission/permission.middleware.js'
import {
  listExpensesController,
  getExpenseSummaryController,
  getExpenseOptionsController,
  getExpenseByIdController,
  createExpenseController,
  updateExpenseController,
  deleteExpenseController,
} from './expense.controller.js'
import { ensureExpensePermissions } from './expense.service.js'

// Automatically ensure expense permissions are seeded
void ensureExpensePermissions()

const router = Router()
router.use(authenticateToken)

router.get('/summary', requirePermission('expenses.view'), getExpenseSummaryController)
router.get('/options', requirePermission('expenses.view'), getExpenseOptionsController)
router.get('/:id', requirePermission('expenses.view'), getExpenseByIdController)
router.get('/', requirePermission('expenses.view'), listExpensesController)
router.post('/', requirePermission('expenses.create'), createExpenseController)
router.patch('/:id', requirePermission('expenses.edit'), updateExpenseController)
router.delete('/:id', requirePermission('expenses.delete'), deleteExpenseController)

export default router
