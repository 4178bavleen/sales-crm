import { useState, useEffect } from "react";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import type { FollowUp } from "./types";

type CompleteModalProps = {
  followUp: FollowUp | null;
  onClose: () => void;
  onConfirm: (id: number, completionNote: string, logActivityAlso: boolean) => Promise<void>;
};

export default function CompleteModal({
  followUp,
  onClose,
  onConfirm,
}: CompleteModalProps) {
  const [completionNote, setCompletionNote] = useState("");
  const [logActivityAlso, setLogActivityAlso] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (followUp) {
      setCompletionNote("");
      setLogActivityAlso(false);
      setError(null);
    }
  }, [followUp]);

  if (!followUp) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!followUp) return;

    try {
      setLoading(true);
      setError(null);
      await onConfirm(followUp.id, completionNote.trim(), logActivityAlso);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to complete follow-up");
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={19} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Complete Follow-up</h2>
              <p className="text-xs text-slate-500">Record outcome and mark task done</p>
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
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5">
              <p className="text-xs font-bold text-slate-900">{followUp.title}</p>
              {followUp.lead && (
                <p className="mt-1 text-[11px] text-slate-500">Lead: <span className="font-semibold text-slate-700">{followUp.lead}</span></p>
              )}
              {followUp.deal && (
                <p className="mt-1 text-[11px] text-slate-500">Deal: <span className="font-semibold text-slate-700">{followUp.deal}</span></p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Completion Notes / Outcome
              </label>
              <textarea
                value={completionNote}
                onChange={e => setCompletionNote(e.target.value)}
                rows={3}
                placeholder="e.g. Spoke with client, agreed on next proposal review next week."
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
                autoFocus
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={logActivityAlso}
                onChange={e => setLogActivityAlso(e.target.checked)}
                className="rounded border-slate-300 text-[#1d61e7] focus:ring-blue-500 cursor-pointer"
              />
              <span>Also open "Log Activity" form to record a detailed touchpoint</span>
            </label>
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
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Saving..." : "Mark as Completed"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
