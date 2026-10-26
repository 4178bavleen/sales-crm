import {
  Building2,
  CalendarDays,
  Globe,
  MapPin,
  Phone,
  Factory,
  Users,
} from "lucide-react";
import type {
  CompanyColumn,
  CompanyCsvField,
  CompanyField,
} from "../types/companyUi";

export function formatCompanyDate(date: string) {
  if (!date) return "—";
  const d = new Date(date.includes("T") ? date : `${date}T12:00:00`);
  if (isNaN(d.getTime())) {
    const fallback = new Date(date);
    if (isNaN(fallback.getTime())) return "—";
    return fallback.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return d.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Industry pill colours, keeping the Companies page on-theme with Leads. */
export const industryStyles: Record<string, string> = {
  Technology: "bg-blue-50 text-blue-700",
  Finance: "bg-violet-50 text-violet-700",
  Healthcare: "bg-emerald-50 text-emerald-700",
  Manufacturing: "bg-amber-50 text-amber-700",
  Retail: "bg-rose-50 text-rose-700",
  Education: "bg-cyan-50 text-cyan-700",
  Other: "bg-slate-100 text-slate-700",
};

/** Read-only fields shown in the company detail dialog. */
export const companyDetailFields: CompanyField[] = [
  { label: "Industry", Icon: Factory, get: company => company.industry || "—" },
  { label: "Website", Icon: Globe, get: company => company.website || "—" },
  { label: "Phone", Icon: Phone, get: company => company.phone || "—" },
  {
    label: "Location",
    Icon: MapPin,
    get: company =>
      [company.city, company.state, company.country].filter(Boolean).join(", ") ||
      "—",
  },
  {
    label: "Address",
    Icon: Building2,
    get: company => company.address || "—",
  },
  {
    label: "Contacts",
    Icon: Users,
    get: company => String(company.contactCount),
  },
  {
    label: "Created Time",
    Icon: CalendarDays,
    get: company => formatCompanyDate(company.createdAt),
  },
];

/**
 * Flat string fields for the CSV export.
 * `cell()` returns JSX, so it can't be reused for the export.
 */
export const companyCsvFields: CompanyCsvField[] = [
  { label: "Company Name", get: company => company.name },
  { label: "Industry", get: company => company.industry },
  { label: "Website", get: company => company.website },
  { label: "Phone", get: company => company.phone },
  { label: "Address", get: company => company.address },
  { label: "City", get: company => company.city },
  { label: "State", get: company => company.state },
  { label: "Country", get: company => company.country },
  { label: "Contacts", get: company => String(company.contactCount) },
  { label: "Notes", get: company => company.notes },
  { label: "Created At", get: company => company.createdAt },
];

export const companyColumns: CompanyColumn[] = [
  {
    key: "name",
    header: "Company",
    className: "min-w-[190px]",
    cell: company => (
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
          <Building2 size={15} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-blue-600 group-hover:text-blue-800">
            {company.name}
          </p>
          <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">
            {company.city ? `${company.city}, ${company.country}` : "No location"}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "industry",
    header: "Industry",
    className: "whitespace-nowrap",
    cell: company =>
      company.industry ? (
        <span
          className={`rounded px-2 py-1 text-[10px] font-medium ${
            industryStyles[company.industry] ?? industryStyles.Other
          }`}
        >
          {company.industry}
        </span>
      ) : (
        <span className="text-xs text-slate-400">—</span>
      ),
  },
  {
    key: "contactCount",
    header: "Contacts",
    className: "whitespace-nowrap text-xs font-medium text-slate-800",
    cell: company => (
      <span className="inline-flex items-center gap-2">
        <Users size={13} className="shrink-0 text-slate-500" />
        {company.contactCount}
      </span>
    ),
  },
  {
    key: "website",
    header: "Website",
    className: "text-xs font-medium text-slate-800",
    cell: company => (
      <div className="flex max-w-[200px] items-center gap-2">
        <Globe size={13} className="shrink-0 text-slate-500" />
        <span className="truncate">{company.website || "—"}</span>
      </div>
    ),
  },
  {
    key: "phone",
    header: "Phone",
    className: "whitespace-nowrap text-xs font-medium text-slate-800",
    cell: company => (
      <div className="flex items-center gap-2">
        <Phone size={13} className="text-slate-500" />
        {company.phone || "—"}
      </div>
    ),
  },
  {
    key: "location",
    header: "Location",
    className: "whitespace-nowrap text-xs font-medium text-slate-800",
    cell: company => (
      <div className="flex items-center gap-2">
        <MapPin size={13} className="shrink-0 text-slate-500" />
        {[company.city, company.country].filter(Boolean).join(", ") || "—"}
      </div>
    ),
  },
  {
    key: "notes",
    header: "Notes",
    className: "text-xs text-slate-800",
    cell: company => (
      <span className="block max-w-[240px] truncate" title={company.notes}>
        {company.notes || "—"}
      </span>
    ),
  },
  {
    key: "createdAt",
    header: "Created Time",
    className: "whitespace-nowrap text-xs font-medium text-slate-700",
    cell: company => formatCompanyDate(company.createdAt),
  },
];

/** Column keys/labels for the TableSettings popover (built once, not per render). */
export const companyColumnOptions = companyColumns.map(column => ({
  key: column.key,
  label: String(column.header),
}));
