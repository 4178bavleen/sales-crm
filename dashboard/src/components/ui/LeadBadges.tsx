import type { LeadStatus, Priority } from "../../types/lead";
import type { PriorityTextProps, StatusBadgeProps } from "../../types/leadBadges";

export const statusBadgeStyles: Record<LeadStatus, string> = {
  NEW: "bg-blue-100 text-blue-900 border border-blue-300",
  CONTACTED: "bg-sky-100 text-sky-950 border border-sky-300",
  QUALIFIED: "bg-emerald-100 text-emerald-950 border border-emerald-300",
  CONVERTED: "bg-teal-100 text-teal-950 border border-teal-300",
  DISQUALIFIED: "bg-rose-100 text-rose-950 border border-rose-300",
};

export const sourceBadgeStyles: Record<string, string> = {
  "Cold Call": "bg-blue-50 text-blue-900 border-blue-300",
  "Advertisement": "bg-purple-50 text-purple-900 border-purple-300",
  "Web Download": "bg-emerald-50 text-emerald-950 border-emerald-300",
  "Seminar Partner": "bg-rose-50 text-rose-950 border-rose-300",
  "Online Store": "bg-amber-50 text-amber-950 border-amber-300",
  "Partner": "bg-sky-50 text-sky-950 border-sky-300",
  "External Referral": "bg-violet-50 text-violet-950 border-violet-300",
  "Social Media": "bg-indigo-50 text-indigo-950 border-indigo-300",
};

export const priorityDotStyles: Record<Priority, { dot: string; label: string; text: string }> = {
  LOW: { dot: "bg-slate-600", label: "Low", text: "text-slate-900 font-semibold" },
  MEDIUM: { dot: "bg-amber-600", label: "Medium", text: "text-slate-900 font-semibold" },
  HIGH: { dot: "bg-orange-600", label: "High", text: "text-slate-950 font-bold" },
  URGENT: { dot: "bg-rose-600", label: "Urgent", text: "text-rose-950 font-bold" },
};

/** Status pill matching the screenshot */
export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase ${
        statusBadgeStyles[status] || "bg-slate-100 text-slate-900 border border-slate-300"
      } ${className}`}
    >
      {status}
    </span>
  );
}

/** Source tag pill matching the screenshot */
export function SourceBadge({ source }: { source: string }) {
  const style = sourceBadgeStyles[source] || "bg-slate-100 text-slate-800 border-slate-300";
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-md border px-2.5 py-0.5 text-[11px] font-semibold ${style}`}
    >
      {source}
    </span>
  );
}

/** Coloured priority with dot matching the screenshot */
export function PriorityText({ priority }: PriorityTextProps) {
  const meta = priorityDotStyles[priority] || priorityDotStyles.LOW;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${meta.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
