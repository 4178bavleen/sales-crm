import { useState, useEffect } from "react";
import { X, CalendarClock, History, AlertCircle } from "lucide-react";
import type { FollowUp } from "./types";
import { formatDateTime } from "./followUpColumns";

type RescheduleModalProps = {
  followUp: FollowUp | null;
  onClose: () => void;
  onConfirm: (id: number, newDueAt: string, reason?: string) => Promise<void>;
};

function formatIsoForPicker(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RescheduleModal({
  followUp,
  onClose,
  onConfirm,
}: RescheduleModalProps) {
  const [newDueAt, setNewDueAt] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (followUp) {
      // Default to tomorrow 10:00 AM
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(10, 0, 0, 0);
      setNewDueAt(formatIsoForPicker(nextDay));
      setReason("");
      setError(null);
    }
  }, [followUp]);

  if (!followUp) return null;

  function setPreset(hoursFromNow: number, targetHour?: number) {
    const d = new Date();
    if (targetHour !== undefined) {
      d.setDate(d.getDate() + Math.max(1, Math.floor(hoursFromNow / 24)));
      d.setHours(targetHour, 0, 0, 0);
    } else {
      d.setHours(d.getHours() + hoursFromNow);
      d.setMinutes(0);
      d.setSeconds(0);
    }
    setNewDueAt(formatIsoForPicker(d));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!followUp) return;
    if (!newDueAt) {
      setError("Please pick a valid date and time");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onConfirm(followUp.id, new Date(newDueAt).toISOString(), reason.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to reschedule follow-up");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md my-auto max-h-[92vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 px-5 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <CalendarClock size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Reschedule Follow-up</h2>
              <p className="text-xs text-slate-500">Pick a new date &amp; time</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="shrink-0 mx-5 mt-3 sm:mx-6 sm:mt-4 flex items-center gap-2 rounded-lg bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 border border-rose-200">
            <AlertCircle size={15} className="shrink-0 text-rose-500" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-4 space-y-4">
            {/* Target follow-up context */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5">
              <p className="text-xs font-bold text-slate-900 truncate">{followUp.title}</p>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>Current Due: <strong className="text-slate-700 font-semibold">{formatDateTime(followUp.dueAt)}</strong></span>
                {followUp.rescheduleCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                    <History size={11} />
                    Rescheduled {followUp.rescheduleCount}x
                  </span>
                )}
              </div>
              {followUp.status === "COMPLETED" && (
                <p className="mt-2 text-[11px] font-semibold text-blue-700 bg-blue-50/80 px-2.5 py-1.5 rounded-lg border border-blue-200">
                  Rescheduling will automatically reopen this follow-up and return it to active status.
                </p>
              )}
            </div>

            {/* Quick presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Quick Shortcuts
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPreset(3)}
                  className="rounded-lg border border-slate-200 bg-white py-1.5 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-medium transition cursor-pointer"
                >
                  +3 Hours
                </button>
                <button
                  type="button"
                  onClick={() => setPreset(24, 10)}
                  className="rounded-lg border border-slate-200 bg-white py-1.5 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-medium transition cursor-pointer"
                >
                  Tomorrow 10 AM
                </button>
                <button
                  type="button"
                  onClick={() => setPreset(24, 14)}
                  className="rounded-lg border border-slate-200 bg-white py-1.5 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-medium transition cursor-pointer"
                >
                  Tomorrow 2 PM
                </button>
                <button
                  type="button"
                  onClick={() => setPreset(48, 10)}
                  className="rounded-lg border border-slate-200 bg-white py-1.5 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-medium transition cursor-pointer"
                >
                  In 2 Days
                </button>
                <button
                  type="button"
                  onClick={() => setPreset(168, 10)}
                  className="col-span-2 rounded-lg border border-slate-200 bg-white py-1.5 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-medium transition cursor-pointer"
                >
                  Next Week (Same Day)
                </button>
              </div>
            </div>

            {/* Custom Date & Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                New Due Date &amp; Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={newDueAt}
                onChange={e => setNewDueAt(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            {/* Reschedule Reason / Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reason for Rescheduling
              </label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Client requested callback next Monday"
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Footer - Fixed */}
          <div className="shrink-0 flex items-center justify-end gap-2.5 px-5 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 bg-slate-50">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Saving..." : "Confirm Reschedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
