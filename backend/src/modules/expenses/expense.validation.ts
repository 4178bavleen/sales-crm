import { z } from 'zod'

export const createExpenseSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(255),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  category: z.string().trim().min(1, 'Category is required').max(100),
  paymentMethod: z
    .enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'CHEQUE', 'OTHER'])
    .default('BANK_TRANSFER'),
  status: z.enum(['COMPLETED', 'PENDING', 'CANCELLED']).default('COMPLETED'),
  reference: z.string().trim().max(100).nullable().optional(),
  transactionDate: z.string().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  customerId: z.coerce.number().int().positive().nullable().optional(),
  dealId: z.coerce.number().int().positive().nullable().optional(),
})

export const updateExpenseSchema = z
  .object({
    type: z.enum(['INCOME', 'EXPENSE']).optional(),
    title: z.string().trim().min(2).max(255).optional(),
    amount: z.coerce.number().positive().optional(),
    category: z.string().trim().min(1).max(100).optional(),
    paymentMethod: z
      .enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'CHEQUE', 'OTHER'])
      .optional(),
    status: z.enum(['COMPLETED', 'PENDING', 'CANCELLED']).optional(),
    reference: z.string().trim().max(100).nullable().optional(),
    transactionDate: z.string().optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    customerId: z.coerce.number().int().positive().nullable().optional(),
    dealId: z.coerce.number().int().positive().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  })

export const listExpensesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  category: z.string().trim().optional(),
  status: z.enum(['COMPLETED', 'PENDING', 'CANCELLED']).optional(),
  paymentMethod: z
    .enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'CHEQUE', 'OTHER'])
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().trim().max(100).optional(),
  sortBy: z.enum(['transactionDate', 'amount', 'createdAt', 'title']).default('transactionDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const expenseIdSchema = z.coerce.number().int().positive('ID must be a positive integer')

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
export type ListExpensesInput = z.infer<typeof listExpensesSchema>
