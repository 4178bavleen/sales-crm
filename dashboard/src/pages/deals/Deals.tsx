import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List,
  Kanban,
  Download,
  CircleDollarSign,
  Layers,
  Package,
  RotateCcw,
} from "lucide-react";
import type { Deal, DealFormValues, DealStatus } from "../../types/deal";
import { DEAL_OWNERS, DEAL_PRODUCTS, PIPELINE_STAGE_ROWS } from "../../types/deal";
import { initialDeals, pipelineStages } from "../../data/deals";
import {
  dealColumns,
  dealColumnOptions,
  dealCsvFields,
  formatCurrency,
  statusLabels,
  statusStyles,
} from "../../data/dealColumns";
import type { DealsFilter, DealsQuickFilters } from "../../types/dealsPage";
import type { DealStageMove } from "../../types/dealUi";
import {
  stageKindByName,
  statusForStageKind,
} from "../../types/deal";
import DealForm from "../../components/ui/DealForm";
import DataTable, {
  TablePagination,
} from "../../components/ui/DataTable";
import FilterSidebar, {
  type FilterCheckboxSection,
  type FilterSelect,
} from "../../components/ui/FilterSidebar";
import TableSettings from "../../components/ui/TableSettings";
import DealDetailDialog from "../../components/ui/DealDetailDialog";
import DealMoveDialog from "../../components/ui/DealMoveDialog";
import PipelineBoard from "../../components/ui/PipelineBoard";

const STAGE_NAMES = PIPELINE_STAGE_ROWS.map(([name]) => name);

// Filter state as one object: one setter, one reset, one dependency.
const emptyFilters: DealsFilter = { stage: [], owner: [], product: [] };
const emptyQuickFilters: DealsQuickFilters = { status: "" };

const toolbarButtonClass =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50";
const iconButtonClass = "rounded-md border p-2";
const iconButtonIdle = "border-slate-200 text-slate-500 hover:bg-slate-50";
const iconButtonActive = "border-blue-100 bg-blue-50 text-blue-600";
const searchInputClass =
  "rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:bg-white";

const STATUS_OPTIONS: DealStatus[] = ["OPEN", "WON", "LOST"];

/** Form values -> the stored Deal, converting the numeric fields. */
function toDeal(id: number, values: DealFormValues, today: string): Deal {
  return {
    id,
    name: values.name,
    customer: values.customer,
    lead: values.lead,
    owner: values.owner,
    product: values.product,
    stage: values.stage,
    status: values.status,
    estimatedValue: Number(values.estimatedValue) || 0,
    expectedCloseDate: values.expectedCloseDate,
    nextAction: values.nextAction,
    wonRevenue: Number(values.wonRevenue) || 0,
    closedAt: values.closedAt,
    lostReason: values.lostReason,
    lostNote: values.lostNote,
    createdAt: today,
    updatedAt: today,
  };
}

/** Stored Deal -> form values (numbers become strings for the inputs). */
function toFormValues(deal: Deal): DealFormValues {
  return {
    name: deal.name,
    customer: deal.customer,
    lead: deal.lead,
    owner: deal.owner,
    product: deal.product,
    stage: deal.stage,
    status: deal.status,
    estimatedValue: deal.estimatedValue ? String(deal.estimatedValue) : "",
    expectedCloseDate: deal.expectedCloseDate,
    nextAction: deal.nextAction,
    wonRevenue: deal.wonRevenue ? String(deal.wonRevenue) : "",
    closedAt: deal.closedAt,
    lostReason: deal.lostReason,
    lostNote: deal.lostNote,
  };
}

export default function Deals() {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<DealsFilter>(emptyFilters);
  const [quickFilters, setQuickFilters] =
    useState<DealsQuickFilters>(emptyQuickFilters);
  const [sortNewest, setSortNewest] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  // Pipeline board is the default view for this page.
  const [view, setView] = useState<"list" | "grid" | "board">("board");
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailDeal, setDetailDeal] = useState<Deal | null>(null);
  // `null` = form closed; otherwise the values to seed the form with.
  const [formValues, setFormValues] = useState<DealFormValues | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formDealId, setFormDealId] = useState<number | null>(null);
  // A drop onto Won/Lost awaiting confirmation (extra schema fields needed).
  const [pendingMove, setPendingMove] = useState<DealStageMove | null>(null);

  // Esc closes the deal detail dialog
  useEffect(() => {
    if (!detailDeal) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDetailDeal(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detailDeal]);

  const filteredDeals = useMemo(() => {
    const query = search.trim().toLowerCase();
    const active = (Object.keys(filters) as (keyof DealsFilter)[]).filter(
      key => filters[key].length > 0,
    );
    return deals
      .filter(deal => {
        const matchesSearch = [
          deal.name,
          deal.customer,
          deal.lead,
          deal.owner,
          deal.product,
          deal.stage,
          deal.nextAction,
        ].some(value => value.toLowerCase().includes(query));
        if (!matchesSearch) return false;
        if (quickFilters.status && deal.status !== quickFilters.status) {
          return false;
        }
        return active.every(key =>
          (filters[key] as string[]).includes(deal[key]),
        );
      })
      .sort((a, b) =>
        sortNewest
          ? b.createdAt.localeCompare(a.createdAt)
          : a.createdAt.localeCompare(b.createdAt),
      );
  }, [deals, search, filters, quickFilters, sortNewest]);

  const totalPages = Math.max(1, Math.ceil(filteredDeals.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageDeals = filteredDeals.slice(startIndex, startIndex + pageSize);

  const visibleDealColumns = useMemo(
    () => dealColumns.filter(column => !hiddenColumns.includes(column.key)),
    [hiddenColumns],
  );

  // Pipeline headline numbers (over the filtered set, so they track the view).
  const pipelineTotal = filteredDeals
    .filter(deal => deal.status === "OPEN")
    .reduce((sum, deal) => sum + deal.estimatedValue, 0);
  const wonTotal = filteredDeals
    .filter(deal => deal.status === "WON")
    .reduce((sum, deal) => sum + deal.wonRevenue, 0);

  const hasActiveFilters =
    search !== "" ||
    Object.values(filters).some(list => list.length > 0) ||
    quickFilters.status !== "";

  function updateFilter(key: keyof DealsFilter, values: string[]) {
    setFilters(previous => ({ ...previous, [key]: values }));
    setPage(1);
  }

  function resetFilters() {
    setSearch("");
    setFilters(emptyFilters);
    setQuickFilters(emptyQuickFilters);
    setPage(1);
  }

  function openCreateForm() {
    setFormMode("create");
    setFormDealId(null);
    setFormValues({
      name: "",
      customer: "",
      lead: "",
      owner: DEAL_OWNERS[0] ?? "",
      product: "",
      stage: STAGE_NAMES[0] ?? "",
      status: "OPEN",
      estimatedValue: "",
      expectedCloseDate: "",
      nextAction: "",
      wonRevenue: "",
      closedAt: "",
      lostReason: "",
      lostNote: "",
    });
  }

  function openEditForm(deal: Deal) {
    setFormMode("edit");
    setFormDealId(deal.id);
    setFormValues(toFormValues(deal));
    setDetailDeal(null);
  }

  function saveDeal(values: DealFormValues) {
    const today = new Date().toISOString().slice(0, 10);
    if (formDealId === null) {
      const nextId =
        deals.reduce((max, deal) => Math.max(max, deal.id), 0) + 1;
      setDeals(previous => [toDeal(nextId, values, today), ...previous]);
      resetFilters();
    } else {
      setDeals(previous =>
        previous.map(deal =>
          deal.id === formDealId
            ? { ...toDeal(deal.id, values, deal.createdAt), updatedAt: today }
            : deal,
        ),
      );
    }
    setFormValues(null);
    setFormDealId(null);
  }

  function deleteDeal(id: number) {
    setDeals(previous => previous.filter(deal => deal.id !== id));
    setSelectedIds(previous => previous.filter(item => item !== id));
    setDetailDeal(null);
  }

  /**
   * Apply a stage change, keeping Deal.status consistent with the target
   * column's StageKind. Moving out of Won/Lost clears the fields that only
   * apply in those states, so a deal never carries contradictory data.
   */
  function applyStageMove(
    id: number,
    toStageName: string,
    details?: {
      wonRevenue: string;
      closedAt: string;
      lostReason: string;
      lostNote: string;
    },
  ) {
    const kind = stageKindByName(toStageName);
    const status = statusForStageKind(kind);
    const today = new Date().toISOString().slice(0, 10);

    setDeals(previous =>
      previous.map(deal => {
        if (deal.id !== id) return deal;
        return {
          ...deal,
          stage: toStageName,
          status,
          // Won-only fields
          wonRevenue:
            status === "WON"
              ? Number(details?.wonRevenue ?? deal.estimatedValue) || 0
              : 0,
          closedAt: status === "WON" ? details?.closedAt || today : "",
          // Lost-only fields
          lostReason: status === "LOST" ? details?.lostReason ?? "" : "",
          lostNote: status === "LOST" ? details?.lostNote ?? "" : "",
          updatedAt: today,
        };
      }),
    );
  }

  /** A card was dropped on a column. Terminal columns ask for confirmation. */
  function handleDropDeal(dealId: number, stageName: string) {
    const deal = deals.find(item => item.id === dealId);
    const toStage = pipelineStages.find(stage => stage.name === stageName);
    if (!deal || !toStage) return;
    if (deal.stage === stageName) return; // no-op drop

    if (toStage.kind === "OPEN") {
      // Ordinary progression — nothing extra to collect.
      applyStageMove(dealId, stageName);
      return;
    }
    // Won/Lost: confirm and collect the fields the schema expects.
    setPendingMove({ deal, toStage });
  }

  function exportCsv() {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [
      dealCsvFields.map(field => field.label),
      ...filteredDeals.map(deal => dealCsvFields.map(field => field.get(deal))),
    ]
      .map(row => row.map(escapeCsv).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "sales-crm-deals.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  // Distinct values present in the data, so filters never show dead options.
  const stageOptions = useMemo(() => {
    const present = new Set(deals.map(deal => deal.stage).filter(Boolean));
    return [
      ...STAGE_NAMES.filter(stage => present.has(stage)),
      ...[...present].filter(stage => !STAGE_NAMES.includes(stage)),
    ];
  }, [deals]);

  const ownerOptions = useMemo(() => {
    const present = new Set(deals.map(deal => deal.owner).filter(Boolean));
    return [
      ...DEAL_OWNERS.filter(owner => present.has(owner)),
      ...[...present].filter(owner => !DEAL_OWNERS.includes(owner)),
    ];
  }, [deals]);

  const productOptions = useMemo(() => {
    const present = new Set(deals.map(deal => deal.product).filter(Boolean));
    return [
      ...DEAL_PRODUCTS.filter(product => present.has(product)),
      ...[...present].filter(product => !DEAL_PRODUCTS.includes(product)),
    ];
  }, [deals]);

  const filterSections: FilterCheckboxSection[] = [
    {
      title: "Stage",
      items: stageOptions,
      selected: filters.stage,
      onChange: values => updateFilter("stage", values),
    },
    {
      title: "Owner",
      items: ownerOptions,
      selected: filters.owner,
      onChange: values => updateFilter("owner", values),
    },
    {
      title: "Product",
      items: productOptions,
      selected: filters.product,
      onChange: values => updateFilter("product", values),
    },
  ];

  // Status is a single-choice dimension, so it belongs in a dropdown, not checkboxes.
  const quickFilterSelects: FilterSelect[] = [
    {
      label: "Status",
      value: quickFilters.status,
      options: STATUS_OPTIONS.map(status => ({
        value: status,
        label: statusLabels[status],
      })),
      onChange: value => {
        setQuickFilters({ status: value as DealStatus | "" });
        setPage(1);
      },
    },
  ];

  // Full-page create/edit form replaces the list while open
  if (formValues) {
    return (
      <div className="-m-4 md:-m-8">
        <DealForm
          mode={formMode}
          values={formValues}
          onClose={() => {
            setFormValues(null);
            setFormDealId(null);
          }}
          onSubmit={saveDeal}
        />
      </div>
    );
  }

  return (
    <div className="relative -m-4 min-h-[calc(100vh-64px)] bg-white text-slate-700 md:-m-8">
      {/* Page header */}
      <header className="flex min-h-[54px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-slate-800">
            Deals &amp; Pipeline
          </h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
            {filteredDeals.length} records
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Pipeline headline: open pipeline value + won revenue */}
          <div className="hidden items-center gap-3 rounded-md border border-slate-200 px-3 py-1.5 lg:flex">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Layers size={13} className="text-blue-500" />
              Pipeline
              <b className="font-semibold text-slate-700">
                {formatCurrency(pipelineTotal)}
              </b>
            </span>
            <span className="h-4 w-px bg-slate-200" />
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <CircleDollarSign size={13} className="text-emerald-500" />
              Won
              <b className="font-semibold text-slate-700">
                {formatCurrency(wonTotal)}
              </b>
            </span>
          </div>
          <div className="relative hidden sm:block">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search records"
              className={`${searchInputClass} w-44 lg:w-52`}
            />
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-md border border-blue-500 bg-white px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            <Plus size={15} />
            Create Deal
          </button>
          <button
            type="button"
            onClick={exportCsv}
            title="Export CSV"
            className={`${iconButtonClass} ${iconButtonIdle}`}
          >
            <Download size={15} />
          </button>
        </div>
      </header>

      {/* Action toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`${toolbarButtonClass} ${
              showFilters ? "border-blue-100 bg-blue-50 text-blue-700" : ""
            }`}
          >
            <Filter size={14} />
            Filter
          </button>
          <button
            type="button"
            onClick={() => setSortNewest(!sortNewest)}
            className={toolbarButtonClass}
          >
            <ArrowUpDown size={14} />
            {sortNewest ? "Newest first" : "Oldest first"}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-xs text-blue-600 hover:bg-blue-50"
            >
              <RotateCcw size={13} />
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {(
            [
              { key: "list", title: "List view", Icon: List },
              { key: "grid", title: "Grid view", Icon: LayoutGrid },
              { key: "board", title: "Pipeline board", Icon: Kanban },
            ] as const
          ).map(({ key, title, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              title={title}
              className={`${iconButtonClass} ${
                view === key ? iconButtonActive : iconButtonIdle
              }`}
            >
              <Icon size={15} />
            </button>
          ))}
          <TableSettings
            columns={dealColumnOptions}
            hidden={hiddenColumns}
            onChange={setHiddenColumns}
          />
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex h-[calc(100vh-220px)] min-h-0 items-stretch overflow-hidden">
        {showFilters && (
          <FilterSidebar
            title="Filter Deals by"
            sections={filterSections}
            selects={quickFilterSelects}
          />
        )}

        <section className="flex min-w-0 flex-1 flex-col">
          {/* Mobile search */}
          <div className="shrink-0 border-b border-slate-100 p-3 sm:hidden">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search deals..."
                className={`${searchInputClass} w-full text-sm`}
              />
            </div>
          </div>

          {view === "list" && (
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
                    className="w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-50"
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditForm(deal)}
                    className="w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-50"
                  >
                    Edit deal
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => deleteDeal(deal.id)}
                    className="w-full rounded px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50"
                  >
                    Delete deal
                  </button>
                </>
              )}
              empty={
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Search size={20} className="text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No deals found
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
              }
            />
          )}

          {view === "grid" && (
            <div className="grid min-h-0 flex-1 gap-3 overflow-auto p-4 sm:grid-cols-2 xl:grid-cols-3">
              {pageDeals.map(deal => (
                <button
                  key={deal.id}
                  type="button"
                  onClick={() => setDetailDeal(deal)}
                  className="rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {deal.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {deal.customer || "No customer"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium ${
                        statusStyles[deal.status] ?? statusStyles.OPEN
                      }`}
                    >
                      {statusLabels[deal.status] ?? deal.status}
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-slate-800">
                    {formatCurrency(deal.estimatedValue)}
                  </p>
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    {(
                      [
                        { Icon: Layers, value: deal.stage || "No stage" },
                        { Icon: Package, value: deal.product || "No product" },
                      ] as const
                    ).map(({ Icon, value }, index) => (
                      <p key={index} className="flex items-center gap-2">
                        <Icon size={13} className="shrink-0" />
                        <span className="truncate">{value}</span>
                      </p>
                    ))}
                  </div>
                </button>
              ))}
              {pageDeals.length === 0 && (
                <p className="col-span-full py-16 text-center text-sm text-slate-500">
                  No deals match your filters.
                </p>
              )}
            </div>
          )}

          {view === "board" && (
            <PipelineBoard
              stages={pipelineStages}
              deals={filteredDeals}
              onCardClick={deal => setDetailDeal(deal)}
              onDropDeal={handleDropDeal}
            />
          )}

          {view !== "board" && (
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
          )}
        </section>
      </div>

      {detailDeal && (
        <DealDetailDialog
          deal={detailDeal}
          onClose={() => setDetailDeal(null)}
        />
      )}

      {pendingMove && (
        <DealMoveDialog
          move={pendingMove}
          onCancel={() => setPendingMove(null)}
          onConfirm={details => {
            applyStageMove(pendingMove.deal.id, pendingMove.toStage.name, details);
            setPendingMove(null);
          }}
        />
      )}
    </div>
  );
}
