import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  CalendarDays,
  Download,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  RotateCw,
  Search,
  X,
} from "lucide-react";
import DataTable, { TablePagination } from "../../components/ui/DataTable";
import StatCard from "../../components/ui/StatCard";
import LogActivityModal from "../follow-ups/LogActivityModal";
import type { LogActivityValues } from "../follow-ups/types";
import type { DataTableColumn } from "../../types/dataTable";
import { ApiError, request } from "../../lib/api";
import { ENDPOINTS } from "../../lib/endpoints";
import { getSession } from "../../lib/auth";

type DatePreset = "today" | "7d" | "30d" | "90d" | "custom";
type OutcomeCategory = "connected" | "followup" | "unanswered" | "other";

type CallRecord = {
  id: number;
  occurredAt: string;
  outcome: string | null;
  notes: string | null;
  performedBy: { id: number; name: string } | null;
  lead: {
    id: number;
    contactName: string;
    companyName: string | null;
    status: string;
  } | null;
  deal: { id: number; name: string; status: string } | null;
  customer: { id: number } | null;
  company: { id: number; name: string } | null;
  task: { id: number; title: string; status: string } | null;
};

const OUTCOME_STYLES: Record<
  OutcomeCategory,
  { label: string; badge: string }
> = {
  connected: {
    label: "Connected",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  followup: {
    label: "Follow-up Needed",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
  },
  unanswered: {
    label: "No Answer",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
  },
  other: {
    label: "Logged",
    badge: "border-slate-200 bg-slate-50 text-slate-600",
  },
};

const EMPLOYEE_BADGE_COLORS = [
  "border-blue-200 bg-blue-50 text-blue-700",
  "border-emerald-200 bg-emerald-50 text-emerald-700",
  "border-violet-200 bg-violet-50 text-violet-700",
  "border-amber-200 bg-amber-50 text-amber-700",
  "border-rose-200 bg-rose-50 text-rose-700",
  "border-cyan-200 bg-cyan-50 text-cyan-700",
  "border-indigo-200 bg-indigo-50 text-indigo-700",
];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOutcomeCategory(outcome: string | null): OutcomeCategory {
  const text = (outcome ?? "").toLowerCase();

  if (/follow[- ]?up|callback|call back|next step/.test(text)) {
    return "followup";
  }
  if (/no answer|voicemail|busy|unreachable|not reachable|wrong number/.test(text)) {
    return "unanswered";
  }
  if (/connected|positive|interested|confirmed|meeting|demo|proposal sent/.test(text)) {
    return "connected";
  }
  return "other";
}

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .map(part => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function mapCall(item: any): CallRecord {
  return {
    id: item.id,
    occurredAt: item.occurredAt,
    outcome: item.outcome ?? null,
    notes: item.notes ?? null,
    performedBy: item.performedBy
      ? { id: item.performedBy.id, name: item.performedBy.name }
      : null,
    lead: item.lead
      ? {
          id: item.lead.id,
          contactName: item.lead.contactName,
          companyName: item.lead.companyName ?? null,
          status: item.lead.status,
        }
      : null,
    deal: item.deal
      ? { id: item.deal.id, name: item.deal.name, status: item.deal.status }
      : null,
    customer: item.customer ? { id: item.customer.id } : null,
    company: item.company
      ? { id: item.company.id, name: item.company.name }
      : null,
    task: item.task
      ? { id: item.task.id, title: item.task.title, status: item.task.status }
      : null,
  };
}

function LoggedByBadge({
  user,
}: {
  user: CallRecord["performedBy"];
}) {
  if (!user) {
    return <span className="text-xs font-medium text-slate-400">—</span>;
  }

  const color =
    EMPLOYEE_BADGE_COLORS[Math.abs(user.id) % EMPLOYEE_BADGE_COLORS.length];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${color}`}
    >
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/70 text-[8px] font-bold">
        {getInitials(user.name)}
      </span>
      <span className="max-w-[140px] truncate">{user.name}</span>
    </span>
  );
}

export default function DailyCalls() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [customStartDate, setCustomStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return toDateInput(date);
  });
  const [customEndDate, setCustomEndDate] = useState(() => toDateInput(new Date()));
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [showLogCall, setShowLogCall] = useState(false);
  const [leads, setLeads] = useState<
    { id: number; contactName: string; companyName?: string | null }[]
  >([]);
  const [deals, setDeals] = useState<{ id: number; name: string }[]>([]);

  const dateRange = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const start = new Date();

    if (datePreset === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (datePreset === "7d") {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else if (datePreset === "30d") {
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    } else if (datePreset === "90d") {
      start.setDate(start.getDate() - 89);
      start.setHours(0, 0, 0, 0);
    } else {
      const customStart = parseDateInput(customStartDate);
      const customEnd = parseDateInput(customEndDate);
      customStart.setHours(0, 0, 0, 0);
      customEnd.setHours(23, 59, 59, 999);

      if (
        !Number.isNaN(customStart.getTime()) &&
        !Number.isNaN(customEnd.getTime())
      ) {
        return { start: customStart, end: customEnd };
      }

      start.setHours(0, 0, 0, 0);
    }

    return { start, end };
  }, [datePreset, customStartDate, customEndDate]);

  const fetchCalls = useCallback(async () => {
    const token = getSession()?.token;
    if (!token) return;

    try {
      setLoading(true);
      setApiError(null);

      const params = new URLSearchParams({
        type: "CALL",
        limit: "500",
        dateFrom: dateRange.start.toISOString(),
        dateTo: dateRange.end.toISOString(),
      });

      const result = await request<{ items?: any[] }>(
        `${ENDPOINTS.activities.list}?${params.toString()}`,
        { token },
      );

      setCalls((result.items ?? []).map(mapCall));
    } catch (err) {
      setCalls([]);
      setApiError(
        err instanceof ApiError ? err.message : "Failed to load daily calls",
      );
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    void fetchCalls();
  }, [fetchCalls]);

  useEffect(() => {
    const token = getSession()?.token;
    if (!token) return;

    request<{
      leads?: { id: number; contactName: string; companyName?: string | null }[];
      deals?: { id: number; name: string }[];
    }>(ENDPOINTS.tasks.options, { token })
      .then(result => {
        setLeads(result.leads ?? []);
        setDeals(result.deals ?? []);
      })
      .catch(() => undefined);
  }, []);

  const agents = useMemo(() => {
    const map = new Map<number, string>();
    calls.forEach(call => {
      if (call.performedBy) map.set(call.performedBy.id, call.performedBy.name);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [calls]);

  const outcomes = useMemo(() => {
    const set = new Set<string>();
    calls.forEach(call => {
      if (call.outcome) set.add(call.outcome);
    });
    return Array.from(set).sort();
  }, [calls]);

  const filteredCalls = useMemo(() => {
    const query = search.trim().toLowerCase();

    return calls.filter(call => {
      if (
        agentFilter !== "all" &&
        String(call.performedBy?.id ?? "") !== agentFilter
      ) {
        return false;
      }

      if (outcomeFilter !== "all" && call.outcome !== outcomeFilter) {
        return false;
      }

      if (!query) return true;

      return [
        call.lead?.contactName,
        call.lead?.companyName,
        call.deal?.name,
        call.deal?.status,
        call.customer ? `customer ${call.customer.id}` : null,
        call.company?.name,
        call.task?.title,
        call.task?.status,
        call.outcome,
        call.notes,
        call.performedBy?.name,
      ].some(value => value?.toLowerCase().includes(query));
    });
  }, [calls, search, agentFilter, outcomeFilter]);

  const stats = useMemo(() => {
    const result = {
      total: calls.length,
      connected: 0,
      followup: 0,
      unanswered: 0,
    };

    for (const call of calls) {
      const category = getOutcomeCategory(call.outcome);
      if (category === "connected") result.connected++;
      else if (category === "followup") result.followup++;
      else if (category === "unanswered") result.unanswered++;
    }

    return result;
  }, [calls]);

  const sparklineTrends = useMemo(() => {
    const trends = {
      total: [0, 0, 0, 0, 0],
      connected: [0, 0, 0, 0, 0],
      followup: [0, 0, 0, 0, 0],
      unanswered: [0, 0, 0, 0, 0],
    };

    for (const call of calls) {
      const hour = new Date(call.occurredAt).getHours();
      const index = hour < 11 ? 0 : hour < 13 ? 1 : hour < 15 ? 2 : hour < 17 ? 3 : 4;
      trends.total[index]++;

      const category = getOutcomeCategory(call.outcome);
      if (category === "connected") trends.connected[index]++;
      else if (category === "followup") trends.followup[index]++;
      else if (category === "unanswered") trends.unanswered[index]++;
    }

    return trends;
  }, [calls]);

  const totalPages = Math.max(1, Math.ceil(filteredCalls.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCalls = filteredCalls.slice(startIndex, startIndex + pageSize);

  const columns = useMemo<DataTableColumn<CallRecord>[]>(() => {
    const hasLead = calls.some(call => call.lead);
    const hasDeal = calls.some(call => call.deal);
    const hasCustomer = calls.some(call => call.customer);
    const hasCompany = calls.some(call => call.company);
    const hasTask = calls.some(call => call.task);
    const hasOutcome = calls.some(call => call.outcome);
    const hasNotes = calls.some(call => call.notes?.trim());
    const hasPerformer = calls.some(call => call.performedBy);

    const result: DataTableColumn<CallRecord>[] = [
      {
        key: "dateTime",
        header: "Date / Time",
        className: "whitespace-nowrap",
        cell: call => (
          <div>
            <p className="text-xs font-bold text-slate-900">
              {formatDate(call.occurredAt)}
            </p>
            <p className="text-[11px] font-medium text-slate-400">
              {formatTime(call.occurredAt)}
            </p>
          </div>
        ),
      },
    ];

    if (hasLead) {
      result.push({
        key: "lead",
        header: "Lead",
        cell: call =>
          call.lead ? (
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-900">
                {call.lead.contactName}
              </p>
              <p className="truncate text-[10px] font-medium text-slate-400">
                {call.lead.companyName || call.lead.status}
              </p>
            </div>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          ),
      });
    }

    if (hasDeal) {
      result.push({
        key: "deal",
        header: "Deal",
        cell: call =>
          call.deal ? (
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-900">
                {call.deal.name}
              </p>
              <p className="text-[10px] font-medium text-slate-400">
                {call.deal.status}
              </p>
            </div>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          ),
      });
    }

    if (hasCustomer) {
      result.push({
        key: "customer",
        header: "Customer",
        cell: call =>
          call.customer ? (
            <span className="text-xs font-semibold text-slate-700">
              Customer #{call.customer.id}
            </span>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          ),
      });
    }

    if (hasCompany) {
      result.push({
        key: "company",
        header: "Company",
        cell: call =>
          call.company ? (
            <span className="text-xs font-semibold text-slate-700">
              {call.company.name}
            </span>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          ),
      });
    }

    if (hasTask) {
      result.push({
        key: "task",
        header: "Follow-up Task",
        cell: call =>
          call.task ? (
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-700">
                {call.task.title}
              </p>
              <p className="text-[10px] font-medium text-slate-400">
                {call.task.status}
              </p>
            </div>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          ),
      });
    }

    if (hasOutcome) {
      result.push({
        key: "outcome",
        header: "Outcome",
        cell: call => {
          const category = getOutcomeCategory(call.outcome);
          const style = OUTCOME_STYLES[category];
          return call.outcome ? (
            <div className="flex max-w-[240px] flex-col items-start gap-1">
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}
              >
                {style.label}
              </span>
              <span className="truncate text-[11px] font-medium text-slate-600">
                {call.outcome}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          );
        },
      });
    }

    if (hasNotes) {
      result.push({
        key: "notes",
        header: "Notes",
        cell: call => (
          <p
            className="max-w-[280px] truncate text-[11px] font-medium text-slate-600"
            title={call.notes || undefined}
          >
            {call.notes || "—"}
          </p>
        ),
      });
    }

    if (hasPerformer) {
      result.push({
        key: "loggedBy",
        header: "Logged By",
        cell: call => <LoggedByBadge user={call.performedBy} />,
      });
    }

    return result;
  }, [calls]);

  function choosePreset(preset: DatePreset) {
    setDatePreset(preset);
    setPage(1);
  }

  async function handleLogCall(values: LogActivityValues) {
    const token = getSession()?.token;
    if (!token) return;

    await request(ENDPOINTS.activities.create, {
      method: "POST",
      token,
      body: {
        type: "CALL",
        outcome: values.outcome || null,
        notes: values.notes || null,
        occurredAt: values.occurredAt,
        leadId: values.leadId ?? null,
        dealId: values.dealId ?? null,
      },
    });

    await fetchCalls();
  }

  function exportCalls() {
    if (filteredCalls.length === 0) return;

    const rows = filteredCalls.map(call => ({
      Date: formatDate(call.occurredAt),
      Time: formatTime(call.occurredAt),
      Lead: call.lead?.contactName ?? "",
      "Lead Company": call.lead?.companyName ?? "",
      Deal: call.deal?.name ?? "",
      Customer: call.customer ? `#${call.customer.id}` : "",
      Company: call.company?.name ?? "",
      "Follow-up Task": call.task?.title ?? "",
      Outcome: call.outcome ?? "",
      Notes: call.notes ?? "",
      "Logged By": call.performedBy?.name ?? "",
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Daily Calls");
    XLSX.writeFile(workbook, `daily-calls-${toDateInput(new Date())}.xlsx`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            <PhoneCall className="text-[#1d61e7]" size={26} />
            Daily Calls
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:mt-1">
            Call activity recorded against your CRM records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchCalls()}
            disabled={loading}
            title="Refresh calls"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 cursor-pointer"
          >
            <RotateCw size={15} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            type="button"
            onClick={exportCalls}
            disabled={filteredCalls.length === 0}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLogCall(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#1d61e7] px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 cursor-pointer"
          >
            <Phone size={15} />
            <span>Log Call</span>
          </button>
        </div>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <AlertTriangle size={16} className="shrink-0 text-rose-500" />
          <span>{apiError}</span>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "today", label: "Today" },
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
              { id: "90d", label: "90 Days" },
            ].map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => choosePreset(preset.id as DatePreset)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  datePreset === preset.id
                    ? "bg-[#1d61e7] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {preset.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowCustomPicker(current => !current)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                datePreset === "custom"
                  ? "border-[#1d61e7] bg-blue-50 text-[#1d61e7]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <CalendarDays size={13} />
              Custom
            </button>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={event => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search calls..."
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(current => !current)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                showFilters || agentFilter !== "all" || outcomeFilter !== "all"
                  ? "border-[#1d61e7] bg-blue-50 text-[#1d61e7]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Filters
            </button>
          </div>
        </div>

        {showCustomPicker && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
            <label className="flex items-center gap-2 text-xs">
              <span className="font-medium text-slate-500">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={event => {
                  if (!event.target.value) return;
                  setCustomStartDate(event.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-[#1d61e7] cursor-pointer"
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              <span className="font-medium text-slate-500">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={event => {
                  if (!event.target.value) return;
                  setCustomEndDate(event.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-[#1d61e7] cursor-pointer"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                choosePreset("custom");
                setShowCustomPicker(false);
              }}
              className="rounded-lg bg-[#1d61e7] px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-700 cursor-pointer"
            >
              Apply Range
            </button>
          </div>
        )}

        {showFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
            <label className="flex items-center gap-2 text-xs">
              <span className="font-medium text-slate-500">Logged by:</span>
              <select
                value={agentFilter}
                onChange={event => {
                  setAgentFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 outline-none focus:border-[#1d61e7] cursor-pointer"
              >
                <option value="all">All users</option>
                {agents.map(agent => (
                  <option key={agent.id} value={String(agent.id)}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs">
              <span className="font-medium text-slate-500">Outcome:</span>
              <select
                value={outcomeFilter}
                onChange={event => {
                  setOutcomeFilter(event.target.value);
                  setPage(1);
                }}
                className="max-w-[180px] rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 outline-none focus:border-[#1d61e7] cursor-pointer"
              >
                <option value="all">All outcomes</option>
                {outcomes.map(outcome => (
                  <option key={outcome} value={outcome}>
                    {outcome}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => {
                setAgentFilter("all");
                setOutcomeFilter("all");
                setSearch("");
                setPage(1);
              }}
              className="text-xs font-semibold text-rose-600 transition hover:text-rose-700 cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Calls"
          value={stats.total}
          subtext="Calls in selected range"
          icon={PhoneCall}
          color="blue"
          sparklineData={sparklineTrends.total}
          sparklineId="daily-calls-stat-total"
        />
        <StatCard
          label="Connected"
          value={stats.connected}
          subtext={
            stats.total > 0
              ? `${Math.round((stats.connected / stats.total) * 100)}% connect rate`
              : "No calls yet"
          }
          icon={PhoneIncoming}
          color="emerald"
          sparklineData={sparklineTrends.connected}
          sparklineId="daily-calls-stat-connected"
        />
        <StatCard
          label="Follow-up Needed"
          value={stats.followup}
          subtext="Based on logged outcome"
          icon={PhoneCall}
          color="amber"
          sparklineData={sparklineTrends.followup}
          sparklineId="daily-calls-stat-followup"
        />
        <StatCard
          label="No Answer"
          value={stats.unanswered}
          subtext="Based on logged outcome"
          icon={PhoneMissed}
          color="rose"
          sparklineData={sparklineTrends.unanswered}
          sparklineId="daily-calls-stat-unanswered"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Call Log</h2>
            <p className="text-[11px] font-medium text-slate-500">
              {filteredCalls.length} call{filteredCalls.length === 1 ? "" : "s"} shown
            </p>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            Only fields returned by the activities API are displayed
          </span>
        </div>

        <DataTable<CallRecord>
          columns={columns}
          rows={paginatedCalls}
          getRowId={call => call.id}
          onRowClick={call => setSelectedCall(call)}
          minWidth="min-w-[760px]"
          empty={
            <div className="flex flex-col items-center py-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#1d61e7]">
                <Phone size={22} />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {loading ? "Loading calls..." : "No calls found"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Try a different date range or adjust your filters.
              </p>
            </div>
          }
        />

        <TablePagination
          total={filteredCalls.length}
          page={currentPage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={size => {
            setPageSize(size);
            setPage(1);
          }}
          itemLabel="calls"
        />
      </div>

      {selectedCall && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-xs sm:p-4"
          onClick={() => setSelectedCall(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#1d61e7]">
                  <PhoneCall size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Call Details</h2>
                  <p className="text-[11px] text-slate-500">
                    {formatDate(selectedCall.occurredAt)} ·{" "}
                    {formatTime(selectedCall.occurredAt)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCall(null)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Logged By
                </p>
                <div className="mt-1">
                  <LoggedByBadge user={selectedCall.performedBy} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                {selectedCall.lead && (
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Lead
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {selectedCall.lead.contactName}
                    </p>
                    {selectedCall.lead.companyName && (
                      <p className="text-[11px] text-slate-500">
                        {selectedCall.lead.companyName}
                      </p>
                    )}
                  </div>
                )}

                {selectedCall.deal && (
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Deal
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {selectedCall.deal.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {selectedCall.deal.status}
                    </p>
                  </div>
                )}

                {selectedCall.customer && (
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Customer
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">
                      Customer #{selectedCall.customer.id}
                    </p>
                  </div>
                )}

                {selectedCall.company && (
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Company
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {selectedCall.company.name}
                    </p>
                  </div>
                )}

                {selectedCall.task && (
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Follow-up Task
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {selectedCall.task.title}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {selectedCall.task.status}
                    </p>
                  </div>
                )}
              </div>

              {selectedCall.outcome && (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Outcome
                  </p>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                      OUTCOME_STYLES[getOutcomeCategory(selectedCall.outcome)].badge
                    }`}
                  >
                    {selectedCall.outcome}
                  </span>
                </div>
              )}

              {selectedCall.notes && (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Notes
                  </p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                    {selectedCall.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setSelectedCall(null)}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <LogActivityModal
        isOpen={showLogCall}
        followUp={null}
        onClose={() => setShowLogCall(false)}
        onSave={handleLogCall}
        leads={leads}
        deals={deals}
        defaultType="CALL"
        lockType
        title="Log Call"
        subtitle="Record the outcome and details of this call"
      />
    </div>
  );
}
