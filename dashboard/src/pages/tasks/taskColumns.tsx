import {
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Handshake,
  ListChecks,
  MessageSquare,
  Repeat,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import type { TaskColumn, TaskCsvField, TaskField } from "../../types/taskUi";
import type { Priority, TaskLinkKind, TaskStatus } from "../../types/task";
import { TASK_LINK_LABELS } from "../../types/task";

export function formatTaskDate(date: string) {
  if (!date) return "—";
  try {
    const d = new Date(date.includes("T") ? date : `${date}T12:00:00`);
    if (isNaN(d.getTime())) return date;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

export function formatTaskDateTime(date: string) {
  if (!date) return "—";
  try {
    const d = new Date(date.includes("T") ? date : `${date}T12:00:00`);
    if (isNaN(d.getTime())) return date;
    const formattedDate = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${formattedDate}, ${formattedTime}`;
  } catch {
    return date;
  }
}

/** Priority pill colours (Prisma enum Priority). */
export const priorityStyles: Record<Priority, string> = {
  URGENT: "bg-rose-50 text-rose-700",
  HIGH: "bg-amber-50 text-amber-700",
  MEDIUM: "bg-blue-50 text-blue-700",
  LOW: "bg-slate-100 text-slate-600",
};

export const priorityLabels: Record<Priority, string> = {
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

/** Task status pill colours (Prisma enum TaskStatus). */
export const taskStatusStyles: Record<TaskStatus, string> = {
  OPEN: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** The five optional links, in the order they are checked for "Related to". */
export const TASK_LINK_ORDER: TaskLinkKind[] = [
  "deal",
  "lead",
  "customer",
  "company",
  "meeting",
];

/**
 * Resolve the single "Related to" value for a task: whichever of the five
 * optional relations is set. Returns the kind and the display value, or null.
 */
export function taskLink(
  task: {
    lead: string;
    deal: string;
    customer: string;
    company: string;
    meeting: string;
  },
): { kind: TaskLinkKind; value: string } | null {
  for (const kind of TASK_LINK_ORDER) {
    if (task[kind]) return { kind, value: task[kind] };
  }
  return null;
}

/** Today's date as an ISO day string, for due-date comparisons. */
export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Due-date bucket for a task, matching the schema's index comment
 * ("today / overdue / upcoming lists"). Completed and cancelled tasks are
 * never overdue — their due date is no longer actionable.
 */
export function dueBucket(
  task: { dueAt: string; status: TaskStatus },
): "overdue" | "today" | "upcoming" | "none" {
  if (task.status === "COMPLETED" || task.status === "CANCELLED") return "none";
  const today = todayIso();
  if (task.dueAt < today) return "overdue";
  if (task.dueAt === today) return "today";
  return "upcoming";
}

/** Red / amber / slate due-date styling, so overdue tasks stand out. */
export function dueStyles(task: { dueAt: string; status: TaskStatus }) {
  const bucket = dueBucket(task);
  if (bucket === "overdue") return "text-rose-600";
  if (bucket === "today") return "text-amber-600";
  return "text-slate-500";
}

/** Short "Overdue by 3 days" / "Due today" style label. */
export function dueLabel(task: { dueAt: string; status: TaskStatus }) {
  const bucket = dueBucket(task);
  if (bucket === "today") return "Due today";
  if (bucket === "overdue") {
    try {
      const today = new Date(`${todayIso()}T12:00:00`).getTime();
      const taskDate = new Date(
        task.dueAt.includes("T") ? task.dueAt : `${task.dueAt}T12:00:00`,
      ).getTime();
      const days = Math.max(1, Math.round((today - taskDate) / 86_400_000));
      return `Overdue by ${days} day${days === 1 ? "" : "s"}`;
    } catch {
      return "Overdue";
    }
  }
  if (bucket === "upcoming") return `Due ${formatTaskDate(task.dueAt)}`;
  return formatTaskDate(task.dueAt);
}

/**
 * Read-only fields shown in the task detail dialog.
 * Completion fields use `onlyFor: ["COMPLETED"]` and the cancel reason
 * `onlyFor: ["CANCELLED"]`, matching the schema's rule that those columns are
 * only set in that state.
 */
export const taskDetailFields: TaskField[] = [
  { label: "Assignee", Icon: UserRound, get: task => task.assignedTo || "—" },
  { label: "Created By", Icon: Users, get: task => task.createdBy || "—" },
  { label: "Due", Icon: CalendarClock, get: task => dueLabel(task) },
  {
    label: "Priority",
    Icon: CircleDollarSign,
    get: task => priorityLabels[task.priority] ?? task.priority,
  },
  { label: "Status", Icon: ListChecks, get: task => taskStatusLabels[task.status] ?? task.status },
  {
    label: "Related To",
    Icon: Handshake,
    get: task => {
      const link = taskLink(task);
      return link ? `${TASK_LINK_LABELS[link.kind]} · ${link.value}` : "—";
    },
  },
  { label: "Description", Icon: MessageSquare, get: task => task.description || "—" },
  {
    label: "Completed At",
    Icon: CheckCircle2,
    get: task => formatTaskDate(task.completedAt),
    onlyFor: ["COMPLETED"],
  },
  {
    label: "Completed By",
    Icon: UserRound,
    get: task => task.completedBy || "—",
    onlyFor: ["COMPLETED"],
  },
  {
    label: "Completion Note",
    Icon: MessageSquare,
    get: task => task.completionNote || "—",
    onlyFor: ["COMPLETED"],
  },
  {
    label: "Cancel Reason",
    Icon: XCircle,
    get: task => task.cancelReason || "—",
    onlyFor: ["CANCELLED"],
  },
  {
    label: "Reschedule Count",
    Icon: Repeat,
    get: task => String(task.rescheduleCount),
  },
  { label: "Created Time", Icon: CalendarDays, get: task => formatTaskDateTime(task.createdAt) },
];

/**
 * Flat string fields for the CSV export.
 * `cell()` returns JSX, so it can't be reused for the export.
 */
export const taskCsvFields: TaskCsvField[] = [
  { label: "Title", get: task => task.title },
  { label: "Description", get: task => task.description },
  { label: "Assignee", get: task => task.assignedTo },
  { label: "Created By", get: task => task.createdBy },
  { label: "Due At", get: task => task.dueAt },
  { label: "Priority", get: task => task.priority },
  { label: "Status", get: task => task.status },
  { label: "Completed At", get: task => task.completedAt },
  { label: "Completed By", get: task => task.completedBy },
  { label: "Completion Note", get: task => task.completionNote },
  { label: "Cancel Reason", get: task => task.cancelReason },
  { label: "Reschedule Count", get: task => String(task.rescheduleCount) },
  { label: "Lead", get: task => task.lead },
  { label: "Deal", get: task => task.deal },
  { label: "Customer", get: task => task.customer },
  { label: "Company", get: task => task.company },
  { label: "Meeting", get: task => task.meeting },
  { label: "Created At", get: task => task.createdAt },
];

export const taskColumns: TaskColumn[] = [
  {
    key: "title",
    header: "Task",
    className: "min-w-[220px]",
    cell: task => (
      <div className="min-w-0">
        <p
          className={`truncate text-xs font-semibold ${
            task.status === "COMPLETED"
              ? "text-slate-400 line-through"
              : "text-[#1d61e7] hover:underline cursor-pointer"
          }`}
        >
          {task.title}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-slate-400">
          {task.description || `Task #${task.id}`}
        </p>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "whitespace-nowrap",
    cell: task => (
      <span
        className={`rounded px-2 py-1 text-[10px] font-medium ${
          taskStatusStyles[task.status] ?? taskStatusStyles.OPEN
        }`}
      >
        {taskStatusLabels[task.status] ?? task.status}
      </span>
    ),
  },
  {
    key: "priority",
    header: "Priority",
    className: "whitespace-nowrap",
    cell: task => (
      <span
        className={`rounded px-2 py-1 text-[10px] font-medium ${
          priorityStyles[task.priority] ?? priorityStyles.MEDIUM
        }`}
      >
        {priorityLabels[task.priority] ?? task.priority}
      </span>
    ),
  },
  {
    key: "dueAt",
    header: "Due",
    className: "whitespace-nowrap text-xs",
    cell: task => (
      <span className={dueStyles(task)}>{dueLabel(task)}</span>
    ),
  },
  {
    key: "assignedTo",
    header: "Assignee",
    className: "whitespace-nowrap text-xs text-slate-600",
    cell: task => (
      <span className="inline-flex items-center gap-2">
        <UserRound size={13} className="shrink-0 text-slate-400" />
        {task.assignedTo || "—"}
      </span>
    ),
  },
  {
    key: "relatedTo",
    header: "Related To",
    className: "whitespace-nowrap text-xs text-slate-600",
    cell: task => {
      const link = taskLink(task);
      if (!link) return <span className="text-slate-300">—</span>;
      const Icon = link.kind === "lead" ? Users : Building2;
      return (
        <span className="inline-flex items-center gap-2">
          <Icon size={13} className="shrink-0 text-slate-400" />
          <span className="truncate">
            <span className="text-[10px] text-slate-400">
              {TASK_LINK_LABELS[link.kind]}
            </span>{" "}
            {link.value}
          </span>
        </span>
      );
    },
  },
  {
    key: "createdAt",
    header: "Created Time",
    className: "whitespace-nowrap text-xs text-slate-500",
    cell: task => formatTaskDateTime(task.createdAt),
  },
];

/** Column keys/labels for the TableSettings popover (built once, not per render). */
export const taskColumnOptions = taskColumns.map(column => ({
  key: column.key,
  label: String(column.header),
}));
