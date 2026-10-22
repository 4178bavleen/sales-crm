import { Pencil, X } from "lucide-react";
import type { LeadStatus } from "../../types/lead";
import { LEAD_STATUSES } from "../../types/lead";
import type { LeadDetailDialogProps } from "../../types/leadUi";
import { formatDate, leadDetailFields } from "../../pages/leads/leadColumns";
import { PriorityText, StatusBadge } from "./LeadBadges";

/**
 * Centered modal showing a single lead's details.
 * Closing (Esc, backdrop, close button) is handled by the parent.
 */
export default function LeadDetailDialog({
  lead,
  onClose,
  onStatusChange,
  onEdit,
}: LeadDetailDialogProps) {
  return (
    <div
      className="dialog-overlay-in fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Lead details"
        className="dialog-enter flex h-[min(85vh,640px,90vw)] w-[min(85vh,640px,90vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs text-slate-500">Lead details</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-800">
              {lead.firstName} {lead.lastName}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
              >
                <Pencil size={13} className="text-slate-500" />
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-100 cursor-pointer"
              aria-label="Close details"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              {lead.firstName[0]}
              {lead.lastName[0]}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800">
                {lead.firstName} {lead.lastName}
              </p>
              <p className="mt-1 text-xs text-slate-500">{lead.company}</p>
              <StatusBadge status={lead.status} className="mt-2 inline-flex" />
            </div>
          </div>

          <h3 className="mb-4 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Contact information
          </h3>
          {leadDetailFields.map(({ label, Icon, get }) => (
            <div
              key={label}
              className="flex items-start gap-3 border-b border-slate-100 py-3"
            >
              <Icon size={16} className="mt-0.5 text-slate-400" />
              <div>
                <p className="text-[11px] text-slate-400">{label}</p>
                <p className="mt-1 break-words text-sm text-slate-700">
                  {get(lead)}
                </p>
              </div>
            </div>
          ))}

          <div className="mt-5 flex items-center justify-between text-xs font-medium text-slate-600">
            Update lead status
            <PriorityText priority={lead.priority} />
          </div>
          <select
            value={lead.status}
            onChange={event => onStatusChange(event.target.value as LeadStatus)}
            aria-label="Update lead status"
            className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            {LEAD_STATUSES.map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <p className="mt-3 text-[11px] text-slate-400">
            Created {formatDate(lead.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
