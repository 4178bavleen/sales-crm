import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  CreditCard,
  Plus,
  Search,
  RotateCw,
  Edit2,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Building,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  Tag,
  FileSpreadsheet,
  Minus,
  PieChart,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import StatCard from "../../components/ui/StatCard";
import {
  fetchExpenses,
  fetchExpenseSummary,
  fetchExpenseOptions,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../../lib/expenses";
import type {
  FinancialTransaction,
  FinancialTransactionType,
  TransactionPaymentMethod,
  TransactionStatus,
  ExpenseSummaryStats,
  ExpenseSummaryData,
  ExpenseOptions,
  CreateExpensePayload,
} from "../../types/expense";

export default function Expenses() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [summaryStats, setSummaryStats] = useState<ExpenseSummaryStats>({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    pendingIncome: 0,
    pendingExpense: 0,
    incomeCount: 0,
    expenseCount: 0,
    totalTransactions: 0,
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<"ALL" | FinancialTransactionType>("ALL");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | TransactionStatus>("ALL");
  const [selectedMethod, setSelectedMethod] = useState<"ALL" | TransactionPaymentMethod>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Visual analytics view
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<ExpenseSummaryData | null>(null);
  const [analyticsChartType, setAnalyticsChartType] = useState<"area" | "bar">("area");
  const [analyticsCategoryFilter, setAnalyticsCategoryFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");

  const analyticsTotals = useMemo(() => {
    if (!analyticsData?.timeline || analyticsData.timeline.length === 0) {
      return { income: 0, expense: 0, net: 0, margin: 0 };
    }
    const income = analyticsData.timeline.reduce((acc, curr) => acc + curr.income, 0);
    const expense = analyticsData.timeline.reduce((acc, curr) => acc + curr.expense, 0);
    const net = income - expense;
    const margin = income > 0 ? Math.round((net / income) * 100) : 0;
    return { income, expense, net, margin };
  }, [analyticsData]);

  const filteredCategories = useMemo(() => {
    if (!analyticsData?.categoryBreakdown) return [];
    if (analyticsCategoryFilter === "ALL") return analyticsData.categoryBreakdown;
    return analyticsData.categoryBreakdown.filter((c) => c.type === analyticsCategoryFilter);
  }, [analyticsData, analyticsCategoryFilter]);

  const maxCategoryTotal = useMemo(() => {
    if (!filteredCategories || filteredCategories.length === 0) return 1;
    return Math.max(...filteredCategories.map((c) => c.total), 1);
  }, [filteredCategories]);

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [options, setOptions] = useState<ExpenseOptions>({
    incomeCategories: [],
    expenseCategories: [],
    paymentMethods: [],
    statuses: [],
    customers: [],
    deals: [],
  });

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinancialTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinancialTransaction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Form Fields
  const [formType, setFormType] = useState<FinancialTransactionType>("EXPENSE");
  const [formTitle, setFormTitle] = useState("");
  const [formAmount, setFormAmount] = useState<number | string>("");
  const [formCategory, setFormCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [formPaymentMethod, setFormPaymentMethod] = useState<TransactionPaymentMethod>("BANK_TRANSFER");
  const [formStatus, setFormStatus] = useState<TransactionStatus>("COMPLETED");
  const [formReference, setFormReference] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formCustomerId, setFormCustomerId] = useState<number | string>("");
  const [formDealId, setFormDealId] = useState<number | string>("");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetchExpenses({
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        type: selectedType === "ALL" ? undefined : selectedType,
        category: selectedCategory || undefined,
        status: selectedStatus === "ALL" ? undefined : selectedStatus,
        paymentMethod: selectedMethod === "ALL" ? undefined : selectedMethod,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy: "transactionDate",
        sortOrder: "desc",
      });

      setTransactions(res.transactions);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
      setSummaryStats(res.summary);
    } catch (err: any) {
      showToast(err?.message || "Failed to load financial records.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, search, selectedType, selectedCategory, selectedStatus, selectedMethod, startDate, endDate]);

  const loadOptions = useCallback(async () => {
    try {
      const data = await fetchExpenseOptions();
      setOptions(data);
    } catch (err) {
      console.error("Failed to load options:", err);
    }
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    const startTime = Date.now();
    try {
      await Promise.all([
        loadData(true),
        loadOptions(),
        showAnalytics ? loadAnalytics() : Promise.resolve(),
      ]);
    } finally {
      const elapsed = Date.now() - startTime;
      const minDuration = 600;
      if (elapsed < minDuration) {
        setTimeout(() => setRefreshing(false), minDuration - elapsed);
      } else {
        setRefreshing(false);
      }
    }
  };

  const loadAnalytics = useCallback(async () => {
    try {
      const data = await fetchExpenseSummary();
      setAnalyticsData(data);
    } catch (err) {
      console.error("Failed to load summary analytics:", err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    if (showAnalytics && !analyticsData) {
      loadAnalytics();
    }
  }, [showAnalytics, analyticsData, loadAnalytics]);

  const openCreateModal = (type: FinancialTransactionType = "EXPENSE") => {
    setEditingItem(null);
    setFormType(type);
    setFormTitle("");
    setFormAmount("");
    setFormCategory("");
    setIsCustomCategory(false);
    setFormPaymentMethod("BANK_TRANSFER");
    setFormStatus("COMPLETED");
    setFormReference("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormCustomerId("");
    setFormDealId("");
    setFormDescription("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: FinancialTransaction) => {
    setEditingItem(item);
    setFormType(item.type);
    setFormTitle(item.title);
    setFormAmount(item.amount);
    setFormCategory(item.category);
    setIsCustomCategory(false);
    setFormPaymentMethod(item.paymentMethod);
    setFormStatus(item.status);
    setFormReference(item.reference || "");
    setFormDate(item.transactionDate ? item.transactionDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setFormCustomerId(item.customerId || "");
    setFormDealId(item.dealId || "");
    setFormDescription(item.description || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amt = Number(formAmount);
    if (!formTitle.trim()) {
      setFormError("Transaction title is required.");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setFormError("Amount must be a valid positive number.");
      return;
    }
    if (!formCategory.trim()) {
      setFormError("Category is required.");
      return;
    }

    try {
      setSubmitting(true);
      const payload: CreateExpensePayload = {
        type: formType,
        title: formTitle.trim(),
        amount: amt,
        category: formCategory.trim(),
        paymentMethod: formPaymentMethod,
        status: formStatus,
        reference: formReference.trim() || null,
        transactionDate: formDate || new Date().toISOString(),
        customerId: formCustomerId ? Number(formCustomerId) : null,
        dealId: formDealId ? Number(formDealId) : null,
        description: formDescription.trim() || null,
      };

      if (editingItem) {
        await updateExpense(editingItem.id, payload);
        showToast("Transaction updated successfully!");
      } else {
        await createExpense(payload);
        showToast(
          formType === "INCOME"
            ? "Money received recorded successfully!"
            : "Expense recorded successfully!"
        );
      }

      setIsModalOpen(false);
      loadData(true);
      if (showAnalytics) loadAnalytics();
    } catch (err: any) {
      setFormError(err?.message || "Failed to save transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteExpense(deleteTarget.id);
      showToast("Transaction deleted successfully.");
      setDeleteTarget(null);
      loadData(true);
      if (showAnalytics) loadAnalytics();
    } catch (err: any) {
      showToast(err?.message || "Failed to delete transaction.", "error");
    }
  };

  const handleExportExcel = async () => {
    if (totalCount === 0) {
      showToast("No transactions available to export.", "error");
      return;
    }

    try {
      setExporting(true);
      // Fetch all matching records across pages for complete export
      const allRes = await fetchExpenses({
        page: 1,
        limit: Math.min(Math.max(totalCount, 100), 5000),
        search: search.trim() || undefined,
        type: selectedType === "ALL" ? undefined : selectedType,
        category: selectedCategory || undefined,
        status: selectedStatus === "ALL" ? undefined : selectedStatus,
        paymentMethod: selectedMethod === "ALL" ? undefined : selectedMethod,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy: "transactionDate",
        sortOrder: "desc",
      });

      const exportList = allRes.transactions || [];
      if (exportList.length === 0) {
        showToast("No transactions found matching your filters.", "error");
        return;
      }

      const rows = exportList.map((t) => ({
        "Transaction ID": t.id,
        "Nature / Type": t.type === "INCOME" ? "Money Received (Income)" : "Money Spent (Expense)",
        "Title": t.title,
        "Amount (₹)": Number(t.amount),
        "Category": t.category,
        "Payment Method": t.paymentMethod.replace(/_/g, " "),
        "Status": t.status,
        "Transaction Date": t.transactionDate ? t.transactionDate.slice(0, 10) : "",
        "Reference #": t.reference || "",
        "Linked Customer": t.customer?.company?.name || t.customer?.primaryContact?.fullName || "",
        "Linked Deal": t.deal?.name || "",
        "Notes / Description": t.description || "",
        "Logged By": t.createdBy?.name || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Financial Transactions");

      // Auto-fit column widths
      const columnWidths = Object.keys(rows[0] || {}).map((key) => {
        const maxValLen = Math.max(
          ...rows.map((r) => String((r as any)[key] ?? "").length),
          key.length
        );
        return { wch: Math.min(Math.max(maxValLen + 2, 12), 40) };
      });
      worksheet["!cols"] = columnWidths;

      XLSX.writeFile(
        workbook,
        `Financial_Transactions_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      showToast(`Exported ${exportList.length} records to Excel!`);
    } catch (err: any) {
      showToast(err?.message || "Failed to export Excel spreadsheet.", "error");
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const availableCategories = useMemo(() => {
    return formType === "INCOME"
      ? options.incomeCategories
      : options.expenseCategories;
  }, [formType, options]);

  const filterCategoryOptions = useMemo(() => {
    if (selectedType === "INCOME") return options.incomeCategories;
    if (selectedType === "EXPENSE") return options.expenseCategories;
    return Array.from(new Set([...options.incomeCategories, ...options.expenseCategories]));
  }, [selectedType, options]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all border ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Expense Management
            </h1>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
              Finance
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Track money received, monitor expenses spent, and manage overall organizational cashflow.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              showAnalytics
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <BarChart2 size={15} />
            <span>{showAnalytics ? "Hide Analytics" : "View Cashflow Analytics"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer disabled:opacity-60"
          >
            {exporting ? (
              <RotateCw size={15} className="animate-spin text-blue-600" />
            ) : (
              <Download size={15} />
            )}
            <span>{exporting ? "Exporting..." : "Export Excel (.xlsx)"}</span>
          </button>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-75"
            title="Refresh transactions"
          >
            <RotateCw
              size={16}
              className={`transition-all duration-500 ${
                refreshing ? "animate-spin text-blue-600" : "hover:rotate-90 text-slate-600"
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => openCreateModal("INCOME")}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer"
          >
            <Plus size={15} />
            <span> Money Received</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateModal("EXPENSE")}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition cursor-pointer"
          >
            <Minus size={15} />
            <span> Money Spent</span>
          </button>
        </div>
      </div>

      {/* Top 4 Financial Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Money Received (Income)"
          value={formatCurrency(summaryStats.totalIncome)}
          color="emerald"
          icon={TrendingUp}
          subtext={
            <span className="flex items-center gap-1.5 text-xs text-emerald-700">
              <span className="font-semibold">{summaryStats.incomeCount} completed inflows</span>
              {summaryStats.pendingIncome > 0 && (
                <span className="text-amber-600">({formatCurrency(summaryStats.pendingIncome)} pending)</span>
              )}
            </span>
          }
        />

        <StatCard
          label="Total Money Spent (Expenses)"
          value={formatCurrency(summaryStats.totalExpense)}
          color="rose"
          icon={TrendingDown}
          subtext={
            <span className="flex items-center gap-1.5 text-xs text-rose-700">
              <span className="font-semibold">{summaryStats.expenseCount} outflow payments</span>
              {summaryStats.pendingExpense > 0 && (
                <span className="text-amber-600">({formatCurrency(summaryStats.pendingExpense)} pending)</span>
              )}
            </span>
          }
        />

        <StatCard
          label="Net Cashflow / Balance"
          value={formatCurrency(summaryStats.netBalance)}
          color={summaryStats.netBalance >= 0 ? "blue" : "amber"}
          icon={Scale}
          subtext={
            <span className={`text-xs font-semibold ${summaryStats.netBalance >= 0 ? "text-blue-700" : "text-amber-700"}`}>
              {summaryStats.netBalance >= 0 ? "Operating Surplus" : "Operating Deficit"}
            </span>
          }
        />

        <StatCard
          label="Financial Transactions"
          value={summaryStats.totalTransactions}
          color="sky"
          icon={CreditCard}
          subtext={
            <span className="text-xs text-slate-500">
              {summaryStats.incomeCount} Income • {summaryStats.expenseCount} Expenses
            </span>
          }
        />
      </div>

      {/* Analytics Visualization Panel (Collapsible) */}
      {showAnalytics && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 md:p-6 shadow-sm space-y-5">
          {/* Analytics Header Strip */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <BarChart2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Cashflow & Financial Velocity
                  </h3>
                  <p className="text-xs text-slate-500">
                    Rolling 6-month comparison of inbound revenue vs operating expenditures.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick 6-Month Metrics & View Toggle */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs">
                <span className="text-slate-400">6-Mo Inflow:</span>
                <span className="font-bold text-emerald-600">+{formatCurrency(analyticsTotals.income)}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-400">Outflow:</span>
                <span className="font-bold text-rose-600">-{formatCurrency(analyticsTotals.expense)}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-400">Net:</span>
                <span className={`font-bold ${analyticsTotals.net >= 0 ? "text-blue-600" : "text-amber-600"}`}>
                  {formatCurrency(analyticsTotals.net)} ({analyticsTotals.margin}%)
                </span>
              </div>

              {/* Chart Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAnalyticsChartType("area")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    analyticsChartType === "area"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Wave
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsChartType("bar")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    analyticsChartType === "bar"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Bars
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAnalytics(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                title="Close Analytics"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Interactive Chart (7 cols) */}
            <div className="lg:col-span-7 rounded-xl border border-slate-100 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Money Received</span>
                  <span className="h-2 w-2 rounded-full bg-rose-500 ml-2" />
                  <span>Money Spent</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Monthly Trends</span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {analyticsChartType === "area" ? (
                    <AreaChart
                      data={analyticsData?.timeline || []}
                      margin={{ top: 12, right: 12, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="month"
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                      />
                      <Tooltip
                        formatter={(value: any, name: any) => [
                          formatCurrency(Number(value)),
                          name === "income" ? "Money Received" : "Money Spent",
                        ]}
                        labelStyle={{ fontWeight: "bold", color: "#0f172a", marginBottom: "4px" }}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          backgroundColor: "#ffffff",
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.08)",
                          fontSize: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="income"
                        name="income"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorIncome)"
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        name="expense"
                        stroke="#f43f5e"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorExpense)"
                      />
                    </AreaChart>
                  ) : (
                    <BarChart
                      data={analyticsData?.timeline || []}
                      margin={{ top: 12, right: 12, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="month"
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                      />
                      <Tooltip
                        formatter={(value: any, name: any) => [
                          formatCurrency(Number(value)),
                          name === "income" ? "Money Received" : "Money Spent",
                        ]}
                        labelStyle={{ fontWeight: "bold", color: "#0f172a", marginBottom: "4px" }}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          backgroundColor: "#ffffff",
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.08)",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="income" name="income" fill="#10b981" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="expense" name="expense" fill="#f43f5e" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Breakdown & Progress Bars (5 cols) */}
            <div className="lg:col-span-5 rounded-xl border border-slate-200/80 bg-white p-4 space-y-3.5 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Tag size={13} className="text-blue-600" />
                  <span>Category Volume Breakdown</span>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setAnalyticsCategoryFilter("ALL")}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      analyticsCategoryFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsCategoryFilter("INCOME")}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      analyticsCategoryFilter === "INCOME" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Inflows
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsCategoryFilter("EXPENSE")}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      analyticsCategoryFilter === "EXPENSE" ? "bg-white text-rose-700 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Outflows
                  </button>
                </div>
              </div>

              {/* List of Categories with Sleek Progress Bars */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-64 pr-1">
                {filteredCategories.slice(0, 8).map((cat, idx) => {
                  const percent = Math.min(Math.round((cat.total / maxCategoryTotal) * 100), 100);
                  const isIncome = cat.type === "INCOME";

                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0 pr-2">
                          <span
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                              isIncome ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          <span className="font-semibold text-slate-800 truncate">{cat.category}</span>
                          <span className="text-[10px] text-slate-400">({cat.count} txns)</span>
                        </div>
                        <span className={`font-bold shrink-0 ${isIncome ? "text-emerald-600" : "text-slate-900"}`}>
                          {formatCurrency(cat.total)}
                        </span>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isIncome ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.max(percent, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {filteredCategories.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-xs text-center space-y-1">
                    <PieChart size={24} className="text-slate-300" />
                    <p className="font-medium text-slate-600">No category transactions found</p>
                    <p className="text-[11px]">Recorded transactions will generate real-time distribution bars.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Card with Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Type Switcher Tabs */}
        <div className="flex border-b border-slate-200 px-5 pt-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedType("ALL");
              setSelectedCategory("");
              setPage(1);
            }}
            className={`pb-3 px-3 text-xs font-semibold transition border-b-2 cursor-pointer ${
              selectedType === "ALL"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            All Financial Records ({summaryStats.totalTransactions})
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedType("INCOME");
              setSelectedCategory("");
              setPage(1);
            }}
            className={`pb-3 px-3 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              selectedType === "INCOME"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <TrendingUp size={14} className="text-emerald-500" />
            <span>Money Received (Income)</span>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] text-emerald-800 font-bold">
              {summaryStats.incomeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedType("EXPENSE");
              setSelectedCategory("");
              setPage(1);
            }}
            className={`pb-3 px-3 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              selectedType === "EXPENSE"
                ? "border-rose-600 text-rose-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <TrendingDown size={14} className="text-rose-500" />
            <span>Money Spent (Expenses)</span>
            <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] text-rose-800 font-bold">
              {summaryStats.expenseCount}
            </span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, category, reference #, notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none cursor-pointer max-w-[160px]"
          >
            <option value="">All Categories</option>
            {filterCategoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value as any);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={selectedMethod}
            onChange={(e) => {
              setSelectedMethod(e.target.value as any);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="CREDIT_CARD">Credit Card</option>
            <option value="DEBIT_CARD">Debit Card</option>
            <option value="CHEQUE">Cheque</option>
            <option value="OTHER">Other</option>
          </select>

          {/* Date Range Start */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
            <span className="text-[11px] text-slate-400">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-transparent focus:outline-none cursor-pointer text-slate-700"
            />
          </div>

          {/* Date Range End */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
            <span className="text-[11px] text-slate-400">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-transparent focus:outline-none cursor-pointer text-slate-700"
            />
          </div>

          {(search || selectedType !== "ALL" || selectedCategory || selectedStatus !== "ALL" || selectedMethod !== "ALL" || startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedType("ALL");
                setSelectedCategory("");
                setSelectedStatus("ALL");
                setSelectedMethod("ALL");
                setStartDate("");
                setEndDate("");
                setPage(1);
              }}
              className="text-xs font-semibold text-rose-600 hover:underline px-1 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Transaction Date</th>
                <th className="py-3 px-4">Title & Details</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Linked CRM Entity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <RotateCw size={22} className="animate-spin text-blue-600" />
                      <span>Loading financial records...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet size={32} className="text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">No transactions found</p>
                      <p className="text-xs text-slate-400">
                        Record your first money received or spent using the buttons above.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition">
                    {/* Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {t.transactionDate ? new Date(t.transactionDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }) : "—"}
                    </td>

                    {/* Title & Reference */}
                    <td className="py-3.5 px-4 min-w-[200px]">
                      <div className="font-semibold text-slate-900">{t.title}</div>
                      {t.reference && (
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">Ref: {t.reference}</div>
                      )}
                      {t.description && (
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{t.description}</div>
                      )}
                    </td>

                    {/* Type Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {t.type === "INCOME" ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                          <TrendingUp size={12} />
                          Income
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 border border-rose-200">
                          <TrendingDown size={12} />
                          Expense
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <span
                        className={`text-sm font-bold ${
                          t.type === "INCOME" ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {t.type === "INCOME" ? "+" : "-"} {formatCurrency(Number(t.amount))}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 font-medium">
                        {t.category}
                      </span>
                    </td>

                    {/* Payment Method */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      {t.paymentMethod.replace(/_/g, " ")}
                    </td>

                    {/* Linked Entity */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      {t.customer && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-700 font-medium">
                          <Building size={12} className="text-slate-400 shrink-0" />
                          <span>{t.customer.company?.name || t.customer.primaryContact?.fullName || `Customer #${t.customer.id}`}</span>
                        </div>
                      )}
                      {t.deal && (
                        <div className="flex items-center gap-1 text-[11px] text-blue-600 font-medium mt-0.5">
                          <Briefcase size={12} className="text-blue-400 shrink-0" />
                          <span>Deal: {t.deal.name}</span>
                        </div>
                      )}
                      {!t.customer && !t.deal && <span className="text-slate-300">—</span>}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          t.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : t.status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(t)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          title="Edit transaction"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(t)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete transaction"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500 bg-white">
          <div>
            Showing <span className="font-semibold">{transactions.length}</span> of{" "}
            <span className="font-semibold">{totalCount}</span> records
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 font-medium">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT TRANSACTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingItem ? "Edit Transaction" : "Record Financial Transaction"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formType === "INCOME" ? "Record money received into your business." : "Record money spent / operational expense."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTransaction} className="space-y-4 text-xs">
              {/* Type Switcher */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Transaction Nature <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormType("INCOME");
                      setFormCategory("");
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      formType === "INCOME"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <TrendingUp size={16} className="text-emerald-600" />
                    <span>Money Received (Income)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormType("EXPENSE");
                      setFormCategory("");
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      formType === "EXPENSE"
                        ? "border-rose-600 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <TrendingDown size={16} className="text-rose-600" />
                    <span>Money Spent (Expense)</span>
                  </button>
                </div>
              </div>

              {/* Title & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Title / Subject <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Client Monthly Retainer or AWS Hosting"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Amount (₹ INR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 font-semibold focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Category & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider">
                      Category <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(!isCustomCategory);
                        setFormCategory("");
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                    >
                      {isCustomCategory ? "Select from list" : "+ Custom Category"}
                    </button>
                  </div>
                  {isCustomCategory ? (
                    <input
                      type="text"
                      required
                      placeholder="Enter custom category name..."
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  ) : (
                    <select
                      required
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select category...</option>
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      {formCategory && !availableCategories.includes(formCategory) && (
                        <option value={formCategory}>{formCategory}</option>
                      )}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    {options.paymentMethods.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date, Status & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    {options.statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Invoice / Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-001"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Optional CRM Entity Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Link to Customer (Optional)
                  </label>
                  <select
                    value={formCustomerId}
                    onChange={(e) => setFormCustomerId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">None / General</option>
                    {options.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Link to Deal (Optional)
                  </label>
                  <select
                    value={formDealId}
                    onChange={(e) => setFormDealId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">None / General</option>
                    {options.deals.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description / Notes */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Notes / Detailed Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional details, tax breakdown, or vendor information..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex items-center gap-1.5 rounded-xl px-5 py-2 font-semibold text-white shadow-sm transition disabled:opacity-50 cursor-pointer ${
                    formType === "INCOME"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {submitting && <RotateCw size={14} className="animate-spin" />}
                  <span>{editingItem ? "Update Transaction" : formType === "INCOME" ? "Record Income" : "Record Expense"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-100">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Transaction</h3>
                <p className="text-xs text-slate-500">This action can be tracked in the audit trail.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to delete the transaction{" "}
              <strong className="text-slate-900">"{deleteTarget.title}"</strong> for{" "}
              <strong className="text-slate-900">{formatCurrency(Number(deleteTarget.amount))}</strong>?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
