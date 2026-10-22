import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Plus,
  Filter,
  Download,
  RotateCw,
  MoreHorizontal,
  FileSpreadsheet,
  ChevronDown,
  CheckSquare,
  Circle,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  CalendarClock,
  User,
  Flag,
  Check,
  LayoutGrid,
  List,
} from "lucide-react";
import type { Priority, Task, TaskFormValues, TaskStatus } from "../../types/task";
import { TASK_PRIORITIES, TASK_STATUSES } from "../../types/task";
import {
  dueBucket,
  dueLabel,
  dueStyles,
  priorityLabels,
  priorityStyles,
  taskColumns,
  taskColumnOptions,
  taskCsvFields,
  taskStatusLabels,
  taskStatusStyles,
} from "./taskColumns";
import TaskForm from "../../components/ui/TaskForm";
import DataTable, { TablePagination } from "../../components/ui/DataTable";
import TableSettings from "../../components/ui/TableSettings";
import TaskDetailDialog from "../../components/ui/TaskDetailDialog";
import { request, ApiError } from "../../lib/api";
import { ENDPOINTS } from "../../lib/endpoints";
import { getSession } from "../../lib/auth";

type ApiTask = {
  id: number;
  title: string;
  description: string | null;
  dueAt: string;
  priority: Task["priority"];
  status: Task["status"];
  assignedToId: number;
  createdById: number;
  assignedTo?: { id: number; name: string; email: string } | null;
  createdBy?: { id: number; name: string; email: string } | null;
  completedBy?: { id: number; name: string } | null;
  completedAt: string | null;
  completionNote: string | null;
  cancelReason?: { id: number; name: string } | null;
  rescheduleCount: number;
  lead?: { id: number; contactName: string; companyName: string | null } | null;
  deal?: { id: number; name: string } | null;
  customer?: { id: number; companyId: number | null } | null;
  company?: { id: number; name: string } | null;
  meeting?: { id: number; title: string; startsAt: string } | null;
  createdAt: string;
  updatedAt: string;
};

function mapApiTask(item: ApiTask): Task {
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    assignedTo: item.assignedTo?.name ?? "",
    assignedToId: item.assignedToId,
    createdBy: item.createdBy?.name ?? "",
    createdById: item.createdById,
    dueAt: item.dueAt ? item.dueAt.slice(0, 10) : "",
    priority: item.priority,
    status: item.status,
    completedAt: item.completedAt ? item.completedAt.slice(0, 10) : "",
    completedBy: item.completedBy?.name ?? "",
    completionNote: item.completionNote ?? "",
    cancelReason: item.cancelReason?.name ?? "",
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
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function toFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description,
    assignedTo: task.assignedTo,
    assignedToId: task.assignedToId,
    dueAt: task.dueAt ? task.dueAt.slice(0, 10) : "",
    priority: task.priority,
    status: task.status,
    completedAt: task.completedAt ? task.completedAt.slice(0, 10) : "",
    completedBy: task.completedBy,
    completionNote: task.completionNote,
    cancelReason: task.cancelReason,
    lead: task.lead,
    leadId: task.leadId ?? null,
    deal: task.deal,
    dealId: task.dealId ?? null,
    customer: task.customer,
    customerId: task.customerId ?? null,
    company: task.company,
    companyId: task.companyId ?? null,
    meeting: task.meeting,
    meetingId: task.meetingId ?? null,
  };
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<Priority[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");
  const [dueFilter, setDueFilter] = useState<string>("All Time");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [view, setView] = useState<"list" | "grid">("list");
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Dropdown toggles
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refreshTasks = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const token = getSession()?.token;
      if (!token) {
        setApiError("Your session has expired. Please sign in again.");
        return;
      }
      const result = await request<{ items: ApiTask[] }>(ENDPOINTS.tasks.list, {
        token,
      });
      setTasks(result.items.map(mapApiTask));
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTasks();
  }, [refreshTasks]);

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
    if (!detailTask) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDetailTask(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detailTask]);

  // Compute KPI metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const openTasks = tasks.filter(t => t.status === "OPEN").length;
    const inProgress = tasks.filter(t => t.status === "IN_PROGRESS").length;
    const completed = tasks.filter(t => t.status === "COMPLETED").length;
    const today = new Date().toISOString().slice(0, 10);
    const overdue = tasks.filter(
      t => t.dueAt && t.dueAt < today && t.status !== "COMPLETED" && t.status !== "CANCELLED",
    ).length;

    return {
      total,
      openTasks,
      inProgress,
      completed,
      overdue,
      totalPercent: "100%",
      openPercent: total > 0 ? `${Math.round((openTasks / total) * 100)}%` : "0%",
      inProgressPercent: total > 0 ? `${Math.round((inProgress / total) * 100)}%` : "0%",
      completedPercent: total > 0 ? `${Math.round((completed / total) * 100)}%` : "0%",
      overduePercent: total > 0 ? `${Math.round((overdue / total) * 100)}%` : "0%",
    };
  }, [tasks]);

  // Available assignees list
  const availableAssignees = useMemo(() => {
    const set = new Set<string>();
    for (const task of tasks) {
      if (task.assignedTo) set.add(task.assignedTo);
    }
    return ["All Assignees", ...Array.from(set).sort()];
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks.filter(task => {
      // Search
      const matchesSearch =
        !query ||
        [
          task.title,
          task.description,
          task.assignedTo,
          task.priority,
          task.status,
          task.lead,
          task.deal,
          task.company,
          task.customer,
        ].some(val => val.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter.length > 0 && !statusFilter.includes(task.status)) {
        return false;
      }

      // Priority filter
      if (priorityFilter.length > 0 && !priorityFilter.includes(task.priority)) {
        return false;
      }

      // Assignee filter
      if (selectedAssignee && task.assignedTo !== selectedAssignee) {
        return false;
      }

      // Due date filter
      if (dueFilter !== "All Time") {
        const bucket = dueBucket(task);
        if (dueFilter === "Overdue" && bucket !== "overdue") return false;
        if (dueFilter === "Due Today" && bucket !== "today") return false;
        if (dueFilter === "Upcoming" && bucket !== "upcoming") return false;
      }

      return true;
    });
  }, [tasks, search, statusFilter, priorityFilter, selectedAssignee, dueFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageTasks = filteredTasks.slice(startIndex, startIndex + pageSize);

  const visibleColumns = useMemo(
    () => taskColumns.filter(column => !hiddenColumns.includes(column.key)),
    [hiddenColumns],
  );

  const paginatedColumns = useMemo(() => {
    const snoCol = {
      key: "sno",
      header: "S.No",
      className: "w-12 text-center text-xs text-slate-500",
      cell: (_task: Task, index?: number) => (
        <span className="text-slate-500 font-medium">
          {startIndex + (index ?? 0) + 1}
        </span>
      ),
    };

    return [snoCol, ...visibleColumns];
  }, [visibleColumns, startIndex]);

  const hasActiveFilters =
    search !== "" ||
    statusFilter.length > 0 ||
    priorityFilter.length > 0 ||
    selectedAssignee !== "" ||
    dueFilter !== "All Time";

  function resetFilters() {
    setSearch("");
    setStatusFilter([]);
    setPriorityFilter([]);
    setSelectedAssignee("");
    setDueFilter("All Time");
    setPage(1);
  }

  function filterByStatusCard(status?: TaskStatus) {
    if (!status) {
      resetFilters();
      return;
    }
    if (statusFilter.length === 1 && statusFilter[0] === status) {
      setStatusFilter([]);
    } else {
      setStatusFilter([status]);
      setDueFilter("All Time");
    }
    setPage(1);
  }

  function filterByOverdueCard() {
    if (dueFilter === "Overdue") {
      setDueFilter("All Time");
    } else {
      setDueFilter("Overdue");
      setStatusFilter([]);
    }
    setPage(1);
  }

  async function handleSaveTask(values: TaskFormValues) {
    const token = getSession()?.token;
    if (!token) {
      setApiError("Your session has expired. Please sign in again.");
      return;
    }

    try {
      setApiError(null);

      if (editingTask) {
        const updatePayload: Record<string, unknown> = {
          title: values.title,
          description: values.description || null,
          dueAt: new Date(values.dueAt).toISOString(),
          priority: values.priority,
          status: values.status,
        };

        if (values.assignedToId) {
          updatePayload.assignedToId = values.assignedToId;
        }
        if (values.leadId !== undefined) {
          updatePayload.leadId = values.leadId;
        }
        if (values.dealId !== undefined) {
          updatePayload.dealId = values.dealId;
        }

        await request(ENDPOINTS.tasks.update(editingTask.id), {
          method: "PATCH",
          token,
          body: updatePayload,
        });
      } else {
        let assignedToId = values.assignedToId;

        if (!assignedToId) {
          const opts = await request<{ users: { id: number; name: string }[] }>(
            ENDPOINTS.tasks.options,
            { token },
          );
          const found = opts.users.find((u) => u.name === values.assignedTo);
          if (found) assignedToId = found.id;
        }

        if (!assignedToId) {
          setApiError("Please select a valid assignee.");
          return;
        }

        const payload = {
          title: values.title,
          description: values.description || null,
          dueAt: new Date(values.dueAt).toISOString(),
          priority: values.priority,
          status: values.status,
          assignedToId,
          leadId: values.leadId ?? null,
          dealId: values.dealId ?? null,
        };

        await request(ENDPOINTS.tasks.create, {
          method: "POST",
          token,
          body: payload,
        });
      }

      setShowCreateModal(false);
      setEditingTask(null);
      await refreshTasks();
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Failed to save task");
      throw err;
    }
  }

  async function updateTaskStatus(id: number, status: TaskStatus) {
    const token = getSession()?.token;
    if (!token) return;

    try {
      const updated = await request<ApiTask>(ENDPOINTS.tasks.updateStatus(id), {
        method: "PATCH",
        token,
        body: { status },
      });
      const mapped = mapApiTask(updated);
      setTasks(prev => prev.map(t => (t.id === id ? mapped : t)));
      if (detailTask?.id === id) setDetailTask(mapped);
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Failed to update status");
    }
  }

  async function toggleComplete(task: Task) {
    const nextStatus = task.status === "COMPLETED" ? "OPEN" : "COMPLETED";
    await updateTaskStatus(task.id, nextStatus);
  }

  async function deleteTask(id: number) {
    const token = getSession()?.token;
    if (!token) return;

    try {
      await request(ENDPOINTS.tasks.delete(id), {
        method: "DELETE",
        token,
      });
      setTasks(prev => prev.filter(t => t.id !== id));
      if (detailTask?.id === id) setDetailTask(null);
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Failed to delete task");
    }
  }

  function exportCsv() {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [
      taskCsvFields.map(field => field.label),
      ...filteredTasks.map(task => taskCsvFields.map(field => field.get(task))),
    ]
      .map(row => row.map(escapeCsv).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "sales-crm-tasks.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportExcel() {
    const data = filteredTasks.map(task => ({
      Title: task.title,
      Description: task.description || "",
      Assignee: task.assignedTo || "",
      "Due Date": task.dueAt || "",
      Priority: task.priority,
      Status: task.status,
      "Related To": task.lead || task.deal || task.customer || task.company || "",
      "Created At": task.createdAt,
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
    XLSX.writeFile(workbook, "sales-crm-tasks.xlsx");
  }

  // Full-page create / edit form
  if (showCreateModal || editingTask) {
    return (
      <TaskForm
        mode={editingTask ? "edit" : "create"}
        values={editingTask ? toFormValues(editingTask) : undefined}
        onClose={() => {
          setShowCreateModal(false);
          setEditingTask(null);
        }}
        onSubmit={handleSaveTask}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Tasks
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Manage and track all your tasks, assignments, and due dates
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus size={15} />
            Create Task
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
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    void refreshTasks();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <RotateCw size={14} className="text-slate-400" />
                  Refresh Tasks
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Row (5 Cards) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* Total Tasks */}
        <div
          onClick={() => filterByStatusCard()}
          className={`group relative flex items-center justify-between overflow-hidden rounded-xl border bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-blue-300 hover:shadow-xs cursor-pointer min-w-0 ${
            statusFilter.length === 0 && dueFilter === "All Time"
              ? "border-[#1d61e7] ring-2 ring-blue-500/10"
              : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#1d61e7]">
              <CheckSquare size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Total Tasks</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {metrics.total}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-blue-600 flex items-center gap-0.5">
                All active
              </p>
            </div>
          </div>
          <div className="w-16 sm:w-20 md:w-24 shrink-0 overflow-hidden flex items-center justify-end">
            <svg className="w-full h-10 sm:h-11 overflow-hidden" viewBox="0 0 120 48" fill="none">
              <defs>
                <linearGradient id="task-stat-grad-total" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="85%" stopColor="#3b82f6" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 42 C 16 42 28 34 44 34 C 58 34 68 16 78 14 C 85 12 90 20 96 20 C 104 20 110 8 116 6 L 116 48 L 0 48 Z"
                fill="url(#task-stat-grad-total)"
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

        {/* Open Tasks */}
        <div
          onClick={() => filterByStatusCard("OPEN")}
          className={`group relative flex items-center justify-between overflow-hidden rounded-xl border bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-sky-300 hover:shadow-xs cursor-pointer min-w-0 ${
            statusFilter.includes("OPEN") ? "border-sky-500 ring-2 ring-sky-500/15" : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              <Circle size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Open Tasks</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {metrics.openTasks}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-sky-600 flex items-center gap-0.5">
                <span>↑</span> {metrics.openPercent}
              </p>
            </div>
          </div>
          <div className="w-16 sm:w-20 md:w-24 shrink-0 overflow-hidden flex items-center justify-end">
            <svg className="w-full h-10 sm:h-11 overflow-hidden" viewBox="0 0 120 48" fill="none">
              <defs>
                <linearGradient id="task-stat-grad-open" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
                  <stop offset="85%" stopColor="#0ea5e9" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 43 C 14 43 26 33 40 33 C 54 33 62 17 70 15 C 76 13 82 21 88 21 C 96 21 104 7 112 5 L 112 48 L 0 48 Z"
                fill="url(#task-stat-grad-open)"
              />
              <path
                d="M 0 43 C 14 43 26 33 40 33 C 54 33 62 17 70 15 C 76 13 82 21 88 21 C 96 21 104 7 112 5"
                stroke="#0ea5e9"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* In Progress */}
        <div
          onClick={() => filterByStatusCard("IN_PROGRESS")}
          className={`group relative flex items-center justify-between overflow-hidden rounded-xl border bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-amber-300 hover:shadow-xs cursor-pointer min-w-0 ${
            statusFilter.includes("IN_PROGRESS") ? "border-amber-500 ring-2 ring-amber-500/15" : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <RotateCcw size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">In Progress</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {metrics.inProgress}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-amber-600 flex items-center gap-0.5">
                <span>↑</span> {metrics.inProgressPercent}
              </p>
            </div>
          </div>
          <div className="w-16 sm:w-20 md:w-24 shrink-0 overflow-hidden flex items-center justify-end">
            <svg className="w-full h-10 sm:h-11 overflow-hidden" viewBox="0 0 120 48" fill="none">
              <defs>
                <linearGradient id="task-stat-grad-progress" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="85%" stopColor="#f59e0b" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 41 C 12 41 24 32 38 32 C 50 32 58 16 66 14 C 72 12 78 20 84 20 C 92 20 100 6 108 4 L 108 48 L 0 48 Z"
                fill="url(#task-stat-grad-progress)"
              />
              <path
                d="M 0 41 C 12 41 24 32 38 32 C 50 32 58 16 66 14 C 72 12 78 20 84 20 C 92 20 100 6 108 4"
                stroke="#f59e0b"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Completed */}
        <div
          onClick={() => filterByStatusCard("COMPLETED")}
          className={`group relative flex items-center justify-between overflow-hidden rounded-xl border bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-emerald-300 hover:shadow-xs cursor-pointer min-w-0 ${
            statusFilter.includes("COMPLETED") ? "border-emerald-500 ring-2 ring-emerald-500/15" : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Completed</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {metrics.completed}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-emerald-500 flex items-center gap-0.5">
                <span>↑</span> {metrics.completedPercent}
              </p>
            </div>
          </div>
          <div className="w-16 sm:w-20 md:w-24 shrink-0 overflow-hidden flex items-center justify-end">
            <svg className="w-full h-10 sm:h-11 overflow-hidden" viewBox="0 0 120 48" fill="none">
              <defs>
                <linearGradient id="task-stat-grad-completed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="85%" stopColor="#10b981" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 42 C 14 41 26 33 40 33 C 52 33 60 16 68 14 C 75 12 80 20 86 20 C 94 20 102 6 110 4 L 110 48 L 0 48 Z"
                fill="url(#task-stat-grad-completed)"
              />
              <path
                d="M 0 42 C 14 41 26 33 40 33 C 52 33 60 16 68 14 C 75 12 80 20 86 20 C 94 20 102 6 110 4"
                stroke="#10b981"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Overdue */}
        <div
          onClick={filterByOverdueCard}
          className={`group relative flex items-center justify-between overflow-hidden rounded-xl border bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-rose-300 hover:shadow-xs cursor-pointer min-w-0 ${
            dueFilter === "Overdue" ? "border-rose-500 ring-2 ring-rose-500/15" : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Overdue</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {metrics.overdue}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-rose-500 flex items-center gap-0.5">
                <span>↑</span> {metrics.overduePercent}
              </p>
            </div>
          </div>
          <div className="w-16 sm:w-20 md:w-24 shrink-0 overflow-hidden flex items-center justify-end">
            <svg className="w-full h-10 sm:h-11 overflow-hidden" viewBox="0 0 120 48" fill="none">
              <defs>
                <linearGradient id="task-stat-grad-overdue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                  <stop offset="85%" stopColor="#f43f5e" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 43 C 18 43 28 32 46 31 C 60 30 68 14 80 12 C 88 10 94 18 102 18 C 108 18 114 12 118 10 L 118 48 L 0 48 Z"
                fill="url(#task-stat-grad-overdue)"
              />
              <path
                d="M 0 43 C 18 43 28 32 46 31 C 60 30 68 14 80 12 C 88 10 94 18 102 18 C 108 18 114 12 118 10"
                stroke="#f43f5e"
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
          {/* Search tasks */}
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
              placeholder="Search tasks..."
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500"
            />
          </div>

          {/* Task Status Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === "status" ? null : "status")}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                statusFilter.length > 0
                  ? "border-blue-600 bg-blue-50/50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Filter size={13} className="text-slate-400" />
              Task Status
              {statusFilter.length > 0 && ` (${statusFilter.length})`}
              <ChevronDown size={13} className="text-slate-400 ml-0.5" />
            </button>

            {activeDropdown === "status" && (
              <div className="absolute left-0 top-9 z-30 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Select Status
                </p>
                <div className="space-y-1 mt-1">
                  {TASK_STATUSES.map(status => {
                    const checked = statusFilter.includes(status);
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setStatusFilter(prev =>
                            prev.includes(status)
                              ? prev.filter(s => s !== status)
                              : [...prev, status],
                          );
                          setPage(1);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs hover:bg-slate-50 text-slate-700 text-left cursor-pointer"
                      >
                        <span>{taskStatusLabels[status] ?? status}</span>
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
                priorityFilter.length > 0
                  ? "border-blue-600 bg-blue-50/50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Flag size={13} className="text-slate-400" />
              Priority
              {priorityFilter.length > 0 && ` (${priorityFilter.length})`}
              <ChevronDown size={13} className="text-slate-400 ml-0.5" />
            </button>

            {activeDropdown === "priority" && (
              <div className="absolute left-0 top-9 z-30 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Select Priority
                </p>
                <div className="space-y-1 mt-1">
                  {TASK_PRIORITIES.map(priority => {
                    const checked = priorityFilter.includes(priority);
                    return (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => {
                          setPriorityFilter(prev =>
                            prev.includes(priority)
                              ? prev.filter(p => p !== priority)
                              : [...prev, priority],
                          );
                          setPage(1);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs hover:bg-slate-50 text-slate-700 text-left cursor-pointer"
                      >
                        <span>{priorityLabels[priority] ?? priority}</span>
                        {checked && <Check size={14} className="text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Assignee Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === "assignee" ? null : "assignee")}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                selectedAssignee
                  ? "border-blue-600 bg-blue-50/50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <User size={13} className="text-slate-400" />
              Assignee {selectedAssignee ? `(${selectedAssignee.split(" ")[0]})` : ""}
              <ChevronDown size={13} className="text-slate-400 ml-0.5" />
            </button>

            {activeDropdown === "assignee" && (
              <div className="absolute left-0 top-9 z-30 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {availableAssignees.map(user => (
                    <button
                      key={user}
                      type="button"
                      onClick={() => {
                        setSelectedAssignee(user === "All Assignees" ? "" : user);
                        setActiveDropdown(null);
                        setPage(1);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs hover:bg-slate-50 text-slate-700 text-left cursor-pointer"
                    >
                      <span>{user}</span>
                      {(user === "All Assignees" && !selectedAssignee) || selectedAssignee === user ? (
                        <Check size={14} className="text-blue-600" />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Due Date Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === "due" ? null : "due")}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                dueFilter !== "All Time"
                  ? "border-blue-600 bg-blue-50/50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <CalendarClock size={13} className="text-slate-400" />
              Due Date {dueFilter !== "All Time" ? `(${dueFilter})` : ""}
              <ChevronDown size={13} className="text-slate-400 ml-0.5" />
            </button>

            {activeDropdown === "due" && (
              <div className="absolute left-0 top-9 z-30 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="space-y-1">
                  {["All Time", "Overdue", "Due Today", "Upcoming"].map(range => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => {
                        setDueFilter(range);
                        setActiveDropdown(null);
                        setPage(1);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs hover:bg-slate-50 text-slate-700 text-left cursor-pointer"
                    >
                      <span>{range}</span>
                      {dueFilter === range && <Check size={14} className="text-blue-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side: View switch, columns, clear filters */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto pt-2 sm:pt-0 border-t border-slate-100 sm:border-0">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-medium text-blue-600 hover:underline cursor-pointer mr-1"
            >
              Clear Filters
            </button>
          )}

          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setView("list")}
              title="List view"
              className={`rounded-md p-1.5 transition cursor-pointer ${
                view === "list"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => setView("grid")}
              title="Grid view"
              className={`rounded-md p-1.5 transition cursor-pointer ${
                view === "grid"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          <TableSettings
            columns={taskColumnOptions}
            hidden={hiddenColumns}
            onChange={setHiddenColumns}
          />
        </div>
      </div>

      {apiError && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <span>{apiError}</span>
          <button
            type="button"
            onClick={() => setApiError(null)}
            className="font-semibold underline hover:no-underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Tasks Table / Grid Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        {view === "list" && (
          <DataTable<Task>
            columns={paginatedColumns}
            rows={pageTasks}
            getRowId={task => task.id}
            onRowClick={task => setDetailTask(task)}
            getRowLabel={task => task.title}
            renderRowMenu={task => (
              <>
                <button
                  type="button"
                  onClick={() => setDetailTask(task)}
                  className="w-full rounded px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  View details
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTask(task)}
                  className="w-full rounded px-3 py-2 text-left text-xs font-medium text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  Edit task
                </button>
                <button
                  type="button"
                  onClick={() => toggleComplete(task)}
                  className="w-full rounded px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {task.status === "COMPLETED" ? "Mark as open" : "Mark as completed"}
                </button>
                <div className="my-1 border-t border-slate-100" />
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Update status
                </p>
                {TASK_STATUSES.map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => updateTaskStatus(task.id, status)}
                    className="w-full rounded px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    {taskStatusLabels[status] ?? status}
                  </button>
                ))}
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  className="w-full rounded px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  Delete task
                </button>
              </>
            )}
            empty={
              loading ? (
                <div className="py-12 text-center text-slate-500">
                  <p className="text-sm font-medium">Loading tasks...</p>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Search size={20} className="text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No tasks found
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Try changing your search or filters.
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-3 text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )
            }
          />
        )}

        {view === "grid" && (
          <div className="p-4">
            {loading ? (
              <div className="py-12 text-center text-slate-500">
                <p className="text-sm font-medium">Loading tasks...</p>
              </div>
            ) : pageTasks.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Search size={20} className="text-slate-400" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">
                  No tasks found
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Try changing your search or filters.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-3 text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pageTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => setDetailTask(task)}
                    className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:shadow-xs cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm font-semibold ${
                            task.status === "COMPLETED"
                              ? "text-slate-400 line-through"
                              : "text-slate-900"
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {task.assignedTo ? `Assigned to ${task.assignedTo}` : "Unassigned"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                          taskStatusStyles[task.status] ?? taskStatusStyles.OPEN
                        }`}
                      >
                        {taskStatusLabels[task.status] ?? task.status}
                      </span>
                    </div>

                    {task.description && (
                      <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                          priorityStyles[task.priority] ?? priorityStyles.MEDIUM
                        }`}
                      >
                        {priorityLabels[task.priority] ?? task.priority}
                      </span>

                      <span className={`flex items-center gap-1.5 text-xs ${dueStyles(task)}`}>
                        <CalendarClock size={13} className="shrink-0" />
                        {dueLabel(task)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pagination bar */}
        <TablePagination
          total={filteredTasks.length}
          page={currentPage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Task Detail Dialog */}
      {detailTask && (
        <TaskDetailDialog
          task={detailTask}
          onClose={() => setDetailTask(null)}
        />
      )}
    </div>
  );
}
