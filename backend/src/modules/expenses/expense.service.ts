import { prisma } from '../../config/database.js'
import { AppError } from '../../common/errors/AppErrors.js'
import { logAudit } from '../audit/audit.service.js'
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
  ListExpensesInput,
} from './expense.validation.js'

export class ExpenseServiceError extends AppError {
  constructor(message: string, statusCode = 400) {
    super(statusCode, message)
    this.name = 'ExpenseServiceError'
  }
}

/** Default suggested categories for financial tracking */
export const DEFAULT_INCOME_CATEGORIES = [
  'Client Payment',
  'Consulting & Services',
  'Software Subscription',
  'Retainer Fee',
  'Product Sale',
  'Investment & Funding',
  'Refund Received',
  'Other Income',
]

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Salaries & Payroll',
  'Office Rent & Facilities',
  'Software & Subscriptions',
  'Marketing & Advertising',
  'Hardware & Equipment',
  'Travel & Entertainment',
  'Utilities & Bills',
  'Legal & Professional Fees',
  'Vendor Payment',
  'Miscellaneous Expense',
]

export async function ensureExpensePermissions() {
  try {
    const expensePerms = [
      ['expenses.view', 'View financial transactions and expenses'],
      ['expenses.create', 'Create financial transactions and expenses'],
      ['expenses.edit', 'Edit financial transactions and expenses'],
      ['expenses.delete', 'Delete financial transactions and expenses'],
    ]

    for (const [code, description] of expensePerms) {
      await prisma.permission.upsert({
        where: { code },
        update: { description },
        create: { code, description },
      })
    }

    const rolesToAssign = await prisma.role.findMany({
      where: { name: { in: ['ADMIN', 'SALES_MANAGER'] } },
      select: { id: true },
    })

    const permissions = await prisma.permission.findMany({
      where: { code: { startsWith: 'expenses.' } },
      select: { id: true },
    })

    for (const role of rolesToAssign) {
      await prisma.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
        skipDuplicates: true,
      })
    }
  } catch (err) {
    console.error('[ExpenseService] Failed to ensure expense permissions:', err)
  }
}

export async function listExpenses(input: ListExpensesInput) {
  const page = Math.max(1, input.page || 1)
  const limit = Math.min(100, Math.max(1, input.limit || 20))
  const skip = (page - 1) * limit

  const where: any = {
    deletedAt: null,
  }

  if (input.type) {
    where.type = input.type
  }

  if (input.category && input.category.trim().length > 0) {
    where.category = { equals: input.category.trim(), mode: 'insensitive' }
  }

  if (input.status) {
    where.status = input.status
  }

  if (input.paymentMethod) {
    where.paymentMethod = input.paymentMethod
  }

  if (input.startDate || input.endDate) {
    where.transactionDate = {}
    if (input.startDate) {
      const dateStr = input.startDate.includes('T') ? input.startDate : `${input.startDate}T00:00:00.000Z`
      const start = new Date(dateStr)
      if (!isNaN(start.getTime())) {
        where.transactionDate.gte = start
      }
    }
    if (input.endDate) {
      const dateStr = input.endDate.includes('T') ? input.endDate : `${input.endDate}T23:59:59.999Z`
      const end = new Date(dateStr)
      if (!isNaN(end.getTime())) {
        where.transactionDate.lte = end
      }
    }
  }

  if (input.search && input.search.trim().length > 0) {
    const q = input.search.trim()
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { category: { contains: q, mode: 'insensitive' } },
      { reference: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ]
  }

  const orderBy: any = {}
  if (input.sortBy === 'amount') {
    orderBy.amount = input.sortOrder || 'desc'
  } else if (input.sortBy === 'title') {
    orderBy.title = input.sortOrder || 'asc'
  } else if (input.sortBy === 'createdAt') {
    orderBy.createdAt = input.sortOrder || 'desc'
  } else {
    orderBy.transactionDate = input.sortOrder || 'desc'
  }

  const [transactions, total, statsGroup] = await Promise.all([
    prisma.financialTransaction.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            company: { select: { id: true, name: true } },
            primaryContact: { select: { id: true, fullName: true } },
          },
        },
        deal: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.financialTransaction.count({ where }),
    prisma.financialTransaction.groupBy({
      by: ['type', 'status'],
      where: { deletedAt: null },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    }),
  ])

  let totalIncome = 0
  let totalExpense = 0
  let pendingIncome = 0
  let pendingExpense = 0
  let incomeCount = 0
  let expenseCount = 0

  for (const group of statsGroup) {
    const sum = Number(group._sum.amount ?? 0)
    const count = group._count.id

    if (group.type === 'INCOME') {
      if (group.status === 'COMPLETED') {
        totalIncome += sum
      } else if (group.status === 'PENDING') {
        pendingIncome += sum
      }
      incomeCount += count
    } else if (group.type === 'EXPENSE') {
      if (group.status === 'COMPLETED') {
        totalExpense += sum
      } else if (group.status === 'PENDING') {
        pendingExpense += sum
      }
      expenseCount += count
    }
  }

  const netBalance = totalIncome - totalExpense

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    summary: {
      totalIncome,
      totalExpense,
      netBalance,
      pendingIncome,
      pendingExpense,
      incomeCount,
      expenseCount,
      totalTransactions: incomeCount + expenseCount,
    },
  }
}

export async function getExpenseSummary() {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setDate(1) // Set day to 1st first to prevent month overflow
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const [allActive, recentTransactions] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: {
        deletedAt: null,
        transactionDate: { gte: sixMonthsAgo },
      },
      select: {
        type: true,
        amount: true,
        category: true,
        status: true,
        transactionDate: true,
      },
    }),
    prisma.financialTransaction.findMany({
      where: { deletedAt: null },
      orderBy: { transactionDate: 'desc' },
      take: 5,
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    }),
  ])

  // Monthly timeline aggregation
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthlyMap: Record<string, { month: string; income: number; expense: number; net: number }> = {}

  // Initialize last 6 months in chronological order safely
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(1) // Set day to 1st first so setMonth never overflows on 28/29/30/31
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`
    monthlyMap[key] = { month: label, income: 0, expense: 0, net: 0 }
  }

  const categoryBreakdown: Record<string, { category: string; type: string; total: number; count: number }> = {}

  for (const item of allActive) {
    const date = new Date(item.transactionDate)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const amt = Number(item.amount)

    if (item.status === 'COMPLETED') {
      if (monthlyMap[key]) {
        if (item.type === 'INCOME') {
          monthlyMap[key].income += amt
          monthlyMap[key].net += amt
        } else {
          monthlyMap[key].expense += amt
          monthlyMap[key].net -= amt
        }
      }

      const catKey = `${item.type}:${item.category}`
      if (!categoryBreakdown[catKey]) {
        categoryBreakdown[catKey] = {
          category: item.category,
          type: item.type,
          total: 0,
          count: 0,
        }
      }
      categoryBreakdown[catKey].total += amt
      categoryBreakdown[catKey].count += 1
    }
  }

  const timeline = Object.values(monthlyMap)
  const categoryStats = Object.values(categoryBreakdown).sort((a, b) => b.total - a.total)

  return {
    timeline,
    categoryBreakdown: categoryStats,
    recentTransactions,
  }
}

export async function getExpenseById(id: number) {
  const transaction = await prisma.financialTransaction.findFirst({
    where: { id, deletedAt: null },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      customer: {
        select: {
          id: true,
          company: { select: { id: true, name: true } },
          primaryContact: { select: { id: true, fullName: true } },
        },
      },
      deal: {
        select: { id: true, name: true },
      },
    },
  })

  if (!transaction) {
    throw new ExpenseServiceError('Financial transaction not found', 404)
  }

  return transaction
}

export async function createExpense(input: CreateExpenseInput, userId?: number) {
  let transactionDate = new Date()
  if (input.transactionDate) {
    const parsed = new Date(input.transactionDate)
    if (!isNaN(parsed.getTime())) {
      transactionDate = parsed
    }
  }

  if (input.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, deletedAt: null },
    })
    if (!customer) {
      throw new ExpenseServiceError('Selected customer does not exist', 400)
    }
  }

  if (input.dealId) {
    const deal = await prisma.deal.findFirst({
      where: { id: input.dealId, deletedAt: null },
    })
    if (!deal) {
      throw new ExpenseServiceError('Selected deal does not exist', 400)
    }
  }

  const created = await prisma.financialTransaction.create({
    data: {
      type: input.type,
      title: input.title.trim(),
      amount: input.amount,
      category: input.category.trim(),
      paymentMethod: input.paymentMethod,
      status: input.status,
      reference: input.reference?.trim() || null,
      transactionDate,
      description: input.description?.trim() || null,
      createdById: userId ?? null,
      customerId: input.customerId ?? null,
      dealId: input.dealId ?? null,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      customer: {
        select: {
          id: true,
          company: { select: { name: true } },
          primaryContact: { select: { fullName: true } },
        },
      },
      deal: { select: { id: true, name: true } },
    },
  })

  void logAudit({
    actorId: userId,
    action: 'CREATE_EXPENSE_TRANSACTION',
    entityType: 'FINANCIAL_TRANSACTION',
    entityId: created.id,
    after: {
      type: created.type,
      title: created.title,
      amount: Number(created.amount),
      category: created.category,
      status: created.status,
    },
  })

  return created
}

export async function updateExpense(id: number, input: UpdateExpenseInput, userId?: number) {
  const existing = await prisma.financialTransaction.findFirst({
    where: { id, deletedAt: null },
  })

  if (!existing) {
    throw new ExpenseServiceError('Financial transaction not found', 404)
  }

  if (input.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, deletedAt: null },
    })
    if (!customer) {
      throw new ExpenseServiceError('Selected customer does not exist', 400)
    }
  }

  if (input.dealId) {
    const deal = await prisma.deal.findFirst({
      where: { id: input.dealId, deletedAt: null },
    })
    if (!deal) {
      throw new ExpenseServiceError('Selected deal does not exist', 400)
    }
  }

  const dataToUpdate: any = {}

  if (input.type !== undefined) dataToUpdate.type = input.type
  if (input.title !== undefined) dataToUpdate.title = input.title.trim()
  if (input.amount !== undefined) dataToUpdate.amount = input.amount
  if (input.category !== undefined) dataToUpdate.category = input.category.trim()
  if (input.paymentMethod !== undefined) dataToUpdate.paymentMethod = input.paymentMethod
  if (input.status !== undefined) dataToUpdate.status = input.status
  if (input.reference !== undefined) dataToUpdate.reference = input.reference?.trim() || null
  if (input.description !== undefined) dataToUpdate.description = input.description?.trim() || null
  if (input.customerId !== undefined) dataToUpdate.customerId = input.customerId ?? null
  if (input.dealId !== undefined) dataToUpdate.dealId = input.dealId ?? null

  if (input.transactionDate !== undefined) {
    const parsed = new Date(input.transactionDate)
    if (!isNaN(parsed.getTime())) {
      dataToUpdate.transactionDate = parsed
    }
  }

  const updated = await prisma.financialTransaction.update({
    where: { id },
    data: dataToUpdate,
    include: {
      createdBy: { select: { id: true, name: true } },
      customer: {
        select: {
          id: true,
          company: { select: { name: true } },
          primaryContact: { select: { fullName: true } },
        },
      },
      deal: { select: { id: true, name: true } },
    },
  })

  void logAudit({
    actorId: userId,
    action: 'UPDATE_EXPENSE_TRANSACTION',
    entityType: 'FINANCIAL_TRANSACTION',
    entityId: updated.id,
    before: {
      type: existing.type,
      title: existing.title,
      amount: Number(existing.amount),
      category: existing.category,
      status: existing.status,
    },
    after: {
      type: updated.type,
      title: updated.title,
      amount: Number(updated.amount),
      category: updated.category,
      status: updated.status,
    },
  })

  return updated
}

export async function deleteExpense(id: number, userId?: number) {
  const existing = await prisma.financialTransaction.findFirst({
    where: { id, deletedAt: null },
  })

  if (!existing) {
    throw new ExpenseServiceError('Financial transaction not found', 404)
  }

  await prisma.financialTransaction.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  void logAudit({
    actorId: userId,
    action: 'DELETE_EXPENSE_TRANSACTION',
    entityType: 'FINANCIAL_TRANSACTION',
    entityId: id,
    before: {
      type: existing.type,
      title: existing.title,
      amount: Number(existing.amount),
    },
  })

  return { success: true, message: 'Transaction deleted successfully' }
}

export async function getExpenseOptions() {
  const [customers, deals, recordedCategories] = await Promise.all([
    prisma.customer.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        company: { select: { id: true, name: true } },
        primaryContact: { select: { id: true, fullName: true } },
      },
      orderBy: { id: 'desc' },
      take: 100,
    }),
    prisma.deal.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        status: true,
      },
      orderBy: { id: 'desc' },
      take: 100,
    }),
    prisma.financialTransaction.findMany({
      where: { deletedAt: null },
      select: { category: true, type: true },
      distinct: ['category', 'type'],
    }),
  ])

  const recordedIncomeCats = recordedCategories
    .filter((c) => c.type === 'INCOME')
    .map((c) => c.category)
  const recordedExpenseCats = recordedCategories
    .filter((c) => c.type === 'EXPENSE')
    .map((c) => c.category)

  const incomeCategories = Array.from(
    new Set([...DEFAULT_INCOME_CATEGORIES, ...recordedIncomeCats])
  )
  const expenseCategories = Array.from(
    new Set([...DEFAULT_EXPENSE_CATEGORIES, ...recordedExpenseCats])
  )

  return {
    incomeCategories,
    expenseCategories,
    paymentMethods: [
      { id: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT / IMPS' },
      { id: 'UPI', label: 'UPI / Google Pay / PhonePe' },
      { id: 'CASH', label: 'Cash' },
      { id: 'CREDIT_CARD', label: 'Credit Card' },
      { id: 'DEBIT_CARD', label: 'Debit Card' },
      { id: 'CHEQUE', label: 'Cheque' },
      { id: 'OTHER', label: 'Other' },
    ],
    statuses: [
      { id: 'COMPLETED', label: 'Completed' },
      { id: 'PENDING', label: 'Pending' },
      { id: 'CANCELLED', label: 'Cancelled' },
    ],
    customers: customers.map((c) => ({
      id: c.id,
      label: c.company?.name || c.primaryContact?.fullName || `Customer #${c.id}`,
    })),
    deals: deals.map((d) => ({
      id: d.id,
      label: `${d.name} (${d.status})`,
    })),
  }
}
