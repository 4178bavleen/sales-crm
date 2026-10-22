import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Plus,
  Filter,
  Upload,
  Download,
  RotateCw,
  MoreHorizontal,
  FileSpreadsheet,
  ChevronDown,
  Users,
  TrendingUp,
  Phone,
  Award,
  Trophy,
  Flag,
  User,
  Calendar,
  Check,
} from "lucide-react";
import type { Lead, LeadStatus } from "../../types/lead";
import { LEAD_PRIORITIES, LEAD_SOURCES, LEAD_STATUSES } from "../../types/lead";
import {
  fetchLeads,
  fetchLeadOptions,
  createLead as createLeadApi,
  updateLead as updateLeadApi,
  updateLeadStatus as updateLeadStatusApi,
  deleteLead as deleteLeadApi,
} from "../../lib/leads";
import {
  leadColumns,
  leadCsvFields,
} from "./leadColumns";
import type { LeadsFilter } from "../../types/leadsPage";
import CreateLeadModal from "../../components/ui/Createlead";
import DataTable from "../../components/ui/DataTable";
import LeadDetailDialog from "../../components/ui/LeadDetailDialog";

// Filter state
const emptyFilters: LeadsFilter = { status: [], priority: [], source: [] };
const initialLeads: Lead[] = [];

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<LeadsFilter>(emptyFilters);
  const [selectedOwner, setSelectedOwner] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("All Time");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backendSources, setBackendSources] = useState<string[]>([]);
  const [backendOwners, setBackendOwners] = useState<string[]>([]);

  // Filter dropdown toggles
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refreshLeads = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const { leads: data } = await fetchLeads({ limit: 100 });
      setLeads(data);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLeads();
    fetchLeadOptions()
      .then(data => {
        if (data.sources) setBackendSources(data.sources.map(s => s.name));
        if (data.owners) setBackendOwners(data.owners.map(o => o.name));
      })
      .catch(() => {});
  }, [refreshLeads]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Esc closes detail dialog
  useEffect(() => {
    if (!detailLead) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDetailLead(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detailLead]);

  // Compute metrics from current leads
  const metrics = useMemo(() => {
    const total = leads.length;
    const newLeads = leads.filter(l => l.status === "NEW").length;
    const contacted = leads.filter(l => l.status === "CONTACTED").length;
    const qualified = leads.filter(l => l.status === "QUALIFIED").length;
    const converted = leads.filter(l => l.status === "CONVERTED").length;

    return {
      total,
      newLeads,
      contacted,
      qualified,
      converted,
      totalPercent: "100%",
      newPercent: total > 0 ? `${Math.round((newLeads / total) * 100)}%` : "0%",
      contactedPercent: total > 0 ? `${Math.round((contacted / total) * 100)}%` : "0%",
      qualifiedPercent: total > 0 ? `${Math.round((qualified / total) * 100)}%` : "0%",
      convertedPercent: total > 0 ? `${Math.round((converted / total) * 100)}%` : "0%",
    };
  }, [leads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    const activeFilterKeys = (Object.keys(filters) as (keyof LeadsFilter)[]).filter(
      key => filters[key].length > 0,
    );

    return leads.filter(lead => {
      // Search matching across all relevant fields
      const matchesSearch =
        !query ||
        [
          lead.firstName,
          lead.lastName,
          lead.company,
          lead.email,
          lead.phone,
          lead.owner,
          lead.source,
          lead.productService || "",
          lead.notes || "",
        ].some(value => value.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // Checkbox filters (status, priority, source)
      const matchesMultiFilters = activeFilterKeys.every(key =>
        (filters[key] as string[]).includes(lead[key]),
      );
      if (!matchesMultiFilters) return false;

      // Owner filter
      if (selectedOwner && lead.owner !== selectedOwner) return false;

      // Date range filter dynamically calculated
      if (dateRange === "Today") {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (!lead.createdAt.startsWith(todayStr)) return false;
      } else if (dateRange === "Last 7 Days") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const sevenDaysAgo = d.toISOString().slice(0, 10);
        if (lead.createdAt.slice(0, 10) < sevenDaysAgo) return false;
      } else if (dateRange === "Last 30 Days") {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const thirtyDaysAgo = d.toISOString().slice(0, 10);
        if (lead.createdAt.slice(0, 10) < thirtyDaysAgo) return false;
      }

      return true;
    });
  }, [leads, search, filters, selectedOwner, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageLeads = filteredLeads.slice(startIndex, startIndex + pageSize);

  const paginatedColumns = useMemo(() => {
    return leadColumns.map(col => {
      if (col.key === "sno") {
        return {
          ...col,
          cell: (_lead: Lead, index?: number) => (
            <span className="text-slate-500 font-medium">
              {startIndex + (index ?? 0) + 1}
            </span>
          ),
        };
      }
      return col;
    });
  }, [startIndex]);

  const hasActiveFilters =
    search !== "" ||
    Object.values(filters).some(list => list.length > 0) ||
    selectedOwner !== "" ||
    dateRange !== "All Time";

  const availableOwners = useMemo(() => {
    const set = new Set<string>(backendOwners);
    for (const lead of leads) {
      if (lead.owner && lead.owner !== "Unassigned") set.add(lead.owner);
    }
    return ["All Owners", ...Array.from(set).sort()];
  }, [leads, backendOwners]);

  const availableSources = useMemo(() => {
    const set = new Set<string>(backendSources.length > 0 ? backendSources : LEAD_SOURCES);
    for (const lead of leads) {
      if (lead.source) set.add(lead.source);
    }
    return Array.from(set).sort();
  }, [leads, backendSources]);

  function toggleMultiFilter(key: keyof LeadsFilter, value: string) {
    setFilters(prev => {
      const current = prev[key] as string[];
      const exists = current.includes(value);
      const next = exists ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
    setPage(1);
  }

  function resetFilters() {
    setSearch("");
    setFilters(emptyFilters);
    setSelectedOwner("");
    setDateRange("All Time");
    setPage(1);
  }

  function filterByStatusCard(status?: LeadStatus) {
    if (!status) {
      resetFilters();
      return;
    }
    if (filters.status.length === 1 && filters.status[0] === status) {
      setFilters(prev => ({ ...prev, status: [] }));
    } else {
      setFilters({ ...emptyFilters, status: [status] });
    }
    setPage(1);
  }

  async function createLead(lead: Lead) {
    try {
      const created = await createLeadApi({
        firstName: lead.firstName,
        lastName: lead.lastName,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        sourceId: lead.sourceId,
        owner: lead.owner,
        ownerId: lead.ownerId,
        status: lead.status,
        priority: lead.priority,
        notes: lead.notes,
        nextFollowUpAt: lead.nextFollowUpAt,
        noFollowUp: lead.noFollowUp,
        noFollowUpReasonId: lead.noFollowUpReasonId,
      });
      setLeads(previous => [created, ...previous]);
      setShowCreateModal(false);
      resetFilters();
    } catch (err) {
      console.error("Failed to create lead:", err);
      throw err;
    }
  }

  async function handleUpdateLead(id: number, lead: Lead) {
    try {
      const updated = await updateLeadApi(id, {
        firstName: lead.firstName,
        lastName: lead.lastName,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        sourceId: lead.sourceId,
        owner: lead.owner,
        ownerId: lead.ownerId,
        status: lead.status,
        priority: lead.priority,
        notes: lead.notes,
        nextFollowUpAt: lead.nextFollowUpAt,
        noFollowUp: lead.noFollowUp,
        noFollowUpReasonId: lead.noFollowUpReasonId,
      });
      setLeads(previous =>
        previous.map(l => (l.id === id ? updated : l)),
      );
      setEditingLead(null);
      setDetailLead(previous =>
        previous?.id === id ? updated : previous,
      );
    } catch (err) {
      console.error("Failed to update lead:", err);
      throw err;
    }
  }

  async function updateLeadStatus(id: number, status: LeadStatus) {
    try {
      const updated = await updateLeadStatusApi(id, status);
      setLeads(previous =>
        previous.map(lead => (lead.id === id ? updated : lead)),
      );
      setDetailLead(previous =>
        previous?.id === id ? updated : previous,
      );
    } catch (err) {
      console.error("Failed to update lead status:", err);
    }
  }

  async function deleteLead(id: number) {
    try {
      await deleteLeadApi(id);
      setLeads(previous => previous.filter(lead => lead.id !== id));
      setSelectedIds(previous => previous.filter(item => item !== id));
      setDetailLead(null);
    } catch (err) {
      console.error("Failed to delete lead:", err);
    }
  }

  function exportCsv() {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [
      leadCsvFields.map(field => field.label),
      ...filteredLeads.map(lead =>
        leadCsvFields.map(field => field.get(lead)),
      ),
    ]
      .map(row => row.map(escapeCsv).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "sales-crm-leads.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportExcel() {
    const data = filteredLeads.map(lead => ({
      "First Name": lead.firstName,
      "Last Name": lead.lastName,
      "Company": lead.company,
      "Email": lead.email || "",
      "Phone": lead.phone || "",
      "Lead Source": lead.source,
      "Lead Owner": lead.owner,
      "Lead Status": lead.status,
      "Priority": lead.priority,
      "Created At": lead.createdAt,
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(workbook, "sales-crm-leads.xlsx");
  }

  function parseCsv(text: string): Record<string, string>[] {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const parseRow = (rowStr: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < rowStr.length; i++) {
        const char = rowStr[i];
        if (char === '"') {
          if (inQuotes && rowStr[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]).map(h => h.replace(/^"|"$/g, "").trim().toLowerCase());
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseRow(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = (values[idx] ?? "").replace(/^"|"$/g, "").trim();
      });
      rows.push(row);
    }
    return rows;
  }

  function triggerImport(acceptType: ".csv" | ".xlsx, .xls" | ".csv, .xlsx, .xls") {
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptType;
      fileInputRef.current.click();
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      setApiError(null);
      const ext = file.name.split(".").pop()?.toLowerCase();
      let rows: Record<string, any>[] = [];

      if (ext === "xlsx" || ext === "xls") {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });
      } else {
        const text = await file.text();
        rows = parseCsv(text);
      }

      if (rows.length === 0) {
        throw new Error("No data rows found in the selected file.");
      }

      for (const row of rows) {
        const normalized: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          normalized[k.trim().toLowerCase()] = String(v ?? "").trim();
        }

        const nameParts = (normalized["contact name"] || normalized["name"] || "").split(" ");
        const firstName = normalized["first name"] || normalized["firstname"] || nameParts[0] || "Imported";
        const lastName = normalized["last name"] || normalized["lastname"] || (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "");
        const statusVal = (normalized["lead status"] || normalized["status"] || "NEW").toUpperCase();
        const priorityVal = (normalized["priority"] || "MEDIUM").toUpperCase();

        await createLeadApi({
          firstName,
          lastName,
          company: normalized["company"] || normalized["company name"] || undefined,
          email: normalized["email"] || undefined,
          phone: normalized["phone"] || normalized["phone number"] || undefined,
          source: normalized["lead source"] || normalized["source"] || "Website",
          productService: normalized["product"] || normalized["product / service"] || normalized["service"] || undefined,
          status: (["NEW", "CONTACTED", "QUALIFIED", "CONVERTED"].includes(statusVal) ? statusVal : "NEW") as LeadStatus,
          priority: (["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priorityVal) ? priorityVal : "MEDIUM") as any,
          noFollowUp: true,
        });
      }
      await refreshLeads();
    } catch (err) {
      console.error("Import failed:", err);
      setApiError(err instanceof Error ? err.message : "Failed to import file");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Full-page create / edit form
  if (showCreateModal || editingLead) {
    return (
      <CreateLeadModal
        initialLead={editingLead}
        onClose={() => {
          setShowCreateModal(false);
          setEditingLead(null);
        }}
        onCreate={createLead}
        onUpdate={handleUpdateLead}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Leads
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Manage and track all your leads in one place
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx, .xls"
            className="hidden"
            onChange={handleFileUpload}
          />

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus size={15} />
            Create Lead
            <ChevronDown size={14} className="ml-1 opacity-80" />
          </button>

          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setShowMoreMenu(prev => !prev)}
              title="More options"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            >
              <MoreHorizontal size={16} />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-9 z-30 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Export Options
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    exportCsv();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Download size={14} className="text-slate-400" />
                  Export as CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    exportExcel();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <FileSpreadsheet size={14} className="text-emerald-600" />
                  Export as Excel (.xlsx)
                </button>

                <div className="my-1 border-t border-slate-100" />
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Import Options
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    triggerImport(".csv");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Upload size={14} className="text-slate-400" />
                  Import CSV (.csv)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    triggerImport(".xlsx, .xls");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <FileSpreadsheet size={14} className="text-emerald-600" />
                  Import Excel (.xlsx)
                </button>

                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    refreshLeads();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <RotateCw size={14} className="text-slate-400" />
                  Refresh Leads
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Row (5 Cards) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* Total Leads */}
        <div
          onClick={() => filterByStatusCard()}
          className={`group relative flex items-center justify-between overflow-hidden rounded-xl border bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-blue-300 hover:shadow-xs cursor-pointer min-w-0 ${
            filters.status.length === 0 ? "border-[#1d61e7] ring-2 ring-blue-500/10" : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#1d61e7]">
              <Users size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Total Leads</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {metrics.total}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-blue-600 flex items-center gap-0.5">
                All active
              </p>
            </div>
          </div>
          {/* Smooth curved SVG with gradient fill */}
          <div className="w-16 sm:w-20 md:w-24 shrink-0 overflow-hidden flex items-center justify-end">
            <svg className="w-full h-10 sm:h-11 overflow-hidden" viewBox="0 0 120 48" fill="none">
              <defs>
                <linearGradient id="stat-grad-total" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="85%" stopColor="#3b82f6" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 42 C 16 42 28 34 44 34 C 58 34 68 16 78 14 C 85 12 90 20 96 20 C 104 20 110 8 116 6 L 116 48 L 0 48 Z"
                fill="url(#stat-grad-total)"
              />
              <path
                d="M 0 42 C 16 42 28 34 44 34 C 58 34 68 16 78 14 C 85 12 90 20 96 20 C 104 20 110 8 116 6"
                stroke="#3b82f6"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* New Leads */}
        <div
          onClick={() => filterByStatusCard("NEW")}
          className={`group relative flex items-center justify-between overflow-hidden rounded-xl border bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-emerald-300 hover:shadow-xs cursor-pointer min-w-0 ${
            filters.status.includes("NEW") ? "border-emerald-500 ring-2 ring-emerald-500/15" : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <TrendingUp size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">New Leads</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {metrics.newLeads}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-emerald-500 flex items-center gap-0.5">
                <span>↑</span> {metrics.newPercent}
              </p>
            </div>
          </div>
          <div className="w-16 sm:w-20 md:w-24 shrink-0 overflow-hidden flex items-center justify-end">
            <svg className="w-full h-10 sm:h-11 overflow-hidden" viewBox="0 0 120 48" fill="none">
              <defs>
                <linearGradient id="stat-grad-new" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="85%" stopColor="#10b981" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 43 C 14 43 26 33 40 33 C 54 33 62 17 70 15 C 76 13 82 21 88 21 C 96 21 104 7 112 5 L 112 48 L 0 48 Z"
                fill="url(#stat-grad-new)"
              />
              <path
                d="M 0 43 C 14 43 26 33 40 33 C 54 33 62 17 70 15 C 76 13 82 21 88 21 C 96 21 104 7 112 5"
                stroke="#10b981"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Contacted */}
        <div
          onClick={() => filterByStatusCard("CONTACTED")}
          className={`group relative flex items-center justify-between overflow-hidden rounded-xl border bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-purple-300 hover:shadow-xs cursor-pointer min-w-0 ${
            filters.status.includes("CONTACTED") ? "border-purple-500 ring-2 ring-purple-500/15" : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-600">
              <Phone size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Contacted</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {metrics.contacted}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-purple-600 flex items-center gap-0.5">
                <span>↑</span> {metrics.contactedPercent}
              </p>
            </div>
          </div>
          <div className="w-16 sm:w-20 md:w-24 shrink-0 overflow-hidden flex items-center justify-end">
            <svg className="w-full h-10 sm:h-11 overflow-hidden" viewBox="0 0 120 48" fill="none">
              <defs>
                <linearGradient id="stat-grad-contacted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
                  <stop offset="85%" stopColor="#a855f7" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 41 C 12 41 24 32 38 32 C 50 32 58 16 66 14 C 72 12 78 20 84 20 C 92 20 100 6 108 4 L 108 48 L 0 48 Z"
                fill="url(#stat-grad-contacted)"
              />
              <path
                d="M 0 41 C 12 41 24 32 38 32 C 50 32 58 16 66 14 C 72 12 78 20 84 20 C 92 20 100 6 108 4"
                stroke="#a855f7"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Qualified */}
        <div
          onClick={() => filterByStatusCard("QUALIFIED")}
          className={`group relative flex items-center justify-between overflow-hidden rounded-xl border bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-amber-300 hover:shadow-xs cursor-pointer min-w-0 ${
            filters.status.includes("QUALIFIED") ? "border-amber-500 ring-2 ring-amber-500/15" : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500">
              <Award size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Qualified</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {metrics.qualified}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-amber-500 flex items-center gap-0.5">
                <span>↑</span> {metrics.qualifiedPercent}
              </p>
            </div>
          </div>
          <div className="w-16 sm:w-20 md:w-24 shrink-0 overflow-hidden flex items-center justify-end">
            <svg className="w-full h-10 sm:h-11 overflow-hidden" viewBox="0 0 120 48" fill="none">
              <defs>
                <linearGradient id="stat-grad-qualified" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="85%" stopColor="#f59e0b" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 42 C 14 41 26 33 40 33 C 52 33 60 16 68 14 C 75 12 80 20 86 20 C 94 20 102 6 110 4 L 110 48 L 0 48 Z"
                fill="url(#stat-grad-qualified)"
              />
              <path
                d="M 0 42 C 14 41 26 33 40 33 C 52 33 60 16 68 14 C 75 12 80 20 86 20 C 94 20 102 6 110 4"
                stroke="#f59e0b"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Converted */}
        <div
          onClick={() => filterByStatusCard("CONVERTED")}
          className={`group relative flex items-center justify-between overflow-hidden rounded-xl border bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-emerald-300 hover:shadow-xs cursor-pointer min-w-0 ${
            filters.status.includes("CONVERTED") ? "border-emerald-500 ring-2 ring-emerald-500/15" : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Trophy size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Converted</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {metrics.converted}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-emerald-500 flex items-center gap-0.5">
                <span>↑</span> {metrics.convertedPercent}
              </p>
            </div>
          </div>
          <div className="w-16 sm:w-20 md:w-24 shrink-0 overflow-hidden flex items-center justify-end">
            <svg className="w-full h-10 sm:h-11 overflow-hidden" viewBox="0 0 120 48" fill="none">
              <defs>
                <linearGradient id="stat-grad-converted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="85%" stopColor="#10b981" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 43 C 18 43 28 32 46 31 C 60 30 68 14 80 12 C 88 10 94 18 102 18 C 108 18 114 12 118 10 L 118 48 L 0 48 Z"
                fill="url(#stat-grad-converted)"
              />
              <path
                d="M 0 43 C 18 43 28 32 46 31 C 60 30 68 14 80 12 C 88 10 94 18 102 18 C 108 18 114 12 118 10"
                stroke="#10b981"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div
        ref={dropdownRef}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Search leads */}
          <div className="relative w-full sm:w-56 md:w-64">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search leads..."
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500"
            />
          </div>

          {/* Lead Status Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === "status" ? null : "status")}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                filters.status.length > 0
                  ? "border-blue-600 bg-blue-50/50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Filter size={13} className="text-slate-400" />
              Lead Status
              {filters.status.length > 0 && ` (${filters.status.length})`}
              <ChevronDown size={13} className="text-slate-400 ml-0.5" />
            </button>

            {activeDropdown === "status" && (
              <div className="absolute left-0 top-9 z-30 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Select Status
                </p>
                <div className="space-y-1 mt-1">
                  {LEAD_STATUSES.map(status => {
                    const checked = filters.status.includes(status);
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => toggleMultiFilter("status", status)}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs hover:bg-slate-50 text-slate-700 text-left"
                      >
                        <span>{status}</span>
                        {checked && <Check size={14} className="text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === "priority" ? null : "priority")}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                filters.priority.length > 0
                  ? "border-blue-600 bg-blue-50/50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Flag size={13} className="text-slate-400" />
              Priority
              {filters.priority.length > 0 && ` (${filters.priority.length})`}
              <ChevronDown size={13} className="text-slate-400 ml-0.5" />
            </button>

            {activeDropdown === "priority" && (
              <div className="absolute left-0 top-9 z-30 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Select Priority
                </p>
                <div className="space-y-1 mt-1">
                  {LEAD_PRIORITIES.map(priority => {
                    const checked = filters.priority.includes(priority);
                    return (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => toggleMultiFilter("priority", priority)}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs hover:bg-slate-50 text-slate-700 text-left"
                      >
                        <span>{priority}</span>
                        {checked && <Check size={14} className="text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Lead Source Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === "source" ? null : "source")}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                filters.source.length > 0
                  ? "border-blue-600 bg-blue-50/50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Phone size={13} className="text-slate-400" />
              Lead Source
              {filters.source.length > 0 && ` (${filters.source.length})`}
              <ChevronDown size={13} className="text-slate-400 ml-0.5" />
            </button>

            {activeDropdown === "source" && (
              <div className="absolute left-0 top-9 z-30 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Select Source
                </p>
                <div className="space-y-1 mt-1 max-h-60 overflow-y-auto">
                  {availableSources.map(source => {
                    const checked = filters.source.includes(source);
                    return (
                      <button
                        key={source}
                        type="button"
                        onClick={() => toggleMultiFilter("source", source)}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs hover:bg-slate-50 text-slate-700 text-left"
                      >
                        <span>{source}</span>
                        {checked && <Check size={14} className="text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Owner Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === "owner" ? null : "owner")}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                selectedOwner
                  ? "border-blue-600 bg-blue-50/50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <User size={13} className="text-slate-400" />
              Owner {selectedOwner ? `(${selectedOwner.split(" ")[0]})` : ""}
              <ChevronDown size={13} className="text-slate-400 ml-0.5" />
            </button>

            {activeDropdown === "owner" && (
              <div className="absolute left-0 top-9 z-30 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="space-y-1">
                  {availableOwners.map(owner => (
                    <button
                      key={owner}
                      type="button"
                      onClick={() => {
                        setSelectedOwner(owner === "All Owners" ? "" : owner);
                        setActiveDropdown(null);
                        setPage(1);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs hover:bg-slate-50 text-slate-700 text-left"
                    >
                      <span>{owner}</span>
                      {(owner === "All Owners" && !selectedOwner) || selectedOwner === owner ? (
                        <Check size={14} className="text-blue-600" />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Date Range Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === "date" ? null : "date")}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                dateRange !== "All Time"
                  ? "border-blue-600 bg-blue-50/50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Calendar size={13} className="text-slate-400" />
              Date Range {dateRange !== "All Time" ? `(${dateRange})` : ""}
              <ChevronDown size={13} className="text-slate-400 ml-0.5" />
            </button>

            {activeDropdown === "date" && (
              <div className="absolute left-0 top-9 z-30 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="space-y-1">
                  {["All Time", "Today", "Last 7 Days", "Last 30 Days"].map(range => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => {
                        setDateRange(range);
                        setActiveDropdown(null);
                        setPage(1);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs hover:bg-slate-50 text-slate-700 text-left"
                    >
                      <span>{range}</span>
                      {dateRange === range && <Check size={14} className="text-blue-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Clear filters + Filter action */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t border-slate-100 sm:border-0">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
            >
              Clear Filters
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown ? null : "status")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 bg-white px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition shadow-2xs cursor-pointer ml-auto sm:ml-0"
          >
            <Filter size={13} />
            Filter
          </button>
        </div>
      </div>

      {/* Main Leads Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <DataTable<Lead>
          columns={paginatedColumns}
          rows={pageLeads}
          getRowId={lead => lead.id}
          onRowClick={lead => setDetailLead(lead)}
          getRowLabel={lead => `${lead.firstName} ${lead.lastName}`}
          renderRowMenu={lead => (
            <>
              <button
                type="button"
                onClick={() => setDetailLead(lead)}
                className="w-full rounded px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                View details
              </button>
              <button
                type="button"
                onClick={() => setEditingLead(lead)}
                className="w-full rounded px-3 py-2 text-left text-xs font-medium text-slate-800 hover:bg-slate-50 cursor-pointer"
              >
                Edit lead
              </button>
              <div className="my-1 border-t border-slate-100" />
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Update status
              </p>
              {LEAD_STATUSES.filter(status => status !== "DISQUALIFIED").map(
                status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => updateLeadStatus(lead.id, status)}
                    className="w-full rounded px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                  >
                    {status}
                  </button>
                ),
              )}
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => deleteLead(lead.id)}
                className="w-full rounded px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50"
              >
                Delete lead
              </button>
            </>
          )}
          empty={
            loading ? (
              <div className="py-8 text-center text-slate-500">
                <p className="text-sm font-medium">Loading leads...</p>
              </div>
            ) : apiError ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-rose-600">{apiError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setApiError(null);
                    fetchLeads({ limit: 100 })
                      .then(({ leads: data }) => {
                        setLeads(data);
                        setLoading(false);
                      })
                      .catch(err => {
                        setApiError(err instanceof Error ? err.message : "Failed to load leads");
                        setLoading(false);
                      });
                  }}
                  className="mt-2 text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Search size={20} className="text-slate-400" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">
                  No leads found
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Try changing your search or filters.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-3 text-xs font-medium text-blue-600 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )
          }
          pagination={{
            total: filteredLeads.length,
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
      </div>

      {/* Lead Detail Dialog */}
      {detailLead && (
        <LeadDetailDialog
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onStatusChange={status => updateLeadStatus(detailLead.id, status)}
          onEdit={() => {
            setEditingLead(detailLead);
            setDetailLead(null);
          }}
        />
      )}
    </div>
  );
}
