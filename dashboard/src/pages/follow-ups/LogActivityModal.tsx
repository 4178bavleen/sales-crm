import { useState, useEffect } from "react";
import {
  X,
  Phone,
  Mail,
  MessageSquare,
  Bell,
  FileText,
  AlertCircle,
  Users,
  Building2,
  Activity as ActivityIcon,
} from "lucide-react";
import type { FollowUp, LogActivityValues } from "./types";

type ActivityType = "CALL" | "MESSAGE" | "EMAIL" | "REMINDER" | "OTHER";

type LogActivityModalProps = {
  isOpen: boolean;
  followUp: FollowUp | null;
  onClose: () => void;
  onSave: (values: LogActivityValues) => Promise<void>;
  leads?: { id: number; contactName: string; companyName?: string | null }[];
  deals?: { id: number; name: string }[];
  defaultType?: ActivityType;
  lockType?: boolean;
  title?: string;
  subtitle?: string;
};

const activityTypes = [
  { type: "CALL", label: "Call", icon: Phone },
  { type: "MESSAGE", label: "Message", icon: MessageSquare },
  { type: "EMAIL", label: "Email", icon: Mail },
  { type: "REMINDER", label: "Reminder", icon: Bell },
  { type: "OTHER", label: "Meeting", icon: FileText },
] as const;

const quickOutcomes: Record<string, string[]> = {
  CALL: ["Connected - Positive", "Connected - Follow-up Needed", "Left Voicemail", "No Answer / Busy", "Wrong Number"],
  MESSAGE: ["Sent Info via WhatsApp", "Client Replied", "Follow-up Sent", "Meeting Confirmed"],
  EMAIL: ["Sent Proposal / Quotation", "Follow-up Email Sent", "Client Acknowledged", "Introductory Email"],
  REMINDER: ["Task Reviewed", "Check-in Complete", "Notification Acknowledged"],
  OTHER: ["Meeting Completed", "Demo Conducted", "Internal Sync Done", "Notes Recorded"],
};

function formatIsoNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function LogActivityModal({
  isOpen,
  followUp,
  onClose,
  onSave,
  leads = [],
  deals = [],
  defaultType = "CALL",
  lockType = false,
  title = "Log Activity",
  subtitle = "Record a call, message, email, or client touchpoint",
}: LogActivityModalProps) {
  const [type, setType] = useState<ActivityType>(defaultType);
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [occurredAt, setOccurredAt] = useState(formatIsoNow());
  const [entityType, setEntityType] = useState<"lead" | "deal" | "none">("lead");
  const [entityId, setEntityId] = useState<number | null>(null);
  const [markTaskCompleted, setMarkTaskCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setOutcome(quickOutcomes[defaultType]?.[0] || "");
      setNotes("");
      setOccurredAt(formatIsoNow());
      setError(null);

      if (followUp) {
        if (followUp.dealId) {
          setEntityType("deal");
          setEntityId(followUp.dealId);
        } else if (followUp.leadId) {
          setEntityType("lead");
          setEntityId(followUp.leadId);
        } else {
          setEntityType(leads && leads.length > 0 ? "lead" : "none");
          setEntityId(leads?.[0]?.id ?? null);
        }
        setMarkTaskCompleted(followUp.status !== "COMPLETED");
      } else {
        if (leads && leads.length > 0) {
          setEntityType("lead");
          setEntityId(leads[0].id);
        } else if (deals && deals.length > 0) {
          setEntityType("deal");
          setEntityId(deals[0].id);
        } else {
          setEntityType("none");
          setEntityId(null);
        }
        setMarkTaskCompleted(false);
      }
    }
  }, [isOpen, followUp, leads, deals, defaultType]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      if (!followUp && !entityId) {
        throw new Error("Select a lead or deal to attach this activity to.");
      }

      // Validate date safely
      const parsedDate = occurredAt && !isNaN(new Date(occurredAt).getTime())
        ? new Date(occurredAt).toISOString()
        : new Date().toISOString();

      await onSave({
        type,
        outcome: outcome.trim(),
        notes: notes.trim(),
        occurredAt: parsedDate,
        leadId: entityType === "lead" ? entityId : null,
        dealId: entityType === "deal" ? entityId : null,
        taskId: followUp?.id ?? null,
        markTaskCompleted,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to log activity");
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
              {lockType ? <Phone size={18} /> : <ActivityIcon size={18} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{title}</h2>
              <p className="text-xs text-slate-500">{subtitle}</p>
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-4 space-y-4">
            {/* Linked Follow-up banner if present */}
            {followUp && (
              <div className="rounded-lg bg-blue-50/70 border border-blue-200/60 p-3 text-xs">
                <span className="text-[#154fc1] font-bold">Attached Follow-up:</span>{" "}
                <span className="text-slate-800 font-medium">{followUp.title}</span>
              </div>
            )}

            {/* Activity Type Selector */}
            {lockType ? (
              <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-semibold text-[#1d61e7]">
                <Phone size={15} />
                <span>{activityTypes.find(item => item.type === type)?.label ?? "Call"} activity</span>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Activity Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {activityTypes.map(item => {
                    const Icon = item.icon;
                    const active = type === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => {
                          setType(item.type);
                          setOutcome(quickOutcomes[item.type]?.[0] || "");
                        }}
                        className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 text-[11px] font-semibold transition cursor-pointer ${
                          active
                            ? "border-[#1d61e7] bg-blue-50 text-[#1d61e7] shadow-xs"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Outcome with Quick Pills */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Outcome
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(quickOutcomes[type] || []).map(pill => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => setOutcome(pill)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                      outcome === pill
                        ? "bg-blue-100 text-[#1d61e7] border border-blue-300 font-bold"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                    }`}
                  >
                    {pill}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={outcome}
                onChange={e => setOutcome(e.target.value)}
                placeholder="e.g. Connected with decision maker"
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
              />
            </div>

            {/* Date & Time + Linked Entity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Occurred At <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={occurredAt}
                  onChange={e => setOccurredAt(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Link to Contact / Deal
                </label>
                <div className="flex gap-1.5 mb-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEntityType("lead");
                      setEntityId(leads?.[0]?.id ?? null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold border transition cursor-pointer ${
                      entityType === "lead"
                        ? "border-[#1d61e7] bg-blue-50 text-[#1d61e7]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Users size={12} />
                    Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEntityType("deal");
                      setEntityId(deals?.[0]?.id ?? null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold border transition cursor-pointer ${
                      entityType === "deal"
                        ? "border-[#1d61e7] bg-blue-50 text-[#1d61e7]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Building2 size={12} />
                    Deal
                  </button>
                  {followUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setEntityType("none");
                        setEntityId(null);
                      }}
                      className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold border transition cursor-pointer ${
                        entityType === "none"
                          ? "border-slate-400 bg-slate-100 text-slate-800"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      None
                    </button>
                  )}
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
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Activity Notes &amp; Conversation Details
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Summarize key points discussed, objections, agreements, or next steps..."
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
              />
            </div>

            {followUp && followUp.status !== "COMPLETED" && (
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={markTaskCompleted}
                  onChange={e => setMarkTaskCompleted(e.target.checked)}
                  className="rounded border-slate-300 text-[#1d61e7] focus:ring-blue-500 cursor-pointer"
                />
                <span>Also mark this follow-up task as <strong>Completed</strong></span>
              </label>
            )}
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
              {loading ? "Saving..." : lockType && type === "CALL" ? "Log Call" : "Log Activity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
