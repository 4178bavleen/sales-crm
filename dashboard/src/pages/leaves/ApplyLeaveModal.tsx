import React, { useState } from "react";
import {
  CalendarDays,
  X,
  AlertCircle,
  Clock,
  RotateCw,
  Send,
  Info,
} from "lucide-react";
import {
  LEAVE_TYPES,
  type ApplyLeavePayload,
  type LeaveRecord,
  type LeaveType,
} from "../../types/leave";
import {
  applyLeave,
  calculateDaysBetween,
  getLeaveTypeDetails,
} from "../../lib/leaves";

interface ApplyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newLeave: LeaveRecord) => void;
}

export default function ApplyLeaveModal({
  isOpen,
  onClose,
  onSuccess,
}: ApplyLeaveModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [leaveType, setLeaveType] = useState<LeaveType>("CASUAL");
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const daysCount = calculateDaysBetween(startDate, endDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!startDate || !endDate) {
      setError("Please select both start date and end date.");
      return;
    }

    if (startDate > endDate) {
      setError("Start date cannot be after end date.");
      return;
    }

    if (!reason.trim() || reason.trim().length < 3) {
      setError("Please provide a reason of at least 3 characters.");
      return;
    }

    setLoading(true);
    try {
      const payload: ApplyLeavePayload = {
        leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
      };
      const created = await applyLeave(payload);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to submit leave request. Please check dates.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Apply for Leave
              </h3>
              <p className="text-xs text-slate-500">
                Submit a new leave request for manager review
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5">
          {/* Leave Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Leave Category <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LEAVE_TYPES.map((type) => {
                const info = getLeaveTypeDetails(type);
                const isSelected = leaveType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setLeaveType(type)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-medium transition cursor-pointer text-left ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/70 text-blue-800 shadow-xs ring-1 ring-blue-600"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50/80"
                    }`}
                  >
                    <span>{info.label}</span>
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-blue-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dates & Duration */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none shadow-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  End Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none shadow-xs"
                  required
                />
              </div>
            </div>

            {/* Calculated duration summary badge */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 text-slate-600">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Requested Duration:
              </span>
              <span className="font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                {daysCount} {daysCount === 1 ? "Day" : "Days"}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason / Remarks <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly describe the reason for your leave request..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none transition"
              required
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-blue-50/60 p-3 text-[11px] text-blue-700 border border-blue-100">
            <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
            <span>
              Once approved, your leave days will be automatically recorded in the
              company attendance register as approved time off.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
