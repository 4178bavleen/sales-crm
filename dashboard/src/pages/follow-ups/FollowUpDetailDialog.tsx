import {
  X,
  CalendarClock,
  CheckCircle2,
  Users,
  Building2,
  History,
  Phone,
  Mail,
  MessageSquare,
  Bell,
  FileText,
  User,
} from "lucide-react";
import type { FollowUp } from "./types";
import {
  formatDateTime,
  priorityStyles,
  priorityLabels,
  statusStyles,
  statusLabels,
  dueBucketConfig,
  getDueBucket,
} from "./followUpColumns";

type FollowUpDetailDialogProps = {
  followUp: FollowUp | null;
  onClose: () => void;
  onReschedule: (followUp: FollowUp) => void;
  onComplete: (followUp: FollowUp) => void;
  onLogActivity: (followUp: FollowUp) => void;
};

const activityIconMap: Record<string, typeof Phone> = {
  CALL: Phone,
  MESSAGE: MessageSquare,
  EMAIL: Mail,
  REMINDER: Bell,
  OTHER: FileText,
};

export default function FollowUpDetailDialog({
  followUp,
  onClose,
  onReschedule,
  onComplete,
  onLogActivity,
}: FollowUpDetailDialogProps) {
  if (!followUp) return null;

  const bucket = getDueBucket(followUp);
  const bucketCfg = dueBucketConfig[bucket];
  const pStyle = priorityStyles[followUp.priority] || priorityStyles.MEDIUM;
  const pLabel = priorityLabels[followUp.priority] || followUp.priority;
  const sStyle = statusStyles[followUp.status] || statusStyles.OPEN;
  const sLabel = statusLabels[followUp.status] || followUp.status;
  const BucketIcon = bucketCfg.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl my-auto max-h-[92vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1d61e7] mt-0.5">
              <CalendarClock size={20} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] ${bucketCfg.badge}`}>
                  <BucketIcon size={11} />
                  {bucketCfg.label}
                </span>
                <span className={`rounded px-2 py-0.5 text-[10px] ${pStyle}`}>
                  {pLabel}
                </span>
                <span className={`rounded px-2 py-0.5 text-[10px] ${sStyle}`}>
                  {sLabel}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 leading-snug">{followUp.title}</h2>
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Due & Assignment card */}
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 border border-slate-200 p-3.5 text-xs">
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Due Date &amp; Time</span>
              <p className="mt-0.5 font-bold text-slate-900">{formatDateTime(followUp.dueAt)}</p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Assign to :</span>
              <p className="mt-0.5 font-bold text-slate-900 flex items-center gap-1.5">
                <User size={13} className="text-slate-400" />
                {followUp.assignedTo || "Unassigned"}
              </p>
            </div>
            {followUp.lead && (
              <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center gap-2">
                <Users size={14} className="text-blue-600 shrink-0" />
                <span className="text-slate-500">Related Lead:</span>
                <span className="font-bold text-slate-800">{followUp.lead}</span>
              </div>
            )}
            {followUp.deal && (
              <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center gap-2">
                <Building2 size={14} className="text-slate-600 shrink-0" />
                <span className="text-slate-500">Related Deal:</span>
                <span className="font-bold text-slate-800">{followUp.deal}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {followUp.description && (
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Details &amp; Instructions
              </h3>
              <p className="rounded-lg border border-slate-200 bg-white p-3.5 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {followUp.description}
              </p>
            </div>
          )}

          {/* Completion Info if Completed */}
          {followUp.status === "COMPLETED" && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Completed by {followUp.completedBy || "User"}
              </div>
              {followUp.completionNote && (
                <p className="text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-emerald-200">
                  {followUp.completionNote}
                </p>
              )}
            </div>
          )}

          {/* Reschedule History Timeline */}
          {followUp.rescheduleHistory && followUp.rescheduleHistory.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History size={13} className="text-slate-600" />
                Reschedule History ({followUp.rescheduleHistory.length})
              </h3>
              <div className="space-y-2">
                {followUp.rescheduleHistory.map((item, idx) => (
                  <div key={item.id || idx} className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span>Previous: <del className="text-slate-400">{formatDateTime(item.previousDueAt)}</del></span>
                      <span className="font-semibold text-slate-800">&rarr; {formatDateTime(item.newDueAt)}</span>
                    </div>
                    {item.note && (
                      <p className="text-[11px] text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        "{item.note}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logged Activities linked to this Follow-up */}
          {followUp.activities && followUp.activities.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText size={13} className="text-[#1d61e7]" />
                Linked Activities ({followUp.activities.length})
              </h3>
              <div className="space-y-2">
                {followUp.activities.map((act, idx) => {
                  const Icon = activityIconMap[act.type] || FileText;
                  return (
                    <div key={act.id || idx} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-xs">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1d61e7]">
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900">{act.type}</span>
                          <span className="text-[10px] text-slate-400">{formatDateTime(act.occurredAt)}</span>
                        </div>
                        {act.outcome && <p className="font-semibold text-slate-800 text-[11px] mt-0.5">{act.outcome}</p>}
                        {act.notes && <p className="text-slate-600 text-[11px] mt-1">{act.notes}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onReschedule(followUp);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Reschedule
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogActivity(followUp);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Log Activity
            </button>
            {followUp.status !== "COMPLETED" && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onComplete(followUp);
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
              >
                Complete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
