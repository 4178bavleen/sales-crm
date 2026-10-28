import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { request } from "../../lib/api";
import { ENDPOINTS } from "../../lib/endpoints";
import { getSession } from "../../lib/auth";
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
  CheckCircle2,
  X,
  UserCheck,
  AlertCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Lead, LeadStatus, Priority } from "../../types/lead";
import {
  fetchLeads,
  fetchLeadOptions,
  createLead as createLeadApi,
  updateLead as updateLeadApi,
  updateLeadStatus as updateLeadStatusApi,
  deleteLead as deleteLeadApi,
  assignLead as assignLeadApi,
  previewLeadImportFile,
  confirmLeadImportRows,
  getLeadById,
  type ImportPreviewResponse,
  type ImportConfirmResponse,
  type LeadOptionsData,
} from "../../lib/leads";
import {
  leadColumns,
  leadCsvFields,
  leadColumnOptions,
  formatDate,
} from "./leadColumns";
import TableSettings from "../../components/ui/TableSettings";
import type { LeadsFilter } from "../../types/leadsPage";
import CreateLeadModal from "../../components/ui/Createlead";
import AssignLeadDialog from "../../components/ui/AssignLeadDialog";
import DataTable from "../../components/ui/DataTable";
import LeadDetailDialog from "../../components/ui/LeadDetailDialog";
import ImportPreviewModal from "../../components/ui/ImportPreviewModal";
import ImportModal from "../../components/ui/ImportModal";
import LeadDeleteDialog from "../../components/ui/LeadDeleteDialog";
import DynamicSparkline from "../../components/ui/DynamicSparkline";
import { useSession } from "../../lib/useSession";

// Filter state
const emptyFilters: LeadsFilter = { status: [], priority: [], source: [] };
const initialLeads: Lead[] = [];

function formatLabel(str: string): string {
  if (!str) return "";
  return str
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function Leads() {
  const session = useSession();
  const currentUser = session?.user;
  const isAdmin = currentUser?.role?.toUpperCase() === "ADMIN";
  const currentUserName = currentUser?.name?.trim() || "";

  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [filters, setFilters] = useState<LeadsFilter>(emptyFilters);
  const [selectedOwner, setSelectedOwner] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("All Time");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const urlLeadId = searchParams.get("leadId") || searchParams.get("id");
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [assigningLead, setAssigningLead] = useState<Lead | null>(null);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [rawOwners, setRawOwners] = useState<{ id: number; name: string; email?: string }[]>([]);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Sync search param when changed externally via Topbar
  useEffect(() => {
    const q = searchParams.get("search");
    if (q !== null && q !== search) {
      setSearch(q);
    }
  }, [searchParams]);

  // Auto-dismiss toast after 4s
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const closeDetailLead = useCallback(() => {
    setDetailLead(null);
    if (searchParams.has("leadId") || searchParams.has("id")) {
      const next = new URLSearchParams(searchParams);
      next.delete("leadId");
      next.delete("id");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Deep-link: automatically open lead detail when leadId is in URL
  useEffect(() => {
    if (!urlLeadId) return;
    const targetId = Number(urlLeadId);
    if (!Number.isSafeInteger(targetId) || targetId <= 0) return;

    const found = leads.find(l => l.id === targetId);
    if (found) {
      setDetailLead(found);
      return;
    }

    getLeadById(targetId)
      .then(fetched => {
        if (fetched) {
          setDetailLead(fetched);
        }
      })
      .catch(() => {});
  }, [urlLeadId, leads]);

  async function handleAssignLead(leadId: number, ownerId: number | null, note?: string) {
    try {
      const updated = await assignLeadApi(leadId, ownerId, note);
      setLeads(prev => prev.map(l => (l.id === leadId ? updated : l)));
      if (detailLead?.id === leadId) {
        setDetailLead(updated);
      }
      setAssigningLead(null);
      const ownerName = updated.owner && updated.owner !== "Unassigned" ? updated.owner : null;
      setToastMessage({
        type: "success",
        message: ownerName ? `Lead successfully assigned to ${ownerName}` : "Lead unassigned successfully"
      });
    } catch (err) {
      setToastMessage({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to assign lead"
      });
      throw err;
    }
  }
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [convertForm, setConvertForm] = useState({
    dealName: "",
    ownerId: "",
    stageId: "",
    estimatedValue: "",
    expectedCloseDate: "",
    productServiceId: "",
    customerId: "",
  });
  const [dealOptionsForConvert, setDealOptionsForConvert] = useState<any>(null);
  const [importPreview, setImportPreview] = useState<{
    file: File;
    data: ImportPreviewResponse;
  } | null>(null);
  const [importResult, setImportResult] = useState<ImportConfirmResponse | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [leadOptions, setLeadOptions] = useState<LeadOptionsData | null>(null);
  const [backendSources, setBackendSources] = useState<string[]>([]);
  const [backendOwners, setBackendOwners] = useState<string[]>([]);
  const [backendStatuses, setBackendStatuses] = useState<LeadStatus[]>([]);
  const [backendPriorities, setBackendPriorities] = useState<Priority[]>([]);

  // Filter dropdown toggles
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshLeads = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    setApiError(null);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 600));
    try {
      const [{ leads: data }] = await Promise.all([
        fetchLeads({ limit: 100 }),
        minDelay,
      ]);
      setLeads(data);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshLeads();
    fetchLeadOptions()
      .then(data => {
        setLeadOptions(data);
        if (data.sources) setBackendSources(data.sources.map(s => s.name));
        if (data.owners) {
          setBackendOwners(data.owners.map(o => o.name));
          setRawOwners(data.owners);
        }
        if (data.statuses) setBackendStatuses(data.statuses);
        if (data.priorities) setBackendPriorities(data.priorities);
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

  // Dynamic sparkline trend series
  const sparklineTrends = useMemo(() => {
    const days = 7;
    const now = new Date();
    const dayBuckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (days - 1 - i));
      return d.toISOString().slice(0, 10);
    });

    const totalTrend = new Array(days).fill(0);
    const newTrend = new Array(days).fill(0);
    const contactedTrend = new Array(days).fill(0);
    const qualifiedTrend = new Array(days).fill(0);
    const convertedTrend = new Array(days).fill(0);

    const todayStr = now.toISOString().slice(0, 10);

    leads.forEach((l) => {
      const dateKey = l.createdAt ? l.createdAt.slice(0, 10) : todayStr;
      let idx = dayBuckets.indexOf(dateKey);
      if (idx === -1) {
        if (dateKey < dayBuckets[0]) idx = 0;
        else if (dateKey > dayBuckets[days - 1]) idx = days - 1;
        else idx = Math.floor(days / 2);
      }

      totalTrend[idx]++;
      if (l.status === "NEW") newTrend[idx]++;
      else if (l.status === "CONTACTED") contactedTrend[idx]++;
      else if (l.status === "QUALIFIED") qualifiedTrend[idx]++;
      else if (l.status === "CONVERTED") convertedTrend[idx]++;
    });

    return {
      total: totalTrend,
      new: newTrend,
      contacted: contactedTrend,
      qualified: qualifiedTrend,
      converted: convertedTrend,
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
    return leadColumns
      .filter((col) => !hiddenColumns.includes(col.key))
      .map((col) => {
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
  }, [startIndex, hiddenColumns]);

  const hasActiveFilters =
    search !== "" ||
    Object.values(filters).some(list => list.length > 0) ||
    selectedOwner !== "" ||
    dateRange !== "All Time";

  // Clear any invalid owner selection if a non-admin user is logged in
  useEffect(() => {
    if (!isAdmin && selectedOwner && selectedOwner !== currentUserName) {
      setSelectedOwner("");
    }
  }, [isAdmin, selectedOwner, currentUserName]);

  const availableOwners = useMemo(() => {
    if (!isAdmin) {
      return currentUserName ? ["All Owners", currentUserName] : ["All Owners"];
    }
    const set = new Set<string>(backendOwners);
    for (const lead of leads) {
      if (lead.owner && lead.owner !== "Unassigned") set.add(lead.owner);
    }
    return ["All Owners", ...Array.from(set).sort()];
  }, [isAdmin, currentUserName, leads, backendOwners]);

  const availableSources = useMemo(() => {
    const set = new Set<string>(backendSources);
    for (const lead of leads) {
      if (lead.source && lead.source !== "Unknown") set.add(lead.source);
    }
    return Array.from(set).sort();
  }, [leads, backendSources]);

  const availableStatuses = useMemo(() => {
    if (leadOptions?.statuses && leadOptions.statuses.length > 0) {
      return leadOptions.statuses;
    }
    const set = new Set<LeadStatus>(backendStatuses.length > 0 ? backendStatuses : [
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "DISQUALIFIED",
      "CONVERTED",
    ]);
    for (const lead of leads) {
      if (lead.status) set.add(lead.status);
    }
    return Array.from(set);
  }, [leads, backendStatuses, leadOptions]);

  const availablePriorities = useMemo(() => {
    if (leadOptions?.priorities && leadOptions.priorities.length > 0) {
      return leadOptions.priorities;
    }
    const set = new Set<Priority>(backendPriorities.length > 0 ? backendPriorities : [
      "LOW",
      "MEDIUM",
      "HIGH",
      "URGENT",
    ]);
    for (const lead of leads) {
      if (lead.priority) set.add(lead.priority);
    }
    return Array.from(set);
  }, [leads, backendPriorities, leadOptions]);

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
        noFollowUpNote: lead.noFollowUpNote,
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
      let updated = await updateLeadApi(id, {
        firstName: lead.firstName,
        lastName: lead.lastName,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        sourceId: lead.sourceId,
        status: lead.status,
        priority: lead.priority,
        notes: lead.notes,
        nextFollowUpAt: lead.nextFollowUpAt,
        noFollowUp: lead.noFollowUp,
        noFollowUpNote: lead.noFollowUpNote,
      });

      const existing = leads.find(l => l.id === id);
      if (lead.ownerId !== undefined && lead.ownerId !== existing?.ownerId) {
        try {
          updated = await assignLeadApi(id, lead.ownerId || null);
        } catch (assignErr) {
          console.warn("Could not update lead owner:", assignErr);
        }
      }

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

  async function updateLeadStatus(id: number, status: LeadStatus, extra?: any) {
    if (status === "CONVERTED") {
      const lead = leads.find(l => l.id === id) || detailLead;
      if (lead) {
        setConvertLead(lead);
        setConvertForm({
          dealName: lead.company ? `${lead.company} - ${lead.firstName} ${lead.lastName}`.trim() : `${lead.firstName} ${lead.lastName}`.trim() || `Lead #${lead.id}`,
          ownerId: lead.ownerId ? String(lead.ownerId) : "",
          stageId: "",
          estimatedValue: "",
          expectedCloseDate: "",
          productServiceId: lead.productService ? "" : "",
          customerId: "",
        });
        try {
          const token = getSession()?.token;
          if (token) {
            const res = await request<any>(ENDPOINTS.deals.options, { token });
            setDealOptionsForConvert(res);
          }
        } catch (e) {
          // ignore
        }
        setDetailLead(null);
        return;
      }
    }
    try {
      const updated = await updateLeadStatusApi(id, status as any, undefined, undefined, extra);
      setLeads(previous =>
        previous.map(lead => (lead.id === id ? updated : lead)),
      );
      setDetailLead(previous =>
        previous?.id === id ? updated : previous,
      );
    } catch (err) {
      console.error("Failed to update lead status:", err);
      alert((err as any)?.message || "Failed to update lead status");
    }
  }

  async function handleConfirmDeleteLead(lead: Lead) {
    try {
      await deleteLeadApi(lead.id);
      setLeads(previous => previous.filter(item => item.id !== lead.id));
      setSelectedIds(previous => previous.filter(item => item !== lead.id));
      if (detailLead?.id === lead.id) setDetailLead(null);
      setToastMessage({
        type: "success",
        message: `Lead "${lead.firstName} ${lead.lastName}".trim() was successfully deleted.`,
      });
    } catch (err) {
      console.error("Failed to delete lead:", err);
      const msg = err instanceof Error ? err.message : "Failed to delete lead";
      setToastMessage({ type: "error", message: msg });
      throw err;
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
      "Lead Name": `${lead.firstName} ${lead.lastName}`.trim(),
      "Company": lead.company || "",
      "Email": lead.email || "",
      "Phone": lead.phone || "",
      "Lead Source": lead.source || "",
      "Status": lead.status,
      "Priority": lead.priority,
      "Owner": lead.owner || "",
      "Next Follow-up": lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt) : (lead.noFollowUp ? "No follow-up" : ""),
      "Notes": lead.notes || "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(workbook, "sales-crm-leads.xlsx");
  }

  function downloadSampleTemplate(format: "xlsx" | "csv") {
    const headers = [
      "Lead Name",
      "Company",
      "Email",
      "Phone",
      "Lead Source",
      "Status",
      "Priority",
      "Owner",
      "Next Follow-up",
      "Notes",
    ];

    const sampleRows = [
      [
        "John Doe",
        "Acme Corp",
        "john.doe@example.com",
        "5550192834",
        "Website",
        "NEW",
        "HIGH",
        "admin",
        "2026-11-15",
        "Interested in enterprise CRM platform",
      ],
      [
        "Jane Smith",
        "Global Logistics",
        "jane.smith@example.com",
        "5550149872",
        "Referral",
        "CONTACTED",
        "MEDIUM",
        "admin",
        "2026-11-20",
        "Requested callback next Tuesday",
      ],
    ];

    if (format === "csv") {
      const csvContent = [
        headers.join(","),
        ...sampleRows.map((row) =>
          row.map((val) => `"${val.replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "leads_import_template.csv";
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
      ws["!cols"] = [
        { wch: 18 },
        { wch: 20 },
        { wch: 26 },
        { wch: 18 },
        { wch: 15 },
        { wch: 18 },
        { wch: 12 },
        { wch: 14 },
        { wch: 35 },
        { wch: 16 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leads Template");
      XLSX.writeFile(wb, "leads_import_template.xlsx");
    }
  }

  async function handleFileFromModal(file: File) {
    setShowImportModal(false);
    try {
      setLoading(true);
      setApiError(null);
      const previewData = await previewLeadImportFile(file);
      if (!previewData.rows || previewData.rows.length === 0) {
        throw new Error("No data rows found in the selected file.");
      }
      setImportPreview({
        file,
        data: previewData,
      });
    } catch (err) {
      console.error("Preview failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to parse import file";
      setApiError(msg);
      setToastMessage({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }

  function triggerImport() {
    setShowImportModal(true);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      setApiError(null);
      const previewData = await previewLeadImportFile(file);
      if (!previewData.rows || previewData.rows.length === 0) {
        throw new Error("No data rows found in the selected file.");
      }
      setImportPreview({
        file,
        data: previewData,
      });
    } catch (err) {
      console.error("Preview failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to parse import file";
      setApiError(msg);
      setToastMessage({ type: "error", message: msg });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleConfirmImport() {
    if (!importPreview) return;
    try {
      const res = await confirmLeadImportRows(importPreview.data.rows);
      setImportPreview(null);
      await refreshLeads();
      setImportResult(res);
      if (res.created > 0) {
        setToastMessage({
          type: "success",
          message: `Imported ${res.created} lead${res.created === 1 ? "" : "s"}${
            res.duplicates > 0 ? ` (${res.duplicates} duplicates skipped)` : ""
          }`,
        });
      } else if (res.duplicates > 0) {
        setToastMessage({
          type: "error",
          message: `All ${res.duplicates} rows were duplicates and skipped.`,
        });
      }
    } catch (err) {
      console.error("Confirm import failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to import leads";
      setToastMessage({ type: "error", message: msg });
      throw err;
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
            onClick={refreshLeads}
            disabled={loading || refreshing}
            title="Refresh Leads"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RotateCw
              size={14}
              className={`text-slate-500 ${
                refreshing || loading ? "animate-spin text-blue-600" : ""
              }`}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus size={15} />
            Create Lead
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
              <div className="absolute right-0 top-9 z-50 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
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
                  Import Leads
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    triggerImport();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Upload size={14} className="text-[#1d61e7]" />
                  Import Leads
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Row (5 Cards) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* Total Leads */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-blue-500 bg-white p-3.5 sm:p-4 shadow-2xs min-w-0">
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
          <DynamicSparkline
            data={sparklineTrends.total}
            color="blue"
            gradientId="stat-dyn-total"
          />
        </div>

        {/* New Leads */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-emerald-500 bg-white p-3.5 sm:p-4 shadow-2xs min-w-0">
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
          <DynamicSparkline
            data={sparklineTrends.new}
            color="emerald"
            gradientId="stat-dyn-new"
          />
        </div>

        {/* Contacted */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-purple-500 bg-white p-3.5 sm:p-4 shadow-2xs min-w-0">
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
          <DynamicSparkline
            data={sparklineTrends.contacted}
            color="purple"
            gradientId="stat-dyn-contacted"
          />
        </div>

        {/* Qualified */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-amber-500 bg-white p-3.5 sm:p-4 shadow-2xs min-w-0">
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
          <DynamicSparkline
            data={sparklineTrends.qualified}
            color="amber"
            gradientId="stat-dyn-qualified"
          />
        </div>

        {/* Converted */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-emerald-500 bg-white p-3.5 sm:p-4 shadow-2xs min-w-0">
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
          <DynamicSparkline
            data={sparklineTrends.converted}
            color="emerald"
            gradientId="stat-dyn-converted"
          />
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
                  {availableStatuses.map(status => {
                    const checked = filters.status.includes(status);
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => toggleMultiFilter("status", status)}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs hover:bg-slate-50 text-slate-700 text-left cursor-pointer"
                      >
                        <span>{formatLabel(status)}</span>
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
                  {availablePriorities.map(priority => {
                    const checked = filters.priority.includes(priority);
                    return (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => toggleMultiFilter("priority", priority)}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs hover:bg-slate-50 text-slate-700 text-left cursor-pointer"
                      >
                        <span>{formatLabel(priority)}</span>
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

          <TableSettings
            columns={leadColumnOptions}
            hidden={hiddenColumns}
            onChange={setHiddenColumns}
          />
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
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => setDetailLead(lead)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                View details
              </button>
              <button
                type="button"
                onClick={() => setAssigningLead(lead)}
                className="w-full rounded px-3 py-2 text-left text-xs font-medium text-blue-600 hover:bg-blue-50 cursor-pointer flex items-center gap-1.5"
              >
                <UserCheck size={13} />
                <span>Assign lead</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingLead(lead)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 cursor-pointer"
              >
                <Pencil size={13} className="text-slate-400" />
                <span>Edit lead</span>
              </button>

              <div className="my-1 border-t border-slate-100" />
              <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Update Status
              </p>
              {availableStatuses.map(status => {
                const isSelected = lead.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => updateLeadStatus(lead.id, status)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 font-semibold text-blue-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{formatLabel(status)}</span>
                    {isSelected && <Check size={13} className="text-blue-600" />}
                  </button>
                );
              })}

              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => setDeletingLead(lead)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
              >
                <Trash2 size={13} className="text-rose-500" />
                <span>Delete lead</span>
              </button>
            </div>
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
          onClose={closeDetailLead}
          onEdit={() => {
            setEditingLead(detailLead);
            setDetailLead(null);
          }}
          onAssign={() => setAssigningLead(detailLead)}
        />
      )}

      {/* Assign Lead Dialog */}
      {assigningLead && (
        <AssignLeadDialog
          lead={assigningLead}
          owners={rawOwners}
          onClose={() => setAssigningLead(null)}
          onAssign={handleAssignLead}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-3 ${
            toastMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50/95 text-emerald-900 shadow-emerald-900/10"
              : "border-rose-200 bg-rose-50/95 text-rose-900 shadow-rose-900/10"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={17} className="text-rose-600 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toastMessage.message}</span>
        </div>
      )}

      {/* Delete Lead Confirmation Dialog */}
      <LeadDeleteDialog
        lead={deletingLead}
        isOpen={Boolean(deletingLead)}
        onClose={() => setDeletingLead(null)}
        onConfirm={handleConfirmDeleteLead}
      />

      {/* Import Modal with Template Prompt */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onFileSelect={handleFileFromModal}
        onDownloadTemplate={downloadSampleTemplate}
      />

      {/* Import Preview Modal */}
      {importPreview && (
        <ImportPreviewModal
          fileName={importPreview.file.name}
          previewData={importPreview.data}
          onClose={() => setImportPreview(null)}
          onConfirm={handleConfirmImport}
          onDownloadTemplate={downloadSampleTemplate}
        />
      )}

      {/* Import Result Dialog */}
      {importResult && (
        <div
          className="dialog-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => setImportResult(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Import Result"
            className="dialog-enter flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-3.5">
                <CheckCircle2 size={26} />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Import Completed
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Your leads file was processed successfully.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Imported</span>
                <p className="mt-1 text-base font-bold text-emerald-600">
                  {importResult.created}
                </p>
              </div>
              <div className="border-x border-slate-200/80">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Skipped</span>
                <p className="mt-1 text-base font-bold text-amber-600">
                  {importResult.duplicates}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Failed</span>
                <p className="mt-1 text-base font-bold text-slate-600">
                  {importResult.failed}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setImportResult(null)}
                className="w-full inline-flex items-center justify-center rounded-xl bg-[#1d61e7] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert Lead to Deal Dialog */}
      {convertLead && (
        <div
          className="dialog-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => setConvertLead(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Convert Lead to Deal"
            className="dialog-enter flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Convert Lead to Deal</h3>
                <p className="text-xs text-slate-500">Do you want to convert this lead into a deal? Please fill required details.</p>
              </div>
              <button
                type="button"
                onClick={() => setConvertLead(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Deal Name *</label>
                <input
                  value={convertForm.dealName}
                  onChange={(e) => setConvertForm({ ...convertForm, dealName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">Owner</label>
                  <select
                    value={convertForm.ownerId}
                    onChange={(e) => setConvertForm({ ...convertForm, ownerId: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Select owner</option>
                    {(dealOptionsForConvert?.users || []).map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Pipeline Stage</label>
                  <select
                    value={convertForm.stageId}
                    onChange={(e) => setConvertForm({ ...convertForm, stageId: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Default (first open stage)</option>
                    {(dealOptionsForConvert?.stages || []).filter((s:any)=>s.kind==='OPEN').map((s:any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">Estimated Value</label>
                  <input
                    type="number"
                    value={convertForm.estimatedValue}
                    onChange={(e) => setConvertForm({ ...convertForm, estimatedValue: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Expected Close Date</label>
                  <input
                    type="date"
                    value={convertForm.expectedCloseDate}
                    onChange={(e) => setConvertForm({ ...convertForm, expectedCloseDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={() => setConvertLead(null)}
                className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const extra: any = {};
                    if (convertForm.dealName) extra.dealName = convertForm.dealName;
                    if (convertForm.ownerId) extra.ownerId = Number(convertForm.ownerId);
                    if (convertForm.stageId) extra.stageId = Number(convertForm.stageId);
                    if (convertForm.estimatedValue !== "") extra.estimatedValue = Number(convertForm.estimatedValue);
                    if (convertForm.expectedCloseDate) extra.expectedCloseDate = convertForm.expectedCloseDate;
                    if (convertForm.productServiceId) extra.productServiceId = Number(convertForm.productServiceId);
                    if (convertForm.customerId) extra.customerId = Number(convertForm.customerId);
                    const updated = await updateLeadStatusApi(convertLead.id, "CONVERTED" as any, undefined, undefined, extra);
                    setLeads(previous => previous.map(l => l.id === convertLead.id ? updated : l));
                    setDetailLead(previous => previous?.id === convertLead.id ? updated : previous);
                    setConvertLead(null);
                  } catch (err: any) {
                    alert(err?.message || "Failed to convert lead");
                  }
                }}
                className="rounded-lg bg-[#1d61e7] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Convert to Deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
