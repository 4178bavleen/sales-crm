import { Pencil, UserCheck, X } from "lucide-react";
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
  onEdit,
  onAssign,
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
            {onAssign && (
              <button
                type="button"
                onClick={onAssign}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-2xs hover:bg-blue-100 transition cursor-pointer"
              >
                <UserCheck size={13} className="text-blue-600" />
                Assign
              </button>
            )}
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
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={lead.status} />
                <PriorityText priority={lead.priority} />
              </div>
            </div>
          </div>

          {lead.status === "DISQUALIFIED" && lead.disqualifyReason && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50/70 p-3.5 text-xs">
              <p className="font-semibold text-rose-800">Disqualification Reason</p>
              <p className="mt-1 text-rose-700 whitespace-pre-wrap">{lead.disqualifyReason}</p>
              {lead.disqualifiedAt && (
                <p className="mt-2 text-[10px] text-rose-500">
                  Disqualified on {formatDate(lead.disqualifiedAt)}
                </p>
              )}
            </div>
          )}

          <h3 className="mb-4 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Contact information
          </h3>
          {leadDetailFields.map(({ label, Icon, get }) => {
            const isOwnerField = label === "Lead Owner";
            const value = get(lead);
            return (
              <div
                key={label}
                className="flex items-start justify-between border-b border-slate-100 py-3"
              >
                <div className="flex items-start gap-3">
                  <Icon size={16} className="mt-0.5 text-slate-400" />
                  <div>
                    <p className="text-[11px] text-slate-400">{label}</p>
                    <p className="mt-1 break-words text-sm text-slate-700">
                      {value}
                    </p>
                  </div>
                </div>

                {isOwnerField && onAssign && (
                  <button
                    type="button"
                    onClick={onAssign}
                    className="self-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-600 shadow-2xs hover:bg-blue-50 transition cursor-pointer"
                  >
                    {value === "Unassigned" ? "Assign" : "Change"}
                  </button>
                )}
              </div>
            );
          })}

          <p className="mt-5 text-[11px] text-slate-400">
            Created {formatDate(lead.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
