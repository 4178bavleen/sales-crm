import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List,
  Download,
  Mail,
  Phone,
  UserRound,
  RotateCcw,
} from "lucide-react";
import type { Lead, LeadStatus } from "../../types/lead";
import { LEAD_PRIORITIES, LEAD_SOURCES, LEAD_STATUSES } from "../../types/lead";
import { initialLeads } from "../../data/leads";
import {
  leadColumns,
  leadColumnOptions,
  leadCsvFields,
} from "../../data/leadColumns";
import type { LeadsFilter } from "../../types/leadsPage";
import CreateLeadModal from "../../components/ui/Createlead";
import DataTable, {
  TablePagination,
} from "../../components/ui/DataTable";
import FilterSidebar, {
  type FilterCheckboxSection,
} from "../../components/ui/FilterSidebar";
import TableSettings from "../../components/ui/TableSettings";
import LeadDetailDialog from "../../components/ui/LeadDetailDialog";
import { StatusBadge } from "../../components/ui/LeadBadges";

// Filter state as one object: one setter, one reset, one dependency.
const emptyFilters: LeadsFilter = { status: [], priority: [], source: [] };

const toolbarButtonClass =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50";
const iconButtonClass = "rounded-md border p-2";
const iconButtonIdle =
  "border-slate-200 text-slate-500 hover:bg-slate-50";
const iconButtonActive = "border-blue-100 bg-blue-50 text-blue-600";
const searchInputClass =
  "rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:bg-white";

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<LeadsFilter>(emptyFilters);
  const [sortNewest, setSortNewest] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [view, setView] = useState<"list" | "grid">("list");
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  // Esc closes the lead detail dialog
  useEffect(() => {
    if (!detailLead) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDetailLead(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detailLead]);

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    // Only fields with a non-empty selection constrain the result.
    const active = (Object.keys(filters) as (keyof LeadsFilter)[]).filter(
      key => filters[key].length > 0,
    );
    return leads
      .filter(lead => {
        const matchesSearch = [
          lead.firstName,
          lead.lastName,
          lead.company,
          lead.email,
          lead.phone,
          lead.owner,
          lead.source,
        ].some(value => value.toLowerCase().includes(query));
        if (!matchesSearch) return false;
        return active.every(key =>
          (filters[key] as string[]).includes(lead[key]),
        );
      })
      .sort((a, b) =>
        sortNewest
          ? b.createdAt.localeCompare(a.createdAt)
          : a.createdAt.localeCompare(b.createdAt),
      );
  }, [leads, search, filters, sortNewest]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageLeads = filteredLeads.slice(startIndex, startIndex + pageSize);

  const visibleLeadColumns = useMemo(
    () => leadColumns.filter(column => !hiddenColumns.includes(column.key)),
    [hiddenColumns],
  );

  const hasActiveFilters =
    search !== "" || Object.values(filters).some(list => list.length > 0);

  function updateFilter(key: keyof LeadsFilter, values: string[]) {
    setFilters(previous => ({ ...previous, [key]: values }));
    setPage(1);
  }

  function resetFilters() {
    setSearch("");
    setFilters(emptyFilters);
    setPage(1);
  }

  function createLead(lead: Lead) {
    setLeads(previous => [lead, ...previous]);
    setShowCreateModal(false);
    resetFilters();
  }

  function updateLeadStatus(id: number, status: LeadStatus) {
    setLeads(previous =>
      previous.map(lead => (lead.id === id ? { ...lead, status } : lead)),
    );
    setDetailLead(previous =>
      previous?.id === id ? { ...previous, status } : previous,
    );
  }

  function deleteLead(id: number) {
    setLeads(previous => previous.filter(lead => lead.id !== id));
    setSelectedIds(previous => previous.filter(item => item !== id));
    setDetailLead(null);
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

  const filterSections: FilterCheckboxSection[] = [
    {
      title: "Lead Status",
      items: LEAD_STATUSES,
      selected: filters.status,
      onChange: values => updateFilter("status", values),
    },
    {
      title: "Priority",
      items: LEAD_PRIORITIES,
      selected: filters.priority,
      onChange: values => updateFilter("priority", values),
    },
    {
      title: "Lead Source",
      items: LEAD_SOURCES,
      selected: filters.source,
      onChange: values => updateFilter("source", values),
    },
  ];

  // Full-page create form replaces the list while open
  if (showCreateModal) {
    return (
      <div className="-m-4 md:-m-8">
        <CreateLeadModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createLead}
        />
      </div>
    );
  }

  return (
    <div className="relative -m-4 min-h-[calc(100vh-64px)] bg-white text-slate-700 md:-m-8">
      {/* Page header */}
      <header className="flex min-h-[54px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-slate-800">Leads</h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
            {filteredLeads.length} records
          </span>
        </div>
        <div className="flex items-center gap-2">
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
              className={`${searchInputClass} w-48 sm:w-56`}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-md border border-blue-500 bg-white px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            <Plus size={15} />
            Create Lead
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
          <button
            type="button"
            onClick={exportCsv}
            title="Export records"
            className={`${iconButtonClass} ${iconButtonIdle}`}
          >
            <Download size={15} />
          </button>
          <TableSettings
            columns={leadColumnOptions}
            hidden={hiddenColumns}
            onChange={setHiddenColumns}
          />
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex h-[calc(100vh-220px)] min-h-0 items-stretch overflow-hidden">
        {showFilters && (
          <FilterSidebar title="Filter Leads by" sections={filterSections} />
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
                placeholder="Search leads..."
                className={`${searchInputClass} w-full text-sm`}
              />
            </div>
          </div>

          {view === "list" ? (
            <DataTable<Lead>
              columns={visibleLeadColumns}
              rows={pageLeads}
              getRowId={lead => lead.id}
              onRowClick={lead => setDetailLead(lead)}
              selectable
              selectedIds={selectedIds}
              onSelectionChange={ids => setSelectedIds(ids as number[])}
              getRowLabel={lead => `${lead.firstName} ${lead.lastName}`}
              renderRowMenu={lead => (
                <>
                  <button
                    type="button"
                    onClick={() => setDetailLead(lead)}
                    className="w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-50"
                  >
                    View details
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
                        className="w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-50"
                      >
                        {status}
                      </button>
                    ),
                  )}
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
              }
            />
          ) : (
            <div className="grid min-h-0 flex-1 gap-3 overflow-auto p-4 sm:grid-cols-2 xl:grid-cols-3">
              {pageLeads.map(lead => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => setDetailLead(lead)}
                  className="rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                        {lead.firstName[0]}
                        {lead.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {lead.firstName} {lead.lastName}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {lead.company}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={lead.status} />
                  </div>
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    {(
                      [
                        { Icon: Mail, value: lead.email || "No email" },
                        { Icon: Phone, value: lead.phone || "No phone" },
                        { Icon: UserRound, value: lead.owner },
                      ] as const
                    ).map(({ Icon, value }, index) => (
                      <p key={index} className="flex items-center gap-2">
                        <Icon size={13} />
                        {value}
                      </p>
                    ))}
                  </div>
                </button>
              ))}
              {pageLeads.length === 0 && (
                <p className="col-span-full py-16 text-center text-sm text-slate-500">
                  No leads match your filters.
                </p>
              )}
            </div>
          )}

          <TablePagination
            total={filteredLeads.length}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={size => {
              setPageSize(size);
              setPage(1);
            }}
            selectedCount={selectedIds.length}
          />
        </section>
      </div>

      {detailLead && (
        <LeadDetailDialog
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onStatusChange={status => updateLeadStatus(detailLead.id, status)}
        />
      )}
    </div>
  );
}
