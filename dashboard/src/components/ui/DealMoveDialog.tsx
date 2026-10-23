import { X, Trophy, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { DealMoveDialogProps } from "../../types/dealUi";
import { DEAL_LOST_REASONS } from "../../types/deal";
import { formatCurrency } from "../../columns/dealColumns";
import { Field, SelectField, TextAreaField } from "./FormControls";
import {
  cellClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "../../types/formControls";

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Confirmation shown when a drag lands on a terminal pipeline column.
 *
 * Moving a deal to Won or Lost is the point where the schema expects extra
 * data (Deal.closedRevenue/closedAt for WON, Deal.lostReasonId/lostNote for
 * LOST), so those are collected here rather than left blank.
 */
export default function DealMoveDialog({
  move,
  onCancel,
  onConfirm,
}: DealMoveDialogProps) {
  const { deal, toStage } = move;
  const isWon = toStage.kind === "WON";

  // Pre-fill revenue from the estimate — a sensible default the user can change.
  const [wonRevenue, setWonRevenue] = useState(
    deal.estimatedValue ? String(deal.estimatedValue) : "",
  );
  const [closedAt, setClosedAt] = useState(deal.closedAt || today());
  const [lostReason, setLostReason] = useState(
    deal.lostReason || DEAL_LOST_REASONS[0] || "",
  );
  const [lostNote, setLostNote] = useState(deal.lostNote);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="dialog-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirm stage change"
        className="dialog-enter w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                isWon
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-rose-50 text-rose-600"
              }`}
            >
              {isWon ? <Trophy size={19} /> : <XCircle size={19} />}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">
                Move to {toStage.name}
              </p>
              <h2 className="mt-0.5 truncate text-base font-semibold text-slate-800">
                {deal.name}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Estimated {formatCurrency(deal.estimatedValue)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
            aria-label="Cancel stage change"
          >
            <X size={17} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-xs text-slate-500">
            {isWon
              ? "Marking this deal Won records its revenue. Confirming is final in this demo — you can still edit it later."
              : "Marking this deal Lost records why. Confirming is final in this demo — you can still edit it later."}
          </p>

          {isWon ? (
            <>
              <div className={cellClass}>
                <Field
                  label="Revenue"
                  value={wonRevenue}
                  onChange={setWonRevenue}
                  type="number"
                  placeholder="0"
                />
              </div>
              <div className={cellClass}>
                <Field
                  label="Closed At"
                  value={closedAt}
                  onChange={setClosedAt}
                  type="date"
                />
              </div>
            </>
          ) : (
            <>
              <div className={cellClass}>
                <SelectField
                  label="Lost Reason"
                  value={lostReason}
                  onChange={setLostReason}
                  options={DEAL_LOST_REASONS}
                />
              </div>
              <div className={cellClass}>
                <TextAreaField
                  label="Lost Note"
                  value={lostNote}
                  onChange={setLostNote}
                  placeholder="Why the deal was lost."
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button type="button" onClick={onCancel} className={secondaryButtonClass}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              onConfirm({ wonRevenue, closedAt, lostReason, lostNote })
            }
            className={primaryButtonClass}
          >
            Move to {toStage.name}
          </button>
        </div>
      </div>
    </div>
  );
}
   
