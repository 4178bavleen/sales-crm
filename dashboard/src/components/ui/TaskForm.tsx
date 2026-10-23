import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Handshake,
  Plus,
  User,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import type { Priority, TaskStatus } from "../../types/task";
import { TASK_CANCEL_REASONS } from "../../types/task";
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

type TaskOptionsResponse = {
  users: ApiUser[];
  leads: ApiLeadOption[];
  deals: ApiDealOption[];
  priorities: Priority[];
  statuses: TaskStatus[];
};

const STATUS_CONFIG: {
  value: TaskStatus;
  label: string;
  badgeClass: string;
  dotClass: string;
}[] = [
  {
    value: "OPEN",
    label: "Open",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200 hover:border-sky-300",
    dotClass: "bg-sky-600",
  },
  {
    value: "IN_PROGRESS",
    label: "In Progress",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300",
    dotClass: "bg-amber-600",
  },
  {
    value: "COMPLETED",
    label: "Completed",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300",
    dotClass: "bg-emerald-600",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300",
    dotClass: "bg-slate-500",
  },
];

const PRIORITY_CONFIG: {
  value: Priority;
  label: string;
  dotClass: string;
}[] = [
  { value: "LOW", label: "Low", dotClass: "bg-slate-400" },
  { value: "MEDIUM", label: "Medium", dotClass: "bg-blue-500" },
  { value: "HIGH", label: "High", dotClass: "bg-amber-500" },
  { value: "URGENT", label: "Urgent", dotClass: "bg-rose-500" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function TaskForm({
  mode,
  values,
  onClose,
  onSubmit,
}: TaskFormProps) {
  const isEdit = mode === "edit";

  const [title, setTitle] = useState(values?.title ?? "");
  const [description, setDescription] = useState(values?.description ?? "");
  const [dueAt, setDueAt] = useState(values?.dueAt ?? "");
  const [priority, setPriority] = useState<Priority>(values?.priority ?? "MEDIUM");
  const [status, setStatus] = useState<TaskStatus>(values?.status ?? "OPEN");
  const [assignedTo, setAssignedTo] = useState(values?.assignedTo ?? "");
  const [assignedToId, setAssignedToId] = useState<number | undefined>(values?.assignedToId);

  // Link state
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

  const [options, setOptions] = useState<TaskOptionsResponse | null>(null);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Load task options from backend
  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        const token = getSession()?.token;
        if (!token) return;

        const res = await request<TaskOptionsResponse>(
          ENDPOINTS.tasks.options,
          { token },
        );

        if (!cancelled && res) {
          setOptions(res);
          const activeUsers = (res.users ?? []).filter(
            u => u.isActive !== false && u.name,
          );
          setUsers(activeUsers);

          // Default assignee if creating
          if (!isEdit && activeUsers.length > 0 && !assignedTo) {
            setAssignedTo(activeUsers[0].name);
            setAssignedToId(activeUsers[0].id);
          }
        }
      } catch (err) {
        console.warn("Could not load task options:", err);
      }
    }

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [isEdit, assignedTo]);

  // Close on Escape
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

  // Validation
  const trimmedTitle = title.trim();
  const titleInvalid = !trimmedTitle;
  const dueInvalid = !dueAt;

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setShowErrors(true);
    setBackendError(null);

    if (titleInvalid || dueInvalid) return;

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
        priority,
        status,
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
      setBackendError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setIsSubmitting(false);
    }
  }

  const leads = options?.leads ?? [];
  const deals = options?.deals ?? [];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-200">
      {/* Top Header matching Leads page */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            title="Back to tasks list"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Tasks</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-medium text-[#1d61e7]">
                {isEdit ? "Edit Task" : "Create Task"}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {isEdit ? "Edit Task" : "Create Task"}
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              {isEdit
                ? "Update task details, schedule, priority, and assignments"
                : "Assign a new task with a due date, priority, and link to a lead or deal"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            <X size={14} className="text-slate-500" />
            Cancel
          </button>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
          >
            <Plus size={15} />
            {isSubmitting
              ? isEdit
                ? "Saving..."
                : "Creating Task..."
              : isEdit
                ? "Save Changes"
                : "Create Task"}
          </button>
        </div>
      </div>

      {backendError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 shadow-2xs">
          <p className="font-semibold">{backendError}</p>
        </div>
      )}

      {showErrors && (titleInvalid || dueInvalid) && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 shadow-2xs">
          <p className="font-semibold mb-1">Please correct the following before saving:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {titleInvalid && <li>Task title is required.</li>}
            {dueInvalid && <li>A due date is required.</li>}
          </ul>
        </div>
      )}

      {/* Main Form Grid */}
      <form onSubmit={e => void handleSubmit(e)} className="grid grid-cols-1 lg:grid-cols-3 gap-6" noValidate>
        {/* Left 2 Columns: Task Details, Related Record, Completion */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Information Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1d61e7]">
                <CheckSquare size={19} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Task Information</h2>
                <p className="text-xs text-slate-500">What needs doing, deadline, and instructions</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Follow up with Marcus regarding pricing proposal"
                  className={`w-full rounded-lg border bg-white py-2 px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 ${
                    showErrors && titleInvalid ? "border-rose-300 bg-rose-50/20" : "border-slate-200"
                  }`}
                />
              </div>

              {/* Due Date & Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Due Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      min={todayIso()}
                      value={dueAt}
                      onChange={e => setDueAt(e.target.value)}
                      className={`w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 ${
                        showErrors && dueInvalid ? "border-rose-300 bg-rose-50/20" : "border-slate-200"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Quick Due Presets
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuickDue(0)}
                      className="rounded-lg border border-slate-200 bg-white py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDue(1)}
                      className="rounded-lg border border-slate-200 bg-white py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDue(3)}
                      className="rounded-lg border border-slate-200 bg-white py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      +3 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDue(7)}
                      className="rounded-lg border border-slate-200 bg-white py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      +1 Week
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Description & Notes
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Add background details, key action items, links, or instructions for the assignee..."
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 resize-y"
                />
              </div>
            </div>
          </div>

          {/* Related Record Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Handshake size={19} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Related Record</h2>
                <p className="text-xs text-slate-500">Optionally connect this task to a Lead or Deal</p>
              </div>
            </div>

            {/* Segmented control for link type */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setLinkType("none");
                  setLeadId(null);
                  setLeadName("");
                  setDealId(null);
                  setDealName("");
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  linkType === "none"
                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Standalone (None)
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
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  linkType === "lead"
                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Lead
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
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  linkType === "deal"
                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Deal
              </button>
            </div>

            {linkType === "lead" && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Select Lead
                </label>
                <select
                  value={leadId ?? ""}
                  onChange={e => {
                    const id = Number(e.target.value);
                    const match = leads.find(l => l.id === id);
                    setLeadId(id || null);
                    setLeadName(match ? match.contactName : "");
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="">Select a lead...</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.contactName} {l.companyName ? `(${l.companyName})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {linkType === "deal" && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Select Deal
                </label>
                <select
                  value={dealId ?? ""}
                  onChange={e => {
                    const id = Number(e.target.value);
                    const match = deals.find(d => d.id === id);
                    setDealId(id || null);
                    setDealName(match ? match.name : "");
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="">Select a deal...</option>
                  {deals.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Completion Details (Only when status is COMPLETED) */}
          {status === "COMPLETED" && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={19} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Completion Details</h2>
                  <p className="text-xs text-slate-500">Record when the task was finished and outcome notes</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Completed Date
                  </label>
                  <input
                    type="date"
                    value={completedAt || todayIso()}
                    onChange={e => setCompletedAt(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Completed By
                  </label>
                  <input
                    type="text"
                    value={completedBy || assignedTo}
                    onChange={e => setCompletedBy(e.target.value)}
                    placeholder="User name"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Completion Outcome / Note
                  </label>
                  <textarea
                    value={completionNote}
                    onChange={e => setCompletionNote(e.target.value)}
                    rows={2}
                    placeholder="Summary of results or final outcome..."
                    className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] resize-y"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Cancellation Details (Only when status is CANCELLED) */}
          {status === "CANCELLED" && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <XCircle size={19} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Cancellation Reason</h2>
                  <p className="text-xs text-slate-500">Provide the reason for cancelling this task</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {TASK_CANCEL_REASONS.map(reason => {
                  const isSelected = cancelReason === reason;
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setCancelReason(reason)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                        isSelected
                          ? "border-rose-600 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {reason}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Column: Status, Priority, Assignee & Live Preview */}
        <div className="space-y-6">
          {/* Status & Priority Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <UserCheck size={19} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Status & Priority</h2>
                <p className="text-xs text-slate-500">Progress and urgency level</p>
              </div>
            </div>

            {/* Status Selectable Pills */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Task Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_CONFIG.map(item => {
                  const isSelected = status === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setStatus(item.value)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? `${item.badgeClass} ring-2 ring-blue-500/20 font-bold`
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${item.dotClass}`} />
                        <span>{item.label}</span>
                      </div>
                      {isSelected && <Check size={13} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Priority
              </label>
              <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-slate-200 bg-slate-50/70 p-1">
                {PRIORITY_CONFIG.map(p => {
                  const isSelected = priority === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${p.dotClass}`} />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assignee Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Task Assigned To:
              </label>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                {users.map(u => {
                  const isSelected = assignedTo === u.name;
                  const initials = u.name
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
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border transition cursor-pointer select-none ${
                        isSelected
                          ? "border-[#1d61e7] bg-blue-50/30"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                          {initials}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-800 leading-none">{u.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{u.email}</p>
                        </div>
                      </div>
                      {isSelected && <Check size={14} className="text-[#1d61e7]" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Clock size={14} />
              <span>Live Card Preview</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {trimmedTitle || "Task Title Preview"}
                </p>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                    STATUS_CONFIG.find(s => s.value === status)?.badgeClass ?? "bg-slate-100 text-slate-700"
                  }`}
                >
                  {STATUS_CONFIG.find(s => s.value === status)?.label ?? status}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 line-clamp-2">
                {description.trim() || "No description provided."}
              </p>

              <div className="flex items-center justify-between border-t border-slate-200/60 pt-2.5 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <User size={12} className="text-slate-400" />
                  {assignedTo || "Unassigned"}
                </span>
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <CalendarClock size={12} className="text-slate-400" />
                  {dueAt || "No date set"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
