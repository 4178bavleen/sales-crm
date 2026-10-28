import { useState, useEffect } from "react";
import { X, CalendarClock, Users, Building2, AlertCircle } from "lucide-react";
import type { FollowUpFormValues, FollowUpPriority } from "./types";

type FollowUpModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: FollowUpFormValues) => Promise<void>;
  users: { id: number; name: string }[];
  leads: { id: number; contactName: string; companyName?: string | null }[];
  deals: { id: number; name: string }[];
  currentUserId?: number;
};

function defaultDueAt(): string {
  const d = new Date();
  d.setHours(d.getHours() + 2);
  d.setMinutes(0);
  d.setSeconds(0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function FollowUpModal({
  isOpen,
  onClose,
  onSave,
  users = [],
  leads = [],
  deals = [],
  currentUserId,
}: FollowUpModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState(defaultDueAt());
  const [priority, setPriority] = useState<FollowUpPriority>("MEDIUM");
  const [assignedToId, setAssignedToId] = useState<number>(currentUserId || (users[0]?.id ?? 0));
  const [entityType, setEntityType] = useState<"lead" | "deal" | "none">("lead");
  const [entityId, setEntityId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setDueAt(defaultDueAt());
      setPriority("MEDIUM");
      setAssignedToId(currentUserId || (users[0]?.id ?? 0));
      setEntityType(leads && leads.length > 0 ? "lead" : "none");
      setEntityId(leads?.[0]?.id ?? null);
      setError(null);
    }
  }, [isOpen, currentUserId, users, leads]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a title for the follow-up");
      return;
    }
    if (!dueAt) {
      setError("Please specify a due date and time");
      return;
    }
    if (!assignedToId) {
      setError("Please select an assignee");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const parsedDueAt = dueAt && !isNaN(new Date(dueAt).getTime())
        ? new Date(dueAt).toISOString()
        : new Date().toISOString();

      await onSave({
        title: title.trim(),
        description: description.trim(),
        dueAt: parsedDueAt,
        priority,
        assignedToId,
        leadId: entityType === "lead" ? entityId : null,
        dealId: entityType === "deal" ? entityId : null,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create follow-up");
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
        className="w-full max-w-lg my-auto max-h-[92vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 px-5 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#1d61e7]">
              <CalendarClock size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Follow-up</h2>
              <p className="text-xs text-slate-500">Schedule a task or client follow-up reminder</p>
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

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Call client regarding proposal feedback"
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Due Date &amp; Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={dueAt}
                  onChange={e => setDueAt(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as FollowUpPriority)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Assignee <span className="text-rose-500">*</span>
              </label>
              <select
                value={assignedToId}
                onChange={e => setAssignedToId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                {(users || []).map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Related To */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Link to CRM Record
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setEntityType("lead");
                    setEntityId(leads?.[0]?.id ?? null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold border transition cursor-pointer ${entityType === "lead"
                      ? "border-[#1d61e7] bg-blue-50 text-[#1d61e7]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  <Users size={13} />
                  Lead
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEntityType("deal");
                    setEntityId(deals?.[0]?.id ?? null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold border transition cursor-pointer ${entityType === "deal"
                      ? "border-[#1d61e7] bg-blue-50 text-[#1d61e7]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  <Building2 size={13} />
                  Deal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEntityType("none");
                    setEntityId(null);
                  }}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold border transition cursor-pointer ${entityType === "none"
                      ? "border-slate-400 bg-slate-100 text-slate-800"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  None
                </button>
              </div>

              {entityType === "lead" && (
                <select
                  value={entityId ?? ""}
                  onChange={e => setEntityId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="">Select a lead (optional)</option>
                  {(leads || []).map(l => (
                    <option key={l.id} value={l.id}>
                      {l.contactName} {l.companyName ? `(${l.companyName})` : ""}
                    </option>
                  ))}
                </select>
              )}

              {entityType === "deal" && (
                <select
                  value={entityId ?? ""}
                  onChange={e => setEntityId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="">Select a deal (optional)</option>
                  {(deals || []).map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Notes &amp; Details
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Add key context, call agendas, or follow-up instructions..."
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
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
              {loading ? "Scheduling..." : "Schedule Follow-up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
