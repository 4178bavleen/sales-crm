import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  ChevronDown,
  LayoutGrid,
  List,
  X,
  Download,
  CalendarDays,
  Building2,
  Mail,
  Phone,
  UserRound,
  Clock3,
  CircleHelp,
  RotateCcw,
} from "lucide-react";
import CreateLeadModal, {
  LEAD_SOURCES,
  type Lead,
  type LeadStatus,
  type Priority,
} from "../../components/ui/Createlead";
import DataTable, {
  type DataTableColumn,
  TablePagination,
} from "../../components/ui/DataTable";
import FilterSidebar from "../../components/ui/FilterSidebar";
import TableSettings from "../../components/ui/TableSettings";

const initialLeads: Lead[] = [
  {
    id: 1,
    firstName: "Christopher",
    lastName: "Maclead",
    company: "Rangoni Of Florence",
    email: "christopher@example.com",
    phone: "555-555-5555",
    source: "Cold Call",
    owner: "Gabriel Deora",
    status: "NEW",
    priority: "MEDIUM",
    createdAt: "2026-10-19",
  },
  {
    id: 2,
    firstName: "Carissa",
    lastName: "Kidman",
    company: "Oh My Goodknits Inc",
    email: "carissa@example.com",
    phone: "555-555-5555",
    source: "Advertisement",
    owner: "Gabriel Deora",
    status: "CONTACTED",
    priority: "HIGH",
    createdAt: "2026-10-19",
  },
  {
    id: 3,
    firstName: "James",
    lastName: "Merced",
    company: "Kwik Kopy Printing",
    email: "james@example.com",
    phone: "555-555-5555",
    source: "Web Download",
    owner: "Gabriel Deora",
    status: "QUALIFIED",
    priority: "HIGH",
    createdAt: "2026-10-18",
  },
  {
    id: 4,
    firstName: "Tresa",
    lastName: "Sweely",
    company: "Morlong Associates",
    email: "tresa@example.com",
    phone: "555-555-5555",
    source: "Seminar Partner",
    owner: "Gabriel Deora",
    status: "NEW",
    priority: "LOW",
    createdAt: "2026-10-17",
  },
  {
    id: 5,
    firstName: "Felix",
    lastName: "Hirpara",
    company: "Chapman",
    email: "felix@example.com",
    phone: "555-555-5555",
    source: "Online Store",
    owner: "Gabriel Deora",
    status: "CONTACTED",
    priority: "MEDIUM",
    createdAt: "2026-10-17",
  },
  {
    id: 6,
    firstName: "Kayleigh",
    lastName: "Lace",
    company: "Printing Dimensions",
    email: "kayleigh@example.com",
    phone: "555-555-5555",
    source: "Partner",
    owner: "Gabriel Deora",
    status: "QUALIFIED",
    priority: "URGENT",
    createdAt: "2026-10-16",
  },
  {
    id: 7,
    firstName: "Yvonne",
    lastName: "Tjepkema",
    company: "Grayson",
    email: "yvonne@example.com",
    phone: "555-555-5555",
    source: "External Referral",
    owner: "Gabriel Deora",
    status: "NEW",
    priority: "MEDIUM",
    createdAt: "2026-10-15",
  },
  {
    id: 8,
    firstName: "Michael",
    lastName: "Ruta",
    company: "Buckley Miller & Wright",
    email: "michael@example.com",
    phone: "555-555-5555",
    source: "Online Store",
    owner: "Gabriel Deora",
    status: "CONVERTED",
    priority: "LOW",
    createdAt: "2026-10-14",
  },
  {
    id: 9,
    firstName: "Theola",
    lastName: "Frey",
    company: "Dal Tile Corporation",
    email: "theola@example.com",
    phone: "555-555-5555",
    source: "Cold Call",
    owner: "Gabriel Deora",
    status: "CONTACTED",
    priority: "HIGH",
    createdAt: "2026-10-13",
  },
  {
    id: 10,
    firstName: "Chau",
    lastName: "Kitzman",
    company: "Creative Business Systems",
    email: "chau@example.com",
    phone: "555-555-5555",
    source: "Advertisement",
    owner: "Gabriel Deora",
    status: "DISQUALIFIED",
    priority: "LOW",
    createdAt: "2026-10-12",
  },
];
const statusStyles: Record<LeadStatus, string> = {
  NEW: "bg-slate-100 text-slate-700",
  CONTACTED: "bg-blue-50 text-blue-700",
  QUALIFIED: "bg-emerald-50 text-emerald-700",
  DISQUALIFIED: "bg-rose-50 text-rose-700",
  CONVERTED: "bg-violet-50 text-violet-700",
};
const priorityStyles: Record<Priority, string> = {
  LOW: "text-slate-500",
  MEDIUM: "text-blue-600",
  HIGH: "text-orange-600",
  URGENT: "text-rose-600",
};
// Aligned with the backend schema (backend/prisma/schema.prisma):
// LeadStatus and Priority enums, LeadSource lookup table, Lead.owner (User)
const statusOptions: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "DISQUALIFIED",
  "CONVERTED",
];
const priorityOptions: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
const leadColumns: DataTableColumn<Lead>[] = [
  {
    key: "name",
    header: "Lead Name",
    className: "min-w-[170px]",
    cell: lead => (
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">
          {lead.firstName[0]}
          {lead.lastName[0]}
        </div>
        <div>
          <p className="text-xs font-medium text-blue-600 group-hover:text-blue-800">
            {lead.firstName} {lead.lastName}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            Lead #{lead.id}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "company",
    header: "Company",
    className: "text-xs text-slate-600",
    cell: lead => (
      <div className="flex items-center gap-2">
        <Building2 size={13} className="shrink-0 text-slate-400" />
        {lead.company}
      </div>
    ),
  },
  {
    key: "email",
    header: "Email",
    className: "text-xs text-slate-500",
    cell: lead => (
      <div className="flex max-w-[190px] items-center gap-2">
        <Mail size={13} className="shrink-0 text-slate-400" />
        <span className="truncate">{lead.email || "—"}</span>
      </div>
    ),
  },
  {
    key: "phone",
    header: "Phone",
    className: "whitespace-nowrap text-xs text-slate-600",
    cell: lead => (
      <div className="flex items-center gap-2">
        <Phone size={13} className="text-slate-400" />
        {lead.phone || "—"}
      </div>
    ),
  },
  {
    key: "source",
    header: "Lead Source",
    className: "whitespace-nowrap text-xs text-slate-600",
    cell: lead => lead.source,
  },
  {
    key: "owner",
    header: "Lead Owner",
    className: "whitespace-nowrap text-xs text-slate-600",
    cell: lead => (
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-50 text-[9px] font-semibold text-violet-700">
          GD
        </div>
        {lead.owner}
      </div>
    ),
  },
  {
    key: "status",
    header: "Lead Status",
    cell: lead => (
      <span
        className={`whitespace-nowrap rounded px-2 py-1 text-[10px] font-medium ${statusStyles[lead.status]}`}
      >
        {lead.status}
      </span>
    ),
  },
  {
    key: "priority",
    header: "Priority",
    cell: lead => (
      <span
        className={`whitespace-nowrap text-[11px] font-medium ${priorityStyles[lead.priority]}`}
      >
        {lead.priority}
      </span>
    ),
  },
  {
    key: "createdAt",
    header: "Created Time",
    className: "whitespace-nowrap text-xs text-slate-500",
    cell: lead => formatDate(lead.createdAt),
  },
];
export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState("");
  // Checkbox filters for the schema fields shown in FilterSidebar
  const [statusChecks, setStatusChecks] = useState<string[]>([]);
  const [priorityChecks, setPriorityChecks] = useState<string[]>([]);
  const [sourceChecks, setSourceChecks] = useState<string[]>([]);
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
        return (
          matchesSearch &&
          (statusChecks.length === 0 || statusChecks.includes(lead.status)) &&
          (priorityChecks.length === 0 ||
            priorityChecks.includes(lead.priority)) &&
          (sourceChecks.length === 0 || sourceChecks.includes(lead.source))
        );
      })
      .sort((a, b) =>
        sortNewest
          ? b.createdAt.localeCompare(a.createdAt)
          : a.createdAt.localeCompare(b.createdAt),
      );
  }, [
    leads,
    search,
    statusChecks,
    priorityChecks,
    sourceChecks,
    sortNewest,
  ]);
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageLeads = filteredLeads.slice(startIndex, startIndex + pageSize);
  function createLead(lead: Lead) {
    setLeads(previous => [lead, ...previous]);
    setShowCreateModal(false);
    setSearch("");
    setStatusChecks([]);
    setPriorityChecks([]);
    setSourceChecks([]);
    setPage(1);
  }
  function exportCsv() {
    const headers = [
      "First Name",
      "Last Name",
      "Company",
      "Email",
      "Phone",
      "Lead Source",
      "Lead Owner",
      "Lead Status",
      "Priority",
      "Created At",
    ];
    const rows = filteredLeads.map(lead => [
      lead.firstName,
      lead.lastName,
      lead.company,
      lead.email,
      lead.phone,
      lead.source,
      lead.owner,
      lead.status,
      lead.priority,
      lead.createdAt,
    ]);
    const escapeCsv = (value: string) =>
      `"${value.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows]
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
  function resetFilters() {
    setSearch("");
    setStatusChecks([]);
    setPriorityChecks([]);
    setSourceChecks([]);
    setPage(1);
  }
  const hasActiveFilters =
    search !== "" ||
    statusChecks.length > 0 ||
    priorityChecks.length > 0 ||
    sourceChecks.length > 0;
  const visibleLeadColumns = leadColumns.filter(
    column => !hiddenColumns.includes(column.key),
  );
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
              className="w-48 rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:bg-white sm:w-56"
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
            className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
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
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs ${
              showFilters
                ? "border-blue-100 bg-blue-50 text-blue-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Filter size={14} />
            Filter
          </button>
          <button
            type="button"
            onClick={() => setSortNewest(!sortNewest)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
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
          <button
            type="button"
            onClick={() => setView("list")}
            title="List view"
            className={`rounded-md border p-2 ${
              view === "list"
                ? "border-blue-100 bg-blue-50 text-blue-600"
                : "border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            <List size={15} />
          </button>
          <button
            type="button"
            onClick={() => setView("grid")}
            title="Grid view"
            className={`rounded-md border p-2 ${
              view === "grid"
                ? "border-blue-100 bg-blue-50 text-blue-600"
                : "border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            type="button"
            onClick={exportCsv}
            title="Export records"
            className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <Download size={15} />
          </button>
          <TableSettings
            columns={leadColumns.map(column => ({
              key: column.key,
              label: String(column.header),
            }))}
            hidden={hiddenColumns}
            onChange={setHiddenColumns}
          />
        </div>
      </div>
      {/* Main workspace */}
      <div className="flex h-[calc(100vh-220px)] min-h-0 items-stretch overflow-hidden">
        {/* Filter sidebar */}
        {showFilters && (
          <FilterSidebar
            title="Filter Leads by"
            sections={[
              {
                title: "Lead Status",
                items: statusOptions,
                selected: statusChecks,
                onChange: setStatusChecks,
              },
              {
                title: "Priority",
                items: priorityOptions,
                selected: priorityChecks,
                onChange: setPriorityChecks,
              },
              {
                title: "Lead Source",
                items: LEAD_SOURCES,
                selected: sourceChecks,
                onChange: setSourceChecks,
              },
            ]}
          />
        )}
        {/* Leads table */}
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
                className="w-full rounded-md border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
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
                  {(
                    [
                      "NEW",
                      "CONTACTED",
                      "QUALIFIED",
                      "CONVERTED",
                    ] as LeadStatus[]
                  ).map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateLeadStatus(lead.id, status)}
                      className="w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-50"
                    >
                      {status}
                    </button>
                  ))}
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
            <div className="min-h-0 flex-1 overflow-auto grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
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
                    <span
                      className={`rounded px-2 py-1 text-[10px] font-medium ${statusStyles[lead.status]}`}
                    >
                      {lead.status}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <p className="flex items-center gap-2">
                      <Mail size={13} />
                      {lead.email || "No email"}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone size={13} />
                      {lead.phone || "No phone"}
                    </p>
                    <p className="flex items-center gap-2">
                      <UserRound size={13} />
                      {lead.owner}
                    </p>
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
          {/* Pagination */}
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
      {/* Lead detail dialog (centered modal) */}
      {detailLead && (
        <div
          className="dialog-overlay-in fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => setDetailLead(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Lead details"
            className="dialog-enter flex h-[min(85vh,640px,90vw)] w-[min(85vh,640px,90vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs text-slate-500">Lead details</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-800">
                  {detailLead.firstName} {detailLead.lastName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailLead(null)}
                className="rounded-md p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {detailLead.firstName[0]}
                  {detailLead.lastName[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">
                    {detailLead.firstName} {detailLead.lastName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {detailLead.company}
                  </p>
                  <span
                    className={`mt-2 inline-flex rounded px-2 py-1 text-[10px] font-medium ${statusStyles[detailLead.status]}`}
                  >
                    {detailLead.status}
                  </span>
                </div>
              </div>
              <h3 className="mb-4 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Contact information
              </h3>
              {[
                {
                  label: "Company",
                  value: detailLead.company,
                  Icon: Building2,
                },
                { label: "Email", value: detailLead.email || "—", Icon: Mail },
                { label: "Phone", value: detailLead.phone || "—", Icon: Phone },
                {
                  label: "Lead Owner",
                  value: detailLead.owner,
                  Icon: UserRound,
                },
                {
                  label: "Lead Source",
                  value: detailLead.source,
                  Icon: CircleHelp,
                },
                {
                  label: "Created Time",
                  value: formatDate(detailLead.createdAt),
                  Icon: CalendarDays,
                },
                {
                  label: "Priority",
                  value: detailLead.priority,
                  Icon: Clock3,
                },
              ].map(({ label, value, Icon }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 border-b border-slate-100 py-3"
                >
                  <Icon size={16} className="mt-0.5 text-slate-400" />
                  <div>
                    <p className="text-[11px] text-slate-400">{label}</p>
                    <p className="mt-1 break-words text-sm text-slate-700">
                      {value}
                    </p>
                  </div>
                </div>
              ))}
              <label className="mt-5 block text-xs font-medium text-slate-600">
                Update lead status
                <select
                  value={detailLead.status}
                  onChange={e =>
                    updateLeadStatus(
                      detailLead.id,
                      e.target.value as LeadStatus,
                    )
                  }
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  {(
                    [
                      "NEW",
                      "CONTACTED",
                      "QUALIFIED",
                      "DISQUALIFIED",
                      "CONVERTED",
                    ] as LeadStatus[]
                  ).map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
