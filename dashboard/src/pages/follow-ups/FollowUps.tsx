import { useEffect, useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Plus,
  RotateCw,
  Download,
  CalendarClock,
  Clock,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Trash2,
  Check,
  LayoutGrid,
  List,
  Users,
  Building2,
  Activity as ActivityIcon,
  UserRound,
} from "lucide-react";
import type {
  FollowUp,
  FollowUpStats,
  FollowUpTab,
  FollowUpFormValues,
  LogActivityValues,
} from "./types";
import {
  formatDateTime,
  priorityStyles,
  priorityLabels,
  statusStyles,
  statusLabels,
  dueBucketConfig,
  getDueBucket,
} from "./followUpColumns";
import FollowUpModal from "./FollowUpModal";
import RescheduleModal from "./RescheduleModal";
import CompleteModal from "./CompleteModal";
import LogActivityModal from "./LogActivityModal";
import FollowUpDetailDialog from "./FollowUpDetailDialog";
import DataTable, { TablePagination } from "../../components/ui/DataTable";
import StatCard from "../../components/ui/StatCard";
import { request, ApiError } from "../../lib/api";
import { ENDPOINTS } from "../../lib/endpoints";
import { getSession } from "../../lib/auth";
import { useSession } from "../../lib/useSession";

function mapApiFollowUp(item: any): FollowUp {
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    assignedTo: item.assignedTo?.name ?? "",
    assignedToId: item.assignedToId,
    createdBy: item.createdBy?.name ?? "",
    createdById: item.createdById,
    dueAt: item.dueAt || "",
    priority: item.priority,
    status: item.status,
    completedAt: item.completedAt || null,
    completedBy: item.completedBy?.name ?? "",
    completionNote: item.completionNote ?? null,
    cancelReason: item.cancelReason?.name ?? null,
    rescheduleCount: item.rescheduleCount ?? 0,
    lead: item.lead?.contactName ?? "",
    leadId: item.lead?.id ?? null,
    deal: item.deal?.name ?? "",
    dealId: item.deal?.id ?? null,
    customer: item.customer ? `Customer #${item.customer.id}` : "",
    customerId: item.customer?.id ?? null,
    company: item.company?.name ?? "",
    companyId: item.company?.id ?? null,
    meeting: item.meeting?.title ?? "",
    meetingId: item.meeting?.id ?? null,
    rescheduleHistory: item.rescheduleHistory || [],
    activities: item.activities || [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export default function FollowUps() {
  const session = useSession();
  const currentUser = session?.user;
  const userRole = currentUser?.role?.toUpperCase();
  const isAdmin = userRole === "ADMIN" || userRole === "SALES_MANAGER";

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [stats, setStats] = useState<FollowUpStats>({
    dueToday: 0,
    overdue: 0,
    upcoming: 0,
    completed: 0,
    all: 0,
  });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<FollowUpTab>("all");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [reschedulingTask, setReschedulingTask] = useState<FollowUp | null>(null);
  const [completingTask, setCompletingTask] = useState<FollowUp | null>(null);
  const [loggingActivityTask, setLoggingActivityTask] = useState<FollowUp | null>(null);
  const [showGlobalLogActivity, setShowGlobalLogActivity] = useState(false);
  const [detailTask, setDetailTask] = useState<FollowUp | null>(null);

  // Options from backend
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
  const [leads, setLeads] = useState<{ id: number; contactName: string; companyName?: string | null }[]>([]);
  const [deals, setDeals] = useState<{ id: number; name: string }[]>([]);

  // Fetch follow-ups based on active tab
  const fetchFollowUps = useCallback(async () => {
    const token = getSession()?.token;
    if (!token) return;

    try {
      setLoading(true);
      setApiError(null);

      // 1. Prepare query parameters
      const queryParams = new URLSearchParams();
      queryParams.set("limit", "100");

      if (activeTab === "today") queryParams.set("followUpView", "today");
      else if (activeTab === "overdue") queryParams.set("followUpView", "overdue");
      else if (activeTab === "upcoming") queryParams.set("followUpView", "upcoming");
      else if (activeTab === "completed") queryParams.set("followUpView", "completed");

      // 2. Fetch both stats and list in parallel
      const [statsRes, listRes] = await Promise.all([
        request<any>(ENDPOINTS.tasks.followUpStats, { token }).catch(() => null),
        request<any>(`${ENDPOINTS.tasks.list}?${queryParams.toString()}`, { token }),
      ]);

      const s = statsRes?.data ?? statsRes;
      if (s && typeof s.dueToday === "number") {
        setStats(s);
      }

      const items = listRes?.data?.items || listRes?.items || (Array.isArray(listRes) ? listRes : []);
      setFollowUps(items.map(mapApiFollowUp));
    } catch (err: any) {
      setApiError(err instanceof ApiError ? err.message : "Failed to load follow-ups");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  // Fetch form options
  useEffect(() => {
    const token = getSession()?.token;
    if (!token) return;

    request<{
      users?: { id: number; name: string }[];
      leads?: { id: number; contactName: string; companyName?: string | null }[];
      deals?: { id: number; name: string }[];
    }>(ENDPOINTS.tasks.options, { token })
      .then(res => {
        if (res.users) setUsers(res.users);
        if (res.leads) setLeads(res.leads);
        if (res.deals) setDeals(res.deals);
      })
      .catch(() => {});
  }, []);

  // Compute live counts from items currently in state
  const computedStats = useMemo(() => {
    let dueToday = 0;
    let overdue = 0;
    let upcoming = 0;
    let completed = 0;

    for (const f of followUps) {
      const bucket = getDueBucket(f);
      if (bucket === "today") dueToday++;
      else if (bucket === "overdue") overdue++;
      else if (bucket === "upcoming") upcoming++;
      else if (bucket === "completed") completed++;
    }

    return {
      dueToday,
      overdue,
      upcoming,
      completed,
      all: followUps.length,
    };
  }, [followUps]);

  // Combined stats: prioritizes server stats, but falls back to live computed items if server stats are all 0
  const displayStats = useMemo(() => {
    const hasServerData =
      stats.all > 0 ||
      stats.dueToday > 0 ||
      stats.overdue > 0 ||
      stats.upcoming > 0 ||
      stats.completed > 0;

    if (hasServerData) {
      return stats;
    }

    if (activeTab === "all" && followUps.length > 0) {
      return computedStats;
    }

    return stats;
  }, [stats, computedStats, activeTab, followUps.length]);

  // Compute Sparkline Trends
  const sparklineTrends = useMemo(() => {
    const d = displayStats.dueToday;
    const o = displayStats.overdue;
    const u = displayStats.upcoming;
    const c = displayStats.completed;

    return {
      today: [Math.max(0, d - 2), Math.max(0, d - 1), d + 1, d, d],
      overdue: [Math.max(0, o - 1), o, Math.max(0, o - 1), o + 1, o],
      upcoming: [Math.max(0, u - 2), u, u + 2, u + 1, u],
      completed: [Math.max(0, c - 3), Math.max(0, c - 2), Math.max(0, c - 1), c, c],
    };
  }, [displayStats]);

  // Client filtering (Search, Priority, Assignee)
  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();

    return followUps.filter(item => {
      if (q) {
        const matches =
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.lead.toLowerCase().includes(q) ||
          item.deal.toLowerCase().includes(q) ||
          item.assignedTo.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (priorityFilter !== "ALL" && item.priority !== priorityFilter) {
        return false;
      }

      if (assigneeFilter !== "ALL" && item.assignedTo !== assigneeFilter) {
        return false;
      }

      return true;
    });
  }, [followUps, search, priorityFilter, assigneeFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedList = filteredList.slice(startIndex, startIndex + pageSize);

  // Add Follow-up Handler
  async function handleCreateFollowUp(values: FollowUpFormValues) {
    const token = getSession()?.token;
    if (!token) return;

    await request(ENDPOINTS.tasks.create, {
      method: "POST",
      token,
      body: {
        title: values.title,
        description: values.description || null,
        dueAt: values.dueAt,
        priority: values.priority,
        status: "OPEN",
        assignedToId: values.assignedToId,
        leadId: values.leadId ?? null,
        dealId: values.dealId ?? null,
      },
    });

    await fetchFollowUps();
  }

  // Reschedule Handler
  async function handleReschedule(id: number, newDueAt: string, reason?: string) {
    const token = getSession()?.token;
    if (!token) return;

    await request(ENDPOINTS.tasks.update(id), {
      method: "PATCH",
      token,
      body: {
        dueAt: newDueAt,
        rescheduleNote: reason || null,
        status: "OPEN",
      },
    });

    // If rescheduled while on the Completed tab, switch to the new due bucket so the reopened task is immediately visible
    if (activeTab === "completed") {
      const newD = new Date(newDueAt);
      const now = new Date();
      const isToday = newD.toDateString() === now.toDateString();
      setActiveTab(isToday ? "today" : "upcoming");
    } else {
      await fetchFollowUps();
    }
  }

  // Complete Follow-up Handler
  async function handleComplete(id: number, completionNote: string, logActivityAlso: boolean) {
    const token = getSession()?.token;
    if (!token) return;

    const taskToComplete = followUps.find(t => t.id === id);

    await request(ENDPOINTS.tasks.updateStatus(id), {
      method: "PATCH",
      token,
      body: {
        status: "COMPLETED",
        completionNote: completionNote || null,
      },
    });

    await fetchFollowUps();

    if (logActivityAlso && taskToComplete) {
      setLoggingActivityTask(taskToComplete);
    }
  }

  // Quick Toggle Complete Checkbox
  async function handleQuickToggle(task: FollowUp) {
    const token = getSession()?.token;
    if (!token) return;

    const nextStatus = task.status === "COMPLETED" ? "OPEN" : "COMPLETED";
    await request(ENDPOINTS.tasks.updateStatus(task.id), {
      method: "PATCH",
      token,
      body: { status: nextStatus },
    });

    await fetchFollowUps();
  }

  // Log Activity Handler
  async function handleLogActivity(values: LogActivityValues) {
    const token = getSession()?.token;
    if (!token) return;

    await request(ENDPOINTS.activities.create, {
      method: "POST",
      token,
      body: {
        type: values.type,
        outcome: values.outcome || null,
        notes: values.notes || null,
        occurredAt: values.occurredAt,
        leadId: values.leadId || undefined,
        dealId: values.dealId || undefined,
        customerId: values.customerId || undefined,
        companyId: values.companyId || undefined,
        taskId: values.taskId || undefined,
      },
    });

    if (values.taskId && values.markTaskCompleted) {
      await request(ENDPOINTS.tasks.updateStatus(values.taskId), {
        method: "PATCH",
        token,
        body: { status: "COMPLETED", completionNote: values.outcome || "Activity logged" },
      }).catch(() => {});
    }

    await fetchFollowUps();
  }

  // Delete Follow-up
  async function handleDelete(id: number) {
    const token = getSession()?.token;
    if (!token) return;

    if (!window.confirm("Are you sure you want to delete this follow-up?")) return;

    try {
      await request(ENDPOINTS.tasks.delete(id), {
        method: "DELETE",
        token,
      });
      await fetchFollowUps();
    } catch (err: any) {
      setApiError(err instanceof ApiError ? err.message : "Failed to delete follow-up");
    }
  }

  // Export
  function exportExcel() {
    const data = filteredList.map((f, i) => ({
      "S.No": i + 1,
      Title: f.title,
      Status: f.status,
      Priority: f.priority,
      "Due Date": formatDateTime(f.dueAt),
      Assignee: f.assignedTo,
      "Related Lead": f.lead || "",
      "Related Deal": f.deal || "",
      "Reschedule Count": f.rescheduleCount,
      Notes: f.description,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Follow-ups");
    XLSX.writeFile(wb, `follow-ups-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // Table Columns
  const tableColumns = useMemo(() => [
    {
      key: "statusCheck",
      header: "",
      className: "w-10 text-center",
      cell: (f: FollowUp) => (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            handleQuickToggle(f);
          }}
          title={f.status === "COMPLETED" ? "Mark as Open" : "Mark as Completed"}
          className={`flex h-5 w-5 items-center justify-center rounded border transition cursor-pointer ${
            f.status === "COMPLETED"
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-slate-300 hover:border-emerald-500 hover:bg-emerald-50"
          }`}
        >
          {f.status === "COMPLETED" && <Check size={12} strokeWidth={3} />}
        </button>
      ),
    },
    {
      key: "title",
      header: "Follow-up",
      className: "min-w-[240px]",
      cell: (f: FollowUp) => (
        <div className="min-w-0">
          <p className={`font-bold text-xs leading-snug truncate ${
            f.status === "COMPLETED" ? "text-slate-400 line-through" : "text-[#154fc1] hover:underline cursor-pointer"
          }`}>
            {f.title}
          </p>
          {f.description && (
            <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-slate-500 truncate">
              {f.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "related",
      header: "Related To",
      className: "whitespace-nowrap min-w-[150px]",
      cell: (f: FollowUp) => {
        if (f.lead) {
          return (
            <span className="inline-flex items-center gap-1.5 rounded bg-blue-50 border border-blue-200/60 px-2 py-0.5 text-[11px] font-semibold text-blue-900">
              <Users size={12} className="shrink-0 text-blue-600" />
              <span className="truncate max-w-[140px]">{f.lead}</span>
            </span>
          );
        }
        if (f.deal) {
          return (
            <span className="inline-flex items-center gap-1.5 rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-800">
              <Building2 size={12} className="shrink-0 text-slate-600" />
              <span className="truncate max-w-[140px]">{f.deal}</span>
            </span>
          );
        }
        return <span className="text-slate-400 text-xs font-medium">—</span>;
      },
    },
    {
      key: "dueAt",
      header: "Due & Status",
      className: "whitespace-nowrap min-w-[170px]",
      cell: (f: FollowUp) => {
        const bucket = getDueBucket(f);
        const cfg = dueBucketConfig[bucket];
        const Icon = cfg.icon;
        return (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] ${cfg.badge}`}>
              <Icon size={11} />
              {cfg.label}
            </span>
            <span className="text-xs text-slate-700 font-medium">
              {formatDateTime(f.dueAt)}
            </span>
          </div>
        );
      },
    },
    {
      key: "priority",
      header: "Priority",
      className: "whitespace-nowrap",
      cell: (f: FollowUp) => {
        const pStyle = priorityStyles[f.priority] || priorityStyles.MEDIUM;
        const pLabel = priorityLabels[f.priority] || f.priority;
        return (
          <span className={`rounded px-2 py-0.5 text-[10px] ${pStyle}`}>
            {pLabel}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
      cell: (f: FollowUp) => {
        const sStyle = statusStyles[f.status] || statusStyles.OPEN;
        const sLabel = statusLabels[f.status] || f.status;
        return (
          <span className={`rounded px-2 py-0.5 text-[10px] ${sStyle}`}>
            {sLabel}
          </span>
        );
      },
    },
    {
      key: "assignedTo",
      header: "Assignee",
      className: "whitespace-nowrap text-xs text-slate-900 font-bold",
      cell: (f: FollowUp) => (
        <span className="inline-flex items-center gap-1.5 truncate max-w-[120px]">
          <UserRound size={13} className="shrink-0 text-slate-600" />
          {f.assignedTo || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right whitespace-nowrap",
      cell: (f: FollowUp) => (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setReschedulingTask(f)}
            title="Reschedule"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-700 transition cursor-pointer"
          >
            <CalendarClock size={14} />
          </button>
          <button
            type="button"
            onClick={() => setLoggingActivityTask(f)}
            title="Log Activity"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-[#1d61e7] transition cursor-pointer"
          >
            <ActivityIcon size={14} />
          </button>
          {f.status !== "COMPLETED" && (
            <button
              type="button"
              onClick={() => setCompletingTask(f)}
              title="Complete Follow-up"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
            >
              <CheckCircle2 size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => handleDelete(f.id)}
            title="Delete"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ], [followUps]);

  return (
    <div className="space-y-5">
      {/* Page Title & Global Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <CalendarClock className="text-[#1d61e7]" size={26} />
            Follow-ups
          </h1>
          <p className="mt-0.5 sm:mt-1 text-xs text-slate-500">
            Track, reschedule, and complete client touchpoints and activities
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fetchFollowUps()}
            disabled={loading}
            title="Refresh list"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            <RotateCw size={15} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            type="button"
            onClick={exportExcel}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGlobalLogActivity(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer"
          >
            <ActivityIcon size={14} className="text-[#1d61e7]" />
            <span>Log Activity</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#1d61e7] px-4 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Follow-up</span>
          </button>
        </div>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700 border border-rose-200">
          <AlertTriangle size={16} className="text-rose-500 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* 4 STAT CARDS (Due Today, Overdue, Upcoming, Completed) - Global StatCard Component */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Due Today"
          value={displayStats.dueToday}
          subtext="Pending action"
          icon={Clock}
          color="amber"
          sparklineData={sparklineTrends.today}
          sparklineId="followup-stat-dyn-today"
          isActive={activeTab === "today"}
          onClick={() => setActiveTab(activeTab === "today" ? "all" : "today")}
        />

        <StatCard
          label="Overdue"
          value={displayStats.overdue}
          subtext="Needs attention"
          icon={AlertTriangle}
          color="rose"
          sparklineData={sparklineTrends.overdue}
          sparklineId="followup-stat-dyn-overdue"
          isActive={activeTab === "overdue"}
          onClick={() => setActiveTab(activeTab === "overdue" ? "all" : "overdue")}
        />

        <StatCard
          label="Upcoming"
          value={displayStats.upcoming}
          subtext="Future scheduled"
          icon={CalendarDays}
          color="blue"
          sparklineData={sparklineTrends.upcoming}
          sparklineId="followup-stat-dyn-upcoming"
          isActive={activeTab === "upcoming"}
          onClick={() => setActiveTab(activeTab === "upcoming" ? "all" : "upcoming")}
        />

        <StatCard
          label="Completed"
          value={displayStats.completed}
          subtext="Tasks resolved"
          icon={CheckCircle2}
          color="emerald"
          sparklineData={sparklineTrends.completed}
          sparklineId="followup-stat-dyn-completed"
          isActive={activeTab === "completed"}
          onClick={() => setActiveTab(activeTab === "completed" ? "all" : "completed")}
        />
      </div>

      {/* 5 TABS BAR */}
      <div className="flex items-center justify-between border-b border-slate-200 gap-2 overflow-x-auto pb-px">
        <div className="flex items-center gap-1 min-w-max">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
              activeTab === "all"
                ? "border-[#1d61e7] text-[#1d61e7]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>All Follow-ups</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${
              activeTab === "all" ? "bg-blue-100 text-[#1d61e7] font-bold" : "bg-slate-100 text-slate-600 font-semibold"
            }`}>
              {displayStats.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("today")}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
              activeTab === "today"
                ? "border-[#1d61e7] text-[#1d61e7]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Clock size={13} className={activeTab === "today" ? "text-[#1d61e7]" : "text-slate-400"} />
            <span>Due Today</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${
              activeTab === "today" ? "bg-blue-100 text-[#1d61e7] font-bold" : "bg-slate-100 text-slate-600 font-semibold"
            }`}>
              {displayStats.dueToday}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("overdue")}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
              activeTab === "overdue"
                ? "border-[#1d61e7] text-[#1d61e7]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <AlertTriangle size={13} className={activeTab === "overdue" ? "text-[#1d61e7]" : "text-slate-400"} />
            <span>Overdue</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${
              activeTab === "overdue" ? "bg-blue-100 text-[#1d61e7] font-bold" : "bg-slate-100 text-slate-600 font-semibold"
            }`}>
              {displayStats.overdue}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
              activeTab === "upcoming"
                ? "border-[#1d61e7] text-[#1d61e7]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <CalendarDays size={13} className={activeTab === "upcoming" ? "text-[#1d61e7]" : "text-slate-400"} />
            <span>Upcoming</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${
              activeTab === "upcoming" ? "bg-blue-100 text-[#1d61e7] font-bold" : "bg-slate-100 text-slate-600 font-semibold"
            }`}>
              {displayStats.upcoming}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
              activeTab === "completed"
                ? "border-[#1d61e7] text-[#1d61e7]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <CheckCircle2 size={13} className={activeTab === "completed" ? "text-[#1d61e7]" : "text-slate-400"} />
            <span>Completed</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${
              activeTab === "completed" ? "bg-blue-100 text-[#1d61e7] font-bold" : "bg-slate-100 text-slate-600 font-semibold"
            }`}>
              {displayStats.completed}
            </span>
          </button>
        </div>

        {/* View Switcher: List vs Grid */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 mb-1 shrink-0">
          <button
            type="button"
            onClick={() => setView("list")}
            title="List View"
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
              view === "list" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <List size={13} />
            <span className="hidden sm:inline">List</span>
          </button>
          <button
            type="button"
            onClick={() => setView("grid")}
            title="Grid View"
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
              view === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LayoutGrid size={13} />
            <span className="hidden sm:inline">Grid</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="relative w-full sm:w-64 md:w-80">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search follow-ups by title, notes, contact, deal..."
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-[#1d61e7] cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          {isAdmin && (
            <select
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-[#1d61e7] cursor-pointer"
            >
              <option value="ALL">All Assignees</option>
              {users.map(u => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
          )}

          {(search || priorityFilter !== "ALL" || assigneeFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPriorityFilter("ALL");
                setAssigneeFilter("ALL");
              }}
              className="text-xs font-semibold text-[#1d61e7] hover:underline px-2 py-1 cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* DATA CONTENT (LIST TABLE OR GRID) */}
      {view === "list" ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <DataTable<FollowUp>
            columns={tableColumns}
            rows={paginatedList}
            getRowId={f => f.id}
            onRowClick={f => setDetailTask(f)}
            empty={
              <div className="p-8 text-center text-xs text-slate-400">
                {loading ? "Loading follow-ups..." : "No follow-ups found for this filter"}
              </div>
            }
          />
          <TablePagination
            total={filteredList.length}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      ) : (
        /* GRID VIEW */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {paginatedList.map(item => {
              const bucket = getDueBucket(item);
              const bucketCfg = dueBucketConfig[bucket];
              const BucketIcon = bucketCfg.icon;
              const pStyle = priorityStyles[item.priority] || priorityStyles.MEDIUM;
              const pLabel = priorityLabels[item.priority] || item.priority;

              return (
                <div
                  key={item.id}
                  onClick={() => setDetailTask(item)}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-[#1d61e7]/60 hover:shadow-xs cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Top row: Checkbox, Badge & Priority */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleQuickToggle(item);
                          }}
                          className={`flex h-5 w-5 items-center justify-center rounded border transition cursor-pointer ${
                            item.status === "COMPLETED"
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-slate-300 hover:border-emerald-500 hover:bg-emerald-50"
                          }`}
                        >
                          {item.status === "COMPLETED" && <Check size={12} strokeWidth={3} />}
                        </button>

                        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] ${bucketCfg.badge}`}>
                          <BucketIcon size={11} />
                          {bucketCfg.label}
                        </span>
                      </div>

                      <span className={`rounded px-2 py-0.5 text-[10px] ${pStyle}`}>
                        {pLabel}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className={`mt-3 text-xs font-bold leading-snug line-clamp-2 ${
                      item.status === "COMPLETED" ? "text-slate-400 line-through" : "text-[#154fc1]"
                    }`}>
                      {item.title}
                    </h3>

                    {/* Description */}
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-slate-500">
                        {item.description}
                      </p>
                    )}

                    {/* Related Contact / Deal */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.lead && (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200/60 px-2 py-0.5 text-[10px] font-semibold text-blue-900">
                          <Users size={11} className="text-blue-600" />
                          <span className="truncate max-w-[120px]">{item.lead}</span>
                        </span>
                      )}
                      {item.deal && (
                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-800">
                          <Building2 size={11} className="text-slate-600" />
                          <span className="truncate max-w-[120px]">{item.deal}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Due Date, Assignee & Quick Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-600 text-[11px] font-medium">
                      {formatDateTime(item.dueAt)}
                    </span>

                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setReschedulingTask(item)}
                        title="Reschedule"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-700 transition cursor-pointer"
                      >
                        <CalendarClock size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLoggingActivityTask(item)}
                        title="Log Activity"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-50 hover:text-[#1d61e7] transition cursor-pointer"
                      >
                        <ActivityIcon size={14} />
                      </button>
                      {item.status !== "COMPLETED" && (
                        <button
                          type="button"
                          onClick={() => setCompletingTask(item)}
                          title="Complete"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        title="Delete"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {paginatedList.length === 0 && !loading && (
            <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center bg-white shadow-2xs">
              <CalendarClock size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No follow-ups found</p>
              <p className="text-xs text-slate-400 mt-1">Try switching tabs or adjusting search filters.</p>
            </div>
          )}

          <TablePagination
            total={filteredList.length}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* MODALS */}
      {showAddModal && (
        <FollowUpModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleCreateFollowUp}
          users={users}
          leads={leads}
          deals={deals}
          currentUserId={currentUser?.id}
        />
      )}

      {reschedulingTask && (
        <RescheduleModal
          followUp={reschedulingTask}
          onClose={() => setReschedulingTask(null)}
          onConfirm={handleReschedule}
        />
      )}

      {completingTask && (
        <CompleteModal
          followUp={completingTask}
          onClose={() => setCompletingTask(null)}
          onConfirm={handleComplete}
        />
      )}

      {(loggingActivityTask || showGlobalLogActivity) && (
        <LogActivityModal
          isOpen={Boolean(loggingActivityTask || showGlobalLogActivity)}
          followUp={loggingActivityTask}
          onClose={() => {
            setLoggingActivityTask(null);
            setShowGlobalLogActivity(false);
          }}
          onSave={handleLogActivity}
          leads={leads}
          deals={deals}
        />
      )}

      {detailTask && (
        <FollowUpDetailDialog
          followUp={detailTask}
          onClose={() => setDetailTask(null)}
          onReschedule={f => {
            setDetailTask(null);
            setReschedulingTask(f);
          }}
          onComplete={f => {
            setDetailTask(null);
            setCompletingTask(f);
          }}
          onLogActivity={f => {
            setDetailTask(null);
            setLoggingActivityTask(f);
          }}
        />
      )}
    </div>
  );
}
