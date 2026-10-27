export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_REASSIGNED"
  | "TASK_DUE"
  | "TASK_OVERDUE"
  | "LEAD_ASSIGNED"
  | "DEAL_ASSIGNED"
  | "MEETING_REMINDER"
  | string;

export type NotificationItem = {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  body: string | null;
  entityType: "task" | "lead" | "deal" | "meeting" | "contact" | string | null;
  entityId: number | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type NotificationPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type NotificationListData = {
  items: NotificationItem[];
  unreadCount: number;
  pagination: NotificationPagination;
};

export type NotificationFilter = "all" | "unread" | "task";
