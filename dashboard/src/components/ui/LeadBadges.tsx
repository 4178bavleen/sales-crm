import type { LeadStatus, Priority } from "../../types/lead";
import type { PriorityTextProps, StatusBadgeProps } from "../../types/leadBadges";

export const statusBadgeStyles: Record<LeadStatus, string> = {
  NEW: "bg-[#e0edff] text-[#1d61e7]",
  CONTACTED: "bg-[#e0f2fe] text-[#0284c7]",
  QUALIFIED: "bg-[#dcfce7] text-[#16a34a]",
  CONVERTED: "bg-[#ccfbf1] text-[#0d9488]",
  DISQUALIFIED: "bg-[#ffe4e6] text-[#e11d48]",
};

export const sourceBadgeStyles: Record<string, string> = {
  "Cold Call": "bg-blue-50 text-blue-600 border-blue-200",
  "Advertisement": "bg-purple-50 text-purple-600 border-purple-200",
  "Web Download": "bg-emerald-50 text-emerald-600 border-emerald-200",
  "Seminar Partner": "bg-rose-50 text-rose-600 border-rose-200",
  "Online Store": "bg-amber-50 text-amber-600 border-amber-200",
  "Partner": "bg-sky-50 text-sky-600 border-sky-200",
  "External Referral": "bg-violet-50 text-violet-600 border-violet-200",
  "Social Media": "bg-indigo-50 text-indigo-600 border-indigo-200",
};

export const priorityDotStyles: Record<Priority, { dot: string; label: string; text: string }> = {
  LOW: { dot: "bg-slate-400", label: "Low", text: "text-slate-600" },
  MEDIUM: { dot: "bg-amber-500", label: "Medium", text: "text-slate-600" },
  HIGH: { dot: "bg-rose-600", label: "High", text: "text-slate-600" },
  URGENT: { dot: "bg-red-600", label: "Urgent", text: "text-rose-700 font-semibold" },
};

/** Status pill matching the screenshot */
export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase ${
        statusBadgeStyles[status] || "bg-slate-100 text-slate-700"
      } ${className}`}
    >
      {status}
    </span>
  );
}

/** Source tag pill matching the screenshot */
export function SourceBadge({ source }: { source: string }) {
  const style = sourceBadgeStyles[source] || "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-md border px-2.5 py-0.5 text-[11px] font-medium ${style}`}
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
