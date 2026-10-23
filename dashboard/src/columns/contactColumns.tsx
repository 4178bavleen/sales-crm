import {
  Building2,
  BriefcaseBusiness,
  CalendarDays,
  Mail,
  Phone,
} from "lucide-react";
import type {
  ContactColumn,
  ContactCsvField,
  ContactField,
} from "../types/contactUi";
import Avatar from "../components/ui/Avatar";

export function formatContactDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Read-only fields shown in the contact detail dialog. */
export const contactDetailFields: ContactField[] = [
  { label: "Company", Icon: Building2, get: contact => contact.company || "—" },
  {
    label: "Job Title",
    Icon: BriefcaseBusiness,
    get: contact => contact.jobTitle || "—",
  },
  { label: "Email", Icon: Mail, get: contact => contact.email || "—" },
  { label: "Phone", Icon: Phone, get: contact => contact.phone || "—" },
  {
    label: "Created Time",
    Icon: CalendarDays,
    get: contact => formatContactDate(contact.createdAt),
  },
];

/**
 * Flat string fields for the CSV export.
 * `cell()` returns JSX, so it can't be reused for the export.
 */
export const contactCsvFields: ContactCsvField[] = [
  { label: "Full Name", get: contact => contact.fullName },
  { label: "Company", get: contact => contact.company },
  { label: "Job Title", get: contact => contact.jobTitle },
  { label: "Email", get: contact => contact.email },
  { label: "Phone", get: contact => contact.phone },
  { label: "Notes", get: contact => contact.notes },
  { label: "Created At", get: contact => contact.createdAt },
];

export const contactColumns: ContactColumn[] = [
  {
    key: "fullName",
    header: "Contact",
    className: "min-w-[190px]",
    cell: contact => (
      <div className="flex items-center gap-2">
        <Avatar name={contact.fullName} seed={contact.id} />
        <div>
          <p className="text-xs font-semibold text-blue-600 group-hover:text-blue-800">
            {contact.fullName}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500">
            Contact #{contact.id}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "jobTitle",
    header: "Job Title",
    className: "whitespace-nowrap text-xs font-medium text-slate-800",
    cell: contact =>
      contact.jobTitle ? (
        <span className="inline-flex items-center gap-2">
          <BriefcaseBusiness size={13} className="shrink-0 text-slate-500" />
          {contact.jobTitle}
        </span>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    key: "company",
    header: "Company",
    className: "text-xs font-medium text-slate-800",
    cell: contact =>
      contact.company ? (
        <span className="inline-flex items-center gap-2">
          <Building2 size={13} className="shrink-0 text-slate-500" />
          {contact.company}
        </span>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    key: "email",
    header: "Email",
    className: "text-xs font-medium text-slate-800",
    cell: contact => (
      <div className="flex max-w-[210px] items-center gap-2">
        <Mail size={13} className="shrink-0 text-slate-500" />
        <span className="truncate">{contact.email || "—"}</span>
      </div>
    ),
  },
  {
    key: "phone",
    header: "Phone",
    className: "whitespace-nowrap text-xs font-medium text-slate-800",
    cell: contact => (
      <div className="flex items-center gap-2">
        <Phone size={13} className="text-slate-500" />
        {contact.phone || "—"}
      </div>
    ),
  },
  {
    key: "notes",
    header: "Notes",
    className: "text-xs text-slate-800",
    cell: contact => (
      <span className="block max-w-[240px] truncate" title={contact.notes}>
        {contact.notes || "—"}
      </span>
    ),
  },
  {
    key: "createdAt",
    header: "Created Time",
    className: "whitespace-nowrap text-xs font-medium text-slate-700",
    cell: contact => formatContactDate(contact.createdAt),
  },
];

/** Column keys/labels for the TableSettings popover (built once, not per render). */
export const contactColumnOptions = contactColumns.map(column => ({
  key: column.key,
  label: String(column.header),
}));
