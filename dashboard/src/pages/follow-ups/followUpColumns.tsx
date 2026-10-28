import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import type { FollowUp, FollowUpPriority, FollowUpStatus } from "./types";

export function getDueBucket(followUp: FollowUp): "today" | "overdue" | "upcoming" | "completed" {
  if (followUp.status === "COMPLETED") return "completed";
  if (!followUp.dueAt) return "upcoming";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTomorrow = startOfToday + 86400000;
  const dueDate = new Date(followUp.dueAt).getTime();

  if (dueDate < startOfToday) return "overdue";
  if (dueDate < startOfTomorrow) return "today";
  return "upcoming";
}

export function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return `Today, ${timeStr}`;
  if (isTomorrow) return `Tomorrow, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  return (
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + `, ${timeStr}`
  );
}

/** Standard CRM Priority pill styles (exact match to taskColumns.tsx) */
export const priorityStyles: Record<FollowUpPriority, string> = {
  URGENT: "bg-rose-100 text-rose-950 border border-rose-300 font-bold",
  HIGH: "bg-orange-100 text-orange-950 border border-orange-300 font-bold",
  MEDIUM: "bg-blue-100 text-blue-950 border border-blue-300 font-bold",
  LOW: "bg-slate-100 text-slate-900 border border-slate-300 font-bold",
};

export const priorityLabels: Record<FollowUpPriority, string> = {
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

/** Standard CRM Status pill styles (exact match to taskColumns.tsx) */
export const statusStyles: Record<FollowUpStatus, string> = {
  OPEN: "bg-blue-100 text-blue-950 border border-blue-300 font-bold",
  IN_PROGRESS: "bg-amber-100 text-amber-950 border border-amber-300 font-bold",
  COMPLETED: "bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold",
  CANCELLED: "bg-slate-100 text-slate-800 border border-slate-300 font-semibold",
};

export const statusLabels: Record<FollowUpStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** Consistent due bucket pill styling matching CRM design language */
export const dueBucketConfig = {
  today: {
    label: "Due Today",
    badge: "bg-amber-100 text-amber-950 border border-amber-300 font-bold",
    icon: Clock,
  },
  overdue: {
    label: "Overdue",
    badge: "bg-rose-100 text-rose-950 border border-rose-300 font-bold",
    icon: AlertTriangle,
  },
  upcoming: {
    label: "Upcoming",
    badge: "bg-blue-100 text-blue-950 border border-blue-300 font-bold",
    icon: CalendarDays,
  },
  completed: {
    label: "Completed",
    badge: "bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold",
    icon: CheckCircle2,
  },
};
