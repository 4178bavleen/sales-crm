import { useState } from "react";
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Users,
  Download,
} from "lucide-react";
import type { ImportPreviewResponse } from "../../lib/leads";

interface ImportPreviewModalProps {
  fileName: string;
  previewData: ImportPreviewResponse;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onDownloadTemplate?: (format: "xlsx" | "csv") => void;
}

export default function ImportPreviewModal({
  fileName,
  previewData,
  onClose,
  onConfirm,
  onDownloadTemplate,
}: ImportPreviewModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duplicateMap = new Map(
    previewData.duplicates?.map((d) => [d.rowNumber, d]) || [],
  );

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

  const totalRowCount = previewData.rows.length;
  const duplicateCount = previewData.duplicateCount ?? duplicateRowSet.size;
  const readyToImportCount = Math.max(0, totalRowCount - duplicateCount);

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

          <div className="flex items-center gap-2">
            {onDownloadTemplate && (
              <button
                type="button"
                onClick={() => onDownloadTemplate("xlsx")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <Download size={13} className="text-[#1d61e7]" />
                <span>Template</span>
              </button>
            )}

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
        </div>

        {/* Overview Stats Badges */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/75 px-6 py-3">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs">
            <Users size={13} className="text-blue-600" />
            <span>Total Rows: <strong className="font-semibold text-slate-900">{totalRowCount}</strong></span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-xs font-medium text-emerald-800">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>Ready to Import: <strong className="font-semibold text-emerald-900">{readyToImportCount}</strong></span>
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
                  <th className="px-3 py-2.5 w-10 text-center">#</th>
                  <th className="px-3 py-2.5">Lead Name</th>
                  <th className="px-3 py-2.5">Company</th>
                  <th className="px-3 py-2.5">Email</th>
                  <th className="px-3 py-2.5">Phone</th>
                  <th className="px-3 py-2.5">Lead Source</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Priority</th>
                  <th className="px-3 py-2.5">Owner</th>
                  <th className="px-3 py-2.5">Next Follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewData.rows.map((row) => {
                  const dupInfo = duplicateMap.get(row.rowNumber);
                  const isDuplicate = !!dupInfo;
                  const contact = String(row.data.contactName || "—");
                  const company = String(row.data.companyName || row.data.company || "—");
                  const email = String(row.data.email || "—");
                  const phone = String(row.data.phone || "—");
                  const source = String(row.data.source || row.data.leadSource || row.data.sourceId || "—");
                  const status = String(row.data.status || "NEW");
                  const priority = String(row.data.priority || "MEDIUM");
                  const owner = String(row.data.owner || row.data.leadOwner || row.data.ownerId || "Unassigned");
                  const nextFollowUp = row.data.nextFollowUpAt
                    ? String(row.data.nextFollowUpAt).slice(0, 10)
                    : "—";

                  return (
                    <tr
                      key={row.rowNumber}
                      className={isDuplicate ? "bg-amber-50/60" : "hover:bg-slate-50/60"}
                    >
                      <td className="px-3 py-2 text-center font-mono text-[10px] text-slate-400">
                        {row.rowNumber}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{contact}</span>
                            {isDuplicate && (
                              <span
                                className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700"
                                title={dupInfo?.reason}
                              >
                                Duplicate
                              </span>
                            )}
                          </div>
                          {isDuplicate && dupInfo?.reason && (
                            <span className="text-[10px] text-amber-600 font-normal">
                              {dupInfo.reason}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{company}</td>
                      <td className="px-3 py-2 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {email}
                      </td>
                      <td className="px-3 py-2 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {phone}
                      </td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                        <span className="inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                          {source}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                          {status}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
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
                      <td className="px-3 py-2 text-slate-600 text-[11px] font-medium whitespace-nowrap">
                        {owner}
                      </td>
                      <td className="px-3 py-2 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {nextFollowUp}
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
            Showing all <strong className="font-semibold text-slate-700">{totalRowCount}</strong> parsed row{totalRowCount === 1 ? "" : "s"}
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
              disabled={submitting || readyToImportCount === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
            >
              {submitting && (
                <RotateCw size={13} className="animate-spin text-white" />
              )}
              <span>
                {submitting
                  ? "Importing..."
                  : readyToImportCount === 0
                  ? "No New Leads to Import"
                  : `Confirm & Import (${readyToImportCount})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
