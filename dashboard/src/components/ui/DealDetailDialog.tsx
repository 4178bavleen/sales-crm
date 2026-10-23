import { X, CircleDollarSign } from "lucide-react";
import type { DealDetailDialogProps } from "../../types/dealUi";
import {
  dealDetailFields,
  formatCurrency,
  statusLabels,
  statusStyles,
} from "../../columns/dealColumns";

/**
 * Centered modal showing a single deal's details.
 * Deals are read-only here; closing (Esc, backdrop, close button) is handled by
 * the parent.
 *
 * Won-only fields (Closed Revenue) and lost-only fields (Lost Reason / Lost
 * Note) are filtered by `onlyFor`, matching the schema's rule that those
 * columns are only set for that status.
 */
export default function DealDetailDialog({
  deal,
  onClose,
}: DealDetailDialogProps) {
  const visibleFields = dealDetailFields.filter(
    field => !field.onlyFor || field.onlyFor.includes(deal.status),
  );

  return (
    <div
      className="dialog-overlay-in fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Deal details"
        className="dialog-enter flex h-[min(85vh,640px,90vw)] w-[min(85vh,640px,90vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Deal details</p>
            <h2 className="mt-1 truncate text-lg font-semibold text-slate-800">
              {deal.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-100"
            aria-label="Close details"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {/* Identity + status + value */}
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-500">
              <CircleDollarSign size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-slate-950">{deal.name}</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-600">
                {deal.customer || "No customer"} · {deal.stage || "No stage"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`rounded px-2.5 py-0.5 text-[10px] font-bold ${
                    statusStyles[deal.status] ?? statusStyles.OPEN
                  }`}
                >
                  {statusLabels[deal.status] ?? deal.status}
                </span>
                <span className="text-xs font-bold text-slate-950">
                  {formatCurrency(deal.estimatedValue)}
                </span>
              </div>
            </div>
          </div>

          <h3 className="mb-4 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Deal information
          </h3>
          {visibleFields.map(({ label, Icon, get }) => (
            <div
              key={label}
              className="flex items-start gap-3 border-b border-slate-100 py-3"
            >
              <Icon size={16} className="mt-0.5 text-slate-400" />
              <div className="min-w-0">
                <p className="text-[11px] text-slate-400">{label}</p>
                <p className="mt-1 break-words text-sm text-slate-700">
                  {get(deal)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
