import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  SlidersHorizontal,
  MoreHorizontal,
  Square,
  CheckSquare,
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
  type Lead,
  type LeadStatus,
  type Priority,
} from "../../components/ui/Createlead";

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
const systemFilters = [
  "Activities",
  "Cadences",
  "Campaigns",
  "Latest Email Status",
  "Locked",
  "Record Action",
  "Related Records Action",
  "Touched Records",
  "Untouched Records",
];
const fieldFilters = [
  "Address",
  "Address - City",
  "Address - Country / Region",
  "Lead Status",
  "Lead Owner",
  "Company",
  "Lead Source",
  "Priority",
  "Created Time",
];
function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function Checkbox({
checked,
onChange,
label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-label={label}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:text-blue-600"
    >
      {checked ? (
        <CheckSquare size={16} className="text-blue-600" />
      ) : (
        <Square size={16} />
      )}
    </button>
  );
}
function FilterSection({
title,
items,
}: {
  title: string;
  items: string[];
}) {
  const [expanded, setExpanded] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <section>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mb-2 flex w-full items-center gap-2 text-left text-xs font-semibold text-slate-700"
      >
        <ChevronDown
          size={14}
          className={`transition-transform ${expanded ? "" : "-rotate-90"}`}
        />
        <span>{title}</span>
      </button>
      {expanded && (
        <div className="space-y-1.5">
          {items.map(item => (
            <label
              key={item}
              className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(item)}
                onChange={() =>
                  setSelected(previous =>
                    previous.includes(item)
                      ? previous.filter(value => value !== item)
                      : [...previous, item],
                  )
                }
                className="mt-0.5 accent-blue-600"
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [sortNewest, setSortNewest] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [menuLeadId, setMenuLeadId] = useState<number | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
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
          (statusFilter === "ALL" || lead.status === statusFilter) &&
          (sourceFilter === "ALL" || lead.source === sourceFilter) &&
          (priorityFilter === "ALL" || lead.priority === priorityFilter)
        );
      })
      .sort((a, b) =>
        sortNewest
          ? b.createdAt.localeCompare(a.createdAt)
          : a.createdAt.localeCompare(b.createdAt),
      );
  }, [leads, search, statusFilter, sourceFilter, priorityFilter, sortNewest]);
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageLeads = filteredLeads.slice(startIndex, startIndex + pageSize);
  const selectedOnPage = pageLeads.every(lead =>
    selectedIds.includes(lead.id),
  );
  function toggleAll() {
    if (selectedOnPage) {
      setSelectedIds(previous =>
        previous.filter(id => !pageLeads.some(lead => lead.id === id)),
      );
    } else {
      setSelectedIds(previous =>
        Array.from(
          new Set([...previous, ...pageLeads.map(lead => lead.id)]),
        ),
      );
    }
  }
  function createLead(lead: Lead) {
    setLeads(previous => [lead, ...previous]);
    setShowCreateModal(false);
    setSearch("");
    setStatusFilter("ALL");
    setSourceFilter("ALL");
    setPriorityFilter("ALL");
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
    setMenuLeadId(null);
    setDetailLead(previous =>
      previous?.id === id ? { ...previous, status } : previous,
    );
  }
  function deleteLead(id: number) {
    setLeads(previous => previous.filter(lead => lead.id !== id));
    setSelectedIds(previous => previous.filter(item => item !== id));
    setMenuLeadId(null);
    setDetailLead(null);
  }
  function resetFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setSourceFilter("ALL");
    setPriorityFilter("ALL");
    setPage(1);
  }
  const hasActiveFilters =
    search !== "" ||
    statusFilter !== "ALL" ||
    sourceFilter !== "ALL" ||
    priorityFilter !== "ALL";
  const selectClass =
    "rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600 outline-none hover:border-slate-300 focus:border-blue-500";
  return (
    <div
      className="relative -m-4 min-h-[calc(100vh-64px)] bg-white text-slate-700 md:-m-8"
      onClick={() => {
        if (menuLeadId !== null) setMenuLeadId(null);
      }}
    >
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
      {/* Saved view row */}
      <div className="flex min-h-[42px] items-center justify-between border-b border-slate-200 px-5">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-slate-700"
        >
          All Leads
          <ChevronDown size={13} />
        </button>
        <span className="text-xs text-slate-400">
          Sales Workspace
        </span>
      </div>
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
          <button
            type="button"
            title="Table settings"
            className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <SlidersHorizontal size={15} />
          </button>
        </div>
      </div>
      {/* Main workspace */}
      <div className="flex h-[calc(100vh-220px)] min-h-0 items-stretch overflow-hidden">
        {/* Filter sidebar */}
        {showFilters && (
          <aside className="hidden h-full w-[210px] shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-slate-200 bg-white p-4 lg:flex">
            <h2 className="mb-3 text-xs font-semibold text-slate-800">
              Filter Leads by
            </h2>
            <div className="relative mb-5">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                placeholder="Search filters"
                className="w-full rounded-md border border-slate-200 py-2 pl-8 pr-2 text-xs outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-5">
              <FilterSection
                title="System Defined Filters"
                items={systemFilters}
              />
              <div className="border-t border-slate-100 pt-4">
                <FilterSection title="Filter By Fields" items={fieldFilters} />
              </div>
            </div>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-3 text-xs font-semibold text-slate-700">
                Quick Filters
              </p>
              <label className="mb-3 block text-[11px] text-slate-500">
                Lead Status
                <select
                  value={statusFilter}
                  onChange={e => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className={`${selectClass} mt-1.5 w-full`}
                >
                  <option value="ALL">All statuses</option>
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="DISQUALIFIED">Disqualified</option>
                  <option value="CONVERTED">Converted</option>
                </select>
              </label>
              <label className="mb-3 block text-[11px] text-slate-500">
                Lead Source
                <select
                  value={sourceFilter}
                  onChange={e => {
                    setSourceFilter(e.target.value);
                    setPage(1);
                  }}
                  className={`${selectClass} mt-1.5 w-full`}
                >
                  <option value="ALL">All sources</option>
                  {[...new Set(leads.map(lead => lead.source))].map(
                    source => (
                      <option key={source}>{source}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="block text-[11px] text-slate-500">
                Priority
                <select
                  value={priorityFilter}
                  onChange={e => {
                    setPriorityFilter(e.target.value);
                    setPage(1);
                  }}
                  className={`${selectClass} mt-1.5 w-full`}
                >
                  <option value="ALL">All priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </label>
            </div>
          </aside>
        )}
        {/* Leads table */}
        <section className="min-w-0 flex-1">
          {/* Mobile search */}
          <div className="border-b border-slate-100 p-3 sm:hidden">
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
            <div className="h-full overflow-auto">
              <table className="w-full min-w-[1050px] border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="w-10 px-3 py-3">
                      <Checkbox
                        checked={
                          pageLeads.length > 0 && selectedOnPage
                        }
                        onChange={toggleAll}
                        label="Select all visible leads"
                      />
                    </th>
                    {[
                      "Lead Name",
                      "Company",
                      "Email",
                      "Phone",
                      "Lead Source",
                      "Lead Owner",
                      "Lead Status",
                      "Priority",
                      "Created Time",
                    ].map(heading => (
                      <th
                        key={heading}
                        className="whitespace-nowrap border-l border-slate-200 px-3 py-3 text-[11px] font-semibold text-slate-600"
                      >
                        {heading}
                      </th>
                    ))}
                    <th className="w-10 border-l border-slate-200 px-3 py-3">
                      <SlidersHorizontal
                        size={14}
                        className="text-slate-500"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageLeads.map((lead, index) => (
                    <tr
                      key={lead.id}
                      onClick={() => setDetailLead(lead)}
                      className={`group cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50/50 ${
                        index % 2 === 1 ? "bg-slate-50/30" : "bg-white"
                      }`}
                    >
                      <td
                        className="px-3 py-3"
                        onClick={e => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedIds.includes(lead.id)}
                          onChange={() =>
                            setSelectedIds(previous =>
                              previous.includes(lead.id)
                                ? previous.filter(id => id !== lead.id)
                                : [...previous, lead.id],
                            )
                          }
                          label={`Select ${lead.firstName} ${lead.lastName}`}
                        />
                      </td>
                      <td className="min-w-[170px] px-3 py-3">
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
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Building2
                            size={13}
                            className="shrink-0 text-slate-400"
                          />
                          {lead.company}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">
                        <div className="flex max-w-[190px] items-center gap-2">
                          <Mail
                            size={13}
                            className="shrink-0 text-slate-400"
                          />
                          <span className="truncate">{lead.email || "—"}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Phone
                            size={13}
                            className="text-slate-400"
                          />
                          {lead.phone || "—"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600">
                        {lead.source}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-50 text-[9px] font-semibold text-violet-700">
                            GD
                          </div>
                          {lead.owner}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`whitespace-nowrap rounded px-2 py-1 text-[10px] font-medium ${statusStyles[lead.status]}`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`whitespace-nowrap text-[11px] font-medium ${priorityStyles[lead.priority]}`}
                        >
                          {lead.priority}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">
                        {formatDate(lead.createdAt)}
                      </td>
                      <td
                        className="relative px-3 py-3"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setMenuLeadId(
                              menuLeadId === lead.id ? null : lead.id,
                            )
                          }
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label="Lead actions"
                        >
                          <MoreHorizontal size={17} />
                        </button>
                        {menuLeadId === lead.id && (
                          <div className="absolute right-8 top-8 z-20 w-44 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
                            <button
                              type="button"
                              onClick={() => {
                                setDetailLead(lead);
                                setMenuLeadId(null);
                              }}
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
                                onClick={() =>
                                  updateLeadStatus(lead.id, status)
                                }
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
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {pageLeads.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-6 py-20 text-center">
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
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
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
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>
                Total Records{" "}
                <strong className="font-semibold text-slate-800">
                  {filteredLeads.length}
                </strong>
              </span>
              {selectedIds.length > 0 && (
                <span className="rounded bg-blue-50 px-2 py-1 text-blue-700">
                  {selectedIds.length} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
                Rows
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded border border-slate-200 bg-white px-2 py-1.5 outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>
              <span className="whitespace-nowrap text-xs text-slate-500">
                {filteredLeads.length === 0 ? 0 : startIndex + 1}–
                {Math.min(startIndex + pageSize, filteredLeads.length)} of{" "}
                {filteredLeads.length}
              </span>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(previous => Math.max(1, previous - 1))}
                className="rounded border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage(previous => Math.min(totalPages, previous + 1))
                }
                className="rounded border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </footer>
        </section>
      </div>
      {/* Lead detail panel */}
      {detailLead && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-slate-950/20"
          onClick={() => setDetailLead(null)}
        >
          <aside
            className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
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
            <div className="p-5">
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
          </aside>
        </div>
      )}
      {/* Create lead modal */}
      {showCreateModal && (
        <CreateLeadModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createLead}
        />
      )}
    </div>
  );
}
