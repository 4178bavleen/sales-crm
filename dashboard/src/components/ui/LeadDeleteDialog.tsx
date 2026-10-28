import { useState } from "react";
import { Loader2, X, Trash2, Building2, Mail, Phone } from "lucide-react";
import type { Lead } from "../../types/lead";
import { PriorityText, StatusBadge } from "./LeadBadges";

export type LeadDeleteDialogProps = {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (lead: Lead) => Promise<void>;
};

export default function LeadDeleteDialog({
  lead,
  isOpen,
  onClose,
  onConfirm,
}: LeadDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !lead) return null;

  const leadName = `${lead.firstName} ${lead.lastName}`.trim() || "Lead";

  async function handleConfirm() {
    if (!lead) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(lead);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to delete lead.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      className="dialog-overlay-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Delete lead confirmation"
      onClick={onClose}
    >
      <div
        className="dialog-enter relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
              <Trash2 size={22} />
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer disabled:opacity-50"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-4">
            <h3 className="text-base font-bold text-slate-900">
              Delete Lead
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Are you sure you want to delete{" "}
              <strong className="text-slate-900 font-semibold">{leadName}</strong>?
              This record will be permanently removed from your CRM.
            </p>
          </div>

          {/* Lead summary card */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">{leadName}</p>
                {lead.company && (
                  <p className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                    <Building2 size={12} className="text-slate-400 shrink-0" />
                    <span>{lead.company}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <StatusBadge status={lead.status} />
                <PriorityText priority={lead.priority} />
              </div>
            </div>

            {(lead.email || lead.phone) && (
              <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 gap-1.5 text-[11px] text-slate-600">
                {lead.email && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">{lead.email}</span>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone size={12} className="text-slate-400 shrink-0" />
                    <span>{lead.phone}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
            >
              {isDeleting && <Loader2 size={13} className="animate-spin text-white" />}
              <span>{isDeleting ? "Deleting..." : "Delete Lead"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
