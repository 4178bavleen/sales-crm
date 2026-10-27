import { useState, useEffect } from "react";
import { UserCheck, X, RotateCw, UserX } from "lucide-react";
import type { Lead } from "../../types/lead";
import { StatusBadge } from "./LeadBadges";

type OwnerOption = {
  id: number;
  name: string;
  email?: string;
};

type AssignLeadDialogProps = {
  lead: Lead;
  owners: OwnerOption[];
  onClose: () => void;
  onAssign: (leadId: number, ownerId: number | null, note?: string) => Promise<void>;
};

export default function AssignLeadDialog({
  lead,
  owners,
  onClose,
  onAssign,
}: AssignLeadDialogProps) {
  const currentOwnerId = lead.ownerId ?? null;
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(currentOwnerId);
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Esc key closes modal
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, submitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onAssign(lead.id, selectedOwnerId, note.trim() || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign lead");
      setSubmitting(false);
    }
  };

  const isReassign = Boolean(lead.owner && lead.owner !== "Unassigned");

  return (
    <div
      className="dialog-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Assign Lead"
        className="dialog-enter flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UserCheck size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isReassign ? "Reassign Lead" : "Assign Lead"}
              </h2>
              <p className="text-xs text-slate-500">
                Select a team member to take ownership of this lead.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        {/* Lead Summary Info */}
        <div className="border-b border-slate-100 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold text-sm text-slate-900">
                  {lead.firstName} {lead.lastName}
                </span>
                <StatusBadge status={lead.status} />
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {lead.company || "No company listed"}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Current Owner
              </span>
              <p className="text-xs font-semibold text-slate-700">
                {lead.owner || "Unassigned"}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          {/* Select Assignee */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Assign to <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedOwnerId ?? ""}
              onChange={(e) =>
                setSelectedOwnerId(e.target.value ? Number(e.target.value) : null)
              }
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
            >
              <option value="">-- Unassigned (No Owner) --</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name} {owner.email ? `(${owner.email})` : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              {selectedOwnerId
                ? "The assigned team member will receive an instant notification."
                : "Leaving this unassigned keeps the lead open in the pool."}
            </p>
          </div>

          {/* Assignment Note */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                Assignment Note <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <span className="text-[10px] text-slate-400">{note.length} / 1000</span>
            </div>
            <textarea
              rows={3}
              value={note}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
              disabled={submitting}
              placeholder="Add instructions, context, or next steps for the assignee..."
              className="w-full resize-none rounded-xl border border-slate-200 p-3 text-xs text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <RotateCw size={13} className="animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : selectedOwnerId ? (
                <>
                  <UserCheck size={14} />
                  <span>{isReassign ? "Confirm Reassign" : "Assign Lead"}</span>
                </>
              ) : (
                <>
                  <UserX size={14} />
                  <span>Set Unassigned</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
