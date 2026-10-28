import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  Search,
  Plus,
  Download,
  RotateCw,
  FileSpreadsheet,
  ChevronDown,
  Building2,
  Handshake,
  Layers,
  CircleDollarSign,
  LayoutGrid,
  List,
  X,
  Users,
  Pencil,
  Trash2,
  Factory,
  UserCheck,
  Check,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import type { Customer, CustomerFormValues } from "../../types/customer";
import { CUSTOMER_OWNERS } from "../../types/customer";
import {
  customerColumns,
  customerColumnOptions,
  customerCsvFields,
  formatCurrency,
  formatCustomerDate,
} from "../../columns/customerColumns";
import CustomerForm from "../../components/ui/CustomerForm";
import DataTable, { TablePagination } from "../../components/ui/DataTable";
import TableSettings from "../../components/ui/TableSettings";
import CustomerDetailDialog from "../../components/ui/CustomerDetailDialog";
import DynamicSparkline from "../../components/ui/DynamicSparkline";
import { useSession } from "../../lib/useSession";
import {
  fetchCustomers,
  fetchCustomerOptions,
  createCustomer,
  updateCustomer,
  deleteCustomer as apiDeleteCustomer,
} from "../../lib/customers";

export default function Customers() {
  const session = useSession();
  const currentUser = session?.user;
  const isAdmin = currentUser?.role?.toUpperCase() === "ADMIN";
  const currentUserName = currentUser?.name?.trim() || "";

  const [searchParams, setSearchParams] = useSearchParams();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Search & Filter Dropdowns
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<"industry" | "owner" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Export dropdown & actions menu
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // View state & Pagination
  const [view, setView] = useState<"list" | "grid">("list");
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  // Form states
  const [formValues, setFormValues] = useState<CustomerFormValues | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formCustomerId, setFormCustomerId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Dynamic Options from DB
  const [companyOptions, setCompanyOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [contactOptions, setContactOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [userOptions, setUserOptions] = useState<Array<{ id: number; name: string }>>([]);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync search param from URL
  useEffect(() => {
    const urlQuery = searchParams.get("search");
    if (urlQuery !== null && urlQuery !== search) {
      setSearch(urlQuery);
      setPage(1);
    }
  }, [searchParams]);

  // Load customer records from Backend API
  const loadCustomersData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setApiError(null);
    try {
      const [res, optRes] = await Promise.allSettled([
        fetchCustomers({ limit: 100 }),
        fetchCustomerOptions(),
      ]);

      if (res.status === "fulfilled") {
        setCustomers(res.value.customers || []);
      } else {
        const msg = res.reason instanceof Error ? res.reason.message : "Failed to load customers";
        setApiError(msg);
      }

      if (optRes.status === "fulfilled") {
        setCompanyOptions(optRes.value.companies || []);
        setContactOptions(
          (optRes.value.contacts || []).map((c) => ({
            id: c.id,
            name: c.fullName,
          }))
        );
        setUserOptions(optRes.value.users || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load customer data";
      setApiError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCustomersData();
  }, [loadCustomersData]);

  // Esc closes the customer detail dialog
  useEffect(() => {
    if (!detailCustomer) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDetailCustomer(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detailCustomer]);

  // Dynamic Options present in data
  const availableIndustries = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.industry && c.industry.trim()) set.add(c.industry.trim());
    });
    return Array.from(set).sort();
  }, [customers]);

  const availableOwners = useMemo(() => {
    if (!isAdmin) {
      return currentUserName ? [currentUserName] : [];
    }
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.owner && c.owner.trim() && c.owner !== "Unassigned") set.add(c.owner.trim());
    });
    userOptions.forEach((u) => set.add(u.name));
    return Array.from(set).sort();
  }, [isAdmin, currentUserName, customers, userOptions]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers
      .filter((customer) => {
        const matchesSearch = [
          customer.company,
          customer.industry,
          customer.primaryContact,
          customer.owner,
          customer.notes,
        ].some((value) => (value || "").toLowerCase().includes(query));

        if (!matchesSearch) return false;

        if (
          selectedIndustries.length > 0 &&
          !selectedIndustries.includes(customer.industry || "")
        ) {
          return false;
        }

        if (
          selectedOwners.length > 0 &&
          !selectedOwners.includes(customer.owner || "")
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.convertedAt.localeCompare(a.convertedAt));
  }, [customers, search, selectedIndustries, selectedOwners]);

  // Summary Metrics for Stat Cards
  const metrics = useMemo(() => {
    const total = customers.length;
    const totalPipeline = customers.reduce((sum, c) => sum + (c.pipelineValue || 0), 0);
    const totalDeals = customers.reduce((sum, c) => sum + (c.dealCount || 0), 0);
    const withContacts = customers.filter(
      (c) => c.primaryContact && c.primaryContact !== "—"
    ).length;

    return {
      total,
      totalPipeline,
      totalDeals,
      withContacts,
    };
  }, [customers]);

  // Sparkline data
  const sparklineTrends = useMemo(() => {
    const total = metrics.total;
    const pipeline = metrics.totalPipeline;
    const deals = metrics.totalDeals;
    const contacts = metrics.withContacts;
    return {
      total: [
        Math.max(1, Math.round(total * 0.4)),
        Math.max(1, Math.round(total * 0.6)),
        Math.max(2, Math.round(total * 0.7)),
        Math.max(2, Math.round(total * 0.85)),
        total,
      ],
      pipeline: [
        Math.round(pipeline * 0.3),
        Math.round(pipeline * 0.5),
        Math.round(pipeline * 0.65),
        Math.round(pipeline * 0.8),
        pipeline,
      ],
      deals: [
        Math.max(0, Math.round(deals * 0.2)),
        Math.max(1, Math.round(deals * 0.5)),
        Math.max(1, Math.round(deals * 0.7)),
        deals,
      ],
      contacts: [
        Math.max(0, Math.round(contacts * 0.3)),
        Math.max(1, Math.round(contacts * 0.6)),
        Math.max(1, Math.round(contacts * 0.8)),
        contacts,
      ],
    };
  }, [metrics]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageCustomers = filteredCustomers.slice(
    startIndex,
    startIndex + pageSize
  );

  const visibleCustomerColumns = useMemo(() => {
    const base = customerColumns.filter(
      (column) => !hiddenColumns.includes(column.key)
    );
    const snoCol = {
      key: "sno",
      header: "S.No",
      className: "w-14 text-center text-xs font-bold text-slate-900 whitespace-nowrap",
      headerClassName: "w-14 text-center whitespace-nowrap",
      cell: (_customer: Customer, index?: number) => (
        <span className="text-slate-900 font-bold">
          {startIndex + (index ?? 0) + 1}
        </span>
      ),
    };
    return [snoCol, ...base];
  }, [hiddenColumns, startIndex]);

  const hasActiveFilters =
    search !== "" ||
    selectedIndustries.length > 0 ||
    selectedOwners.length > 0;

  function resetFilters() {
    setSearch("");
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("search");
    setSearchParams(newParams);
    setSelectedIndustries([]);
    setSelectedOwners([]);
    setPage(1);
  }

  function openCreateForm() {
    setFormMode("create");
    setFormCustomerId(null);
    setFormValues({
      companyId: null,
      primaryContactId: null,
      ownerId: null,
      company: "",
      primaryContact: "",
      owner: currentUserName || (userOptions[0]?.name ?? CUSTOMER_OWNERS[0] ?? ""),
      convertedAt: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setShowCreateModal(true);
  }

  function openEditForm(customer: Customer) {
    setFormMode("edit");
    setFormCustomerId(customer.id);
    setFormValues({
      companyId: customer.companyId ?? null,
      primaryContactId: customer.primaryContactId ?? null,
      ownerId: customer.ownerId ?? null,
      company: customer.company,
      primaryContact: customer.primaryContact,
      owner: customer.owner,
      convertedAt: customer.convertedAt
        ? customer.convertedAt.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      notes: customer.notes || "",
    });
    setShowCreateModal(true);
    setDetailCustomer(null);
  }

  async function saveCustomer(values: CustomerFormValues) {
    try {
      if (formCustomerId === null) {
        await createCustomer({
          companyId: values.companyId,
          primaryContactId: values.primaryContactId,
          ownerId: values.ownerId,
          convertedAt: values.convertedAt,
          notes: values.notes,
        });
        setToastMessage({
          type: "success",
          message: `Customer account "${values.company}" was created successfully.`,
        });
      } else {
        await updateCustomer(formCustomerId, {
          companyId: values.companyId,
          primaryContactId: values.primaryContactId,
          ownerId: values.ownerId,
          convertedAt: values.convertedAt,
          notes: values.notes,
        });
        setToastMessage({
          type: "success",
          message: `Customer account "${values.company}" was updated.`,
        });
      }
      setShowCreateModal(false);
      setFormValues(null);
      setFormCustomerId(null);
      await loadCustomersData(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save customer";
      setToastMessage({ type: "error", message });
    }
  }

  async function handleDeleteCustomer(id: number, name: string) {
    if (!confirm(`Are you sure you want to delete customer "${name}"?`)) return;
    try {
      await apiDeleteCustomer(id);
      setSelectedIds((previous) => previous.filter((item) => item !== id));
      setDetailCustomer(null);
      setToastMessage({
        type: "success",
        message: `Customer "${name}" was successfully deleted.`,
      });
      await loadCustomersData(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete customer";
      setToastMessage({ type: "error", message });
    }
  }

  function exportCsv() {
    const escapeCsv = (value: string) => `"${(value || "").replace(/"/g, '""')}"`;
    const csv = [
      customerCsvFields.map((field) => field.label),
      ...filteredCustomers.map((customer) =>
        customerCsvFields.map((field) => field.get(customer))
      ),
    ]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales-crm-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }

  function exportXlsx() {
    const data = filteredCustomers.map((customer, index) => {
      const row: Record<string, unknown> = { "S.No": index + 1 };
      for (const field of customerCsvFields) {
        row[field.label] = field.get(customer);
      }
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(
      workbook,
      `sales-crm-customers-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    setShowExportMenu(false);
  }

  // Full-page create/edit form replaces the list while open
  if (showCreateModal && formValues) {
    return (
      <div className="-m-4 md:-m-8">
        <CustomerForm
          mode={formMode}
          values={formValues}
          companies={companyOptions}
          contacts={contactOptions}
          owners={userOptions}
          onClose={() => {
            setShowCreateModal(false);
            setFormValues(null);
            setFormCustomerId(null);
          }}
          onSubmit={saveCustomer}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-semibold shadow-2xl transition-all duration-200 ${
            toastMessage.type === "success"
              ? "bg-slate-900 text-white"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              toastMessage.type === "success" ? "bg-emerald-400" : "bg-rose-500"
            }`}
          />
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
              Customers
            </h1>
            <span className="rounded-full bg-blue-100 border border-blue-200 px-2.5 py-0.5 text-xs font-bold text-[#154fc1]">
              {metrics.total} Total
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Manage your organization's converted customer accounts, corporate clients &amp; relationships
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh button */}
          <button
            type="button"
            onClick={() => loadCustomersData(true)}
            disabled={loading || refreshing}
            title="Refresh Customers"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            <RotateCw
              size={15}
              className={`text-slate-500 ${
                refreshing || loading ? "animate-spin text-blue-600" : ""
              }`}
            />
          </button>

          {/* View Mode Toggle (List / Grid) */}
          <div className="flex items-center rounded-xl border border-slate-300 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setView("list")}
              title="Table View"
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs transition cursor-pointer ${
                view === "list"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <List size={15} />
            </button>
            <button
              type="button"
              onClick={() => setView("grid")}
              title="Card Grid View"
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs transition cursor-pointer ${
                view === "grid"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <LayoutGrid size={15} />
            </button>
          </div>

          {/* Export Menu */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            >
              <Download size={14} className="text-slate-600" />
              <span>Export</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-10 z-30 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={exportCsv}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                >
                  <Download size={14} className="text-slate-500" />
                  <span>Export as CSV</span>
                </button>
                <button
                  type="button"
                  onClick={exportXlsx}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                >
                  <FileSpreadsheet size={14} className="text-emerald-600" />
                  <span>Export as Excel</span>
                </button>
              </div>
            )}
          </div>

          {/* Column Settings */}
          {view === "list" && (
            <TableSettings
              columns={customerColumnOptions}
              hidden={hiddenColumns}
              onChange={setHiddenColumns}
            />
          )}

          {/* Create Customer Button */}
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#1d61e7] px-4 text-xs font-bold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Create Customer</span>
          </button>
        </div>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{apiError}</span>
        </div>
      )}

      {/* KPI Cards Row (4 Cards) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Customers */}
        <div className="flex items-center justify-between rounded-xl border border-blue-500 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-[#154fc1]">
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Customers</p>
              <p className="text-2xl font-bold text-slate-950 leading-tight">
                {metrics.total}
              </p>
              <p className="text-[11px] font-bold text-[#154fc1] mt-0.5">
                Active accounts
              </p>
            </div>
          </div>
          <DynamicSparkline
            data={sparklineTrends.total}
            color="blue"
            gradientId="stat-cust-total"
          />
        </div>

        {/* Associated Pipeline */}
        <div className="flex items-center justify-between rounded-xl border border-emerald-500 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CircleDollarSign size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Pipeline Value</p>
              <p className="text-xl font-bold text-slate-950 leading-tight">
                {formatCurrency(metrics.totalPipeline)}
              </p>
              <p className="text-[11px] font-bold text-emerald-700 mt-0.5">
                From attached deals
              </p>
            </div>
          </div>
          <DynamicSparkline
            data={sparklineTrends.pipeline}
            color="emerald"
            gradientId="stat-cust-pipe"
          />
        </div>

        {/* Related Deals */}
        <div className="flex items-center justify-between rounded-xl border border-purple-500 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Layers size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Active Deals</p>
              <p className="text-2xl font-bold text-slate-950 leading-tight">
                {metrics.totalDeals}
              </p>
              <p className="text-[11px] font-bold text-purple-700 mt-0.5">
                In progress
              </p>
            </div>
          </div>
          <DynamicSparkline
            data={sparklineTrends.deals}
            color="purple"
            gradientId="stat-cust-deals"
          />
        </div>

        {/* Primary Contacts Assigned */}
        <div className="flex items-center justify-between rounded-xl border border-amber-500 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Primary Contact</p>
              <p className="text-2xl font-bold text-slate-950 leading-tight">
                {metrics.withContacts}
              </p>
              <p className="text-[11px] font-bold text-amber-800 mt-0.5">
                {metrics.total > 0
                  ? Math.round((metrics.withContacts / metrics.total) * 100)
                  : 0}
                % linked
              </p>
            </div>
          </div>
          <DynamicSparkline
            data={sparklineTrends.contacts}
            color="amber"
            gradientId="stat-cust-contacts"
          />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        ref={dropdownRef}
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs"
      >
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search by company, contact, owner, or notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                const newParams = new URLSearchParams(searchParams);
                if (e.target.value.trim()) {
                  newParams.set("search", e.target.value);
                } else {
                  newParams.delete("search");
                }
                setSearchParams(newParams);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-8 py-1.5 text-xs font-semibold text-slate-950 placeholder:text-slate-400 placeholder:font-normal outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete("search");
                  setSearchParams(newParams);
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Industry Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === "industry" ? null : "industry")
              }
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                selectedIndustries.length > 0
                  ? "border-blue-600 bg-blue-50/60 text-[#154fc1]"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Factory size={13} className="text-slate-500" />
              <span>Industry</span>
              {selectedIndustries.length > 0 && ` (${selectedIndustries.length})`}
              <ChevronDown size={13} className="text-slate-400 ml-0.5" />
            </button>

            {activeDropdown === "industry" && (
              <div className="absolute left-0 top-10 z-30 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Industry
                </p>
                <div className="space-y-1 mt-1 max-h-56 overflow-y-auto">
                  {availableIndustries.map((ind) => {
                    const checked = selectedIndustries.includes(ind);
                    return (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => {
                          setSelectedIndustries((prev) =>
                            prev.includes(ind)
                              ? prev.filter((i) => i !== ind)
                              : [...prev, ind]
                          );
                          setPage(1);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50 text-slate-800 text-left cursor-pointer"
                      >
                        <span className="truncate">{ind}</span>
                        {checked && <Check size={14} className="text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                  {availableIndustries.length === 0 && (
                    <p className="p-2 text-xs text-slate-400 text-center">
                      No industries found
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Account Owner Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === "owner" ? null : "owner")
              }
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                selectedOwners.length > 0
                  ? "border-blue-600 bg-blue-50/60 text-[#154fc1]"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Handshake size={13} className="text-slate-500" />
              <span>Owner</span>
              {selectedOwners.length > 0 && ` (${selectedOwners.length})`}
              <ChevronDown size={13} className="text-slate-400 ml-0.5" />
            </button>

            {activeDropdown === "owner" && (
              <div className="absolute left-0 top-10 z-30 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Owner
                </p>
                <div className="space-y-1 mt-1 max-h-56 overflow-y-auto">
                  {availableOwners.map((owner) => {
                    const checked = selectedOwners.includes(owner);
                    return (
                      <button
                        key={owner}
                        type="button"
                        onClick={() => {
                          setSelectedOwners((prev) =>
                            prev.includes(owner)
                              ? prev.filter((o) => o !== owner)
                              : [...prev, owner]
                          );
                          setPage(1);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50 text-slate-800 text-left cursor-pointer"
                      >
                        <span className="truncate">{owner}</span>
                        {checked && <Check size={14} className="text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                  {availableOwners.length === 0 && (
                    <p className="p-2 text-xs text-slate-400 text-center">
                      No owners found
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
            >
              <X size={14} />
              <span>Clear filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table / Grid Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        {loading && customers.length === 0 ? (
          <div className="flex h-72 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RotateCw className="h-6 w-6 animate-spin text-[#1d61e7]" />
              <p className="text-xs font-medium text-slate-500">
                Loading customer accounts from database...
              </p>
            </div>
          </div>
        ) : view === "list" ? (
          <DataTable<Customer>
            columns={visibleCustomerColumns}
            rows={pageCustomers}
            getRowId={(customer) => customer.id}
            onRowClick={(customer) => setDetailCustomer(customer)}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={(ids) => setSelectedIds(ids as number[])}
            getRowLabel={(customer) => customer.company}
            renderRowMenu={(customer) => (
              <>
                <button
                  type="button"
                  onClick={() => setDetailCustomer(customer)}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Users size={13} className="text-slate-400" />
                  <span>View account details</span>
                </button>
                <button
                  type="button"
                  onClick={() => openEditForm(customer)}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Pencil size={13} className="text-slate-400" />
                  <span>Edit customer</span>
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => handleDeleteCustomer(customer.id, customer.company)}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 size={13} className="text-rose-500" />
                  <span>Delete customer</span>
                </button>
              </>
            )}
            empty={
              <div className="py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Search size={20} className="text-slate-400" />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-800">
                  No customers found
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Try adjusting your search criteria or filter tags.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            }
          />
        ) : (
          <div className="grid min-h-[300px] gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {pageCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => setDetailCustomer(customer)}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-400 hover:shadow-md cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-[#154fc1] font-bold text-sm">
                        {(customer.company || "C").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 group-hover:text-blue-600">
                          {customer.company}
                        </p>
                        <p className="truncate text-xs font-semibold text-slate-500">
                          {customer.industry || "General Industry"}
                        </p>
                      </div>
                    </div>

                    <div
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => openEditForm(customer)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Edit customer"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                    <p className="flex items-center gap-2">
                      <UserCheck size={14} className="text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700">Contact:</span>
                      <span className="truncate">{customer.primaryContact || "—"}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Handshake size={14} className="text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700">Owner:</span>
                      <span className="truncate">{customer.owner || "Unassigned"}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Layers size={14} className="text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700">Deals:</span>
                      <span>
                        {customer.dealCount}{" "}
                        {customer.dealCount === 1 ? "deal" : "deals"}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <CircleDollarSign size={14} className="text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-700">Pipeline:</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(customer.pipelineValue)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <CalendarDays size={12} />
                    {formatCustomerDate(customer.convertedAt)}
                  </span>
                  <span className="text-[#1d61e7] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    View profile &rarr;
                  </span>
                </div>
              </div>
            ))}
            {pageCustomers.length === 0 && (
              <p className="col-span-full py-16 text-center text-sm font-medium text-slate-500">
                No customers match your filters.
              </p>
            )}
          </div>
        )}

        {/* Table Footer with Clean Pagination */}
        <div className="border-t border-slate-100 px-4 py-3">
          <TablePagination
            total={filteredCustomers.length}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            selectedCount={selectedIds.length}
          />
        </div>
      </div>

      {/* Customer Detail Modal */}
      {detailCustomer && (
        <CustomerDetailDialog
          customer={detailCustomer}
          onClose={() => setDetailCustomer(null)}
        />
      )}
    </div>
  );
}
