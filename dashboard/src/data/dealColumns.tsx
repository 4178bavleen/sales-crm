import {
  Building2,
  CalendarDays,
  CircleDollarSign,
  Handshake,
  Layers,
  ListChecks,
  Package,
  Trophy,
  XCircle,
  Users,
} from "lucide-react";
import type {
  DealColumn,
  DealCsvField,
  DealField,
} from "../types/dealUi";
import type { DealStatus } from "../types/deal";

export function formatDealDate(date: string) {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Compact USD formatting (whole dollars — pipeline values, not cents). */
export function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** Status pill colours (DealStatus: OPEN | WON | LOST). */
export const statusStyles: Record<DealStatus, string> = {
  OPEN: "bg-blue-50 text-blue-700",
  WON: "bg-emerald-50 text-emerald-700",
  LOST: "bg-rose-50 text-rose-700",
};

export const statusLabels: Record<DealStatus, string> = {
  OPEN: "Open",
  WON: "Won",
  LOST: "Lost",
};

/**
 * Read-only fields shown in the deal detail dialog.
 * Won-only fields use `onlyFor: ["WON"]`; lost-only fields use `onlyFor: ["LOST"]`,
 * matching the schema's rule that those columns are only set for that status.
 */
export const dealDetailFields: DealField[] = [
  { label: "Customer", Icon: Building2, get: deal => deal.customer || "—" },
  { label: "Lead", Icon: Users, get: deal => deal.lead || "—" },
  { label: "Owner", Icon: Handshake, get: deal => deal.owner || "—" },
  { label: "Product", Icon: Package, get: deal => deal.product || "—" },
  { label: "Stage", Icon: Layers, get: deal => deal.stage || "—" },
  {
    label: "Estimated Value",
    Icon: CircleDollarSign,
    get: deal => formatCurrency(deal.estimatedValue),
  },
  {
    label: "Expected Close",
    Icon: CalendarDays,
    get: deal => formatDealDate(deal.expectedCloseDate),
  },
  {
    label: "Next Action",
    Icon: ListChecks,
    get: deal => deal.nextAction || "—",
  },
  {
    label: "Closed Revenue",
    Icon: Trophy,
    get: deal => formatCurrency(deal.wonRevenue),
    onlyFor: ["WON"],
  },
  {
    label: "Closed At",
    Icon: CalendarDays,
    get: deal => formatDealDate(deal.closedAt),
    onlyFor: ["WON"],
  },
  {
    label: "Lost Reason",
    Icon: XCircle,
    get: deal => deal.lostReason || "—",
    onlyFor: ["LOST"],
  },
  {
    label: "Lost Note",
    Icon: XCircle,
    get: deal => deal.lostNote || "—",
    onlyFor: ["LOST"],
  },
  {
    label: "Created Time",
    Icon: CalendarDays,
    get: deal => formatDealDate(deal.createdAt),
  },
];

/**
 * Flat string fields for the CSV export.
 * `cell()` returns JSX, so it can't be reused for the export.
 */
export const dealCsvFields: DealCsvField[] = [
  { label: "Deal Name", get: deal => deal.name },
  { label: "Customer", get: deal => deal.customer },
  { label: "Lead", get: deal => deal.lead },
  { label: "Owner", get: deal => deal.owner },
  { label: "Product", get: deal => deal.product },
  { label: "Stage", get: deal => deal.stage },
  { label: "Status", get: deal => deal.status },
  { label: "Estimated Value", get: deal => String(deal.estimatedValue) },
  { label: "Expected Close", get: deal => deal.expectedCloseDate },
  { label: "Next Action", get: deal => deal.nextAction },
  { label: "Closed Revenue", get: deal => String(deal.wonRevenue) },
  { label: "Closed At", get: deal => deal.closedAt },
  { label: "Lost Reason", get: deal => deal.lostReason },
  { label: "Lost Note", get: deal => deal.lostNote },
  { label: "Created At", get: deal => deal.createdAt },
];

export const dealColumns: DealColumn[] = [
  {
    key: "name",
    header: "Deal",
    className: "min-w-[200px]",
    cell: deal => (
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
          <CircleDollarSign size={15} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-blue-600 group-hover:text-blue-800">
            {deal.name}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-slate-400">
            {deal.customer || "No customer"}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "stage",
    header: "Stage",
    className: "whitespace-nowrap text-xs text-slate-600",
    cell: deal => (
      <span className="inline-flex items-center gap-2">
        <Layers size={13} className="shrink-0 text-slate-400" />
        {deal.stage || "—"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "whitespace-nowrap",
    cell: deal => (
      <span
        className={`rounded px-2 py-1 text-[10px] font-medium ${
          statusStyles[deal.status] ?? statusStyles.OPEN
        }`}
      >
        {statusLabels[deal.status] ?? deal.status}
      </span>
    ),
  },
  {
    key: "owner",
    header: "Owner",
    className: "whitespace-nowrap text-xs text-slate-600",
    cell: deal => (
      <span className="inline-flex items-center gap-2">
        <Handshake size={13} className="shrink-0 text-slate-400" />
        {deal.owner || "—"}
      </span>
    ),
  },
  {
    key: "product",
    header: "Product",
    className: "whitespace-nowrap text-xs text-slate-600",
    cell: deal =>
      deal.product ? (
        <span className="inline-flex items-center gap-2">
          <Package size={13} className="shrink-0 text-slate-400" />
          {deal.product}
        </span>
      ) : (
        <span className="text-slate-300">—</span>
      ),
  },
  {
    key: "estimatedValue",
    header: "Value",
    className: "whitespace-nowrap text-xs font-medium text-slate-700",
    cell: deal => formatCurrency(deal.estimatedValue),
  },
  {
    key: "expectedCloseDate",
    header: "Expected Close",
    className: "whitespace-nowrap text-xs text-slate-500",
    cell: deal => formatDealDate(deal.expectedCloseDate),
  },
  {
    key: "nextAction",
    header: "Next Action",
    className: "text-xs text-slate-500",
    cell: deal => (
      <span className="block max-w-[220px] truncate" title={deal.nextAction}>
        {deal.nextAction || "—"}
      </span>
    ),
  },
  {
    key: "createdAt",
    header: "Created Time",
    className: "whitespace-nowrap text-xs text-slate-500",
    cell: deal => formatDealDate(deal.createdAt),
  },
];

/** Column keys/labels for the TableSettings popover (built once, not per render). */
export const dealColumnOptions = dealColumns.map(column => ({
  key: column.key,
  label: String(column.header),
}));
