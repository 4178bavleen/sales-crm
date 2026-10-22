import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Plus,
  ArrowUpDown,
  LayoutGrid,
  List,
  Kanban,
  Download,
  RotateCw,
  Layers,
  CircleDollarSign,
  Package,
  RotateCcw,
  Check,
  ChevronDown,
  Users,
  X,
  FileSpreadsheet,
  Calendar,
} from "lucide-react";
import type { Deal, DealFormValues, DealStatus, PipelineStage } from "../../types/deal";
import { PIPELINE_STAGE_ROWS } from "../../types/deal";
import type { DealOptionsData } from "../../types/dealForm";
import type { DealStageMove } from "../../types/dealUi";
import {
  dealColumns,
  dealColumnOptions,
  dealCsvFields,
  formatCurrency,
  formatDealDate,
  statusLabels,
  statusStyles,
} from "../../data/dealColumns";
import DealForm from "../../components/ui/DealForm";
import DataTable, { TablePagination } from "../../components/ui/DataTable";
import TableSettings from "../../components/ui/TableSettings";
import DealDetailDialog from "../../components/ui/DealDetailDialog";
import DealMoveDialog from "../../components/ui/DealMoveDialog";
import PipelineBoard from "../../components/ui/PipelineBoard";
import { request, ApiError } from "../../lib/api";
import { ENDPOINTS } from "../../lib/endpoints";
import { getSession } from "../../lib/auth";

type ApiDeal = {
  id: number;
  name: string;
  leadId: number | null;
  customerId: number | null;
  ownerId: number;
  createdById: number;
  productServiceId: number | null;
  stageId: number;
  status: DealStatus;
  estimatedValue: string | number;
  expectedCloseDate: string | null;
  nextAction: string | null;
  nextActionDueAt: string | null;
  stageEnteredAt: string;
  lastActivityAt: string | null;
  closedAt: string | null;
  closedRevenue: string | number | null;
  lostReasonId: number | null;
  lostNote: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: { id: number; name: string; email: string } | null;
  createdBy?: { id: number; name: string; email: string } | null;
  lead?: { id: number; contactName: string; companyName: string | null } | null;
  customer?: {
    id: number;
    companyId: number | null;
    primaryContactId: number | null;
    company?: { id: number; name: string } | null;
    primaryContact?: { id: number; fullName: string } | null;
  } | null;
  productService?: { id: number; name: string } | null;
  stage?: { id: number; name: string; position: number; kind: PipelineStage["kind"] } | null;
  lostReason?: { id: number; name: string } | null;
};

type DealsListResponse = {
  items: ApiDeal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function mapApiDeal(item: ApiDeal): Deal {
  return {
    id: item.id,
    name: item.name,
    customer:
      item.customer?.company?.name ||
      (item.customerId ? `Customer #${item.customerId}` : ""),
    customerId: item.customerId,
    lead: item.lead?.contactName || "",
    leadId: item.leadId,
    owner: item.owner?.name || "Unassigned",
    ownerId: item.ownerId,
    product: item.productService?.name || "",
    productServiceId: item.productServiceId,
    stage: item.stage?.name || "Qualified",
    stageId: item.stageId,
    status: item.status,
    estimatedValue: Number(item.estimatedValue) || 0,
    expectedCloseDate: item.expectedCloseDate
      ? item.expectedCloseDate.slice(0, 10)
      : "",
    nextAction: item.nextAction || "",
    wonRevenue: Number(item.closedRevenue) || 0,
    closedAt: item.closedAt ? item.closedAt.slice(0, 10) : "",
    lostReason: item.lostReason?.name || "",
    lostReasonId: item.lostReasonId,
    lostNote: item.lostNote || "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function toFormValues(deal: Deal): DealFormValues {
  return {
    name: deal.name,
    customer: deal.customer,
    customerId: deal.customerId,
    lead: deal.lead,
    leadId: deal.leadId,
    owner: deal.owner,
    ownerId: deal.ownerId,
    product: deal.product,
    productServiceId: deal.productServiceId,
    stage: deal.stage,
    stageId: deal.stageId,
    status: deal.status,
    estimatedValue: deal.estimatedValue ? String(deal.estimatedValue) : "",
    expectedCloseDate: deal.expectedCloseDate,
    nextAction: deal.nextAction,
    wonRevenue: deal.wonRevenue ? String(deal.wonRevenue) : "",
    closedAt: deal.closedAt,
    lostReason: deal.lostReason,
    lostReasonId: deal.lostReasonId,
    lostNote: deal.lostNote,
  };
}

const defaultStages: PipelineStage[] = PIPELINE_STAGE_ROWS.map(
  ([name, kind], index) => ({
    id: index + 1,
    name,
    position: index,
    kind,
  }),
);

export default function Deals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>(defaultStages);
  const [options, setOptions] = useState<DealOptionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DealStatus | "">("");
  const [stageFilter, setStageFilter] = useState<string>("");
  const [ownerFilter, setOwnerFilter] = useState<string>("");
  const [productFilter, setProductFilter] = useState<string>("");
  const [sortNewest, setSortNewest] = useState(true);

  // View state: PIPELINE VIEW (board) IS THE DEFAULT
  const [view, setView] = useState<"board" | "list" | "grid">("board");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [detailDeal, setDetailDeal] = useState<Deal | null>(null);
  const [formValues, setFormValues] = useState<DealFormValues | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formDealId, setFormDealId] = useState<number | null>(null);
  const [pendingMove, setPendingMove] = useState<DealStageMove | null>(null);

  // Dropdown states
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Fetch Options & Stages
  const loadOptions = useCallback(async () => {
    const token = getSession()?.token;
    if (!token) return;

    try {
      const res = await request<DealOptionsData>(ENDPOINTS.deals.options, {
        token,
      });
      setOptions(res);
      if (res.stages && res.stages.length > 0) {
        setStages(res.stages);
      }
    } catch {
      // Keep fallbacks
    }
  }, []);

  // Fetch Deals
  const refreshDeals = useCallback(async () => {
    const token = getSession()?.token;
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setApiError(null);

    try {
      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.set("search", search.trim());
      if (statusFilter) queryParams.set("status", statusFilter);
      queryParams.set("limit", "100"); // Load ample deals for pipeline board

      const url = `${ENDPOINTS.deals.list}?${queryParams.toString()}`;
      const res = await request<DealsListResponse>(url, { token });
      setDeals((res.items || []).map(mapApiDeal));
    } catch (err) {
      setApiError(
        err instanceof ApiError ? err.message : "Failed to load deals",
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    refreshDeals();
  }, [refreshDeals]);

  // Click outside listener for filter dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setActiveDropdown(null);
      }
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered deals
  const filteredDeals = useMemo(() => {
    const query = search.trim().toLowerCase();
    return deals
      .filter(deal => {
        if (
          query &&
          ![
            deal.name,
            deal.customer,
            deal.lead,
            deal.owner,
            deal.product,
            deal.stage,
            deal.nextAction,
          ].some(val => val.toLowerCase().includes(query))
        ) {
          return false;
        }
        if (statusFilter && deal.status !== statusFilter) return false;
        if (stageFilter && deal.stage !== stageFilter) return false;
        if (ownerFilter && deal.owner !== ownerFilter) return false;
        if (productFilter && deal.product !== productFilter) return false;
        return true;
      })
      .sort((a, b) =>
        sortNewest
          ? b.createdAt.localeCompare(a.createdAt)
          : a.createdAt.localeCompare(b.createdAt),
      );
  }, [
    deals,
    search,
    statusFilter,
    stageFilter,
    ownerFilter,
    productFilter,
    sortNewest,
  ]);

  // Pagination for List/Grid views
  const totalPages = Math.max(1, Math.ceil(filteredDeals.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageDeals = filteredDeals.slice(startIndex, startIndex + pageSize);

  const visibleDealColumns = useMemo(
    () => dealColumns.filter(column => !hiddenColumns.includes(column.key)),
    [hiddenColumns],
  );

  // Pipeline metrics
  const pipelineTotal = useMemo(
    () =>
      filteredDeals
        .filter(d => d.status === "OPEN")
        .reduce((sum, d) => sum + d.estimatedValue, 0),
    [filteredDeals],
  );

  const wonTotal = useMemo(
    () =>
      filteredDeals
        .filter(d => d.status === "WON")
        .reduce((sum, d) => sum + (d.wonRevenue || d.estimatedValue), 0),
    [filteredDeals],
  );

  const hasActiveFilters =
    search !== "" ||
    statusFilter !== "" ||
    stageFilter !== "" ||
    ownerFilter !== "" ||
    productFilter !== "";

  function resetFilters() {
    setSearch("");
    setStatusFilter("");
    setStageFilter("");
    setOwnerFilter("");
    setProductFilter("");
    setPage(1);
  }

  // Open Create Form
  function openCreateForm(initialStage?: string) {
    setFormMode("create");
    setFormDealId(null);
    setFormValues({
      name: "",
      customer: "",
      customerId: null,
      lead: "",
      leadId: null,
      owner: options?.users?.[0]?.name || "",
      ownerId: options?.users?.[0]?.id,
      product: "",
      productServiceId: null,
      stage: initialStage || stages[0]?.name || "Qualified",
      stageId: stages.find(s => s.name === initialStage)?.id || stages[0]?.id || 1,
      status: "OPEN",
      estimatedValue: "",
      expectedCloseDate: "",
      nextAction: "",
      wonRevenue: "",
      closedAt: "",
      lostReason: "",
      lostReasonId: null,
      lostNote: "",
    });
  }

  // Open Edit Form
  function openEditForm(deal: Deal) {
    setFormMode("edit");
    setFormDealId(deal.id);
    setFormValues(toFormValues(deal));
    setDetailDeal(null);
  }

  // Save Deal (Create or Update)
  async function saveDeal(values: DealFormValues) {
    const token = getSession()?.token;
    if (!token) return;

    try {
      if (formDealId === null) {
        // Create Deal
        const payload = {
          name: values.name,
          ownerId: values.ownerId || 1,
          stageId: values.stageId || 1,
          estimatedValue: Number(values.estimatedValue) || 0,
          leadId: values.leadId || undefined,
          customerId: values.customerId || undefined,
          productServiceId: values.productServiceId || undefined,
          expectedCloseDate: values.expectedCloseDate || undefined,
          nextAction: values.nextAction || undefined,
        };

        const res = await request<ApiDeal>(ENDPOINTS.deals.create, {
          method: "POST",
          token,
          body: payload,
        });

        // If status was chosen as WON or LOST during create, close it
        if (values.status === "WON" || values.status === "LOST") {
          const closePayload =
            values.status === "WON"
              ? { status: "WON", closedRevenue: Number(values.wonRevenue) || Number(values.estimatedValue) }
              : { status: "LOST", lostReasonId: values.lostReasonId || undefined, lostNote: values.lostNote };

          await request(ENDPOINTS.deals.close(res.id), {
            method: "PATCH",
            token,
            body: closePayload,
          });
        }
      } else {
        // Update Deal
        const payload = {
          name: values.name,
          ownerId: values.ownerId,
          stageId: values.stageId,
          estimatedValue: Number(values.estimatedValue) || 0,
          leadId: values.leadId || null,
          customerId: values.customerId || null,
          productServiceId: values.productServiceId || null,
          expectedCloseDate: values.expectedCloseDate || null,
          nextAction: values.nextAction || null,
        };

        await request(ENDPOINTS.deals.update(formDealId), {
          method: "PATCH",
          token,
          body: payload,
        });

        // Status update if changed to WON or LOST
        if (values.status === "WON" || values.status === "LOST") {
          const closePayload =
            values.status === "WON"
              ? { status: "WON", closedRevenue: Number(values.wonRevenue) || Number(values.estimatedValue) }
              : { status: "LOST", lostReasonId: values.lostReasonId || undefined, lostNote: values.lostNote };

          await request(ENDPOINTS.deals.close(formDealId), {
            method: "PATCH",
            token,
            body: closePayload,
          });
        }
      }

      setFormValues(null);
      setFormDealId(null);
      await refreshDeals();
    } catch (err: any) {
      setApiError(err instanceof ApiError ? err.message : "Failed to save deal");
      throw err;
    }
  }

  // Delete Deal
  async function deleteDeal(id: number) {
    const token = getSession()?.token;
    if (!token) return;

    try {
      await request(ENDPOINTS.deals.delete(id), {
        method: "DELETE",
        token,
      });
      setDeals(prev => prev.filter(d => d.id !== id));
      setSelectedIds(prev => prev.filter(item => item !== id));
      if (detailDeal?.id === id) setDetailDeal(null);
    } catch (err: any) {
      setApiError(err instanceof ApiError ? err.message : "Failed to delete deal");
    }
  }

  // Stage Move Handler
  async function applyStageMove(
    id: number,
    toStage: PipelineStage,
    details?: {
      wonRevenue: string;
      closedAt: string;
      lostReason: string;
      lostNote: string;
    },
  ) {
    const token = getSession()?.token;
    if (!token) return;

    try {
      if (toStage.kind === "OPEN") {
        // Move to Open stage
        const updated = await request<ApiDeal>(ENDPOINTS.deals.moveStage(id), {
          method: "PATCH",
          token,
          body: { stageId: toStage.id },
        });
        const mapped = mapApiDeal(updated);
        setDeals(prev => prev.map(d => (d.id === id ? mapped : d)));
        if (detailDeal?.id === id) setDetailDeal(mapped);
      } else {
        // Move to WON or LOST
        const deal = deals.find(d => d.id === id);
        const resolvedReason =
          options?.lostReasons?.find(r => r.name === details?.lostReason) ||
          options?.lostReasons?.[0];

        const closePayload =
          toStage.kind === "WON"
            ? {
                status: "WON",
                closedRevenue:
                  Number(details?.wonRevenue ?? deal?.estimatedValue) || 0,
              }
            : {
                status: "LOST",
                lostReasonId: resolvedReason?.id || 1,
                lostNote: details?.lostNote || "",
              };

        const updated = await request<ApiDeal>(ENDPOINTS.deals.close(id), {
          method: "PATCH",
          token,
          body: closePayload,
        });
        const mapped = mapApiDeal(updated);
        setDeals(prev => prev.map(d => (d.id === id ? mapped : d)));
        if (detailDeal?.id === id) setDetailDeal(mapped);
      }
    } catch (err: any) {
      setApiError(
        err instanceof ApiError ? err.message : "Failed to move deal stage",
      );
      await refreshDeals();
    }
  }

  // Handle Drag & Drop
  function handleDropDeal(dealId: number, targetStageName: string) {
    const deal = deals.find(item => item.id === dealId);
    const toStage = stages.find(s => s.name === targetStageName);
    if (!deal || !toStage) return;
    if (deal.stage === targetStageName) return; // no-op

    if (toStage.kind === "OPEN") {
      applyStageMove(dealId, toStage);
    } else {
      // Won or Lost requires confirmation dialog
      setPendingMove({ deal, toStage });
    }
  }

  // Export functions
  function exportCsv() {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [
      dealCsvFields.map(f => f.label),
      ...filteredDeals.map(d => dealCsvFields.map(f => f.get(d))),
    ]
      .map(row => row.map(escapeCsv).join(","))
      .join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `deals-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }

  function exportExcel() {
    const data = filteredDeals.map(d => {
      const row: Record<string, any> = {};
      dealCsvFields.forEach(f => {
        row[f.label] = f.get(d);
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Deals");
    XLSX.writeFile(
      workbook,
      `deals-export-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    setShowExportMenu(false);
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-slate-50/50">
      {/* Top Header */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Title & Stats */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Deals &amp; Pipeline
              </h1>
              <span className="flex h-5 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-600">
                {filteredDeals.length}
              </span>
            </div>

            {/* Quick Metrics */}
            <div className="hidden lg:flex items-center gap-2.5 ml-4 pl-4 border-l border-slate-200">
              <div className="flex items-center gap-2 rounded-lg bg-blue-50/60 px-3 py-1.5 border border-blue-100/80">
                <Layers size={13} className="text-[#1d61e7]" />
                <span className="text-xs text-slate-500 font-medium">Pipeline:</span>
                <span className="text-xs font-bold text-[#1d61e7]">
                  {formatCurrency(pipelineTotal)}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50/60 px-3 py-1.5 border border-emerald-100/80">
                <CircleDollarSign size={13} className="text-emerald-600" />
                <span className="text-xs text-slate-500 font-medium">Won:</span>
                <span className="text-xs font-bold text-emerald-700">
                  {formatCurrency(wonTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions & View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher: Board, List, Grid */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setView("board")}
                title="Pipeline Board"
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                  view === "board"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Kanban size={14} />
                <span className="hidden sm:inline">Board</span>
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                title="List View"
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                  view === "list"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <List size={14} />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                type="button"
                onClick={() => setView("grid")}
                title="Grid View"
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                  view === "grid"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">Grid</span>
              </button>
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => refreshDeals()}
              disabled={loading}
              title="Refresh deals"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-50 cursor-pointer"
            >
              <RotateCw size={15} className={loading ? "animate-spin" : ""} />
            </button>

            {/* Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown size={13} className="text-slate-400" />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1.5 z-40 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                  <button
                    type="button"
                    onClick={exportExcel}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <FileSpreadsheet size={15} className="text-emerald-600" />
                    Export to Excel
                  </button>
                  <button
                    type="button"
                    onClick={exportCsv}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Download size={15} className="text-blue-600" />
                    Export to CSV
                  </button>
                </div>
              )}
            </div>

            {/* Create Deal Button */}
            <button
              type="button"
              onClick={() => openCreateForm()}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-[#1d61e7] px-4 text-xs font-medium text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
            >
              <Plus size={16} />
              <span>Create Deal</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100" ref={dropdownRef}>
          {/* Search Input */}
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search deals, contacts, actions..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-8 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:bg-white focus:ring-2 focus:ring-blue-500/10"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Stage Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === "stage" ? null : "stage")
              }
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition cursor-pointer ${
                stageFilter
                  ? "border-blue-200 bg-blue-50/50 text-[#1d61e7]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Layers size={13} />
              <span>{stageFilter ? `Stage: ${stageFilter}` : "All Stages"}</span>
              <ChevronDown size={12} className="text-slate-400" />
            </button>
            {activeDropdown === "stage" && (
              <div className="absolute left-0 top-full mt-1.5 z-40 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setStageFilter("");
                    setActiveDropdown(null);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer ${
                    !stageFilter ? "bg-blue-50 text-[#1d61e7] font-medium" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>All Stages</span>
                  {!stageFilter && <Check size={13} />}
                </button>
                <div className="my-1 border-t border-slate-100" />
                {stages.map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setStageFilter(st.name);
                      setActiveDropdown(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer ${
                      stageFilter === st.name
                        ? "bg-blue-50 text-[#1d61e7] font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{st.name}</span>
                    {stageFilter === st.name && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === "status" ? null : "status")
              }
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition cursor-pointer ${
                statusFilter
                  ? "border-blue-200 bg-blue-50/50 text-[#1d61e7]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{statusFilter ? `Status: ${statusLabels[statusFilter]}` : "All Statuses"}</span>
              <ChevronDown size={12} className="text-slate-400" />
            </button>
            {activeDropdown === "status" && (
              <div className="absolute left-0 top-full mt-1.5 z-40 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("");
                    setActiveDropdown(null);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer ${
                    !statusFilter ? "bg-blue-50 text-[#1d61e7] font-medium" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>All Statuses</span>
                  {!statusFilter && <Check size={13} />}
                </button>
                {(["OPEN", "WON", "LOST"] as DealStatus[]).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setStatusFilter(st);
                      setActiveDropdown(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer ${
                      statusFilter === st
                        ? "bg-blue-50 text-[#1d61e7] font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{statusLabels[st]}</span>
                    {statusFilter === st && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Owner Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === "owner" ? null : "owner")
              }
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition cursor-pointer ${
                ownerFilter
                  ? "border-blue-200 bg-blue-50/50 text-[#1d61e7]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Users size={13} />
              <span>{ownerFilter ? `Owner: ${ownerFilter}` : "All Owners"}</span>
              <ChevronDown size={12} className="text-slate-400" />
            </button>
            {activeDropdown === "owner" && (
              <div className="absolute left-0 top-full mt-1.5 z-40 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setOwnerFilter("");
                    setActiveDropdown(null);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer ${
                    !ownerFilter ? "bg-blue-50 text-[#1d61e7] font-medium" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>All Owners</span>
                  {!ownerFilter && <Check size={13} />}
                </button>
                <div className="my-1 border-t border-slate-100" />
                {(options?.users || []).map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setOwnerFilter(u.name);
                      setActiveDropdown(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer ${
                      ownerFilter === u.name
                        ? "bg-blue-50 text-[#1d61e7] font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{u.name}</span>
                    {ownerFilter === u.name && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === "product" ? null : "product")
              }
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition cursor-pointer ${
                productFilter
                  ? "border-blue-200 bg-blue-50/50 text-[#1d61e7]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Package size={13} />
              <span>{productFilter ? `Product: ${productFilter}` : "All Products"}</span>
              <ChevronDown size={12} className="text-slate-400" />
            </button>
            {activeDropdown === "product" && (
              <div className="absolute left-0 top-full mt-1.5 z-40 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setProductFilter("");
                    setActiveDropdown(null);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer ${
                    !productFilter ? "bg-blue-50 text-[#1d61e7] font-medium" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>All Products</span>
                  {!productFilter && <Check size={13} />}
                </button>
                <div className="my-1 border-t border-slate-100" />
                {(options?.products || []).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProductFilter(p.name);
                      setActiveDropdown(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer ${
                      productFilter === p.name
                        ? "bg-blue-50 text-[#1d61e7] font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{p.name}</span>
                    {productFilter === p.name && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort Button */}
          <button
            type="button"
            onClick={() => setSortNewest(prev => !prev)}
            title="Toggle sort order"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            <ArrowUpDown size={12} />
            <span>{sortNewest ? "Newest" : "Oldest"}</span>
          </button>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}

          {/* Table column settings (for List view) */}
          {view === "list" && (
            <div className="ml-auto">
              <TableSettings
                columns={dealColumnOptions}
                hidden={hiddenColumns}
                onChange={setHiddenColumns}
              />
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {apiError && (
        <div className="shrink-0 flex items-center justify-between bg-rose-50 px-6 py-2.5 text-xs text-rose-700 border-b border-rose-200">
          <span>{apiError}</span>
          <button
            type="button"
            onClick={() => setApiError(null)}
            className="text-rose-500 hover:text-rose-800 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* 1. PIPELINE BOARD VIEW (DEFAULT) */}
        {view === "board" && (
          <PipelineBoard
            stages={stages}
            deals={filteredDeals}
            onCardClick={deal => setDetailDeal(deal)}
            onDropDeal={handleDropDeal}
            onEditDeal={openEditForm}
            onDeleteDeal={deleteDeal}
            onCreateInStage={openCreateForm}
          />
        )}

        {/* 2. LIST VIEW (DATA TABLE) */}
        {view === "list" && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <DataTable<Deal>
              columns={visibleDealColumns}
              rows={pageDeals}
              getRowId={deal => deal.id}
              onRowClick={deal => setDetailDeal(deal)}
              selectable
              selectedIds={selectedIds}
              onSelectionChange={ids => setSelectedIds(ids as number[])}
              getRowLabel={deal => deal.name}
              renderRowMenu={deal => (
                <>
                  <button
                    type="button"
                    onClick={() => setDetailDeal(deal)}
                    className="w-full rounded px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditForm(deal)}
                    className="w-full rounded px-3 py-2 text-left text-xs font-medium text-slate-800 hover:bg-slate-50 cursor-pointer"
                  >
                    Edit deal
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Move stage
                  </p>
                  {stages.map(st => (
                    <button
                      key={st.id}
                      type="button"
                      disabled={deal.stage === st.name}
                      onClick={() => handleDropDeal(deal.id, st.name)}
                      className="w-full rounded px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      {st.name}
                    </button>
                  ))}
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => deleteDeal(deal.id)}
                    className="w-full rounded px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    Delete deal
                  </button>
                </>
              )}
              empty={
                <div className="py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Search size={20} className="text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No deals found
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Try changing your search or filters.
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-3 text-xs font-medium text-[#1d61e7] hover:underline cursor-pointer"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              }
            />
            <TablePagination
              total={filteredDeals.length}
              page={currentPage}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={size => {
                setPageSize(size);
                setPage(1);
              }}
              selectedCount={selectedIds.length}
            />
          </div>
        )}

        {/* 3. GRID VIEW */}
        {view === "grid" && (
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pageDeals.map(deal => (
                <div
                  key={deal.id}
                  onClick={() => setDetailDeal(deal)}
                  className="rounded-2xl border border-slate-200/90 bg-white p-5 text-left shadow-xs transition hover:border-[#1d61e7]/60 hover:shadow-md cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {deal.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {deal.customer || deal.lead || "No associated contact"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          statusStyles[deal.status] ?? statusStyles.OPEN
                        }`}
                      >
                        {statusLabels[deal.status] ?? deal.status}
                      </span>
                    </div>

                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-slate-900">
                        {formatCurrency(deal.estimatedValue)}
                      </span>
                      <span className="text-xs text-slate-400">estimate</span>
                    </div>

                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Layers size={13} className="shrink-0 text-[#1d61e7]" />
                        <span className="truncate font-medium">{deal.stage}</span>
                      </div>
                      {deal.product && (
                        <div className="flex items-center gap-2">
                          <Package size={13} className="shrink-0 text-slate-400" />
                          <span className="truncate">{deal.product}</span>
                        </div>
                      )}
                      {deal.expectedCloseDate && (
                        <div className="flex items-center gap-2">
                          <Calendar size={13} className="shrink-0 text-slate-400" />
                          <span>Close: {formatDealDate(deal.expectedCloseDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span className="truncate font-medium">{deal.owner}</span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        openEditForm(deal);
                      }}
                      className="text-xs font-semibold text-[#1d61e7] hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {pageDeals.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-sm font-medium text-slate-700">No deals match your filters</p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-2 text-xs text-[#1d61e7] hover:underline"
                >
                  Reset filters
                </button>
              </div>
            )}

            <div className="mt-6">
              <TablePagination
                total={filteredDeals.length}
                page={currentPage}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={size => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      {detailDeal && (
        <DealDetailDialog
          deal={detailDeal}
          onClose={() => setDetailDeal(null)}
        />
      )}

      {/* Move Stage Dialog (Won / Lost) */}
      {pendingMove && (
        <DealMoveDialog
          move={pendingMove}
          onCancel={() => setPendingMove(null)}
          onConfirm={details => {
            applyStageMove(pendingMove.deal.id, pendingMove.toStage, details);
            setPendingMove(null);
          }}
        />
      )}

      {/* Create / Edit Deal Modal */}
      {formValues && (
        <DealForm
          mode={formMode}
          values={formValues}
          options={options || undefined}
          onClose={() => {
            setFormValues(null);
            setFormDealId(null);
          }}
          onSubmit={saveDeal}
        />
      )}
    </div>
  );
}
