import type { Priority, TaskStatus } from "./task";

/**
 * Checkbox filter selections for the tasks list — one array per filterable
 * field. Keep this in sync with the sidebar sections in the page.
 */
export type TasksFilter = {
  status: TaskStatus[];
  priority: Priority[];
  assignedTo: string[];
};

/**
 * Due-date grouping, matching the schema's index comment for the tasks table
 * ("today / overdue / upcoming lists"). "" means no due-date filter applied.
 */
export type TaskDueFilter = "" | "overdue" | "today" | "upcoming" | "none";
