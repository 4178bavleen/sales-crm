import { useState, useEffect } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Handshake,
  Layers,
  Plus,
  Save,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import type { Priority, TaskStatus } from "../../types/task";
import type { TaskFormProps } from "../../types/taskForm";
import { request } from "../../lib/api";
import { getSession } from "../../lib/auth";
import { ENDPOINTS } from "../../lib/endpoints";

type ApiUser = {
  id: number;
  name: string;
  email: string;
  isActive?: boolean;
};

type ApiLeadOption = {
  id: number;
  contactName: string;
  companyName: string | null;
};

type ApiDealOption = {
  id: number;
  name: string;
};

type ApiCancelReason = {
  id: number;
  name: string;
};

type TaskOptionsResponse = {
  users: ApiUser[];
  leads: ApiLeadOption[];
  deals: ApiDealOption[];
  cancelReasons?: ApiCancelReason[];
  priorities: Priority[];
  statuses: TaskStatus[];
};

const STATUS_STYLES: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  OPEN: {
    label: "Open",
    badgeClass: "bg-sky-50 text-sky-950 border-sky-300 font-bold",
    dotClass: "bg-sky-600",
  },
  IN_PROGRESS: {
    label: "In Progress",
    badgeClass: "bg-amber-50 text-amber-950 border-amber-300 font-bold",
    dotClass: "bg-amber-600",
  },
  COMPLETED: {
    label: "Completed",
    badgeClass: "bg-emerald-50 text-emerald-950 border-emerald-300 font-bold",
    dotClass: "bg-emerald-600",
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass: "bg-slate-100 text-slate-900 border-slate-300 font-bold",
    dotClass: "bg-slate-500",
  },
};

const PRIORITY_STYLES: Record<string, { label: string; dotClass: string }> = {
  LOW: { label: "Low", dotClass: "bg-slate-500" },
  MEDIUM: { label: "Medium", dotClass: "bg-blue-600" },
  HIGH: { label: "High", dotClass: "bg-amber-600" },
  URGENT: { label: "Urgent", dotClass: "bg-rose-600" },
};

function getStatusMeta(s?: string) {
  if (!s) {
    return {
      label: "None",
      badgeClass: "bg-slate-50 text-slate-500 border-slate-200",
      dotClass: "bg-slate-400",
    };
  }
  if (STATUS_STYLES[s]) return STATUS_STYLES[s];
  const formatted = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, " ");
  return {
    label: formatted,
    badgeClass: "bg-slate-50 text-slate-900 border-slate-200 font-bold",
    dotClass: "bg-slate-500",
  };
}

function getPriorityMeta(p?: string) {
  if (!p) {
    return {
      label: "None",
      dotClass: "bg-slate-300",
    };
  }
  if (PRIORITY_STYLES[p]) return PRIORITY_STYLES[p];
  const formatted = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase().replace(/_/g, " ");
  return {
    label: formatted,
    dotClass: "bg-slate-400",
  };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatPreviewDate(iso: string): { label: string; isOverdue: boolean } {
  if (!iso) return { label: "No date set", isOverdue: false };
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const formatted = target.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: target.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });

    if (diffDays < 0) return { label: `Overdue (${formatted})`, isOverdue: true };
    if (diffDays === 0) return { label: `Due Today (${formatted})`, isOverdue: false };
    if (diffDays === 1) return { label: `Due Tomorrow (${formatted})`, isOverdue: false };
    return { label: `Due in ${diffDays} days (${formatted})`, isOverdue: false };
  } catch {
    return { label: iso, isOverdue: false };
  }
}

export default function TaskForm({
  mode,
  values,
  onClose,
  onSubmit,
}: TaskFormProps) {
  const isEdit = mode === "edit";
  const session = getSession();
  const currentUserId = session?.user?.id;
  const currentUserName = session?.user?.name;

  // Fully dynamic options loaded directly from backend API
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [leads, setLeads] = useState<ApiLeadOption[]>([]);
  const [deals, setDeals] = useState<ApiDealOption[]>([]);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [cancelReasons, setCancelReasons] = useState<ApiCancelReason[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  // Form field state (no static fake fallbacks)
  const [title, setTitle] = useState(values?.title ?? "");
  const [description, setDescription] = useState(values?.description ?? "");
  const [dueAt, setDueAt] = useState(values?.dueAt ?? "");
  const [priority, setPriority] = useState<Priority | "">(values?.priority ?? "");
  const [status, setStatus] = useState<TaskStatus | "">(values?.status ?? "");
  const [assignedTo, setAssignedTo] = useState(values?.assignedTo ?? "");
  const [assignedToId, setAssignedToId] = useState<number | undefined>(values?.assignedToId);

  // Link state (CRM Entity connection)
  const initialLinkType = values?.dealId || values?.deal
    ? "deal"
    : values?.leadId || values?.lead
      ? "lead"
      : "none";
  const [linkType, setLinkType] = useState<"none" | "lead" | "deal">(initialLinkType);
  const [leadId, setLeadId] = useState<number | null>(values?.leadId ?? null);
  const [leadName, setLeadName] = useState(values?.lead ?? "");
  const [dealId, setDealId] = useState<number | null>(values?.dealId ?? null);
  const [dealName, setDealName] = useState(values?.deal ?? "");

  // Completion & Cancellation
  const [completedAt, setCompletedAt] = useState(values?.completedAt ?? "");
  const [completedBy, setCompletedBy] = useState(values?.completedBy ?? "");
  const [completionNote, setCompletionNote] = useState(values?.completionNote ?? "");
  const [cancelReason, setCancelReason] = useState(values?.cancelReason ?? "");

  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Load all task options dynamically from backend
  useEffect(() => {
    let cancelled = false;
    setIsLoadingOptions(true);

    async function loadOptions() {
      try {
        const token = getSession()?.token;
        if (!token) return;

        const res = await request<TaskOptionsResponse>(
          ENDPOINTS.tasks.options,
          { token },
        );

        if (!cancelled && res) {
          if (res.users) {
            const activeUsers = res.users.filter(u => u.isActive !== false && u.name);
            setUsers(activeUsers);

            if (!isEdit && !assignedTo) {
              const defaultUser =
                activeUsers.find(u => u.id === currentUserId || u.name === currentUserName) ||
                activeUsers[0];
              if (defaultUser) {
                setAssignedTo(defaultUser.name);
                setAssignedToId(defaultUser.id);
              }
            }
          }

          if (res.leads) setLeads(res.leads);
          if (res.deals) setDeals(res.deals);

          if (res.statuses && res.statuses.length > 0) {
            setStatuses(res.statuses);
            if (!isEdit && !values?.status) {
              setStatus(res.statuses[0]);
            }
          }

          if (res.priorities && res.priorities.length > 0) {
            setPriorities(res.priorities);
            if (!isEdit && !values?.priority) {
              const defaultPriority = res.priorities.find(p => p === "MEDIUM") || res.priorities[0];
              setPriority(defaultPriority);
            }
          }

          if (res.cancelReasons && res.cancelReasons.length > 0) {
            setCancelReasons(res.cancelReasons);
            if (!cancelReason) {
              setCancelReason(res.cancelReasons[0].name);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Could not load dynamic task options from backend:", err);
          setBackendError("Could not load task options from backend. Please refresh the page.");
        }
      } finally {
        if (!cancelled) setIsLoadingOptions(false);
      }
    }

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [isEdit, assignedTo, currentUserId, currentUserName, values, cancelReason]);

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function setQuickDue(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setDueAt(date.toISOString().slice(0, 10));
  }

  // Validation rules
  const trimmedTitle = title.trim();
  const titleInvalid = trimmedTitle.length < 3;
  const dueInvalid = !dueAt;
  const statusInvalid = !status;
  const priorityInvalid = !priority;

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setShowErrors(true);
    setBackendError(null);

    if (titleInvalid || dueInvalid || statusInvalid || priorityInvalid) return;

    setIsSubmitting(true);
    try {
      const isCompleted = status === "COMPLETED";
      const isCancelled = status === "CANCELLED";

      const selectedUser = users.find(u => u.name === assignedTo);
      const finalAssignedToId = assignedToId ?? selectedUser?.id;

      await onSubmit({
        title: trimmedTitle,
        description: description.trim(),
        assignedTo,
        assignedToId: finalAssignedToId,
        dueAt,
        priority: priority as Priority,
        status: status as TaskStatus,
        completedAt: isCompleted ? completedAt || todayIso() : "",
        completedBy: isCompleted ? completedBy || assignedTo : "",
        completionNote: isCompleted ? completionNote.trim() : "",
        cancelReason: isCancelled ? cancelReason : "",
        lead: linkType === "lead" ? leadName : "",
        leadId: linkType === "lead" ? leadId : null,
        deal: linkType === "deal" ? dealName : "",
        dealId: linkType === "deal" ? dealId : null,
        customer: "",
        customerId: null,
        company: "",
        companyId: null,
        meeting: "",
        meetingId: null,
      });
    } catch (err) {
      setBackendError(err instanceof Error ? err.message : "Failed to save task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const duePreview = formatPreviewDate(dueAt);
  const selectedStatusConfig = getStatusMeta(status);
  const selectedPriorityConfig = getPriorityMeta(priority);

  const assigneeInitials =
    assignedTo
      ? assignedTo
          .split(" ")
          .map(part => part[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "--";

  return (
    <div className="space-y-6 pb-16 animate-in fade-in-50 duration-200">
      {/* Top Header matching Leads page */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            title="Back to tasks list (Esc)"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Tasks</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-semibold text-[#1d61e7]">
                {isEdit ? "Edit Task" : "Create Task"}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {isEdit ? `Edit Task: ${trimmedTitle || "Untitled"}` : "Create Task"}
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
              {isEdit
                ? "Update task details, deadline, priority, and assignees."
                : "Assign a new task with a deadline, priority, and connection to CRM records."}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            <X size={15} className="text-slate-500" />
            Cancel
          </button>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || isLoadingOptions}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1d61e7] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>{isEdit ? "Saving..." : "Creating Task..."}</span>
              </>
            ) : (
              <>
                {isEdit ? <Save size={15} /> : <Plus size={15} />}
                <span>{isEdit ? "Save Changes" : "Save Task"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Backend Error Banner */}
      {backendError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 shadow-2xs flex items-start gap-3">
          <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-rose-900">Submission Error</p>
            <p>{backendError}</p>
          </div>
        </div>
      )}

      {/* Form Validation Banner */}
      {showErrors && (titleInvalid || dueInvalid || statusInvalid || priorityInvalid) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-900 shadow-2xs flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-950 mb-1">Please correct the following fields:</p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-900 font-normal">
              {titleInvalid && <li>Task Title must be at least 3 characters long.</li>}
              {dueInvalid && <li>Due Date is required.</li>}
              {statusInvalid && <li>Task Status is required.</li>}
              {priorityInvalid && <li>Task Priority is required.</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Main Grid: Left 2 Columns for Form, Right 1 Column for Live Data Summary */}
      <form onSubmit={e => void handleSubmit(e)} className="grid grid-cols-1 lg:grid-cols-3 gap-6" noValidate>
        {/* Left Form Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 1: Task Information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1d61e7]">
                <CheckSquare size={19} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">1. Task Information</h2>
                <p className="text-xs text-slate-500">What needs to be done, deadlines, and instructions.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Follow up with prospect regarding custom quote"
                  className={`w-full rounded-xl border bg-white py-2.5 px-3.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 ${
                    showErrors && titleInvalid ? "border-rose-300 bg-rose-50/20" : "border-slate-200"
                  }`}
                />
                {showErrors && titleInvalid && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">Please enter a task title (at least 3 characters).</p>
                )}
              </div>

              {/* Due Date & Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-800">
                      Due Date <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <Calendar size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      min={todayIso()}
                      value={dueAt}
                      onChange={e => setDueAt(e.target.value)}
                      className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-3.5 text-xs text-slate-900 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer ${
                        showErrors && dueInvalid ? "border-rose-300 bg-rose-50/20" : "border-slate-200"
                      }`}
                    />
                  </div>
                  {showErrors && dueInvalid && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">Please specify a due deadline.</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Quick Due Presets
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuickDue(0)}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 text-center text-xs font-semibold text-slate-700 hover:bg-white hover:border-slate-300 transition cursor-pointer shadow-2xs"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDue(1)}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 text-center text-xs font-semibold text-slate-700 hover:bg-white hover:border-slate-300 transition cursor-pointer shadow-2xs"
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDue(3)}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 text-center text-xs font-semibold text-slate-700 hover:bg-white hover:border-slate-300 transition cursor-pointer shadow-2xs"
                    >
                      +3 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDue(7)}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 text-center text-xs font-semibold text-slate-700 hover:bg-white hover:border-slate-300 transition cursor-pointer shadow-2xs"
                    >
                      +1 Week
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Description & Instructions
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Add background context, links, client requests, or actionable checklist for this task..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 resize-y"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Connected CRM Entity */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Handshake size={19} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">2. Connected CRM Record</h2>
                <p className="text-xs text-slate-500">Optionally associate this task with an active Lead or Deal from the backend.</p>
              </div>
            </div>

            {/* Segmented Switcher */}
            <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200 max-w-md">
              <button
                type="button"
                onClick={() => {
                  setLinkType("none");
                  setLeadId(null);
                  setLeadName("");
                  setDealId(null);
                  setDealName("");
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                  linkType === "none"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Standalone</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLinkType("lead");
                  setDealId(null);
                  setDealName("");
                  if (!leadId && leads.length > 0) {
                    setLeadId(leads[0].id);
                    setLeadName(leads[0].contactName);
                  }
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                  linkType === "lead"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Connected Lead</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLinkType("deal");
                  setLeadId(null);
                  setLeadName("");
                  if (!dealId && deals.length > 0) {
                    setDealId(deals[0].id);
                    setDealName(deals[0].name);
                  }
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                  linkType === "deal"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Connected Deal</span>
              </button>
            </div>

            {linkType === "lead" && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5 max-w-md">
                  <label className="block text-xs font-semibold text-slate-800">
                    Select Associated Lead <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500">{leads.length} available</span>
                </div>
                <select
                  value={leadId ?? ""}
                  onChange={e => {
                    const id = Number(e.target.value);
                    const match = leads.find(l => l.id === id);
                    setLeadId(id || null);
                    setLeadName(match ? match.contactName : "");
                  }}
                  className="w-full max-w-md rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="">Select a lead...</option>
                  {isLoadingOptions && <option value="">Loading leads from backend...</option>}
                  {!isLoadingOptions && leads.length === 0 && (
                    <option value="">No active leads found in backend</option>
                  )}
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.contactName} {l.companyName ? `(${l.companyName})` : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">Activities on this task will be logged to this prospect.</p>
              </div>
            )}

            {linkType === "deal" && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5 max-w-md">
                  <label className="block text-xs font-semibold text-slate-800">
                    Select Associated Deal <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500">{deals.length} available</span>
                </div>
                <select
                  value={dealId ?? ""}
                  onChange={e => {
                    const id = Number(e.target.value);
                    const match = deals.find(d => d.id === id);
                    setDealId(id || null);
                    setDealName(match ? match.name : "");
                  }}
                  className="w-full max-w-md rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="">Select an active deal...</option>
                  {isLoadingOptions && <option value="">Loading deals from backend...</option>}
                  {!isLoadingOptions && deals.length === 0 && (
                    <option value="">No active deals found in backend</option>
                  )}
                  {deals.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">Task will be displayed on the deal pipeline card.</p>
              </div>
            )}
          </div>

          {/* SECTION 3: Completion & Resolution Details (When status is COMPLETED or CANCELLED) */}
          {status === "COMPLETED" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={19} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">3. Completion Details</h2>
                  <p className="text-xs text-slate-500">Record when the task was finished and key outcomes.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Completed Date
                  </label>
                  <input
                    type="date"
                    value={completedAt || todayIso()}
                    onChange={e => setCompletedAt(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-xs text-slate-900 outline-none transition focus:border-[#1d61e7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Completed By
                  </label>
                  <input
                    type="text"
                    value={completedBy || assignedTo}
                    onChange={e => setCompletedBy(e.target.value)}
                    placeholder="Team member name"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-xs text-slate-900 outline-none transition focus:border-[#1d61e7]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Outcome Summary / Notes
                  </label>
                  <textarea
                    value={completionNote}
                    onChange={e => setCompletionNote(e.target.value)}
                    rows={2}
                    placeholder="Outcome of the call, meeting takeaways, or next steps agreed..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-900 outline-none transition focus:border-[#1d61e7] resize-y"
                  />
                </div>
              </div>
            </div>
          )}

          {status === "CANCELLED" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <XCircle size={19} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">3. Cancellation Reason</h2>
                  <p className="text-xs text-slate-500">Select why this task is no longer being pursued.</p>
                </div>
              </div>

              {isLoadingOptions && (
                <p className="text-xs text-slate-500 italic">Loading cancellation reasons from backend...</p>
              )}
              {!isLoadingOptions && cancelReasons.length === 0 && (
                <p className="text-xs text-slate-500 italic">No cancellation reasons found in backend</p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {cancelReasons.map(r => {
                  const isSelected = cancelReason === r.name;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setCancelReason(r.name)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                        isSelected
                          ? "border-rose-600 bg-rose-50 text-rose-900 shadow-2xs font-bold"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {r.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Column: Status, Priority, Assignee & Live Card Preview */}
        <div className="space-y-6">
          {/* SECTION A: Status & Urgency Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <UserCheck size={19} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Status & Urgency</h2>
                <p className="text-xs text-slate-500">Progress stage and priority level from backend.</p>
              </div>
            </div>

            {/* Task Status Grid (Dynamically rendered from backend options) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Task Status <span className="text-rose-500">*</span>
                </label>
                {isLoadingOptions && <span className="text-[10px] text-slate-400">Loading...</span>}
              </div>

              {isLoadingOptions && statuses.length === 0 && (
                <div className="p-3 text-center text-xs text-slate-500 rounded-xl border border-slate-200 bg-slate-50">
                  Loading statuses from backend...
                </div>
              )}
              {!isLoadingOptions && statuses.length === 0 && (
                <div className="p-3 text-center text-xs text-slate-500 rounded-xl border border-slate-200 bg-slate-50">
                  No status options returned by backend
                </div>
              )}

              {statuses.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {statuses.map(s => {
                    const isSelected = status === s;
                    const meta = getStatusMeta(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? `${meta.badgeClass} ring-2 ring-blue-500/20`
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} />
                          <span>{meta.label}</span>
                        </div>
                        {isSelected && <Check size={14} className="text-slate-950 font-bold" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Priority Selector (Dynamically rendered from backend options) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Priority <span className="text-rose-500">*</span>
                </label>
                {isLoadingOptions && <span className="text-[10px] text-slate-400">Loading...</span>}
              </div>

              {isLoadingOptions && priorities.length === 0 && (
                <div className="p-3 text-center text-xs text-slate-500 rounded-xl border border-slate-200 bg-slate-50">
                  Loading priorities from backend...
                </div>
              )}
              {!isLoadingOptions && priorities.length === 0 && (
                <div className="p-3 text-center text-xs text-slate-500 rounded-xl border border-slate-200 bg-slate-50">
                  No priority options returned by backend
                </div>
              )}

              {priorities.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-1">
                  {priorities.map(p => {
                    const isSelected = priority === p;
                    const meta = getPriorityMeta(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? "bg-white text-slate-950 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                        <span>{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Assignee Selector (Dynamically rendered from backend options) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Assigned Team Member
                </label>
                <span className="text-[11px] text-slate-500">{users.length} available</span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                {isLoadingOptions && (
                  <p className="text-xs text-slate-500 py-3 text-center">Loading team members from backend...</p>
                )}
                {!isLoadingOptions && users.length === 0 && (
                  <p className="text-xs text-slate-500 py-3 text-center italic">No team members found in backend</p>
                )}
                {users.map(u => {
                  const isSelected = assignedTo === u.name;
                  const uInitials = u.name
                    .split(" ")
                    .map(part => part[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "US";

                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        setAssignedTo(u.name);
                        setAssignedToId(u.id);
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition cursor-pointer select-none ${
                        isSelected
                          ? "border-[#1d61e7] bg-blue-50/40 ring-1 ring-blue-500/20"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-800">
                          {uInitials}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-none">{u.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{u.email}</p>
                        </div>
                      </div>
                      {isSelected && <Check size={14} className="text-[#1d61e7] font-bold" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION C: Real-time Live Task Card Preview */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock size={16} className="text-[#1d61e7]" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Live Task Card Preview
              </h3>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3.5 shadow-2xs">
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2">
                {status ? (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] uppercase tracking-wide border ${selectedStatusConfig.badgeClass}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${selectedStatusConfig.dotClass}`} />
                    {selectedStatusConfig.label}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">No status</span>
                )}

                {priority ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-900">
                    <span className={`h-2 w-2 rounded-full ${selectedPriorityConfig.dotClass}`} />
                    {selectedPriorityConfig.label}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">No priority</span>
                )}
              </div>

              {/* Title & Description */}
              <div>
                <p className="text-sm font-bold text-slate-950 leading-snug">
                  {trimmedTitle || <span className="text-slate-400 italic font-normal">Task Title Preview...</span>}
                </p>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                  {description.trim() || <span className="text-slate-400 italic">No description provided yet.</span>}
                </p>
              </div>

              {/* Related Record Badge */}
              {linkType !== "none" && (leadName || dealName) && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/70 px-2.5 py-1 text-[11px] font-bold text-purple-900">
                  <Layers size={12} className="text-purple-600" />
                  <span>
                    {linkType === "lead" ? `Lead: ${leadName}` : `Deal: ${dealName}`}
                  </span>
                </div>
              )}

              {/* Footer Meta */}
              <div className="flex items-center justify-between border-t border-slate-200/80 pt-3 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-800">
                    {assigneeInitials}
                  </div>
                  <span>{assignedTo || "Unassigned"}</span>
                </div>

                <div className={`flex items-center gap-1 text-[11px] font-bold ${duePreview.isOverdue ? "text-rose-600" : "text-slate-800"}`}>
                  <CalendarClock size={13} className={duePreview.isOverdue ? "text-rose-600" : "text-slate-600"} />
                  <span>{duePreview.label}</span>
                </div>
              </div>
            </div>

            {/* Validation Checklist matching CreateLead */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-800 mb-2">Requirements Status</p>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {!titleInvalid ? (
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span className={!titleInvalid ? "text-slate-900 font-medium" : "text-slate-500"}>
                    Task Title (min 3 chars)
                  </span>
                </div>
                {titleInvalid && <span className="text-[10px] text-rose-600 font-semibold">Required</span>}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {!dueInvalid ? (
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span className={!dueInvalid ? "text-slate-900 font-medium" : "text-slate-500"}>
                    Due Deadline specified
                  </span>
                </div>
                {dueInvalid && <span className="text-[10px] text-rose-600 font-semibold">Required</span>}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {!statusInvalid ? (
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span className={!statusInvalid ? "text-slate-900 font-medium" : "text-slate-500"}>
                    Task Status confirmed
                  </span>
                </div>
                {statusInvalid && <span className="text-[10px] text-rose-600 font-semibold">Required</span>}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {!priorityInvalid ? (
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span className={!priorityInvalid ? "text-slate-900 font-medium" : "text-slate-500"}>
                    Task Priority confirmed
                  </span>
                </div>
                {priorityInvalid && <span className="text-[10px] text-rose-600 font-semibold">Required</span>}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {assignedTo ? (
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span className={assignedTo ? "text-slate-900 font-medium" : "text-slate-500"}>
                    Assignee designated
                  </span>
                </div>
                {!assignedTo && <span className="text-[10px] text-amber-600 font-semibold">Recommended</span>}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
