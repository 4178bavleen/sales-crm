import {
  Building2,
  CalendarDays,
  CircleHelp,
  Clock3,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import type { DataTableColumn } from "../components/ui/DataTable";
import type { Lead, LeadStatus, Priority } from "../types/lead";

export const statusStyles: Record<LeadStatus, string> = {
  NEW: "bg-slate-100 text-slate-700",
  CONTACTED: "bg-blue-50 text-blue-700",
  QUALIFIED: "bg-emerald-50 text-emerald-700",
  DISQUALIFIED: "bg-rose-50 text-rose-700",
  CONVERTED: "bg-violet-50 text-violet-700",
};

export const priorityStyles: Record<Priority, string> = {
  LOW: "text-slate-500",
  MEDIUM: "text-blue-600",
  HIGH: "text-orange-600",
  URGENT: "text-rose-600",
};

export function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Read-only fields shown in the lead detail dialog and the CSV export. */
export const leadDetailFields: {
  label: string;
  Icon: typeof Mail;
  get: (lead: Lead) => string;
}[] = [
  { label: "Company", Icon: Building2, get: lead => lead.company },
  { label: "Email", Icon: Mail, get: lead => lead.email || "—" },
  { label: "Phone", Icon: Phone, get: lead => lead.phone || "—" },
  { label: "Lead Owner", Icon: UserRound, get: lead => lead.owner },
  { label: "Lead Source", Icon: CircleHelp, get: lead => lead.source },
  { label: "Created Time", Icon: CalendarDays, get: lead => formatDate(lead.createdAt) },
  { label: "Priority", Icon: Clock3, get: lead => lead.priority },
];

/** Flat string fields for the CSV export (cell() returns JSX, so it can't be reused here). */
export const leadCsvFields: { label: string; get: (lead: Lead) => string }[] = [
  { label: "First Name", get: lead => lead.firstName },
  { label: "Last Name", get: lead => lead.lastName },
  { label: "Company", get: lead => lead.company },
  { label: "Email", get: lead => lead.email },
  { label: "Phone", get: lead => lead.phone },
  { label: "Lead Source", get: lead => lead.source },
  { label: "Lead Owner", get: lead => lead.owner },
  { label: "Lead Status", get: lead => lead.status },
  { label: "Priority", get: lead => lead.priority },
  { label: "Created At", get: lead => lead.createdAt },
];

export const leadColumns: DataTableColumn<Lead>[] = [
  {
    key: "name",
    header: "Lead Name",
    className: "min-w-[170px]",
    cell: lead => (
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">
          {lead.firstName[0]}
          {lead.lastName[0]}
        </div>
        <div>
          <p className="text-xs font-medium text-blue-600 group-hover:text-blue-800">
            {lead.firstName} {lead.lastName}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">Lead #{lead.id}</p>
        </div>
      </div>
    ),
  },
  {
    key: "company",
    header: "Company",
    className: "text-xs text-slate-600",
    cell: lead => (
      <div className="flex items-center gap-2">
        <Building2 size={13} className="shrink-0 text-slate-400" />
        {lead.company}
      </div>
    ),
  },
  {
    key: "email",
    header: "Email",
    className: "text-xs text-slate-500",
    cell: lead => (
      <div className="flex max-w-[190px] items-center gap-2">
        <Mail size={13} className="shrink-0 text-slate-400" />
        <span className="truncate">{lead.email || "—"}</span>
      </div>
    ),
  },
  {
    key: "phone",
    header: "Phone",
    className: "whitespace-nowrap text-xs text-slate-600",
    cell: lead => (
      <div className="flex items-center gap-2">
        <Phone size={13} className="text-slate-400" />
        {lead.phone || "—"}
      </div>
    ),
  },
  {
    key: "source",
    header: "Lead Source",
    className: "whitespace-nowrap text-xs text-slate-600",
    cell: lead => lead.source,
  },
  {
    key: "owner",
    header: "Lead Owner",
    className: "whitespace-nowrap text-xs text-slate-600",
    cell: lead => (
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-50 text-[9px] font-semibold text-violet-700">
          {lead.owner
            .split(" ")
            .map(part => part[0])
            .join("")
            .slice(0, 2)}
        </div>
        {lead.owner}
      </div>
    ),
  },
  {
    key: "status",
    header: "Lead Status",
    cell: lead => (
      <span
        className={`whitespace-nowrap rounded px-2 py-1 text-[10px] font-medium ${statusStyles[lead.status]}`}
      >
        {lead.status}
      </span>
    ),
  },
  {
    key: "priority",
    header: "Priority",
    cell: lead => (
      <span
        className={`whitespace-nowrap text-[11px] font-medium ${priorityStyles[lead.priority]}`}
      >
        {lead.priority}
      </span>
    ),
  },
  {
    key: "createdAt",
    header: "Created Time",
    className: "whitespace-nowrap text-xs text-slate-500",
    cell: lead => formatDate(lead.createdAt),
  },
];

/** Column keys/labels for the TableSettings popover (built once, not per render). */
export const leadColumnOptions = leadColumns.map(column => ({
  key: column.key,
  label: String(column.header),
}));
