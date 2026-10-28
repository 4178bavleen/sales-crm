import {
  Building2,
  CalendarDays,
  CircleHelp,
  Clock3,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import type { LeadColumn, LeadCsvField, LeadField } from "../../types/leadUi";
import { PriorityText, SourceBadge, StatusBadge } from "../../components/ui/LeadBadges";

export { statusBadgeStyles as statusStyles } from "../../components/ui/LeadBadges";
export const priorityStyles: Record<string, string> = {
  LOW: "text-slate-700",
  MEDIUM: "text-blue-600",
  HIGH: "text-orange-600",
  URGENT: "text-rose-600",
};

export function formatDate(date: string) {
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

/** Render clean company icon */
export function CompanyLogo({ name: _name }: { name?: string }) {
  return <Building2 size={14} className="shrink-0 text-slate-700" />;
}

/** Read-only fields shown in the lead detail dialog and CSV export. */
export const leadDetailFields: LeadField[] = [
  { label: "Company", Icon: Building2, get: lead => lead.company || "—" },
  { label: "Email", Icon: Mail, get: lead => lead.email || "—" },
  { label: "Phone", Icon: Phone, get: lead => lead.phone || "—" },
  { label: "Lead Owner", Icon: UserRound, get: lead => lead.owner || "Unassigned" },
  { label: "Lead Source", Icon: CircleHelp, get: lead => lead.source || "—" },
  { label: "Next Follow-up", Icon: CalendarDays, get: lead => lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt) : (lead.noFollowUp ? (lead.noFollowUpNote ? `No follow-up (${lead.noFollowUpNote})` : "No follow-up needed") : "—") },
  { label: "Created Time", Icon: CalendarDays, get: lead => formatDate(lead.createdAt) },
  { label: "Priority", Icon: Clock3, get: lead => lead.priority },
];

/** Flat string fields for CSV export. */
export const leadCsvFields: LeadCsvField[] = [
  { label: "Lead Name", get: lead => `${lead.firstName} ${lead.lastName}`.trim() },
  { label: "Company", get: lead => lead.company || "" },
  { label: "Email", get: lead => lead.email || "" },
  { label: "Phone", get: lead => lead.phone || "" },
  { label: "Lead Source", get: lead => lead.source || "" },
  { label: "Status", get: lead => lead.status },
  { label: "Priority", get: lead => lead.priority },
  { label: "Owner", get: lead => lead.owner || "" },
  { label: "Next Follow-up", get: lead => lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt) : (lead.noFollowUp ? (lead.noFollowUpNote ? `No follow-up (${lead.noFollowUpNote})` : "No follow-up") : "") },
  { label: "Notes", get: lead => lead.notes || "" },
];

export const leadColumns: LeadColumn[] = [
  {
    key: "sno",
    header: "S.No",
    className: "w-14 text-center text-xs font-bold text-slate-900 whitespace-nowrap",
    headerClassName: "w-14 text-center whitespace-nowrap",
    cell: (_lead, index) => (
      <span className="text-slate-900 font-bold">
        {typeof index === "number" ? index + 1 : "—"}
      </span>
    ),
  },
  {
    key: "name",
    header: "Lead Name",
    className: "min-w-[190px]",
    cell: lead => {
      const initials =
        `${lead.firstName[0] || ""}${lead.lastName[0] || ""}`.trim() ||
        lead.firstName.slice(0, 2).toUpperCase() ||
        "L";
      return (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#154fc1]">
            {initials}
          </div>
          <div>
            <p className="text-xs font-bold text-[#154fc1] hover:underline cursor-pointer">
              {lead.firstName} {lead.lastName}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    key: "company",
    header: "Company",
    className: "text-xs text-slate-950 min-w-[180px]",
    cell: lead => (
      <div className="flex items-center gap-2">
        <CompanyLogo name={lead.company} />
        <span className="font-bold text-slate-950">{lead.company || "—"}</span>
      </div>
    ),
  },
  {
    key: "contact",
    header: "Contact Info",
    className: "text-xs text-slate-900 min-w-[200px]",
    cell: lead => (
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5 text-slate-950 font-semibold">
          <Mail size={12} className="shrink-0 text-slate-600" />
          <span className="truncate">{lead.email || "—"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-800 text-[11px] font-semibold">
          <Phone size={12} className="shrink-0 text-slate-600" />
          <span>{lead.phone || "—"}</span>
        </div>
      </div>
    ),
  },
  {
    key: "source",
    header: "Lead Source",
    className: "whitespace-nowrap min-w-[130px]",
    cell: lead => <SourceBadge source={lead.source} />,
  },
  {
    key: "status",
    header: "Status",
    className: "whitespace-nowrap min-w-[120px]",
    cell: lead => <StatusBadge status={lead.status} />,
  },
  {
    key: "priority",
    header: "Priority",
    className: "whitespace-nowrap min-w-[100px]",
    cell: lead => <PriorityText priority={lead.priority} />,
  },
  {
    key: "owner",
    header: "Owner",
    className: "whitespace-nowrap min-w-[140px]",
    cell: lead => {
      const ownerInitials = (lead.owner || "Unassigned")
        .split(" ")
        .map(p => p[0] || "")
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "UN";
      return (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-900">
            {ownerInitials}
          </div>
          <span className="text-xs text-slate-950 font-bold">{lead.owner || "Unassigned"}</span>
        </div>
      );
    },
  },
  {
    key: "nextFollowUpAt",
    header: "Next Follow-up",
    className: "whitespace-nowrap text-xs text-slate-950 min-w-[130px]",
    cell: lead => {
      if (!lead.nextFollowUpAt) {
        return (
          <span
            className="text-slate-600 font-medium italic"
            title={lead.noFollowUpNote || undefined}
          >
            {lead.noFollowUp
              ? lead.noFollowUpNote
                ? `No follow-up (${lead.noFollowUpNote})`
                : "No follow-up"
              : "—"}
          </span>
        );
      }
      return (
        <div className="flex items-center gap-1.5 text-slate-950 font-semibold">
          <CalendarDays size={13} className="text-slate-700" />
          <span>{formatDate(lead.nextFollowUpAt)}</span>
        </div>
      );
    },
  },
  {
    key: "createdAt",
    header: "Created Date",
    className: "whitespace-nowrap text-xs font-bold text-slate-900 min-w-[110px]",
    cell: lead => formatDate(lead.createdAt),
  },
];

export const leadColumnOptions = leadColumns.map(column => ({
  key: column.key,
  label: String(column.header),
}));
