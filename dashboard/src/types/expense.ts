export type FinancialTransactionType = 'INCOME' | 'EXPENSE';

export type TransactionPaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'UPI'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'CHEQUE'
  | 'OTHER';

export type TransactionStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED';

export interface FinancialTransaction {
  id: number;
  type: FinancialTransactionType;
  title: string;
  amount: number | string;
  category: string;
  paymentMethod: TransactionPaymentMethod;
  status: TransactionStatus;
  reference?: string | null;
  transactionDate: string;
  description?: string | null;
  createdById?: number | null;
  customerId?: number | null;
  dealId?: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: number;
    name: string;
    email: string;
  } | null;
  customer?: {
    id: number;
    company?: { id?: number; name?: string } | null;
    primaryContact?: { id?: number; fullName?: string } | null;
  } | null;
  deal?: {
    id: number;
    name: string;
  } | null;
}

export interface ExpenseSummaryStats {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  pendingIncome: number;
  pendingExpense: number;
  incomeCount: number;
  expenseCount: number;
  totalTransactions: number;
}

export interface MonthlyTimelinePoint {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface CategoryBreakdownItem {
  category: string;
  type: string;
  total: number;
  count: number;
}

export interface ExpenseSummaryData {
  timeline: MonthlyTimelinePoint[];
  categoryBreakdown: CategoryBreakdownItem[];
  recentTransactions: FinancialTransaction[];
}

export interface ExpenseOptions {
  incomeCategories: string[];
  expenseCategories: string[];
  paymentMethods: { id: TransactionPaymentMethod; label: string }[];
  statuses: { id: TransactionStatus; label: string }[];
  customers: { id: number; label: string }[];
  deals: { id: number; label: string }[];
}

export interface ExpenseListResponse {
  transactions: FinancialTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: ExpenseSummaryStats;
}

export interface ExpenseFilters {
  page?: number;
  limit?: number;
  type?: FinancialTransactionType;
  category?: string;
  status?: TransactionStatus;
  paymentMethod?: TransactionPaymentMethod;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: 'transactionDate' | 'amount' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateExpensePayload {
  type: FinancialTransactionType;
  title: string;
  amount: number;
  category: string;
  paymentMethod?: TransactionPaymentMethod;
  status?: TransactionStatus;
  reference?: string | null;
  transactionDate?: string;
  description?: string | null;
  customerId?: number | null;
  dealId?: number | null;
}

export type UpdateExpensePayload = Partial<CreateExpensePayload>;
