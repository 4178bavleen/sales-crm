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
  Mail,
  Phone,
  BriefcaseBusiness,
  Check,
  LayoutGrid,
  List,
  X,
  Users,
  Pencil,
  Trash2,
  Copy,
  CheckCircle2,
} from "lucide-react";
import type { Contact, ContactFormValues } from "../../types/contact";
import {
  contactColumns,
  contactColumnOptions,
  contactCsvFields,
  formatContactDate,
} from "../../columns/contactColumns";
import ContactForm from "../../components/ui/ContactForm";
import DataTable from "../../components/ui/DataTable";
import TableSettings from "../../components/ui/TableSettings";
import ContactDetailDialog from "../../components/ui/ContactDetailDialog";
import ContactDeleteDialog from "../../components/ui/ContactDeleteDialog";
import StatCard from "../../components/ui/StatCard";
import Avatar from "../../components/ui/Avatar";
import {
  fetchContacts,
  createContact,
  updateContact,
  deleteContact as deleteContactApi,
} from "../../lib/contacts";
import { request } from "../../lib/api";
import { ENDPOINTS } from "../../lib/endpoints";
import { getSession } from "../../lib/auth";

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filters & Search
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") || "");

  useEffect(() => {
    const q = searchParams.get("search");
    if (q !== null && q !== search) {
      setSearch(q);
    }
  }, [searchParams]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedJobTitles, setSelectedJobTitles] = useState<string[]>([]);
  const [sortNewest, setSortNewest] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // View state
  const [view, setView] = useState<"list" | "grid">("list");
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Drawers
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [formValues, setFormValues] = useState<ContactFormValues | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formContactId, setFormContactId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Dropdown states
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Available Companies list from deals/options or active contacts
  const [availableCompanies, setAvailableCompanies] = useState<{ id: number; name: string }[]>([]);

  // Load Contacts from backend API
  const refreshContacts = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetchContacts({ limit: 100 });
      setContacts(res.contacts);
      setTotalCount(res.total);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshContacts();

    // Fetch existing companies from deals options if available
    const token = getSession()?.token;
    if (token) {
      request<{
        customers?: { id: number; company?: { id: number; name: string } | null }[];
      }>(ENDPOINTS.deals.options, { token })
        .then(data => {
          if (data.customers) {
            const list: { id: number; name: string }[] = [];
            const seen = new Set<number>();
            for (const c of data.customers) {
              if (c.company && !seen.has(c.company.id)) {
                seen.add(c.company.id);
                list.push({ id: c.company.id, name: c.company.name });
              }
            }
            if (list.length > 0) setAvailableCompanies(list);
          }
        })
        .catch(() => {});
    }
  }, [refreshContacts]);

  // Click outside to close dropdowns
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

  // Esc closes detail dialog
  useEffect(() => {
    if (!detailContact) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDetailContact(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detailContact]);

  // Derived filter option lists
  const dynamicCompanyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of availableCompanies) {
      if (c.name) set.add(c.name);
    }
    for (const c of contacts) {
      if (c.company) set.add(c.company);
    }
    return Array.from(set).sort();
  }, [availableCompanies, contacts]);

  const dynamicJobTitleOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of contacts) {
      if (c.jobTitle) set.add(c.jobTitle);
    }
    return Array.from(set).sort();
  }, [contacts]);

  // Compute metrics from current contacts
  const metrics = useMemo(() => {
    const total = contacts.length;
    const withCompany = contacts.filter(c => !!c.company).length;
    const withEmail = contacts.filter(c => !!c.email).length;
    const withPhone = contacts.filter(c => !!c.phone).length;

    return {
      total,
      withCompany,
      withEmail,
      withPhone,
    };
  }, [contacts]);

  // Sparkline data (last 7 days bucketed)
  const sparklineTrends = useMemo(() => {
    const days = 7;
    const now = new Date();
    const dayBuckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (days - 1 - i));
      return d.toISOString().slice(0, 10);
    });

    const totalTrend = new Array(days).fill(0);
    const companyTrend = new Array(days).fill(0);
    const emailTrend = new Array(days).fill(0);
    const phoneTrend = new Array(days).fill(0);

    for (const c of contacts) {
      const createdDay = c.createdAt ? c.createdAt.slice(0, 10) : "";
      const idx = dayBuckets.indexOf(createdDay);
      if (idx !== -1) {
        totalTrend[idx]++;
        if (c.company) companyTrend[idx]++;
        if (c.email) emailTrend[idx]++;
        if (c.phone) phoneTrend[idx]++;
      }
    }

    return {
      total: totalTrend,
      company: companyTrend,
      email: emailTrend,
      phone: phoneTrend,
    };
  }, [contacts]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return contacts
      .filter(contact => {
        if (query) {
          const matches = [
            contact.fullName,
            contact.company,
            contact.jobTitle,
            contact.email,
            contact.phone,
            contact.notes,
          ].some(val => val && val.toLowerCase().includes(query));
          if (!matches) return false;
        }

        if (
          selectedCompanies.length > 0 &&
          (!contact.company || !selectedCompanies.includes(contact.company))
        ) {
          return false;
        }

        if (
          selectedJobTitles.length > 0 &&
          (!contact.jobTitle || !selectedJobTitles.includes(contact.jobTitle))
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) =>
        sortNewest
          ? b.createdAt.localeCompare(a.createdAt)
          : a.createdAt.localeCompare(b.createdAt),
      );
  }, [contacts, search, selectedCompanies, selectedJobTitles, sortNewest]);

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageContacts = filteredContacts.slice(startIndex, startIndex + pageSize);

  // Columns for data table with S.No
  const paginatedColumns = useMemo(() => {
    const base = contactColumns.filter(column => !hiddenColumns.includes(column.key));
    const snoCol = {
      key: "sno",
      header: "S.No",
      className: "w-14 text-center text-xs font-bold text-slate-900 whitespace-nowrap",
      headerClassName: "w-14 text-center whitespace-nowrap",
      cell: (_contact: Contact, index?: number) => (
        <span className="text-slate-900 font-bold">
          {startIndex + (index ?? 0) + 1}
        </span>
      ),
    };
    return [snoCol, ...base];
  }, [hiddenColumns, startIndex]);

  const hasActiveFilters =
    search !== "" ||
    selectedCompanies.length > 0 ||
    selectedJobTitles.length > 0;

  function resetFilters() {
    setSearch("");
    setSelectedCompanies([]);
    setSelectedJobTitles([]);
    setPage(1);
  }

  function openCreate() {
    setFormMode("create");
    setFormContactId(null);
    setFormValues({
      fullName: "",
      company: "",
      companyId: null,
      jobTitle: "",
      email: "",
      phone: "",
      notes: "",
    });
    setShowCreateModal(true);
  }

  function openEdit(contact: Contact) {
    setFormMode("edit");
    setFormContactId(contact.id);
    setFormValues({
      fullName: contact.fullName,
      company: contact.company,
      companyId: contact.companyId ?? null,
      jobTitle: contact.jobTitle,
      email: contact.email,
      phone: contact.phone,
      notes: contact.notes,
    });
    setDetailContact(null);
    setShowCreateModal(true);
  }

  async function handleSaveContact(values: ContactFormValues) {
    if (formMode === "create") {
      const created = await createContact({
        fullName: values.fullName,
        companyId: values.companyId,
        jobTitle: values.jobTitle || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        notes: values.notes || undefined,
      });
      setContacts(prev => [created, ...prev]);
      setTotalCount(prev => prev + 1);
    } else if (formContactId !== null) {
      const updated = await updateContact(formContactId, {
        fullName: values.fullName,
        companyId: values.companyId,
        jobTitle: values.jobTitle || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        notes: values.notes || undefined,
      });
      setContacts(prev =>
        prev.map(c => (c.id === formContactId ? updated : c)),
      );
    }

    setShowCreateModal(false);
    setFormValues(null);
    setFormContactId(null);
  }

  function requestDeleteContact(contact: Contact) {
    setDeletingContact(contact);
  }

  async function handleConfirmDelete(contact: Contact) {
    await deleteContactApi(contact.id);
    setContacts(prev => prev.filter(c => c.id !== contact.id));
    setSelectedIds(prev => prev.filter(item => item !== contact.id));
    setTotalCount(prev => Math.max(0, prev - 1));
    if (detailContact?.id === contact.id) setDetailContact(null);
  }

  async function handleCopyEmail(email: string) {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch {
      // ignore clipboard error
    }
  }

  // Export to CSV
  function exportCsv() {
    const escapeCsv = (val: string) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const headers = contactCsvFields.map(f => f.label).join(",");
    const rows = filteredContacts.map(contact =>
      contactCsvFields.map(f => escapeCsv(f.get(contact))).join(","),
    );
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }

  // Export to Excel (XLSX)
  function exportXlsx() {
    const data = filteredContacts.map((contact, index) => {
      const row: Record<string, unknown> = { "S.No": index + 1 };
      for (const field of contactCsvFields) {
        row[field.label] = field.get(contact);
      }
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts");
    XLSX.writeFile(workbook, `contacts-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setShowExportMenu(false);
  }

  return (
    <div className="space-y-4">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Contacts
            </h1>
            <span className="rounded-full bg-blue-100 border border-blue-200 px-2.5 py-0.5 text-xs font-bold text-[#154fc1]">
              {totalCount} Total
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Manage your organization's business contacts, key executives, and leads
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh button */}
          <button
            type="button"
            onClick={refreshContacts}
            disabled={loading}
            title="Refresh Contacts"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            <RotateCw size={15} className={loading ? "animate-spin text-blue-600" : ""} />
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
              columns={contactColumnOptions}
              hidden={hiddenColumns}
              onChange={setHiddenColumns}
            />
          )}

          {/* Create Contact Primary Button */}
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#1d61e7] px-4 text-xs font-bold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Create Contact</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (4 Cards - using Global StatCard) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Contacts"
          value={metrics.total}
          subtext="Active records"
          icon={Users}
          color="blue"
          sparklineData={sparklineTrends.total}
          sparklineId="stat-contacts-total"
        />

        <StatCard
          label="With Company"
          value={metrics.withCompany}
          subtext={`${metrics.total > 0 ? Math.round((metrics.withCompany / metrics.total) * 100) : 0}% linked`}
          icon={Building2}
          color="emerald"
          sparklineData={sparklineTrends.company}
          sparklineId="stat-contacts-company"
        />

        <StatCard
          label="Email Address"
          value={metrics.withEmail}
          subtext={`${metrics.total > 0 ? Math.round((metrics.withEmail / metrics.total) * 100) : 0}% reachable`}
          icon={Mail}
          color="purple"
          sparklineData={sparklineTrends.email}
          sparklineId="stat-contacts-email"
        />

        <StatCard
          label="Phone Available"
          value={metrics.withPhone}
          subtext={`${metrics.total > 0 ? Math.round((metrics.withPhone / metrics.total) * 100) : 0}% callable`}
          icon={Phone}
          color="amber"
          sparklineData={sparklineTrends.phone}
          sparklineId="stat-contacts-phone"
        />
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
              placeholder="Search by name, company, email, phone, title..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-8 py-1.5 text-xs font-semibold text-slate-950 placeholder:text-slate-400 placeholder:font-normal outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Company Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === "company" ? null : "company")}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                selectedCompanies.length > 0
                  ? "border-blue-600 bg-blue-50/60 text-[#154fc1]"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Building2 size={13} className="text-slate-500" />
              <span>Company</span>
              {selectedCompanies.length > 0 && ` (${selectedCompanies.length})`}
              <ChevronDown size={13} className="text-slate-400 ml-0.5" />
            </button>

            {activeDropdown === "company" && (
              <div className="absolute left-0 top-10 z-30 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Company
                </p>
                <div className="space-y-1 mt-1 max-h-56 overflow-y-auto">
                  {dynamicCompanyOptions.map(comp => {
                    const checked = selectedCompanies.includes(comp);
                    return (
                      <button
                        key={comp}
                        type="button"
                        onClick={() => {
                          setSelectedCompanies(prev =>
                            prev.includes(comp) ? prev.filter(c => c !== comp) : [...prev, comp],
                          );
                          setPage(1);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50 text-slate-800 text-left cursor-pointer"
                      >
                        <span className="truncate">{comp}</span>
                        {checked && <Check size={14} className="text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                  {dynamicCompanyOptions.length === 0 && (
                    <p className="p-2 text-xs text-slate-400 text-center">No companies found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Job Title Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === "jobTitle" ? null : "jobTitle")}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                selectedJobTitles.length > 0
                  ? "border-blue-600 bg-blue-50/60 text-[#154fc1]"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <BriefcaseBusiness size={13} className="text-slate-500" />
              <span>Job Title</span>
              {selectedJobTitles.length > 0 && ` (${selectedJobTitles.length})`}
              <ChevronDown size={13} className="text-slate-400 ml-0.5" />
            </button>

            {activeDropdown === "jobTitle" && (
              <div className="absolute left-0 top-10 z-30 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Job Title
                </p>
                <div className="space-y-1 mt-1 max-h-56 overflow-y-auto">
                  {dynamicJobTitleOptions.map(title => {
                    const checked = selectedJobTitles.includes(title);
                    return (
                      <button
                        key={title}
                        type="button"
                        onClick={() => {
                          setSelectedJobTitles(prev =>
                            prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title],
                          );
                          setPage(1);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50 text-slate-800 text-left cursor-pointer"
                      >
                        <span className="truncate">{title}</span>
                        {checked && <Check size={14} className="text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                  {dynamicJobTitleOptions.length === 0 && (
                    <p className="p-2 text-xs text-slate-400 text-center">No job titles found</p>
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
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer ml-1"
            >
              <X size={13} />
              <span>Clear filters</span>
            </button>
          )}
        </div>

        {/* Sort Order Toggle */}
        <button
          type="button"
          onClick={() => setSortNewest(!sortNewest)}
          className="text-xs font-bold text-slate-700 hover:text-slate-950 cursor-pointer"
        >
          {sortNewest ? "Sort: Newest first" : "Sort: Oldest first"}
        </button>
      </div>

      {/* Main Workspace (Table or Grid View) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        {view === "list" ? (
          <DataTable<Contact>
            columns={paginatedColumns}
            rows={pageContacts}
            getRowId={contact => contact.id}
            onRowClick={contact => setDetailContact(contact)}
            selectedIds={selectedIds}
            onSelectionChange={ids => setSelectedIds(ids as number[])}
            getRowLabel={contact => contact.fullName}
            renderRowMenu={contact => (
              <>
                <button
                  type="button"
                  onClick={() => setDetailContact(contact)}
                  className="w-full rounded px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  View details
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(contact)}
                  className="w-full rounded px-3 py-2 text-left text-xs font-bold text-slate-900 hover:bg-slate-50 cursor-pointer"
                >
                  Edit contact
                </button>
                {contact.email && (
                  <button
                    type="button"
                    onClick={() => handleCopyEmail(contact.email)}
                    className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <span>Copy email</span>
                    {copiedEmail === contact.email ? (
                      <CheckCircle2 size={13} className="text-emerald-600" />
                    ) : (
                      <Copy size={13} className="text-slate-400" />
                    )}
                  </button>
                )}
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => requestDeleteContact(contact)}
                  className="w-full rounded px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  Delete contact
                </button>
              </>
            )}
            empty={
              loading ? (
                <div className="py-12 text-center text-slate-500">
                  <p className="text-sm font-semibold">Loading contacts from backend...</p>
                </div>
              ) : apiError ? (
                <div className="py-12 text-center text-rose-600">
                  <p className="text-sm font-bold">{apiError}</p>
                  <button
                    type="button"
                    onClick={refreshContacts}
                    className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                    <Users size={22} />
                  </div>
                  <p className="text-sm font-bold text-slate-900">No contacts found</p>
                  <p className="text-xs font-medium text-slate-500 mt-1 max-w-sm mx-auto">
                    {hasActiveFilters
                      ? "No contacts matched your search or filters. Try adjusting your query."
                      : "No contacts are recorded yet. Click '+ Create Contact' to add your first."}
                  </p>
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-3 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Clear filters
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openCreate}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#1d61e7] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Add First Contact</span>
                    </button>
                  )}
                </div>
              )
            }
            pagination={{
              total: filteredContacts.length,
              page: currentPage,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: size => {
                setPageSize(size);
                setPage(1);
              },
              selectedCount: selectedIds.length,
            }}
          />
        ) : (
          /* Grid Card View */
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pageContacts.map(contact => (
                <div
                  key={contact.id}
                  onClick={() => setDetailContact(contact)}
                  className="group relative flex flex-col justify-between rounded-xl border border-slate-300 bg-white p-4 shadow-2xs hover:border-[#154fc1] hover:shadow-md transition cursor-pointer"
                >
                  <div>
                    {/* Card Top: Avatar & Name */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={contact.fullName} seed={contact.id} size={42} />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-950 group-hover:text-[#154fc1] transition">
                            {contact.fullName}
                          </p>
                          <p className="truncate text-[11px] font-semibold text-slate-700 mt-0.5">
                            {contact.jobTitle || "No job title"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          openEdit(contact);
                        }}
                        title="Edit Contact"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>

                    {/* Company Tag */}
                    <div className="mt-3">
                      {contact.company ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-900 max-w-full truncate">
                          <Building2 size={11} className="shrink-0 text-slate-600" />
                          <span className="truncate">{contact.company}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">No company</span>
                      )}
                    </div>

                    {/* Details: Email & Phone */}
                    <div className="mt-3.5 space-y-1.5 text-xs border-t border-slate-100 pt-3">
                      {contact.email ? (
                        <div className="flex items-center justify-between gap-2 text-slate-950 font-semibold truncate">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Mail size={12} className="shrink-0 text-slate-500" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleCopyEmail(contact.email);
                            }}
                            title="Copy email"
                            className="text-slate-400 hover:text-slate-700"
                          >
                            {copiedEmail === contact.email ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">No email</span>
                      )}

                      {contact.phone ? (
                        <div className="flex items-center gap-1.5 text-slate-900 font-semibold text-xs">
                          <Phone size={12} className="shrink-0 text-slate-500" />
                          <span>{contact.phone}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">No phone</span>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: Date & Actions */}
                  <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] font-semibold text-slate-500">
                    <span>Added {formatContactDate(contact.createdAt)}</span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        requestDeleteContact(contact);
                      }}
                      className="text-slate-400 hover:text-rose-600 transition"
                      title="Delete contact"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls for Grid View */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs font-semibold text-slate-700">
              <div>
                Showing <span className="font-bold text-slate-950">{startIndex + 1}–{Math.min(filteredContacts.length, startIndex + pageSize)}</span> of{" "}
                <span className="font-bold text-slate-950">{filteredContacts.length}</span> contacts
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                  className="rounded-lg border border-slate-300 px-3 py-1 font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-2 font-bold text-slate-950">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                  className="rounded-lg border border-slate-300 px-3 py-1 font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contact Details Modal */}
      {detailContact && (
        <ContactDetailDialog
          contact={detailContact}
          onClose={() => setDetailContact(null)}
          onEdit={() => openEdit(detailContact)}
          onDelete={() => requestDeleteContact(detailContact)}
        />
      )}

      {/* Delete Contact Modal */}
      {deletingContact && (
        <ContactDeleteDialog
          contact={deletingContact}
          isOpen={Boolean(deletingContact)}
          onClose={() => setDeletingContact(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Create / Edit Contact Modal */}
      {showCreateModal && formValues && (
        <ContactForm
          mode={formMode}
          contact={formValues}
          availableCompanies={availableCompanies}
          onClose={() => {
            setShowCreateModal(false);
            setFormValues(null);
            setFormContactId(null);
          }}
          onSubmit={handleSaveContact}
        />
      )}
    </div>
  );
}
