import { useState } from "react";
import {
  Shield,
  X,
  Clock,
  Globe,
  Copy,
  Check,
  FileCode,
  Layers,
} from "lucide-react";
import type { AuditLogItem } from "../../lib/auditLogs";

interface AuditLogDetailDialogProps {
  log: AuditLogItem;
  onClose: () => void;
}

function getActionColor(action: string) {
  switch (action) {
    case "CREATE":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "ASSIGN":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "STATUS_CHANGE":
    case "STAGE_CHANGE":
      return "bg-blue-50 text-[#1d61e7] border-blue-200";
    case "DISQUALIFY":
    case "DELETE":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "CLOSE_WON":
      return "bg-purple-50 text-purple-700 border-purple-200";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
}

export default function AuditLogDetailDialog({
  log,
  onClose,
}: AuditLogDetailDialogProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"DIFF" | "RAW">("DIFF");

  const actorName = log.actor?.name || (log.actorId ? `User #${log.actorId}` : "System");
  const actorEmail = log.actor?.email || "";
  const actorRole = log.actor?.role?.name || "Member";

  const handleCopyJson = () => {
    const fullJson = JSON.stringify(
      {
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        actor: log.actor || { id: log.actorId, name: actorName },
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
        before: log.before,
        after: log.after,
      },
      null,
      2
    );
    navigator.clipboard.writeText(fullJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Compute keys that differ between before and after
  const beforeObj = log.before || {};
  const afterObj = log.after || {};
  const allKeys = Array.from(
    new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)])
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-2xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Audit Log Details"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1d61e7] ring-1 ring-[#1d61e7]/20">
              <Shield size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Audit Log Details
                </h2>
                <span className="rounded-md bg-slate-200/70 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-800">
                  #{log.id}
                </span>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getActionColor(
                    log.action
                  )}`}
                >
                  {log.action}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600">
                Immutable event record captured at {new Date(log.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Entity Target */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Target Entity
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-[#1d61e7]">
                  {log.entityType}
                </span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  ID #{log.entityId}
                </span>
              </div>
            </div>

            {/* Performed By */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Performed By
              </span>
              <div className="mt-1 flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-bold text-xs">
                  {actorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {actorName}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    {actorEmail ? `${actorEmail} • ${actorRole}` : actorRole}
                  </p>
                </div>
              </div>
            </div>

            {/* Timestamp */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Clock size={12} className="text-slate-500" />
                Date &amp; Time
              </span>
              <p className="mt-1 text-xs font-semibold text-slate-800">
                {new Date(log.createdAt).toLocaleDateString("en-US", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p className="font-mono text-[11px] text-slate-600">
                {new Date(log.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>

            {/* Network / Origin */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Globe size={12} className="text-slate-500" />
                Origin / Client IP
              </span>
              <p className="mt-1 font-mono text-xs font-bold text-slate-800">
                {log.ipAddress || "Internal Server / Loopback"}
              </p>
            </div>
          </div>

          {/* View Mode Toggle & Copy Action */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode("DIFF")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  viewMode === "DIFF"
                    ? "bg-[#1d61e7] text-white shadow-2xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Layers size={14} />
                Field Changes
              </button>
              <button
                type="button"
                onClick={() => setViewMode("RAW")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  viewMode === "RAW"
                    ? "bg-[#1d61e7] text-white shadow-2xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <FileCode size={14} />
                Raw JSON
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyJson}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-600" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} className="text-slate-500" />
                  <span>Copy Payload</span>
                </>
              )}
            </button>
          </div>

          {/* VIEW MODE: FIELD DIFF */}
          {viewMode === "DIFF" && (
            <div className="space-y-4">
              {allKeys.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-600">
                  No mutation attributes recorded for this action.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                      <tr>
                        <th className="px-4 py-2.5 w-1/3">Field</th>
                        <th className="px-4 py-2.5 w-1/3">Previous Value</th>
                        <th className="px-4 py-2.5 w-1/3">Updated Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {allKeys.map((key) => {
                        const prevVal = beforeObj[key];
                        const nextVal = afterObj[key];
                        const isChanged =
                          JSON.stringify(prevVal) !== JSON.stringify(nextVal);

                        return (
                          <tr
                            key={key}
                            className={
                              isChanged ? "bg-amber-50/40" : "hover:bg-slate-50/60"
                            }
                          >
                            <td className="px-4 py-2.5 font-bold text-slate-900 font-sans">
                              {key}
                            </td>
                            <td className="px-4 py-2.5 text-slate-700 max-w-xs break-all">
                              {prevVal !== undefined ? (
                                <span className={isChanged ? "line-through text-rose-600" : ""}>
                                  {typeof prevVal === "object"
                                    ? JSON.stringify(prevVal)
                                    : String(prevVal)}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic font-sans">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-slate-900 max-w-xs break-all">
                              {nextVal !== undefined ? (
                                <span className={isChanged ? "font-bold text-emerald-700" : ""}>
                                  {typeof nextVal === "object"
                                    ? JSON.stringify(nextVal)
                                    : String(nextVal)}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic font-sans">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE: RAW JSON */}
          {viewMode === "RAW" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Before State
                  </p>
                  <pre className="rounded-xl border border-slate-200 bg-slate-900 p-3 text-[11px] font-mono text-slate-200 overflow-x-auto max-h-56">
                    {JSON.stringify(log.before || {}, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    After State
                  </p>
                  <pre className="rounded-xl border border-slate-200 bg-slate-900 p-3 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-56">
                    {JSON.stringify(log.after || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end border-t border-slate-200 px-6 py-3.5 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-900 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}