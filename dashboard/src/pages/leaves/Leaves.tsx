import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Check,
  X,
  RotateCw,
  CalendarCheck2,
  CalendarOff,
  Calendar,
  HeartPulse,
  Palmtree,
  UserCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Eye,
  Download,
  ExternalLink,
  FileText,
} from "lucide-react";
import { getSession } from "../../lib/auth";
import {
  fetchMyLeaves,
  fetchMyLeaveStats,
  fetchAllLeaves,
  cancelMyLeave,
  reviewLeave,
  formatLeaveDate,
  calculateDaysBetween,
  getLeaveTypeDetails,
  getLeaveStatusBadge,
  fetchLeaveDocumentBlob,
} from "../../lib/leaves";
import {
  LEAVE_TYPES,
  LEAVE_STATUSES,
  type LeaveRecord,
  type LeaveStats,
  type LeaveType,
  type LeaveStatus,
} from "../../types/leave";
import StatCard from "../../components/ui/StatCard";
import ApplyLeaveModal from "./ApplyLeaveModal";

export default function Leaves() {
  const session = getSession();
  const user = session?.user;
  const canManageLeaves = Boolean(
    user?.role?.toUpperCase() === "ADMIN" ||
    user?.permissions?.includes("leave.manage")
  );

  const [activeTab, setActiveTab] = useState<"my" | "approvals">("my");
  const [stats, setStats] = useState<LeaveStats | null>(null);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filters & Pagination
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  // Modals
  const [showApplyModal, setShowApplyModal] = useState<boolean>(false);
  const [rejectModalState, setRejectModalState] = useState<{
    leaveId: number;
    employeeName: string;
  } | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState<string>("");

  // Document Preview Modal State
  const [previewModalState, setPreviewModalState] = useState<{
    leaveId: number;
    leaveType: LeaveType;
    employeeName: string;
    documentName: string;
    documentType?: string | null;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const handleOpenDocument = async (leave: LeaveRecord) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewModalState({
      leaveId: leave.id,
      leaveType: leave.leaveType,
      employeeName: leave.user?.name || "Employee",
      documentName: leave.documentName || "document",
      documentType: leave.documentType,
    });
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewUrl(null);

    try {
      const { url } = await fetchLeaveDocumentBlob(leave.id);
      setPreviewUrl(url);
    } catch (err: any) {
      setPreviewError(err?.message || "Failed to load attached document.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCloseDocument = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewModalState(null);
    setPreviewUrl(null);
    setPreviewError(null);
  };

  // Load Leave Stats (Balances)
  const loadStats = useCallback(async () => {
    try {
      const data = await fetchMyLeaveStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load leave balances:", err);
    }
  }, []);

  // Load Leave Records (My Leaves or Approvals)
  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        page,
        limit: 15,
        status: statusFilter !== "ALL" ? (statusFilter as LeaveStatus) : undefined,
        leaveType: typeFilter !== "ALL" ? (typeFilter as LeaveType) : undefined,
        search: search.trim() || undefined,
      };

      if (activeTab === "my") {
        const res = await fetchMyLeaves(filters);
        setLeaves(res.records || []);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalCount(res.pagination?.total || 0);
      } else {
        const res = await fetchAllLeaves(filters);
        setLeaves(res.records || []);
        setPendingApprovalsCount(res.pendingCount || 0);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalCount(res.pagination?.total || 0);
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to load leave records.",
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, statusFilter, typeFilter, search]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Handle Cancel Pending Leave (Self-Service)
  const handleCancelLeave = async (leaveId: number) => {
    if (!window.confirm("Are you sure you want to cancel this leave request?")) {
      return;
    }
    setActionLoadingId(leaveId);
    try {
      await cancelMyLeave(leaveId);
      setFeedback({
        type: "success",
        message: "Your leave application has been cancelled.",
      });
      loadRecords();
      loadStats();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to cancel leave request.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Quick Approve (Manager)
  const handleApprove = async (leaveId: number) => {
    setActionLoadingId(leaveId);
    try {
      await reviewLeave(leaveId, { action: "APPROVE" });
      setFeedback({
        type: "success",
        message: "Leave request approved! Attendance records updated automatically.",
      });
      loadRecords();
      loadStats();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to approve leave request.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Reject Submit
  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalState) return;

    setActionLoadingId(rejectModalState.leaveId);
    try {
      await reviewLeave(rejectModalState.leaveId, {
        action: "REJECT",
        remarks: rejectRemarks.trim() || undefined,
      });
      setFeedback({
        type: "success",
        message: "Leave request has been rejected.",
      });
      setRejectModalState(null);
      setRejectRemarks("");
      loadRecords();
      loadStats();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to reject leave request.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <CalendarOff className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Leave Management
              </h1>
              <p className="text-xs text-slate-500">
                Apply for leaves, check balances, and manage team time-off requests
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              loadRecords();
              loadStats();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
          >
            <RotateCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowApplyModal(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-xs font-medium ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI Cards Row (Global StatCard component without sparkline graph) */}
      {stats && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            label="Casual Leave (CL)"
            value={`${stats.remainingBalance.CASUAL} Days`}
            subtext={`${stats.annualQuota.CASUAL - stats.remainingBalance.CASUAL} of ${stats.annualQuota.CASUAL} days used`}
            icon={Calendar}
            color="blue"
          />

          <StatCard
            label="Sick Leave (SL)"
            value={`${stats.remainingBalance.SICK} Days`}
            subtext={`${stats.annualQuota.SICK - stats.remainingBalance.SICK} of ${stats.annualQuota.SICK} days used`}
            icon={HeartPulse}
            color="rose"
          />

          <StatCard
            label="Earned Leave (EL)"
            value={`${stats.remainingBalance.EARNED} Days`}
            subtext={`${stats.annualQuota.EARNED - stats.remainingBalance.EARNED} of ${stats.annualQuota.EARNED} days used`}
            icon={Palmtree}
            color="emerald"
          />

          <StatCard
            label="Approved Days"
            value={`${stats.totalApprovedDays} Days`}
            subtext="Total taken this year"
            icon={CheckCircle2}
            color="sky"
          />

          <StatCard
            label={canManageLeaves && activeTab === "approvals" ? "Team Approvals" : "Pending Requests"}
            value={canManageLeaves ? (pendingApprovalsCount || stats.pendingRequests) : stats.pendingRequests}
            subtext="Awaiting review"
            icon={Clock}
            color="amber"
          />
        </div>
      )}

      {/* Main Content Box with Role-Aware Tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 pt-3 bg-slate-50/40">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("my");
                setPage(1);
              }}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition cursor-pointer ${
                activeTab === "my"
                  ? "border-blue-600 text-blue-600 bg-white rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <CalendarCheck2 size={15} />
              <span>My Leaves</span>
            </button>

            {canManageLeaves && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab("approvals");
                  setPage(1);
                }}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition cursor-pointer relative ${
                  activeTab === "approvals"
                    ? "border-blue-600 text-blue-600 bg-white rounded-t-xl"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <UserCheck size={15} />
                <span>Leave Approvals</span>
                {pendingApprovalsCount > 0 && (
                  <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.2 text-[10px] font-bold text-white">
                    {pendingApprovalsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
              <input
                type="text"
                placeholder={
                  activeTab === "my"
                    ? "Search reasons..."
                    : "Search employee name or reason..."
                }
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8.5 pr-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-700 font-medium focus:border-blue-500 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              {LEAVE_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st.charAt(0) + st.slice(1).toLowerCase()}
                </option>
              ))}
            </select>

            {/* Leave Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-700 font-medium focus:border-blue-500 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {getLeaveTypeDetails(t).label}
                </option>
              ))}
            </select>

            {(statusFilter !== "ALL" || typeFilter !== "ALL" || search) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("ALL");
                  setTypeFilter("ALL");
                  setSearch("");
                  setPage(1);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{leaves.length}</span> of{" "}
            <span className="font-bold text-slate-800">{totalCount}</span> entries
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <RotateCw className="w-7 h-7 animate-spin text-blue-600 mb-2.5" />
            <p className="text-xs font-medium">Loading leave applications...</p>
          </div>
        ) : leaves.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <CalendarOff className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              No leave records found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {activeTab === "my"
                ? "You haven't submitted any leave requests matching the selected filters."
                : "No employee leave applications awaiting review."}
            </p>
            {activeTab === "my" && (
              <button
                type="button"
                onClick={() => setShowApplyModal(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
              >
                <Plus size={14} />
                <span>Apply for Leave</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">#</th>
                  {activeTab === "approvals" && (
                    <th className="py-3 px-4">Employee</th>
                  )}
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Duration & Dates</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Status</th>
                  {activeTab === "my" && (
                    <th className="py-3 px-4">Reviewed By</th>
                  )}
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.map((leave, idx) => {
                  const typeInfo = getLeaveTypeDetails(leave.leaveType);
                  const statusInfo = getLeaveStatusBadge(leave.status);
                  const days = calculateDaysBetween(leave.startDate, leave.endDate);
                  const isPending = leave.status === "PENDING";
                  const isProcessing = actionLoadingId === leave.id;

                  return (
                    <tr key={leave.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        {(page - 1) * 15 + idx + 1}
                      </td>

                      {/* Employee Info (Admin Approvals Tab) */}
                      {activeTab === "approvals" && (
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200">
                              {leave.user?.name?.slice(0, 2).toUpperCase() || "EM"}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">
                                {leave.user?.name}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {leave.user?.employeeProfile?.employeeCode ||
                                  leave.user?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Leave Category Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${typeInfo.badgeClass}`}
                        >
                          {typeInfo.label}
                        </span>
                      </td>

                      {/* Duration & Dates */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                          <span>
                            {formatLeaveDate(leave.startDate)} — {formatLeaveDate(leave.endDate)}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
                            {days} {days === 1 ? "day" : "days"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Applied on {formatLeaveDate(leave.createdAt)}
                        </div>
                        {leave.documentName && (
                          <div className="mt-1.5 flex items-center">
                            <button
                              type="button"
                              onClick={() => handleOpenDocument(leave)}
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition cursor-pointer ${
                                leave.leaveType === "SICK"
                                  ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300"
                                  : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
                              }`}
                              title={`View ${leave.documentName}`}
                            >
                              {leave.leaveType === "SICK" ? (
                                <HeartPulse className="h-3 w-3 text-rose-600" />
                              ) : (
                                <Paperclip className="h-3 w-3 text-blue-600" />
                              )}
                              <span>
                                {leave.leaveType === "SICK"
                                  ? "Prescription"
                                  : "Attachment"}
                              </span>
                              <Eye className="h-3 w-3 ml-0.5 opacity-70" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 max-w-md lg:max-w-xl">
                        <p className="text-slate-700 line-clamp-2 leading-relaxed">
                          {leave.reason}
                        </p>
                        {leave.rejectionReason && (
                          <div className="mt-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                            Rejection Note: {leave.rejectionReason}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusInfo.badgeClass}`}
                        >
                          {leave.status === "APPROVED" && (
                            <CheckCircle2 size={12} className="text-emerald-600" />
                          )}
                          {leave.status === "REJECTED" && (
                            <XCircle size={12} className="text-rose-600" />
                          )}
                          {leave.status === "PENDING" && (
                            <Clock size={12} className="text-amber-600" />
                          )}
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>

                      {/* Reviewer Info (My Leaves Tab) */}
                      {activeTab === "my" && (
                        <td className="py-3.5 px-4 text-slate-500">
                          {leave.approvedBy ? (
                            <div>
                              <span className="font-medium text-slate-800">
                                {leave.approvedBy.name}
                              </span>
                              {leave.approvedAt && (
                                <div className="text-[10px] text-slate-400">
                                  {formatLeaveDate(leave.approvedAt)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                      )}

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        {activeTab === "my" ? (
                          <div className="flex items-center justify-end gap-2">
                            {leave.documentName && (
                              <button
                                type="button"
                                onClick={() => handleOpenDocument(leave)}
                                className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
                                title="View attached document"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                            {isPending ? (
                              <button
                                type="button"
                                onClick={() => handleCancelLeave(leave.id)}
                                disabled={isProcessing}
                                className="text-xs text-rose-600 hover:text-rose-800 font-semibold transition disabled:opacity-50 cursor-pointer"
                              >
                                {isProcessing ? "Cancelling..." : "Cancel"}
                              </button>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>
                        ) : isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            {leave.documentName && (
                              <button
                                type="button"
                                onClick={() => handleOpenDocument(leave)}
                                className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
                                title="View attached document"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleApprove(leave.id)}
                              disabled={isProcessing}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                              <Check size={12} />
                              <span>Approve</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setRejectModalState({
                                  leaveId: leave.id,
                                  employeeName: leave.user?.name || "Employee",
                                })
                              }
                              disabled={isProcessing}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition disabled:opacity-50 cursor-pointer"
                            >
                              <X size={12} />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {leave.documentName && (
                              <button
                                type="button"
                                onClick={() => handleOpenDocument(leave)}
                                className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
                                title="View attached document"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                            <span className="text-slate-400 text-[11px] italic">
                              Reviewed
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 bg-slate-50/30 text-xs">
            <span className="text-slate-500">
              Page <span className="font-semibold text-slate-800">{page}</span> of{" "}
              <span className="font-semibold text-slate-800">{totalPages}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      <ApplyLeaveModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onSuccess={() => {
          setFeedback({
            type: "success",
            message: "Your leave application has been submitted successfully!",
          });
          loadRecords();
          loadStats();
        }}
      />

      {/* Reject Remarks Modal */}
      {rejectModalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-600" />
                Reject Leave Request
              </h3>
              <button
                onClick={() => setRejectModalState(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to reject the leave application for{" "}
                <span className="font-semibold text-slate-900">
                  {rejectModalState.employeeName}
                </span>
                . You can optionally include feedback or reason for rejection.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Rejection Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  value={rejectRemarks}
                  onChange={(e) => setRejectRemarks(e.target.value)}
                  placeholder="e.g. Critical project deadline on these dates, please reschedule..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectModalState(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId !== null}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-xs disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document / Prescription Preview Modal */}
      {previewModalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-6 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                    previewModalState.leaveType === "SICK"
                      ? "bg-rose-50 border-rose-100 text-rose-600"
                      : "bg-blue-50 border-blue-100 text-blue-600"
                  }`}
                >
                  {previewModalState.leaveType === "SICK" ? (
                    <HeartPulse className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 truncate max-w-md">
                      {previewModalState.documentName}
                    </h3>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                        previewModalState.leaveType === "SICK"
                          ? "bg-rose-50 border-rose-200 text-rose-700"
                          : "bg-blue-50 border-blue-200 text-blue-700"
                      }`}
                    >
                      {previewModalState.leaveType === "SICK"
                        ? "Doctor's Prescription"
                        : "Supporting Document"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Attached by <span className="font-semibold text-slate-700">{previewModalState.employeeName}</span> for {previewModalState.leaveType.toLowerCase()} leave
                  </p>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2">
                {previewUrl && (
                  <>
                    <a
                      href={previewUrl}
                      download={previewModalState.documentName}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs cursor-pointer"
                      title="Download file to device"
                    >
                      <Download size={13} />
                      <span>Download</span>
                    </a>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs cursor-pointer"
                      title="Open document in full new tab"
                    >
                      <ExternalLink size={13} />
                      <span>Open in New Tab</span>
                    </a>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleCloseDocument}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center min-h-[350px] bg-slate-50/40">
              {previewLoading && (
                <div className="flex flex-col items-center justify-center text-slate-500 py-12">
                  <RotateCw className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                  <p className="text-xs font-semibold text-slate-700">Loading document...</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Fetching securely from server</p>
                </div>
              )}

              {previewError && (
                <div className="max-w-md w-full p-6 text-center rounded-2xl bg-white border border-rose-200 shadow-sm">
                  <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-3">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Failed to load preview</h4>
                  <p className="text-xs text-rose-600 mt-1">{previewError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      const leave = leaves.find((l) => l.id === previewModalState.leaveId);
                      if (leave) handleOpenDocument(leave);
                    }}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    <RotateCw size={13} />
                    <span>Try Again</span>
                  </button>
                </div>
              )}

              {!previewLoading && !previewError && previewUrl && (
                <>
                  {previewModalState.documentType?.startsWith("image/") ||
                  /\.(jpe?g|png|webp|gif)$/i.test(previewModalState.documentName) ? (
                    <div className="flex flex-col items-center max-w-full">
                      <img
                        src={previewUrl}
                        alt={previewModalState.documentName}
                        className="max-h-[70vh] max-w-full w-auto object-contain rounded-xl shadow-md border border-slate-200 bg-white"
                      />
                    </div>
                  ) : previewModalState.documentType === "application/pdf" ||
                    /\.pdf$/i.test(previewModalState.documentName) ? (
                    <div className="w-full h-[70vh] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                      <iframe
                        src={previewUrl}
                        className="w-full h-full"
                        title={previewModalState.documentName}
                      />
                    </div>
                  ) : (
                    <div className="max-w-md w-full p-8 text-center rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4">
                        <FileText className="h-7 w-7" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {previewModalState.documentName}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Direct inline preview is not supported for this file type. You can download or open it directly in a new tab.
                      </p>
                      <div className="mt-5 flex items-center justify-center gap-3">
                        <a
                          href={previewUrl}
                          download={previewModalState.documentName}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer shadow-xs"
                        >
                          <Download size={14} />
                          <span>Download File</span>
                        </a>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
