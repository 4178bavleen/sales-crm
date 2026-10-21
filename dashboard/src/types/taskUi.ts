import type { ComponentType, SVGProps } from "react";
import type { Task } from "./task";
import type { DataTableColumn } from "./dataTable";

/** Icon component signature used by the tasks UI (lucide icons). */
export type TaskIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

/** A read-only task field rendered in the detail dialog. */
export type TaskField = {
  label: string;
  Icon: TaskIcon;
  get: (task: Task) => string;
  /** When set, the field is only rendered for these statuses. */
  onlyFor?: string[];
};

/** Flat string fields used for the CSV export. */
export type TaskCsvField = {
  label: string;
  get: (task: Task) => string;
};

/**
 * Compact seed row:
 * [title, description, assignedTo, priority, status, dueAt, completedAt,
 *  completedBy, completionNote, cancelReason, lead, deal, customer, company,
 *  meeting, createdAt].
 */
export type TaskSeedRow = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

export type TaskColumn = DataTableColumn<Task>;

export type TaskDetailDialogProps = {
  task: Task;
  onClose: () => void;
};
