import { request } from './api';
import { ENDPOINTS } from './endpoints';
import { getSession } from './auth';
import type {
  FinancialTransaction,
  ExpenseFilters,
  ExpenseListResponse,
  ExpenseSummaryData,
  ExpenseOptions,
  CreateExpensePayload,
  UpdateExpensePayload,
} from '../types/expense';

function getToken(): string | undefined {
  return getSession()?.token;
}

export async function fetchExpenses(filters: ExpenseFilters = {}): Promise<ExpenseListResponse> {
  const token = getToken();
  const query = new URLSearchParams();

  if (filters.page) query.set('page', String(filters.page));
  if (filters.limit) query.set('limit', String(filters.limit));
  if (filters.type) query.set('type', filters.type);
  if (filters.category) query.set('category', filters.category);
  if (filters.status) query.set('status', filters.status);
  if (filters.paymentMethod) query.set('paymentMethod', filters.paymentMethod);
  if (filters.startDate) query.set('startDate', filters.startDate);
  if (filters.endDate) query.set('endDate', filters.endDate);
  if (filters.search) query.set('search', filters.search);
  if (filters.sortBy) query.set('sortBy', filters.sortBy);
  if (filters.sortOrder) query.set('sortOrder', filters.sortOrder);

  const qs = query.toString();
  const url = `${ENDPOINTS.expenses.list}${qs ? `?${qs}` : ''}`;

  const res = await request<any>(url, { token });
  const data = res?.transactions !== undefined ? res : (res?.data || {});
  return {
    transactions: data.transactions || (Array.isArray(res) ? res : []),
    pagination: data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
    summary: data.summary || {
      totalIncome: 0,
      totalExpense: 0,
      netBalance: 0,
      pendingIncome: 0,
      pendingExpense: 0,
      incomeCount: 0,
      expenseCount: 0,
      totalTransactions: 0,
    },
  };
}

export async function fetchExpenseSummary(): Promise<ExpenseSummaryData> {
  const token = getToken();
  const res = await request<any>(ENDPOINTS.expenses.summary, { token });
  return (res?.timeline !== undefined ? res : res?.data) || {
    timeline: [],
    categoryBreakdown: [],
    recentTransactions: [],
  };
}

export async function fetchExpenseOptions(): Promise<ExpenseOptions> {
  const token = getToken();
  const res = await request<any>(ENDPOINTS.expenses.options, { token });
  return (res?.paymentMethods !== undefined ? res : res?.data) || {
    incomeCategories: [],
    expenseCategories: [],
    paymentMethods: [],
    statuses: [],
    customers: [],
    deals: [],
  };
}

export async function createExpense(payload: CreateExpensePayload): Promise<FinancialTransaction> {
  const token = getToken();
  const res = await request<any>(ENDPOINTS.expenses.create, {
    method: 'POST',
    token,
    body: payload,
  });
  return res?.data;
}

export async function updateExpense(
  id: number,
  payload: UpdateExpensePayload,
): Promise<FinancialTransaction> {
  const token = getToken();
  const res = await request<any>(ENDPOINTS.expenses.update(id), {
    method: 'PATCH',
    token,
    body: payload,
  });
  return res?.data;
}

export async function deleteExpense(id: number): Promise<void> {
  const token = getToken();
  await request<any>(ENDPOINTS.expenses.delete(id), {
    method: 'DELETE',
    token,
  });
}
