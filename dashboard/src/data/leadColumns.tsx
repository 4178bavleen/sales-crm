import {
  Building2,
  CalendarDays,
  CircleHelp,
  Clock3,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import type { LeadColumn, LeadCsvField, LeadField } from "../types/leadUi";
import { PriorityText, SourceBadge, StatusBadge } from "../components/ui/LeadBadges";

export { statusBadgeStyles as statusStyles } from "../components/ui/LeadBadges";
export const priorityStyles: Record<string, string> = {
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

/** Render company logo or icon matching the screenshot */
export function CompanyLogo({ name }: { name: string }) {
  if (name.includes("Buckley")) {
    return (
      <svg className="h-4 w-4 shrink-0 text-slate-900" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    );
  }
  if (name.includes("Creative Business")) {
    return (
      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm font-black text-rose-600 text-xs">
        C
      </div>
    );
  }
  if (name.includes("Chapman") || name.includes("Grayson")) {
    return (
      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-700 text-[9px] font-bold text-slate-800">
        G
      </div>
    );
  }
  if (name.includes("Printing Dimensions")) {
    return (
      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-700">
        <div className="h-1.5 w-1.5 rounded-sm bg-slate-700" />
      </div>
    );
  }
  if (name.includes("Dal Tile")) {
    return (
      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-700">
        <div className="h-1.5 w-1.5 rounded-full border border-slate-700" />
      </div>
    );
  }
  return <Building2 size={14} className="shrink-0 text-slate-700" />;
}

/** Read-only fields shown in the lead detail dialog and CSV export. */
export const leadDetailFields: LeadField[] = [
  { label: "Company", Icon: Building2, get: lead => lead.company },
  { label: "Email", Icon: Mail, get: lead => lead.email || "—" },
  { label: "Phone", Icon: Phone, get: lead => lead.phone || "—" },
  { label: "Lead Owner", Icon: UserRound, get: lead => lead.owner },
  { label: "Lead Source", Icon: CircleHelp, get: lead => lead.source },
  { label: "Created Time", Icon: CalendarDays, get: lead => formatDate(lead.createdAt) },
  { label: "Priority", Icon: Clock3, get: lead => lead.priority },
];

/** Flat string fields for CSV export. */
export const leadCsvFields: LeadCsvField[] = [
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

export const leadColumns: LeadColumn[] = [
  {
    key: "name",
    header: "Lead Name",
    className: "min-w-[190px]",
    cell: lead => {
      const initials = `${lead.firstName[0]}${lead.lastName[0]}`;
      return (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#1d61e7]">
            {initials}
          </div>
          <div>
            <p className="text-xs font-semibold text-[#1d61e7] hover:underline cursor-pointer">
              {lead.firstName} {lead.lastName}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">Lead #{lead.id}</p>
          </div>
        </div>
      );
    },
  },
  {
    key: "company",
    header: "Company",
    className: "text-xs text-slate-700 min-w-[180px]",
    cell: lead => (
      <div className="flex items-center gap-2">
        <CompanyLogo name={lead.company} />
        <span className="font-medium text-slate-700">{lead.company}</span>
      </div>
    ),
  },
  {
    key: "contact",
    header: "Contact Info",
    className: "text-xs text-slate-600 min-w-[200px]",
    cell: lead => (
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Mail size={12} className="shrink-0 text-slate-400" />
          <span className="truncate">{lead.email}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
          <Phone size={12} className="shrink-0 text-slate-400" />
          <span>{lead.phone}</span>
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
      const ownerInitials = lead.owner
        .split(" ")
        .map(p => p[0])
        .slice(0, 2)
        .join("");
      return (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-700">
            {ownerInitials}
          </div>
          <span className="text-xs text-slate-700 font-medium">{lead.owner}</span>
        </div>
      );
    },
  },
  {
    key: "createdAt",
    header: "Created Date",
    className: "whitespace-nowrap text-xs text-slate-500 min-w-[110px]",
    cell: lead => formatDate(lead.createdAt),
  },
];

export const leadColumnOptions = leadColumns.map(column => ({
  key: column.key,
  label: String(column.header),
}));
