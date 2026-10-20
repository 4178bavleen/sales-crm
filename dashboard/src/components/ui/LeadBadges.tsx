import type { LeadStatus, Priority } from "../../types/lead";
import { priorityStyles, statusStyles } from "../../data/leadColumns";

/** Status pill — used in the table cell, grid card and detail dialog. */
export function StatusBadge({
  status,
  className = "",
}: {
  status: LeadStatus;
  className?: string;
}) {
  return (
    <span
      className={`whitespace-nowrap rounded px-2 py-1 text-[10px] font-medium ${statusStyles[status]} ${className}`}
    >
      {status}
    </span>
  );
}

/** Coloured priority label — table cell and detail dialog. */
export function PriorityText({ priority }: { priority: Priority }) {
  return (
    <span
      className={`whitespace-nowrap text-[11px] font-medium ${priorityStyles[priority]}`}
    >
      {priority}
    </span>
  );
}
