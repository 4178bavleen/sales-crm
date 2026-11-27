import React, { useState, useRef, useEffect } from "react";
import {
  CalendarDays,
  X,
  AlertCircle,
  Clock,
  RotateCw,
  Send,
  Info,
  Paperclip,
  UploadCloud,
  FileText,
  HeartPulse,
  Palmtree,
  Calendar,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import {
  LEAVE_TYPES,
  type ApplyLeavePayload,
  type LeaveRecord,
  type LeavePolicy,
} from "../../types/leave";
import {
  applyLeave,
  calculateDaysBetween,
  getLeaveTypeDetails,
  fetchActiveLeavePolicies,
} from "../../lib/leaves";

function getCategoryPillIcon(code: string, name: string) {
  const text = `${code} ${name}`.toUpperCase();
  if (text.includes("SICK") || text.includes("MEDICAL")) return HeartPulse;
  if (text.includes("EARNED") || text.includes("VACATION") || text.includes("PRIVILEGE")) return Palmtree;
  if (text.includes("COMP") || text.includes("OVERTIME")) return Clock;
  return Calendar;
}

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
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [leaveType, setLeaveType] = useState<string>("CASUAL");
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [reason, setReason] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      void fetchActiveLeavePolicies()
        .then((data) => {
          if (data && data.length > 0) {
            setPolicies(data);
            setLeaveType(data[0].code);
          }
        })
        .catch((err) => {
          console.error("Failed to load active policies:", err);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPolicy = policies.find(
    (p) => p.code === leaveType || p.name === leaveType
  );
  const isMedical =
    leaveType === "SICK" ||
    /sick|medical|doctor|prescription/i.test(currentPolicy?.name || "");
  const isDocRequired = Boolean(currentPolicy?.requiresDocument || isMedical);
  const docDescription =
    currentPolicy?.documentDescription ||
    (isMedical
      ? "Upload prescription, doctor's note, or medical slip"
      : "Upload supporting documentation (PDF, PNG, JPG up to 10MB)");

  const daysCount = calculateDaysBetween(startDate, endDate);

  const handleFileChange = (incomingFile: File | null) => {
    if (!incomingFile) return;

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
    ];
    if (!allowedTypes.includes(incomingFile.type)) {
      setError("Only PDF, JPG, PNG, and WEBP files are allowed.");
      return;
    }

    if (incomingFile.size > 10 * 1024 * 1024) {
      setError("Attachment size exceeds 10MB limit.");
      return;
    }

    setError(null);
    setFile(incomingFile);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
        document: file,
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
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Leave Type Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Leave Category <span className="text-rose-500">*</span>
              </label>
              {currentPolicy && (
                <span className="text-[10px] text-slate-500 font-medium">
                  Allowance: <span className="font-semibold text-slate-800">{currentPolicy.quota} Days</span> / {currentPolicy.period === "MONTHLY" ? "Month" : "Year"}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(policies.length > 0 ? policies : LEAVE_TYPES.map((t) => ({ code: t, name: getLeaveTypeDetails(t).label, id: 0, quota: 12, period: "YEARLY" as const, isPaid: true, requiresDocument: t === "SICK", sortOrder: 0, isActive: true }))).map((cat: any) => {
                const isSelected = leaveType === cat.code;
                const Icon = getCategoryPillIcon(cat.code, cat.name);
                return (
                  <button
                    key={cat.code}
                    type="button"
                    onClick={() => setLeaveType(cat.code)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer text-left ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs ring-1 ring-blue-600"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 border transition ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="truncate flex-1">
                      <div className="font-semibold truncate text-slate-900">{cat.name}</div>
                      {cat.quota !== undefined && (
                        <div className="text-[10px] text-slate-500 font-medium">
                          {cat.quota}d • {cat.isPaid ? "Paid" : "Unpaid"}
                        </div>
                      )}
                    </div>
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
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly describe the reason for your leave request..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none transition"
              required
            />
          </div>

          {/* Document / Medical Prescription Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                {isMedical ? (
                  <>
                    <HeartPulse className="h-3.5 w-3.5 text-rose-500" />
                    <span>Doctor&apos;s Prescription / Medical Certificate</span>
                  </>
                ) : (
                  <>
                    <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                    <span>Supporting Document {isDocRequired ? "(Required)" : "(Optional)"}</span>
                  </>
                )}
              </label>
              {isDocRequired && (
                <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                  {isMedical ? "Prescription Required" : "Document Required"}
                </span>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              className="hidden"
            />

            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileChange(e.dataTransfer.files?.[0] || null);
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition cursor-pointer text-center ${
                  isDragging
                    ? "border-blue-500 bg-blue-50/50"
                    : isMedical
                    ? "border-rose-200/80 bg-rose-50/30 hover:bg-rose-50/60"
                    : "border-slate-200 bg-slate-50/40 hover:bg-slate-50/80"
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl mb-2 ${
                    isMedical
                      ? "bg-rose-100 text-rose-600"
                      : "bg-blue-50 text-blue-600"
                  }`}
                >
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div className="text-xs font-semibold text-slate-800">
                  {docDescription}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click to browse or drag & drop (PDF, PNG, JPG up to 10MB)
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50/50">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="overflow-hidden text-left">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 truncate">
                      <span className="truncate">{file.name}</span>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                  title="Remove attachment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
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
