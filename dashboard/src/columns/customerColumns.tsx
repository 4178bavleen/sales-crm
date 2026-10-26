import {
  Building2,
  CalendarDays,
  CircleDollarSign,
  Factory,
  Handshake,
  Layers,
  UserRound,
} from "lucide-react";
import type {
  CustomerColumn,
  CustomerCsvField,
  CustomerField,
} from "../types/customerUi";

export function formatCustomerDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Compact USD formatting for pipeline values (whole dollars). */
export function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** Read-only fields shown in the customer detail dialog. */
export const customerDetailFields: CustomerField[] = [
  {
    label: "Industry",
    Icon: Factory,
    get: customer => customer.industry || "—",
  },
  {
    label: "Primary Contact",
    Icon: UserRound,
    get: customer => customer.primaryContact || "—",
  },
  {
    label: "Account Owner",
    Icon: Handshake,
    get: customer => customer.owner || "—",
  },
  {
    label: "Deals",
    Icon: Layers,
    get: customer => String(customer.dealCount),
  },
  {
    label: "Pipeline Value",
    Icon: CircleDollarSign,
    get: customer => formatCurrency(customer.pipelineValue),
  },
  {
    label: "Converted",
    Icon: CalendarDays,
    get: customer => formatCustomerDate(customer.convertedAt),
  },
];

/**
 * Flat string fields for the CSV export.
 * `cell()` returns JSX, so it can't be reused for the export.
 */
export const customerCsvFields: CustomerCsvField[] = [
  { label: "Company", get: customer => customer.company },
  { label: "Industry", get: customer => customer.industry },
  { label: "Primary Contact", get: customer => customer.primaryContact },
  { label: "Account Owner", get: customer => customer.owner },
  { label: "Deals", get: customer => String(customer.dealCount) },
  { label: "Pipeline Value", get: customer => String(customer.pipelineValue) },
  { label: "Converted At", get: customer => customer.convertedAt },
  { label: "Notes", get: customer => customer.notes },
];

export const customerColumns: CustomerColumn[] = [
  {
    key: "company",
    header: "Customer",
    className: "min-w-[200px]",
    cell: customer => (
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
          <Building2 size={15} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-blue-600 group-hover:text-blue-800">
            {customer.company}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "industry",
    header: "Industry",
    className: "whitespace-nowrap text-xs font-medium text-slate-800",
    cell: customer =>
      customer.industry ? (
        <span className="inline-flex items-center gap-2">
          <Factory size={13} className="shrink-0 text-slate-500" />
          {customer.industry}
        </span>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    key: "primaryContact",
    header: "Primary Contact",
    className: "whitespace-nowrap text-xs font-medium text-slate-800",
    cell: customer =>
      customer.primaryContact ? (
        <span className="inline-flex items-center gap-2">
          <UserRound size={13} className="shrink-0 text-slate-500" />
          {customer.primaryContact}
        </span>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    key: "owner",
    header: "Owner",
    className: "whitespace-nowrap text-xs font-medium text-slate-800",
    cell: customer => (
      <span className="inline-flex items-center gap-2">
        <Handshake size={13} className="shrink-0 text-slate-500" />
        {customer.owner || "—"}
      </span>
    ),
  },
  {
    key: "dealCount",
    header: "Deals",
    className: "whitespace-nowrap text-xs font-medium text-slate-800",
    cell: customer => (
      <span className="inline-flex items-center gap-2">
        <Layers size={13} className="shrink-0 text-slate-500" />
        {customer.dealCount}
      </span>
    ),
  },
  {
    key: "pipelineValue",
    header: "Pipeline",
    className: "whitespace-nowrap text-xs font-bold text-slate-900",
    cell: customer => formatCurrency(customer.pipelineValue),
  },
  {
    key: "notes",
    header: "Notes",
    className: "text-xs text-slate-800",
    cell: customer => (
      <span className="block max-w-[240px] truncate" title={customer.notes}>
        {customer.notes || "—"}
      </span>
    ),
  },
  {
    key: "convertedAt",
    header: "Converted",
    className: "whitespace-nowrap text-xs font-medium text-slate-700",
    cell: customer => formatCustomerDate(customer.convertedAt),
  },
];

/** Column keys/labels for the TableSettings popover (built once, not per render). */
export const customerColumnOptions = customerColumns.map(column => ({
  key: column.key,
  label: String(column.header),
}));
