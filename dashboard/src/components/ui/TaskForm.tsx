import { useEffect, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  Handshake,
  XCircle,
} from "lucide-react";
import type { Priority, TaskFormValues, TaskStatus } from "../../types/task";
import {
  TASK_CANCEL_REASONS,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "../../types/task";
import type { TaskFormProps } from "../../types/taskForm";
import { cellClass } from "../../types/formControls";
import {
  Field,
  FormSection,
  FormShell,
  SelectField,
  TextAreaField,
} from "./FormControls";
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

const emptyValues: TaskFormValues = {
  title: "",
  description: "",
  assignedTo: "",
  dueAt: "",
  priority: "MEDIUM",
  status: "OPEN",
  completedAt: "",
  completedBy: "",
  completionNote: "",
  cancelReason: "",
  lead: "",
  deal: "",
  customer: "",
  company: "",
  meeting: "",
};


/** Human labels for the enum selects, so the UI isn't shouting raw values. */
const STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

/** Map a label back to its enum value (selects deal in strings). */
function statusFromLabel(label: string): TaskStatus {
  const found = TASK_STATUSES.find(status => STATUS_LABELS[status] === label);
  return found ?? "OPEN";
}
function priorityFromLabel(label: string): Priority {
  const found = TASK_PRIORITIES.find(item => PRIORITY_LABELS[item] === label);
  return found ?? "MEDIUM";
}

/** Today's ISO day, used to default the completion date. */
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Full-page create/edit form for a task.
 *
 * Maps onto the backend `Task` model. Completion fields (completedAt,
 * completedBy, completionNote) appear only when status = COMPLETED, and the
 * cancel reason only when status = CANCELLED — matching the schema's rule that
 * those columns are set only in that state.
 *
 * The five related-record selects map to the optional Task.*Id relations.
 * No meeting options are offered because no meetings exist yet; the field is
 * kept in the type so wiring it later needs no shape change.
 */
export default function TaskForm({
  mode,
  values,
  onClose,
  onSubmit,
}: TaskFormProps) {
  const initialValues: TaskFormValues = values ?? emptyValues;
  const [form, setForm] = useState<TaskFormValues>(initialValues);
  const [showErrors, setShowErrors] = useState(false);
  const [options, setOptions] = useState<TaskOptionsResponse | null>(null);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");

  const isEdit = mode === "edit";

  // Load task options (users, leads, deals, priorities, statuses) from the backend.
  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setLoadingOptions(true);
      setOptionsError("");

      try {
        const token = getSession()?.token;
        if (!token) {
          throw new Error("Your session has expired. Please sign in again.");
        }

        const res = await request<TaskOptionsResponse>(
          ENDPOINTS.tasks.options,
          { token },
        );

        if (!cancelled && res) {
          setOptions(res);
          const activeUsers = (res.users ?? []).filter(
            (user) => user.isActive !== false && Number.isFinite(user.id) && user.name,
          );
          setUsers(activeUsers);
          if (activeUsers.length === 0) {
            setOptionsError("No active users are available to assign.");
          }
        }
      } catch (error) {
        if (!cancelled) {
          setOptionsError(
            error instanceof Error ? error.message : "Unable to load task options.",
          );
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  // For a new task, select the first active user by default once users load.
  // Existing edit values are preserved.
  useEffect(() => {
    if (isEdit || users.length === 0) return;

    const userNames = users.map((user) => user.name);
    setForm((previous) => ({
      ...previous,
      assignedTo: userNames.includes(previous.assignedTo)
        ? previous.assignedTo
        : users[0].name,
      assignedToId: users.find((u) => u.name === previous.assignedTo)?.id ?? users[0].id,
      completedBy: userNames.includes(previous.completedBy)
        ? previous.completedBy
        : users[0].name,
    }));
  }, [isEdit, users]);

  const dirty = (Object.keys(initialValues) as (keyof TaskFormValues)[]).some(
    key => form[key] !== initialValues[key],
  );

  function update<K extends keyof TaskFormValues>(
    key: K,
    value: TaskFormValues[K],
  ) {
    setForm(previous => ({ ...previous, [key]: value }));
  }

  // Esc closes the form (same as the cancel button)
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const leads = options?.leads ?? [];
  const deals = options?.deals ?? [];

  const leadOptions = [
    "None",
    ...leads.map((l) =>
      l.companyName ? `${l.contactName} (${l.companyName})` : l.contactName,
    ),
  ];
  const dealOptions = ["None", ...deals.map((d) => d.name)];

  function handleLeadChange(label: string) {
    if (label === "None" || !label) {
      setForm((prev) => ({ ...prev, lead: "", leadId: null }));
    } else {
      const match = leads.find(
        (l) =>
          (l.companyName ? `${l.contactName} (${l.companyName})` : l.contactName) ===
          label,
      );
      setForm((prev) => ({
        ...prev,
        lead: label,
        leadId: match ? match.id : null,
        deal: "",
        dealId: null,
      }));
    }
  }

  function handleDealChange(label: string) {
    if (label === "None" || !label) {
      setForm((prev) => ({ ...prev, deal: "", dealId: null }));
    } else {
      const match = deals.find((d) => d.name === label);
      setForm((prev) => ({
        ...prev,
        deal: label,
        dealId: match ? match.id : null,
        lead: "",
        leadId: null,
      }));
    }
  }

  const title = form.title.trim();
  const titleInvalid = !title;
  const dueInvalid = !form.dueAt;
  const errorMessage = titleInvalid
    ? "Please enter the task title before saving."
    : dueInvalid
      ? "Please set a due date before saving."
      : "";

  function submit() {
   
    setShowErrors(true);
    if (titleInvalid || dueInvalid) return;

    // Status-dependent fields are cleared when they don't apply, so a task
    // never carries a completion note while cancelled (or vice versa).
    const isCompleted = form.status === "COMPLETED";
    const isCancelled = form.status === "CANCELLED";

    const selectedUser = users.find((u) => u.name === form.assignedTo);
    const assignedToId = form.assignedToId ?? selectedUser?.id;

    onSubmit({
      title,
      description: form.description.trim(),
      assignedTo: form.assignedTo,
      assignedToId,
      dueAt: form.dueAt,
      priority: form.priority,
      status: form.status,
      completedAt: isCompleted ? form.completedAt || todayIso() : "",
      completedBy: isCompleted ? form.completedBy : "",
      completionNote: isCompleted ? form.completionNote.trim() : "",
      cancelReason: isCancelled ? form.cancelReason : "",
      lead: form.lead,
      leadId: form.leadId ?? null,
      deal: form.deal,
      dealId: form.dealId ?? null,
      customer: "",
      customerId: null,
      company: "",
      companyId: null,
      meeting: "",
      meetingId: null,
    });
  }

  return (
    <FormShell
      title={isEdit ? "Edit Task" : "Create Task"}
      description={
        isEdit
          ? "Update this task's details, status, and assignment."
          : "Assign a task with a due date and priority."
      }
      error={errorMessage}
      dirty={dirty}
      onClose={onClose}
      onSubmit={submit}
    >
      {/* Maps to: Task (title, description, assignedToId, dueAt, priority, status) */}
      <FormSection
        icon={<CheckSquare size={17} />}
        title="Task Information"
        description="What needs doing, and by when."
        aside="* Required fields"
      >
        <div className={cellClass}>
          <Field
            label="Title"
            value={form.title}
            onChange={value => update("title", value)}
            required
            placeholder="e.g. Call Christopher about the rollout"
            invalid={showErrors && titleInvalid}
            hint="Task title is required."
          />
        </div>
        <div className={cellClass}>
          <Field
            label="Due At"
            value={form.dueAt}
            onChange={value => update("dueAt", value)}
            type="date"
            required
            invalid={showErrors && dueInvalid}
            hint="A due date is required."
          />
        </div>
        <div className={cellClass}>
          <SelectField
            label="Assignee"
            value={form.assignedTo}
            onChange={(value) => {
              const matched = users.find((u) => u.name === value);
              setForm((prev) => ({
                ...prev,
                assignedTo: value,
                assignedToId: matched?.id ?? prev.assignedToId,
              }));
            }}
            options={users.map((user) => user.name)}
          />
          {loadingOptions && (
            <p className="mt-1 text-xs text-slate-500">Loading assignees…</p>
          )}
          {!loadingOptions && optionsError && (
            <p className="mt-1 text-xs text-red-600">{optionsError}</p>
          )}
        </div>
        <div className={cellClass}>
          <SelectField
            label="Priority"
            value={PRIORITY_LABELS[form.priority]}
            onChange={value => update("priority", priorityFromLabel(value))}
            options={TASK_PRIORITIES.map(item => PRIORITY_LABELS[item])}
          />
        </div>
        <div className={cellClass}>
          <SelectField
            label="Status"
            value={STATUS_LABELS[form.status]}
            onChange={value => update("status", statusFromLabel(value))}
            options={TASK_STATUSES.map(status => STATUS_LABELS[status])}
          />
        </div>
        <div className={cellClass}>
          <TextAreaField
            label="Description"
            value={form.description}
            onChange={value => update("description", value)}
            placeholder="Any detail the assignee needs."
            rows={2}
          />
        </div>
      </FormSection>

      {/* Maps to: Task.leadId / dealId */}
      <FormSection
        icon={<Handshake size={17} />}
        title="Related To"
        description="Optionally link this task to a Lead or Deal. Leave as None for a standalone task."
      >
        <div className={cellClass}>
          <SelectField
            label="Lead"
            value={form.lead || "None"}
            onChange={handleLeadChange}
            options={leadOptions}
          />
        </div>
        <div className={cellClass}>
          <SelectField
            label="Deal"
            value={form.deal || "None"}
            onChange={handleDealChange}
            options={dealOptions}
          />
        </div>
      </FormSection>

      {/* Maps to: Task.completedAt / completedById / completionNote — only when COMPLETED */}
      {form.status === "COMPLETED" && (
        <FormSection
          icon={<CheckCircle2 size={17} />}
          title="Completion"
          description="Recorded because this task is marked Completed."
        >
          <div className={cellClass}>
            <Field
              label="Completed At"
              value={form.completedAt}
              onChange={value => update("completedAt", value)}
              type="date"
            />
          </div>
          <div className={cellClass}>
            <SelectField
              label="Completed By"
              value={form.completedBy}
              onChange={value => update("completedBy", value)}
              options={users.map((user) => user.name)}
            />
          </div>
          <div className={cellClass}>
            <TextAreaField
              label="Completion Note"
              value={form.completionNote}
              onChange={value => update("completionNote", value)}
              placeholder="What was the outcome?"
              rows={2}
            />
          </div>
        </FormSection>
      )}

      {/* Maps to: Task.cancelReasonId -> Reason (type TASK_CANCELLED) — only when CANCELLED */}
      {form.status === "CANCELLED" && (
        <FormSection
          icon={<XCircle size={17} />}
          title="Cancellation"
          description="Recorded because this task is marked Cancelled."
        >
          <div className={cellClass}>
            <SelectField
              label="Cancel Reason"
              value={form.cancelReason}
              onChange={value => update("cancelReason", value)}
              options={TASK_CANCEL_REASONS}
            />
          </div>
        </FormSection>
      )}

      {/* Read-only note about what the due date drives */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <CalendarClock size={17} />
          </div>
          <p className="text-xs text-slate-500">
            The due date drives the Overdue, Due today, and Upcoming filters on
            the tasks list.
          </p>
        </div>
      </section>
    </FormShell>
  );
}
