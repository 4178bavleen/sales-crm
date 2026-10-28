import type { Priority, TaskStatus } from "../../types/task";

export type FollowUpStatus = TaskStatus;
export type FollowUpPriority = Priority;

export type RescheduleHistoryItem = {
  id: number;
  previousDueAt: string;
  newDueAt: string;
  rescheduledById: number;
  note: string | null;
  createdAt: string;
};

export type ActivityItem = {
  id: number;
  type: "CALL" | "MESSAGE" | "EMAIL" | "REMINDER" | "OTHER";
  outcome: string | null;
  notes: string | null;
  occurredAt: string;
  performedBy?: { id: number; name: string };
};

export type FollowUp = {
  id: number;
  title: string;
  description: string;
  assignedTo: string;
  assignedToId: number;
  createdBy: string;
  createdById: number;
  dueAt: string;
  priority: FollowUpPriority;
  status: FollowUpStatus;
  completedAt: string | null;
  completedBy: string;
  completionNote: string | null;
  cancelReason: string | null;
  rescheduleCount: number;
  lead: string;
  leadId: number | null;
  deal: string;
  dealId: number | null;
  customer: string;
  customerId: number | null;
  company: string;
  companyId: number | null;
  meeting: string;
  meetingId: number | null;
  rescheduleHistory?: RescheduleHistoryItem[];
  activities?: ActivityItem[];
  createdAt: string;
  updatedAt: string;
};

export type FollowUpTab = "all" | "today" | "overdue" | "upcoming" | "completed";

export type FollowUpStats = {
  dueToday: number;
  overdue: number;
  upcoming: number;
  completed: number;
  all: number;
};

export type FollowUpFormValues = {
  title: string;
  description: string;
  assignedToId: number;
  dueAt: string; // ISO datetime or YYYY-MM-DDTHH:mm
  priority: FollowUpPriority;
  leadId?: number | null;
  dealId?: number | null;
};

export type LogActivityValues = {
  type: "CALL" | "MESSAGE" | "EMAIL" | "REMINDER" | "OTHER";
  outcome: string;
  notes: string;
  occurredAt: string;
  leadId?: number | null;
  dealId?: number | null;
  customerId?: number | null;
  companyId?: number | null;
  taskId?: number | null;
  markTaskCompleted?: boolean;
};
