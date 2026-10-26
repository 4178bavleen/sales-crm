import { useState } from "react";
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Users,
} from "lucide-react";
import type { ImportPreviewResponse } from "../../lib/leads";

interface ImportPreviewModalProps {
  fileName: string;
  previewData: ImportPreviewResponse;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function ImportPreviewModal({
  fileName,
  previewData,
  onClose,
  onConfirm,
}: ImportPreviewModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duplicateRowSet = new Set(
    previewData.duplicates?.map((d) => d.rowNumber) || [],
  );

  async function handleConfirm() {
    try {
      setSubmitting(true);
      setError(null);
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm import");
      setSubmitting(false);
    }
  }

  const validRowCount = previewData.rows.length;
  const duplicateCount = previewData.duplicateCount || 0;

  return (
    <div
      className="dialog-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Import Preview"
        className="dialog-enter flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Import Preview
              </h2>
              <p className="text-xs text-slate-500">
                File: <span className="font-medium text-slate-700">{fileName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Overview Stats Badges */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/75 px-6 py-3">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs">
            <Users size={13} className="text-blue-600" />
            <span>Total Rows: <strong className="font-semibold text-slate-900">{validRowCount}</strong></span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-xs font-medium text-emerald-800">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>Ready to Import: <strong className="font-semibold text-emerald-900">{validRowCount}</strong></span>
          </div>

          {duplicateCount > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
              <AlertTriangle size={13} className="text-amber-600" />
              <span>
                Duplicates: <strong>{duplicateCount}</strong> (will be skipped during import)
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-6 mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Table Preview */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2.5 w-12 text-center">#</th>
                  <th className="px-3 py-2.5">Contact Name</th>
                  <th className="px-3 py-2.5">Company</th>
                  <th className="px-3 py-2.5">Email</th>
                  <th className="px-3 py-2.5">Phone</th>
                  <th className="px-3 py-2.5">Priority</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewData.rows.map((row) => {
                  const isDuplicate = duplicateRowSet.has(row.rowNumber);
                  const contact = String(row.data.contactName || "—");
                  const company = String(row.data.companyName || row.data.company || "—");
                  const email = String(row.data.email || "—");
                  const phone = String(row.data.phone || "—");
                  const priority = String(row.data.priority || "MEDIUM");
                  const status = String(row.data.status || "NEW");

                  return (
                    <tr
                      key={row.rowNumber}
                      className={isDuplicate ? "bg-amber-50/50" : "hover:bg-slate-50/60"}
                    >
                      <td className="px-3 py-2 text-center font-mono text-[10px] text-slate-400">
                        {row.rowNumber}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        <div className="flex items-center gap-1.5">
                          {contact}
                          {isDuplicate && (
                            <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-700">
                              Duplicate
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{company}</td>
                      <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">
                        {email}
                      </td>
                      <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">
                        {phone}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                            priority === "URGENT" || priority === "HIGH"
                              ? "bg-rose-50 text-rose-700"
                              : priority === "MEDIUM"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {priority}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-6 py-3.5">
          <p className="text-xs text-slate-500">
            Showing all <strong className="font-semibold text-slate-700">{validRowCount}</strong> parsed row{validRowCount === 1 ? "" : "s"}
          </p>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || validRowCount === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
            >
              {submitting && (
                <RotateCw size={13} className="animate-spin text-white" />
              )}
              <span>
                {submitting
                  ? "Importing..."
                  : `Confirm & Import (${validRowCount})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
