import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List,
  Download,
  CheckCircle2,
  AlertTriangle,
  CalendarClock,
  RotateCcw,
} from "lucide-react";
import type { Task, TaskFormValues } from "../../types/task";
import { TASK_ASSIGNEES, TASK_PRIORITIES, TASK_STATUSES } from "../../types/task";

import {
  dueBucket,
  priorityLabels,
  priorityStyles,
  taskColumns,
  taskColumnOptions,
  taskCsvFields,
  taskStatusLabels,
  taskStatusStyles,
  todayIso,
} from "../../data/taskColumns";
import type { TaskDueFilter, TasksFilter } from "../../types/tasksPage";
import TaskForm from "../../components/ui/TaskForm";
import DataTable, { TablePagination } from "../../components/ui/DataTable";
import FilterSidebar, {
  type FilterCheckboxSection,
  type FilterSelect,
} from "../../components/ui/FilterSidebar";
import TableSettings from "../../components/ui/TableSettings";
import TaskDetailDialog from "../../components/ui/TaskDetailDialog";

import { request, ApiError } from "../../lib/api";
import { ENDPOINTS } from "../../lib/endpoints";
import { getSession } from "../../lib/auth";
import { initialLeads } from "../../data/leads";
import { initialDeals } from "../../data/deals";
import { initialCustomers } from "../../data/customers";
import { initialCompanies } from "../../data/companies";

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
    createdBy: item.createdBy?.name ?? "",
    dueAt: item.dueAt,
    priority: item.priority,
    status: item.status,
    completedAt: item.completedAt ?? "",
    completedBy: item.completedBy?.name ?? "",
    completionNote: item.completionNote ?? "",
    cancelReason: "",
    rescheduleCount: item.rescheduleCount ?? 0,
    lead: item.lead?.contactName ?? "",
    deal: item.deal?.name ?? "",
    customer: item.customer ? `Customer #${item.customer.id}` : "",
    company: item.company?.name ?? "",
    meeting: item.meeting?.title ?? "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

// Filter state as one object: one setter, one reset, one dependency.
const emptyFilters: TasksFilter = { status: [], priority: [], assignedTo: [] };

const toolbarButtonClass =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50";
const iconButtonClass = "rounded-md border p-2";
const iconButtonIdle = "border-slate-200 text-slate-500 hover:bg-slate-50";
const iconButtonActive = "border-blue-100 bg-blue-50 text-blue-600";
const searchInputClass =
  "rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:bg-white";

/** Form values -> the stored Task, filling server-maintained fields. */
function toTask(id: number, values: TaskFormValues, today: string): Task {
  return {
    id,
    title: values.title,
    description: values.description,
    assignedTo: values.assignedTo,
    createdBy: "Gabriel Deora",
    dueAt: values.dueAt,
    priority: values.priority,
    status: values.status,
    completedAt: values.completedAt,
    completedBy: values.completedBy,
    completionNote: values.completionNote,
    cancelReason: values.cancelReason,
    rescheduleCount: 0,
    lead: values.lead,
    deal: values.deal,
    customer: values.customer,
    company: values.company,
    meeting: values.meeting,
    createdAt: today,
    updatedAt: today,
  };
}

/** Stored Task -> form values. */
function toFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description,
    assignedTo: task.assignedTo,
    dueAt: task.dueAt,
    priority: task.priority,
    status: task.status,
    completedAt: task.completedAt,
    completedBy: task.completedBy,
    completionNote: task.completionNote,
    cancelReason: task.cancelReason,
    lead: task.lead,
    deal: task.deal,
    customer: task.customer,
    company: task.company,
    meeting: task.meeting,
  };
}

const DUE_FILTER_OPTIONS: { value: TaskDueFilter; label: string }[] = [
  { value: "", label: "Any due date" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "upcoming", label: "Upcoming" },
];

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TasksFilter>(emptyFilters);
  const [dueFilter, setDueFilter] = useState<TaskDueFilter>("");
  const [sortSoonest, setSortSoonest] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [view, setView] = useState<"list" | "grid">("list");
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  // `null` = form closed; otherwise the values to seed the form with.
  const [formValues, setFormValues] = useState<TaskFormValues | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formTaskId, setFormTaskId] = useState<number | null>(null);



  useEffect(() => {
    const controller = new AbortController();

    async function loadTasks() {
      const token = getSession()?.token;

      if (!token) {
        setApiError("Your session has expired. Please sign in again.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setApiError("");

        const result = await request<{
          items: ApiTask[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
          };
        }>(ENDPOINTS.tasks.list, {
          token,
          signal: controller.signal,
        });

        setTasks(result.items.map(mapApiTask));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setApiError(
          error instanceof ApiError
            ? error.message
            : "Unable to load tasks. Please try again.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadTasks();

    return () => controller.abort();
  }, []);

  // Esc closes the task detail dialog
  useEffect(() => {
    if (!detailTask) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDetailTask(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detailTask]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    const active = (Object.keys(filters) as (keyof TasksFilter)[]).filter(
      key => filters[key].length > 0,
    );
    return tasks
      .filter(task => {
        const matchesSearch = [
          task.title,
          task.description,
          task.assignedTo,
          task.lead,
          task.deal,
          task.customer,
          task.company,
          task.meeting,
        ].some(value => value.toLowerCase().includes(query));
        if (!matchesSearch) return false;
        if (dueFilter && dueBucket(task) !== dueFilter) return false;
        return active.every(key =>
          (filters[key] as string[]).includes(task[key]),
        );
      })
      .sort((a, b) =>
        sortSoonest
          ? a.dueAt.localeCompare(b.dueAt)
          : b.dueAt.localeCompare(a.dueAt),
      );
  }, [tasks, search, filters, dueFilter, sortSoonest]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageTasks = filteredTasks.slice(startIndex, startIndex + pageSize);

  const visibleTaskColumns = useMemo(
    () => taskColumns.filter(column => !hiddenColumns.includes(column.key)),
    [hiddenColumns],
  );

  // Headline counters, computed over the filtered set so they track the view.
  const openCount = filteredTasks.filter(
    task => task.status === "OPEN" || task.status === "IN_PROGRESS",
  ).length;
  const overdueCount = filteredTasks.filter(
    task => dueBucket(task) === "overdue",
  ).length;
  const completedCount = filteredTasks.filter(
    task => task.status === "COMPLETED",
  ).length;

  const hasActiveFilters =
    search !== "" ||
    Object.values(filters).some(list => list.length > 0) ||
    dueFilter !== "";

  function updateFilter(key: keyof TasksFilter, values: string[]) {
    setFilters(previous => ({ ...previous, [key]: values }));
    setPage(1);
  }

  function resetFilters() {
    setSearch("");
    setFilters(emptyFilters);
    setDueFilter("");
    setPage(1);
  }

  function openCreateForm() {
    setFormMode("create");
    setFormTaskId(null);
    setFormValues({
      title: "",
      description: "",
      assignedTo: TASK_ASSIGNEES[0] ?? "",
      dueAt: "",
      priority: "MEDIUM",
      status: "OPEN",
      completedAt: "",
      completedBy: TASK_ASSIGNEES[0] ?? "",
      completionNote: "",
      cancelReason: "",
      lead: "",
      deal: "",
      customer: "",
      company: "",
      meeting: "",
    });
  }

  function openEditForm(task: Task) {
    setFormMode("edit");
    setFormTaskId(task.id);
    setFormValues(toFormValues(task));
    setDetailTask(null);
  }
  type ApiUser = {
    id: number;
    name: string;
    email: string;
    isActive: boolean;
  };

  type ApiUsersResponse = {
    success: boolean;
    message: string;
    data: {
      users: ApiUser[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  }

  async function saveTask(values: TaskFormValues) {
    const token = getSession()?.token;
      console.log("saveTask called with payload:", values);

    if (!token) {
      setApiError("Your session has expired. Please sign in again.");
      return;
    }

    try {
      setApiError("");

      if (formTaskId === null) {
        // Resolve the selected assignee to a real backend user ID.
        const response = await request<ApiUsersResponse>(
          ENDPOINTS.users.list,
          { token }
        );
  
        const users = response.data.users.filter(user => user.isActive);

        const assignee = users.find(
          user => user.name === values.assignedTo
        );

        if (!assignee) {
          setApiError(
            "Selected assignee does not exist. Select an active backend user."
          );
          return;
        }

        if (!assignee) {
          setApiError("Selected assignee was not found in the backend.");
          return;
        }

        // Map form values to IDs for related records
        let leadId: number | null = null;
        let dealId: number | null = null;
        let customerId: number | null = null;
        let companyId: number | null = null;
        
        if (values.lead) {
          const lead = initialLeads.find(
            (l) => `${l.firstName} ${l.lastName}` === values.lead,
          );
          if (lead) leadId = lead.id;
        } else if (values.deal) {
          const deal = initialDeals.find((d) => d.name === values.deal);
          if (deal) dealId = deal.id;
        } else if (values.customer) {
          const customer = initialCustomers.find(
            (c) => c.company === values.customer || `Customer #${c.id}` === values.customer,
          );
          if (customer) customerId = customer.id;
        } else if (values.company) {
          const company = initialCompanies.find((c) => c.name === values.company);
          if (company) companyId = company.id;
        } else {
          // If nothing linked, try to link to first lead as fallback (backend requires exactly one)
          if (initialLeads.length > 0) {
            leadId = initialLeads[0].id;
          } else if (initialDeals.length > 0) {
            dealId = initialDeals[0].id;
          } else if (initialCustomers.length > 0) {
            customerId = initialCustomers[0].id;
          } else if (initialCompanies.length > 0) {
            companyId = initialCompanies[0].id;
          }
        }

        const payload = {
          title: values.title,
          description: values.description || null,
          dueAt: new Date(values.dueAt).toISOString(),
          priority: values.priority,
          assignedToId: assignee.id,
          leadId,
          dealId,
          customerId,
          companyId,
        };

        await request(ENDPOINTS.tasks.create, {
          method: "POST",
          token,
          body: payload,
        });
      } else {
        // Editing requires the existing task ID.
        await request(ENDPOINTS.tasks.update(formTaskId), {
          method: "PATCH",
          token,
          body: {
            title: values.title,
            description: values.description || null,
            dueAt: new Date(values.dueAt).toISOString(),
            priority: values.priority,
          },
        });
      }

      setFormValues(null);
      setFormTaskId(null);

      // Reload from the database instead of adding a fake local task.
      const result = await request<{ items: ApiTask[] }>(
        ENDPOINTS.tasks.list,
        { token }
      );

      setTasks(result.items.map(mapApiTask));
      resetFilters();
    } catch (error) {
      setApiError(
        error instanceof ApiError
          ? error.message
          : "Unable to save the task. Please try again."
      );
    }
  }

  function deleteTask(id: number) {
    setTasks(previous => previous.filter(task => task.id !== id));
    setSelectedIds(previous => previous.filter(item => item !== id));
    setDetailTask(null);
  }

  /** Toggle a task straight to Completed, recording who and when. */
  function toggleComplete(task: Task) {
    const today = todayIso();
    const completing = task.status !== "COMPLETED";
    setTasks(previous =>
      previous.map(item =>
        item.id === task.id
          ? completing
            ? {
              ...item,
              status: "COMPLETED",
              completedAt: today,
              completedBy: item.assignedTo,
              cancelReason: "",
              updatedAt: today,
            }
            : {
              ...item,
              status: "OPEN",
              completedAt: "",
              completedBy: "",
              completionNote: "",
              updatedAt: today,
            }
          : item,
      ),
    );
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

  // Distinct values present in the data, so filters never show dead options.
  const statusOptions = useMemo(() => {
    const present = new Set(tasks.map(task => task.status).filter(Boolean));
    return TASK_STATUSES.filter(status => present.has(status));
  }, [tasks]);

  const priorityOptions = useMemo(() => {
    const present = new Set(tasks.map(task => task.priority).filter(Boolean));
    return TASK_PRIORITIES.filter(priority => present.has(priority));
  }, [tasks]);

  const assigneeOptions = useMemo(() => {
    const present = new Set(tasks.map(task => task.assignedTo).filter(Boolean));
    return [
      ...TASK_ASSIGNEES.filter(person => present.has(person)),
      ...[...present].filter(person => !TASK_ASSIGNEES.includes(person)),
    ];
  }, [tasks]);

  const filterSections: FilterCheckboxSection[] = [
    {
      title: "Status",
      items: statusOptions.map(status => taskStatusLabels[status]),
      selected: filters.status.map(status => taskStatusLabels[status]),
      onChange: labels =>
        updateFilter(
          "status",
          labels.map(
            label =>
              TASK_STATUSES.find(status => taskStatusLabels[status] === label) ??
              "OPEN",
          ),
        ),
    },
    {
      title: "Priority",
      items: priorityOptions.map(priority => priorityLabels[priority]),
      selected: filters.priority.map(priority => priorityLabels[priority]),
      onChange: labels =>
        updateFilter(
          "priority",
          labels.map(
            label =>
              TASK_PRIORITIES.find(
                priority => priorityLabels[priority] === label,
              ) ?? "MEDIUM",
          ),
        ),
    },
    {
      title: "Assignee",
      items: assigneeOptions,
      selected: filters.assignedTo,
      onChange: values => updateFilter("assignedTo", values),
    },
  ];

  // Due date is a single-choice dimension, so it belongs in a dropdown.
  const quickFilterSelects: FilterSelect[] = [
    {
      label: "Due date",
      value: dueFilter,
      options: DUE_FILTER_OPTIONS,
      onChange: value => {
        setDueFilter(value as TaskDueFilter);
        setPage(1);
      },
    },
  ];

  // Full-page create/edit form replaces the list while open
  if (formValues) {
    return (
      <div className="-m-4 md:-m-8">
        <TaskForm
          mode={formMode}
          values={formValues}
          onClose={() => {
            setFormValues(null);
            setFormTaskId(null);
          }}
          onSubmit={saveTask}
        />
      </div>
    );
  }

  return (
    <div className="relative -m-4 min-h-[calc(100vh-64px)] bg-white text-slate-700 md:-m-8">
      {/* Page header */}
      <header className="flex min-h-[54px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-slate-800">Tasks</h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
            {filteredTasks.length} records
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Headline counters: open, overdue, completed */}
          <div className="hidden items-center gap-3 rounded-md border border-slate-200 px-3 py-1.5 lg:flex">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <CalendarClock size={13} className="text-blue-500" />
              Open
              <b className="font-semibold text-slate-700">{openCount}</b>
            </span>
            <span className="h-4 w-px bg-slate-200" />
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <AlertTriangle size={13} className="text-rose-500" />
              Overdue
              <b className="font-semibold text-slate-700">{overdueCount}</b>
            </span>
            <span className="h-4 w-px bg-slate-200" />
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <CheckCircle2 size={13} className="text-emerald-500" />
              Done
              <b className="font-semibold text-slate-700">{completedCount}</b>
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
            Create Task
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
            className={`${toolbarButtonClass} ${showFilters ? "border-blue-100 bg-blue-50 text-blue-700" : ""
              }`}
          >
            <Filter size={14} />
            Filter
          </button>
          <button
            type="button"
            onClick={() => setSortSoonest(!sortSoonest)}
            className={toolbarButtonClass}
          >
            <ArrowUpDown size={14} />
            {sortSoonest ? "Soonest first" : "Latest first"}
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
              className={`${iconButtonClass} ${view === key ? iconButtonActive : iconButtonIdle
                }`}
            >
              <Icon size={15} />
            </button>
          ))}
          <TableSettings
            columns={taskColumnOptions}
            hidden={hiddenColumns}
            onChange={setHiddenColumns}
          />
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex h-[calc(100vh-220px)] min-h-0 items-stretch overflow-hidden">
        {showFilters && (
          <FilterSidebar
            title="Filter Tasks by"
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
                placeholder="Search tasks..."
                className={`${searchInputClass} w-full text-sm`}
              />
            </div>
          </div>

          {view === "list" && (
            <DataTable<Task>
              columns={visibleTaskColumns}
              rows={pageTasks}
              getRowId={task => task.id}
              onRowClick={task => setDetailTask(task)}
              selectable
              selectedIds={selectedIds}
              onSelectionChange={ids => setSelectedIds(ids as number[])}
              getRowLabel={task => task.title}
              renderRowMenu={task => (
                <>
                  <button
                    type="button"
                    onClick={() => setDetailTask(task)}
                    className="w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-50"
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleComplete(task)}
                    className="w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-50"
                  >
                    {task.status === "COMPLETED"
                      ? "Mark as open"
                      : "Mark as completed"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditForm(task)}
                    className="w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-50"
                  >
                    Edit task
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    className="w-full rounded px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50"
                  >
                    Delete task
                  </button>
                </>
              )}
              empty={
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Search size={20} className="text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No tasks found
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
              {pageTasks.map(task => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setDetailTask(task)}
                  className="rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={`truncate text-sm font-medium ${task.status === "COMPLETED"
                            ? "text-slate-400 line-through"
                            : "text-slate-800"
                          }`}
                      >
                        {task.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {task.assignedTo || "Unassigned"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium ${taskStatusStyles[task.status] ?? taskStatusStyles.OPEN
                        }`}
                    >
                      {taskStatusLabels[task.status] ?? task.status}
                    </span>
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <CalendarClock size={13} className="shrink-0" />
                    {task.dueAt || "No due date"}
                  </p>
                  <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-medium ${priorityStyles[task.priority] ?? priorityStyles.MEDIUM
                        }`}
                    >
                      {priorityLabels[task.priority] ?? task.priority}
                    </span>
                  </div>
                </button>
              ))}
              {pageTasks.length === 0 && (
                <p className="col-span-full py-16 text-center text-sm text-slate-500">
                  No tasks match your filters.
                </p>
              )}
            </div>
          )}

          <TablePagination
            total={filteredTasks.length}
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

      {detailTask && (
        <TaskDetailDialog
          task={detailTask}
          onClose={() => setDetailTask(null)}
        />
      )}
    </div>
  );
}
