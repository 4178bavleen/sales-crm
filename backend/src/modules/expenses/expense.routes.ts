import { Router } from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
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

router.get('/summary', getExpenseSummaryController)
router.get('/options', getExpenseOptionsController)
router.get('/:id', getExpenseByIdController)
router.get('/', listExpensesController)
router.post('/', createExpenseController)
router.patch('/:id', updateExpenseController)
router.delete('/:id', deleteExpenseController)

export default router
