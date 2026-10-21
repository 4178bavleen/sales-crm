import { X, CheckSquare } from "lucide-react";
import type { TaskDetailDialogProps } from "../../types/taskUi";
import {
  dueLabel,
  dueStyles,
  priorityLabels,
  priorityStyles,
  taskDetailFields,
  taskStatusLabels,
  taskStatusStyles,
} from "../../data/taskColumns";

/**
 * Centered modal showing a single task's details.
 * Tasks are read-only here; closing (Esc, backdrop, close button) is handled by
 * the parent.
 *
 * Completion fields (Completed At/By/Note) and the cancel reason are filtered
 * by `onlyFor`, matching the schema's rule that those columns are only set in
 * that status.
 */
export default function TaskDetailDialog({
  task,
  onClose,
}: TaskDetailDialogProps) {
  const visibleFields = taskDetailFields.filter(
    field => !field.onlyFor || field.onlyFor.includes(task.status),
  );

  return (
    <div
      className="dialog-overlay-in fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Task details"
        className="dialog-enter flex h-[min(85vh,640px,90vw)] w-[min(85vh,640px,90vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Task details</p>
            <h2 className="mt-1 truncate text-lg font-semibold text-slate-800">
              {task.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-100"
            aria-label="Close details"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {/* Identity + status + priority */}
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-500">
              <CheckSquare size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`truncate font-semibold ${
                  task.status === "COMPLETED"
                    ? "text-slate-400 line-through"
                    : "text-slate-800"
                }`}
              >
                {task.title}
              </p>
              <p className="mt-1 truncate text-xs text-slate-500">
                {task.assignedTo || "Unassigned"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                    taskStatusStyles[task.status] ?? taskStatusStyles.OPEN
                  }`}
                >
                  {taskStatusLabels[task.status] ?? task.status}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                    priorityStyles[task.priority] ?? priorityStyles.MEDIUM
                  }`}
                >
                  {priorityLabels[task.priority] ?? task.priority}
                </span>
                <span className={`text-xs font-medium ${dueStyles(task)}`}>
                  {dueLabel(task)}
                </span>
              </div>
            </div>
          </div>

          <h3 className="mb-4 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Task information
          </h3>
          {visibleFields.map(({ label, Icon, get }) => (
            <div
              key={label}
              className="flex items-start gap-3 border-b border-slate-100 py-3"
            >
              <Icon size={16} className="mt-0.5 text-slate-400" />
              <div className="min-w-0">
                <p className="text-[11px] text-slate-400">{label}</p>
                <p className="mt-1 break-words text-sm text-slate-700">
                  {get(task)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
