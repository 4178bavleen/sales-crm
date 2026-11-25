import type { Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import * as expenseService from './expense.service.js'
import { ExpenseServiceError } from './expense.service.js'
import {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesSchema,
  expenseIdSchema,
} from './expense.validation.js'

function handleError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    })
    return
  }

  if (error instanceof ExpenseServiceError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    })
    return
  }

  next(error)
}

export async function listExpensesController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = listExpensesSchema.parse(req.query)
    const result = await expenseService.listExpenses(input)

    res.status(200).json({
      success: true,
      data: {
        transactions: result.transactions,
        pagination: result.pagination,
        summary: result.summary,
      },
    })
  } catch (err) {
    handleError(err, res, next)
  }
}

export async function getExpenseSummaryController(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const summary = await expenseService.getExpenseSummary()
    res.status(200).json({
      success: true,
      data: summary,
    })
  } catch (err) {
    handleError(err, res, next)
  }
}

export async function getExpenseOptionsController(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const options = await expenseService.getExpenseOptions()
    res.status(200).json({
      success: true,
      data: options,
    })
  } catch (err) {
    handleError(err, res, next)
  }
}

export async function getExpenseByIdController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = expenseIdSchema.parse(req.params.id)
    const transaction = await expenseService.getExpenseById(id)

    res.status(200).json({
      success: true,
      data: transaction,
    })
  } catch (err) {
    handleError(err, res, next)
  }
}

export async function createExpenseController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createExpenseSchema.parse(req.body)
    const created = await expenseService.createExpense(input, req.user?.id)

    res.status(201).json({
      success: true,
      message: input.type === 'INCOME' ? 'Income transaction recorded successfully' : 'Expense recorded successfully',
      data: created,
    })
  } catch (err) {
    handleError(err, res, next)
  }
}

export async function updateExpenseController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = expenseIdSchema.parse(req.params.id)
    const input = updateExpenseSchema.parse(req.body)
    const updated = await expenseService.updateExpense(id, input, req.user?.id)

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: updated,
    })
  } catch (err) {
    handleError(err, res, next)
  }
}

export async function deleteExpenseController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = expenseIdSchema.parse(req.params.id)
    const result = await expenseService.deleteExpense(id, req.user?.id)

    res.status(200).json({
      success: true,
      message: result.message,
    })
  } catch (err) {
    handleError(err, res, next)
  }
}
